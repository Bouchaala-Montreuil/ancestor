/* Real-browser regression checks for the five-destination journey.
   Run after sourcing tools/chromium.sh: node tests/journey.js
   A fresh, locally generated plan is a test fixture; no sample data ships. */
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
let passed = 0;
let failed = 0;
const failures = [];
function check(name, ok, detail){
  if(ok){ passed++; console.log('  PASS  ' + name); }
  else { failed++; failures.push(name); console.error('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async function(){
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  try{
    await page.setViewport({width:390,height:844,deviceScaleFactor:1});
    await page.goto(url, {waitUntil:'load'});
    await page.evaluate(() => localStorage.clear());
    await page.reload({waitUntil:'load'});
    await page.evaluate(() => { chooseLang('en'); finishOnboarding(); });
    await page.waitForFunction(() => !document.getElementById('appBoot'), {timeout:10000});
    await wait(350);

    const navState = () => page.evaluate(() => ({
      view: ANC.view,
      sub: typeof SESSION_SUB === 'undefined' ? null : SESSION_SUB,
      selected: document.querySelector('#nav [aria-current="page"]')?.getAttribute('data-nav'),
      heading: document.querySelector('#screenBody h1')?.textContent.trim(),
      route: history.state && history.state.ancestorRoute
    }));
    const clickNav = async id => {
      await page.click('#nav [data-nav="' + id + '"]');
      await wait(220);
    };
    const backTo = async (view, sub) => {
      await page.evaluate(() => history.back());
      await page.waitForFunction((v, s) => ANC.view === v && (!s || SESSION_SUB === s), {}, view, sub || null);
      await wait(100);
      return navState();
    };

    const initial = await page.evaluate(() => ({
      buttons: [...document.querySelectorAll('#nav button')].map(b => ({id:b.dataset.nav,label:b.textContent.trim()})),
      weekClosed: !document.querySelector('[data-remember="home-week"]').open,
      understandClosed: !document.querySelector('[data-remember="home-understand"]').open,
      primary: document.querySelectorAll('.dash-actions .btn:not(.quiet):not(.secondary)').length
    }));
    check('five labelled destinations in the requested order',
      initial.buttons.map(b => b.id).join(',') === 'home,session,progress,library,profile' &&
      initial.buttons.map(b => b.label).join(',') === 'Today,Train,Progress,Library,Me', JSON.stringify(initial.buttons));
    check('Today leads with one primary action and folds secondary information',
      initial.primary === 1 && initial.weekClosed && initial.understandClosed, JSON.stringify(initial));

    await clickNav('library');
    let state = await navState();
    check('Library opens the exercise atlas and is selected',
      state.view === 'session' && state.sub === 'library' && state.selected === 'library' &&
      await page.$('#libSearchInput') !== null, JSON.stringify(state));
    await clickNav('session');
    state = await navState();
    check('Train actually leaves Library for the plan',
      state.view === 'session' && state.sub === 'plan' && state.selected === 'session' &&
      await page.$('[data-act="startSession"]') !== null, JSON.stringify(state));
    await clickNav('progress');
    await page.click('.group-nav [data-a1="body"]'); await wait(200);
    state = await navState();
    check('Body is visibly inside the Progress group', state.view === 'body' && state.selected === 'progress' &&
      await page.$('.group-nav [data-a1="body"][aria-current="page"]') !== null, JSON.stringify(state));
    await page.click('.group-nav [data-a1="science"]'); await wait(200);
    state = await navState();
    check('Science is visibly inside the Progress group', state.view === 'science' && state.selected === 'progress' &&
      await page.$('.group-nav [data-a1="science"][aria-current="page"]') !== null, JSON.stringify(state));

    state = await backTo('body'); check('browser Back returns from Science to Body', state.selected === 'progress');
    state = await backTo('progress'); check('browser Back returns from Body to Progress', state.selected === 'progress');
    state = await backTo('session', 'plan'); check('browser Back returns to Train', state.selected === 'session');
    state = await backTo('session', 'library'); check('browser Back returns to Library, not Train', state.selected === 'library');
    state = await backTo('home'); check('browser Back returns to Today', state.selected === 'home');
    await page.evaluate(() => history.forward());
    await page.waitForFunction(() => ANC.view === 'session' && SESSION_SUB === 'library');
    state = await navState(); check('browser Forward restores Library', state.selected === 'library');

    const library = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.ex-card')];
      const exposed = el => {
        for(let node = el.parentElement; node; node = node.parentElement){
          if(node.tagName === 'DETAILS' && !node.open) return false;
        }
        return el.getBoundingClientRect().height > 0;
      };
      return { all: cards.length, visible: cards.filter(exposed).length,
               restClosed: !document.querySelector('.library-more').open };
    });
    check('Library shows a short first page without deleting exercises',
      library.all === 88 && library.visible === 12 && library.restClosed, JSON.stringify(library));
    await page.click('.library-more > summary');
    const expanded = await page.evaluate(() => [...document.querySelectorAll('.ex-card')].filter(x => x.getBoundingClientRect().height > 0).length);
    check('the rest of the library can be opened in place', expanded === 88, String(expanded));
    await page.click('[data-remember="library-filters"] > summary');
    await page.click('[data-remember="library-filters"] [data-act="setLibMuscle"][data-a1="chest"]');
    const filtered = await page.evaluate(() => ({
      open: document.querySelector('[data-remember="library-filters"]').open,
      summary: document.querySelector('[data-remember="library-filters"] summary').textContent,
      ids: [...document.querySelectorAll('.ex-card')].map(el => el.dataset.a1),
      correct: [...document.querySelectorAll('.ex-card')].every(el => EX_BY_ID[el.dataset.a1].m.some(m => m[0] === 'chest'))
    }));
    check('filtering keeps the controls open and names the active filter',
      filtered.open && /chest/i.test(filtered.summary) && filtered.ids.length > 0 && filtered.correct, JSON.stringify(filtered));
    await page.evaluate(() => resetLibFilters());
    await page.type('#libSearchInput', 'plank', {delay:5});
    const libSearch = await page.evaluate(() => ({query:LIB_QUERY, focus:document.activeElement.id, count:document.querySelectorAll('.ex-card').length}));
    check('Library search retains focus and accepts a complete query',
      libSearch.query === 'plank' && libSearch.focus === 'libSearchInput' && libSearch.count > 0, JSON.stringify(libSearch));

    /* The mobile bar steps aside while the keyboard is active. */
    await page.evaluate(() => document.activeElement.blur()); await wait(250);
    await clickNav('session');
    const darkPlanTitle = await page.evaluate(() => {
      const el = document.querySelector('.plan-ex-title'); const cs = getComputedStyle(el);
      return { background:cs.backgroundColor, color:cs.color, cursor:cs.cursor, height:el.getBoundingClientRect().height };
    });
    check('exercise names are legible, tappable controls in the dark plan',
      darkPlanTitle.background === 'rgba(0, 0, 0, 0)' && darkPlanTitle.color === 'rgb(247, 245, 240)' &&
      darkPlanTitle.cursor === 'pointer' && darkPlanTitle.height >= 44, JSON.stringify(darkPlanTitle));
    await page.click('[data-remember="plan-options"] > summary');
    await page.click('[data-act="togglePlanEdit"]');
    check('planner options stay open while editing the workout',
      await page.evaluate(() => document.querySelector('[data-remember="plan-options"]').open));
    await page.click('[data-act="startSession"]'); await wait(300);
    const startedAt = await page.evaluate(() => ANC.active && ANC.active.startedAt);
    check('the real workout starts', !!startedAt);
    await clickNav('library'); await clickNav('session');
    const resumed = await page.evaluate(start => ({
      same: !!ANC.active && ANC.active.startedAt === start,
      sub: SESSION_SUB,
      live: !!document.getElementById('liveClock'),
      selected: document.querySelector('#nav [aria-current="page"]')?.dataset.nav
    }), startedAt);
    check('Train resumes the same active workout after visiting Library',
      resumed.same && resumed.sub === 'live' && resumed.live && resumed.selected === 'session', JSON.stringify(resumed));

    /* A test-only recorded session exercises the non-empty Progress paths. */
    await page.evaluate(() => addSession({name:'Browser fixture', planId:'A', date:Date.now(),
      exercises:[{id:'bb-bench',sets:[{w:60,r:8,rir:2,warmup:false,skipped:false,committed:true}]}]}));
    await clickNav('progress');
    const progressFolds = await page.evaluate(() => ({
      analysis: document.querySelector('[data-remember="progress-analysis"]')?.open,
      log: document.querySelector('[data-remember="progress-log"]')?.open,
      bars: !!document.querySelector('.chart-bars, .bar-chart, .dv-bar')
    }));
    check('recorded Progress starts with analysis and log available but closed',
      progressFolds.analysis === false && progressFolds.log === false, JSON.stringify(progressFolds));
    await page.$eval('[data-remember="progress-analysis"] > summary', el => el.scrollIntoView({block:'center'}));
    await wait(300);
    await page.click('[data-remember="progress-analysis"] > summary');
    await page.$eval('[data-remember="progress-analysis"] [data-act="setPeriod"][data-a1="30"]', el => el.scrollIntoView({block:'center'}));
    await wait(200);
    await page.click('[data-remember="progress-analysis"] [data-act="setPeriod"][data-a1="30"]');
    const analysis = await page.evaluate(() => ({
      open:document.querySelector('[data-remember="progress-analysis"]').open, period:PROG_PERIOD
    }));
    check('changing the analysis period preserves the open section',
      analysis.open && analysis.period === 30, JSON.stringify(analysis));
    await page.$eval('[data-remember="progress-log"] > summary', el => el.scrollIntoView({block:'center'}));
    await wait(200);
    await page.click('[data-remember="progress-log"] > summary');
    await page.$eval('[data-remember="progress-log"] [data-act="openSessionEditor"]', el => el.scrollIntoView({block:'center'}));
    await wait(200);
    await page.click('[data-remember="progress-log"] [data-act="openSessionEditor"]');
    check('a recorded session can still be edited from the disclosed log',
      await page.$('#sheetHost [role="dialog"]') !== null);
    await wait(250); await page.keyboard.press('Escape'); await wait(200);

    await clickNav('profile');
    const profile = await page.evaluate(() => [...document.querySelectorAll('.prof-group')].map(g => g.open));
    check('Me opens as five closed, named settings groups', profile.length === 5 && profile.every(open => !open), JSON.stringify(profile));
    await page.click('[data-remember="profile-access"] > summary');
    const historyBefore = await page.evaluate(() => history.length);
    await page.click('[data-remember="profile-access"] [data-act="setDisplay"][data-a1="highContrast"]');
    const pref = await page.evaluate(() => ({
      open: document.querySelector('[data-remember="profile-access"]').open,
      enabled: getState().profile.display.highContrast,
      length: history.length
    }));
    check('a setting stays open and does not add a browser-history entry',
      pref.open && pref.enabled && pref.length === historyBefore, JSON.stringify(pref));
    await page.evaluate(() => setDisplay('highContrast', false));
    await page.evaluate(() => setDisplay('theme', 'paper'));
    const paper = await page.evaluate(() => ({theme:document.documentElement.dataset.theme,
      open:document.querySelector('[data-remember="profile-access"]').open,
      hero:getComputedStyle(document.querySelector('.masthead-profile')).backgroundImage}));
    check('paper theme keeps its controls and the cinematic opening', paper.theme === 'paper' && paper.open && /hero-body\.jpg/.test(paper.hero), JSON.stringify(paper));
    await clickNav('session');
    await page.click('[data-subnav="session"] [data-act="setSessionSub"][data-a1="plan-peek"]');
    const paperPlanTitle = await page.evaluate(() => {
      const el = document.querySelector('.plan-ex-title'); const cs = getComputedStyle(el);
      return {background:cs.backgroundColor,color:cs.color,height:el.getBoundingClientRect().height};
    });
    check('exercise names stay legible and tappable in the paper plan',
      paperPlanTitle.background === 'rgba(0, 0, 0, 0)' && paperPlanTitle.color === 'rgb(32, 33, 31)' &&
      paperPlanTitle.height >= 44, JSON.stringify(paperPlanTitle));

    await clickNav('progress');
    await page.click('.group-nav [data-a1="science"]'); await wait(200);
    await page.type('#sciSearchInput', 'muscle', {delay:5});
    const sciSearch = await page.evaluate(() => ({query:SCI_QUERY, focus:document.activeElement.id}));
    check('Science search retains focus across multiple keystrokes',
      sciSearch.query === 'muscle' && sciSearch.focus === 'sciSearchInput', JSON.stringify(sciSearch));
    await page.click('[data-remember="science-filters"] > summary');
    await page.click('[data-remember="science-filters"] [data-act="setSciCat"]:nth-child(2)');
    check('Science category choices remain open after choosing one',
      await page.evaluate(() => document.querySelector('[data-remember="science-filters"]').open));
    await page.evaluate(() => { setSciQuery(''); setSciCat('all'); });
    await page.click('.lesson-card'); await wait(200);
    state = await navState();
    check('a Science lesson keeps its parent selected and offers a way back',
      state.view === 'lesson' && state.selected === 'progress' &&
      await page.$('[data-act="backToScience"]') !== null, JSON.stringify(state));

    await page.setViewport({width:320,height:844,deviceScaleFactor:1});
    for(const lang of ['en','fr','es','de','it','nl','ar']){
      await page.evaluate(l => switchLang(l), lang);
      const fit = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth, width: document.documentElement.clientWidth,
        navLabel: document.querySelector('#nav').getAttribute('aria-label'), expectedNavLabel:t('journey.primaryNav'),
        buttons: [...document.querySelectorAll('#nav button')].map(b => {
          const r = b.getBoundingClientRect(), t = b.querySelector('span').getBoundingClientRect();
          return {label:b.innerText, hit:r.width, overflow:t.left < r.left - .5 || t.right > r.right + .5,
                  named:(b.getAttribute('aria-label') || '').includes(b.textContent.trim())};
        })
      }));
      check('five readable, named 44px navigation targets at 320px: ' + lang,
        fit.doc <= fit.width && fit.navLabel === fit.expectedNavLabel && fit.buttons.length === 5 &&
        fit.buttons.every(b => b.hit >= 44 && !b.overflow && b.named), JSON.stringify(fit));
    }

    await page.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'reduce'}]);
    await page.evaluate(() => { switchLang('en'); openTrain(); }); await wait(100);
    const reduced = await page.evaluate(() => ({
      children:[...document.querySelectorAll('#screenBody > *')].slice(0,4).map(el => ({
        opacity:getComputedStyle(el).opacity, name:getComputedStyle(el).animationName
      })),
      action:!!document.querySelector('[data-act="togglePauseWorkout"]')
    }));
    check('reduced motion leaves the active workout visible and usable',
      reduced.action && reduced.children.every(x => +x.opacity === 1 && x.name !== 'lab-rise'), JSON.stringify(reduced));
    check('the journey produced no uncaught browser errors', errors.length === 0, errors.join('; '));
  }finally{
    await browser.close();
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if(failed){ console.error(failures.join('\n')); process.exitCode = 1; }
})().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
