/* Automated axe-core checks in real Chromium, not a screen-reader review.
   Default target: the modular PWA on a disposable loopback server. Set
   ANCESTOR_TEST_TARGET for another HTTP PWA or standalone release;
   ANCESTOR_AXE_REPORT optionally writes full JSON results.
   Fixture data exists only in the disposable browser context. */
const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const puppeteer = require('puppeteer');
const axe = require('axe-core');
const startTestServer = require('./static_server');

const target = process.env.ANCESTOR_TEST_TARGET || '';
let url = target ? (/^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(target)).href) : '';
const reports = [], errors = [];
let pass = 0, fail = 0;
function check(name, ok, detail){
  if(ok){ pass++; console.log('  PASS  ' + name); }
  else { fail++; console.error('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

(async function(){
  const server = target ? null : await startTestServer();
  if(server) url = 'http://127.0.0.1:' + server.address().port + '/index.html';
  let browser, ctx;
  try {
    browser = await puppeteer.launch({headless:true, args:['--no-sandbox','--disable-setuid-sandbox',
      '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({width:320,height:800,deviceScaleFactor:1});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);

    // These controls must fail: a test harness that cannot see obvious defects
    // must never report an unqualified pass for the application.
    await page.setContent('<!doctype html><html lang="en"><head><title>Control</title></head><body>' +
      '<main><h1>Control</h1><button></button><button aria-pressed="wrong">View</button>' +
      '<p style="color:#ddd;background:#fff;font-size:12px">Low contrast text</p></main></body></html>');
    await page.evaluate(axe.source);
    const negative = await page.evaluate(() => axe.run());
    const ids = negative.violations.map(v => v.id);
    check('axe negative controls detect an unnamed button, invalid state and low contrast',
      ['button-name','aria-valid-attr-value','color-contrast'].every(id => ids.includes(id)), ids.join(', '));

    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(() => !document.getElementById('appBoot'),{timeout:30000});
    await page.evaluate(axe.source);

    async function scan(name){
      // Theme and screen transitions must settle before sampling colors.
      await pause(100);
      const result = await page.evaluate(() => axe.run(document));
      reports.push({name, violations:result.violations, incomplete:result.incomplete,
        passes:result.passes.map(v=>v.id)});
      const detail = result.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' > ')).join(', ')).join('; ');
      check(name + ' has no automated axe violations', result.violations.length === 0, detail);
    }
    await scan('language chooser');
    await page.evaluate(() => chooseLang('en'));
    const steps = await page.evaluate(() => ONB_STEPS.length);
    for(let i=0;i<steps;i++){
      await page.evaluate(n => { onbGo(n); document.querySelectorAll('details').forEach(d => {d.open = true;}); },i);
      await scan('onboarding step ' + (i+1));
    }
    await page.evaluate(() => {
      finishOnboarding();
      getState().plan = {mode:'std',split:1,restSec:120,builtAt:Date.now(),sessions:[
        {id:'A',name:'Test',focus:['chest'],exercises:[{id:'bb-bench',sets:1,reps:[6,10],rir:2}]}]};
      saveState();
    });
    const langs = ['en','fr','es','de','it','nl','ar'];
    const views = ['home','session','library','progress','profile','body','science'];
    const screenMarker = {home:'.masthead-today',session:'.masthead-train',library:'.masthead-library',
      progress:'.masthead-progress',profile:'.masthead-profile',body:'.masthead-body',science:'[data-subnav="science"]'};
    for(const theme of ['dark','paper']){
      for(const lang of langs){
        await page.evaluate(({theme,lang}) => {setDisplay('theme',theme);switchLang(lang);},{theme,lang});
        // Give inherited colors from the previous theme a paint cycle before
        // navigating; otherwise Chromium can sample a one-frame old color.
        await pause(250);
        for(const view of views){
          await page.evaluate(view => {
            if(view === 'session') openTrain();
            else if(view === 'library') openExerciseLibrary();
            else go(view);
            document.querySelectorAll('details').forEach(d => {d.open = true;});
          },view);
          // A route can fall back to Home without throwing: assert the surface.
          await page.waitForSelector(screenMarker[view],{timeout:10000});
          if(view === 'body') await page.waitForFunction(() => labIsLoaded(),{timeout:30000});
          await scan(theme + ' / ' + lang + ' / ' + view + ' (320 px, disclosures open)');
          if(view === 'home'){
            const tips=await page.evaluate(()=>{
              const buttons=[...document.querySelectorAll('.metric .tip')]; buttons.forEach(b=>b.click());
              return {count:buttons.length,open:buttons.filter(b=>b.getAttribute('aria-expanded')==='true' &&
                !b.closest('.metric').querySelector('.metric-help')?.hidden).length,
                width:document.documentElement.scrollWidth,viewport:window.innerWidth};
            });
            check(theme+' / '+lang+' metric disclosures open without horizontal overflow',
              tips.count===4 && tips.open===4 && tips.width<=tips.viewport+1,JSON.stringify(tips));
            await scan(theme + ' / ' + lang + ' / home (metric explanations open)');
          }
        }
      }
      for(const lang of ['en','ar']){
        await page.evaluate(lang => switchLang(lang),lang);
        for(const kind of ['lesson','module']){
          await page.evaluate(kind => {if(kind === 'lesson')openLesson('muscle-growth');else openModule('muscle-growth');
            document.querySelectorAll('details').forEach(d => {d.open = true;});},kind);
          await scan(theme + ' / ' + lang + ' / ' + kind);
        }
      }
      await page.evaluate(() => switchLang('en'));
      for(const kind of ['sleep','feel','shift','bw']){
        await page.evaluate(kind => {go('home');openSheet(kind);},kind);
        await scan(theme + ' / ' + kind + ' dialog');
        await page.evaluate(() => closeSheet());
      }
      await page.evaluate(() => {go('session');PLAN_DAY='A';SESSION_SUB='plan';render();startSession('A');});
      check(theme + ' workout fixture actually starts',await page.evaluate(() => !!ACTIVE));
      await scan(theme + ' / live workout');
      await page.evaluate(() => openExerciseDetail('bb-bench'));
      await scan(theme + ' / exercise-detail dialog');
      await page.evaluate(() => {closeSheet();ACTIVE=null;clearDraft();stopRest();});
    }
    check('no uncaught errors in the axe journeys',errors.length === 0,errors.join('; '));
  } finally {
    const incomplete = new Map();
    for(const report of reports) for(const rule of report.incomplete){
      const entry = incomplete.get(rule.id) || {states:0,nodes:0,examples:[]};
      entry.states++; entry.nodes += rule.nodes.length;
      for(const node of rule.nodes){
        const sample = report.name + ': ' + node.target.join(' > ');
        if(entry.examples.length < 8 && !entry.examples.includes(sample)) entry.examples.push(sample);
      }
      incomplete.set(rule.id,entry);
    }
    console.log('\nAxe incomplete results require manual review (not passes):');
    for(const [id,entry] of incomplete) console.log('  ' + id + ': ' + entry.states + ' states, ' + entry.nodes + ' nodes; examples: ' + entry.examples.join(' | '));
    if(process.env.ANCESTOR_AXE_REPORT){
      fs.writeFileSync(process.env.ANCESTOR_AXE_REPORT,JSON.stringify({target:url,axe:axe.version,reports,errors},null,2));
      console.log('Full report: ' + process.env.ANCESTOR_AXE_REPORT);
    }
    if(ctx) await ctx.close();
    if(browser) await browser.close();
    if(server) await new Promise(resolve => server.close(resolve));
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed; ' + reports.length + ' app states scanned.');
  if(fail) process.exitCode = 1;
})().catch(e => {console.error(e);process.exitCode=1;});
