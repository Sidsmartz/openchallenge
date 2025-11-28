import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { lookup } from 'mime-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Extract video ID (might include file extension)
    const videoIdWithExt = id;
    const storageDir = path.join(process.cwd(), 'storage', 'videos');
    
    // Check if storage directory exists
    if (!existsSync(storageDir)) {
      console.error('Video storage directory not found:', storageDir);
      return NextResponse.json(
        { error: 'Video storage not found' },
        { status: 404 }
      );
    }
    
    // Find the video file in storage
    const { readdir } = await import('fs/promises');
    const files = await readdir(storageDir);
    
    // Try to find exact match first, then by prefix
    let videoFile = files.find(file => file === videoIdWithExt);
    if (!videoFile) {
      // Extract ID without extension for matching
      const videoId = videoIdWithExt.split('.')[0];
      videoFile = files.find(file => file.startsWith(videoId));
    }
    
    if (!videoFile) {
      console.error('Video not found. Requested:', videoIdWithExt, 'Available files:', files);
      return NextResponse.json(
        { error: 'Video not found', requestedId: videoIdWithExt, availableVideos: files },
        { status: 404 }
      );
    }

    const videoPath = path.join(storageDir, videoFile);
    
    if (!existsSync(videoPath)) {
      console.error('Video file path does not exist:', videoPath);
      return NextResponse.json(
        { error: 'Video file not found' },
        { status: 404 }
      );
    }

    const videoBuffer = await readFile(videoPath);
    const mimeType = lookup(videoPath) || 'video/mp4';

    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': videoBuffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving video:', error);
    return NextResponse.json(
      { error: 'Failed to serve video', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
