# Layouts

## Output sizes

**Render only the size(s) the user asks for.** This table is a menu, not a checklist.

| Target | Canvas (CSS px) | Mode | Notes |
|---|---|---|---|
| X / LinkedIn feed (default when no size is given) | **1024×1280** (4:5) | `?poster=45` | Tallest portrait both feeds show uncropped. Main deliverable. |
| Landscape post / slide | 1600×900 (16:9) | `?poster=wide` | Good for 4–6 cards in two rows of three. |
| Blog hero / OG image | 1200×675 (16:9) or 1200×630 | `?poster=blog` | Hero plus 3 cards at most. |
| Inline blog figure | 720–960 wide, auto height | plain page, `--full` capture | One or two cards; one idea. |
| Interactive web page | 980 max container | plain | Long bento, controls bar, sliders, longer captions. |

To add a size, add a class rule such as `.pm-xyz{--pw:...;--ph:...}`, then pass `?poster=xyz`.

Always export **PNG at 2×** for stills. For motion, export **MP4** (preferred by the platforms) **and GIF**.

Feeds show posters at about **500–600px** wide. Audit with `--feed 600 --min 9`.

## Bento (web page)

- 6 columns with a 14px gap. Spans are set with classes `s2`, `s3`, `s4` (full width is the default). Use the reference rhythm: **hero 6 → 3+3 → 2+4 → 3+3 → 6**.
- Put wide visuals (multi-row SVGs, timelines) in `s4` or full width. Put compact metrics and charts in `s2`.
- Under 760px, everything stacks into one column. Re-check every SVG at 390px. Its text scales with the viewBox, so give labels CSS sizes that grow under 760px. For example, `@media(max-width:759px){.layers .ll{font-size:26px}}`.
- A wide strip of chips (as in the hero) **pans** to keep the active region in view on narrow screens. Don't scale it below 0.8.

## Poster grids

Posters are a fixed canvas: `.poster body{width:var(--pw);height:var(--ph);overflow:hidden}`. The audit fails the poster if it scrolls.

- **4:5 (1024×1280).** Hero across the top, about 300px tall, then **two rows of three cards**, each about 420px tall. A two-column grid of three rows was too short for matrix-style visuals in testing.
- **16:9 (1600×900).** Hero on the left, spanning two rows, with a 2×2 grid of cards to its right. Or a short hero band with a row of four cards below it.

## Density budget per poster card (about 330×420 at 1024 wide)

- Title on one line, at 22–26px. Shorten titles until they fit ("Layers add reach", not "Layers stack the reach").
- **One visual**, plus **one readout line**, plus **one short caption** of 12 words or fewer, at 17–19px.
- Hide the following on posters. Use the `.why.long`/`.why.short` pairs and `.web-only`.
  - legends; but keep a one-line legend when a pattern carries meaning
  - sliders
  - matrix column headers (keep the row labels)
  - long captions
  - secondary chips
- Visuals must not wrap unpredictably. Use fewer tokens, shorter words or abbreviated labels ("L1–L4").
- If the chips in a sequence can't all fit, show the first, a later one and the final one. Make sure the visible chips map to what the diagram lights up.

## Hero patterns

- **Live miniature.** The hero contains a tiny version of the mechanism, such as a window sliding over a sentence with arcs to the attended tokens. This is the most important frame for scroll-stopping.
- **Text block.** H1 plus one or two sentences that carry the real-scale numbers and qualifiers.
- **Stat chips.** 3–4 short chips. On a 4:5 poster, place them in a row under the paragraph.
- Avoid dead bands. Reserve headroom above the strip only if the arcs that need it are visible on most frames.

## Long page extras

- A sticky controls bar (Pause, speed pills). It is hidden in capture mode.
- A final full-width "payoff" card with metric tiles that count up once on entry.
- A footer with the toy-versus-real disclaimer, plus sources if the user wants attribution.
