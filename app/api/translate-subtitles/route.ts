import { NextRequest, NextResponse } from "next/server";

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface TranslationRequest {
  subtitles: Subtitle[];
  targetLanguage: "hi" | "te"; // Hindi or Telugu
}

export async function POST(request: NextRequest) {
  try {
    const { subtitles, targetLanguage }: TranslationRequest =
      await request.json();

    if (!subtitles || !Array.isArray(subtitles) || subtitles.length === 0) {
      return NextResponse.json(
        { error: "Subtitles array is required" },
        { status: 400 }
      );
    }

    if (!targetLanguage || !["hi", "te"].includes(targetLanguage)) {
      return NextResponse.json(
        { error: "Target language must be 'hi' (Hindi) or 'te' (Telugu)" },
        { status: 400 }
      );
    }

    const languageNames = {
      hi: "Hindi",
      te: "Telugu",
    };

    const languageCodes = {
      hi: "hi",
      te: "te",
    };

    // Use translate.googleapis.com (free, no API key required for small requests)
    const translatedSubtitles: Subtitle[] = [];

    // Translate one at a time with delays to avoid rate limits
    for (let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i];
      
      try {
        // Use Google Translate API (free tier)
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${languageCodes[targetLanguage]}&dt=t&q=${encodeURIComponent(subtitle.text)}`;
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        });

        if (!response.ok) {
          console.error(`Translation API error: ${response.status}`);
          // Return original text if translation fails
          translatedSubtitles.push(subtitle);
          continue;
        }

        const data = await response.json();
        
        // Google Translate API returns nested arrays
        let translatedText = subtitle.text;
        if (data && data[0] && Array.isArray(data[0])) {
          translatedText = data[0].map((item: any) => item[0]).join("");
        }

        translatedSubtitles.push({
          start: subtitle.start,
          end: subtitle.end,
          text: translatedText || subtitle.text,
        });

        // Add delay to avoid rate limiting (200ms between requests)
        if (i < subtitles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error translating subtitle ${i}:`, error);
        // If translation fails, keep original text
        translatedSubtitles.push(subtitle);
      }
    }

    return NextResponse.json({
      success: true,
      subtitles: translatedSubtitles,
      language: targetLanguage,
      message: `Subtitles translated to ${languageNames[targetLanguage]}`,
    });
  } catch (error: any) {
    console.error("Error translating subtitles:", error);
    return NextResponse.json(
      {
        error: "Failed to translate subtitles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
