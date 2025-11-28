import { NextRequest, NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { youtubeUrl } = await request.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Basic YouTube URL validation
    if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Create storage directories if they don't exist
    const storageDir = path.join(process.cwd(), 'storage', 'videos');
    const subtitlesDir = path.join(process.cwd(), 'storage', 'subtitles');

    if (!existsSync(storageDir)) {
      await mkdir(storageDir, { recursive: true });
    }
    if (!existsSync(subtitlesDir)) {
      await mkdir(subtitlesDir, { recursive: true });
    }

    // Generate unique ID for the video
    const videoId = uuidv4();
    const videoFileName = `${videoId}.mp4`;
    const videoPath = path.join(storageDir, videoFileName);

    // Download video from YouTube using yt-dlp
    console.log('Downloading video from YouTube:', youtubeUrl);

    try {
      // Try yt-dlp first (recommended)
      await execAsync(
        `yt-dlp -f "worst[ext=mp4]" --no-playlist -o "${videoPath}" "${youtubeUrl}"`,
        {
          timeout: 300000, // 5 minute timeout
        }
      );
    } catch (ytdlpError) {
      console.log('yt-dlp failed, trying youtube-dl...');
      
      // Fallback to youtube-dl
      try {
        await execAsync(
          `youtube-dl -f "worst[ext=mp4]" --no-playlist -o "${videoPath}" "${youtubeUrl}"`,
          {
            timeout: 300000, // 5 minute timeout
          }
        );
      } catch (youtubedlError) {
        throw new Error(
          'Neither yt-dlp nor youtube-dl is installed. Please install yt-dlp: pip install yt-dlp'
        );
      }
    }

    console.log('Video downloaded successfully:', videoPath);

    return NextResponse.json({
      success: true,
      videoId,
      videoPath: `/api/videos/${videoId}.mp4`,
      message: 'Video downloaded successfully from YouTube',
    });
  } catch (error) {
    console.error('Error downloading YouTube video:', error);
    return NextResponse.json(
      { 
        error: 'Failed to download YouTube video', 
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Install yt-dlp: pip install yt-dlp (or youtube-dl as fallback)'
      },
      { status: 500 }
    );
  }
}
