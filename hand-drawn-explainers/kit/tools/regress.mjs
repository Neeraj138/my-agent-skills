// Prove an engine change didn't disturb existing scenes.
//   node tools/regress.mjs baseline [--scenes a,b] [--times 2,6,12]   before you edit the engine
//   node tools/regress.mjs check    [--scenes a,b] [--times 2,6,12]   after: lists changed frames, writes side-by-sides
// Default scenes = everything in scenes/index.js except pack-gallery. Stills land in out/regress/.
// "changed" isn't automatically wrong (a bug fix should change something); open the side-by-sides and decide.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mode, ...rest] = process.argv.slice(2);
if (!['baseline', 'check'].includes(mode)) { console.error('usage: node tools/regress.mjs baseline|check [--scenes a,b] [--times 2,6,12]'); process.exit(2); }
const opt = (k, d) => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : d; };
const listed = JSON.parse(readFileSync(path.join(root, 'scenes/index.js'), 'utf8').match(/SCENE_LIST\s*=\s*(\[[^\]]*\])/)[1].replace(/'/g, '"'));
const scenes = (opt('scenes', '') || listed.filter((n) => n !== 'pack-gallery').join(',')).split(',').filter(Boolean);
const times = opt('times', '2,6,12');
const dir = path.join(root, 'out/regress', mode === 'baseline' ? 'base' : 'now');
mkdirSync(dir, { recursive: true });

for (const sc of scenes) {
  process.stdout.write(`render ${sc} @ ${times}\n`);
  execFileSync('node', [path.join(root, 'render.mjs'), sc, '--still', times, '--out', path.join(dir, `${sc}_{t}.png`)], { cwd: root, stdio: 'ignore' });
}
if (mode === 'baseline') { console.log(`baseline saved in ${dir}`); process.exit(0); }

const base = path.join(root, 'out/regress/base');
if (!existsSync(base)) { console.error('no baseline: run `node tools/regress.mjs baseline` before editing'); process.exit(2); }
let changed = 0;
for (const f of readdirSync(dir)) {
  const a = path.join(base, f), b = path.join(dir, f);
  if (!existsSync(a)) { console.log(`new      ${f}`); continue; }
  if (readFileSync(a).equals(readFileSync(b))) continue;
  changed++;
  const out = path.join(root, 'out/regress', `diff_${f}`);
  try { execFileSync('magick', [a, b, '+append', '-resize', '50%', out]); console.log(`CHANGED  ${f}  → ${path.relative(root, out)} (left = before, right = after)`); }
  catch { console.log(`CHANGED  ${f}`); }
}
console.log(changed ? `${changed} frame(s) changed; look at each one` : 'all frames identical');
process.exit(changed ? 1 : 0);
