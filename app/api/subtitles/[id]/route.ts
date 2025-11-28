import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const subtitlesDir = path.join(process.cwd(), 'storage', 'subtitles');
    const subtitlePath = path.join(subtitlesDir, `${videoId}.json`);

    if (!existsSync(subtitlePath)) {
      return NextResponse.json(
        { error: 'Subtitles not found' },
        { status: 404 }
      );
    }

    const subtitles = JSON.parse(await readFile(subtitlePath, 'utf-8'));

    return NextResponse.json({
      success: true,
      subtitles,
    });
  } catch (error) {
    console.error('Error loading subtitles:', error);
    return NextResponse.json(
      { error: 'Failed to load subtitles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
