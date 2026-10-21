#!/usr/bin/env bash
# One-shot export: MP4 + GIF + 2x PNG still for one layout.
# render.sh <page.html> <out-basename> <w> <h> [query] [still_ms=auto] [dur=8000] [full=0]
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
F=$1; OUT=$2; W=$3; H=$4; Q=${5:-}; STILL=${6:-}; DUR=${7:-8000}; FULL=${8:-0}
TMP=$(mktemp -d)
FL=""; [ "$FULL" = 1 ] && FL="--full"
node "$HERE/frames.js" --file "$F" --query "$Q" --w "$W" --h "$H" --fps 30 --dur "$DUR" --dir "$TMP/f" $FL
if [ "$FULL" = 1 ]; then
  n=$(identify -format "%h\n" "$TMP"/f/*.png 2>/dev/null | sort -u | wc -l)
  [ "$n" -gt 1 ] && echo "WARNING: page height changes during the loop (layout jitter). Fix before shipping; ffmpeg will drop frames."
fi
bash "$HERE/encode.sh" "$TMP/f" "$OUT" 30 15 both
[ -z "$STILL" ] && STILL=$(( DUR * 85 / 100 ))
node "$HERE/shot.js" --file "$F" --query "$Q" --w "$W" --h "$H" --times "$STILL" --scale 2 --out "$TMP/still" $FL >/dev/null
cp "$TMP/still-$STILL.png" "$OUT.png"; echo "wrote $OUT.png (2x still at ${STILL}ms)"
rm -rf "$TMP"
