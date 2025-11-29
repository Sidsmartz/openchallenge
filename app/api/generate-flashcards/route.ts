import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { subtitles } = await request.json();

    if (!subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { error: "Invalid subtitles data" },
        { status: 400 }
      );
    }

    // Combine all subtitle text
    const fullTranscript = subtitles
      .map((sub: any) => sub.text)
      .join(" ");

    if (!fullTranscript.trim()) {
      return NextResponse.json(
        { error: "No transcript content available" },
        { status: 400 }
      );
    }

    // Generate flashcards using Gemini
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are an educational assistant that creates study flashcards from video transcripts. 
Generate 10-15 high-quality flashcards that cover the key concepts, definitions, and important facts from the content.
Each flashcard should have a clear question and a concise answer.
Format your response as a JSON object with a "flashcards" array containing objects with "question" and "answer" fields.
Focus on the most important educational content.

Create flashcards from this video transcript:

${fullTranscript.slice(0, 30000)}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error("No response from Gemini");
    }

    const parsed = JSON.parse(text);
    const flashcards = parsed.flashcards || parsed.cards || [];

    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate flashcards",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
