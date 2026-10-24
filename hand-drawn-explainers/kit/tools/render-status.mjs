// Show how far a video render has got (reads the <out>.progress.json that render.mjs keeps up to date).
//   node tools/render-status.mjs                      newest render under the project
//   node tools/render-status.mjs path/to/video.mp4    a specific render
//   node tools/render-status.mjs --watch              keep a live bar on screen until it finishes (run it in your own terminal)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), watch = args.includes('--watch');
const target = args.find((a) => !a.startsWith('--'));
const find = (dir, depth = 0, acc = []) => {
  if (depth > 3) return acc;
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.git')) continue;
    const p = path.join(dir, f); let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) find(p, depth + 1, acc); else if (f.endsWith('.progress.json')) acc.push([p, st.mtimeMs]);
  }
  return acc;
};
const file = target ? (target.endsWith('.json') ? target : target + '.progress.json') : (find(root).sort((a, b) => b[1] - a[1])[0] || [])[0];
if (!file || !existsSync(file)) { console.log('no render in progress (no .progress.json found)'); process.exit(1); }
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const show = () => {
  const p = JSON.parse(readFileSync(file, 'utf8'));
  const stale = p.stage === 'rendering' && Date.now() - Date.parse(p.updated) > 30000;
  const bar = '█'.repeat(Math.round(p.percent / 4)).padEnd(25, '░');
  const rel = path.relative(root, p.out), name = rel.startsWith("..") ? p.out : rel;
  const line = `${name}  ${bar} ${String(p.percent).padStart(5)}%  ${p.frame}/${p.total} frames  ${p.fps} fps  elapsed ${mmss(p.elapsed)}  left ${p.stage === 'rendering' ? mmss(p.eta) : '—'}  ${stale ? 'STALLED? (no update for 30 s)' : p.stage}`;
  return { line, done: p.stage === 'done' };
};
if (!watch) { console.log(show().line); process.exit(0); }
const tick = () => { const { line, done } = show(); process.stdout.write('\r' + line + '   '); if (done) { process.stdout.write('\n'); process.exit(0); } };
tick(); setInterval(tick, 1000);
