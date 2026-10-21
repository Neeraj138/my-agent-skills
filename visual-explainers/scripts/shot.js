#!/usr/bin/env node
// Still screenshots at clock times.
// node shot.js --file page.html [--query poster=45] --w 1024 --h 1280 --times 0,4000,6800 --scale 2 [--full] --out /tmp/shot
const { args, open } = require('./lib');
(async () => {
  const a = args({ w: 1200, h: 900, times: '0', scale: 1, out: 'shot' });
  if (!a.file) { console.error('need --file'); process.exit(1); }
  const { browser, page, errors } = await open(a);
  for (const t of String(a.times).split(',')) {
    await page.evaluate(t => window.__seek(+t), t);
    const p = `${a.out}-${t}.png`;
    await page.screenshot({ path: p, fullPage: !!a.full });
    console.log('wrote', p);
  }
  if (errors.length) console.log('JS errors:', errors);
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
