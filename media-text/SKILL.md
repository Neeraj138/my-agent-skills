---
name: media-text
description: Extract verbatim text from local images (OCR) and transcribe speech from local audio or video files with Gemini Flash Lite. Use when the user asks to "extract text from an image", "OCR this", "transcribe this audio", "transcribe this video", or needs a reusable OCR/transcription workflow. Do not use it for summaries.
---

# Media text extraction

## Requirements

- Python 3.9+ with `requests` (`pip install requests`)
- `ffmpeg` on `PATH` (video input only)
- A Gemini API key (see [API key setup](#api-key-setup))

## API key setup

If the script fails with `GEMINI_API_KEY not found`, walk the user through these steps. Never ask the user to paste the key into the chat, and never write, echo, or log the key yourself — the user places it.

1. Open [Google AI Studio](https://aistudio.google.com/apikey) and sign in with a Google account.
2. Click **Create API key**, pick (or create) a Google Cloud project, and copy the key (it starts with `AIza`).
3. Store it in **one** of these places:
   - **Skill `.env` file (recommended):** create `.env` in the `media-text/` skill directory (next to this `SKILL.md`) containing:
     ```
     GEMINI_API_KEY=your-key-here
     ```
     Then restrict it with `chmod 600 .env`. The repo's `.gitignore` already excludes `.env`, so it won't be committed.
   - **Shell profile:** add `export GEMINI_API_KEY="your-key-here"` to `~/.bashrc` or `~/.zshrc`, then restart the terminal or run `source ~/.bashrc`.
4. Re-run the script to confirm it works.

The environment variable takes precedence over the `.env` file. The free tier has rate limits; the script's built-in pacing (below) keeps you under them.

Use `scripts/media_text.py` to extract text from an image or speech from an audio/video file. It reads `GEMINI_API_KEY` from the environment (falling back to `media-text/.env`), uses `gemini-3.5-flash-lite`, and writes the extracted text to a chosen output path. It does not summarize or alter the source.

For video, the script uses `ffmpeg` to make a temporary mono MP3 before sending audio to Gemini. Keep the original media separately if you need to audit the result.

The script sends at most 10 requests per rolling minute and 100 per UTC day by default, with a request ledger at the chosen `--rate-state` path. Use a shared ledger when running multiple jobs against one key. The defaults sit below the supplied 15 RPM and 500 RPD limits. Do not run parallel copies against separate ledgers for the same key.

For large collections, import `extract_batch(paths, mode, api_key, pacer)` from the script. It accepts a small group of images or audio clips and returns one itemized transcript per file. Keep batches small enough for the 14 MB inline payload guard and inspect a sample against source media before scaling up.

## Usage

`--mode` defaults to `auto` (detected from the file extension); pass `image`, `audio`, or `video` to override. On success the script prints a JSON line with the output path, model, and token usage.

```bash
python scripts/media_text.py image.jpg --output image.txt --rate-state ./gemini-requests.json
python scripts/media_text.py clip.mp4 --output clip.txt --rate-state ./gemini-requests.json
```

Keep `GEMINI_API_KEY` only in the environment or the gitignored `media-text/.env`. Never put it in commands, source files, result files, or logs. Inspect uncertain text against the original media before treating it as a faithful quotation.
