// Vertical reel (1080x1920): attention in transformers, ~32s, captions carry the narration.
// The world is a tall canvas; the camera scrolls down through it, then jumps back up for the payoff.
// Safe area for content: x 60–940, screen y 230–1540 (check with `node render.mjs attention-reel --still 5 --safe`).
SA.scene('attention-reel', { duration: 32, width: 1080, height: 1920, worldHeight: 4200, seed: 9 }, (s, { C }) => {
  const words = ['the', 'cat', "didn't", 'eat', 'because', 'it', 'was', 'full'];
  const W8 = [0.03, 0.55, 0.04, 0.09, 0.04, 0.12, 0.05, 0.08]; // attention from "it"
  const IT = 5, CAT = 1;
  const CAP_Y = 345, CAP = 64;
  const cap = (text, t0, t1, hl = C.orange, size = CAP, d) =>
    s.caption({ text, x: 540, y: CAP_Y, size, hl, color: C.white }).drawIn(t0, d || Math.min(1.3, 0.04 * text.length)).fadeOut(t1, 0.3);

  // ================= A: the sentence, as two columns (from → to) =================
  const rowA = (i) => 600 + i * 110;
  const BW = 220, BH = 80, LX = 140, RX = 720;
  const left = [], right = [];
  words.forEach((w, i) => {
    const y = rowA(i) - BH / 2, t0 = 0.35 + i * 0.09;
    const lb = s.box({ x: LX, y, w: BW, h: BH, r: 16, color: C.blue, fillAlpha: 0.22 }).drawIn(t0, 0.5);
    const lt = s.text({ text: w, x: LX + BW / 2, y: rowA(i) - 2, align: 'center', size: 44, color: C.white }).drawIn(t0 + 0.2, 0.3);
    const rb = s.box({ x: RX, y, w: BW, h: BH, r: 16, color: C.blue, fillAlpha: 0.22 }).drawIn(t0 + 0.05, 0.5);
    const rt = s.text({ text: w, x: RX + BW / 2, y: rowA(i) - 2, align: 'center', size: 44, color: C.white }).drawIn(t0 + 0.25, 0.3);
    left.push({ b: lb, t: lt }); right.push({ b: rb, t: rt });
  });

  s.scrim({ solid: 430, fade: 170 });
  cap('how does AI know\nwhat *"it"* means?', 0.0, 3.3, C.orange, 72, 1.0);

  // "it" lights up and looks at every word
  const T1 = 2.0;
  left[IT].b.recolor(T1, 0.4, C.orange).to(T1, 0.4, { scale: 1.08 }, 'back');
  left[IT].t.to(T1, 0.4, { color: C.orange, scale: 1.08 }, 'back');
  left.forEach((L, i) => { if (i !== IT) { L.b.dim(T1, 0.4, 0.3); L.t.dim(T1, 0.4, 0.3); } });
  const lines = [];
  words.forEach((w, j) => {
    const a = [LX + BW + 8, rowA(IT)], b = [RX - 6, rowA(j)];
    lines[j] = s.curve({ from: a, to: b, color: C.orange, dash: [], width: 2 + W8[j] * 26, opacity: 0.3 + W8[j] * 1.3 })
      .drawIn(T1 + 0.35 + Math.abs(j - IT) * 0.07, 0.6);
  });
  const T2 = 3.4;
  right[CAT].b.recolor(T2, 0.35, C.teal); right[CAT].t.to(T2, 0.35, { color: C.teal });
  lines[CAT].recolor(T2, 0.35, C.teal);
  s.sparkle({ x: RX + BW + 4, y: rowA(CAT) - BH / 2 - 4, size: 22, color: C.teal }).popIn(T2 + 0.2);
  s.text({ text: '55%', x: 596, y: 805, align: 'center', size: 38, color: C.teal, bg: C.bg }).popIn(T2 + 0.3); // sits on the cat line
  cap('"it" looks at every word\nand focuses on *cat*', 3.6, 6.7, C.teal);

  // ================= B: the mechanism (query · keys → softmax) =================
  const B0 = 1920, rowB = (i) => B0 + 770 + i * 88;
  const TB = 6.9;
  s.cam(TB, 1.4, 540, B0 + 960, 1);
  // the query drops down from "it"
  const qDrop = s.curve({ from: [LX + BW / 2, rowA(IT) + 50], to: [384, B0 + 556], c1: [LX + BW / 2, 2100], c2: [250, B0 + 556], color: C.orange, dash: [7, 8] }).drawIn(TB + 0.1, 1.4);

  const vec = (vx, vy, w, h, color, t0) => {
    const parts = [s.box({ x: vx, y: vy, w, h, r: 10, color, fillAlpha: 0.3, hachureGap: 7 }).drawIn(t0, 0.45)];
    for (let c = 1; c < 4; c++) parts.push(s.line({ points: [[vx + (w * c) / 4, vy + 6], [vx + (w * c) / 4, vy + h - 6]], color, passes: 1, roughness: 0.4, strokeWidth: 2.2 }).drawIn(t0 + 0.25 + c * 0.05, 0.15));
    return parts;
  };
  vec(390, B0 + 520, 300, 72, C.orange, TB + 1.3);
  s.text({ text: 'query', x: 712, y: B0 + 556, size: 42, color: C.orange }).drawIn(TB + 1.5, 0.4);
  cap('1. "it" asks a question:\na *query*', TB + 1.0, 9.2, C.orange);

  const TK = 9.4;
  cap('2. every word holds\na *key*', TK, 12.5, C.blue);
  s.text({ text: 'keys', x: 335, y: B0 + 690, align: 'center', size: 38, color: '#9a9a9a' }).drawIn(TK, 0.4);
  const qLines = [], keyParts = [];
  words.forEach((w, i) => {
    const y = rowB(i), t0 = TK + 0.15 + i * 0.08, isCat = i === CAT;
    s.text({ text: w, x: 250, y: y - 2, align: 'right', size: 36, color: isCat ? C.teal : '#b8b8b8' }).drawIn(t0, 0.3);
    keyParts.push(...vec(265, y - 24, 140, 48, isCat ? C.teal : C.blue, t0));
    qLines.push(s.curve({ from: [540, B0 + 594], to: [410, y], c1: [540, y - 10], c2: [470, y], color: C.orange, dash: [5, 7], width: 2.2, opacity: 0.75 })
      .drawIn(TK + 1.1 + i * 0.06, 0.5));
  });

  const TS = 12.7;
  cap('3. match the query to each key\n→ *attention %*', TS, 16.0, C.purple, 58);
  s.text({ text: 'attention', x: 640, y: B0 + 690, align: 'center', size: 38, color: '#9a9a9a' }).drawIn(TS + 0.2, 0.4);
  qLines.forEach((l) => l.dim(TS + 0.2, 0.5, 0.12));
  const barEnd = [];
  words.forEach((w, i) => {
    const y = rowB(i), isCat = i === CAT, bw = 14 + W8[i] * 620;
    const bar = s.box({ x: 450, y: y - 21, w: 8, h: 42, r: 10, color: isCat ? C.teal : C.purple, fillAlpha: 0.42, hachureGap: 7 }).drawIn(TS + 0.4 + i * 0.06, 0.25);
    bar.to(TS + 0.55 + i * 0.06, 0.9, { w: bw }, 'out');
    s.text({ text: Math.round(W8[i] * 100) + '%', x: 450 + bw + 14, y: y, size: 34, color: isCat ? C.teal : '#8a8a8a', reveal: 'fade' }).drawIn(TS + 1.3 + i * 0.06, 0.4);
    barEnd[i] = 450 + bw + 14 + SA.measure(Math.round(W8[i] * 100) + '%', 34) + 12;
  });

  // ================= C: blend the words by those % =================
  const TC = 16.1, ZC = 0.75, CYC = 3293; // camera keeps the bars on screen above the output
  s.cam(TC, 1.4, 540, CYC, ZC);
  cap('4. blend every word,\nweighted by its *%*', TC + 0.5, 19.4, C.teal);
  const OUT = { x: 130, y: 3500, w: 820, h: 360 };
  s.bar({ x: OUT.x, y: OUT.y, w: OUT.w, h: OUT.h, r: 22, color: C.orange, label: 'new "it"', labelSize: 50,
    flow: { style: 'dots', count: 60, rows: 5, size: 13, speed: 34, colors: [C.teal, C.teal, C.teal, C.teal, C.teal, C.teal, C.teal, C.orange, C.grey, C.blue, C.purple] } }).drawIn(TC + 1.0, 0.8);
  words.forEach((w, i) => {
    const y = rowB(i);
    s.curve({ from: [barEnd[i], y], to: [540 + (i - 3.5) * 40, OUT.y - 6], c1: [barEnd[i] + 160, y], c2: [540 + (i - 3.5) * 40, OUT.y - 220],
      color: i === CAT ? C.teal : C.grey, dash: [3, 10], width: 2 + W8[i] * 22, opacity: 0.35 + W8[i] * 1.1, flow: 40 }).drawIn(TC + 1.4 + i * 0.07, 0.8);
  });
  s.text({ text: '= mostly *"cat"*', hl: C.teal, x: 540, y: OUT.y + OUT.h + 90, align: 'center', size: 76, color: C.white, reveal: 'type' }).drawIn(TC + 2.6, 0.9);
  s.sparkle({ x: OUT.x + OUT.w + 10, y: OUT.y - 14, size: 26, color: C.teal }).popIn(TC + 3.0);
  cap('now "it" *means*\nthe cat', 19.6, 22.6, C.teal, 72);

  // ================= D: payoff — every word does this, at once =================
  const TD = 22.8;
  s.cam(TD, 1.5, 540, 960, 1);
  qDrop.fadeOut(TD + 0.6, 0.6);
  cap('and *every* word does this\nfor every word, at once', TD + 0.6, 27.0, C.orange, 60);
  const pal = [C.blue, C.teal, C.purple, C.lilac, C.pink, C.orange, C.yellow, C.green];
  const R = SA.rng(42);
  left.forEach((L, i) => { if (i !== IT) { L.b.to(TD + 1.4, 0.4, { opacity: 1 }); L.t.to(TD + 1.4, 0.4, { opacity: 1 }); } });
  const web = [];
  words.forEach((_, i) => {
    if (i === IT) return;
    let sc = words.map((_, j) => Math.exp(-Math.abs(i - j) * 0.9) * (0.4 + R()) + (i === j ? 0.6 : 0));
    const sum = sc.reduce((a, b) => a + b, 0); sc = sc.map((v) => v / sum);
    const tw = TD + 1.5 + (i < IT ? i : i - 1) * 0.16;
    left[i].b.recolor(tw, 0.3, pal[i]);
    words.forEach((_, j) => {
      web.push(s.curve({ from: [LX + BW + 8, rowA(i)], to: [RX - 6, rowA(j)], color: pal[i], dash: [], width: 1 + sc[j] * 16, opacity: 0.2 + sc[j] * 1.1 }).drawIn(tw, 0.55));
    });
  });

  // ================= E: end card =================
  const TE = 27.2;
  s.items.forEach((n) => n.dim(TE, 0.6, 0.06)); // everything drawn so far fades back
  s.caption({ text: "that's", x: 540, y: 780, size: 64, color: '#9a9a9a', reveal: 'fade' }).drawIn(TE + 0.3, 0.4);
  s.caption({ text: 'attention', x: 540, y: 900, size: 150, color: C.orange }).drawIn(TE + 0.5, 0.9);
  s.hud(s.sparkle({ x: 880, y: 815, size: 34, color: C.orange })).popIn(TE + 1.3);
  s.hud(s.sparkle({ x: 205, y: 990, size: 20, color: C.teal })).popIn(TE + 1.45);
  s.caption({ text: 'the core idea inside every LLM', x: 540, y: 1050, size: 46, color: C.white, reveal: 'write' }).drawIn(TE + 1.3, 0.9);
  s.caption({ text: 'follow for more, drawn simply', x: 540, y: 1300, size: 44, color: '#8a8a8a', reveal: 'fade' }).drawIn(TE + 2.3, 0.6);
});
