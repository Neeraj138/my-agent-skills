# Adversarial critic

## Why a separate subagent

You built the piece, so you see what you meant to draw, not what is drawn. A **fresh-context** critic sees what is really on the screen. Spawn it with the Agent tool using the general-purpose type, **not a fork**, because a fork inherits your blind spots.

- It **reports only** and never edits files.
- It writes scratch files to a temp or scratchpad directory, never to the deliverable folder.
- You verify every finding before applying it. Critics are occasionally wrong or overreach.

## When

1. **Round 1**, after your own audit passes and you've looked at the screenshots, but before final renders.
2. **Round 2**, after you apply the fixes. Send it to the same agent with SendMessage, so it remembers round 1 and can check for regressions. List exactly what changed and any new user constraints.
3. Stop there unless a blocker remains.

In practice, round 1 found:
- a mobile blocker
- two false or overreaching factual claims
- a wrong ratio
- a contradictory end state
- loop-seam awkwardness

Round 2 found:
- feed-size legibility
- legend loss on the poster
- a label/bar desync
- a loop flash

## Prompt template

Fill in the brackets. Keep the checklist.

```
You are an adversarial red-team critic. Find everything wrong with this deliverable; don't praise it.
Do NOT edit deliverable files. Report only. Write any scratch output to [SCRATCH_DIR] only.

USER REQUEST (verbatim): [paste the user's words]
INTERPRETATION / ASSUMPTIONS I MADE: [e.g. "MiniMax 7B" read as Mistral 7B; concept-only, no paper name]
DELIVERABLES in [OUT_DIR]: [files + what each is + sizes + loop length]
HTML modes: plain page; ?poster=45 (1024x1280); ?capture=1 exposes window.__seek(ms) after window.__ready.
STYLE SPEC: [path to styles/<name>.md]   LAYOUT REFERENCE: [path, if the user gave one]
SOURCE: [paper/doc URL to verify facts against]

TOOLS (skill scripts at ~/.claude/skills/visual-explainers/scripts):
  node shot.js  --file F [--query poster=45] --w W --h H --times 0,2000,7999 [--scale 2] [--full] --out PREFIX
  node audit.js --file F [--query ...] --w W --h H [--feed 600] [--full]
  Read PNGs with the Read tool; crop with `magick in.png -crop WxH+X+Y out.png`. ffprobe/ffmpeg to inspect GIF/MP4.

CHECK ADVERSARIALLY:
1. Facts: every number/claim vs the source; qualifiers kept (theoretical, measured-in-one-impl); toy diagrams internally
   consistent (counts, ratios, reach, readouts match captions); anything misleading to a smart non-expert.
2. Style violations: tokens, fonts, borders/bottom edges, radii, gradients/shadows/glows, white on yellow, pure black,
   one accent per card, focus styles, touch targets, reduced motion, meaning by color alone.
3. Layout: fidelity to the reference; poster fits the canvas; nothing clipped/overlapping; dead space.
4. Animation: sample many times (every 250–500 ms near transitions, plus 0, P-500, P-33 for the seam). Look for jumps,
   flashes, stale or out-of-sync states, elements that snap, readouts that disagree with visuals, loop seams.
5. Legibility at real display size: downscale the poster to 600px (simulate feed + JPEG q70) and list text that
   becomes unreadable; check 390px and 760px for the web page.
6. Explanation quality: is each card a working mechanism (motion shows cause→effect) or a stat tile/dashboard?
   Does each card answer a reader's question in a sensible order (problem → fix → benefit → objection → engineering
   → payoff)? Is a key objection missing? Any filler chrome (credit/series footers, redundant taglines, tool names)?
   STORYBOARD: [paste the short storyboard]
7. Exports: frame counts, dimensions, seam, dithering/banding, MP4 color tags and bitrate.

OUTPUT: prioritized findings (BLOCKER / MAJOR / MINOR / NIT), each with location (card/element/line), evidence
(timestamp + screenshot path), and a concrete fix. Terse. Max ~25 findings.
```

## Handling the report

- Apply the blockers and majors. Apply the minors when they're cheap. Skip a nit if it fights the style, and say why.
- If a finding conflicts with the user's instructions, the user wins. Example: the critic wanted source attribution, but the user wanted no paper mentioned.
- Never relay the critic's claims to the user as fact without checking them. Re-run the audit after fixing.
- In the final message, tell the user in a few bullets what the critic caught.
