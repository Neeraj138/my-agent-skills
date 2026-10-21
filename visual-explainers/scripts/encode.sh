#!/usr/bin/env bash
# Encode a frames dir to MP4 (H.264, bt709, high quality) and/or GIF.
# encode.sh <framesdir> <out-basename> [fps=30] [gif_fps=15] [mp4|gif|both=both]
set -e
DIR=$1; OUT=$2; FPS=${3:-30}; GFPS=${4:-15}; WHAT=${5:-both}
[ -d "$DIR" ] || { echo "no frames dir"; exit 1; }
if [ "$WHAT" != gif ]; then
  ffmpeg -loglevel error -y -framerate "$FPS" -i "$DIR/f%04d.png" \
    -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2,scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p" \
    -c:v libx264 -crf 12 -tune animation -preset slow \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -movflags +faststart "$OUT.mp4"
  echo "wrote $OUT.mp4 ($(du -h "$OUT.mp4" | cut -f1))"
fi
if [ "$WHAT" != mp4 ]; then
  ffmpeg -loglevel error -y -framerate "$FPS" -i "$DIR/f%04d.png" \
    -vf "fps=$GFPS,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" \
    -loop 0 "$OUT.gif"
  echo "wrote $OUT.gif ($(du -h "$OUT.gif" | cut -f1))"
fi
