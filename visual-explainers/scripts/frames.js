#!/usr/bin/env node
// Deterministic frame capture across one loop.
// node frames.js --file page.html [--query poster=45] --w 1024 --h 1280 --fps 30 --dur 8000 --dir /tmp/frames [--full]
const fs = require('fs');
const { args, open } = require('./lib');
(async () => {
  const a = args({ w: 1200, h: 900, fps: 30, dur: 8000, dir: 'frames' });
  if (!a.file) { console.error('need --file'); process.exit(1); }
  fs.rmSync(a.dir, { recursive: true, force: true }); fs.mkdirSync(a.dir, { recursive: true });
  const { browser, page, errors } = await open(a);
  const n = Math.round(a.dur / 1000 * a.fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.__seek(t), i * 1000 / a.fps);
    await page.screenshot({ path: `${a.dir}/f${String(i).padStart(4, '0')}.png`, fullPage: !!a.full });
  }
  console.log(`wrote ${n} frames to ${a.dir}`);
  if (errors.length) console.log('JS errors:', errors);
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
