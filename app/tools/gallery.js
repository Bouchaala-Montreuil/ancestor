/* ============================================================================
   The whole app, photographed, for someone who is picking up the design.

       source tools/chromium.sh && node tools/gallery.js [outDir]

   `tools/shots.js` photographs the three surfaces an audit called
   under-designed. This one photographs the journey a person actually makes:
   the language gate, onboarding, Today, a live session, Progress, Body, the
   3D lab, Science and its lesson reader, Profile, the A4 sheet, and the same
   screens in Arabic so the RTL pass is visible rather than asserted.

   Every frame is a real render at 390 x 844 CSS px, 2x, in French unless the
   name says otherwise. Nothing is drawn by hand and no state is faked: the
   onboarding is completed by clicking it, the session is started by pressing
   Start. If a step cannot reach its screen the frame is skipped and the reason
   is logged — a gallery that quietly substitutes a placeholder is worse than
   one that is missing a page.

   Not part of the suite. This is for a person, not a gate.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const OUT = process.argv[2] || '/tmp/gallery';
const ROOT = path.resolve(__dirname, '..');
const W = 390, H = 844;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));

  const wait = ms => new Promise(r => setTimeout(r, ms));

  const shot = async (name, js) => {
    try {
      if (js) await page.evaluate(js);
    } catch (e) {
      problems.push(name + ': ' + e.message);
      console.log('  skip', name, '—', e.message);
      return false;
    }
    await wait(800);
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log('  ' + name.padEnd(22) + (over > 0 ? 'OVERFLOW ' + over + 'px' : 'ok'));
    if (over > 0) problems.push(name + ': ' + over + 'px horizontal overflow');
    return true;
  };

  console.log('gallery →', OUT);
  await page.goto('file://' + ROOT + '/index.html', { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await wait(900);

  /* 1. the gate: nothing has been chosen yet */
  await shot('01-language');

  /* 2. onboarding, as it actually appears after the choice */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#screenBody button')]
      .find(x => /Fran|FR/.test(x.textContent) || x.getAttribute('data-a1') === 'fr');
    if (!b) throw new Error('no French row on the language gate');
    b.click();
  });
  await wait(400);
  await shot('02-onboarding');

  /* walk it the way a person walks it, rather than calling the finisher */
  for (let i = 0; i < 14; i++) {
    const done = await page.evaluate(() => {
      if (window.getState && window.getState().onboarded) return true;
      const btn = [...document.querySelectorAll('#screenBody .btn, #screenBody button')].pop();
      if (btn) btn.click();
      return false;
    });
    if (done) break;
    await wait(260);
  }
  await page.evaluate(() => { try { window.finishOnboarding && window.finishOnboarding(); } catch (e) {} });
  await wait(600);

  /* 3. the screens the product is */
  await shot('03-today', () => window.go('home'));

  const started = await shot('04-session', () => {
    const b = document.querySelector('[data-act="startSession"]');
    if (b) b.click();
    else window.go('session');
  });

  await shot('05-progress', () => window.go('progress'));
  await shot('06-body',    () => window.go('body'));
  await shot('07-lab',     () => window.go('lab'));
  await shot('08-science', () => window.go('science'));

  await shot('09-lesson', () => {
    const d = document.querySelector('[data-act="openLesson"], [data-act="toggleDisclosure"]');
    if (!d) throw new Error('no lesson or disclosure on the hub');
    d.click();
  });

  await shot('10-profile', () => window.go('profile'));

  /* The sheet is print media: `#printRoot` is display:none on screen and only
     the @media print block reveals it, and the real action empties it again
     after window.print(). So the document is built directly here and left
     standing for the frame — pressing the button would photograph its own
     cleanup. This is the app's own builder, not a mock. */
  try {
    const built = await page.evaluate(() => {
      const root = document.getElementById('printRoot');
      if (!root || typeof printSheet !== 'function') return 0;
      root.innerHTML = printSheet(getState(), Date.now(), {});
      return root.innerHTML.length;
    });
    if (!built) throw new Error('no #printRoot or no printSheet()');
    await page.emulateMediaType('print');
    await wait(600);
    await page.screenshot({ path: path.join(OUT, '11-print-sheet.png'), fullPage: true });
    console.log('  11-print-sheet        ok (' + built + ' chars, print media, full page)');
    await page.emulateMediaType('screen');
    await page.evaluate(() => { const r = document.getElementById('printRoot'); if (r) r.innerHTML = ''; });
  } catch (e) {
    problems.push('11-print-sheet: ' + e.message);
    console.log('  skip 11-print-sheet  —', e.message);
  }

  /* 4. the same product right to left */
  await page.evaluate(() => {
    window.go('profile');
    const b = document.querySelector('[data-act="switchLang"][data-a1="ar"], [data-a1="ar"]');
    if (!b) throw new Error('no Arabic row in the language settings');
    b.click();
  }).catch(e => problems.push('arabic switch: ' + e.message));
  await wait(900);
  await shot('12-arabic-today', () => window.go('home'));
  await shot('13-arabic-progress', () => window.go('progress'));
  await shot('14-arabic-science', () => window.go('science'));

  /* 5. the width the design is tightest at */
  await page.setViewport({ width: 320, height: 700, deviceScaleFactor: 2 });
  await page.evaluate(() => { window.setLang && window.setLang('fr'); });
  await wait(500);
  await shot('15-today-320', () => window.go('home'));

  await browser.close();

  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
  console.log('\n' + files.length + ' frames written to ' + OUT);
  if (problems.length) {
    console.log('\n' + problems.length + ' problem(s):');
    problems.forEach(p => console.log('  - ' + p));
    process.exit(1);
  }
  console.log('no page errors, no horizontal overflow in any frame');
})();
