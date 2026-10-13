#!/usr/bin/env python3
"""Verbatim OCR or speech transcription through Gemini Flash Lite."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime, timezone

import requests


MODEL = "gemini-3.5-flash-lite"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
IMAGE_PROMPT = (
    "Transcribe every visible word in this image verbatim, in reading order. "
    "Preserve meaningful line breaks. Do not describe, interpret, or summarize. "
    "If there is no readable text, respond exactly [NO VISIBLE TEXT]."
)
AUDIO_PROMPT = (
    "Transcribe all intelligible speech in this audio verbatim. Preserve the spoken "
    "language, punctuation, and speaker changes when clear. Do not summarize or "
    "add commentary. Mark genuinely unclear spans [unintelligible]. If there is "
    "no speech, respond exactly [NO SPEECH]."
)


class GeminiError(RuntimeError):
    pass


class RequestPacer:
    def __init__(self, state_path: Path, per_minute: int = 10, per_day: int = 100):
        self.state_path = state_path
        self.per_minute = per_minute
        self.per_day = per_day
        self._lock = threading.Lock()

    def before_request(self) -> None:
        with self._lock:
            self._before_request_locked()

    def _before_request_locked(self) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        while True:
            now = time.time()
            try:
                entries = json.loads(self.state_path.read_text())
            except FileNotFoundError:
                entries = []
            entries = [float(t) for t in entries if now - float(t) < 86400]
            recent = [t for t in entries if now - t < 60]
            today = datetime.fromtimestamp(now, timezone.utc).date()
            daily = [t for t in entries if datetime.fromtimestamp(t, timezone.utc).date() == today]
            if len(daily) >= self.per_day:
                raise GeminiError(f"Daily request guard reached ({self.per_day}).")
            if len(recent) < self.per_minute:
                entries.append(now)
                temporary = self.state_path.with_suffix(self.state_path.suffix + ".tmp")
                temporary.write_text(json.dumps(entries))
                os.replace(temporary, self.state_path)
                return
            time.sleep(max(1, 60 - (now - min(recent)) + 0.5))


def _request(payload: dict, api_key: str, pacer: RequestPacer) -> dict:
    for attempt in range(2):
        pacer.before_request()
        try:
            response = requests.post(
                API_URL,
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=payload,
                timeout=180,
            )
        except requests.RequestException as exc:
            if attempt == 0:
                time.sleep(8)
                continue
            raise GeminiError(f"Gemini network error: {type(exc).__name__}") from exc
        if response.status_code in {429, 500, 502, 503, 504} and attempt == 0:
            retry_after = response.headers.get("Retry-After", "0")
            delay = int(retry_after) if retry_after.isdigit() else 0
            time.sleep(max(65 if response.status_code == 429 else 8, delay))
            continue
        if not response.ok:
            try:
                detail = response.json().get("error", {}).get("status", "unknown")
            except ValueError:
                detail = "non-JSON response"
            raise GeminiError(f"Gemini HTTP {response.status_code}: {detail}")
        return response.json()
    raise GeminiError("Gemini request failed after one retry.")


def _response_text(result: dict) -> str:
    parts = result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "\n".join(part["text"] for part in parts if "text" in part).strip()
    if not text:
        reason = result.get("candidates", [{}])[0].get("finishReason", "unknown")
        raise GeminiError(f"Gemini returned no text (finishReason={reason}).")
    return text


def extract(path: Path, mode: str, api_key: str, pacer: RequestPacer) -> tuple[str, dict]:
    mime, _ = mimetypes.guess_type(path.name)
    if mode == "image":
        if mime not in {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}:
            raise ValueError(f"Unsupported image type: {path}")
        prompt = IMAGE_PROMPT
    elif mode == "audio":
        if mime not in {"audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg"}:
            raise ValueError(f"Unsupported audio type: {path}")
        mime = "audio/mp3" if path.suffix.lower() == ".mp3" else mime
        prompt = AUDIO_PROMPT
    else:
        raise ValueError(f"Unsupported mode: {mode}")

    data = path.read_bytes()
    if len(data) > 14_000_000:
        raise ValueError("Media exceeds safe inline request size; compress or split it first.")
    payload = {
        "contents": [{"parts": [
            {"text": prompt},
            {"inline_data": {"mime_type": mime, "data": base64.b64encode(data).decode("ascii")}},
        ]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 8192},
    }
    result = _request(payload, api_key, pacer)
    return _response_text(result), result.get("usageMetadata", {})


def extract_batch(paths: list[Path], mode: str, api_key: str, pacer: RequestPacer) -> tuple[list[str], dict]:
    """Extract a small batch, returning one verbatim text per input in input order."""
    if not paths or mode not in {"image", "audio"}:
        raise ValueError("Provide at least one image or audio file")
    instruction = (
        "Return one JSON item for each numbered input in the same order. "
        "For each image, transcribe all visible words verbatim in reading order, preserving "
        "meaningful line breaks. For each audio clip, transcribe all intelligible speech "
        "verbatim in the spoken language, with punctuation and clear speaker changes. "
        "Do not summarize, interpret, or combine inputs. Use [NO VISIBLE TEXT] for an "
        "image without text, [NO SPEECH] for audio without speech, and [unintelligible] "
        "only for truly unclear speech. IDs must match the input numbers exactly."
    )
    parts: list[dict] = [{"text": instruction}]
    total_bytes = 0
    for index, path in enumerate(paths, 1):
        mime, _ = mimetypes.guess_type(path.name)
        if mode == "image" and mime not in {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}:
            raise ValueError(f"Unsupported image type: {path}")
        if mode == "audio" and mime not in {"audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg"}:
            raise ValueError(f"Unsupported audio type: {path}")
        if path.suffix.lower() == ".mp3":
            mime = "audio/mp3"
        data = path.read_bytes()
        total_bytes += len(data)
        if total_bytes > 14_000_000:
            raise ValueError("Batch exceeds safe inline request size; use smaller batches.")
        parts.append({"text": f"Input {index}:"})
        parts.append({"inline_data": {"mime_type": mime, "data": base64.b64encode(data).decode("ascii")}})
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 16384,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {"items": {"type": "ARRAY", "items": {
                    "type": "OBJECT", "properties": {
                        "id": {"type": "INTEGER"}, "text": {"type": "STRING"},
                    }, "required": ["id", "text"],
                }}},
                "required": ["items"],
            },
        },
    }
    result = _request(payload, api_key, pacer)
    try:
        parsed = json.loads(_response_text(result))
        by_id = {int(item["id"]): item["text"].strip() for item in parsed["items"]}
    except (ValueError, KeyError, TypeError) as exc:
        raise GeminiError("Gemini batch output was not valid itemized JSON") from exc
    if set(by_id) != set(range(1, len(paths) + 1)) or any(not text for text in by_id.values()):
        raise GeminiError("Gemini batch output omitted or duplicated an input")
    return [by_id[index] for index in range(1, len(paths) + 1)], result.get("usageMetadata", {})


def video_to_mp3(video: Path, output: Path) -> None:
    command = [
        "ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(video),
        "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", str(output),
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=300)
    if result.returncode != 0 or not output.exists() or output.stat().st_size == 0:
        raise RuntimeError(f"Could not extract audio from {video.name}: {result.stderr[-400:]}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("media", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--rate-state", type=Path, default=Path("gemini-requests.json"))
    parser.add_argument("--mode", choices=["auto", "image", "audio", "video"], default="auto")
    args = parser.parse_args()
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        parser.error("GEMINI_API_KEY must be set in the environment")
    if not args.media.is_file():
        parser.error(f"Media file not found: {args.media}")
    mode = args.mode
    if mode == "auto":
        guessed, _ = mimetypes.guess_type(args.media.name)
        mode = "image" if (guessed or "").startswith("image/") else "video" if (guessed or "").startswith("video/") else "audio"
    pacer = RequestPacer(args.rate_state)
    if mode == "video":
        with tempfile.TemporaryDirectory(prefix="media-text-") as temporary:
            audio = Path(temporary) / "audio.mp3"
            video_to_mp3(args.media, audio)
            text, usage = extract(audio, "audio", key, pacer)
    else:
        text, usage = extract(args.media, mode, key, pacer)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text + "\n")
    print(json.dumps({"output": str(args.output), "model": MODEL, "usage": usage}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (GeminiError, RuntimeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)
