# Thinking like an explainer designer

Styling is the easy part. Three models given the same brief and the same design system all produced on-brand Play visuals. What separated the strong one from the weak ones was **thinking**:
- what to show
- in what order
- in what visual form
- what to leave out

This file is that thinking, written as steps you can follow. Do every step and write the answers down in a storyboard (template at the bottom) **before writing any code**.

## The core test: mechanism or dashboard?

A weak explainer is a **dashboard of facts**:
- big-number tiles ("4096")
- progress bars standing in for ideas ("×1 / ×2 / ×3 layers" as bars)
- a formula card
- a benchmark card
- a decorative hero

Every tile is true-ish, and the reader learns nothing about **how it works**.

A strong explainer is a **sequence of working models**. Each card is a tiny machine that runs, and its motion *is* the explanation:
- the window slides, so you see which tokens are in and out
- the cache slot gets overwritten, so you see why memory stays fixed
- the cone widens layer by layer, so you see why reach still grows

Ask this of every card: **"If I froze this card and removed all text, would its picture still show a cause and effect?"** If the answer is no, it's a stat tile. Redesign it or cut it.

## Step 1: Understand it well enough to teach it

- Read the source section on the idea **and every section after it that exists because of it**. Those follow-on sections are where the non-obvious cards come from. For SWA, the paper's rolling buffer cache and chunked pre-fill only make sense *because* of the window. Most weak attempts stopped at the definition.
- Write the idea in one sentence a smart 16-year-old would follow. If you can't, you don't understand it yet.
- List the **numbers that matter** with their exact qualifiers: "≈131K *theoretical*", "2× *measured, one implementation, 16K tokens*". Mark which ones are arithmetic (safe) and which are measurements (need a qualifier).
- **Never invent.** If you're tempted to add an impressive feature or benchmark you didn't read in the source, don't. A weaker attempt invented "XLA cross-layer attention ×10" and misquoted benchmark numbers. One fabricated fact poisons the whole piece.

## Step 2: Find the questions a reader will ask, in order

Explanations are answers to questions in the order a curious reader would ask them. For a technical idea, that order is almost always:

1. **What's the problem?** What hurts without this idea? *(Full attention: every token scores every earlier one, so work grows with n².)*
2. **What's the trick?** *(Look back only W tokens.)*
3. **What does it buy?** *(Cost turns from a curve into a line.)*
4. **"But doesn't that break X?"** This is the objection. It's the most valuable card, and weak attempts skip it. *(Doesn't a window lose long-range information? No: stacked layers relay it, so reach ≈ k×W.)*
5. **How is it built in practice?** These are the engineering consequences. *(A rolling buffer cache using i mod W; chunked pre-fill.)*
6. **How big is the payoff at real scale?** *(131K reach, 8× less cache.)*

Write your own list of 5–7 questions for the topic. **Each question becomes one card.** If a card doesn't answer a question, cut it.

## Step 3: Choose one toy world and reuse it everywhere

- Use **concrete, tiny, real-looking examples**: actual words ("The cat sat on the mat"), not "t₁ t₂ t₃" or "…". Keep N small (8 tokens, 4 slots, W = 3 or 4) so every element is visible.
- **Reuse the same toy across cards.** Cards 1 and 2 used the *same* 8-word grid side by side, so the only visible difference was the idea itself. That contrast is the explanation.
- Keep toy sizes and real sizes separate and say so: toys in the diagrams, real numbers in the text and chips, plus a footnote.
- Make the toy match the claim. If the caption says "k × W" but the toy's window includes itself, the reach grows by W−1. Either fix the toy or note the difference.

## Step 4: Pick the visual form for each answer

Choose the form from **what kind of thing the answer is**:

| The answer is about… | Visual form | Motion that explains |
|---|---|---|
| Which items relate to which (attention, dependencies) | Matrix / grid of cells, rows = queries | A highlight bar sweeps rows; the active row's allowed cells pop |
| A window or focus moving through a sequence | Chip strip with a frame | The frame slides with ease-and-hold; arcs ride from the focus to its targets |
| Cost or scaling with size | Two curves on one chart | A scanner sweeps n; dots ride both curves; a live ratio readout |
| Fixed memory or reuse | A row or ring of slots | New item drops in, old one evicted; write head moves; `i mod W` readout |
| Depth, hierarchy, propagation | Stacked rows of nodes (layers) | A cone reveals level by level with edges drawing |
| A pipeline or processing in parts | Grouped strip plus a mini mask | Chunk N lights; its mask fills row by row; the previous chunk becomes "cache" |
| A trade-off with one knob | The same diagram plus a slider (web only) | Dragging re-renders the diagram live |
| Before vs after | The same visual twice, side by side | The identical toy makes the difference pop |
| Real-scale payoff | Metric tiles (only here) | Count up once; a soft highlight cycle |

Big-number tiles belong **only** in a final payoff card, after the mechanism has earned them.

For each card, brainstorm **at least two forms** and pick the one where *motion carries the meaning*. Write down why you chose it.

## Step 5: Make every card narrate itself

- **Readout line:** a live sentence under the visual that says what's happening now: `"mat" attends to 3 tokens`, `n = 25.7K · 3.5× less work`, `new token "and" → slot 2`. This turns the animation into a story without needing a caption.
- **Caption ("Why:")** gives the reason, not a description. The long version (web) is 2–3 sentences; the short version (poster) is one line of 12 words or fewer.
- **Legend** only when a visual encoding isn't obvious (hatched = future, dashed = dropped). On posters, keep a one-line legend wherever the encoding carries the point.

## Step 6: Design the hero as the hook

The hero is the frame people see while scrolling. It should hold:
- the name of the idea
- one sentence with the real numbers and qualifiers
- 3–4 fact chips
- **a live miniature of the mechanism**: a window gliding over a sentence with attention arcs

A static title card with decorative chips wastes the most valuable pixels.

## Step 7: Edit ruthlessly

- Cut any card that repeats another's point, or that is a fact the reader didn't need ("benchmark scores" in a piece about a mechanism).
- Cut tangents about the source. Ask the user whether the piece is about the concept or the paper. Usually it's the concept.
- One accent per card, in story order. The color tells the reader "new idea".
- If a card needs more than one visual plus one readout plus one caption, split it or simplify it.
- **No filler chrome.** Every pixel has to teach. Delete:
  - decorative footers that repeat the title or name the tools or style ("Sliding Window Attention — illustrated · window W = 4096 · Play Design System")
  - series labels ("THE ATTENTION SERIES · NO. 01")
  - "made with" or style credits, version or year stamps
  - eyebrows that say nothing
  - "source note" paragraphs on posters

  A footer exists only on the web page, and only to say something the reader needs, such as "Diagrams use toy sizes (W = 3 or 4)". The source goes in the post text, not on the image, unless the user asks for it.

## Blog figures vs posters vs pages

| Medium | What goes in the picture | What goes in the surrounding text |
|---|---|---|
| Blog post | One figure per section, each answering that section's question. 1–2 cards, generous size, captions short because the prose explains. | Derivations, caveats, citations |
| Social poster | The whole arc compressed into 4–6 cards. A short caption per card. Huge type. The hero does the hooking. | The post text: the one-sentence takeaway plus the source |
| Interactive page | The full arc plus interactions (sliders, pause/speed) and longer "Why" paragraphs, with a payoff card at the end | Footnote with toy-vs-real and sources |

## Storyboard template (fill in before coding)

```
TOPIC: …                         SOURCE: … (verified sections: …)
ONE-SENTENCE IDEA: …
ATTRIBUTION: concept-only | name the source
OUTPUTS: poster at the user's size (default 1024×1280) | page | blog figure(s) | GIF/MP4
TOY WORLD: sentence/items: … ; sizes: N=…, W=… ; reused in cards: …
REAL NUMBERS (with qualifiers): … (arithmetic) / … (measured: where, conditions)

HERO: live miniature = … ; chips = …
CARD 1  Q: …   ANSWER: …   FORM (+alt considered): …   MOTION: …   READOUT: …   ACCENT: blue
CARD 2  …                                                                         purple
…
OBJECTION CARD: which one? …
CUT LIST (considered and dropped, why): …
```

Keep the storyboard in your notes and give a short version to the critic. The critic should check each card against the storyboard's question, and use the mechanism-or-dashboard test.

## Worked example: why each SWA card exists

| Card | Reader's question | Why this form |
|---|---|---|
| Hero | "What is it?" | A live window slides over a real sentence with arcs: the whole idea in one glance |
| 1 Full causal attention | "What's wrong with normal attention?" | An 8×8 triangle with a sweeping row and the count "attends to 7": the growth is visible |
| 2 Slide a window | "What's the trick?" | The **same** grid with a band. Side by side with card 1, the difference *is* the idea |
| 3 Cost turns linear | "What does it buy?" | Two curves, identical until W, then diverging, with a live ratio |
| 4 Layers add reach | "Doesn't it forget far tokens?" (the objection) | A cone reveal across layers; chips map toy hops to real k×W |
| 5 Rolling buffer cache | "How is memory fixed in practice?" | 4 slots, evict-and-drop, i mod W |
| 6 Pre-fill in chunks | "What about a long prompt?" | Chunks plus a cache/chunk mask filling row by row |
| 7 Payoff (page only) | "How big is it at real scale?" | Metric tiles, the only place big numbers appear |

Cut, and why:
- the attention formula: it adds notation but no mechanism
- the benchmark comparison: not about SWA
- "W is the trade-off" as a static slider tile: on the web page it became an interactive slider inside card 2 instead
