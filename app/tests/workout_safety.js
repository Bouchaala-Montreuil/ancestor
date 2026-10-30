/* Real-browser workout safety regressions. Fixture data is test-only.
   Run after sourcing tools/chromium.sh: node tests/workout_safety.js */
const path = require('path');
const fs = require('fs');
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
  /* Let sheet focus and scrolling settle before the real pointer click. */
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await el.click();
}
async function input(page, selector, value){
  await page.waitForSelector(selector, {visible:true});
  await page.focus(selector);
  await page.$eval(selector, (el, v) => {
    el.value = v; el.dispatchEvent(new Event('input', {bubbles:true}));
  }, value);
}

(async function(){
  const browser = await puppeteer.launch({headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  async function fresh(){
    const ctx = await browser.createBrowserContext(), page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({width:390,height:844,deviceScaleFactor:1});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.goto(url, {waitUntil:'load'});
    await page.evaluate(() => {
      chooseLang('en'); finishOnboarding();
      getState().plan = {mode:'std', split:2, restSec:120, builtAt:Date.now(), sessions:[
        {id:'A', name:'Upper', focus:['chest'], exercises:[
          {id:'bb-bench',sets:3,reps:[6,10],rir:2}, {id:'pushup',sets:2,reps:[8,20],rir:2}]},
        {id:'B', name:'Lower', focus:['quads'], exercises:[
          {id:'bb-squat',sets:2,reps:[5,8],rir:2}]}
      ]};
      saveState(); PLAN_DAY = 'A'; go('session');
    });
    await page.waitForFunction(() => !document.getElementById('appBoot'));
    await click(page, '[data-act="startSession"][data-a1="A"]');
    await page.waitForSelector('#sf_0_0_load', {visible:true});
    return {ctx,page};
  }
  async function logFirst(page){
    await input(page, '#sf_0_0_load', '60');
    await input(page, '#sf_0_0_reps', '8');
    await click(page, '#logbtn_0_0');
    await page.evaluate(() => stopRest());
  }
  try{
    /* Looking at another plan cannot replace the one being recorded. */
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      const before = await page.evaluate(() => ({start:ACTIVE.startedAt, raw:localStorage.getItem(DRAFT_KEY)}));
      await click(page, '#nav [data-nav="home"]');
      await click(page, '[data-act="setSessionSubGo"][data-a1="plan"]');
      const peek = await page.evaluate(() => ({sub:SESSION_SUB,
        selected:document.querySelector('[data-subnav="session"] [data-a1="plan-peek"]')?.getAttribute('aria-selected'),
        starts:document.querySelectorAll('[data-act="startSession"], [data-act="startCustomSession"]').length,
        resume:!!document.querySelector('[data-act="go"][data-a1="session"]'),
        notice:document.querySelector('#screenBody').textContent.includes(t('workout.activePlan')),
        tabs:document.querySelectorAll('[data-subnav="session"] [role="tab"]').length}));
      check('Today opens the actual plan preview with the right selected tab',
        peek.sub === 'plan-peek' && peek.selected === 'true', JSON.stringify(peek));
      check('plan preview offers resume, not a replacement start',
        peek.starts === 0 && peek.resume && peek.notice && peek.tabs === 2, JSON.stringify(peek));
      await click(page, '[data-act="go"][data-a1="session"]');
      const resumed = await page.evaluate(() => ({sub:SESSION_SUB, start:ACTIVE?.startedAt,
        live:!!document.querySelector('.ex-block.is-current')}));
      check('resume returns to the same live workout',
        resumed.sub === 'live' && resumed.start === before.start && resumed.live, JSON.stringify(resumed));
      await click(page, '[data-act="setSessionSub"][data-a1="plan-peek"]');
      await click(page, '[data-act="selectPlanDay"][data-a1="B"]');
      await page.evaluate(() => { startSession('B'); startCustomSession(); });
      const guarded = await page.evaluate(() => ({start:ACTIVE.startedAt, raw:localStorage.getItem(DRAFT_KEY), sub:SESSION_SUB}));
      check('stale start handlers and rapid repeat starts leave the same draft',
        guarded.start === before.start && guarded.raw === before.raw && guarded.sub === 'live');
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(() => !document.getElementById('appBoot'));
      const restored = await page.evaluate(() => ({start:ACTIVE?.startedAt, val:ACTIVE?.exercises[0].sets[0].w,
        committed:ACTIVE?.exercises[0].sets[0].committed, view:ANC.view}));
      check('the original workout survives reload after visiting the plan',
        restored.start === before.start && restored.val === '60' && restored.committed && restored.view === 'session', JSON.stringify(restored));
      await ctx.close();
    }

    /* A skip is reversible and never unlogs the first set. */
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      await click(page, '.ex-block.is-current .ex-opts > summary');
      await click(page, '.ex-block.is-current [data-act="skipSet"]');
      let state = await page.evaluate(() => ({sets:ACTIVE.exercises[0].sets,
        opts:document.querySelector('.ex-block .ex-opts').open}));
      check('skip leaves the logged set intact and skips the next one',
        state.sets[0].committed && !state.sets[0].skipped && state.sets[1].skipped && state.opts);
      await click(page, '[data-act="unskipSet"][data-a1="0"][data-a2="1"]');
      await input(page, '#sf_0_1_load', '50');
      await click(page, '.ex-block.is-current [data-act="skipSet"]');
      await click(page, '[data-act="unskipSet"][data-a1="0"][data-a2="1"]');
      state = await page.evaluate(() => ACTIVE.exercises[0].sets[1]);
      check('retry after skipping retains an entered value and its status',
        state.w === '50' && state.entered && !state.skipped, JSON.stringify(state));
      await click(page, '.ex-block.is-current [data-act="skipSet"]');
      await click(page, '.ex-block.is-current [data-act="skipSet"]');
      const done = await page.evaluate(() => ({sets:ACTIVE.exercises[0].sets.map(s=>({committed:s.committed,skipped:s.skipped})),
        disabled:document.querySelector('.ex-block [data-act="skipSet"]').disabled}));
      await page.evaluate(() => skipSet(0));
      const unchanged = await page.evaluate(() => ACTIVE.exercises[0].sets.map(s=>({committed:s.committed,skipped:s.skipped})));
      check('skip is disabled and a stray invocation does nothing when none remain',
        done.disabled && JSON.stringify(done.sets) === JSON.stringify(unchanged) && unchanged[0].committed);
      const oldDraft = await page.evaluate(() => {
        ACTIVE.exercises[0].sets[0].skipped = true; // tolerate a legacy inconsistent draft
        unskipSet(0,0);
        return ACTIVE.exercises[0].sets[0];
      });
      check('retry does not unlog a skipped set in an older inconsistent draft',
        oldDraft.committed && !oldDraft.skipped && oldDraft.w === '60', JSON.stringify(oldDraft));
      await ctx.close();
    }

    /* A substitute keeps existing records and replaces only untouched work. */
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      await input(page, '#sf_0_1_load', '50');
      await input(page, '#exnote_0', 'Seat setting');
      await click(page, '.ex-block.is-current .ex-opts > summary');
      await click(page, '.ex-block.is-current [data-act="openSub"]');
      check('the picker explains what happens to entered work',
        await page.evaluate(() => document.querySelector('#sheetHost').textContent.includes(t('workout.subKeep'))));
      await click(page, '#sheetHost [data-act="applySub"][data-a2="db-bench"]');
      let snapshot = await page.evaluate(() => ({ex:ACTIVE.exercises, draft:JSON.parse(localStorage.getItem(DRAFT_KEY))}));
      const old = snapshot.ex[0], replacement = snapshot.ex[1];
      check('substitution retains logged, entered and noted work on the original',
        old.id === 'bb-bench' && old.sets[0].w === '60' && old.sets[0].committed &&
        old.sets[1].w === '50' && old.sets[1].entered && old.note === 'Seat setting');
      check('only the untouched slot moves to the new exercise, without copying a load',
        old.sets[2].skipped && replacement.id === 'db-bench' && replacement.sets.length === 1 &&
        replacement.sets[0].w === '' && snapshot.draft.exercises.length === 3);
      const replacementSummary = (await page.$$('#screenBody .ex-block > summary'))[1];
      await replacementSummary.evaluate(el => el.scrollIntoView({block:'center'}));
      await replacementSummary.click();
      await input(page, '#sf_1_0_load', '25');
      await input(page, '#sf_1_0_reps', '10');
      await click(page, '#logbtn_1_0'); await page.evaluate(() => stopRest());
      await click(page, '.heavy [data-act="finishSession"]');
      snapshot = await page.evaluate(() => ({rec:getState().sessions[0], done:!!document.querySelector('#doneOverlay')}));
      const bench = snapshot.rec.exercises.find(e=>e.id==='bb-bench');
      const db = snapshot.rec.exercises.find(e=>e.id==='db-bench');
      check('finishing retains both exercises and their own values',
        snapshot.done && bench && bench.note === 'Seat setting' && bench.sets.length === 2 &&
        bench.sets[0].w === 60 && bench.sets[1].w === 50 && db && db.sets[0].w === 25);
      await ctx.close();
    }

    /* An optional value is still user input, even though it must not by itself
       turn a pre-filled planned set into a completed performance. */
    {
      const {ctx,page} = await fresh();
      await input(page, '#sf_0_0_rir', '2');
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(() => !document.getElementById('appBoot'));
      await click(page, '.ex-block .setcard .set-opts > summary');
      await page.evaluate(() => { window.__confirmMessage = ''; window.confirm = m => { window.__confirmMessage = m; return false; }; });
      await click(page, '[data-act="removeSet"][data-a1="0"][data-a2="0"]');
      const removal = await page.evaluate(() => ({prompt:window.__confirmMessage,
        sets:ACTIVE.exercises[0].sets.length, rir:ACTIVE.exercises[0].sets[0].rir}));
      check('removing a set with only an optional value still asks first',
        /delete/i.test(removal.prompt) && removal.sets === 3 && removal.rir === '2', JSON.stringify(removal));
      await click(page, '.ex-block.is-current .ex-opts > summary');
      await click(page, '.ex-block.is-current [data-act="openSub"]');
      check('substitution explains preservation of an optional-only entry',
        await page.evaluate(() => document.querySelector('#sheetHost').textContent.includes(t('workout.subKeep'))));
      await click(page, '#sheetHost [data-act="applySub"][data-a2="db-bench"]');
      const kept = await page.evaluate(() => ({old:ACTIVE.exercises[0], added:ACTIVE.exercises[1]}));
      check('an optional-only entry stays with its exercise without becoming a logged set',
        kept.old.id === 'bb-bench' && kept.old.sets[0].rir === '2' && !kept.old.sets[0].entered &&
        !kept.old.sets[0].committed && kept.added.id === 'db-bench' && kept.added.sets.length === 2, JSON.stringify(kept));
      await ctx.close();
    }

    /* A chosen warm-up is also retained without inventing a completed set. */
    {
      const {ctx,page} = await fresh();
      await click(page, '.ex-block .setcard .set-opts > summary');
      await click(page, '[data-act="toggleWarmup"][data-a1="0"][data-a2="0"]');
      await click(page, '.ex-block.is-current .ex-opts > summary');
      await click(page, '.ex-block.is-current [data-act="openSub"]');
      await click(page, '#sheetHost [data-act="applySub"][data-a2="db-bench"]');
      const kept = await page.evaluate(() => ({old:ACTIVE.exercises[0], added:ACTIVE.exercises[1]}));
      check('substitution keeps an explicitly selected warm-up on the original',
        kept.old.id === 'bb-bench' && kept.old.sets[0].warmup && !kept.old.sets[0].entered &&
        kept.added.id === 'db-bench' && kept.added.sets.length === 2, JSON.stringify(kept));
      await ctx.close();
    }

    /* With no work, substitution still replaces the planned exercise directly. */
    {
      const {ctx,page} = await fresh();
      await click(page, '.ex-block.is-current .ex-opts > summary');
      await click(page, '.ex-block.is-current [data-act="openSub"]');
      await click(page, '#sheetHost [data-act="applySub"][data-a2="db-bench"]');
      const result = await page.evaluate(() => ({ids:ACTIVE.exercises.map(e=>e.id), sets:ACTIVE.exercises[0].sets.length}));
      check('an untouched exercise is replaced directly with its planned set count',
        result.ids.join(',') === 'db-bench,pushup' && result.sets === 3, JSON.stringify(result));
      await ctx.close();
    }

    /* With all sets already logged, the substitute starts with one new set. */
    {
      const {ctx,page} = await fresh();
      for(let i=0; i<3; i++){
        await input(page, '#sf_0_' + i + '_load', String(60+i));
        await input(page, '#sf_0_' + i + '_reps', '8');
        await click(page, '#logbtn_0_' + i); await page.evaluate(() => stopRest());
      }
      await click(page, '.ex-block > summary');
      await click(page, '.ex-block .ex-opts > summary');
      await click(page, '.ex-block [data-act="openSub"][data-a1="0"]');
      check('a completed exercise explains that its substitute gets one new set',
        await page.evaluate(() => document.querySelector('#sheetHost').textContent.includes(t('workout.subAdd'))));
      await click(page, '#sheetHost [data-act="applySub"][data-a2="db-bench"]');
      const result = await page.evaluate(() => ({old:ACTIVE.exercises[0], added:ACTIVE.exercises[1]}));
      check('substituting after completion keeps all three logged sets',
        result.old.sets.every(st=>st.committed) && result.added.id === 'db-bench' && result.added.sets.length === 1);
      await ctx.close();
    }

    /* Optional data must not turn planned bodyweight reps into real work. */
    {
      const {ctx,page} = await fresh();
      await page.evaluate(() => {
        ACTIVE.exercises = [newActiveExercise({id:'pushup',sets:2,reps:[8,20],rir:2})];
        saveDraft(); render();
      });
      await input(page, '#sf_0_0_rir', '2');
      await click(page, '.heavy [data-act="finishSession"]');
      const result = await page.evaluate(() => ({active:!!ACTIVE, entered:ACTIVE?.exercises[0].sets[0].entered,
        count:getState().sessions.length, done:!!document.querySelector('#doneOverlay')}));
      check('optional-only changes do not fabricate a performed set',
        result.active && !result.entered && result.count === 0 && !result.done, JSON.stringify(result));
      await ctx.close();
    }

    /* Finishing cannot silently omit a partial set or an orphaned note. */
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      await input(page, '#sf_0_1_load', '50');
      await input(page, '#sf_0_1_reps', '');
      await click(page, '[data-act="exOpen"][data-a3="1"]');
      await input(page, '#exnote_1', 'Hand position');
      let prompt = '';
      page.once('dialog', async dialog => { prompt = dialog.message(); await dialog.dismiss(); });
      await click(page, '.heavy [data-act="finishSession"]');
      let result = await page.evaluate(() => ({active:!!ACTIVE, count:getState().sessions.length,
        reps:ACTIVE?.exercises[0].sets[1].r, note:ACTIVE?.exercises[1].note,
        draft:!!localStorage.getItem(DRAFT_KEY)}));
      check('canceling the unfinished-work warning preserves the entire draft',
        /not be saved/i.test(prompt) && result.active && result.count === 0 && result.reps === '' &&
        result.note === 'Hand position' && result.draft, JSON.stringify(result));
      await input(page, '#sf_0_1_reps', '8');
      prompt = '';
      page.once('dialog', async dialog => { prompt = dialog.message(); await dialog.dismiss(); });
      await click(page, '.heavy [data-act="finishSession"]');
      check('a note without a saved set still prompts before it could be lost',
        /not be saved/i.test(prompt) && await page.evaluate(() => !!ACTIVE && getState().sessions.length === 0));
      await input(page, '#sf_1_0_reps', '12');
      await click(page, '#logbtn_1_0'); await page.evaluate(() => stopRest());
      await click(page, '.heavy [data-act="finishSession"]');
      result = await page.evaluate(() => ({rec:getState().sessions[0], done:!!document.querySelector('#doneOverlay')}));
      const bench = result.rec.exercises.find(e=>e.id==='bb-bench');
      const pushup = result.rec.exercises.find(e=>e.id==='pushup');
      check('completing the entries saves the partial set and its exercise note',
        result.done && bench.sets.length === 2 && bench.sets[1].w === 50 && bench.sets[1].r === 8 &&
        pushup.note === 'Hand position');
      await ctx.close();
    }
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      await input(page, '#sf_0_1_load', '50');
      await click(page, '.ex-block.is-current .ex-opts > summary');
      await click(page, '.ex-block.is-current [data-act="skipSet"]');
      let prompt = '';
      page.once('dialog', async dialog => { prompt = dialog.message(); await dialog.dismiss(); });
      await click(page, '.heavy [data-act="finishSession"]');
      const kept = await page.evaluate(() => ({active:!!ACTIVE, count:getState().sessions.length,
        skipped:ACTIVE?.exercises[0].sets[1].skipped, w:ACTIVE?.exercises[0].sets[1].w}));
      check('skipped entered work is called out before finishing',
        /not be saved/i.test(prompt) && kept.active && kept.count === 0 && kept.skipped && kept.w === '50', JSON.stringify(kept));
      await ctx.close();
    }
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      await input(page, '#sf_0_1_load', '50');
      await input(page, '#sf_0_1_reps', '');
      let prompt = '';
      page.once('dialog', async dialog => { prompt = dialog.message(); await dialog.accept(); });
      await click(page, '.heavy [data-act="finishSession"]');
      const result = await page.evaluate(() => ({active:!!ACTIVE, count:getState().sessions.length,
        sets:getState().sessions[0]?.exercises[0].sets.length, done:!!document.querySelector('#doneOverlay')}));
      check('finishing without the incomplete set requires explicit confirmation',
        /not be saved/i.test(prompt) && !result.active && result.count === 1 && result.sets === 1 && result.done, JSON.stringify(result));
      await ctx.close();
    }

    /* A logged set needs an explicit confirmation before removal. */
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      await click(page, '.ex-block .setcard .set-opts > summary');
      let prompt = '';
      page.once('dialog', async dialog => { prompt = dialog.message(); await dialog.dismiss(); });
      await click(page, '[data-act="removeSet"][data-a1="0"][data-a2="0"]');
      let kept = await page.evaluate(() => ({n:ACTIVE.exercises[0].sets.length, first:ACTIVE.exercises[0].sets[0]}));
      check('removing a logged set explains deletion and Cancel keeps it',
        /delete/i.test(prompt) && kept.n === 3 && kept.first.committed && kept.first.w === '60');
      page.once('dialog', async dialog => { await dialog.accept(); });
      await click(page, '[data-act="removeSet"][data-a1="0"][data-a2="0"]');
      kept = await page.evaluate(() => ACTIVE.exercises[0].sets.length);
      check('confirming removal performs the requested action', kept === 2);
      await ctx.close();
    }

    /* Two instances of one exercise keep independent disclosure states. */
    {
      const {ctx,page} = await fresh();
      await page.evaluate(() => addExerciseToActive('bb-bench'));
      const summaries = await page.$$('.ex-block > summary');
      await summaries[0].evaluate(el => el.scrollIntoView({block:'center'}));
      await summaries[0].click();
      await summaries[2].evaluate(el => el.scrollIntoView({block:'center'}));
      await summaries[2].click();
      const state = await page.evaluate(() => {
        render();
        return [...document.querySelectorAll('.ex-block')].map(x=>x.open);
      });
      check('duplicate movements remember disclosures independently',
        state.length === 3 && state[0] === false && state[2] === true, JSON.stringify(state));
      await ctx.close();
    }

    /* A failed completed-log write must not destroy the draft or claim success. */
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      await page.evaluate(() => {
        window.__write = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k,v){ if(k === 'ancestor.state.v1') throw new Error('quota'); return window.__write.call(this,k,v); };
      });
      await click(page, '.heavy [data-act="finishSession"]');
      let result = await page.evaluate(() => ({active:!!ACTIVE, draft:!!localStorage.getItem(DRAFT_KEY),
        memory:getState().sessions.length, disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.length,
        done:!!document.querySelector('#doneOverlay'), warning:!!document.querySelector('.workout-save-warning'),
        copy:document.querySelector('#storeFlag .sf-b').textContent}));
      check('refused finish keeps the draft and shows an honest retry',
        result.active && result.draft && result.memory === 0 && result.disk === 0 && !result.done && result.warning &&
        /not the active workout/i.test(result.copy), JSON.stringify(result));
      await page.evaluate(() => { Storage.prototype.setItem = window.__write; retryStore(); });
      result = await page.evaluate(() => ({memory:getState().sessions.length,
        disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.length,
        warning:!!document.querySelector('.workout-save-warning')}));
      check('background recovery cannot silently create a completed session',
        result.memory === 0 && result.disk === 0 && result.warning, JSON.stringify(result));
      await click(page, '.workout-save-warning [data-act="finishSession"]');
      result = await page.evaluate(() => ({active:!!ACTIVE, draft:localStorage.getItem(DRAFT_KEY),
        count:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.length, done:!!document.querySelector('#doneOverlay')}));
      check('retry saves exactly once, then clears the draft',
        !result.active && result.draft === null && result.count === 1 && result.done, JSON.stringify(result));
      await page.evaluate(() => finishSession());
      check('repeated finish after recovery cannot duplicate the record',
        await page.evaluate(() => getState().sessions.length === 1));
      await ctx.close();
    }

    /* Reloading after a refused finish restores the last successfully saved draft. */
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      const start = await page.evaluate(() => {
        window.__write = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k,v){ if(k === 'ancestor.state.v1') throw new Error('quota'); return window.__write.call(this,k,v); };
        return ACTIVE.startedAt;
      });
      await click(page, '.heavy [data-act="finishSession"]');
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(() => !document.getElementById('appBoot'));
      const restored = await page.evaluate(() => ({start:ACTIVE?.startedAt,
        val:ACTIVE?.exercises[0].sets[0].w, committed:ACTIVE?.exercises[0].sets[0].committed,
        sessions:getState().sessions.length}));
      check('reload after a failed finish restores the logged draft, not a phantom session',
        restored.start === start && restored.val === '60' && restored.committed && restored.sessions === 0, JSON.stringify(restored));
      await click(page, '.heavy [data-act="finishSession"]');
      check('the restored workout can then be saved once',
        await page.evaluate(() => getState().sessions.length === 1 && !ACTIVE && !!document.querySelector('#doneOverlay')));
      await ctx.close();
    }

    /* A refused draft write is separate from a successful state write. */
    {
      const {ctx,page} = await fresh();
      await page.evaluate(() => {
        window.__write = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k,v){ if(k === 'ancestor.draft.v1') throw new Error('quota'); return window.__write.call(this,k,v); };
      });
      await input(page, '#sf_0_0_load', '90');
      let result = await page.evaluate(() => ({focus:document.activeElement.id, failed:DRAFT_STORAGE_FAILED,
        visible:!document.querySelector('#storeFlag').hidden,
        title:document.querySelector('#storeFlag .sf-t').textContent,
        old:JSON.parse(localStorage.getItem(DRAFT_KEY)).exercises[0].sets[0].w}));
      check('a failed draft write warns immediately without stealing focus',
        result.focus === 'sf_0_0_load' && result.failed && result.visible && result.title === 'Workout draft not saved' && result.old !== '90', JSON.stringify(result));
      await page.evaluate(() => saveState());
      check('a successful unrelated state save does not clear the draft warning',
        await page.evaluate(() => DRAFT_STORAGE_FAILED && !document.querySelector('#storeFlag').hidden));
      await page.evaluate(() => { Storage.prototype.setItem = window.__write; document.activeElement.blur(); });
      await click(page, '#storeFlag [data-act="storeRecovery"]');
      result = await page.evaluate(() => ({failed:DRAFT_STORAGE_FAILED, hidden:document.querySelector('#storeFlag').hidden,
        saved:JSON.parse(localStorage.getItem(DRAFT_KEY)).exercises[0].sets[0].w}));
      check('the warning action retries the latest draft rather than exporting the wrong data',
        !result.failed && result.hidden && result.saved === '90', JSON.stringify(result));
      await ctx.close();
    }

    /* If clearing the draft fails after a successful finish, boot reconciles it. */
    {
      const {ctx,page} = await fresh(); await logFirst(page);
      await page.evaluate(() => {
        window.__remove = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function(k){ if(k === 'ancestor.draft.v1') throw new Error('refused'); return window.__remove.call(this,k); };
      });
      await click(page, '.heavy [data-act="finishSession"]');
      check('the completed record survives even if draft removal fails',
        await page.evaluate(() => !!localStorage.getItem(DRAFT_KEY) && JSON.parse(localStorage.getItem(STORE_KEY)).sessions.length === 1));
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(() => !document.getElementById('appBoot'));
      const result = await page.evaluate(() => ({active:!!ACTIVE, draft:localStorage.getItem(DRAFT_KEY), count:getState().sessions.length}));
      check('reload reconciles the stale draft instead of reopening a saved workout',
        !result.active && result.draft === null && result.count === 1, JSON.stringify(result));
      await ctx.close();
    }

    /* Failure to remove a draft cannot masquerade as a discard. */
    {
      const {ctx,page} = await fresh();
      await page.evaluate(() => {
        window.__remove = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function(k){ if(k === 'ancestor.draft.v1') throw new Error('refused'); return window.__remove.call(this,k); };
      });
      let prompt = '';
      page.once('dialog', async dialog => { prompt=dialog.message(); await dialog.accept(); });
      await click(page, '[data-act="discardSession"]');
      let result = await page.evaluate(() => ({active:!!ACTIVE, draft:!!localStorage.getItem(DRAFT_KEY), toast:document.querySelector('#toast').textContent}));
      check('discard explains its consequence and stays open if the draft cannot be removed',
        /delete/i.test(prompt) && result.active && result.draft && /could not be removed/i.test(result.toast), JSON.stringify(result));
      await page.evaluate(() => { Storage.prototype.removeItem = window.__remove; });
      page.once('dialog', async dialog => { await dialog.accept(); });
      await click(page, '[data-act="discardSession"]');
      result = await page.evaluate(() => ({active:!!ACTIVE, draft:localStorage.getItem(DRAFT_KEY)}));
      check('discard succeeds once its draft can actually be removed', !result.active && result.draft === null);
      await ctx.close();
    }

    /* The header recovery button performs one action for an unreadable log. */
    {
      const ctx = await browser.createBrowserContext(), page = await ctx.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await page.goto(url, {waitUntil:'load'});
      await page.evaluate(() => localStorage.setItem('ancestor.state.v1', '{"version":3,"sessions":['));
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(() => !document.getElementById('appBoot'));
      await page.evaluate(() => {
        window.__downloads = 0;
        URL.createObjectURL = () => { window.__downloads++; return 'blob:recovery-test'; };
        HTMLAnchorElement.prototype.click = function(){};
      });
      await click(page, '#storeFlag [data-act="storeRecovery"]');
      const result = await page.evaluate(() => ({downloads:window.__downloads, exportAt:getState().lastExportAt,
        archived:Object.keys(localStorage).some(k=>k.includes('.damaged.')), failed:LOAD_FAILED}));
      check('damaged-record recovery archives once without also exporting an empty log',
        result.downloads === 1 && result.exportAt === null && result.archived && !result.failed, JSON.stringify(result));
      await ctx.close();
    }

    /* Narrow screens, all seven languages, both themes, and reduced motion. */
    {
      const {ctx,page} = await fresh();
      await page.setViewport({width:320,height:844,deviceScaleFactor:1});
      await page.evaluate(() => setSessionSub('plan-peek'));
      for(const lang of ['en','fr','es','de','it','nl','ar']){
        await page.evaluate(l => switchLang(l), lang);
        const fit = await page.evaluate(() => {
          const tabs = [...document.querySelectorAll('[data-subnav="session"] [role="tab"]')];
          return {doc:document.documentElement.scrollWidth, width:innerWidth,
            tabs:tabs.map(x=>({w:x.getBoundingClientRect().width, scroll:x.scrollWidth, client:x.clientWidth})),
            selected:document.querySelector('[data-a1="plan-peek"]')?.getAttribute('aria-selected'),
            notice:document.querySelector('#screenBody').textContent.includes(t('workout.activePlan'))};
        });
        check('plan preview fits and announces its selection at 320px: ' + lang,
          fit.doc <= fit.width && fit.tabs.length === 2 && fit.tabs.every(x=>x.w >= 44 && x.scroll <= x.client+1) &&
          fit.selected === 'true' && fit.notice, JSON.stringify(fit));
      }
      await page.evaluate(() => { switchLang('en'); setDisplay('theme','paper'); });
      await new Promise(r => setTimeout(r, 150));
      const paper = await page.evaluate(() => ({theme:document.documentElement.dataset.theme,
        width:document.documentElement.scrollWidth, viewport:innerWidth,
        visible:getComputedStyle(document.querySelector('#screenBody')).opacity}));
      check('paper theme and reduced motion keep the preview usable',
        paper.theme === 'paper' && paper.width <= paper.viewport && +paper.visible === 1, JSON.stringify(paper));
      if(process.env.SAFETY_SHOTS){
        fs.mkdirSync(process.env.SAFETY_SHOTS,{recursive:true});
        await page.screenshot({path:path.join(process.env.SAFETY_SHOTS,'plan-paper-320.png')});
      }
      await page.evaluate(() => openTrain());
      /* A theme switch replaces the screen. Chromium can take multiple frames
         to propagate inherited colours to the newly inserted title, especially
         while other browser audits are running. Fail if the accessible ink
         never appears, rather than guessing how long a repaint will take. */
      await page.waitForFunction(() => {
        const el = document.querySelector('.ex-block.is-current .sess-ex-h');
        return el && getComputedStyle(el).color === 'rgb(32, 33, 31)';
      }, {timeout:3000});
      const paperInk = await page.evaluate(() => getComputedStyle(document.querySelector('.ex-block.is-current .sess-ex-h')).color);
      await page.evaluate(() => setDisplay('theme','dark'));
      await page.waitForFunction(() => {
        const el = document.querySelector('.ex-block.is-current .sess-ex-h');
        return el && getComputedStyle(el).color === 'rgb(247, 245, 240)';
      }, {timeout:3000});
      const darkInk = await page.evaluate(() => getComputedStyle(document.querySelector('.ex-block.is-current .sess-ex-h')).color);
      check('the active exercise title is legible in both themes',
        paperInk === 'rgb(32, 33, 31)' && darkInk === 'rgb(247, 245, 240)', paperInk + ' / ' + darkInk);
      if(process.env.SAFETY_SHOTS){
        await page.screenshot({path:path.join(process.env.SAFETY_SHOTS,'live-dark-320.png')});
      }
      await page.evaluate(() => {
        window.__write = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k,v){ if(k === 'ancestor.draft.v1') throw new Error('quota'); return window.__write.call(this,k,v); };
        saveDraft();
      });
      for(const lang of ['en','fr','es','de','it','nl','ar']){
        await page.evaluate(l => switchLang(l), lang);
        const warning = await page.evaluate(() => {
          const flag = document.getElementById('storeFlag');
          return {width:document.documentElement.scrollWidth, viewport:innerWidth, visible:!flag.hidden,
            title:flag.querySelector('.sf-t').textContent, expected:t('workout.draftTitle'),
            clipped:[...flag.querySelectorAll('.sf-t,.sf-b,.sf-x')].some(el=>el.scrollWidth > el.clientWidth+1)};
        });
        check('draft warning is localised and fits at 320px: ' + lang,
          warning.visible && warning.title === warning.expected && warning.width <= warning.viewport && !warning.clipped, JSON.stringify(warning));
      }
      if(process.env.SAFETY_SHOTS){
        await page.evaluate(() => setDisplay('theme','paper'));
        await new Promise(r => setTimeout(r, 150));
        await page.screenshot({path:path.join(process.env.SAFETY_SHOTS,'draft-warning-paper-ar-320.png')});
      }
      await ctx.close();
    }
    check('no uncaught browser errors in the safety journeys', errors.length === 0, errors.join('; '));
  } finally { await browser.close(); }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if(failed) process.exitCode = 1;
})().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
