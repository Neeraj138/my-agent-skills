// Vertical reel (1080x1920): what is a CDN? ~26 s, captions carry the story (no voiceover).
// Colours: you/phones = white · the original server = blue · the video = orange · slow = red · CDN copies = teal.
// One stage, no camera moves: the original server at the top, you at the bottom, the CDN copy appears in between.
SA.scene('cdn', {
  duration: 27.5, width: 1080, height: 1920, seed: 21,
  requires: ['assets/packs/dwelle-network-topology-icons.js', 'assets/packs/morgemoensch-gadgets.js'],
}, (s, { C, TYPE }) => {
  const MID = s.W / 2, CAP_Y = 345, CAP = 62;
  const cap = (text, t0, t1, hl, size = CAP) =>
    s.caption({ text, x: MID, y: CAP_Y, size, hl, color: C.white }).drawIn(t0, Math.min(1.1, 0.035 * text.length)).fadeOut(t1, 0.3);

  // positions (world == screen, the camera never moves)
  const ORIGIN = [MID, 760], EDGE_Y = 1100, PHONE_Y = 1400;
  const XS = [250, MID, 830];                       // three neighbourhoods; the middle one is "you"

  // ================= 1 · hook: you tap play =================
  const phone = s.sketch({ pack: 'morgemoensch-gadgets', item: 'smartphone', height: 420, x: MID, y: 1010, tint: C.white }).drawIn(0.2, 0.9);
  const play = s.icon('play', { x: MID - 70, y: 940, size: 140, color: C.orange, fill: true }).drawIn(0.8, 0.6);
  s.scrim({ solid: 430, fade: 170 });
  cap('you tap *play*.\nwhy does it start so fast?', 0.0, 3.2, C.orange, 66);
  play.to(1.9, 0.25, { scale: 0.85 }, 'out').to(2.15, 0.3, { scale: 1 }, 'back');   // the tap

  // ================= 2 · the video lives on one server, far away =================
  const T2 = 3.4;
  phone.to(T2, 1.0, { x: MID, y: PHONE_Y, scale: phone.get('scale', 0) * 0.6 });
  play.to(T2, 1.0, { x: MID - 35, y: PHONE_Y - 35, size: 70 });
  play.fadeOut(T2 + 0.9, 0.3);
  const origin = s.sketch({ pack: 'dwelle-network-topology-icons', item: 'server', height: 250, x: ORIGIN[0], y: ORIGIN[1], tint: C.blue }).drawIn(T2 + 0.5, 1.0);
  const film = s.icon('play', { x: ORIGIN[0] + 60, y: ORIGIN[1] - 150, size: 80, color: C.orange, fill: true }).drawIn(T2 + 1.2, 0.5);
  const far = s.curve({ from: [MID, PHONE_Y - 140], to: [MID, ORIGIN[1] + 140], c1: [MID - 260, 1250], c2: [MID + 260, 1000], color: '#8a8a8a', dash: [8, 10], width: 3 }).drawIn(T2 + 1.0, 0.9);
  const km = s.text({ text: '10,000 km away', x: MID - 50, y: 990, align: 'right', size: TYPE.label, color: '#bdbdbd', bg: C.bg }).drawIn(T2 + 1.6, 0.6);
  cap('the video lives on *one* server,\nfar away', T2, 6.6, C.blue);

  // ================= 3 · every request makes that long trip =================
  const T3 = 6.8;
  cap('every request travels\nall that way and *back*', T3, 10.0, C.red);
  far.recolor(T3, 0.4, C.red);
  // a request dot goes up the long curve and comes back, twice (follow the curve with a few waypoints)
  const pathPts = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8, v = 1 - u, a = [MID, PHONE_Y - 140], b = [MID, ORIGIN[1] + 140], c1 = [MID - 260, 1250], c2 = [MID + 260, 1000];
    pathPts.push([0, 1].map((k) => v * v * v * a[k] + 3 * v * v * u * c1[k] + 3 * v * u * u * c2[k] + u * u * u * b[k]));
  }
  const req = s.dot({ x: pathPts[0][0], y: pathPts[0][1], r: 13, color: C.red }).fadeIn(T3 + 0.2, 0.2);
  const LEG = 0.11;   // seconds per waypoint → ~0.9 s each way
  let tt = T3 + 0.3;
  for (let trip = 0; trip < 2; trip++) {
    for (let i = 1; i <= 8; i++) { req.moveTo(tt, LEG, pathPts[i][0], pathPts[i][1], 'linear'); tt += LEG; }
    req.to(tt, 0.15, { color: C.orange }); tt += 0.15;
    for (let i = 7; i >= 0; i--) { req.moveTo(tt, LEG, pathPts[i][0], pathPts[i][1], 'linear'); tt += LEG; }
    req.to(tt, 0.1, { color: C.red }); tt += 0.25;
  }
  req.fadeOut(tt, 0.3);
  const slow = s.hud(s.counter({ value: 0, x: MID, y: 535, align: 'center', size: TYPE.big, color: C.red, prefix: 'wait ', suffix: ' ms' }))
    .fadeIn(T3 + 0.3, 0.3).to(T3 + 0.3, 2.0, { value: 250 }, 'linear');

  // ================= 4 · a CDN keeps copies close to people =================
  const T4 = 10.2;
  cap('a *CDN* keeps copies\non servers near people', T4, 13.4, C.teal);
  km.fadeOut(T4, 0.4);
  far.dim(T4, 0.5, 0.25);
  slow.dim(T4, 0.5, 0.0);
  const edges = XS.map((x, i) => s.sketch({ pack: 'dwelle-network-topology-icons', item: 'server', height: 190, x, y: EDGE_Y, tint: C.teal }).drawIn(T4 + 0.5 + i * 0.25, 0.8));
  const others = [XS[0], XS[2]].map((x, i) => s.sketch({ pack: 'morgemoensch-gadgets', item: 'smartphone', height: 250, x, y: PHONE_Y, tint: C.white }).drawIn(T4 + 1.3 + i * 0.2, 0.7));
  // the copies are empty at first: no video icon on them yet

  // ================= 5 · the first time, the copy fetches it once =================
  const T5 = 13.6;
  cap('the first time, the nearby copy\nfetches the video *once*', T5, 16.8, C.orange, 58);
  const fetchLines = XS.map((x, i) => s.curve({ from: [ORIGIN[0] + (i - 1) * 40, ORIGIN[1] + 135], to: [x, EDGE_Y - 105], c1: [ORIGIN[0] + (i - 1) * 60, 980], c2: [x, 960], color: C.orange, dash: [6, 9], width: 3, flow: 40 })
    .drawIn(T5 + 0.4 + i * 0.2, 0.7));
  const copies = XS.map((x, i) => s.icon('play', { x: x + 36, y: EDGE_Y - 140, size: 60, color: C.orange, fill: true }).popIn(T5 + 1.3 + i * 0.2));
  fetchLines.forEach((l, i) => l.fadeOut(T5 + 2.4 + i * 0.1, 0.5));
  far.fadeOut(T5 + 0.2, 0.5);

  // ================= 6 · after that, everyone gets it from next door =================
  const T6 = 17.0;
  cap('after that, everyone nearby\ngets it from *next door*', T6, 20.2, C.teal, 60);
  XS.forEach((x, i) => {
    s.curve({ from: [x, PHONE_Y - 135], to: [x, EDGE_Y + 100], c1: [x - 30, PHONE_Y - 160], c2: [x - 30, EDGE_Y + 130], color: C.teal, dash: [6, 8], width: 4, flow: 50 })
      .drawIn(T6 + 0.4 + i * 0.15, 0.4);
  });
  const fast = s.hud(s.counter({ value: 250, x: MID, y: 535, align: 'center', size: TYPE.big, color: C.teal, prefix: 'wait ', suffix: ' ms' }))
    .fadeIn(T6 + 0.8, 0.3).to(T6 + 0.9, 1.2, { value: 20 }, 'out');
  origin.dim(T6 + 0.3, 0.6, 0.35); film.dim(T6 + 0.3, 0.6, 0.35);

  // ================= 7 · payoff: the same video, a much shorter trip =================
  const T7 = 20.4;
  cap('same video,\nabout *ten times* less waiting', T7, 23.4, C.teal, 66);
  fast.to(T7, 0.6, { y: 1720 / 2 + 90, size: TYPE.hero }, 'inOut');   // the number becomes the hero
  const before = s.hud(s.text({ text: '250 ms', x: MID, y: 760, align: 'center', size: TYPE.big, color: C.red, reveal: 'fade' })).drawIn(T7 + 0.3, 0.4);
  const strike = s.hud(s.line({ points: [[MID - 130, 765], [MID + 130, 755]], color: C.red, strokeWidth: 5 })).drawIn(T7 + 0.8, 0.3);
  // fade the world back so the numbers stand alone
  // (dim() animates opacity *up* on nodes that already faded out, so only dim what is still visible)
  s.items.filter((n) => (n.get('opacity', T7) ?? 1) > 0.1).forEach((n) => n.dim(T7, 0.5, 0.08));

  // ================= 8 · callback ending =================
  const T8 = 23.6;
  [fast, before, strike].forEach((n) => n.fadeOut(T8, 0.4));
  s.items.forEach((n) => n.fadeOut(T8, 0.5));
  s.caption({ text: "that's a", x: MID, y: 820, size: TYPE.caption, color: '#9a9a9a', reveal: 'fade' }).drawIn(T8 + 0.4, 0.4);
  s.caption({ text: 'CDN', x: MID, y: 960, size: TYPE.hero, color: C.teal }).drawIn(T8 + 0.6, 0.8);
  s.caption({ text: 'copies of the internet,\n*close to you*', hl: C.teal, x: MID, y: 1160, size: TYPE.body, color: C.white, reveal: 'write' }).drawIn(T8 + 1.3, 0.9);
});
