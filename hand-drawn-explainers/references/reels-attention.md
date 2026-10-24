# Reels & shorts: the cover and the first 3 seconds

A vertical reel is almost always going to Instagram, TikTok or YouTube Shorts. Two moments decide whether anyone watches it:
1. **The cover (thumbnail):** what people see in the profile grid, in search and in shares before they tap.
2. **The first ~3 seconds after the tap or swipe:** viewers decide whether to keep watching or scroll on.
Plan both before the rest of the piece, in the script stage, not as an afterthought at export.

## Brief additions (ask with the §1 questions)
- Which platform(s)? Instagram, TikTok, YouTube Shorts, LinkedIn…
- Is it part of a series or channel with an existing cover style (colours, a recurring title position, a handle)?
- Any hook or cover title they already have in mind?

## The cover
**Job:** make the viewer curious in under a second, at thumbnail size.

What works:
- **One striking visual and one short title**, nothing else. Title 2–6 words, ≥ 110 px (it shows at ~1/4 size in the grid), with one highlighted word in an accent colour. Text doesn't wrap by itself, and at 110 px only ~12–14 characters fit in the 800 px safe width. So break the title into 2–3 lines with `\n`, and check each line with `SA.measure(line, size) <= 800`.
- **A question or a tension the video resolves**, in the audience's words. Examples: "Why does a wound swell?", "How X-rays see atoms", "What happens when you type a URL?". Don't use clickbait the video doesn't pay off ("You won't believe…"), and never a bare topic label like "Inflammation, part 1".
- **The visual is the most interesting moment of the piece:** the payoff picture or the dramatic middle (a neutrophil squeezing through the vessel wall), drawn big. Never an empty set-up frame.
- **High contrast and simple shapes.** It must still read when shrunk to ~270 px wide. Check by scaling it down: `magick out/<name>_cover.png -resize 270x out/<name>_cover_small.png`, then open the small file and look at it.
- **Inside the crop.** Instagram shows a 4:5 crop in the feed and a 3:4 crop in the profile grid (as of 2025; check if it looks off). Keep the title and the key visual between y ≈ 300 and 1620 on a 1080×1920 frame. Render with `--cover` to see the crop: shaded = cut in the feed, dashed = the grid tile.
- **Series consistency:** same title position, type size and colour logic across a series, so the grid reads as a set.

How to make it:
- Build it as its own scene file, `scenes/<name>-cover.js` (`duration: 2`, no voice; add it to `scenes/index.js`), because the player loads `scenes/<scene name>.js`. To make it match the video, put the shared drawing code (e.g. `function drawNeutrophil(g, x, y, size) {…}`) in `scenes/<name>-parts.js` and list that file in both scenes' `requires`. Render one still: `node render.mjs <name>-cover --still 1 --cover --out out/<name>_cover_check.png` for checking, and without `--cover` for the deliverable `out/<name>_cover.png`.
- Some platforms only let you pick a frame from the video (TikTok and Shorts mostly do). So make the **opening frames work as a cover too**: the hook picture and hook text should be complete by ~0.5 s and hold for a moment (see below).
- Deliver `out/<name>_cover.png` (1080×1920) alongside the MP4, and say which second of the video is the best fallback frame.

## The first 3 seconds
- **Frame 0 is never empty.** Platforms autoplay and also show the first frame as a preview. The engine's `drawIn` starts from nothing, so the hook picture must be visible at t = 0 (a node with no reveal animation is visible from the start) or fully drawn by ~0.4 s. No black lead-in, no slow star-field fade, no title card.
- **Speech starts at once:** the first word by ~0.3 s (`useVoice(id, { offset: 0.2 })`). No "Hi guys", "In this video", "Today we'll learn" or channel intro.
- **Hook text on screen for muted viewers**, even when subtitles are off: the cover question or a 3–7-word version of it, big (≥ 84 px, split with `\n` so each line fits the 800 px safe width), in the upper safe area (y 260–520), for the first ~2–3 s. This is the one exception to "text is a garnish"; remove it once the voice has taken over.
- **Movement from the first frame.** Something is already happening (cells flowing, a wave travelling, a counter running) while the hook is spoken. A still picture with a voice over it reads as a slideshow and gets swiped.
- **The hook is a gap the viewer wants closed:** a surprising fact, a visible problem, or a question about something they've seen. Pitch it at the chosen depth. A newcomer gets "A splinter, and an hour later your finger is red, hot and swollen. Why?" A specialist gets "Every neutrophil in that abscess was in the bloodstream yesterday. How did it get out?"
- **Match the cover.** The first second should show what the cover promised (same visual, same question), so the viewer knows they're in the right place.
- **Earn the next 10 seconds:** a visible change every 1–2 s, the first real piece of the answer by ~8–10 s, and no set-up that only pays off at the end.
- **End so it loops** where possible: the last frame flows back into the first (the same picture at rest), which encourages rewatches. The callback line can do this ("…and that's why the splinter swells").

## Checklist (reels only, on top of the frame checklist)
- [ ] The cover reads at 270 px wide: one visual, a title of ≤ 6 words, and nothing important outside y 300–1620.
- [ ] The cover asks something the video answers. No bare topic labels, no clickbait.
- [ ] The t = 0 frame shows the hook picture (render `--still 0` and look at it).
- [ ] Voice starts by ~0.3 s, and the hook text is on screen by ~0.3 s.
- [ ] Something moves in the first second.
- [ ] The first piece of the answer arrives by ~10 s.
- [ ] Nothing important sits under the platform UI (`--safe`).
