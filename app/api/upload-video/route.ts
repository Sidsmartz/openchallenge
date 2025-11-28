import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;

    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
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
    const fileExtension = path.extname(videoFile.name);
    const videoFileName = `${videoId}${fileExtension}`;
    const videoPath = path.join(storageDir, videoFileName);

    // Convert File to Buffer and save
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(videoPath, buffer);

    return NextResponse.json({
      success: true,
      videoId,
      videoPath: `/api/videos/${videoId}${fileExtension}`,
      message: 'Video uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json(
      { error: 'Failed to upload video', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
