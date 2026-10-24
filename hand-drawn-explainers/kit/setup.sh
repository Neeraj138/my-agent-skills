#!/usr/bin/env bash
# Create a working project from this kit:  bash <skill>/kit/setup.sh <project-dir>
# Needs: node ≥ 18, ffmpeg, python 3.12 (voice tools), ImageMagick (optional, for slide PDFs).
set -euo pipefail
KIT="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:?usage: setup.sh <project-dir>}"
if [ -e "$DEST/engine/sketchanim.js" ]; then echo "$DEST already has the engine; nothing copied."; else
  mkdir -p "$DEST"; cp -r "$KIT/." "$DEST/"; rm -f "$DEST/setup.sh"; fi
cd "$DEST"
npm install --no-audit --no-fund
npx playwright install chromium
mkdir -p out/voice scripts
if command -v uv >/dev/null; then uv venv -q --python 3.12 research/.venv && uv pip install -q --python research/.venv/bin/python -r research/requirements.txt
else "$(command -v python3.12 || echo python3)" -m venv research/.venv && research/.venv/bin/pip install -q -r research/requirements.txt; fi
# Offline voice model (~340 MB), only if no models are configured yet
if [ -z "${KOKORO_DIR:-}" ] && [ ! -f assets/tts/kokoro-v1.0.onnx ]; then
  mkdir -p assets/tts
  base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
  curl -fL -o assets/tts/kokoro-v1.0.onnx "$base/kokoro-v1.0.onnx" && curl -fL -o assets/tts/voices-v1.0.bin "$base/voices-v1.0.bin" \
    || echo "Kokoro download failed; set KOKORO_DIR later or use ElevenLabs."
fi
mkdir -p libraries && { curl -fsL https://libraries.excalidraw.com/libraries.json -o libraries/index.json || echo "(could not fetch the Excalidraw library index; optional)"; }
[ -f .env ] || echo "# ELEVENLABS_API_KEY=..." > .env
node render.mjs attention-reel --still 6 --out out/setup_check.png && echo "Ready: $DEST (check out/setup_check.png)"
