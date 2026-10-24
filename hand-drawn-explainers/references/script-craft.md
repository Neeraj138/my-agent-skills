# Script craft

The script is written for the audience and depth the user chose in the brief. The structure below works at every level. Only the vocabulary, the speed and how much is assumed change.

## Pick the shape that fits the topic
| topic type | shape |
|---|---|
| **a process / sequence of steps** (inflammation, a compiler pass, a legal procedure) | hook → the scene where it all happens → step 1 … step N, each one causing the next → what happens if it goes right or wrong → recap by replaying the whole sequence fast on the same picture |
| **a concept / why something works** (attention, reciprocal space, compound interest) | hook question → the obvious way and why it fails → the idea in 2–4 steps → payoff contrast → (one honest limit) → callback ending |
| **a comparison** (A vs B) | the shared task → A doing it → B doing it, in the same picture → where each wins |
| **a derivation / proof** | the claim → build each term from a picture → the result appears as a consequence → check it on one concrete case |

## Hook (first 2–4 s)
For reels, the hook and the cover are designed together. Read `reels-attention.md` first.
Open on something the viewer has seen, done or asked at their level. A newcomer: "A splinter goes in. An hour later the skin is red, hot and swollen. Why?" A specialist: "Every neutrophil in that abscess was in the bloodstream yesterday. How did it get out?" Don't open with a definition, "Ever wondered…", or a fragment pair like "One cell. One mission."

## Analogies
- Use them when they make the mechanism easier at the chosen depth: often for newcomers, rarely or never for specialists (they want the real thing, drawn clearly).
- If you use one, keep **one** analogy from start to finish and make it explain *why*, not just *what*. Don't mix metaphors. If a step doesn't fit the analogy, rephrase the step.

## Lines
- One idea per sentence, ≤ ~20 words, said the way a good teacher talks. Read every line out loud.
- Earn every term before using it: show it, then name it. Introduce at most one new term per beat.
- Numbers: few, rounded to the depth (specialists may want exact values). Spell them out for TTS.
- Spell acronyms with dots for TTS ("I. C. A. M. one") and map them back with `display`.
- Pauses: `<break time="1.0s" />` between beats, 0.3–0.4 s inside a beat.
- Ending: name it, then replay or echo the core picture. No summary paragraph, no "follow for more".

## Length
About 2.2 spoken words/s (≈ 130 per minute) for general audiences; up to ~2.6 for specialists. Reel 20–90 s; lesson 2–8 min (split anything longer into parts). For slides, use one sentence the slide makes obvious, plus optional speaker notes.

## Beat table (`scripts/<topic>.md`)
```
## Brief
audience: … | depth: … | format: 16:9, 60 fps | voice: local af_heart | subtitles: none | length: ~3 min | sources: …
colour key: pathogen orange · neutrophil purple · vessel blue · signals yellow · damage red

| # | voiceover | picture (shot size + what moves) | on-screen text |
| 1 hook | A splinter goes in… | context: skin surface, splinter enters, bacteria spill | — |
| 2 | … | close-up: … | "vasodilation" |

## Fact notes (never on screen)
- … (source, page)
```
