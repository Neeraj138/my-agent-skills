# Story and visual design

## A storyboard that can actually be animated

For each beat, record:

| Field | What it must resolve |
| --- | --- |
| Viewer question | The uncertainty this beat removes. |
| Spoken line / claim | What the viewer hears or needs to understand. |
| Initial state | Objects, values, ownership, and spatial anchors already present. |
| Action | The specific comparison, movement, transformation, or allocation. |
| Result | What changes, when it commits, and what stays identical. |
| Composition | Foreground operation, supporting context, label locations, camera distance. |
| Handoff | Shared object passed forward; outgoing objects retired. |
| Check | Arithmetic, dimensions, causal order, legibility, and the important intermediate frame. |

Write this before creating many nearly identical scenes. If every action is “show a box” or “add a label,” the explanation is still a slide outline. Replace an assertion with an observable mechanism.

Use an everyday setting to establish a question where helpful. Return to it for the payoff. Do not stretch an analogy past the point where its objects no longer match the mechanism; explicitly hand off to a numerical or physical representation.

## Compose rather than decorate

At 1920×1080, useful starting points are 48–56px foreground labels, about 48px important numerals, and 36px context labels. These are starting scales, not fixed export dimensions. Check the actual font at half-size and on the intended platform. Maintain roughly 24–32px text clearance and 40–60px between unrelated groups at that resolution. Account for the entire animated travel envelope, not just start/end bounds.

Use size, contrast, grouping, and material distinctions to establish hierarchy. One object can occupy most of the frame during a hard step. A detailed overview should be earned after its parts are understood. Do not globally enlarge an already cluttered layout and call it a redesign.

Draw specific useful details: a notebook cover overlaps its page block; table legs sit behind the desktop; a chip's memory bank differs from its compute tiles. Attach limbs and connectors continuously. Avoid generic stick figures or decorative icons when they carry no explanatory information.

Use a dark neutral background and a small semantic accent palette unless the user chooses another treatment. A licensed hand-lettered font can establish the sketch character; use a compatible mathematical font where glyphs need it. Keep labels away from lines and state digits. Put guides on cell borders or behind a quiet fill rather than through numbers. Do not use jitter, glow, sparkles, or permanent chrome to disguise weak staging.

## Numerical and conceptual honesty

Choose one explicit convention for vectors, matrix axes, units, and ownership. Compute the examples from that convention. Keep the inputs and outputs consistent across adjacent shots.

- For a weighted mixture, associate each weight with its value, calculate the weighted contribution at the source, move it through a clear corridor, and commit the accumulator after arrival. Keep a readable source reference until its job is done. Do not accidentally display weight × already-weighted value.
- For an outer product, align one operand with rows and the other with columns. Trace the intersection into a cell. Reveal unwritten cells as blank rather than pretending their values are already zero. Show the existing state receiving the patch.
- For signed updates, distinguish positive and negative direction around a zero baseline. Do not encode both with absolute-value bars. A correction patch and the old state are different quantities until the merge completes.
- For memory or serving diagrams, distinguish logical references from stored bytes, immutable snapshots from writable copies, and actual resident shards from a silhouette of the original whole. Animate real ownership and readiness conditions.
- For probabilities, normalization, rounding, and cumulative work, recompute the displayed result. A live counter must agree with the objects actually shown.

Do not imply that a changing numerical readout is a real intermediate algorithm state if it is merely an interpolation. Prefer exact before/after digits with a meaningful physical change between them. Approximate or illustrative quantities should be identified naturally in narration or a brief necessary label; keep detailed qualifications in accompanying notes.

## Writing and pace

Use concrete questions, ordinary verbs, and earned terminology. Open on a situation or problem. End on the mechanism's payoff or the original question answered. Avoid a generic title montage, slogan, or recap dashboard.

For beginner work, isolate the first complete example before accelerating repetitions. Let the viewer inspect an operand, see the operation, and read the result. A deliberate explanatory hold is useful; do not introduce unrelated motion merely to avoid a static frame. When matching a reference, measure its spoken pace, gaps, and visual dwell separately rather than copying a single words-per-minute number.
