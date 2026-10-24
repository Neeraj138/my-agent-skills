// TEMPLATE: 16:9 video or slide deck (1920×1080, 60 fps). Copy to scenes/<name>.js, add it to scenes/index.js.
// Video: voiced, with the camera moving through one persistent world.
// Slides: each beat settles before the next cue; export the settled frames (references/formats.md → Slides).
SA.scene('my-landscape', {
  width: 1920, height: 1080, worldHeight: 2400, seed: 7,
  theme: 'dark',                                         // or 'light'
  requires: ['out/voice/my_landscape.js'],               // remove for a silent deck and set duration: <seconds>
}, (s, { C, TYPE }) => {
  const vo = s.useVoice('my_landscape', { offset: 0.4 });  // subtitles off by default; `subtitles: true` + s.scrim() puts them at the bottom
  const cue = vo.cue, MID = s.W / 2;
  const { left, right, top, bottom } = s.safe;             // x 80–1840, y 60–910

  // Optional small persistent step tracker (only if the user wants steps named), top-left, ≥ 38 px:
  // const step = s.hud(s.text({ text: '', x: left, y: 70, size: TYPE.label, color: C.muted, align: 'left' }));

  // ---- the world: build it once, big, centred
  const world = s.group({});
  // ... e.g. a vessel, a crystal, a machine; 1000–1500 px wide
  world.center(MID, (top + bottom) / 2);
  world.drawIn(cue('first words'), 1.6);

  // ---- step N: camera to the action, one operation, then pull back
  // const Tn = cue('…');
  // s.cam(Tn - 0.2, 1.6, x, y, 2.0);                      // close-up
  // actor.along(Tn + 0.3, 2.0, [[x0, y0], [x1, y1]]);      // the same object moves; no re-drawn copies
  // label = s.text({ text: 'one term', x, y, size: TYPE.label, bg: C.bg }).drawIn(Tn + 0.4);
  // label.fadeOut(cue('next step') - 0.3, 0.3);
  // s.cam(cue('…'), 1.8, MID, (top + bottom) / 2, 1.0);  // overview once earned
});
