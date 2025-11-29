import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { subtitles, query } = await request.json();

    if (!subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { error: "Invalid subtitles data" },
        { status: 400 }
      );
    }

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Invalid search query" },
        { status: 400 }
      );
    }

    const searchTerm = query.toLowerCase().trim();
    const results = subtitles
      .map((subtitle: any, index: number) => ({
        ...subtitle,
        index,
      }))
      .filter((subtitle: any) =>
        subtitle.text.toLowerCase().includes(searchTerm)
      );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching subtitles:", error);
    return NextResponse.json(
      { error: "Failed to search subtitles" },
      { status: 500 }
    );
  }
}
