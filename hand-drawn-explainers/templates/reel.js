// TEMPLATE: vertical voiced reel (1080×1920, 60 fps). Copy to scenes/<name>.js, rename the scene, add it to scenes/index.js.
// Pick the script shape that fits the topic (references/script-craft.md); this skeleton follows the "concept" shape.
SA.scene('my-reel', {
  width: 1080, height: 1920, worldHeight: 3200, seed: 7,
  requires: ['out/voice/my_reel.js'],                     // voice timings (+ any 'assets/packs/<slug>.js')
}, (s, { C, TYPE }) => {
  // Subtitles are off by default. Only if the user asked for them: add `subtitles: true` here and uncomment s.scrim().
  const vo = s.useVoice('my_reel', { offset: 0.2, display: [] });   // speech starts by ~0.3 s (references/reels-attention.md)
  // s.scrim();
  const cue = vo.cue, MID = s.W / 2;
  const { left, right, top, bottom } = s.safe;            // x 140–940, y 500–1540: keep everything inside

  // ---- 1 · hook: frame 0 already shows it (platforms preview frame 0; the cover promised this picture)
  const T1 = cue('first words of the hook');
  const hook = s.group({});
  // ... build the hook picture inside the group, BIG (600–800 px wide), then centre it.
  // No drawIn on the key parts (they're visible from t = 0), or finish drawing by ~0.4 s. Keep something moving from the first frame.
  hook.center(MID, (top + bottom) / 2);
  // hook text for muted viewers, even with subtitles off: 3–7 words, ≥ 84 px, gone once the voice has taken over
  // const hookText = s.caption({ text: 'Why does a\nwound *swell*?', x: MID, y: 400, size: TYPE.title, hl: C.orange }).fadeOut(2.8, 0.4);

  // ---- 2 · the world the rest of the piece lives in (build once, then move the camera through it)
  const T2 = cue('setup phrase');
  hook.fadeOut(T2 - 0.3, 0.4);
  // s.cam(T2 - 0.1, 1.4, MID, 1100, 1.0);                // context shot

  // ---- 3 · steps: one operation per beat, close-up on the action, same objects carried forward
  // s.cam(cue('…'), 1.6, x, y, 2.0);                      // close-up on the mechanism
  // obj.moveTo(cue('…'), 1.0, x2, y2);                    // identity preserved, no re-drawn copies
  // old.dim(cue('…'), 0.4, 0.25); later old.fadeOut(...)  // context dims, then leaves fully

  // ---- 4 · overview / payoff: pull back once the parts are understood
  // ---- 5 · ending: the real diagram doing its thing once more (no logo card)
});
