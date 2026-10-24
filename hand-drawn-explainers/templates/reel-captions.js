// TEMPLATE — vertical captions-only reel (no voiceover). Copy to scenes/<name>.js, add to scenes/index.js.
// ~1 caption every 3 s; captions carry the story; the picture does the explaining.
SA.scene('my-captions-reel', { width: 1080, height: 1920, worldHeight: 3000, seed: 7, duration: 28,
  requires: ['assets/packs/drwnio-storytelling.js'] }, (s, { C, TYPE }) => {
  const MID = s.W / 2;
  s.scrim({ solid: 430, fade: 170 });
  // beat times (seconds). Keep ~3 s per caption; leave 2.5 s after the last one.
  const T = [0, 3.4, 6.8, 10.2, 13.6, 17, 20.4, 23.6];
  s.say('a question the viewer *has*?', T[0], T[1] - 0.2, { hl: C.orange, size: 66 });
  // ... build beat 1 in a group, centre it, animate between T[0] and T[1]
  s.say('the obvious way is *slow*', T[1], T[2] - 0.2, { hl: C.red });
  // ...
  // last caption: no fade-out; end on the real diagram (no logo card)
});
