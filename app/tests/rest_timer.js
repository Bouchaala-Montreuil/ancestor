/* Real-browser rest-timer regressions. The plan below is a test fixture only.
   Source tools/chromium.sh first. ANCESTOR_TEST_TARGET may point at the
   standalone release or an HTTP preview instead of the modular entry. */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');
const target = process.env.ANCESTOR_TEST_TARGET || path.resolve(__dirname, '../index.html');
const url = /^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(target)).href;
let passed = 0, failed = 0;
const errors = [];
function check(name, ok, detail){
  if(ok){ passed++; console.log('  PASS  ' + name); }
  else { failed++; console.error('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
async function click(page, selector){
  const el = await page.waitForSelector(selector, {visible:true});
  await el.evaluate(node => node.scrollIntoView({block:'center', inline:'nearest'}));
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await el.click();
}
async function input(page, selector, value){
  await page.waitForSelector(selector, {visible:true});
  await page.$eval(selector, (el, v) => {
    el.value = v; el.dispatchEvent(new Event('input', {bubbles:true}));
  }, value);
}
async function advance(page, ms){
  await page.evaluate(n => {
    const key = '__rest_test_offset';
    sessionStorage.setItem(key, String(+(sessionStorage.getItem(key) || 0) + n));
  }, ms);
}

(async function(){
  const browser = await puppeteer.launch({headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  async function fresh(width, viewport){
    const ctx = await browser.createBrowserContext(), page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport(Object.assign({width:width || 390,height:844,deviceScaleFactor:1}, viewport || {}));
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    /* A wall-clock offset persists over reload; the real intervals still run. */
    await page.evaluateOnNewDocument(() => {
      const real = Date.now.bind(Date);
      Date.now = () => real() + +(sessionStorage.getItem('__rest_test_offset') || 0);
    });
    await page.goto(url, {waitUntil:'load'});
    await page.evaluate(() => {
      chooseLang('en'); finishOnboarding();
      getState().plan = {mode:'std',split:2,restSec:120,builtAt:Date.now(),sessions:[
        {id:'A',name:'Upper',focus:['chest'],exercises:[
          {id:'bb-bench',sets:3,reps:[6,10],rir:2}, {id:'pushup',sets:2,reps:[8,20],rir:2}]},
        {id:'B',name:'Lower',focus:['quads'],exercises:[
          {id:'bb-squat',sets:2,reps:[5,8],rir:2}]}
      ]};
      saveState(); PLAN_DAY = 'A'; go('session');
    });
    await page.waitForFunction(() => !document.getElementById('appBoot'));
    await click(page, '[data-act="startSession"][data-a1="A"]');
    return {ctx,page};
  }
  async function logFirst(page){
    await input(page, '#sf_0_0_load', '60');
    await input(page, '#sf_0_0_reps', '8');
    await click(page, '#logbtn_0_0');
  }
  async function reload(page){
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(() => !document.getElementById('appBoot'));
  }
  try{
    /* Paused time is frozen, including across an interruption. */
    {
      const {ctx,page} = await fresh();
      await logFirst(page);
      let state = await page.evaluate(() => ({rest:REST, draft:JSON.parse(localStorage.getItem(DRAFT_KEY)),
        track:document.querySelector('#restTrack')?.getAttribute('aria-valuemax')}));
      check('logging a set starts a real rest and saves its deadline with the draft',
        state.rest && !state.rest.paused && state.rest.total === 120 && state.draft.restTimer &&
        state.draft.restTimer.endsAt === state.rest.endsAt && !('timer' in state.draft.restTimer) && state.track === '120');
      await click(page, '#restHost [data-act="toggleRest"]');
      const frozen = await page.evaluate(() => REST.leftMs);
      await advance(page, 60000);
      await click(page, '#restHost [data-act="addRest"]');
      state = await page.evaluate(() => ({left:REST.leftMs, paused:REST.paused, added:REST.added,
        say:document.querySelector('#restSay').textContent,
        focus:document.activeElement.getAttribute('data-act'), draft:JSON.parse(localStorage.getItem(DRAFT_KEY)).restTimer}));
      check('adding time after a long pause adds exactly 15 seconds to the frozen remainder',
        state.paused && state.left === frozen + 15000 && state.added === 15 && state.draft.leftMs === state.left, JSON.stringify(state));
      check('the add control keeps focus and announces that the timer is still paused',
        state.focus === 'addRest' && /paus/i.test(state.say) && /15/.test(state.say), JSON.stringify(state));
      await reload(page);
      state = await page.evaluate(() => ({active:!!ACTIVE, rest:REST, clock:document.querySelector('#restT')?.textContent}));
      check('a paused timer and the same remaining time survive reload',
        state.active && state.rest?.paused && state.rest.leftMs === frozen + 15000 && !!state.clock, JSON.stringify(state));
      await click(page, '#restHost [data-act="resetRest"]');
      state = await page.evaluate(() => ({rest:REST, max:document.querySelector('#restTrack').getAttribute('aria-valuemax'),
        focus:document.activeElement.getAttribute('data-act')}));
      check('reset while paused stays paused and returns to the original duration',
        state.rest.paused && state.rest.leftMs === 120000 && state.rest.added === 0 && state.max === '120');
      check('reset keeps keyboard focus on its control', state.focus === 'resetRest', String(state.focus));
      await page.focus('#restHost [data-act="toggleRest"]');
      await page.keyboard.press('Enter');
      state = await page.evaluate(() => ({rest:REST, focus:document.activeElement.getAttribute('data-act'), now:Date.now()}));
      check('keyboard resume keeps focus and continues from the frozen time',
        !state.rest.paused && state.focus === 'toggleRest' && Math.abs(state.rest.endsAt - state.now - 120000) < 1000);
      await click(page, '#nav [data-nav="library"]');
      check('the rest stays visible while visiting another destination',
        await page.evaluate(() => !!REST && !!document.querySelector('#restHost .restbar') && SESSION_SUB === 'library'));
      await click(page, '#nav [data-nav="session"]');
      await click(page, '#restHost [data-act="closeRest"]');
      state = await page.evaluate(() => ({rest:REST, focus:document.activeElement.getAttribute('data-act'),
        resting:document.body.classList.contains('resting'), draft:JSON.parse(localStorage.getItem(DRAFT_KEY))}));
      check('closing the timer removes its saved snapshot and returns focus to the rest control',
        !state.rest && state.focus === 'startRest' && !state.resting && !state.draft.restTimer, JSON.stringify(state));
      await reload(page);
      check('a closed timer does not reappear after reload', await page.evaluate(() => !!ACTIVE && !REST));
      await ctx.close();
    }

    /* A running timer uses an absolute deadline rather than restarting at 120. */
    {
      const {ctx,page} = await fresh();
      await click(page, '[data-act="startRest"]');
      const deadline = await page.evaluate(() => REST.endsAt);
      await advance(page, 30000);
      await reload(page);
      let state = await page.evaluate(() => ({rest:REST, now:Date.now(), saved:JSON.parse(localStorage.getItem(DRAFT_KEY)).restTimer}));
      check('running rest resumes after reload at the original deadline',
        state.rest && !state.rest.paused && state.rest.endsAt === deadline && state.saved.endsAt === deadline &&
        state.rest.endsAt - state.now > 87000 && state.rest.endsAt - state.now < 91000, JSON.stringify(state));
      await advance(page, 60000);
      await reload(page);
      state = await page.evaluate(() => ({rest:REST, now:Date.now()}));
      check('a second interruption does not restart the programmed rest',
        state.rest && state.rest.endsAt === deadline && state.rest.endsAt - state.now > 27000 && state.rest.endsAt - state.now < 31000, JSON.stringify(state));
      await click(page, '#restHost [data-act="addRest"]');
      state = await page.evaluate(() => ({rest:REST, saved:JSON.parse(localStorage.getItem(DRAFT_KEY)).restTimer}));
      check('adding time to a running rest extends and persists its actual deadline',
        !state.rest.paused && state.rest.endsAt === deadline+15000 && state.saved.endsAt === state.rest.endsAt);
      await click(page, '#restHost [data-act="resetRest"]');
      state = await page.evaluate(() => ({rest:REST, now:Date.now()}));
      check('resetting a running rest starts its original duration again',
        !state.rest.paused && state.rest.added === 0 && Math.abs(state.rest.endsAt-state.now-120000) < 1000);
      await page.evaluate(() => { clearInterval(REST.timer); REST.timer = null; });
      await advance(page, 130000);
      await reload(page);
      await page.waitForFunction(() => REST === null, {timeout:5000});
      state = await page.evaluate(() => ({toast:document.querySelector('#toast').textContent,
        draft:JSON.parse(localStorage.getItem(DRAFT_KEY)), active:!!ACTIVE}));
      check('an expired timer is completed on return and removed from the draft',
        state.active && !state.draft.restTimer && state.toast === await page.evaluate(() => t('session.restDone')), JSON.stringify(state));
      await reload(page);
      check('an expired timer is not restored or completed a second time', await page.evaluate(() => !!ACTIVE && !REST && !JSON.parse(localStorage.getItem(DRAFT_KEY)).restTimer));
      await ctx.close();
    }

    /* A workout pause must not undo an independent rest pause. */
    {
      const {ctx,page} = await fresh();
      await click(page, '[data-act="startRest"]');
      await click(page, '#restHost [data-act="toggleRest"]');
      await click(page, '[data-act="togglePauseWorkout"]');
      await click(page, '[data-act="togglePauseWorkout"]');
      let state = await page.evaluate(() => ({rest:REST, workout:ACTIVE.paused}));
      check('resuming the workout does not resume a manually paused rest',
        !state.workout && state.rest.paused && !state.rest.pausedByWorkout);
      await click(page, '#restHost [data-act="toggleRest"]');
      await click(page, '[data-act="togglePauseWorkout"]');
      state = await page.evaluate(() => ({rest:REST, workout:ACTIVE.paused}));
      check('pausing the workout pauses a running rest and remembers why',
        state.workout && state.rest.paused && state.rest.pausedByWorkout);
      await click(page, '#restHost [data-act="resetRest"]');
      await click(page, '#restHost [data-act="addRest"]');
      await reload(page);
      state = await page.evaluate(() => ({rest:REST, workout:ACTIVE.paused}));
      check('a workout-paused rest, including extra time, survives reload',
        state.workout && state.rest.paused && state.rest.pausedByWorkout && state.rest.leftMs === 135000, JSON.stringify(state));
      await click(page, '[data-act="togglePauseWorkout"]');
      state = await page.evaluate(() => ({rest:REST, workout:ACTIVE.paused, now:Date.now()}));
      check('resuming that workout resumes only the rest it paused',
        !state.workout && !state.rest.paused && !state.rest.pausedByWorkout && Math.abs(state.rest.endsAt-state.now-135000) < 1000);
      await click(page, '[data-act="togglePauseWorkout"]');
      await click(page, '[data-act="startRest"]');
      state = await page.evaluate(() => ({rest:REST, workout:ACTIVE.paused}));
      check('starting a new rest while the workout is paused starts it paused',
        state.workout && state.rest.paused && state.rest.pausedByWorkout && state.rest.leftMs === 120000);
      await click(page, '#restHost [data-act="toggleRest"]');
      state = await page.evaluate(() => ({rest:REST, workout:ACTIVE.paused}));
      check('an explicit rest resume remains possible while the workout clock is paused',
        state.workout && !state.rest.paused && !state.rest.pausedByWorkout);
      await ctx.close();
    }

    /* The snapshot shares the workout's existing write-warning and retry. */
    {
      const {ctx,page} = await fresh();
      await page.evaluate(() => {
        window.__setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k,v){ if(k === DRAFT_KEY) throw new Error('quota'); return window.__setItem.call(this,k,v); };
      });
      await click(page, '[data-act="startRest"]');
      let state = await page.evaluate(() => ({rest:!!REST, warning:!document.getElementById('storeFlag').hidden,
        title:document.querySelector('#storeFlag .sf-t').textContent, expected:t('workout.draftTitle')}));
      check('a refused timer snapshot shows the existing draft warning without stopping the rest',
        state.rest && state.warning && state.title === state.expected, JSON.stringify(state));
      await page.evaluate(() => { Storage.prototype.setItem = window.__setItem; });
      await click(page, '#storeFlag [data-act="storeRecovery"]');
      state = await page.evaluate(() => ({warning:!document.getElementById('storeFlag').hidden,
        stored:JSON.parse(localStorage.getItem(DRAFT_KEY)).restTimer, deadline:REST.endsAt}));
      check('retry saves the latest timer together with the active workout',
        !state.warning && state.stored?.endsAt === state.deadline, JSON.stringify(state));
      await page.evaluate(() => { ACTIVE.restTimer = {total:'bad',paused:false}; saveDraft(); });
      await reload(page);
      check('an invalid timer snapshot never prevents recovery of the workout',
        await page.evaluate(() => !!ACTIVE && !REST && Array.isArray(ACTIVE.exercises)));
      await ctx.close();
    }

    /* Only meaningful transitions write the draft, not every 250ms clock tick. */
    {
      const {ctx,page} = await fresh();
      await page.evaluate(() => {
        window.__draftWrites = 0; window.__write = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k,v){
          if(k === DRAFT_KEY) window.__draftWrites++;
          return window.__write.call(this,k,v);
        };
      });
      await click(page, '[data-act="startRest"]');
      const initial = await page.evaluate(() => window.__draftWrites);
      await new Promise(r => setTimeout(r, 800));
      const ticking = await page.evaluate(() => window.__draftWrites);
      await click(page, '#restHost [data-act="toggleRest"]');
      const paused = await page.evaluate(() => window.__draftWrites);
      check('clock ticks do not repeatedly write the draft; state transitions do',
        initial === 1 && ticking === initial && paused === initial+1, JSON.stringify({initial,ticking,paused}));
      await page.evaluate(() => { Storage.prototype.setItem = window.__write; });
      await ctx.close();
    }

    /* Returning from a suspended page catches up immediately, not on a new countdown. */
    {
      const {ctx,page} = await fresh();
      await page.evaluate(() => startRest(3));
      await page.focus('#restHost [data-act="toggleRest"]');
      await page.evaluate(() => { clearInterval(REST.timer); REST.timer = null; });
      await advance(page, 5000);
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      check('visibility return reconciles an expired timer immediately',
        await page.evaluate(() => !REST && document.querySelector('#toast').textContent === t('session.restDone')));
      check('an expiring focused timer returns focus to the workout',
        await page.evaluate(() => document.activeElement.getAttribute('data-act') === 'startRest'));
      await ctx.close();
    }

    /* Information is contextual; notifications still require an explicit opt-in. */
    {
      const {ctx,page} = await fresh();
      await click(page, '[data-act="startRest"]');
      await page.evaluate(() => {
        window.__asked = 0; window.__permission = 'default';
        window.Notification = function(){};
        Object.defineProperty(Notification, 'permission', {configurable:true,get:() => window.__permission});
        Notification.requestPermission = () => { window.__asked++; window.__permission = 'granted'; return Promise.resolve('granted'); };
        Object.defineProperty(navigator, 'serviceWorker', {configurable:true,value:{ready:Promise.resolve({showNotification:() => Promise.resolve()})}});
      });
      await click(page, '#restHost [data-act="openRestInfo"]');
      let info = await page.evaluate(() => ({asked:window.__asked, text:document.querySelector('#sheetHost').textContent,
        hint:t('rest.timerHint'), limits:t('rest.notifyHint'), checked:document.querySelector('[data-act="setRestNotifyFromRest"]')?.getAttribute('aria-checked'),
        box:getComputedStyle(document.querySelector('[data-act="setRestNotifyFromRest"] .box')).backgroundColor}));
      check('the timer explains restoration and alert limits without requesting permission',
        info.asked === 0 && info.text.includes(info.hint) && info.text.includes(info.limits) &&
        info.checked === 'false' && info.box === 'rgba(0, 0, 0, 0)', JSON.stringify(info));
      await click(page, '[data-act="setRestNotifyFromRest"]');
      await page.waitForFunction(() => getState().profile.restNotify === true);
      info = await page.evaluate(() => ({asked:window.__asked, on:getState().profile.restNotify,
        sheet:!!document.querySelector('#sheetHost [role="dialog"]')}));
      check('the contextual switch requests permission only when chosen', info.asked === 1 && info.on && !info.sheet);
      await click(page, '#restHost [data-act="openRestInfo"]');
      check('the information sheet reports the enabled state',
        await page.evaluate(() => document.querySelector('[data-act="setRestNotifyFromRest"]').getAttribute('aria-checked') === 'true' &&
          getComputedStyle(document.querySelector('[data-act="setRestNotifyFromRest"] .box')).backgroundColor !== 'rgba(0, 0, 0, 0)'));
      await click(page, '[data-act="setRestNotifyFromRest"]');
      await page.waitForFunction(() => getState().profile.restNotify === false);
      check('turning alerts off does not request permission again', await page.evaluate(() => window.__asked === 1));
      await page.evaluate(() => startRest(3));
      await click(page, '#restHost [data-act="openRestInfo"]');
      await page.evaluate(() => { clearInterval(REST.timer); REST.timer = null; });
      await advance(page, 5000);
      await page.evaluate(() => tickRest());
      await click(page, '#sheetHost [data-act="closeSheet"]');
      check('if rest ends while its sheet is open, closing it restores useful focus',
        await page.evaluate(() => !REST && document.activeElement.getAttribute('data-act') === 'startRest'));
      await page.evaluate(() => {
        getState().profile.restNotify = true; window.__notifications = [];
        Object.defineProperty(document, 'hidden', {configurable:true,value:true});
        Object.defineProperty(navigator, 'serviceWorker', {configurable:true,value:{ready:Promise.resolve({
          showNotification:(title,opts) => { window.__notifications.push({title,body:opts.body}); return Promise.resolve(); }
        })}});
        startRest(3); clearInterval(REST.timer); REST.timer = null;
      });
      await advance(page, 5000); await page.evaluate(() => tickRest());
      await page.waitForFunction(() => window.__notifications.length === 1);
      check('an opted-in hidden page sends one notification when its timer actually fires',
        await page.evaluate(() => window.__notifications[0].title === t('rest.notifyTitle') &&
          window.__notifications[0].body === t('rest.notifyBody') && !REST));
      await page.evaluate(() => {
        window.__unhandled = 0; addEventListener('unhandledrejection', () => window.__unhandled++);
        Object.defineProperty(navigator, 'serviceWorker', {configurable:true,value:{ready:Promise.resolve({
          showNotification:() => Promise.reject(new Error('notification refused'))
        })}});
        startRest(3); clearInterval(REST.timer); REST.timer = null;
      });
      await advance(page, 5000); await page.evaluate(() => tickRest());
      await new Promise(r => setTimeout(r, 100));
      check('a refused system notification is handled without losing the workout',
        await page.evaluate(() => window.__unhandled === 0 && !!ACTIVE && !REST));
      await ctx.close();
    }

    /* The workout owns the timer: finish or discard must not revive it later. */
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      await click(page, '.heavy [data-act="finishSession"]');
      await reload(page);
      check('finishing a workout cannot resurrect its rest timer',
        await page.evaluate(() => !ACTIVE && !REST && !localStorage.getItem(DRAFT_KEY) && getState().sessions.length === 1));
      await ctx.close();
    }
    {
      const {ctx,page} = await fresh(); await click(page, '[data-act="startRest"]');
      await page.evaluate(() => {
        const s = getState();
        s.sessions.push({id:'test-saved',name:'Upper',planId:'A',date:Date.now(),
          startedAt:ACTIVE.startedAt,durationMs:0,exercises:[]});
        saveState(); finishSession();
      });
      const duplicate = await page.evaluate(() => ({active:!!ACTIVE,rest:!!REST,draft:!!localStorage.getItem(DRAFT_KEY)}));
      await reload(page);
      check('finishing an already-saved workout also stops its rest',
        !duplicate.active && !duplicate.rest && !duplicate.draft && await page.evaluate(() => !ACTIVE && !REST), JSON.stringify(duplicate));
      await ctx.close();
    }
    {
      const {ctx,page} = await fresh(); await click(page, '[data-act="startRest"]');
      let discardDialogs = 0;
      page.once('dialog', async dialog => { discardDialogs++; await dialog.accept(); });
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const beforeDiscard = await page.evaluate(() => ({
        bar:document.querySelector('.restbar').getBoundingClientRect().top,
        button:document.querySelector('[data-act="discardSession"]').getBoundingClientRect().bottom}));
      check('workout actions immediately scroll clear of a newly started rest',
        beforeDiscard.button <= beforeDiscard.bar+1, JSON.stringify(beforeDiscard));
      await click(page, '[data-act="discardSession"]');
      await page.waitForFunction(() => !ACTIVE, {timeout:1500}).catch(() => {});
      const afterDiscard = await page.evaluate(() => ({active:!!ACTIVE, rest:!!REST, raw:!!localStorage.getItem(DRAFT_KEY),
        focus:document.activeElement?.outerHTML, button:document.querySelector('[data-act="discardSession"]')?.getBoundingClientRect().toJSON()}));
      await reload(page);
      const afterReload = await page.evaluate(() => ({active:!!ACTIVE, rest:!!REST, raw:!!localStorage.getItem(DRAFT_KEY)}));
      check('discarding a workout also removes its rest timer',
        discardDialogs === 1 && !afterDiscard.active && !afterDiscard.rest && !afterDiscard.raw &&
        !afterReload.active && !afterReload.rest && !afterReload.raw, JSON.stringify({discardDialogs,beforeDiscard,afterDiscard,afterReload}));
      await ctx.close();
    }

    {
      const {ctx,page} = await fresh(); await click(page, '[data-act="startRest"]');
      await click(page, '#nav [data-nav="profile"]');
      await page.evaluate(() => document.querySelectorAll('#screenBody details').forEach(d => { d.open = true; }));
      let confirmations = 0;
      page.on('dialog', async dialog => { confirmations++; await dialog.accept(); });
      await click(page, '[data-act="doErase"]');
      await page.waitForFunction(() => !ACTIVE && !REST, {timeout:3000});
      check('erasing app data stops the active rest as well as deleting its draft',
        confirmations === 2 && await page.evaluate(() => !localStorage.getItem(DRAFT_KEY) && !getState().onboarded));
      await ctx.close();
    }

    /* 320px, all seven languages, both timer states and a visible track. */
    {
      const {ctx,page} = await fresh(320);
      await click(page, '[data-act="startRest"]');
      for(const lang of ['en','fr','es','de','it','nl','ar']){
        await page.evaluate(l => { switchLang(l); if(REST.paused) resumeRest(); }, lang);
        for(const mode of ['running','paused']){
          if(mode === 'paused') await click(page, '#restHost [data-act="toggleRest"]');
          const fit = await page.evaluate(() => {
            const bar = document.querySelector('.restbar').getBoundingClientRect();
            const nav = document.querySelector('#nav').getBoundingClientRect();
            const buttons = [...document.querySelectorAll('.restbar button')].map(b => {
              const r = b.getBoundingClientRect();
              return {name:b.getAttribute('aria-label') || b.textContent.trim(),left:r.left,right:r.right,
                top:r.top,bottom:r.bottom,width:r.width,height:r.height,clipped:b.scrollWidth>b.clientWidth+1};
            });
            const track = document.querySelector('#restTrack').getBoundingClientRect();
            return {width:innerWidth,doc:document.documentElement.scrollWidth,bar:{top:bar.top,bottom:bar.bottom,height:bar.height},
              navTop:nav.top,buttons,track:{width:track.width,height:track.height},
              reserved:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rest-height'))};
          });
          const contained = fit.buttons.every(b => b.name && b.width >= 44 && b.height >= 44 &&
            b.left >= -0.5 && b.right <= fit.width+0.5 && b.top >= fit.bar.top && b.bottom <= fit.bar.bottom+0.5 && !b.clipped);
          check('timer controls fit and stay readable at 320px: ' + lang + ' / ' + mode,
            fit.doc <= fit.width && fit.buttons.length === 5 && contained && fit.bar.bottom <= fit.navTop+1 &&
            fit.track.width >= 16 && fit.track.height >= 3 && fit.reserved >= fit.bar.height, JSON.stringify(fit));
        }
        if(process.env.REST_SHOTS && (lang === 'de' || lang === 'ar')){
          fs.mkdirSync(process.env.REST_SHOTS,{recursive:true});
          await page.screenshot({path:path.join(process.env.REST_SHOTS, 'timer-' + lang + '-320.png')});
        }
        await click(page, '#restHost [data-act="openRestInfo"]');
        const sheet = await page.evaluate(() => {
          const p = document.querySelector('#sheetHost .sheet-panel'), r = p.getBoundingClientRect();
          return {hint:t('rest.timerHint'), text:p.textContent, width:r.width, left:r.left, right:r.right,
            viewport:innerWidth, scroll:p.scrollWidth, client:p.clientWidth, dir:document.documentElement.dir};
        });
        check('the contextual explanation fits and is translated at 320px: ' + lang,
          sheet.hint !== 'rest.timerHint' && sheet.text.includes(sheet.hint) && sheet.left >= 0 &&
          sheet.right <= sheet.viewport && sheet.scroll <= sheet.client+1 &&
          (lang !== 'ar' || sheet.dir === 'rtl'), JSON.stringify(sheet));
        if(process.env.REST_SHOTS && lang === 'ar')
          await page.screenshot({path:path.join(process.env.REST_SHOTS,'timer-info-ar-320.png')});
        await click(page, '#sheetHost [data-act="closeSheet"]');
      }
      await page.evaluate(() => { switchLang('en'); setDisplay('theme','paper'); setDisplay('textScale',1.3); });
      await new Promise(r => setTimeout(r, 200));
      const paper = await page.evaluate(() => ({theme:document.documentElement.dataset.theme, text:document.documentElement.dataset.text,
        width:document.documentElement.scrollWidth, viewport:innerWidth, label:getComputedStyle(document.querySelector('.restbar .t')).color,
        bar:getComputedStyle(document.querySelector('.restbar')).backgroundColor}));
      check('paper theme and enlarged text retain the timer without horizontal overflow',
        paper.theme === 'paper' && paper.text === '1.3' && paper.width <= paper.viewport && paper.label !== paper.bar, JSON.stringify(paper));
      await page.evaluate(() => toast('Saved', 'ok'));
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const toastFit = await page.evaluate(() => ({toast:document.querySelector('#toast').getBoundingClientRect().bottom,
        bar:document.querySelector('.restbar').getBoundingClientRect().top}));
      check('a toast sits above the timer instead of covering its controls', toastFit.toast <= toastFit.bar+1, JSON.stringify(toastFit));
      // The entrance begins 14px below its settled position. Check the first
      // rendered frame, not only the end of the transition, on both layouts.
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
      await page.evaluate(() => setDisplay('reducedMotion','auto'));
      for(const width of [320,1024]){
        await page.setViewport({width,height:844,deviceScaleFactor:1});
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        const entering = await page.evaluate(() => {
          const el=document.querySelector('#toast');
          el.style.transition='none'; el.className='toast'; void el.offsetWidth;
          el.style.removeProperty('transition'); void el.offsetWidth;
          toast('Saved','ok');
          return {motion:document.documentElement.dataset.motion,
            toast:el.getBoundingClientRect().bottom, bar:document.querySelector('.restbar').getBoundingClientRect().top};
        });
        check('the entering toast clears the timer with normal motion at '+width+'px',
          entering.motion==='off' && entering.toast <= entering.bar+1, JSON.stringify(entering));
      }
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await page.setViewport({width:320,height:844,deviceScaleFactor:1});
      await page.evaluate(() => setDisplay('reducedMotion','auto'));
      if(process.env.REST_SHOTS) await page.screenshot({path:path.join(process.env.REST_SHOTS,'timer-paper-320.png')});
      await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const end = await page.evaluate(() => ({discard:document.querySelector('[data-act="discardSession"]').getBoundingClientRect().bottom,
        bar:document.querySelector('.restbar').getBoundingClientRect().top}));
      check('the final workout action can scroll clear of the timer', end.discard <= end.bar+1, JSON.stringify(end));
      await page.setViewport({width:320,height:420,deviceScaleFactor:1});
      await page.focus('#sf_0_0_load');
      await new Promise(r => setTimeout(r, 150));
      const typing = await page.evaluate(() => ({typing:document.body.classList.contains('typing'),
        action:document.querySelector('.setcard:focus-within .set-actions')?.getBoundingClientRect().bottom,
        bar:document.querySelector('.restbar').getBoundingClientRect().top,
        input:document.activeElement.getBoundingClientRect().toJSON(),
        card:document.querySelector('.setcard:focus-within')?.getBoundingClientRect().toJSON(),
        scrollY:window.scrollY}));
      if(process.env.REST_SHOTS) await page.screenshot({path:path.join(process.env.REST_SHOTS,'timer-keyboard-320.png')});
      check('while typing at keyboard height, the set action stays above the timer',
        typing.typing && Number.isFinite(typing.action) && typing.action <= typing.bar+1, JSON.stringify(typing));
      const addedBefore = await page.evaluate(() => REST.added);
      await click(page, '#restHost [data-act="addRest"]');
      const afterTap = await page.evaluate(() => ({added:REST.added,focus:document.activeElement.getAttribute('data-act'),
        typing:document.body.classList.contains('typing')}));
      check('the timer controls remain tappable when the keyboard is open',
        afterTap.added === addedBefore+15 && afterTap.focus === 'addRest', JSON.stringify(afterTap));
      for(const width of [360,390,768,1024,1440]){
        await page.setViewport({width,height:844,deviceScaleFactor:1});
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        const layout = await page.evaluate(() => {
          const bar = document.querySelector('.restbar').getBoundingClientRect();
          const nav = document.querySelector('#nav').getBoundingClientRect();
          return {viewport:innerWidth, doc:document.documentElement.scrollWidth, left:bar.left, right:bar.right,
            bottom:bar.bottom, navTop:nav.top, navRight:nav.right, height:innerHeight,
            buttons:[...document.querySelectorAll('.restbar button')].map(b => ({w:b.getBoundingClientRect().width,
              h:b.getBoundingClientRect().height,clipped:b.scrollWidth>b.clientWidth+1}))};
        });
        check('timer fits the ' + width + 'px layout and clears navigation',
          layout.doc <= layout.viewport && layout.buttons.every(b => b.w >= 44 && b.h >= 44 && !b.clipped) &&
          layout.right <= width+1 && (width < 1024 ? layout.bottom <= layout.navTop+1 :
            layout.left >= layout.navRight-1 && layout.bottom <= layout.height+1), JSON.stringify(layout));
      }
      await ctx.close();
    }
    /* Touch emulation keeps the keyboard-height timer usable with normal motion. */
    {
      const {ctx,page} = await fresh(320, {height:420,hasTouch:true,isMobile:true});
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
      await click(page, '[data-act="startRest"]');
      await page.focus('#sf_0_0_load');
      await new Promise(r => setTimeout(r, 250));
      const before = await page.evaluate(() => REST.added);
      await page.tap('#restHost [data-act="addRest"]');
      check('touching the timer works at keyboard height with normal motion',
        await page.evaluate(n => !!REST && REST.added === n+15, before));
      await ctx.close();
    }
    check('no uncaught browser errors in the rest journeys', errors.length === 0, errors.join('; '));
  } finally { await browser.close(); }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if(failed) process.exitCode = 1;
})().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
