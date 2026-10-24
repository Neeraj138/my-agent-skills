# Output formats & commands

Everything is rendered from a scene in `scenes/<name>.js` by `render.mjs` (headless Chromium + ffmpeg). Run from `ROOT`. Don't generate pictures or video any other way (no AI image/video generators, no separate renderers) unless the user explicitly asks for it.

## Preview
- `player.html?scene=<name>` in a browser (file:// works). Space plays/pauses, ←/→ step one frame (1/60 s), and audio plays in sync. Add the scene to `scenes/index.js` to see it in the dropdown.

## Stills & review sheets
```bash
node render.mjs <name> --still 3,8.5 [--safe] [--out out/<name>_{t}.png]     # one PNG per time, full size
node render.mjs <name> --sheet 2,4,6,8,10 [--cols 5] [--safe] --out out/<name>_sheet.png   # tiled contact sheet (≈480 px tiles)
```
`--safe` paints the reel UI zones red (vertical scenes only). `--cover` shades what Instagram's 4:5 feed crop cuts and dashes the 3:4 profile-grid crop. `--param k=v` passes URL params to the scene.

## Video (MP4, 60 fps)
```bash
node render.mjs <name>                      # → out/<name>.mp4, H.264 + AAC, 60 fps (default), loudness-normalised voice
node render.mjs <name> --from 30 --to 45 --out out/<name>_part.mp4   # a section, for quick checks
```
- The aspect ratio comes from the scene: `width: 1080, height: 1920` (9:16 reel), `1920×1080` (16:9), `1080×1080` (1:1).
- Check the result: `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,width,height -of csv=p=0 out/<name>.mp4` should give `60/1`.
- Cover image (reels): a designed `scenes/<name>-cover.js` (see `reels-attention.md`).
  ```bash
  node render.mjs <name>-cover --still 1 --cover --out out/<name>_cover_check.png   # check the crop
  node render.mjs <name>-cover --still 1 --out out/<name>_cover.png                 # deliverable
  magick out/<name>_cover.png -resize 270x out/<name>_cover_small.png               # thumbnail-size check
  node render.mjs <name> --still 0,0.5 --safe --out out/<name>_open_{t}.png         # frame 0 must already show the hook
  ```
  For 16:9, a cover still is just the best settled frame: `--still <t> --out out/<name>_cover.png`.

## GIF
GIF frame delays are counted in 1/100 s, and browsers slow down anything faster than ~50 fps, so **GIFs are made at 30 fps** (or 25). For a true 60 fps loop, deliver a muted looping MP4 or WebP instead.
```bash
# silent scene section → MP4 → GIF (two-pass palette keeps the colours clean)
node render.mjs <name> --from 0 --to 6 --out out/<name>_loop.mp4
ffmpeg -y -i out/<name>_loop.mp4 -vf "fps=30,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" -loop 0 out/<name>.gif
# 60 fps alternatives
ffmpeg -y -i out/<name>_loop.mp4 -an -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart out/<name>_loop_muted.mp4
ffmpeg -y -i out/<name>_loop.mp4 -an -vf "scale=720:-1" -c:v libwebp -loop 0 -q:v 75 out/<name>.webp
```
Make loops seamless: the last frame should match the first (end on the starting state, or fade the act out and back in).

## Slides (PNG, PDF, PPTX)
Build the deck as one scene (`templates/landscape.js`, 1920×1080). Each beat is one slide, and its picture settles before the next cue. Export the settled frame of each beat (just before the next beat starts):
```bash
node render.mjs <name> --still 4.5,9.5,14.5 --out out/<name>_slides/slide_{t}.png
magick $(ls -v out/<name>_slides/slide_*.png) out/<name>_slides.pdf
```
For PPTX (one full-bleed image per slide, with optional speaker notes from the beat table), install python-pptx into the research venv: `uv pip install --python research/.venv/bin/python python-pptx`. Then add each PNG with `slide.shapes.add_picture(png, 0, 0, prs.slide_width, prs.slide_height)`. If the user wants an animated deck, give them the MP4 plus the PDF.

## Poster / single sheet
One scene whose end state is the full, finished diagram (often 1080×1350 for feeds, 1080×1920 for stories, or 3000×2000 for print). Render one still at the end. Because readers control the time, labels may be a little denser, but the rules in `visual-quality.md` still apply.

## Subtitles
- Off by default. If burned in: `s.useVoice(id, { subtitles: true })` + `s.scrim()`.
- Separate file: `node tools/srt.mjs out/voice/<id>.json out/<name>.srt --offset 0.4`.
