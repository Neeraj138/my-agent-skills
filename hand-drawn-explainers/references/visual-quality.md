# Visual quality: rules, numbers, and the failures to avoid

## Contents
1. The look · 2. Frame & layout numbers · 3. Staging a process · 4. Text · 5. Motion & pace · 6. Frame checklist · 7. Slop list · 8. Failure gallery (what weak outputs looked like and how to fix them)

## 1. The look
- Background `#121212` with a faint star field (automatic). Hand-drawn font Virgil. Rough strokes with a second pass, diagonal hatch fills at low alpha. Don't change this look per project.
- Palette `SA.C`: blue, teal, purple, lilac, pink, orange, red, yellow, green, white, grey. Before building, write a **colour key** in the script file (e.g. *pathogen = orange, neutrophil = purple, vessel = blue, chemical signal = yellow, damage = red*) and keep it for the whole piece. Neutral text `#bdbdbd`, emphasis `C.yellow`.
- Stroke weight: important outlines 3–4 px, secondary structure 2 px, data bars/arrows ≥ 4 px (at 1080 px frame width). Hairlines (1 px) disappear on phones.

## 2. Frame & layout numbers
| | 9:16 reel 1080×1920 | 16:9 1920×1080 |
|---|---|---|
| safe content area | x 140–940, y 500–1540 (`s.safe`) | x 80–1840, y 60–910 |
| subtitles (if on) | y ≈ 335 over `s.scrim()` | bottom, y ≈ 985 over `s.scrim()` |
| one short label | y ≈ 520 | top, y ≈ 90, or beside the object |
| active diagram width | 600–800 px (60–80 % of safe width) | 1000–1500 px |
| focal object (the one thing acting now) | ≥ 250 px | ≥ 300 px |
| smallest readable marker / dot / icon | ≥ 60 px | ≥ 50 px |

- Reels: Instagram/TikTok UI covers the top 220 px, the bottom 380 px and a right strip (x > 940, y 1000–1540). `--safe` stills show it in red.
- Build diagrams in `s.group()` and finish with `g.center(cx, cy)` or `g.fit(maxW, maxH, cx, cy)`. Use `SA.freeSpot()` to place labels without collisions.
- **Half-empty frames read as unfinished.** If the content's bounding box covers less than ~45 % of the safe area, zoom the camera or enlarge the layout.

## 3. Staging a process (steps, mechanisms, derivations)
- **Three shot distances**, on purpose: a *context* shot (where are we? tissue, crystal, data centre), a *close-up* on the mechanism (the one cell rolling, the one wave adding up), and an *overview* once the parts have been understood. Change shot size roughly every 2–3 beats. Ten beats of the same wide shot with small changes read like a slideshow.
- **Persistent world, moving camera.** For a sequence of steps in one place, build the world once and move the camera to the action (`s.cam(t, 1.2–2.4, cx, cy, zoom)`). Continuity comes from that; abrupt cuts come from rebuilding the picture each step.
- **One operation owns the frame.** The active object is bright and big. Context is dimmed (`dim(t, d, 0.25)`). Anything that is no longer needed fades to 0. Don't leave it at 5 % "for continuity".
- **Cause before effect, visibly.** The operand moves to where the change happens, and then the change happens: the signal reaches the receptor, *then* the cell sticks; the two waves overlap, *then* the sum grows. Don't draw a finished result and then add an arrow to it.
- **Keep identity.** The same object travels between steps (`moveTo`, `along`, `to`). Don't fade in a new copy that looks different.
- **Numbered step titles are optional.** If the user wants the steps named, use one small persistent step tracker (e.g. "3 / 7 · margination") rather than a big title on every frame.
- **Two-panel comparisons** (real vs reciprocal, before vs after) are fine for one or two beats. Don't make them the template for the whole piece.
- **Draw the thing, not a box with its name.** Give each key object its recognisable internal structure, and only the parts the script talks about. Generic rectangles, grids of identical icons and matrices of tiny numbers say "computation happens here" without showing anything.

## 4. Text
- Type scale `SA.TYPE`: hero 150 · title 84 · big 66 · caption 56 · body 46 · label 38 · small 34 (reel sizes; the same px values work at 16:9). Nothing meant to be read goes below 32 px.
- With subtitles on: don't put the spoken sentence on screen too. At most one short label per beat.
- Without subtitles: labels carry the terms the viewer must see spelled (a name, a molecule, a unit), and still only one or two per beat.
- **Jargon follows the brief.** For specialists, show the real names (selectins, ICAM-1), introduced one at a time at the moment they act and placed on the object. For newcomers, the plain function ("sticky hooks") with the real name only if it helps.
- **Equations and symbols** only if the brief allows them. Build them up from things already shown. Never leave an unexplained formula on screen as decoration.
- No footers, sources, "illustration:", "(simplified)", parameter lists or watermarks. Sources live in `scripts/<topic>.md`.
- Labels never overlap lines, other labels or the object they name. Use `bg: C.bg` pills, `SA.freeSpot`, or a leader line out to free space.

## 5. Motion & pace
- Voiced: about 2.2 spoken words/s, with ~0.8–1.0 s pauses between beats. Specialists may want ~2.6 w/s; ask if unsure.
- Elements enter by drawing, typing, popping or fading over 0.3–0.9 s, staggered 0.08–0.2 s. Camera moves take 1.2–2.4 s, eased.
- Hold a finished picture ≥ 1 s before changing it. No dead frame longer than 3 s (add a pulse, a drift or a counter). Never have five things animating at once.
- Visuals lead or land on the word (start 0.1–0.3 s early via `vo.cue`), never trailing it by more than 0.5 s.
- Transitions: within a world, move the camera. Between worlds, fade the old act to 0 *before* the move and start the new act's first element on the cue, so you never pan through empty space.

## 6. Frame checklist: run it on every contact sheet
- [ ] The phrase being spoken is what the picture is doing at that moment.
- [ ] One clear focal point. The eye knows where to go within 0.5 s.
- [ ] The diagram fills 60–80 % of the safe width, centred, with equal side margins.
- [ ] Every label is readable in a 480 px-wide sheet tile (phone test).
- [ ] No collisions (label/label, label/line, object/frame edge, object/subtitle band, reel UI zones).
- [ ] No leftovers from earlier beats unless they're doing a job right now.
- [ ] Colours match the colour key.
- [ ] Consecutive tiles differ in shot size or composition at least every 2–3 beats.
- [ ] The facts and depth match the brief, and nothing on screen contradicts the narration (what's "bigger/closer/better" must *look* it).
- [ ] The final frame is clean: the real diagram doing its thing, not a logo card or a repeat of the subtitle.

## 7. Slop list (scripts, captions, labels)
- "It's not X, it's Y" / "not just X but Y"; reflexive triplets; puffery (pivotal, game-changer, revolutionary, unlock, harness, delve, seamless, robust, landscape, journey, testament).
- Template hooks ("Ever wondered…", "Let's dive in", "Buckle up", "Here's the thing") and summary endings ("In summary", "At the end of the day").
- Vague authority ("experts say", "studies show") and hedging stacks ("can often potentially").
- Visual slop: decorative sparkles or emoji, rainbow colours with no meaning, logo end cards, a pencil or other decoration in every frame, hand-placed off-centre diagrams.

## 8. Failure gallery: patterns seen in weak outputs, and the fix
| what it looked like | why it fails | fix |
|---|---|---|
| a custom renderer instead of the engine: thin 1 px lines, tiny text, flat look | off-style, unreadable on a phone, loses layout helpers | use `render.mjs` + the engine; add components there |
| the same wide shot for every step, the action ~10 % of the frame (e.g. one small cell rolling in a long vessel) | the viewer can't see the mechanism; it reads as a slideshow | close-up on the action: zoom 1.6–2.5× onto the cell, then pull back |
| a slide title + two panels on every frame | lecture-slide feel, half the frame is headings | drop per-frame titles; use the two-panel layout only where comparing *is* the point |
| jargon or a chemistry chain as a caption (e.g. "O2 → superoxide → H2O2 → HOCl", "PECAM-1 / CD31") with nothing showing it | text the viewer has to read while the picture does nothing | show the process (the burst inside the phagosome), label one term on the object, put the chain in narration if the depth calls for it |
| unexplained symbols (2π/a, |A|², q = k_out − k_in) left on screen | looks rigorous, teaches nothing | build each symbol from something shown, or leave it out |
| grids of identical small boxes / matrices of tiny numbers | "computation exists" without showing what changes | 3–5 large cells, with a value visibly moving and changing |
| dimmed ghost text and old diagrams left at the edges | clutter, competing meanings | fade fully to 0 once its job is done |
| a tiny protagonist (a 30 px stick figure or notebook) | no emotional anchor; unreadable | ≥ 250 px, placed beside the diagram, one per act |
| long pans through empty space between steps | dead frames | start the next element on the cue; cut instead of panning when worlds are far apart |
| a pile of verification reports, gates and logs while the frames were never looked at | process theatre; the quality problems were visible at a glance | open the sheet, run §6, fix, repeat |
