---
name: visual-explainers
description: Build polished, animated visual explainers — bento-grid HTML pages, social posters (X/LinkedIn), blog figures, and GIF/MP4 illustrations — that teach a technical idea (ML papers, algorithms, systems) in a named design style, then harden them with an automated audit and an adversarial critic subagent with fresh context. Use when the user asks for an "illustration", "explainer", "bento grid", "infographic", "animated diagram", "GIF/MP4 of how X works", "post about this paper", "HTML artifact explaining X", or wants output in the "Play" style. Styles live in styles/; Play is the default.
---

# Visual explainers

You turn one idea into a clear, animated explainer. The bar is high: every number checks out, every animation shows a change of state, text stays readable at the size people actually see it, and loops have no visible seam.

The gold-standard example is `examples/sliding-window-attention.html`. Open it with `?poster=45` and with no query to see both modes, and read its code before building anything new. `examples/swa-portrait-1024x1280.png` is the target level of polish.

## Files

| Path | What |
|---|---|
| `styles/<name>.md` | Design systems. **Read the chosen one fully before writing CSS.** Default: `styles/play.md`. |
| `references/thinking.md` | **Read first.** How to decide what to show: reader questions, the toy world, concept→visual-form table, storyboard template, worked example |
| `references/layouts.md` | Bento recipes, poster sizes per platform, density budgets, type floors |
| `references/motion.md` | The clock engine, animation patterns, seam/sync/jitter rules |
| `references/critic.md` | Adversarial critic subagent: when, how, prompt template |
| `templates/explainer.html` | Working starter with the engine, all poster modes, capture mode, 3 demo cards |
| `scripts/` | `setup.sh`, `audit.js` (quality gate), `shot.js`, `frames.js`, `encode.sh`, `render.sh` |

## Workflow

### 1. Pin down the brief

Settle these before building. Ask only about what you can't infer.

- **Output.** Pick one or more:
  - interactive HTML page (long bento)
  - social poster: still, GIF or MP4
  - blog figure
  - one standalone animated diagram

  Platform sizes are in `references/layouts.md`. When the user says "for X/LinkedIn", default to **1024×1280 (4:5)** and also make a 1200×1200 alternate. A long page gets crushed in feeds, so never post it as the main image.
- **Style.** Use `styles/play.md` unless the user names another style that exists in `styles/`.
- **Attribution.** Should the source (paper, product, author) be named, or should the piece be about the concept only? Users often want the concept only, with the paper used just for numbers. If unclear, default to concept-only and put real-scale numbers in the text.

### 2. Get the facts right

- Fetch the source (paper or docs). Verify every number you plan to show and quote it exactly. If a name is ambiguous (e.g. "MiniMax 7B" when the user means Mistral 7B), find the most likely source and **tell the user** what you used.
- Separate **toy sizes** in the diagrams (W = 3, 8 tokens) from **real-scale numbers** in the text (W = 4,096). Say so in a footnote.
- Keep qualifiers:
  - "theoretical" or "upper bound" when the source says so
  - "in one reported implementation" for measured speedups
- Never write "every benchmark" unless the table really shows that.
- Check the math in your own readouts. Cumulative cost differs from per-token cost: n²/2 versus nW − W²/2 is 4.3×, not 8×.

### 3. Storyboard before code (mandatory)

Read `references/thinking.md` and fill in its storyboard template. This is the step that separates a working explainer from a dashboard of facts. For each card, write down:
- the reader's question it answers
- the visual form, plus one alternative you considered
- the motion that carries the meaning
- the live readout
- what you cut, and why

Run the "mechanism or dashboard" test on every card.

### 3b. Plan the story as cards

Plan 5–7 cards, each with **one idea, one accent and one animated visual**. A good arc:

1. hero: name the idea, give the key numbers, show a live miniature of the mechanism
2. the problem
3. the fix
4. the cost or benefit
5. the non-obvious consequence
6. engineering detail(s)
7. the real-scale payoff

Every card follows the same pattern: numbered badge, title, tinted viz panel, readout line, then a "Why:" caption. On posters, write a short version of each caption, at most about 12 words.

### 4. Build from the template

```bash
cp ~/.claude/skills/visual-explainers/templates/explainer.html <out>/<name>.html
```

Keep the engine block. Replace the demo cards. Rules that make the polish possible:

- **Every animated value is a pure function of one clock `t` in [0, P).** Write a `draw(t)` and a `measure()` per card. Don't use CSS animations or transitions for looped content: they can't be seeked, so captured frames come out stale.
- The loop period P (usually 8s) contains each sub-animation a whole number of times. Each loop ends by fading, not jumping.
- Any rule tied to a mode goes under `.poster` / `.pm-45` / `.capture` classes. The same file serves the web page and every export.
- See `references/motion.md` for the patterns: stepped slide with ease and hold, ride-along arcs, staggered pop, evict-and-drop, scanner chart, cone reveal, and a highlight bar synced to labels.

### 5. Self-check with the audit (mandatory)

```bash
bash ~/.claude/skills/visual-explainers/scripts/setup.sh        # once per machine
S=~/.claude/skills/visual-explainers/scripts
node $S/audit.js --file page.html --query poster=45 --w 1024 --h 1280 --feed 600   # poster
node $S/audit.js --file page.html --w 1000 --h 900 --full                          # long page
node $S/audit.js --file page.html --w 390  --h 800 --full --min 10                 # phone
node $S/shot.js  --file page.html --query poster=45 --w 1024 --h 1280 --times 0,2000,4000,6800 --out /tmp/s
```

The audit fails the page for any of these:
- text that renders below the minimum at feed size
- layout jitter
- a poster that scrolls
- horizontal overflow
- JS errors
- pure black text

It also warns about content spilling out of its card and about loop-seam jumps.

**Look at the screenshots yourself** at several times, including mid-transition and just before and after the loop seam. Fix everything before involving the critic.

### 6. Adversarial critic (mandatory, fresh context)

Spawn a **separate subagent with fresh context**. Use the general-purpose agent, not a fork, so it doesn't inherit your assumptions. Use the prompt in `references/critic.md`. It reports only and never edits.

Then:
- Verify each finding before applying it. Critics are sometimes wrong.
- Apply the real ones.
- Re-audit, re-render, and send it a **round 2** message (SendMessage to the same agent) listing what changed.

Stop after round 2 unless a blocker remains.

### 7. Render and deliver

```bash
bash $S/render.sh page.html <out>/name-portrait-1024x1280 1024 1280 poster=45 6800
bash $S/render.sh page.html <out>/name-square-1200 1200 1200 poster=sq 6800
bash $S/render.sh page.html <out>/name-longform 1000 900 "" 6800 8000 1
```

Each call produces an `.mp4` (H.264, bt709, CRF 12), a `.gif` (15 fps) and a `.png` (a 2× still). Pick the still time at a "complete" moment: everything landed, arcs visible, final chips lit.

- Recommend MP4 for X/LinkedIn. It survives their re-encode better than GIF.
- Write a short README in the output folder covering files, sizes, modes and the facts used.
- Tell the user:
  - what was substituted or assumed
  - what the critic caught
  - which file to post

## Non-negotiables

- One accent per card. Follow the style's text-on-color rules: never white on yellow, never pure black.
- Meaning is never carried by color alone. Add a label, number or legend; on posters, show a one-line legend if a pattern encodes meaning.
- Posters: no text under ~18px on a 1200-wide canvas, because feeds show it at about half size. Use fewer words, not smaller ones.
- Respect `prefers-reduced-motion`: freeze on a representative frame and keep a Play button.
- No layout shift during the loop. Never animate border widths, text that changes line count, or display.
- **No filler chrome on posters or GIFs:** no decorative or credit footers, series labels, "made with Play", or taglines that repeat the title. Every element must teach something. See `references/thinking.md`, step 7.
- Tell the user honestly what you verified, what you assumed and what the critic found.

## Adding a style later

Add `styles/<name>.md` following the contract in `styles/README.md`, which covers tokens, type scale, shape, motion and do/don't rules. If the style needs different structure, add a template override. Nothing else in the workflow changes.
