// Convert Excalidraw libraries (.excalidrawlib, v1 or v2) into engine "packs".
//   node tools/excalidraw-lib.mjs <file-or-dir> [...]      -> assets/packs/<slug>.js + catalog.json
// A pack item = normalized Excalidraw elements centred on (0,0), drawn by SA.Sketch with rough.js,
// the same way Excalidraw draws them, with our draw-on animation and dark-palette colour mapping.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets', 'packs');
mkdirSync(outDir, { recursive: true });
const SUPPORTED = new Set(['rectangle', 'diamond', 'ellipse', 'line', 'arrow', 'freedraw', 'text']);
const r1 = (v) => Math.round(v * 10) / 10;

function itemsOf(lib) {
  if (Array.isArray(lib.libraryItems)) return lib.libraryItems.map((it) => ({ name: it.name, elements: it.elements }));
  if (Array.isArray(lib.library)) return lib.library.map((els) => ({ name: null, elements: els }));
  return [];
}
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

// element's own (unrotated) box in absolute coords; linear elements use their points' extent
function ownBox(e) {
  if (e.points && e.points.length) {
    const xs = e.points.map((p) => p[0] + e.x), ys = e.points.map((p) => p[1] + e.y);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  return [e.x, e.y, e.x + (e.width || 0), e.y + (e.height || 0)];
}
// extent including rotation (Excalidraw rotates around the centre of the element's own box)
function extent(e) {
  const b = ownBox(e), a = e.angle || 0;
  if (!a) return b;
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, c = Math.cos(a), s = Math.sin(a);
  const pts = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]].map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

function convertItem(item, idx) {
  const els = (item.elements || []).filter((e) => !e.isDeleted && SUPPORTED.has(e.type));
  if (!els.length) return null;
  let b = els.map(extent).reduce((a, c) => [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[2], c[2]), Math.max(a[3], c[3])]);
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  const texts = els.filter((e) => e.type === 'text').map((e) => (e.text || '').trim()).filter(Boolean);
  const name = slugify(item.name || texts.join(' ') || `item-${idx + 1}`) || `item-${idx + 1}`;
  const out = els.map((e) => {
    const o = {
      t: e.type, x: r1(e.x - cx), y: r1(e.y - cy), w: r1(e.width || 0), h: r1(e.height || 0),
      sc: e.strokeColor, bg: e.backgroundColor, fs: e.fillStyle, sw: e.strokeWidth, ss: e.strokeStyle,
      ro: e.roughness, op: e.opacity, seed: e.seed, a: e.angle || 0,
    };
    if (e.roundness) o.rd = e.roundness.type || 1;
    if (e.angle) { const b = ownBox(e); o.pv = [r1((b[0] + b[2]) / 2 - e.x), r1((b[1] + b[3]) / 2 - e.y)]; }
    if (e.points) o.p = e.points.map((p) => [r1(p[0]), r1(p[1])]);
    if (e.type === 'arrow' || e.type === 'line') { o.sa = e.startArrowhead || null; o.ea = e.endArrowhead || null; }
    if (e.type === 'freedraw' && e.pressures && e.simulatePressure === false) o.pr = 1;
    if (e.type === 'text') { o.text = e.text; o.fz = e.fontSize; o.ff = e.fontFamily; o.ta = e.textAlign; }
    return o;
  });
  return { name, w: r1(b[2] - b[0]), h: r1(b[3] - b[1]), els: out };
}

const aliasPath = path.join(outDir, 'aliases.json');
const aliases = existsSync(aliasPath) ? JSON.parse(readFileSync(aliasPath, 'utf8')) : {};
const metaPath = path.join(outDir, 'meta.json');
const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
const inputs = process.argv.slice(2).flatMap((p) => (statSync(p).isDirectory() ? readdirSync(p).filter((f) => f.endsWith('.excalidrawlib')).map((f) => path.join(p, f)) : [p]));
const catalogPath = path.join(outDir, 'catalog.json');
const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf8')) : {};
for (const file of inputs) {
  const slug = path.basename(file, '.excalidrawlib');
  let lib;
  try { lib = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.log('skip (bad json)', slug); continue; }
  const items = itemsOf(lib).map(convertItem).filter(Boolean);
  // readable names for unnamed items (assets/packs/aliases.json), then de-duplicate
  for (const it of items) if (aliases[slug] && aliases[slug][it.name]) it.name = aliases[slug][it.name];
  const seen = {};
  for (const it of items) { if (seen[it.name]) it.name += '-' + ++seen[it.name]; else seen[it.name] = 1; }
  writeFileSync(path.join(outDir, slug + '.js'), `window.PACKS = window.PACKS || {}; window.PACKS[${JSON.stringify(slug)}] = ${JSON.stringify({ slug, defaults: (meta[slug] && meta[slug].defaults) || {}, items })};\n`);
  catalog[slug] = { tier: (meta[slug] || {}).tier || '?', use: (meta[slug] || {}).use || '', count: items.length, items: items.map((i) => i.name) };
  console.log(`${String(items.length).padStart(3)}  ${slug}`);
}
writeFileSync(catalogPath, JSON.stringify(catalog, null, 1));
