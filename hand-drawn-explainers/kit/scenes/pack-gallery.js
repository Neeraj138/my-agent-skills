// Browse an Excalidraw pack in our style:  node render.mjs pack-gallery --param pack=<slug> --still 3 --out <png>
// Each cell shows the item drawn by SA.Sketch, with its name (use that name in s.sketch({ pack, item })).
SA.scene('pack-gallery', {
  duration: 4, width: 1920, height: 1080, stars: false,
  requires: (p) => ['assets/packs/' + (p.pack = p.pack || 'youritjang-stick-figures') + '.js'],
}, (s, { C }) => {
  const pack = SA.params.pack, items = SA.PACKS()[pack].items;
  const cols = items.length > 40 ? 10 : items.length > 18 ? 8 : 6, cw = 1920 / cols;
  const rows = Math.ceil(items.length / cols), ch = Math.min(260, (1080 - 90) / rows);
  s.text({ text: pack + '  ·  ' + items.length + ' items', x: 960, y: 40, align: 'center', size: 34, color: '#9a9a9a' });
  items.forEach((it, i) => {
    const cx = (i % cols) * cw + cw / 2, cy = 90 + Math.floor(i / cols) * ch + ch * 0.42;
    const k = Math.min((cw * 0.7) / it.w, (ch * 0.62) / it.h);
    s.sketch({ pack, item: it.name, size: it.w * k, x: cx, y: cy }).drawIn(0.1 + (i / items.length) * 1.5, 0.8);
    s.text({ text: it.name, x: cx, y: cy + ch * 0.42, align: 'center', size: 18, color: C.yellow });
  });
});
