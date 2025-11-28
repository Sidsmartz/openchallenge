import { NextRequest, NextResponse } from 'next/server';

interface PerspectiveRequest {
  comment: {
    text: string;
  };
  requestedAttributes: {
    [key: string]: {};
  };
  languages?: string[];
}

interface PerspectiveResponse {
  attributeScores: {
    [key: string]: {
      spanScores: Array<{
        begin: number;
        end: number;
        score: {
          value: number;
          type: string;
        };
      }>;
      summaryScore: {
        value: number;
        type: string;
      };
    };
  };
  languages: string[];
  detectedLanguages?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Get API key from environment variable
    const apiKey = process.env.GOOGLE_PERSPECTIVE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Perspective API key not configured' },
        { status: 500 }
      );
    }

    // Prepare the request payload for Perspective API
    // Note: Only using attributes that support both English and Hindi
    // SEXUALLY_EXPLICIT and FLIRTATION don't support Hindi
    const perspectiveRequest: PerspectiveRequest = {
      comment: {
        text: text,
      },
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        IDENTITY_ATTACK: {},
        INSULT: {},
        PROFANITY: {},
        THREAT: {},
      },
      languages: ['en', 'hi'],
    };

    // Call Google Perspective API
    const response = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(perspectiveRequest),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Perspective API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to analyze text', details: errorData },
        { status: response.status }
      );
    }

    const data: PerspectiveResponse = await response.json();

    // Format the response for easier consumption
    const formattedScores: { [key: string]: number } = {};
    Object.keys(data.attributeScores).forEach((attribute) => {
      formattedScores[attribute] = data.attributeScores[attribute].summaryScore.value;
    });

    return NextResponse.json({
      scores: formattedScores,
      languages: data.languages,
      detectedLanguages: data.detectedLanguages,
    });
  } catch (error) {
    console.error('Error analyzing text:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
