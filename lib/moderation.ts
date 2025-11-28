interface ToxicityScores {
  TOXICITY: number;
  SEVERE_TOXICITY: number;
  IDENTITY_ATTACK: number;
  INSULT: number;
  PROFANITY: number;
  THREAT: number;
}

interface ModerationResult {
  scores: ToxicityScores;
  shouldFlag: boolean;
  isAvailable: boolean;
}

const TOXICITY_THRESHOLD = 0.7;

export async function analyzeContent(text: string, baseUrl?: string): Promise<ModerationResult> {
  try {
    // Use full URL for server-side calls
    const url = baseUrl ? `${baseUrl}/api/analyze` : '/api/analyze';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      // API unavailable - post first, review later
      return {
        scores: {} as ToxicityScores,
        shouldFlag: false,
        isAvailable: false,
      };
    }

    const data = await response.json();
    const scores: ToxicityScores = data.scores;

    // Check if any score exceeds threshold
    const shouldFlag = Object.values(scores).some(
      (score) => score > TOXICITY_THRESHOLD
    );

    return {
      scores,
      shouldFlag,
      isAvailable: true,
    };
  } catch (error) {
    console.error('Error analyzing content:', error);
    // API unavailable - post first, review later
    return {
      scores: {} as ToxicityScores,
      shouldFlag: false,
      isAvailable: false,
    };
  }
}

export function shouldFlagContent(scores: ToxicityScores): boolean {
  return Object.values(scores).some((score) => score > TOXICITY_THRESHOLD);
}
