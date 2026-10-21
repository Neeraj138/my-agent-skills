// Shared helpers: arg parsing + headless Chromium launch (playwright-core).
const fs = require('fs'), path = require('path'), os = require('os');
const DEPS = process.env.VE_DEPS || path.join(os.homedir(), '.cache', 'visual-explainers');
function req(name) {
  try { return require(name); } catch (e) {}
  try { return require(path.join(DEPS, 'node_modules', name)); } catch (e) {}
  console.error(`Missing ${name}. Run: bash ${path.join(__dirname, 'setup.sh')}`); process.exit(2);
}
function args(defaults) {
  const a = { ...defaults }, v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (!v[i].startsWith('--')) continue;
    const k = v[i].slice(2), n = v[i + 1];
    if (n === undefined || n.startsWith('--')) a[k] = true; else { a[k] = n; i++; }
  }
  return a;
}
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(base)) {
    const dirs = fs.readdirSync(base).sort().reverse();
    for (const d of dirs.filter(d => d.startsWith('chromium_headless_shell'))) {
      for (const sub of fs.readdirSync(path.join(base, d))) {
        const p = path.join(base, d, sub, 'chrome-headless-shell');
        if (fs.existsSync(p)) return p;
      }
    }
    for (const d of dirs.filter(d => d.startsWith('chromium-'))) {
      for (const sub of ['chrome-linux/chrome', 'chrome-linux64/chrome']) {
        const p = path.join(base, d, sub);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'])
    if (fs.existsSync(p)) return p;
  return null; // let playwright try its default
}
async function open(o) {
  const { chromium } = req('playwright-core');
  const exe = findChrome();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: +o.w, height: +o.h }, deviceScaleFactor: +(o.scale || 1) });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const file = path.resolve(o.file);
  const q = ['capture=1', o.query].filter(Boolean).join('&');
  await page.goto('file://' + file + '?' + q);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 })
    .catch(() => { throw new Error('Page never set window.__ready. Does it implement capture mode? (see templates/explainer.html)'); });
  return { browser, page, errors };
}
module.exports = { args, open, req };
