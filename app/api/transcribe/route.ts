import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface WhisperResult {
  text: string;
  language: string;
  segments: Array<{ start: number; end: number; text: string }>;
  duration: number;
  error?: string;
  type?: string;
}

// Get Whisper model from environment or use default
const getWhisperModel = (): string => {
  return process.env.WHISPER_MODEL || 'base';
};

// Get Python executable path
const getPythonExecutable = (): string => {
  // Try common Python executable names
  const pythonNames = ['python3', 'python'];
  
  // Check if WHISPER_PYTHON env var is set
  if (process.env.WHISPER_PYTHON) {
    return process.env.WHISPER_PYTHON;
  }
  
  // Default to python3
  return pythonNames[0];
};

// Convert Whisper segments to subtitle format
function convertToSubtitles(segments: Array<{ start: number; end: number; text: string }>): Subtitle[] {
  return segments.map(segment => ({
    start: segment.start,
    end: segment.end,
    text: segment.text.trim(),
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { videoId, language, translate } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Check if subtitles already exist
    const subtitlesDir = path.join(process.cwd(), 'storage', 'subtitles');
    const subtitlePath = path.join(subtitlesDir, `${videoId}.json`);

    if (existsSync(subtitlePath)) {
      const existingSubtitles = JSON.parse(await readFile(subtitlePath, 'utf-8'));
      return NextResponse.json({
        success: true,
        subtitles: existingSubtitles,
        message: 'Subtitles already exist',
      });
    }

    // Find the video file
    const storageDir = path.join(process.cwd(), 'storage', 'videos');
    const { readdir } = await import('fs/promises');
    const files = await readdir(storageDir);
    const videoFile = files.find(file => file.startsWith(videoId));

    if (!videoFile) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const videoPath = path.join(storageDir, videoFile);

    if (!existsSync(videoPath)) {
      return NextResponse.json(
        { error: 'Video file not found' },
        { status: 404 }
      );
    }

    // Get Python script path
    const scriptPath = path.join(process.cwd(), 'scripts', 'transcribe.py');
    
    if (!existsSync(scriptPath)) {
      return NextResponse.json(
        { error: 'Transcription script not found. Please ensure scripts/transcribe.py exists.' },
        { status: 500 }
      );
    }

    // Run local Whisper transcription
    const pythonExec = getPythonExecutable();
    const model = getWhisperModel();
    
    console.log(`Running local Whisper transcription with model: ${model}, language: ${language || 'auto'}, translate: ${translate || false}`);
    
    try {
      const args = [
        scriptPath,
        videoPath,
        '--model',
        model,
      ];
      
      // Add language if specified
      if (language) {
        args.push('--language', language);
      }
      
      // Add translate flag if requested
      if (translate) {
        args.push('--translate');
      }
      
      const { stdout, stderr } = await execFileAsync(
        pythonExec,
        args,
        {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 600000, // 10 minute timeout for long videos
          env: { ...process.env }, // Pass all environment variables including PATH
        }
      );

      if (stderr) {
        console.log('Whisper stderr:', stderr);
      }

      // Parse Whisper output
      const result: WhisperResult = JSON.parse(stdout);
      
      // Check for errors in result
      if (result.error) {
        throw new Error(result.error);
      }

      // Convert to subtitle format
      let subtitles: Subtitle[] = [];
      
      if (result.segments && result.segments.length > 0) {
        subtitles = convertToSubtitles(result.segments);
      } else if (result.text) {
        // Fallback: create a single subtitle from the full text
        subtitles = [{
          start: 0,
          end: result.duration || 10,
          text: result.text,
        }];
      } else {
        throw new Error('No transcription results returned from Whisper');
      }

      // Ensure subtitles directory exists
      if (!existsSync(subtitlesDir)) {
        await mkdir(subtitlesDir, { recursive: true });
      }

      // Save subtitles to file
      await writeFile(subtitlePath, JSON.stringify(subtitles, null, 2), 'utf-8');

      return NextResponse.json({
        success: true,
        subtitles,
        message: 'Subtitles generated successfully using local Whisper',
        language: result.language,
      });
    } catch (execError: any) {
      console.error('Error running Whisper script:', execError);
      
      // Check if it's a Python/script error
      if (execError.code === 'ENOENT') {
        return NextResponse.json(
          { 
            error: `Python executable not found. Please install Python 3 and ensure '${pythonExec}' is in your PATH, or set WHISPER_PYTHON environment variable.` 
          },
          { status: 500 }
        );
      }
      
      // Check if it's a timeout
      if (execError.killed || execError.signal === 'SIGTERM') {
        return NextResponse.json(
          { error: 'Transcription timed out. The video may be too long or the model too slow. Try using a smaller model (tiny, base) or shorter video.' },
          { status: 500 }
        );
      }
      
      // Try to parse error from stderr
      if (execError.stderr) {
        try {
          const errorResult = JSON.parse(execError.stderr);
          if (errorResult.error) {
            throw new Error(errorResult.error);
          }
        } catch {
          // Not JSON, use the error message
        }
      }
      
      throw execError;
    }
  } catch (error) {
    console.error('Error transcribing video:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to transcribe video', 
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Make sure Python 3, openai-whisper, and ffmpeg are installed. See README for setup instructions.'
      },
      { status: 500 }
    );
  }
}