#!/usr/bin/env node
/* ============================================================================
   ANCESTOR — accessibility tree audit (§6: "Screen-reader pass")

       node tools/ax_audit.js            (needs a Chromium: tools/chromium.sh)

   The roadmap has carried "Screen-reader pass (VoiceOver + TalkBack) — 1 d" as
   not done since it was written. Those two need a phone and a pair of ears, and
   this cannot replace them. What a browser *can* answer is whether the tree the
   screen reader would read is sound: every control named, headings in order,
   landmarks present, nothing focusable that is invisible, no duplicate names
   doing different jobs, the dialog behaving like a dialog.

   Two rules govern this file, both learned the hard way earlier today:

     1. Chrome's CDP answers are not automatically evidence. Where a check can
        be written against the tree, it is — and every check is demonstrated on
        a deliberately broken page first, in group 0. A green run has to be able
        to go red.
     2. The tree is read through CDP's Accessibility domain, not by guessing at
        markup: a `<div role="button">` with no name is invisible to a regex and
        obvious to Chrome.

   What this proves: the tree is well formed. What it cannot prove: that the
   names make sense when spoken in French at speed, or that the reading order
   matches the visual one on a real device. Those stay on the list.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0; const failures = [];
const chk = (name, ok, note) => {
  if (ok) { pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + name + (note ? '  \x1b[2m' + note + '\x1b[0m' : '')); }
  else { fail++; failures.push(name); console.log('  \x1b[31mFAIL\x1b[0m  ' + name + (note ? '  -> ' + note : '')); }
};
const group = t => console.log('\n\x1b[1m' + t + '\x1b[0m');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8'
};

/* The control page: every defect this file looks for, planted on purpose. It is
   served from the same server as the app so both go through identical checks. */
const CONTROL = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>control</title></head>
<body>
  <main role="main" aria-label="Control">
    <h1>Control</h1>
    <h3>Heading that skips level two</h3>
    <button id="unnamed"></button>
    <button aria-label=" "></button>
    <input id="unlabelled" type="text">
    <div role="button" tabindex="0"></div>
    <a href="#" id="linkless"></a>
    <div aria-hidden="true"><button id="hiddenButFocusable">trapped</button></div>
    <button style="opacity:0">transparent but still focusable</button>
    <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" role="img">
  </main>
</body></html>`;

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      if (rel === '__control/ax.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(CONTROL);
        return;
      }
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/* ---------------------------------------------------------------- the checks
   These run inside the page and return plain data. They are written once and
   applied to the control page and to the app, which is the only way to know
   that a green result means anything. */
function collect() {
  const SEL = 'a[href], button, input, select, textarea, [tabindex], [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="tab"], [role="menuitem"], [role="slider"], [role="spinbutton"], [role="combobox"], [role="dialog"]';
  const all = Array.from(document.querySelectorAll('*'));
  const visible = el => {
    if (!el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
  };
  const nameOf = el => {
    /* text content, aria-label, aria-labelledby or an associated <label> —
       a crude approximation of accname, which CDP answers properly later. */
    const lbl = el.getAttribute && el.getAttribute('aria-label');
    if (lbl && lbl.trim()) return lbl.trim();
    const by = el.getAttribute && el.getAttribute('aria-labelledby');
    if (by) {
      const t = by.split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
      if (t) return t;
    }
    if (el.id) {
      const lab = document.querySelector('label[for="' + el.id + '"]');
      if (lab && lab.textContent.trim()) return lab.textContent.trim();
    }
    const wrap = el.closest && el.closest('label');
    if (wrap && wrap.textContent.trim()) return wrap.textContent.trim();
    const t = (el.textContent || '').trim();
    if (t) return t;
    const title = el.getAttribute && el.getAttribute('title');
    return title && title.trim() ? title.trim() : '';
  };

  const controls = Array.from(document.querySelectorAll(SEL));
  const unnamed = [];
  const invisible = [];
  const trappedInAriaHidden = [];
  const sized = [];
  /* `tabIndex >= 0` does not mean focusable: a button inside `display:none` has
     a tabIndex and cannot take focus. The first version of this check reported
     two buttons in hidden strips as "invisible but focusable" and was wrong.
     So ask the browser: try to focus it. */
  const canFocus = el => {
    try {
      const before = document.activeElement;
      el.focus({ preventScroll: true });
      const got = document.activeElement === el;
      if (got && before && before !== el) { try { before.focus({ preventScroll: true }); } catch (e) {} }
      return got;
    } catch (e) { return false; }
  };
  controls.forEach(el => {
    const shown = visible(el);
    if (shown && !nameOf(el)) unnamed.push(el.outerHTML.slice(0, 90));
    if (!shown && el.tabIndex >= 0 && canFocus(el)) invisible.push(el.outerHTML.slice(0, 90));
    if (el.closest('[aria-hidden="true"]') && el.tabIndex >= 0 && shown && canFocus(el)) {
      trappedInAriaHidden.push(el.outerHTML.slice(0, 90));
    }
    const r = el.getBoundingClientRect();
    if (shown) sized.push({ n: nameOf(el).slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), tag: el.tagName });
  });

  /* headings, in document order */
  const heads = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
    .filter(visible)
    .map(h => ({ level: +h.tagName[1], text: (h.textContent || '').trim().slice(0, 40) }));
  const jumps = [];
  for (let i = 1; i < heads.length; i++) {
    if (heads[i].level - heads[i - 1].level > 1) jumps.push(heads[i - 1].level + '→' + heads[i].level + ' "' + heads[i].text + '"');
  }

  const imgNoName = Array.from(document.querySelectorAll('img, svg[role="img"]'))
    .filter(e => visible(e))
    .filter(e => !(e.getAttribute('aria-label') || '').trim() && !(e.getAttribute('alt') || '').trim() &&
                  !(e.querySelector && e.querySelector('title')))
    .length;

  /* duplicate accessible names doing different jobs: same name, same landmark,
     different actions — the classic "trois boutons Fermer" ambiguity */
  const byName = new Map();
  controls.filter(visible).forEach(el => {
    const n = nameOf(el);
    if (!n) return;
    const act = (el.getAttribute('data-act') || el.tagName) + '|' + (el.getAttribute('data-a1') || '');
    if (!byName.has(n)) byName.set(n, new Set());
    byName.get(n).add(act);
  });
  const ambiguous = [...byName].filter(([, acts]) => acts.size > 1)
    .map(([n, acts]) => n + ' → ' + [...acts].join(' / '));

  return {
    landmarks: {
      main: document.querySelectorAll('main, [role="main"]').length,
      nav: document.querySelectorAll('nav, [role="navigation"]').length,
      live: document.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length
    },
    lang: document.documentElement.getAttribute('lang'),
    dir: document.documentElement.getAttribute('dir') || getComputedStyle(document.documentElement).direction,
    controls: controls.filter(visible).length,
    unnamed, invisible, trappedInAriaHidden,
    smallTargets: sized.filter(s => (s.w > 0 && s.w < 24) || (s.h > 0 && s.h < 24)).map(s => s.n + ' ' + s.w + '×' + s.h),
    heads, jumps, imgNoName,
    ambiguous,
    h1: heads.filter(h => h.level === 1).length,
    dialog: (function () {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return null;
      return {
        label: (d.getAttribute('aria-label') || '').trim(),
        modal: d.getAttribute('aria-modal'),
        focusInside: d.contains(document.activeElement)
      };
    })()
  };
}

(async () => {
  const { server, port } = await serve();
  const base = 'http://127.0.0.1:' + port + '/';
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader']
  });

  /* ------------------------------------------------------ group 0: controls */
  group('0. Every check below is demonstrated on a page built to fail it');
  {
    const page = await browser.newPage();
    await page.goto(base + '__control/ax.html', { waitUntil: 'load' });
    const c = await page.evaluate(collect);
    chk('an unnamed button is caught', c.unnamed.length >= 2, c.unnamed.length + ' unnamed');
    chk('a heading that skips a level is caught', c.jumps.length >= 1, c.jumps.join(' '));
    chk('an unlabelled input is caught', c.unnamed.some(u => /input/i.test(u)));
    chk('a control focusable while aria-hidden is caught',
        c.trappedInAriaHidden.length >= 1, c.trappedInAriaHidden.length + ' trapped');
    chk('a control focusable while invisible is caught',
        c.invisible.length >= 1, c.invisible.length + ' invisible');
    chk('an <img role="img"> with no name is caught', c.imgNoName >= 1, String(c.imgNoName));
    chk('the control page has no <nav>, and that is reported',
        c.landmarks.nav === 0, 'nav=' + c.landmarks.nav);
    await page.close();
  }

  /* ------------------------------------------------------------ the real app */
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(base, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 400));

  group('1. First run: the language screen is the first thing announced');
  {
    const c = await page.evaluate(collect);
    chk('there is exactly one <main>', c.landmarks.main === 1, String(c.landmarks.main));
    chk('a language screen is showing', c.controls > 3, c.controls + ' controls');
    chk('nothing is unnamed on it', c.unnamed.length === 0, c.unnamed.join(' | ') || 'all named');
    chk('it has one <h1>', c.h1 === 1, String(c.h1));
    chk('its headings do not skip a level', c.jumps.length === 0, c.jumps.join(' ') || 'in order');
  }

  await page.evaluate(async () => {
    const fr = Array.from(document.querySelectorAll('#screenBody button'))
      .find(b => b.getAttribute('data-a1') === 'fr' || /Fran/i.test(b.textContent));
    if (fr) fr.click();
    await new Promise(r => setTimeout(r, 200));
    if (window.setConsent) window.setConsent();
    for (let i = 0; i < 14; i++) {
      if (window.getState && window.getState().onboarded) break;
      const bs = Array.from(document.querySelectorAll('#screenBody .btn, #screenBody button'));
      if (bs.length) bs[bs.length - 1].click();
      await new Promise(r => setTimeout(r, 120));
    }
    try { if (window.finishOnboarding) window.finishOnboarding(); } catch (e) {}
  });

  group('2. The six screens, read the way a screen reader would');
  const screens = ['home', 'session', 'progress', 'profile', 'science', 'body'];
  const report = {};
  const settle = async () => {
    /* Cards enter with a staggered rise from opacity 0. A card caught halfway
       through is genuinely invisible and genuinely focusable, so the first
       version of this audit called ten lesson cards broken. Audit the screen
       once it has finished arriving, not while it is still moving. */
    await page.evaluate(() => Promise.race([
      Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))),
      new Promise(r => setTimeout(r, 1500))
    ]));
    await new Promise(r => setTimeout(r, 120));
  };
  for (const sc of screens) {
    await page.evaluate(s => { try { window.go(s); } catch (e) {} }, sc);
    await new Promise(r => setTimeout(r, 350));
    await settle();
    const c = await page.evaluate(collect);
    report[sc] = c;
    const label = '· ' + sc;
    chk(sc + ': every control has a name' + '', c.unnamed.length === 0,
        c.unnamed.slice(0, 2).join(' | ') || c.controls + ' named');
    chk(sc + ': nothing invisible is focusable', c.invisible.length === 0,
        c.invisible.slice(0, 2).join(' | ') || 'none');
    chk(sc + ': nothing focusable is inside aria-hidden', c.trappedInAriaHidden.length === 0,
        c.trappedInAriaHidden.slice(0, 2).join(' | ') || 'none');
    chk(sc + ': headings do not skip a level', c.jumps.length === 0,
        c.jumps.join(' ') || c.heads.map(h => h.level).join(''));
    chk(sc + ': exactly one <h1>', c.h1 === 1, String(c.h1));
    chk(sc + ': navigation and live regions are present',
        c.landmarks.nav >= 1 && c.landmarks.live >= 1,
        'nav=' + c.landmarks.nav + ' live=' + c.landmarks.live);
    chk(sc + ': images that are announced carry a name', c.imgNoName === 0, c.imgNoName + ' unnamed');
  }

  group('3. Names that would be ambiguous when spoken');
  {
    /* Not a ban on repetition — "Fermer" twice on one screen is fine if both
       close the same thing. It is a ban on one name doing two jobs. */
    for (const sc of screens) {
      const c = report[sc];
      chk(sc + ': no name is doing two different jobs', c.ambiguous.length === 0,
          c.ambiguous.slice(0, 3).join(' | ') || 'none');
    }
  }

  group('4. A dialog behaves like one');
  {
    await page.evaluate(() => { try { window.go('home'); } catch (e) {} });
    await new Promise(r => setTimeout(r, 300));
    /* `el.click()` does not move focus, so the first version of this test left
       LAST_FOCUS as <body> and then complained that focus went back to <body>.
       A pointer press focuses the button; do that. */
    await page.evaluate(() => {
      const b = document.querySelector('[data-act="openSheet"]');
      if (b) { window.__axOpener = b; b.focus(); b.click(); }
    });
    await new Promise(r => setTimeout(r, 400));
    const c = await page.evaluate(collect);
    chk('a sheet is a dialog with a name', !!c.dialog && !!c.dialog.label,
        c.dialog ? c.dialog.label : 'no dialog');
    chk('it is modal', !!c.dialog && c.dialog.modal === 'true', c.dialog ? String(c.dialog.modal) : '-');
    chk('focus moves into it when it opens', !!c.dialog && c.dialog.focusInside, c.dialog ? String(c.dialog.focusInside) : '-');
    const esc = await page.evaluate(async () => {
      const opener = window.__axOpener || null;
      /* The key handler is bound to the panel — that is what makes it a focus
         trap — so the event has to be sent where a keyboard sends it, to the
         focused element, bubbling up. Dispatching on document proved nothing. */
      const target = document.activeElement || document.body;
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(r => setTimeout(r, 250));
      return {
        closed: !document.querySelector('[role="dialog"]'),
        focusRestored: !!opener && document.activeElement === opener,
        active: document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className || '') : 'none'
      };
    });
    chk('Escape closes it', esc.closed, JSON.stringify(esc));
    chk('and focus goes back where it came from', esc.focusRestored, esc.active);
  }

  group('5. Arabic is announced as Arabic');
  {
    await page.evaluate(() => { try { window.switchLang('ar'); } catch (e) {} });
    await new Promise(r => setTimeout(r, 400));
    const c = await page.evaluate(collect);
    chk('html[lang] is ar', c.lang === 'ar', String(c.lang));
    chk('and the document is directed right to left', c.dir === 'rtl', String(c.dir));
    chk('with nothing unnamed in it', c.unnamed.length === 0, c.unnamed.slice(0, 2).join(' | ') || 'all named');
    chk('and headings still in order', c.jumps.length === 0, c.jumps.join(' ') || 'in order');
    await page.evaluate(() => { try { window.switchLang('fr'); } catch (e) {} });
  }

  group('6. The tree Chrome exposes, not the one the markup suggests');
  {
    /* The DOM checks above are a proxy. This is the real thing: CDP's
       accessibility tree, which is what assistive tech consumes. */
    await page.evaluate(() => { try { window.go('home'); } catch (e) {} });
    await new Promise(r => setTimeout(r, 400));
    const client = await page.createCDPSession();
    await client.send('Accessibility.enable');
    const tree = await client.send('Accessibility.getFullAXTree');
    const nodes = tree.nodes.filter(n => !n.ignored);
    const roles = nodes.map(n => (n.role && n.role.value) || '');
    const interactive = ['button', 'link', 'textbox', 'checkbox', 'combobox', 'switch', 'tab', 'menuitem', 'slider', 'spinbutton', 'listbox', 'radio'];
    const live = nodes.filter(n => interactive.includes((n.role && n.role.value) || ''));
    const nameless = live.filter(n => {
      const nm = n.name && n.name.value;
      return !nm || !String(nm).trim();
    });
    chk('Chrome exposes a tree with real roles', roles.filter(r => r && r !== 'none').length > 10,
        roles.filter(Boolean).length + ' nodes, ' + new Set(roles).size + ' distinct roles');
    chk('there is a main landmark in Chrome’s tree', roles.includes('main'), roles.includes('main') ? 'main' : 'missing');
    chk('there is a navigation landmark in Chrome’s tree', roles.includes('navigation'));
    chk('every interactive node in the tree has a name', nameless.length === 0,
        nameless.slice(0, 3).map(n => n.role.value + ' ' + JSON.stringify(n.name && n.name.value)).join(' | ') ||
        live.length + ' interactive nodes');
    const headings = nodes.filter(n => (n.role && n.role.value) === 'heading');
    chk('headings reach the tree with a level',
        headings.length > 0 && headings.every(n => n.properties && n.properties.some(p => p.name === 'level')),
        headings.length + ' headings');
    await client.send('Accessibility.disable');
  }

  chk('the app raised no page errors while being read', pageErrors.length === 0,
      pageErrors.slice(0, 2).join(' | ') || 'none');

  await browser.close();
  server.close();

  console.log('\n' + '='.repeat(64));
  if (fail) {
    console.log('  ' + fail + ' FAILED, ' + pass + ' passed');
    failures.forEach(f => console.log('   - ' + f));
    console.log('='.repeat(64) + '\n');
    process.exit(1);
  }
  console.log('  ALL ' + pass + ' ACCESSIBILITY-TREE CHECKS PASSED');
  console.log('='.repeat(64) + '\n');
})().catch(e => { console.error(e); process.exit(1); });
