---
name: hand-drawn-explainers
description: Make hand-drawn, Excalidraw-style animated explainers on any subject (science, medicine, maths, engineering, history, business, software…) with the bundled sketchanim engine. Outputs — vertical reels/shorts, 16:9 videos, GIFs, slide decks, single stills/posters/sheets — scripted, voiced (ElevenLabs or a local voice) or captions-only, rendered at 60 fps. Use whenever someone wants an explainer, reel, short, animated diagram, step-by-step process animation, "excalidraw-style" visual, or wants to fix, re-voice or polish one of these, even if they don't name the engine.
---

# Hand-drawn explainers

You make explainers that look hand-drawn: a dark canvas, rough marker strokes that draw themselves, a few colours that each mean something, and one idea made obvious.
`ROOT` = the working project that contains `engine/sketchanim.js`. Run every command from `ROOT`.

### Setup (once per project)
- If the current folder (or one the user names) already has `engine/sketchanim.js` and `render.mjs`, that's `ROOT`.
- Otherwise create one from the kit bundled with this skill: `bash <this skill's folder>/kit/setup.sh <project-dir>`. It copies the engine, renderer, tools, fonts and icon packs, installs the npm packages and Chromium for rendering, builds the Python voice environment (`research/.venv`, Python 3.12) and downloads the offline voice model (~340 MB; skipped if `KOKORO_DIR` is set). It finishes by rendering a test still.
- Needs node ≥ 18, ffmpeg, Python 3.12 (or `uv`), and ImageMagick for slide PDFs. If something is missing, tell the user the exact package to install rather than working around it.
- `kit/scenes/` has three reference scenes: `attention-reel.js` (captions only), `cdn.js` (short reel with icon packs), `pack-gallery.js` (browse any icon pack: `node render.mjs pack-gallery --param pack=<slug> --still 3.5`).

These rules are written for any agent or model. Follow them literally. Wherever a step says to look at an image, open the PNG and look at it. Don't treat a passing script or a JSON report as a stand-in for looking.

## 0. Non-negotiables

1. **Use the engine.** Every frame comes from `engine/sketchanim.js` through `render.mjs`. Don't write a new renderer (Cairo, PIL, matplotlib, canvas from scratch, Manim…). Engine-less projects have come out thin-lined, tiny and off-style every time. If the engine lacks something (a cell, a lens, a gear), add a component to the engine (see §6). Keep each project's files in `scenes/`, `scripts/`, `out/`, not in a new top-level folder with its own toolchain.
2. **Ask before you build** (§1). Audience level, format, voice and subtitles (default: none) are the user's decisions. Don't assume "beginner" or "expert".
3. **60 fps** for every video (`render.mjs` defaults to 60).
4. **One focal action per moment, drawn big.** The thing being explained fills most of the frame (§3).
5. **Look at your frames** at every checkpoint (§2, steps 6 and 7), and get them reviewed with fresh eyes.

## 1. Brief: ask the user first

Ask these in one short message, offer a recommended default for each, and wait for answers. Skip a question only if the user already answered it.

| ask | why | typical options |
|---|---|---|
| **Who is it for, and how deep?** | sets vocabulary, analogies, which terms appear on screen | complete newcomer · curious non-specialist · student of the field · practitioner / specialist |
| **Output(s)** | changes layout and pacing | 9:16 reel/short · 16:9 video · 1:1 · GIF loop · slide deck (PDF/PNG) · single poster/sheet |
| **Length** | | reel 20–90 s · lesson 2–8 min · slides: number of slides |
| **Voice** | | ElevenLabs (needs their API key) · local offline voice (free, decent) · captions only · silent |
| **Subtitles?** | default is **none**; ask, don't assume | none (default) · burned-in word-synced · separate `.srt` file |
| **Language & sources** | accuracy | e.g. "follow Robbins & Cotran", "in Spanish", "British voice" |
| **Anything that must or must not appear** | | a mnemonic, a case example, no maths, show the equation… |

Voice key handling: if they pick ElevenLabs, check `ROOT/.env` for `ELEVENLABS_API_KEY`. If it's missing, ask the user to add it there themselves (never ask them to paste it into chat, never print it). If they don't have one, use the local voice. Details: `references/voiceover.md`.

Write the answers at the top of `scripts/<topic>.md`. Every later choice is checked against them.

## 2. Workflow

1. **Understand the topic** from the sources the user named or standard references. Write 5–15 fact notes under the beat table in `scripts/<topic>.md`. They stay off screen.
2. **Script**: a beat table `| # | voiceover / caption | picture | on-screen text |`. Read `references/script-craft.md`. For slides or a poster, the "voiceover" column holds speaker notes or the one sentence the slide must make obvious.
3. **Script review** with fresh eyes (§5). Fix, then lock the script.
4. **Voice** (if voiced). ElevenLabs: `node tools/voice.mjs tts <voiceId> out/voice/<id>.txt out/voice/<id> 0.92`. Local: `research/.venv/bin/python tools/voice_local.py out/voice/<id>.txt out/voice/<id> --voice af_heart --speed 0.9`. Then check clarity with `research/.venv/bin/python tools/asr_check.py <plain.txt> out/voice/<id>.mp3`.
5. **Build** `scenes/<name>.js` (subtitles are off unless the user asked: then `s.useVoice(id, { subtitles: true })` + `s.scrim()`) from `templates/` (`reel.js` voiced 9:16, `reel-captions.js` captions-only, `landscape.js` 16:9 / slides). Add the name to `scenes/index.js`. API: `references/engine-api.md`. Icons: `references/packs.md`. Visual rules: `references/visual-quality.md`.
6. **Check stills** at every beat: `node render.mjs <name> --sheet t1,t2,… --safe --out out/<name>_sheet.png`. Open the sheet and look at it, then run the frame checklist in `references/visual-quality.md`. **Phone test:** each tile is about 480 px wide. If a label can't be read in the tile, it's too small. Open single frames at full size (`--still t`) for anything dense. Fix and repeat until the checklist is clean.
7. **Render review** with fresh eyes (§5), using a sheet every ~2 s plus the script. Fix, then re-check.
8. **Export** the formats the user asked for (`references/formats.md`): MP4 at 60 fps, GIF, slides PDF, poster PNG, cover still.
9. **Deliver**: give the file paths and one line on what to look at. Mention anything you could not do.

## 3. What good looks like (short version; full rules and numbers in `references/visual-quality.md`)

- **Big and centred.** The active diagram spans 60–80 % of the safe width. Build it in `s.group()` and call `g.center()`. Don't hand-place a diagram's left edge.
- **Shot sizes vary like a film.** Use a context shot (where we are), a close-up on the mechanism (where the action is) and an overview once it has been earned. Move the camera (`s.cam`) to the action instead of drawing small things in a big static frame.
- **One operation owns the frame.** What just happened stays (dimmed) only while it's still needed, then it goes fully. No ghosts at 5 % opacity.
- **Things transform; they don't get re-drawn.** Carry the same object (a cell, a token, a packet) from step to step so the viewer tracks identity and the flow has no abrupt cuts.
- **Specific, not generic.** Draw the thing itself with its meaningful internal parts (a neutrophil with a lobed nucleus and granules; a GPU with memory, compute and a bus). Don't use a labelled grey box.
- **Text is a garnish.** The voice (and subtitles, if the user wants them) carries the words. Per beat, use at most one short on-screen label (≤ 6 words, ≥ 38 px on a 1080-wide frame). Without subtitles, labels must carry the key terms a viewer needs to see spelled; never repeat the spoken sentence as on-screen text. Technical terms appear only if the chosen depth needs them, and each appears once when it's introduced. No footers, citations, equations nobody explains, or slide titles on every frame.
- **Colour = meaning.** Assign each colour one role for the whole piece and never reuse it for something else.
- **Calm, continuous motion.** Something changes every 0.5–2 s, nothing sits dead for more than 3 s, and five things never animate at once.

## 4. Formats in one line each (details and commands: `references/formats.md`)

- **9:16 reel**: 1080×1920. Keep content inside the Instagram/TikTok safe zone (`s.safe`, red in `--safe` stills).
- **16:9 video**: 1920×1080. Subtitles sit at the bottom. Diagrams live in y 60–910.
- **GIF**: render the MP4, then convert with the palette command. GIFs can't really do 60 fps, so use 30 fps there, or deliver a looping MP4/WebP at 60.
- **Slides**: one scene, one beat per slide. Export the settled frame of each beat as PNG, then bundle into a PDF (or PPTX).
- **Poster / sheet**: one large still of the finished diagram at the end state. Same rules, but labels may carry a little more because the reader controls time.

## 5. Fresh-eyes review (scripts and renders)

The reviewer must not have seen your reasoning. If your environment can spawn a sub-agent, do that and give it only the brief, the script and the images. If it can't, start a separate session, or write the review as a separate pass in which you role-play each persona and answer every question in writing.

Prompt (adapt it to the chosen audience):
> You are reviewing an explainer for **<audience and depth from the brief>**. Judge it as (1) that viewer: where do you get lost, is any term or symbol used before it is shown, does each step follow visibly from the last? (2) a subject expert: is anything wrong or misleading at this depth? (3) a creative director: is the focal action big and obvious in every frame, is there variety of shot size, is anything empty, cluttered, overlapping, off-centre, too small to read on a phone, or a leftover from an earlier beat? (4) an AI-slop detector (`references/visual-quality.md` → slop list). List concrete problems with timestamps, worst first, and say how to fix each one.

Apply the fixes you agree with, re-render, and look again. One round is the minimum. Do another if the first one found structural problems.

## 6. Extending the engine

- New reusable visual (cell, organ, circuit element, gear, molecule, chart type)? Add a component class to `engine/sketchanim.js` next to `Chip / Plane / Graph / BarChart / Sketch`, give it `localBox()` so centring works, and register a builder in `Build`. Re-render `attention-reel` and `cdn` stills before and after, and compare them, so you know nothing else changed.
- Icons: browse `assets/packs/gallery/*.png` first (`references/packs.md`). The packs lean toward tech/people/objects. For other fields, draw your own with `group.shape({ paths })` or a component.
- A real process deserves a real simulation: if you show an algorithm, a physical process or a statistic, compute it in JS (e.g. `engine/hnsw.js`, a real nearest-neighbour search with a step trace) and animate the trace, so the picture can't lie.
- References: `scenes/attention-reel.js` (captions only, one analogy carried through) and `scenes/cdn.js` (short reel with icon packs). Open one before starting your first scene.
