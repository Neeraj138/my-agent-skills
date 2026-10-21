# Motion

## The engine (why everything is clock-driven)

One clock `t` runs from 0 to P (default P = 8000 ms) and drives **every** animated value through `draw(t)` functions. That one rule gives you:

- **Deterministic capture.** `?capture=1` exposes `window.__seek(ms)`, so frame N of a GIF is exactly `t = N/fps`. CSS transitions run on wall-clock time, so captured frames show stale states. That was a real bug: chips lit one frame late, and chunks showed the previous state.
- **Seamless loops.** Everything is a function of `t mod P`.
- **Sync.** All cards share one heartbeat, and the pause and speed controls are trivial.
- **Reduced motion.** Freeze `t` at a representative moment.

The pieces are in `templates/explainer.html`: `seg(t,a,b)`, `E.io`/`E.out`/`E.back`, `bump`, `lerp`, `S()`, `DRAW[]`/`MEASURE[]`, plus capture and the controls.

CSS `@keyframes` are allowed only for the one-shot page entrance, which is disabled in capture. CSS transitions are allowed only for hover and press UI. In capture mode, `.capture *{transition:none!important}` is the safety net.

## Timing grammar

- **Step, ease, hold.** In each step, move for the first ~40% using `E.io`, then hold for 60% so the eye can read. Constant-speed motion reads as cheap.
- **Stagger.** Space related items 40–120 ms apart. Use `seg(f, a + k*d, b + k*d)`.
- **Overshoot on arrival.** Use `E.back` for pops and drops, and `1 + .16*bump(p)` for a quick scale bump.
- **Exit before reset.** End the loop with a 300–600 ms fade of the active layer, then snap invisibly and fade back in at the start position. Never slide everything backwards across the screen: it reads as the process running in reverse.
- **Hold the "complete" state** for about 1s before fading. That's also where the PNG still comes from.
- **Divisibility.** Sub-loops of 1s, 2s, 2.4s×3 and so on must fit inside P exactly.

## Patterns that worked (see `examples/sliding-window-attention.html`)

| Pattern | How |
|---|---|
| Sliding window over chips | Measure the chip left/right edges once in `measure()`, then interpolate the frame edges at a fractional position `pos`. Each chip's weight is `clamp(1 - max(0, lo - j, j - pos))`, which drives opacity and fill continuously, so there are no snaps. |
| Ride-along arcs | Draw the SVG arcs from the query's center to each attended token's center, both computed at fractional positions, so the arcs travel with the window. Pulse the stroke width and dot radius on landing with `bump`. This beat the "draw arcs after landing" approach, which left dead space for half of each step. |
| Highlight row bar plus cells | Move a bar behind a grid row with `E.io` over the first 28% of the step. Switch the **label and readout at the same moment the bar arrives**, and fade the previous row's solid cells out across that 28%. Switching labels instantly while the bar is still travelling looked out of sync. |
| Staggered pop | Cells in the active row fill to solid with a 50 ms stagger and a scale bump. |
| Evict and drop (cache) | The old chip falls 16px, rotates 10° and fades within 22% of the step. The new chip drops from −62px with `E.back`. The write head lerps between slots; on wrap-around it **fades out and back in** rather than sweeping across. Keep the previous slot highlighted until the readout switches. |
| Scanner chart | A clipPath rect reveals the curves up to the scanner x. Dots ride both curves. The readout follows the scanner, and **its opacity fades with the plot**, so the number doesn't sit there and then snap to 0. |
| Cone reveal (layers) | Edges draw level by level with `pathLength=1` plus a dashoffset, then the nodes pop. Tinted bands grow behind each level, and the chips light in step. |
| Path draw | `pathLength=1`, with the dasharray set to `1 1` and the dashoffset driven by `1-p`. Place the riding dot with `getPointAtLength`. |
| Counters | Count up once over about 1.3s at page entrance, then **stop writing** to the DOM. In capture, show the final values. |
| Metric highlight cycle | A CSS variable `--h` in [0,1] is driven by the clock and used inside `color-mix` and `translateY`. This replaces class toggles that relied on transitions. |

## Things that broke and must not recur

- **Layout jitter.** Changing `border-bottom-width` on a lit chip changed the card height by 2px. The page height varied, and ffmpeg silently dropped about 95% of the GIF frames because frame sizes differed. Readouts that wrap to two lines on some frames cause the same problem. Fixes:
  - use permanent borders
  - add `min-height` on readouts
  - shorten the text

  The audit catches this.
- **Brightness flash at reset.** Fading the window out by lerping every chip's opacity to 1 made the whole strip flash. Fade only the highlight layers; dimmed items stay dimmed.
- **Readout lies.** A per-token ratio was shown as a total ("8× less work") while the caption said 2×. Compute what you label, and label what you compute.
- **Hidden header row.** Hiding grid header cells with `display:none` shifted the cells left by one column, and the attention grid became wrong. Hide all of them, including the corner spacer, or none.
- **Stale states in capture** from CSS transitions. See the engine section above.
- **Scaling a wide strip to fit mobile** made the text about 4px tall. Pan the strip instead.

## Seam and sync checks (before calling the critic)

- Take screenshots at `0, P*0.25, P*0.5, P*0.85, P-500, P-33`, plus a few mid-transition times such as just after each step boundary (`k*1000 + 100`).
- Run `audit.js`. It reports the percentage difference between the first and last frames; under about 1% is a clean seam.
- In the GIF, check that `ffprobe -count_frames` equals `fps × P/1000`.
