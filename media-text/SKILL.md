---
name: media-text
description: Extract verbatim text from local images (OCR) and transcribe speech from local audio or video files with Gemini Flash Lite. Use when the user asks to "extract text from an image", "OCR this", "transcribe this audio", "transcribe this video", or needs a reusable OCR/transcription workflow. Do not use it for summaries.
---

# Media text extraction

## Requirements

- Python 3.9+ with `requests` (`pip install requests`)
- `ffmpeg` on `PATH` (video input only)
- `GEMINI_API_KEY` set in the environment

Use `scripts/media_text.py` to extract text from an image or speech from an audio/video file. It reads `GEMINI_API_KEY` from the environment, uses `gemini-3.5-flash-lite`, and writes the extracted text to a chosen output path. It does not summarize or alter the source.

For video, the script uses `ffmpeg` to make a temporary mono MP3 before sending audio to Gemini. Keep the original media separately if you need to audit the result.

The script sends at most 10 requests per rolling minute and 100 per UTC day by default, with a request ledger at the chosen `--rate-state` path. Use a shared ledger when running multiple jobs against one key. The defaults sit below the supplied 15 RPM and 500 RPD limits. Do not run parallel copies against separate ledgers for the same key.

For large collections, import `extract_batch(paths, mode, api_key, pacer)` from the script. It accepts a small group of images or audio clips and returns one itemized transcript per file. Keep batches small enough for the 14 MB inline payload guard and inspect a sample against source media before scaling up.

## Usage

`--mode` defaults to `auto` (detected from the file extension); pass `image`, `audio`, or `video` to override. On success the script prints a JSON line with the output path, model, and token usage.

```bash
python scripts/media_text.py image.jpg --output image.txt --rate-state ./gemini-requests.json
python scripts/media_text.py clip.mp4 --output clip.txt --rate-state ./gemini-requests.json
```

Set `GEMINI_API_KEY` in the process environment or a secure credential manager. Never put it in commands, source files, result files, or logs. Inspect uncertain text against the original media before treating it as a faithful quotation.
