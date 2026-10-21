#!/usr/bin/env bash
# One-time setup: playwright-core + a headless Chromium, ffmpeg check.
set -e
DEPS="${VE_DEPS:-$HOME/.cache/visual-explainers}"
mkdir -p "$DEPS"
if [ ! -d "$DEPS/node_modules/playwright-core" ]; then
  (cd "$DEPS" && [ -f package.json ] || npm init -y >/dev/null; cd "$DEPS" && npm i playwright-core@1.56.1 >/dev/null)
fi
if ! ls "$HOME/.cache/ms-playwright" 2>/dev/null | grep -q chromium; then
  echo "No Playwright Chromium found; installing headless shell..."
  (cd "$DEPS" && npx playwright-core install chromium-headless-shell) || echo "Install failed: set CHROME=/path/to/chrome"
fi
command -v ffmpeg >/dev/null || echo "WARNING: ffmpeg missing (needed for GIF/MP4)."
echo "ready: deps in $DEPS"
