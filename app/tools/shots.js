/* Screenshot the surfaces B5 calls "under-designed" so the judgement is made on
   pixels, not on memory. Not part of the suite: a developer's eye, scripted.
   Usage:  source tools/chromium.sh && node tools/shots.js [outDir]           */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const OUT = process.argv[2] || '/tmp/shots';
const ROOT = path.resolve(__dirname, '..');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('file://' + ROOT + '/index.html', { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));

  // first run: language, then onboarding
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#screenBody button')].find(x => /FR|Fran/.test(x.textContent) || x.getAttribute('data-a1') === 'fr');
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => { window.setConsent && window.setConsent(); });
  for (let i = 0; i < 12; i++) {
    const done = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('#screenBody .btn, #screenBody button')].pop();
      if (window.getState && window.getState().onboarded) return true;
      if (btn) btn.click();
      return false;
    });
    await new Promise(r => setTimeout(r, 250));
    if (done) break;
  }
  await page.evaluate(() => { try { window.finishOnboarding && window.finishOnboarding(); } catch (e) {} });

  const shot = async (name, js) => {
    try { await page.evaluate(js); } catch (e) { console.log('nav failed', name, e.message); }
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(name, 'horizontal overflow:', over);
  };

  await shot('science', () => window.go('science'));
  await shot('science_open', () => {
    const d = document.querySelector('[data-act="openLesson"], [data-act="toggleDisclosure"]');
    if (d) d.click();
  });
  await shot('lab', () => window.go('lab'));
  await shot('body', () => { window.go('body'); });
  await shot('progress', () => window.go('progress'));
  await shot('profile', () => window.go('profile'));

  await browser.close();
  console.log('wrote', OUT);
})();
