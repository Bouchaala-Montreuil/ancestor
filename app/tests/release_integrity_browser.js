/* Real-Chromium notice journeys. ANCESTOR_TEST_TARGET may be an HTTP PWA or
   the standalone file; the default is the modular file:// app. */
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');
const target = process.env.ANCESTOR_TEST_TARGET || path.resolve(__dirname, '../index.html');
const url = /^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(target)).href;
let passed = 0, failed = 0; const errors = [];
function check(name, ok, detail){
  if(ok){ passed++; console.log('  PASS  ' + name); }
  else { failed++; console.error('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
async function click(page, selector){
  const el = await page.waitForSelector(selector, {visible:true});
  await el.evaluate(node => node.scrollIntoView({block:'center',inline:'nearest'}));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await el.click();
}
(async function(){
  const browser = await puppeteer.launch({headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx = await browser.createBrowserContext(), page = await ctx.newPage();
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.setViewport({width:390,height:844,deviceScaleFactor:1});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(() => !document.getElementById('appBoot'));
    await page.evaluate(() => {chooseLang('en');finishOnboarding();});
    await click(page,'#nav [data-nav="profile"]');
    await click(page,'[data-remember="profile-data"] > summary');
    check('Me → Data exposes the third-party notice disclosure',
      await page.evaluate(()=>document.querySelector('[data-third-party-notices] > summary')?.textContent === t('about.thirdParty')));
    await click(page,'[data-third-party-notices] > summary');
    let state = await page.evaluate(()=>({open:document.querySelector('[data-third-party-notices]').open,
      text:document.querySelector('.license-text').textContent}));
    check('opening the disclosure shows complete font and software terms and anatomy attribution',
      state.open && /Copyright © 2010-2026 three\.js authors/.test(state.text) &&
      /Copyright \(c\) 2016-2026 Arseny Kapoulkine/.test(state.text) &&
      /SIL OPEN FONT LICENSE Version 1\.1/.test(state.text) && /creativecommons\.org\/licenses\/by-sa\/4\.0/.test(state.text));
    await page.focus('[data-third-party-notices] > summary');
    await page.keyboard.press('Enter');
    check('the disclosure can be closed with the keyboard',await page.evaluate(()=>!document.querySelector('[data-third-party-notices]').open));
    await page.keyboard.press('Enter');
    check('the disclosure can be reopened with the keyboard',await page.evaluate(()=>document.querySelector('[data-third-party-notices]').open));

    await page.setViewport({width:320,height:760,deviceScaleFactor:1});
    for(const theme of ['dark','paper']){
      await page.evaluate(t=>setDisplay('theme',t),theme);
      for(const lang of ['en','fr','es','de','it','nl','ar']){
        state = await page.evaluate(l=>{
          switchLang(l);
          const data = document.querySelector('[data-remember="profile-data"]'); data.open = true;
          const details = document.querySelector('[data-third-party-notices]'); details.open = true;
          const pre = details.querySelector('pre'), label = details.querySelector('summary');
          return {label:label.textContent,expected:t('about.thirdParty'),lang:pre.lang,dir:pre.dir,
            docOverflow:document.documentElement.scrollWidth-innerWidth, preOverflow:pre.scrollWidth-pre.clientWidth,
            correctDir:document.documentElement.dir === (l==='ar'?'rtl':'ltr'),
            text:pre.textContent, theme:document.documentElement.dataset.theme || 'dark'};
        },lang);
        check(theme+' / '+lang+': translated disclosure and readable original notices fit at 320px',
          state.label===state.expected && state.lang==='en' && state.dir==='ltr' && state.correctDir &&
          state.docOverflow<=0 && state.preOverflow<=0 && state.theme===theme &&
          state.text.includes('three.js authors') && state.text.includes('SIL OPEN FONT LICENSE'),
          JSON.stringify({label:state.label,theme:state.theme,docOverflow:state.docOverflow,preOverflow:state.preOverflow,dir:state.dir}));
      }
    }

    // HTTP runs must use the currently installed cache, not the network; the
    // standalone file has no service worker and is already self-contained.
    if(/^https?:/.test(url)){
      await page.waitForFunction(async()=>{
        if(!('serviceWorker' in navigator)) return false;
        await navigator.serviceWorker.ready;
        const name='ancestor-'+APP_BUILD, names=await caches.keys();
        if(!names.includes(name)) return false;
        const cache=await caches.open(name);
        return !!(await cache.match('./index.html')) && !!(await cache.match('./js/ui/screens.js')) &&
               !!(await cache.match('./js/vendor/three-bundle.js'));
      },{timeout:30000});
    }
    await page.setOfflineMode(true);
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>!document.getElementById('appBoot'));
    await page.evaluate(()=>go('profile'));
    await page.waitForSelector('[data-remember="profile-data"] > summary');
    await click(page,'[data-remember="profile-data"] > summary');
    await click(page,'[data-third-party-notices] > summary');
    state=await page.evaluate(()=>({open:document.querySelector('[data-third-party-notices]').open,
      text:document.querySelector('.license-text').textContent,version:APP_BUILD}));
    check('the current notices remain readable after an offline reload',
      state.open && /three\.js authors/.test(state.text) && /Arseny Kapoulkine/.test(state.text) &&
      /SIL OPEN FONT LICENSE/.test(state.text) && /BodyParts3D/.test(state.text),state.version);
    await page.setOfflineMode(false);
    check('no uncaught browser errors during the notice journeys',errors.length===0,errors.join('; '));
  } finally { await ctx.close(); await browser.close(); }
  console.log('\n'+passed+' passed, '+failed+' failed');
  if(failed) process.exitCode = 1;
})().catch(error=>{console.error(error.stack||error);process.exitCode = 1;});
