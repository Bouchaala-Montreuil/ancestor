/* Real Chromium regression journeys for saved exercise choices and warnings.
   Also runs against ANCESTOR_TEST_TARGET (HTTP or standalone build). */
const path = require('path');
const {pathToFileURL} = require('url');
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
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await el.click();
}
async function dialogClick(page, selector, accept){
  const result = new Promise((resolve, reject) => page.once('dialog', async dialog => {
    try { const text = dialog.message(); await (accept ? dialog.accept() : dialog.dismiss()); resolve(text); }
    catch(e){ reject(e); }
  }));
  await click(page, selector);
  return result;
}
async function input(page, selector, value){
  await page.waitForSelector(selector, {visible:true});
  await page.$eval(selector, (el,v) => { el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); }, value);
}
(async function(){
  const browser = await puppeteer.launch({headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  async function fresh(){
    const ctx = await browser.createBrowserContext(), page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({width:390,height:844,deviceScaleFactor:1});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(() => !document.getElementById('appBoot'));
    await page.evaluate(() => {
      chooseLang('en'); finishOnboarding();
      const s=getState();
      Object.assign(s.profile,{equipment:'gym',environment:'gym',needs:{},limits:[],positions:[],exercises:{}});
      s.sessions=[]; s.feelings=[];
      s.plan={mode:'std',split:2,restSec:120,builtAt:Date.now(),sessions:[
        {id:'A',name:'Upper',focus:['chest'],exercises:[{id:'bb-bench',sets:3,reps:[6,10],rir:2}]},
        {id:'B',name:'Lower',focus:['quads'],exercises:[{id:'bb-squat',sets:2,reps:[5,8],rir:2}]}
      ]};
      saveState(); PLAN_DAY='A'; go('session');
    });
    await page.waitForSelector('[data-act="startSession"][data-a1="A"]');
    return {ctx,page};
  }
  try {
    // Change an existing preference through the visible Me flow, then confirm
    // that the old plan is not rewritten or started without a decision.
    {
      const {ctx,page}=await fresh();
      const before=await page.evaluate(()=>JSON.stringify(getState().plan));
      await click(page,'#nav [data-nav="profile"]');
      await click(page,'[data-remember="profile-programme"] > summary');
      await click(page,'[data-act="setLimit"][data-a1="shoulder"]');
      let state=await page.evaluate(()=>({plan:JSON.stringify(getState().plan),warning:document.querySelector('[data-exercise-conflicts]')?.textContent,
        has:getState().profile.limits.includes('shoulder')}));
      check('a limitation change preserves the plan and shows a warning on Me',
        state.plan===before && state.has && /bench/i.test(state.warning||''),JSON.stringify(state));
      await click(page,'#nav [data-nav="session"]');
      state=await page.evaluate(()=>({warning:document.querySelector('[data-exercise-conflicts]')?.textContent,
        day:PLAN_DAY}));
      check('the selected plan warns before its start button', /bench/i.test(state.warning||'') && state.day==='A',JSON.stringify(state));
      const text=await dialogClick(page,'[data-act="startSession"][data-a1="A"]',false);
      check('cancelling the conflict confirmation leaves no active workout or draft',
        /bench/i.test(text) && await page.evaluate(()=>!ACTIVE && !localStorage.getItem(DRAFT_KEY)),text);
      await click(page,'[data-act="togglePlanEdit"]');
      await click(page,'[data-act="openPlanSub"][data-a1="A"][data-a2="0"]');
      state=await page.evaluate(()=>({options:[...document.querySelectorAll('#sheetHost [data-act="applyPlanSub"]')].map(el=>el.dataset.a3),
        allowed:allowedExercises(getState().profile).map(e=>e.id),empty:document.querySelector('#sheetHost').textContent.includes(t('session.nosub'))}));
      check('the visible plan substitute picker respects the saved limitation',
        state.options.every(id=>state.allowed.includes(id)) && (state.options.length>0 || state.empty),JSON.stringify(state));
      await ctx.close();
    }

    // Browse an excluded movement deliberately: a declined override is inert,
    // an accepted override is persistent and remains visibly flagged.
    {
      const {ctx,page}=await fresh();
      await click(page,'#nav [data-nav="profile"]');
      await click(page,'[data-remember="profile-body"] > summary');
      await click(page,'[data-act="toggleNeedP"][data-a1="noFloor"]');
      await click(page,'[data-act="toggleNeedP"][data-a1="noOverhead"]');
      await click(page,'#nav [data-nav="library"]');
      await input(page,'#libSearchInput','Pike');
      await click(page,'[data-act="openExerciseDetail"][data-a1="pike-pushup"]');
      let state=await page.evaluate(()=>({warning:document.querySelector('#sheetHost [data-filter-warning]')?.textContent,
        name:t('ex.pike-pushup'),reason:t('a11y.needFloor'),overhead:t('a11y.needOverhead'),n:getState().plan.sessions[0].exercises.length}));
      check('detail explicitly explains both floor and overhead mismatches before adding',
        (state.warning||'').includes(state.reason) && (state.warning||'').includes(state.overhead),JSON.stringify(state));
      const dismissed=await dialogClick(page,'#sheetHost [data-act="addExerciseToPlan"]',false);
      check('declining an incompatible detail addition changes nothing',
        dismissed.includes(state.name) && dismissed.includes(state.reason) && dismissed.includes(state.overhead) &&
        await page.evaluate(n=>getState().plan.sessions[0].exercises.length===n,state.n),dismissed);
      const accepted=await dialogClick(page,'#sheetHost [data-act="addExerciseToPlan"]',true);
      check('accepting the explicit override adds it and shows the plan warning',
        accepted.includes(state.name) && await page.evaluate(()=>getState().plan.sessions[0].exercises.some(e=>e.id==='pike-pushup') &&
          document.querySelector('[data-exercise-conflicts]')?.textContent.includes(t('ex.pike-pushup'))));
      const start=await dialogClick(page,'[data-act="startSession"][data-a1="A"]',true);
      check('starting an overridden plan requires a second, named acknowledgement',
        start.includes(state.name) && await page.evaluate(()=>!!ACTIVE && document.querySelector('[data-exercise-conflicts]')?.textContent.includes(t('ex.pike-pushup'))));
      await input(page,'#sf_0_0_load','60');
      await input(page,'#sf_0_0_reps','8');
      await click(page,'#logbtn_0_0');
      await page.evaluate(()=>stopRest());
      const draft=await page.evaluate(()=>({start:ACTIVE.startedAt,weight:ACTIVE.exercises[0].sets[0].w,committed:ACTIVE.exercises[0].sets[0].committed}));
      await click(page,'#nav [data-nav="profile"]');
      await click(page,'[data-remember="profile-programme"] > summary');
      await click(page,'[data-act="setLimit"][data-a1="shoulder"]');
      check('changing a second preference leaves entered and logged work intact',
        await page.evaluate(x=>ACTIVE.startedAt===x.start && ACTIVE.exercises[0].sets[0].w===x.weight && ACTIVE.exercises[0].sets[0].committed===x.committed,draft));
      await click(page,'#nav [data-nav="session"]');
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(()=>!document.getElementById('appBoot'));
      state=await page.evaluate(()=>({start:ACTIVE?.startedAt,weight:ACTIVE?.exercises[0].sets[0].w,
        committed:ACTIVE?.exercises[0].sets[0].committed,notice:document.querySelector('[data-exercise-conflicts]')?.textContent}));
      check('draft and preference warning survive a real reload',
        state.start===draft.start && state.weight==='60' && state.committed && /bench/i.test(state.notice||''),JSON.stringify(state));

      // The warning stays visible and does not overflow a narrow screen, in
      // all languages and both themes. The guide has actual translated copy.
      await page.setViewport({width:320,height:760,deviceScaleFactor:1});
      for(const theme of ['dark','paper']){
        await page.evaluate(t=>setDisplay('theme',t),theme);
        for(const lang of ['en','fr','es','de','it','nl','ar']){
          state=await page.evaluate(l=>{switchLang(l); return {overflow:document.documentElement.scrollWidth-innerWidth,
            text:document.querySelector('[data-exercise-conflicts]')?.textContent, expected:t('workout.activeConflictTitle')};},lang);
          check(theme+' '+lang+': live preference warning is translated and fits at 320px',
            state.overflow<=0 && (state.text||'').includes(state.expected),JSON.stringify(state));
          state=await page.evaluate(()=>{openExerciseDetail('face-pull');
            const note=document.querySelector('[data-seated-option]');
            return {note:note?.textContent,expected:t('movement.seatedNote'),overflow:document.documentElement.scrollWidth-innerWidth};});
          check(theme+' '+lang+': the standing illustration labels its seated option at 320px',
            !!state.note && state.note===state.expected && state.overflow<=0,JSON.stringify(state));
          await page.evaluate(()=>closeSheet());
        }
      }
      await page.evaluate(()=>{switchLang('en');openExerciseDetail('bb-bench');});
      state=await page.evaluate(()=>({bar:document.querySelector('[data-barbell-safety]')?.textContent,
        flag:!!document.querySelector('[data-filter-warning]'),overflow:document.documentElement.scrollWidth-innerWidth}));
      check('barbell detail contains the failure-plan note and mismatch warning at 320px',
        /safety supports/i.test(state.bar||'') && state.flag && state.overflow<=0,JSON.stringify(state));
      await ctx.close();
    }

    // The live picker can remain open while preferences change (for example,
    // in another tab). Revalidate its click without losing partially entered work.
    {
      const {ctx,page}=await fresh();
      await click(page,'[data-act="startSession"][data-a1="A"]');
      await input(page,'#sf_0_0_load','60');
      await click(page,'.ex-block.is-current .ex-opts > summary');
      await click(page,'.ex-block.is-current [data-act="openSub"]');
      let state=await page.evaluate(()=>({ids:[...document.querySelectorAll('#sheetHost [data-act="applySub"]')].map(x=>x.dataset.a2),
        allowed:allowedExercises(getState().profile).map(e=>e.id),before:JSON.stringify(ACTIVE)}));
      check('live substitute options use the same eligible pool',
        state.ids.includes('db-bench') && state.ids.every(id=>state.allowed.includes(id)),JSON.stringify(state.ids));
      await page.evaluate(()=>{getState().profile.exercises['db-bench']=false;saveState();});
      await click(page,'#sheetHost [data-act="applySub"][data-a2="db-bench"]');
      check('a stale live substitute is refused without changing the entered workout',
        await page.evaluate(before=>JSON.stringify(ACTIVE)===before && document.querySelector('#toast').textContent===t('workout.filteredOption'),state.before));
      await click(page,'#nav [data-nav="library"]');
      await input(page,'#libSearchInput','Dumbbell Bench Press');
      await click(page,'[data-act="openExerciseDetail"][data-a1="db-bench"]');
      const prompt=await dialogClick(page,'#sheetHost [data-act="addExerciseToActive"]',false);
      check('live detail addition asks before overriding an individual exclusion',
        /dumbbell bench/i.test(prompt) && await page.evaluate(before=>JSON.stringify(ACTIVE)===before,state.before),prompt);
      await dialogClick(page,'#sheetHost [data-act="addExerciseToActive"]',true);
      check('a confirmed live override preserves partial work and adds a flagged exercise',
        await page.evaluate(()=>ACTIVE.exercises[0].sets[0].w==='60' && ACTIVE.exercises[1].id==='db-bench' &&
          document.querySelector('[data-exercise-conflicts]')?.textContent.includes(t('ex.db-bench'))));
      await ctx.close();
    }

    // A truly empty pool should never seed or display an excluded exercise; the
    // person can visit Me, restore the pool deliberately and continue the draft.
    {
      const {ctx,page}=await fresh();
      await page.evaluate(()=>{getState().profile.exercises=Object.fromEntries(EX.map(e=>[e.id,false]));saveState();render();});
      await click(page,'[data-remember="plan-options"] > summary');
      await click(page,'[data-act="startCustomSession"]');
      let state=await page.evaluate(()=>({ids:ACTIVE.exercises.map(e=>e.id),text:document.querySelector('#screenBody').textContent}));
      check('an empty custom workout starts without an excluded seed and explains the empty pool',
        state.ids.length===0 && state.text.includes(await page.evaluate(()=>t('a11y.poolEmpty'))));
      await click(page,'.live-hud [data-act="openAddExerciseSheet"]');
      state=await page.evaluate(()=>({n:document.querySelectorAll('#sheetHost [data-act="addExerciseToActive"]').length,
        empty:document.querySelector('#sheetHost').textContent.includes(t('a11y.poolEmpty')),
        recovery:!!document.querySelector('#sheetHost [data-act="openExerciseSettings"]')}));
      check('empty add-picker explains the filters and offers settings, not all 88 exercises',
        state.n===0 && state.empty && state.recovery,JSON.stringify(state));
      await click(page,'#sheetHost [data-act="openExerciseSettings"]');
      await click(page,'[data-remember="profile-programme"] > summary');
      await click(page,'[data-act="restoreExPool"]');
      await click(page,'#nav [data-nav="session"]');
      await click(page,'.live-hud [data-act="openAddExerciseSheet"]');
      await click(page,'#sheetHost [data-act="addExerciseToActive"][data-a1="bb-bench"]');
      check('explicitly restoring choices allows adding an exercise to the same draft',
        await page.evaluate(()=>ACTIVE?.exercises.length===1 && ACTIVE.exercises[0].id==='bb-bench'));
      await ctx.close();
    }

    // Both alternative entry points must surface the already-computed stop
    // recommendation, without locking a user out of an existing draft.
    {
      const {ctx,page}=await fresh();
      await page.evaluate(()=>{addFeeling({date:Date.now(),illness:1,joint:0,soreness:0,fatigue:0});render();});
      let state=await page.evaluate(()=>({banner:document.querySelector('#screenBody').textContent, title:t('workout.stopTitle')}));
      check('plan shows the existing stop recommendation',state.banner.includes(state.title));
      let warning=await dialogClick(page,'[data-act="startSession"][data-a1="A"]',false);
      check('the plan start stop warning can be declined without creating a draft',
        warning.includes(state.title) && await page.evaluate(()=>!ACTIVE && !localStorage.getItem(DRAFT_KEY)));
      await click(page,'[data-remember="plan-options"] > summary');
      warning=await dialogClick(page,'[data-act="startCustomSession"]',false);
      check('custom start cannot bypass the same recommendation',warning.includes(state.title) && await page.evaluate(()=>!ACTIVE));
      warning=await dialogClick(page,'[data-act="startSession"][data-a1="A"]',true);
      check('an acknowledged start keeps recording available and shows the warning',
        warning.includes(state.title) && await page.evaluate(()=>!!ACTIVE && document.querySelector('#screenBody').textContent.includes(t('workout.stopTitle'))));
      await ctx.close();
    }
    // Persistence and filtering must also work in an offline copy. For HTTP,
    // wait for the exact deployed worker and the changed modules before reload.
    {
      const {ctx,page}=await fresh();
      await page.evaluate(()=>{
        getState().profile.needs={noFloor:true}; saveState();
        startSession('A'); setVal(0,0,'w','60');
      });
      if(/^https?:/.test(url)){
        await page.waitForFunction(async()=>{
          if(!('serviceWorker' in navigator)) return false;
          await navigator.serviceWorker.ready;
          const names=await caches.keys(), name='ancestor-'+APP_BUILD;
          if(!names.includes(name)) return false;
          const cache=await caches.open(name);
          return !!(await cache.match('./js/ui/workout.js')) && !!(await cache.match('./js/engine/program.js')) &&
            !!(await cache.match('./js/data/ex_meta.js')) && !!(await cache.match('./js/i18n/modes.js'));
        },{timeout:30000});
      }
      await page.setOfflineMode(true);
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(()=>!document.getElementById('appBoot'));
      let state=await page.evaluate(()=>({weight:ACTIVE?.exercises[0].sets[0].w,need:getState().profile.needs.noFloor}));
      check('saved choices and the entered draft survive an offline reload',state.weight==='60' && state.need,JSON.stringify(state));
      await page.evaluate(()=>openExerciseDetail('pike-pushup'));
      state=await page.evaluate(()=>({text:document.querySelector('#sheetHost [data-filter-warning]')?.textContent,
        reason:t('a11y.needFloor')}));
      check('the offline exercise detail still explains the preference mismatch',(state.text||'').includes(state.reason),JSON.stringify(state));
      await page.evaluate(()=>{closeSheet();openAddExerciseSheet('active');});
      state=await page.evaluate(()=>({ids:[...document.querySelectorAll('#sheetHost [data-act="addExerciseToActive"]')].map(el=>el.dataset.a1),
        allowed:allowedExercises(getState().profile).map(e=>e.id)}));
      check('the offline live picker remains filtered',state.ids.length>0 && state.ids.every(id=>state.allowed.includes(id)) && !state.ids.includes('pike-pushup'));
      await page.setOfflineMode(false); await ctx.close();
    }
    check('no uncaught browser errors during the exercise-choice journeys',errors.length===0,errors.join('; '));
  } finally { await browser.close(); }
  console.log('\n'+passed+' passed, '+failed+' failed');
  if(failed) process.exitCode=1;
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
