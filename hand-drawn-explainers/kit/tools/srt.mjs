// Subtitles as a separate file (for platforms that take an .srt instead of burned-in text).
//   node tools/srt.mjs out/voice/<id>.json out/<name>.srt [--offset 0.4] [--map "H. N. S. W.=HNSW;C five a=C5a"]
// offset = the scene's useVoice offset (default 0.4 s). --map turns spoken spellings back into written ones.
import { readFileSync, writeFileSync } from 'node:fs';

const [src, out, ...rest] = process.argv.slice(2);
if (!src || !out) { console.error('usage: node tools/srt.mjs <voice.json> <out.srt> [--offset 0.4] [--map "spoken=written;..."]'); process.exit(1); }
const opt = (k, d) => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : d; };
const offset = +opt('offset', 0.4);
const maps = (opt('map', '') || '').split(';').filter(Boolean).map((m) => m.split('='));

const words = JSON.parse(readFileSync(src, 'utf8')).words;
const cues = []; let cur = null;
for (const w of words) {
  const gap = cur ? w.start - cur.end : 0;
  if (cur && (cur.text.length + w.w.length > 42 || w.end - cur.start > 3.2 || gap > 0.6)) { cues.push(cur); cur = null; }
  if (!cur) cur = { start: w.start, end: w.end, text: w.w };
  else { cur.text += ' ' + w.w; cur.end = w.end; }
  if (/[.?!]$/.test(w.w)) { cues.push(cur); cur = null; }
}
if (cur) cues.push(cur);

const ts = (s) => { s = Math.max(0, s + offset); const ms = Math.round(s * 1000); const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
const fix = (t) => maps.reduce((a, [k, v]) => a.split(k).join(v), t);
writeFileSync(out, cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(Math.min(c.end + 0.15, cues[i + 1] ? cues[i + 1].start - 0.02 : Infinity))}\n${fix(c.text)}\n`).join('\n'));
console.log(`wrote ${out} (${cues.length} cues)`);
