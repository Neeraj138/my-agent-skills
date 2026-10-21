#!/usr/bin/env node
// Automated quality gate. Run BEFORE the critic; fix every FAIL.
// node audit.js --file page.html [--query poster=45] --w 1024 --h 1280 [--feed 600] [--min 9] [--dur 8000] [--full] [--font "DM Sans"]
//  --feed  width (px) the output is displayed at (feed preview ~600; blog column ~720; omit for 1:1 web page)
//  --min   minimum readable text size in px AT THAT display width (default 8)
//  --all   list every small-text offender, not just the first 10
const { execSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const { args, open } = require('./lib');
(async () => {
  const a = args({ w: 1200, h: 900, dur: 8000, min: 8, font: 'DM Sans' });
  if (!a.file) { console.error('need --file'); process.exit(1); }
  const feed = a.feed ? +a.feed : +a.w, ratio = feed / +a.w;
  const { browser, page, errors } = await open(a);
  const out = { fail: [], warn: [], info: [] };

  out.info.push(`viewport ${a.w}x${a.h}, displayed at ${feed}px wide (x${ratio.toFixed(2)}), min text ${a.min}px`);
  if (!(await page.evaluate(f => [...document.fonts].some(x => x.family.replace(/"/g, '') === f && x.status === 'loaded'), a.font))) out.warn.push(`font "${a.font}" not loaded (offline? wrong family?)`);

  // sample the loop
  const N = 32, heights = new Map(), docH = new Set();
  let spills = new Map(), small = new Map();
  for (let i = 0; i < N; i++) {
    const t = Math.round(i * a.dur / N);
    const r = await page.evaluate(({ t, ratio, min }) => {
      window.__seek(t);
      const res = { doc: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, cards: [], spill: [], small: [] };
      const cards = [...document.querySelectorAll('.card')].filter(c => c.offsetParent);
      cards.forEach((c, ci) => {
        const name = (c.querySelector('h1,h2,h3') || {}).textContent || ('card ' + ci);
        res.cards.push([name.trim(), c.offsetHeight]);
        const cr = c.getBoundingClientRect();
        c.querySelectorAll('*').forEach(e => {
          const q = e.getBoundingClientRect(), st = getComputedStyle(e);
          if (!q.width || !q.height || st.visibility === 'hidden' || +st.opacity === 0) return;
          if (q.left < cr.left - 1 || q.right > cr.right + 1 || q.top < cr.top - 1 || q.bottom > cr.bottom + 1) {
            // only report visible spill (card has overflow hidden → clipped content is a bug too)
            res.spill.push(name.trim() + ' > ' + e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''));
          }
        });
      });
      // text size audit: every element with direct text
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue;
        const e = n.parentElement; if (!e || !e.getClientRects().length) continue;
        const st = getComputedStyle(e); if (st.visibility === 'hidden' || st.display === 'none') continue;
        let px = parseFloat(st.fontSize);
        const svg = e.closest('svg'); if (svg && svg.getScreenCTM()) px *= svg.getScreenCTM().a;
        const tr = e.getBoundingClientRect(); if (tr.width === 0) continue;
        const shown = px * ratio;
        if (shown < min) res.small.push([n.textContent.trim().slice(0, 24), +shown.toFixed(1)]);
        if (/^rgb\(0, 0, 0\)$/.test(st.color)) res.small.push(['PURE BLACK: ' + n.textContent.trim().slice(0, 20), -1]);
      }
      return res;
    }, { t, ratio, min: +a.min });
    docH.add(r.doc);
    if (!a.full && (r.doc > +a.h + 1)) out.fail.push(`page scrolls at t=${t}: height ${r.doc} > ${a.h} (poster must fit exactly)`);
    if (r.docW > +a.w + 1) out.fail.push(`horizontal overflow at t=${t}: ${r.docW}px`);
    r.cards.forEach(([k, h]) => { if (!heights.has(k)) heights.set(k, new Set()); heights.get(k).add(h); });
    r.spill.forEach(s => spills.set(s, (spills.get(s) || []).concat(t)));
    r.small.forEach(([s, px]) => { if (!small.has(s) || small.get(s) > px) small.set(s, px); });
  }
  if (docH.size > 1) out.fail.push(`layout jitter: document height takes ${[...docH].join('/')} during the loop`);
  heights.forEach((v, k) => { if (v.size > 1) out.fail.push(`layout jitter: card "${k}" height changes ${[...v].join('/')}`); });
  [...spills].slice(0, 12).forEach(([s, ts]) => out.warn.push(`content outside its card: ${s} (t=${ts.slice(0, 3).join(',')}…)`));
  const sm = [...small].sort((x, y) => x[1] - y[1]);
  sm.filter(x => x[1] === -1).forEach(([s]) => out.fail.push(s));
  const tiny = sm.filter(x => x[1] >= 0);
  if (tiny.length) out[tiny.length > 6 ? 'fail' : 'warn'].push(`${tiny.length} text items render under ${a.min}px at ${feed}px display: ` + tiny.slice(0, a.all ? 999 : 10).map(([s, p]) => `"${s}" ${p}px`).join(', '));
  if (errors.length) out.fail.push('JS errors: ' + [...new Set(errors)].join(' | '));

  // loop seam: first vs last frame
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 've-'));
  await page.evaluate(() => window.__seek(0)); await page.screenshot({ path: tmp + '/a.png', fullPage: !!a.full });
  await page.evaluate(d => window.__seek(d - 1000 / 30), +a.dur); await page.screenshot({ path: tmp + '/b.png', fullPage: !!a.full });
  try {
    const r = execSync(`magick compare -metric AE ${tmp}/a.png ${tmp}/b.png null: 2>&1 || true`).toString();
    const m = r.match(/\(([\d.e-]+)\)/); const frac = m ? +m[1] : parseFloat(r) / (a.w * a.h);
    out[frac > 0.02 ? 'warn' : 'info'].push(`loop seam: last→first frame differs in ${(frac * 100).toFixed(2)}% of pixels` + (frac > 0.02 ? ' (check for a jump)' : ''));
  } catch (e) { out.info.push('loop seam check skipped (ImageMagick missing)'); }
  await browser.close();

  for (const k of ['fail', 'warn', 'info']) out[k].forEach(s => console.log(k.toUpperCase().padEnd(5), s));
  console.log(out.fail.length ? `\n${out.fail.length} FAIL — fix before rendering.` : '\nPASS (review WARN items).');
  process.exit(out.fail.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
