#!/usr/bin/env python3
"""
Local Whisper transcription script
Takes a video file path and returns JSON with timestamped subtitles
"""

import sys
import json
import argparse
from pathlib import Path

try:
    import whisper
except ImportError:
    print("ERROR: openai-whisper library not installed. Run: pip install openai-whisper", file=sys.stderr)
    sys.exit(1)

import subprocess
import shutil

def check_ffmpeg():
    """Check if ffmpeg is available in PATH"""
    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "FFmpeg not found in PATH. Please install FFmpeg and ensure it's accessible. "
            "Download from: https://www.gyan.dev/ffmpeg/builds/ or install via: choco install ffmpeg"
        )


def transcribe_video(video_path: str, model_name: str = "base", language: str = None, translate: bool = False):
    """
    Transcribe a video file using local Whisper model
    
    Args:
        video_path: Path to the video file
        model_name: Whisper model to use (tiny, base, small, medium, large)
        language: Language code (e.g., 'en') or None for auto-detection
        translate: If True, translate to English
    
    Returns:
        Dictionary with segments and metadata
    """
    # Check if FFmpeg is available
    check_ffmpeg()
    
    # Validate video file exists
    video_file = Path(video_path)
    if not video_file.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")
    
    # Load Whisper model
    print(f"Loading Whisper model: {model_name}", file=sys.stderr)
    model = whisper.load_model(model_name)
    
    # Transcribe video
    action = "Translating" if translate else "Transcribing"
    print(f"{action} video: {video_path}", file=sys.stderr)
    
    # Suppress Whisper's stdout output by redirecting it temporarily
    import os
    import io
    
    # Save original stdout
    original_stdout = sys.stdout
    
    try:
        # Redirect stdout to suppress Whisper's print statements
        sys.stdout = io.StringIO()
        
        # Use translate method if translation is requested
        if translate:
            result = model.transcribe(
                str(video_file),
                task='translate',  # Translate to English
                language=language,
                verbose=False,
                word_timestamps=False
            )
        else:
            result = model.transcribe(
                str(video_file),
                language=language,
                verbose=False,
                word_timestamps=False
            )
    finally:
        # Restore original stdout
        sys.stdout = original_stdout
    
    # Format segments
    segments = []
    for segment in result.get("segments", []):
        segments.append({
            "start": segment["start"],
            "end": segment["end"],
            "text": segment["text"].strip()
        })
    
    return {
        "text": result.get("text", ""),
        "language": result.get("language", "unknown"),
        "segments": segments,
        "duration": result.get("duration", 0)
    }


def main():
    parser = argparse.ArgumentParser(description="Transcribe video using local Whisper")
    parser.add_argument("video_path", help="Path to video file")
    parser.add_argument("--model", default="base", 
                       choices=["tiny", "base", "small", "medium", "large"],
                       help="Whisper model to use (default: base)")
    parser.add_argument("--language", default=None,
                       help="Language code (e.g., 'en') or auto-detect if not specified")
    parser.add_argument("--translate", action="store_true",
                       help="Translate to English")
    parser.add_argument("--output", default=None,
                       help="Output JSON file path (default: stdout)")
    
    args = parser.parse_args()
    
    try:
        result = transcribe_video(args.video_path, args.model, args.language, args.translate)
        
        # Output JSON
        output_json = json.dumps(result, indent=2)
        
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output_json)
            print(f"Transcription saved to: {args.output}", file=sys.stderr)
        else:
            print(output_json)
            
    except Exception as e:
        error_msg = {
            "error": str(e),
            "type": type(e).__name__
        }
        # Output error to stdout as JSON so it can be parsed by the calling process
        print(json.dumps(error_msg))
        sys.exit(1)


if __name__ == "__main__":
    main()
