// Render a scene to MP4, frame by frame (deterministic, no dropped frames).
// usage: node render.mjs <scene> [--fps 60] [--out out/<scene>.mp4] [--from 0] [--to <duration>] [--still 3.5]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const name = args[0];
if (!name) { console.error('usage: node render.mjs <scene> [--fps 60] [--out file.mp4] [--still t]'); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const fps = +opt('fps', 60);
const still = opt('still', null);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(pathToFileURL(path.join(here, 'player.html')).href + `?scene=${name}&headless=1${args.includes('--safe') ? '&safe' + (/^(instagram|shorts|linkedin|all)$/.test(args[args.indexOf('--safe') + 1] || '') ? '=' + args[args.indexOf('--safe') + 1] : '') : ''}${args.includes('--cover') ? '&cover' : ''}${args.map((x, i) => x === '--param' ? '&' + args[i + 1] : '').join('')}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });

const grab = (t) => page.evaluate((t) => { renderAt(t); return document.getElementById('c').toDataURL('image/png'); }, t)
  .then((u) => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));

// project scenes ('folder/scene') write their default outputs to folder/out/
const outDir = name.includes('/') ? path.join(here, path.dirname(name), 'out') : path.join(here, 'out'), base = path.basename(name);
mkdirSync(outDir, { recursive: true });

// --still t1,t2 → one PNG per time ({t} in --out is replaced by the time)
// --sheet t1,t2,... → a single contact sheet PNG of those times (--cols N, default 5), e.g. to review a reel
const sheet = opt('sheet', null);
if (still !== null || sheet !== null) {
  const { writeFileSync } = await import('node:fs');
  const times = (still ?? sheet).split(',');
  const files = [];
  for (const [i, s] of times.entries()) {
    const f = sheet !== null ? path.join(outDir, `.sheet_${base}_${i}_${s}.png`) : opt('out', path.join(outDir, `${base}_${s}s.png`)).replace('{t}', s);
    mkdirSync(path.dirname(path.resolve(f)), { recursive: true });
    writeFileSync(f, await grab(+s));
    files.push(f);
    if (sheet === null) console.log('wrote', f);
  }
  await browser.close();
  if (sheet !== null) {
    const out = opt('out', path.join(outDir, `${base}_sheet.png`)), cols = +opt('cols', 5);
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    const n = files.length, rows = Math.ceil(n / cols);
    const layout = files.map((_, i) => `${(i % cols) ? Array.from({ length: i % cols }, (_, k) => 'w' + k).join('+') : '0'}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, (_, k) => 'h' + k * cols).join('+') : '0'}`).join('|');
    const { execFileSync } = await import('node:child_process');
    const inputs = files.flatMap((f) => ['-i', f]);
    const filt = n > 1 ? `xstack=inputs=${n}:layout=${layout}:fill=black,scale=${Math.min(2400, cols * 480)}:-1` : 'scale=480:-1';
    execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filt, out]);
    const { unlinkSync } = await import('node:fs'); files.forEach((f) => unlinkSync(f));
    console.log('wrote', out, `(${n} frames, ${rows}x${Math.min(n, cols)})`);
  }
  process.exit(0);
}

const duration = await page.evaluate(() => SCENE.duration);
const from = +opt('from', 0), to = +opt('to', duration);
const out = opt('out', path.join(outDir, `${base}.mp4`));
mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
// audio: --audio file.mp3 to add a soundtrack, otherwise a silent track (some upload tools reject video-only files)
// scene voiceover (opts.audio, placed at opts.audioOffset seconds) is used automatically
const sceneAudio = await page.evaluate(() => ({ audio: SCENE.opts.audio || null, offset: SCENE.opts.audioOffset || 0 }));
const audio = opt('audio', sceneAudio.audio ? path.join(here, sceneAudio.audio) : null);
const audioIn = audio ? ['-i', audio] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'];
const delayMs = Math.round((audio === null ? 0 : sceneAudio.offset - from) * 1000);
// delay to its offset, loudness-normalise to ~-15 LUFS (social platforms), pad with silence to video length
const af = audio ? ['-af', `adelay=${Math.max(0, delayMs)}|${Math.max(0, delayMs)},loudnorm=I=-15:TP=-1.5:LRA=11,apad`] : [];
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', ...audioIn,
  '-map', '0:v', '-map', '1:a', ...af, '-ar', '48000', '-shortest',
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-r', String(fps),
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });

const n = Math.round((to - from) * fps);
const t0 = Date.now();
// progress: a live bar on a terminal, a line every 5 % in logs, and <out>.progress.json for `node tools/render-status.mjs`
const { writeFileSync: writeProgress } = await import('node:fs');
const progFile = out + '.progress.json', tty = process.stdout.isTTY;
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
let lastShown = 0, lastPct = -1;
const progress = (i, stage = 'rendering') => {
  const el = (Date.now() - t0) / 1000, rate = i / Math.max(el, 1e-3), eta = (n - i) / Math.max(rate, 1e-3), pct = (i / n) * 100;
  const info = { out, stage, frame: i, total: n, percent: +pct.toFixed(1), fps: +rate.toFixed(1), elapsed: Math.round(el), eta: Math.round(eta), updated: new Date().toISOString() };
  try { writeProgress(progFile, JSON.stringify(info)); } catch {}
  const bar = '█'.repeat(Math.round(pct / 4)).padEnd(25, '░');
  const line = `${bar} ${pct.toFixed(1).padStart(5)}%  frame ${i}/${n}  ${rate.toFixed(1)} fps  elapsed ${mmss(el)}  left ${stage === 'rendering' ? mmss(eta) : '—'}  ${stage}`;
  if (tty) process.stdout.write('\r' + line);
  else if (Math.floor(pct / 5) !== lastPct || stage !== 'rendering') { lastPct = Math.floor(pct / 5); console.log(line); }
};
for (let i = 0; i < n; i++) {
  const buf = await grab(from + i / fps);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (Date.now() - lastShown > 500) { lastShown = Date.now(); progress(i); }
}
progress(n, 'finishing (encoding audio + mp4)');
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
progress(n, 'done');
console.log(`\nwrote ${out} (${n} frames in ${mmss((Date.now() - t0) / 1000)})`);
