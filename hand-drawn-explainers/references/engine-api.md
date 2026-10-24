# sketchanim engine API

Files: `engine/sketchanim.js` (engine), `player.html` (preview), `render.mjs` (stills/sheets/MP4 at 60 fps), `engine/hnsw.js` (example of a real algorithm with a trace), `tools/` (`voice.mjs` ElevenLabs, `voice_local.py` offline Kokoro, `asr_check.py` clarity, `srt.mjs` subtitle file, `excalidraw-lib.mjs` icon import).

## Contents
1. Scene & camera · 2. Animating · 3. Primitives · 4. Components · 5. Layout · 6. Text & subtitles · 7. Voice · 8. Packs · 9. Rendering · 10. Gotchas · 11. Themes, platforms & formats · 12. Extending

## 1. Scene & camera
```js
SA.scene(name, opts, (s, SA) => { ... })
```
opts: `width/height` (1080×1920 reels, 1920×1080 default, 1080×1080 square), `duration` (overridden by `useVoice`), `worldHeight` (tall world for vertical scrolling), `seed` (star field), `stars: false`, `requires: [...]` (scripts to load first, or a function `(params) => [...]`), `audio`, `audioOffset`.
- World coordinates; the camera looks at `(cx, cy)` with `zoom`: `s.cam(t, dur, cx, cy, zoom, ease)`, instant: `s.camera.set(t, {cx, cy, zoom})`.
- HUD (screen-fixed) layer: `s.hud(node)`, `s.caption({...})` (centred text on the HUD), `s.say(text, t0, t1, {hl, size})` (captions-only narration line at y 345), `s.scrim()` (fades the top so subtitles stay readable).
- `s.safe` = `{left, right, top, bottom, cx, captionY, labelY}` for the format (reels: x 140–940, y 500–1540, captions 345, label 520; 16:9: x 80–1840, y 60–910, captions H−95 at the bottom, label 90). `s.W`, `s.H`.
- `s.scrim()` fades the subtitle band (top on reels, bottom on 16:9). Only needed when subtitles or `s.say` captions are on.
- `SA.params` = URL/`--param` values (e.g. `pack=...`, `theme=light`, `platform=shorts`, `format=4x5`).
- More opts: `theme` ('dark' | 'light'), `platform` ('instagram' | 'shorts' | 'linkedin' | 'all', vertical video only), `formats` ({ '4x5': [1080, 1350] }: alternate sizes of the same scene). See §11.

## 2. Animating (every node; chainable; t in seconds)
`to(t, d, { sx, sy })` stretches a node on one axis (squeeze a cell through a gap; default 1) · `drawIn(t, d)` pen-draw (strokes trace, text writes; dots/sparkles/counters have nothing to trace — use `popIn`/`fadeIn`) · `fadeIn(t, d)` · `popIn(t, d)` (scale from 0 with overshoot) · `fadeOut(t, d)` · `dim(t, d, to=0.15)` (never brightens an already-faded node) · `to(t, d, {anyProp: value}, ease)` · `set(t, {prop})` (jump) · `moveTo(t, d, x, y)` · `along(t, d, [[x,y],...], ease)` (follow a path at constant speed) · `recolor(t, d, color)` · `undraw`.
**Order matters:** each `to()` starts from the value at its start time as known *so far*, so add a node's animations in time order.
Eases: `linear in out inOut smooth back step`. Props interpolate numbers, `#hex` colours and arrays.
A node is invisible before its first reveal key only if you give it one (`drawIn/fadeIn/popIn`); otherwise it's visible from t=0.

## 3. Primitives (`s.<name>(props)` and also `group.<name>(props)`)
| builder | key props | notes |
|---|---|---|
| `box` | x, y (top-left), w, h, r, color, fill, fillAlpha, hachureGap | rough rounded rect, hatch fill |
| `ellipse` | x, y (centre), rx, ry | |
| `line` / `arrow` | points [[x,y]...] | rough polyline; arrow adds a head |
| `curve` | from, to, c1?, c2?, dash, width, flow | smooth bezier, dashed connectors; `flow: 30` animates dashes |
| `text` | text, x, y, size, color, align, reveal ('write'/'type'/'fade'), hl, bg, maxW | `*word*` = highlighted in `hl`; `\n` forces a line break; `maxW` wraps into even lines no wider than that (captions default to frame width − 120; use 800 on reels to stay in the safe zone); `bg` = backing pill |
| `counter` | value, prefix, suffix, decimals | rolls with `to(t, d, {value})`; wrap in `s.hud(...)` to pin it to the screen (y≈520), reveal with `fadeIn` |
| `dot` | r, color, ring | data point |
| `sparkle` | size, color | ✦ twinkle — use sparingly, one per payoff |
| `flow` / `bar` | w, h, style 'dots'/'dashes', count, rows, speed, gate | particle lanes (data moving) |
| `grid` | w, h, cell | grid "filter" box |
| `icon` | name ('doc','db','user','cloud','brain',...), size | built-in path icons (`SA.ICONS`); **x/y = top-left** (sketches and chips are centre-anchored) |
| `stick` | size | simple stick figure |
| `shape` | paths: [svg path strings] | any rough path |

## 4. Components (groups with behaviour)
- `s.chip({ text, size, color, textColor })` → centred rounded word box; `chip.w/h` known at build. `.drawIn(t)`, `.recolor(t, d, color, textColor)`.
- `s.chips(words, { y, cx, size, gap, maxW, chip: {...} })` → array of chips laid out centred, wrapping rows; `chips.group`.
- `s.plane({ x, y, w, h, shear, color, label, margin })` → tilted floor (maps, layers). `plane.at(u, v)` → world point; `plane.local(u, v)`.
- `s.graph({ nodes: [[x,y]], edges: [[i,j]], r, color, edgeColor })` → `.drawIn(t, nodeSpan, edgeSpan)`, `.walk(path, t0, dt, color, {onStep})` (throws if a step has no edge — keeps animations honest), `.reset(t)`.
- `s.barChart({ values, labels, colors, max, h, barW, gap, valueFmt })` → bottom-left anchored; `.drawIn(t, stagger, grow)`.
- `s.sketch({ pack, item, size | height, colors, tint, solid })` → an Excalidraw library item (see Packs).
- `s.group({x, y})` → container; has every builder; `.center(cx, cy)`, `.fit(maxW, maxH, cx, cy)`, `.drawIn(t, d, span)`.

## 5. Layout
- `node.bbox(t)` → `[x0, y0, x1, y1]` in parent coords (includes children; text measured in the real font).
- `group.center(cx = W/2, cy?)` moves content so its box is centred. Build first, centre last.
- `group.fit(maxW, maxH)` scales down to fit, then centres.
- `SA.measure(text, size)` → width in px in the hand-drawn font.
- `SA.freeSpot(x, y, w, h, obstacleBoxes, gap, bounds)` → centre for a label that avoids other boxes and stays in `bounds`.
- `SA.union(a, b)` box union. `SA.TYPE` type scale. `SA.C` palette: `bg blue teal purple lilac pink orange red grey green yellow white dim`.

## 6. Text & subtitles
- **Subtitles are off by default.** `useVoice(id, { subtitles: true })` turns on word-synced subtitles (reels: 54px at y≈335; 16:9: 46px at the bottom; current word yellow, 2 lines max); pass an object to override `{ y, size, maxChars, color, hl }`. A separate `.srt`: `node tools/srt.mjs out/voice/<id>.json out/<name>.srt`.
- With subtitles on, don't duplicate them in another caption. One short label (≤ 6 words) per beat is the most extra text a beat should carry.

## 7. Voice
```js
const vo = s.useVoice('my_vo', { offset: 0.4, display: [['P G vector', 'pgvector']], tail: 2.5, subtitles: false /* default; true or {...} to show */ });
vo.cue('phrase')     // seconds when the phrase starts (throws if not found — fix the phrase, don't guess times)
vo.cueEnd('phrase'); vo.end; vo.words
```
Needs `out/voice/my_vo.js` in `requires` (written by `tools/voice.mjs tts` or `tools/voice_local.py`). `display` maps spoken spellings to on-screen spellings.

## 8. Packs (Excalidraw libraries)
`requires: ['assets/packs/<slug>.js']`, then `s.sketch({ pack: '<slug>', item: '<name>', height: 200, x, y }).drawIn(t, 1.2)`. Centre-anchored. Colours are mapped like Excalidraw dark mode and snapped to the palette; `tint: C.teal` makes it monochrome; solid fills become hatching unless `solid: true` (so a tinted solid phone renders as a hatched block — render once and look); `text: false` drops labels baked into an icon. Catalogue: `references/packs.md`, gallery images in `assets/packs/gallery/<slug>.png`.

## 9. Rendering
- Preview: open `player.html?scene=<name>` (file:// works; audio plays in sync). A scene in a project folder is `?scene=<project>/<name>` and loads `<project>/<name>.js`; its default renders go to `<project>/out/`.
- Stills: `node render.mjs <name> --still 3,8.5 [--safe] [--out dir/name_{t}.png] [--param k=v]` (`{t}` → the time; folders are created; `--safe` overlay is for vertical scenes).
- Contact sheet: `node render.mjs <name> --sheet 2,4,6,... [--cols 6] [--safe] --out out/<name>_sheet.png`. `--cover` overlays Instagram's cover crops (4:5 feed, 3:4 grid).
- Video: `node render.mjs <name>` → `out/<name>.mp4` (60 fps default, H.264 + AAC, loudness −15 LUFS target). `--from/--to` for a section, `--audio file` overrides. GIF/slides/PDF: `formats.md`.

## 10. Gotchas
- z-order = creation order. Bring items forward with `s.items.splice(s.items.indexOf(n), 1); s.items.push(n)`.
- `bbox()` before `center()` uses the end state (t = ∞) — fine for static layouts; for moving groups centre the resting layout.
- Rough shapes cache geometry by size; animating `w/h` re-generates each frame (fine, but keep it to a few nodes).
- Deterministic randomness: use `SA.rng(seed)`, never `Math.random()`.
- Keep world sections apart (e.g. 1400 px) and move the camera between them; fade out the previous act before the move.

## 11. Themes, platforms & formats
- **Themes**: `SA.THEMES.dark` (default) and `SA.THEMES.light`. The scene's theme is applied to `SA.C` before it builds. Role names: `C.ink` (main text and strokes; `C.white` is the same colour, kept for old scenes), `C.muted` (secondary text), `C.dim` (faded structure), `C.bg` (background, label pills), `C.mid`, plus the hues `blue teal purple lilac pink orange red green yellow grey`. In light mode, yellow is amber so it stays readable. Icon packs map to either theme automatically. Never hard-code a hex grey, because it will vanish in one of the themes.
- **Platforms** (vertical 9:16 only): `SA.PLATFORMS` gives the UI cover per app, in px on a 1080×1920 frame: instagram top 220 / bottom 380, shorts 225 / 480, linkedin 150 / 300, all = the union. `s.safe.bottom` follows it (1540 / 1440 / 1620 / 1440). `--safe` draws the scene's platform; `--safe shorts` previews another.
- **Formats**: `opts.formats = { '4x5': [1080, 1350] }` plus `--param format=4x5` renders the same scene at another size. `s.reel` is true only for tall (≥ 1.6) frames; 4:5, 1:1 and 16:9 use bottom subtitles and the 16:9-style `s.safe`. Lay scenes out from `s.W`, `s.H` and `s.safe`, not fixed pixels, so the extra format works.

## 12. Extending (see SKILL.md §6)
- `SA.extend({ name(p) { return this.add(new Thing(p)); } })` adds `s.name()` and `group.name()`. Pass `{ override: true }` to replace an existing builder on purpose.
- Core classes to build from: `SA.Node`, `SA.Group`, `SA.Box`, `SA.Ellipse`, `SA.Line`, `SA.Curve`, `SA.Text`, `SA.Rough` (any SVG path), `SA.Dot`, `SA.Sketch`. Use `SA.nextSeed()` for rough-shape seeds, `SA.measure(text, size)` for text width, and `SA.C` for colours.
- A component needs `localBox()` (or children with boxes) so `bbox / center / fit` can measure it, and usually a `drawIn(t, d)` that reveals its parts in order. Example: `engine/ext/callout.js`.
- Regression check: `node tools/regress.mjs baseline`, then edit, then `node tools/regress.mjs check`.
