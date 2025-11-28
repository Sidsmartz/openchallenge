# Local Whisper Setup Guide

This project uses OpenAI's Whisper model running locally for video transcription. Follow these steps to set it up.

## Prerequisites

1. **Python 3.8 or higher**
   - Check if installed: `python3 --version` or `python --version`
   - Download from: https://www.python.org/downloads/

2. **FFmpeg**
   - Required for audio/video processing
   - **Windows**: Download from https://ffmpeg.org/download.html or use chocolatey: `choco install ffmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt-get install ffmpeg` (Ubuntu/Debian) or `sudo yum install ffmpeg` (CentOS/RHEL)
   - Verify: `ffmpeg -version`

## Installation Steps

### 1. Install Python Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Or install individually:

```bash
pip install openai-whisper torch torchaudio ffmpeg-python
```

### 2. Verify Installation

Test that Whisper is working:

```bash
python3 scripts/transcribe.py --help
```

### 3. Choose Whisper Model (Optional)

Whisper models vary in size and accuracy:
- **tiny**: Fastest, least accurate (~39 MB)
- **base**: Good balance (~74 MB) - **Default**
- **small**: Better accuracy (~244 MB)
- **medium**: High accuracy (~769 MB)
- **large**: Best accuracy (~1550 MB)

Set the model via environment variable:

```bash
# In .env.local
WHISPER_MODEL=base
```

Or use it directly:
- `tiny` - Fastest, least accurate
- `base` - Recommended for most cases (default)
- `small` - Better accuracy
- `medium` - High accuracy
- `large` - Best accuracy, slowest

### 4. Configure Python Executable (Optional)

If Python is not in your PATH or you use a different executable:

```bash
# In .env.local
WHISPER_PYTHON=python3
# or
WHISPER_PYTHON=C:\Python39\python.exe
```

## Usage

Once installed, the transcription will work automatically when you:
1. Upload a video on `/video` page
2. Click "Generate Subtitles"
3. The system will use local Whisper to transcribe

## Troubleshooting

### "Python executable not found"
- Make sure Python 3 is installed and in your PATH
- Set `WHISPER_PYTHON` environment variable to your Python executable path

### "openai-whisper library not installed"
- Run: `pip install openai-whisper`
- Or: `pip install -r requirements.txt`

### "FFmpeg not found"
- Install FFmpeg (see Prerequisites above)
- Make sure `ffmpeg` command is available in your PATH
- On Windows, you may need to add FFmpeg to your system PATH

### Transcription is slow
- Use a smaller model: `WHISPER_MODEL=tiny` or `WHISPER_MODEL=base`
- Consider using a GPU-enabled PyTorch installation for faster processing

### Out of memory errors
- Use a smaller Whisper model
- Process shorter video segments
- Increase system RAM or use a machine with more memory

### Model download issues
- Models are downloaded automatically on first use
- Ensure you have internet connection for first download
- Models are cached in `~/.cache/whisper/` directory

## Performance Tips

1. **Use appropriate model size**: Start with `base` model, upgrade if needed
2. **GPU acceleration**: Install CUDA-enabled PyTorch for faster processing
3. **Batch processing**: Process multiple videos sequentially rather than parallel
4. **Video format**: MP4 with AAC audio is recommended for best compatibility

## Model Comparison

| Model | Parameters | Relative Speed | Disk Space | Best For |
|-------|-----------|----------------|------------|----------|
| tiny  | 39M       | ~32x           | 39 MB      | Quick tests, low accuracy OK |
| base  | 74M       | ~16x           | 74 MB      | **Recommended default** |
| small | 244M      | ~6x            | 244 MB     | Better accuracy needed |
| medium| 769M      | ~2x            | 769 MB     | High accuracy required |
| large | 1550M     | 1x             | 1550 MB    | Maximum accuracy |

## Notes

- First transcription will download the model (one-time download)
- Models are cached locally after first use
- Transcription time depends on video length and model size
- The `scripts/transcribe.py` script can be run standalone for testing
