import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface MindmapNode {
  id: string;
  label: string;
  type: 'main' | 'topic' | 'subtopic' | 'detail';
  timestamp?: number;
}

interface MindmapEdge {
  from: string;
  to: string;
}

interface MindmapData {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}

const DEFAULT_MODEL = 'gemini-2.5-flash';  // ← Update this to a valid model from ListModels

async function callGemini(prompt: string, model = DEFAULT_MODEL): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini API request failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error('No content returned by Gemini');
  }
  return content;
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const subtitlesDir = path.join(process.cwd(), 'storage', 'subtitles');
    const subtitlePath = path.join(subtitlesDir, `${videoId}.json`);
    if (!existsSync(subtitlePath)) {
      return NextResponse.json({ error: 'Subtitles not found. Please generate subtitles first.' }, { status: 404 });
    }

    const subtitles: Subtitle[] = JSON.parse(await readFile(subtitlePath, 'utf-8'));
    const fullTranscript = subtitles.map(s => s.text).join(' ');
    const prompt = `Analyze this video transcript and create a simple mindmap. Return ONLY valid JSON:\n` +
      `{\n  "nodes": [\n    {"id": "1", "label": "Main Topic", "type": "main"},\n    {"id": "2", "label": "Topic 1", "type": "topic"},\n    {"id": "3", "label": "Topic 2", "type": "topic"}\n  ],\n  "edges": [\n    {"from": "1", "to": "2"},\n    {"from": "1", "to": "3"}\n  ]\n}\n\nKeep it simple with 1 main topic and 3–5 key topics. Transcript:\n\n${fullTranscript.substring(0, 3000)}`;

    const generatedText = await callGemini(prompt);

    let jsonText = generatedText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```/g, '');
    }

    const mindmapData: MindmapData = JSON.parse(jsonText);
    return NextResponse.json({ success: true, mindmap: mindmapData });
  } catch (err) {
    console.error('Error generating mindmap:', err);
    return NextResponse.json(
      { error: 'Failed to generate mindmap', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
