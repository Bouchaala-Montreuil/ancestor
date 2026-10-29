#!/usr/bin/env node
/* ============================================================================
   ANCESTOR — the install audit (§6 of design/ROADMAP.md, never done)

       node tools/pwa_audit.js          (needs a Chromium: tools/chromium.sh)
       node tools/pwa_audit.js --shots  also writes /tmp/pwa/*.png

   "Lighthouse / PWA install audit" has been on the list since the roadmap was
   written, marked "not done", because it needed a browser. There is one now, so
   it is not a checklist read off the manifest: the page is served over HTTP,
   the service worker is allowed to install, and Chrome's own installability
   verdict is asked for through CDP. A manifest that looks right and an app that
   Chrome refuses to install are different facts, and only one of them matters.

   It also answers a question no static check can: does the maskable icon
   survive being cropped to a circle, which is what Android does to it.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.argv.includes('--shots');

let pass = 0, fail = 0; const failures = [];
const chk = (name, ok, note) => {
  if (ok) { pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + name + (note ? '  \x1b[2m' + note + '\x1b[0m' : '')); }
  else { fail++; failures.push(name); console.log('  \x1b[31mFAIL\x1b[0m  ' + name + (note ? '  -> ' + note : '')); }
};
const group = t => console.log('\n\x1b[1m' + t + '\x1b[0m');

/* Chrome's installability criteria, as documented, written out so they can be
   run against a deliberately broken manifest as well as the real one. CDP
   cannot be trusted for this: `Page.getInstallabilityErrors` returns an empty
   list even for a manifest with no icons (measured 2026-10-29). */
function installProblems(m, ctx) {
  const p = [];
  if (!m || typeof m !== 'object') return ['no manifest'];
  if (!m.name && !m.short_name) p.push('no name');
  if (!m.start_url) p.push('no start_url');
  if (!['standalone', 'fullscreen', 'minimal-ui'].includes(m.display)) p.push('display is not app-like: ' + m.display);
  const sizes = (m.icons || []).map(i => String(i.sizes || ''));
  if (!sizes.some(s => s === '192x192' || s === '512x512' || s.split(' ').includes('192x192'))) {
    p.push('no 192px icon');
  }
  if (!sizes.some(s => s.split(' ').includes('512x512'))) p.push('no 512px icon');
  if (!(m.icons || []).some(i => /maskable/.test(i.purpose || ''))) p.push('no maskable icon');
  if (!ctx.secure) p.push('not a secure context');
  if (!ctx.worker) p.push('no service worker with a fetch handler');
  return p;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8'
};

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      /* A page that is deliberately uninstallable, so the installability query
         can be shown to report real defects rather than an empty list. */
      if (rel === '__control/broken.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<!DOCTYPE html><html><head><link rel="manifest" href="broken.webmanifest">' +
                '<title>control</title></head><body>control</body></html>');
        return;
      }
      if (rel === '__control/broken.webmanifest') {
        res.writeHead(200, { 'Content-Type': 'application/manifest+json' });
        res.end(JSON.stringify({ name: 'Control', short_name: 'Control', start_url: './broken.html',
                                 display: 'standalone', icons: [] }));
        return;
      }
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Service-Worker-Allowed': '/'
      });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

(async () => {
  const { server, port } = await serve();
  const base = 'http://127.0.0.1:' + port + '/';
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader']
  });
  if (SHOTS) fs.mkdirSync('/tmp/pwa', { recursive: true });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(e.message));

  await page.goto(base, { waitUntil: 'load' });

  /* ------------------------------------------------------- the audit itself */
  group('0. The audit can fail — a green run has to mean something');
  {
    /* Chrome's own installability query is not usable as evidence: measured
       against a manifest with no icons at all, `Page.getInstallabilityErrors`
       returns an empty list, and so does `Page.getAppManifest`. Both are
       stubbed in this build. So the criteria are written out below once, in
       `installProblems()`, and this control proves that function notices a
       broken manifest — otherwise group 4 would be a checklist that cannot go
       red, which is exactly what this audit exists to avoid. */
    const broken = { name: 'Control', short_name: 'Control', start_url: './broken.html',
                     display: 'standalone', icons: [] };
    const brokenProblems = installProblems(broken, { secure: true, worker: true });
    chk('a manifest with no icons is refused by the criteria used below',
        brokenProblems.length >= 2, brokenProblems.join('; '));

    /* And the maskable measurement, on an icon drawn to break it: a mark that
       runs to the edge of the square must be caught by the same code that
       passes the real icon. */
    const control = await page.evaluate(() => {
      const n = 512;
      const c = document.createElement('canvas');
      c.width = n; c.height = n;
      const g = c.getContext('2d');
      g.fillStyle = '#F1EBDD'; g.fillRect(0, 0, n, n);
      g.fillStyle = '#20211F'; g.fillRect(0, 0, n, 12);   // a bar along the top edge
      const d = g.getImageData(0, 0, n, n).data;
      const at = (x, y) => { const i = (y * n + x) * 4; return [d[i], d[i+1], d[i+2], d[i+3]]; };
      const bg = at(1, n - 2);
      const same = p => Math.abs(p[0]-bg[0]) + Math.abs(p[1]-bg[1]) + Math.abs(p[2]-bg[2]) < 24;
      const cxm = (n - 1) / 2, cym = (n - 1) / 2;
      let worst = 0;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if (same(at(x, y))) continue;
        const r = Math.hypot(x - cxm, y - cym) / (n * 0.4);
        if (r > worst) worst = r;
      }
      return worst;
    });
    chk('a mark that runs past the safe circle is caught',
        control > 1.0, 'control icon scores ' + control.toFixed(2) + '× the safe radius');
  }

  /* ---------------------------------------------------------------- manifest */
  group('1. The manifest Chrome is actually given');
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return { error: 'no <link rel="manifest">' };
    const res = await fetch(link.href, { cache: 'no-store' });
    return { href: link.href, status: res.status, body: await res.json() };
  });
  chk('index.html points at a manifest', !manifest.error, manifest.href || manifest.error);
  chk('and it is served as a manifest, not as text', manifest.status === 200, 'HTTP ' + manifest.status);
  const m = manifest.body || {};
  chk('name and short_name are set', !!m.name && !!m.short_name, m.name + ' / ' + m.short_name);
  chk('short_name fits under a home-screen icon', (m.short_name || '').length <= 12, (m.short_name || '').length + ' chars');
  chk('display is standalone', m.display === 'standalone', m.display);
  chk('start_url is same-origin and relative-safe',
      typeof m.start_url === 'string' && !/^https?:/.test(m.start_url), String(m.start_url));
  chk('id does not reach outside scope',
      m.id === undefined || (String(m.id).indexOf('/') !== 0 && !/^https?:/.test(String(m.id))) ||
      String(m.id) === '/',
      'id=' + String(m.id) + ' scope=' + String(m.scope));
  chk('background and theme colours are the app palette',
      m.background_color === '#090909' && m.theme_color === '#090909',
      m.background_color + ' / ' + m.theme_color);
  const metaTheme = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    return meta ? meta.getAttribute('content') : null;
  });
  chk('the <meta> theme colour agrees with the manifest',
      metaTheme && metaTheme.toLowerCase() === String(m.theme_color).toLowerCase(),
      metaTheme + ' vs ' + m.theme_color);

  /* ------------------------------------------------------------------- icons */
  group('2. The icons, decoded rather than listed');
  const icons = await page.evaluate(async (list) => {
    const out = [];
    for (const i of list || []) {
      out.push(await new Promise(done => {
        const img = new Image();
        img.onload = () => done({ src: i.src, purpose: i.purpose,
                                  declared: i.sizes, real: img.naturalWidth + 'x' + img.naturalHeight });
        img.onerror = () => done({ src: i.src, purpose: i.purpose, declared: i.sizes, real: 'failed to load' });
        img.src = i.src;
      }));
    }
    return out;
  }, m.icons);
  chk('the manifest lists icons at all', icons.length > 0, icons.length + ' icons');
  const wrong = icons.filter(i => i.real !== i.declared);
  chk('every icon is really the size it claims', wrong.length === 0,
      wrong.map(w => w.src + ' ' + w.declared + ' -> ' + w.real).join(', ') || icons.map(i => i.real).join(' '));
  chk('there is a 192 and a 512', icons.some(i => i.real === '192x192') && icons.some(i => i.real === '512x512'));
  chk('one of them is maskable', icons.some(i => i.purpose === 'maskable'));

  /* Android crops a maskable icon to a circle of radius 40% of the square.
     Anything outside it is thrown away, so the mark has to live inside. */
  group('3. The maskable icon survives Android cropping');
  const safe = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = src; });
    const n = img.naturalWidth;
    const c = document.createElement('canvas');
    c.width = n; c.height = n;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, n, n).data;
    const at = (x, y) => { const i = (y * n + x) * 4; return [d[i], d[i+1], d[i+2], d[i+3]]; };
    /* the background is whatever the corners are */
    const bg = at(1, 1);
    const same = p => Math.abs(p[0]-bg[0]) + Math.abs(p[1]-bg[1]) + Math.abs(p[2]-bg[2]) < 24;
    let minX = n, minY = n, maxX = -1, maxY = -1, ink = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (same(at(x, y))) continue;
      ink++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    /* farthest mark pixel from the centre, in units of the radius */
    const cxm = (n - 1) / 2, cym = (n - 1) / 2;
    let worst = 0;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      if (same(at(x, y))) continue;
      const r = Math.hypot(x - cxm, y - cym) / (n * 0.4);
      if (r > worst) worst = r;
    }
    return { n, ink, box: [minX, minY, maxX, maxY].join(','), worst };
  }, (m.icons || []).filter(i => i.purpose === 'maskable')[0].src);
  chk('the maskable icon has a mark on it', safe.ink > safe.n * safe.n * 0.005, safe.ink + ' non-background px');
  chk('nothing important sits outside the safe circle',
      safe.worst <= 1.0, 'farthest mark pixel at ' + safe.worst.toFixed(2) + '× the safe radius');

  /* --------------------------------------------------------- installability */
  group('4. The install criteria, applied — plus what only a browser can say');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const hasFetchHandler = /addEventListener\(\s*['"]fetch['"]/.test(swSrc) ||
                          /onfetch\s*=/.test(swSrc);
  const secure = await page.evaluate(() => window.isSecureContext === true);
  chk('the app is in a secure context (no service worker otherwise)', secure);
  chk('the service worker handles fetches, so "offline" means something', hasFetchHandler);
  const problems = installProblems(m, { secure: secure, worker: hasFetchHandler });
  chk('the manifest meets every installability criterion',
      problems.length === 0, problems.join('; ') || 'all criteria met');
  const client = await page.createCDPSession();
  await client.send('Page.enable');
  const mani = await client.send('Page.getAppManifest').catch(() => null);
  chk('and Chrome itself parsed the manifest we think we served',
      !!mani && !!mani.url && mani.url.indexOf('manifest.webmanifest') >= 0,
      mani ? mani.url : 'no manifest read');

  /* ----------------------------------------------------- worker and offline */
  group('5. Installed means it opens with the network gone');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload({ waitUntil: 'load' });
  const controlled = await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller));
  chk('the service worker controls the page after a reload', controlled);

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'load' }).catch(() => {});
  const offline = await page.evaluate(() => ({
    booted: !!(window.ANC && window.ANC.view),
    screen: document.getElementById('screenBody') ? document.getElementById('screenBody').className : '',
    hasLang: typeof window.chooseLang === 'function'
  })).catch(() => ({ booted: false }));
  chk('a cold start with no network still reaches the app',
      offline.booted && offline.hasLang, JSON.stringify(offline));
  await page.setOfflineMode(false);

  /* ------------------------------------------------------- 7 widths, no spill */
  group('6. Every width the roadmap lists, on every screen');
  /* Measured on the language picker alone, this check would have been a
     formality: a fresh profile shows one short screen. So the profile is
     onboarded first, and each width is swept across the screens that carry
     content — the widest row of chips, the print-shaped sheets, the tables. */
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.reload({ waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 300));
  const ready = await page.evaluate(async () => {
    const click = sel => { const el = document.querySelector(sel); if (el) el.click(); return !!el; };
    const fr = Array.from(document.querySelectorAll('#screenBody button'))
      .find(b => b.getAttribute('data-a1') === 'fr' || /Fran/i.test(b.textContent));
    if (fr) fr.click();
    await new Promise(r => setTimeout(r, 200));
    if (window.setConsent) window.setConsent();
    for (let i = 0; i < 14; i++) {
      if (window.getState && window.getState().onboarded) break;
      const btns = Array.from(document.querySelectorAll('#screenBody .btn, #screenBody button'));
      if (btns.length) btns[btns.length - 1].click();
      await new Promise(r => setTimeout(r, 120));
    }
    try { if (window.finishOnboarding) window.finishOnboarding(); } catch (e) {}
    return !!(window.getState && window.getState().onboarded);
  });
  chk('the audit could onboard a real profile to measure', ready);

  const widths = [320, 360, 390, 414, 768, 1024, 1280];
  const screens = ['home', 'session', 'progress', 'profile', 'science', 'body'];
  const spill = [];
  for (const w of widths) {
    await page.setViewport({ width: w, height: 844, deviceScaleFactor: 1 });
    for (const sc of screens) {
      await page.evaluate(s => { try { window.go(s); } catch (e) {} }, sc);
      await new Promise(r => setTimeout(r, 140));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) spill.push(sc + '@' + w + ':+' + over);
    }
    if (SHOTS) await page.screenshot({ path: '/tmp/pwa/' + w + '.png' });
  }
  chk('no screen overflows at any of the seven widths',
      spill.length === 0,
      spill.join(' ') || widths.length + ' widths × ' + screens.length + ' screens');

  /* A sweep that measures blank screens would also report no overflow. */
  const filled = await page.evaluate(async (list) => {
    const counts = {};
    for (const sc of list) {
      try { window.go(sc); } catch (e) {}
      await new Promise(r => setTimeout(r, 120));
      counts[sc] = document.querySelectorAll('#screenBody *').length;
    }
    return counts;
  }, screens);
  const empty = Object.keys(filled).filter(k => filled[k] < 20);
  chk('and it is measuring rendered screens, not empty ones',
      empty.length === 0, empty.map(k => k + '=' + filled[k]).join(' ') || JSON.stringify(filled));
  chk('the app raised no page errors while being audited', consoleErrors.length === 0,
      consoleErrors.slice(0, 2).join(' | ') || 'none');

  /* ------------------------------------------------------------- shortcuts
     The manifest offers two long-press shortcuts on the home screen. They are
     a documented install surface that nothing has ever exercised: a shortcut
     that opens the app but not the thing it names is worse than no shortcut. */
  group('7. The home-screen shortcuts do what they say');
  const shortcuts = (m.shortcuts || []).map(sc => sc.url);
  chk('the manifest declares shortcuts', shortcuts.length >= 2, shortcuts.join(' '));
  for (const sc of m.shortcuts || []) {
    const hash = String(sc.url).split('#')[1];
    if (!hash) continue;
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(base + 'index.html#' + hash, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 700));
    /* A sheet is `position:fixed`, and a fixed element has no offsetParent even
       when it is on screen — the first version of this check called a working
       shortcut broken. Ask the box, not the tree. */
    const landed = await page.evaluate(h => {
      const sheet = document.querySelector('#sheetHost .sheet');
      let open = false;
      if (sheet) {
        const cs = getComputedStyle(sheet), box = sheet.getBoundingClientRect();
        open = cs.display !== 'none' && cs.visibility !== 'hidden' &&
               Number(cs.opacity) > 0 && box.width > 0 && box.height > 0;
      }
      return {
        hash: location.hash,
        view: window.ANC ? window.ANC.view : null,
        active: window.ANC ? !!window.ANC.active : null,
        sheetOpen: open
      };
    }, hash);
    const ok = hash === 'train'
      ? (landed.active === true || landed.view === 'session')
      : landed.sheetOpen;
    chk('"#' + hash + '" opens what it names', ok, JSON.stringify(landed));
  }

  await browser.close();
  server.close();

  console.log('\n' + '='.repeat(60));
  if (fail) {
    console.log('  ' + fail + ' FAILED, ' + pass + ' passed');
    failures.forEach(f => console.log('   - ' + f));
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }
  console.log('  ALL ' + pass + ' INSTALL CHECKS PASSED');
  console.log('='.repeat(60) + '\n');
})().catch(e => { console.error(e); process.exit(1); });
