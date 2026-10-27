/* ============================================================================
   ANCESTOR — real headless browser & WebGL 2.0 verification suite
   Run:  node tests/browser.js

   Executes what jsdom cannot:
     1. Real WebGL 2.0 rendering of the 218-muscle glTF atlas (pixel checks,
        front vs back camera, burnt-orange highlight, canvas pointer picking,
        unmapped structure handling, layer/region filters, isolate, disposal)
     2. Real layout & horizontal-overflow audit at 320 / 360 / 768 / 1280 px
        across every primary screen and interactive module, in LTR and RTL
     3. Real Service Worker registration, cache population & full offline reload
     4. Real offline execution of dist/ancestor.html (gzip-b64 decompression
        via DecompressionStream + WebGL rendering with network severed)
     5. Zero uncaught page errors and zero console errors
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const SHOT_DIR = process.env.ANC_SHOTS || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

let pass = 0, fail = 0;
const failures = [];
function chk(name, cond, extra){
  if(cond){
    pass++;
    console.log('  \x1b[32mPASS\x1b[0m  ' + name + (extra ? '  \x1b[2m' + extra + '\x1b[0m' : ''));
  } else {
    fail++;
    failures.push(name + (extra ? ' (' + extra + ')' : ''));
    console.log('  \x1b[31mFAIL\x1b[0m  ' + name + (extra ? '  -> ' + extra : ''));
  }
}
function group(t){ console.log('\n\x1b[1m' + t + '\x1b[0m'); }

function startServer(){
  const srv = http.createServer((req, res) => {
    const clean = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
    const fp = path.resolve(ROOT, rel);
    if(!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()){
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(fp).pipe(res);
  });
  return new Promise(resolve => srv.listen(0, '127.0.0.1', () => resolve(srv)));
}

(async function(){
  if(SHOT_DIR) fs.mkdirSync(SHOT_DIR, { recursive: true });
  const srv = await startServer();
  const baseUrl = 'http://127.0.0.1:' + srv.address().port;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + (e && e.message || e)));
    page.on('console', m => {
      if(m.type() === 'error') errors.push('console.error: ' + m.text());
    });

    await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
    await page.goto(baseUrl + '/', { waitUntil: 'networkidle0' });

    /* ================================================================== */
    group('1. Onboarding, live workout logging & completion in real Chromium');
    await page.evaluate(() => {
      setConsent();
      setP('name', 'Alex');
      setP('experience', 'i');
      setP('goal', 'h');
      onbNext();
      setP('equipment', 'gym');
      onbNext();
      setP('daysPerWeek', 3);
      onbNext();
      setP('shiftType', 'none');
      onbNext();
      onbNext();
      setP('style', 'std');
      onbNext();
      onbNext();
      finishOnboarding();
    });

    const onboarded = await page.evaluate(() => getState().onboarded && ANC.view === 'home');
    chk('onboarding completes cleanly in Chromium', onboarded);

    /* Seed one previous session + log a live session */
    await page.evaluate(() => {
      const now = Date.now();
      const S = o => Object.assign({ w:null, r:null, t:null, d:null, a:null, rir:null }, o);
      addSession({
        date: now - 5*86400000, startedAt: now - 5*86400000, planId: 'A', name: 'Push',
        exercises: [{ id:'bb-bench', sets:[S({w:57.5, r:8, rir:2}), S({w:57.5, r:8, rir:2})] }]
      });
      addSession({
        date: now - 3*86400000, startedAt: now - 3*86400000, planId: 'B', name: 'Pull',
        exercises: [{ id:'bb-row', sets:[S({w:55, r:9, rir:2}), S({w:55, r:8, rir:2})] }]
      });
      getState().plan = {
        mode:'std', split:3, restSec:120, builtAt:now,
        sessions:[
          { id:'A', name:'Push', focus:['chest','shoulders','triceps'],
            exercises:[
              { id:'bb-bench', sets:2, reps:[6,10], rir:2 },
              { id:'plank',    sets:2, reps:[20,60], rir:2 }
            ] },
          { id:'B', name:'Pull', focus:['back','biceps'],
            exercises:[{ id:'bb-row', sets:2, reps:[6,10], rir:2 }] },
          { id:'C', name:'Legs', focus:['quads','hamstrings'],
            exercises:[{ id:'bb-squat', sets:2, reps:[5,8], rir:2 }] }
        ]
      };
      go('home');
    });
    if(SHOT_DIR){ await new Promise(r => setTimeout(r, 350)); await page.screenshot({ path: path.join(SHOT_DIR, '01_dashboard_desktop.png'), fullPage: false }); }

    await page.evaluate(() => { go('session'); startSession(); });
    if(SHOT_DIR){ await new Promise(r => setTimeout(r, 350)); await page.screenshot({ path: path.join(SHOT_DIR, '02_session_live.png'), fullPage: false }); }

    const completed = await page.evaluate(() => {
      setVal(0, 0, 'w', '60'); setVal(0, 0, 'r', '9'); toggleSet(0, 0); stopRest();
      setVal(0, 1, 'w', '60'); setVal(0, 1, 'r', '8'); toggleSet(0, 1); stopRest();
      setVal(1, 0, 't', '45'); toggleSet(1, 0); stopRest();
      finishSession();
      const ov = document.getElementById('doneOverlay');
      const ok = !!ov && /60|Push|Session complete/i.test(ov.textContent);
      closeCompletion('progress');
      return { overlayShown: ok, sessions: getState().sessions.length, view: ANC.view };
    });
    chk('live session logs barbell + timed sets and shows completion sequence',
        completed.overlayShown && completed.sessions === 3 && completed.view === 'progress',
        JSON.stringify(completed));
    if(SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, '03_progress_charts.png'), fullPage: false });

    /* ================================================================== */
    group('2. Real WebGL 2.0 3D Anatomy Lab — asset load, pixels, picking & disposal');
    await page.evaluate(() => { clearMuscle(); go('body'); });
    await page.waitForFunction(() => typeof labIsLoaded === 'function' && labIsLoaded() === true, { timeout: 15000 });

    const labInit = await page.evaluate(() => {
      const loading = document.getElementById('labLoading');
      const canvas = document.querySelector('#labHost canvas');
      return {
        mode: ANC.bodyMode,
        mounted: labIsMounted(),
        loaded: labIsLoaded(),
        muscles: labMuscleCount(),
        groups: labGroups().sort(),
        loadingHidden: loading ? loading.hidden : false,
        canvasPresent: !!canvas,
        canvasW: canvas ? canvas.clientWidth : 0,
        canvasH: canvas ? canvas.clientHeight : 0,
        figControlsHidden: document.querySelector('.fig-controls').hidden
      };
    });
    chk('WebGL 3D mode stays active (did not fall back to 2D)', labInit.mode === 'model', labInit.mode);
    chk('all 218 muscle meshes loaded into WebGL scene', labInit.muscles === 218, String(labInit.muscles));
    chk('all 12 ANCESTOR muscle groups present in live scene', labInit.groups.length === 12, labInit.groups.join(','));
    chk('loading skeleton hides once scene is ready', labInit.loadingHidden === true);
    chk('2D controls are hidden while 3D controls are active', labInit.figControlsHidden === true);
    chk('responsive WebGL canvas has real dimensions', labInit.canvasW >= 300 && labInit.canvasH >= 300,
        labInit.canvasW + 'x' + labInit.canvasH);

    const frontPx = await page.evaluate(() => labSamplePixels());
    chk('WebGL framebuffer draws real non-empty anatomy pixels',
        frontPx && frontPx.nonEmpty > 400, JSON.stringify(frontPx));
    if(SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, '04_anatomy_3d_front.png'), fullPage: false });

    /* Switch to back view and verify canvas survives render() AND pixels change */
    const backPx = await page.evaluate(() => {
      setSide('back');
      return {
        canvasStillInDom: !!document.querySelector('#labHost canvas'),
        px: labSamplePixels()
      };
    });
    chk('WebGL canvas stays attached across render() when switching Front -> Back',
        backPx.canvasStillInDom === true);
    chk('Back view renders genuinely different pixels from Front view',
        backPx.px && backPx.px.nonEmpty > 400 && backPx.px.hash !== frontPx.hash,
        frontPx.hash + ' -> ' + (backPx.px && backPx.px.hash));

    /* Select chest and verify burnt-orange highlight pixels increase */
    const chestPx = await page.evaluate(() => {
      setSide('front');
      selectMuscle('chest');
      return {
        canvasStillInDom: !!document.querySelector('#labHost canvas'),
        heading: (document.querySelector('#bodyDetail .panel .sub') || {}).textContent,
        px: labSamplePixels()
      };
    });
    chk('selecting Chest keeps WebGL canvas mounted and opens Chest record',
        chestPx.canvasStillInDom && chestPx.heading === 'Chest', chestPx.heading);
    chk('selecting Chest renders burnt-orange highlight pixels on the 3D mesh',
        chestPx.px.orange > frontPx.orange + 15,
        'orange pixels ' + frontPx.orange + ' -> ' + chestPx.px.orange);
    if(SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, '05_anatomy_3d_selected.png'), fullPage: false });

    /* Real hardware pointer click on the 3D canvas picks an individual anatomical structure */
    const clickTarget = await page.evaluate(() => {
      clearMuscle();
      setSide('front');
      labSamplePixels(); // settle camera at front
      const c = document.querySelector('#labHost canvas');
      const r = c.getBoundingClientRect();
      return { cx: r.left + r.width * 0.46, cy: r.top + r.height * 0.30 };
    });
    await page.mouse.click(clickTarget.cx, clickTarget.cy);
    const canvasClick = await page.evaluate(() => ({
      struct: ANC.labStruct,
      bodySel: ANC.bodySel,
      structCard: !!document.querySelector('.lab-struct')
    }));
    chk('clicking directly on the 3D WebGL canvas selects a named muscle mesh',
        !!canvasClick.struct && !!canvasClick.struct.label && canvasClick.structCard,
        canvasClick.struct ? (canvasClick.struct.label + ' -> ' + canvasClick.bodySel) : 'none');

    /* Unmapped structure selection (e.g. neck / hip rotators / adductors) */
    const unmappedCheck = await page.evaluate(() => {
      clearMuscle();
      setSide('front');
      labSamplePixels();
      // Scan NDC rays to pick an unmapped structure (e.g. neck or adductors)
      let hit = null;
      for(let ny = 0.72; ny >= -0.35 && !hit; ny -= 0.04){
        for(const nx of [0.0, 0.04, -0.04, 0.08, -0.08]){
          labPickScreen(nx, ny);
          if(ANC.labStruct && !ANC.labStruct.trainingGroup){
            hit = ANC.labStruct;
            break;
          }
        }
      }
      return {
        hit: hit,
        bodySel: ANC.bodySel,
        structRendered: !!document.querySelector('.lab-struct'),
        noGroupNotice: /does not track this structure/i.test((document.getElementById('bodyDetail')||{}).textContent||'')
      };
    });
    chk('picking an unmapped 3D muscle renders its anatomical card without fake group stats',
        !!unmappedCheck.hit && unmappedCheck.bodySel === null &&
        unmappedCheck.structRendered && unmappedCheck.noGroupNotice,
        unmappedCheck.hit ? unmappedCheck.hit.label : 'not hit');

    /* Filters, isolate, context layers & Exercise Detail navigation */
    const controlsCheck = await page.evaluate(() => {
      selectMuscle('back');
      setLabLayer('deep');
      const deepPx = labSamplePixels();
      setLabLayer('all');
      const isoOn = (labToggleIsolate(), LAB.isIsolated());
      const isoPx = labSamplePixels();
      labToggleIsolate();
      openExerciseDetail('bb-row');
      const sheetTxt = (document.getElementById('sheetHost') || {}).textContent || '';
      closeSheet();
      resetFig();
      return {
        deepRendered: deepPx.nonEmpty > 50,
        isoWorked: isoOn === true && isoPx.nonEmpty > 20,
        exDetailOpened: /Barbell Row/i.test(sheetTxt) && /Muscle involvement/i.test(sheetTxt),
        clearedAfterReset: ANC.bodySel === null && ANC.labStruct === null
      };
    });
    chk('layer filter, isolation mode, exercise detail sheet and camera reset all work',
        controlsCheck.deepRendered && controlsCheck.isoWorked &&
        controlsCheck.exDetailOpened && controlsCheck.clearedAfterReset,
        JSON.stringify(controlsCheck));

    /* Disposal on route exit */
    const disposed = await page.evaluate(() => {
      go('home');
      return { mounted: labIsMounted(), canvasLeft: !!document.querySelector('canvas') };
    });
    chk('leaving the Body screen disposes the WebGL viewer and removes its canvas',
        disposed.mounted === false && disposed.canvasLeft === false);

    /* ================================================================== */
    group('3. Interactive learning modules in real Chromium');
    const modCheck = await page.evaluate(() => {
      go('science');
      setSciView('modules');
      openModule('muscle-growth');
      const s1 = document.querySelector('#screenBody').textContent;
      setModStep(4);
      const s5 = document.querySelector('#screenBody').textContent;
      openModule('energy-balance');
      setModStep(2);
      setEnergy('intake', 2900);
      setEnergy('expenditure', 2300);
      const bal = document.getElementById('emBal').textContent;
      openModule('adaptation-recovery');
      setModStep(3);
      setRecSim('sets', 6);
      setRecSim('rir', 0);
      setRecSim('sleep', 4.5);
      const recDays = parseFloat(document.getElementById('rsDays').textContent);
      return {
        hasCitation: /Wackerhage|10\.1152/i.test(s1),
        step5Ok: /months/i.test(s5),
        bal: bal,
        recDays: recDays,
        bootDismissed: !document.getElementById('appBoot')
      };
    });
    chk('Module A renders real verified citations and stages',
        modCheck.hasCitation && modCheck.step5Ok);
    chk('Module B interactive sliders compute real energy difference',
        modCheck.bal === '+600', modCheck.bal);
    chk('Module C recovery model sliders & branded boot veil dismissal work in Chromium',
        modCheck.recDays > 3.5 && modCheck.bootDismissed, 'days=' + modCheck.recDays);
    if(SHOT_DIR){ await new Promise(r => setTimeout(r, 250)); await page.screenshot({ path: path.join(SHOT_DIR, '06_module_interactive.png'), fullPage: false }); }

    /* ================================================================== */
    group('3b. A 390 px phone with the on-screen keyboard up (390 x 420)');
    /* The keyboard is not in the page, so it is simulated the only honest way:
       a viewport with the height the keyboard leaves. This is the geometry in
       which the Log button of the set being typed into sat underneath the tab
       bar — the one action the screen exists for, painted over by navigation. */
    {
      await page.setViewport({ width: 390, height: 420, deviceScaleFactor: 1 });
      await page.evaluate(() => {
        /* The earlier groups finished their session, so there is nothing to
           type into until one is running. */
        go('session');
        if(typeof ACTIVE === 'undefined' || !ACTIVE){ startSession(); }
        setSessionSub('live');
      });
      await new Promise(r => setTimeout(r, 500));
      const inp = await page.$('#sf_0_0_reps');
      if(inp) await inp.focus();
      await new Promise(r => setTimeout(r, 450));
      const kbd = await page.evaluate(() => {
        const input = document.querySelector('#sf_0_0_reps');
        const log = document.getElementById('logbtn_0_0');
        const nav = document.querySelector('nav.tabbar');
        const ir = input && input.getBoundingClientRect();
        const lr = log && log.getBoundingClientRect();
        const nr = nav && nav.getBoundingClientRect();
        const hit = lr ? document.elementFromPoint(lr.left + lr.width/2, lr.top + lr.height/2) : null;
        return {
          typing: document.body.classList.contains('typing'),
          inputVisible: !!ir && ir.top >= 0 && ir.bottom <= innerHeight,
          navOffScreen: !!nr && nr.top >= innerHeight,
          logTop: lr ? Math.round(lr.top) : null,
          logBottom: lr ? Math.round(lr.bottom) : null,
          logHit: hit ? hit.id || hit.className : null,
          vh: innerHeight
        };
      });
      chk('the field being typed into is scrolled into view', kbd.inputVisible);
      chk('the tab bar steps aside for the keyboard', kbd.typing && kbd.navOffScreen);
      chk('the Log button is not behind the navigation',
          kbd.logHit === 'logbtn_0_0' && kbd.logBottom <= kbd.vh,
          'log ' + kbd.logTop + '..' + kbd.logBottom + ' of ' + kbd.vh + ', hit=' + kbd.logHit);
      if(SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, '13_keyboard_390x420.png') });

      await page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
      await new Promise(r => setTimeout(r, 300));
      const back = await page.evaluate(() => ({
        typing: document.body.classList.contains('typing'),
        navTop: Math.round(document.querySelector('nav.tabbar').getBoundingClientRect().top)
      }));
      chk('and the bar comes back when the keyboard closes',
          !back.typing && back.navTop < 420, JSON.stringify(back));

      /* a desktop with a rail must not lose its navigation */
      await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
      await page.evaluate(() => { const i = document.querySelector('#sf_0_0_reps'); if(i) i.focus(); });
      await new Promise(r => setTimeout(r, 250));
      const rail = await page.evaluate(() => {
        const n = document.querySelector('nav.tabbar').getBoundingClientRect();
        return { typing: document.body.classList.contains('typing'), left: Math.round(n.left), w: Math.round(n.width) };
      });
      chk('the side rail stays put while typing', rail.w === 200 && rail.left === 0, JSON.stringify(rail));
    }

    /* ================================================================== */
    group('3c. The workout plan is a list of exercises, not of 26 px columns');
    {
      /* The row is a 26 px index column and then the exercise. The markup
         wraps both in .plan-ex-top, and while that wrapper was being placed in
         the index column every title wrapped one word per line and ran under
         the row below — with no document overflow, so the audit in group 4 was
         blind to it. Measure the thing itself. */
      for(const vw of [390, 1280]){
        await page.setViewport({ width: vw, height: 820, deviceScaleFactor: 1 });
        /* an earlier group left a session running, and the "plan" subtab of a
           running session is the live view — clear it first */
        await page.evaluate(() => {
          /* discardSession asks for confirmation; a modal blocks CDP */
          try { window.confirm = () => true; } catch(e){}
          if(typeof ACTIVE !== 'undefined' && ACTIVE){ discardSession(); }
          go('session'); setSessionSub('plan');
        });
        await new Promise(r => setTimeout(r, 300));
        const m = await page.evaluate(() => {
          const rows = [...document.querySelectorAll('.plan-ex-row')];
          const row = rows[0];
          const main = row && row.querySelector('.plan-ex-main');
          const idx = row && row.querySelector('.plan-ex-idx');
          const squeezed = rows.filter(r =>
            [...r.querySelectorAll('*')].some(e => e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0)).length;
          return {
            rowW: row ? Math.round(row.getBoundingClientRect().width) : 0,
            mainW: main ? Math.round(main.getBoundingClientRect().width) : 0,
            idxW: idx ? Math.round(idx.getBoundingClientRect().width) : 0,
            rows: rows.length,
            squeezed
          };
        });
        /* the exercise gets everything except a 26 px index column and a gap */
        chk('an exercise gets the row, not the index column @' + vw,
            m.rows >= 1 && m.idxW >= 20 && m.idxW <= 34 && m.mainW >= m.rowW - 60,
            JSON.stringify(m));
        chk('and no plan row hides overflow inside itself @' + vw, m.squeezed === 0,
            m.squeezed + ' rows with clipped content');
      }
    }

    /* ================================================================== */
    group('4. Real viewport horizontal-overflow audit (320 / 375 / 390 / 768 / 1024 / 1440 px, LTR & RTL)');
    const widths = [320, 375, 390, 768, 1024, 1440];
    const views = ['home', 'session', 'library', 'body', 'progress', 'profile', 'science', 'module'];
    const overflows = [];

    for(const lang of ['en', 'ar']){
      await page.evaluate(l => { switchLang(l); }, lang);
      for(const vw of widths){
        await page.setViewport({ width: vw, height: 780, deviceScaleFactor: 1 });
        for(const v of views){
          await page.evaluate(viewName => {
            if(viewName === 'module') openModule('muscle-growth');
            else if(viewName === 'library') openExerciseLibrary();
            else { if(viewName === 'session') setSessionSub('plan'); go(viewName); }
            if(viewName === 'body') selectMuscle('chest');
          }, v);
          await new Promise(r => setTimeout(r, 60));
          const res = await page.evaluate(() => {
            if(typeof LAB !== 'undefined' && LAB && LAB.resize) LAB.resize();
            const sw = document.documentElement.scrollWidth;
            const iw = window.innerWidth;
            return { sw, iw, dir: document.documentElement.dir };
          });
          if(res.sw > res.iw + 1){
            overflows.push(lang + '@' + vw + 'px/' + v + ': scrollWidth=' + res.sw + ' > ' + res.iw);
          }
          if(SHOT_DIR && vw === 360 && v === 'body' && lang === 'en'){
            await page.waitForFunction(() => typeof labIsLoaded === 'function' && labIsLoaded(), { timeout: 10000 }).catch(()=>{});
            await new Promise(r => setTimeout(r, 250));
            await page.screenshot({ path: path.join(SHOT_DIR, '07_anatomy_mobile_360.png'), fullPage: false });
          }
          if(SHOT_DIR && vw === 360 && v === 'home' && lang === 'ar'){
            await page.screenshot({ path: path.join(SHOT_DIR, '08_arabic_rtl_360.png'), fullPage: false });
          }
          if(SHOT_DIR && vw === 1280 && lang === 'en'){
            if(v === 'session'){ await page.evaluate(() => { togglePlanEdit(); }); await new Promise(r => setTimeout(r, 150)); await page.screenshot({ path: path.join(SHOT_DIR, '09_session_planner.png') }); await page.evaluate(() => { togglePlanEdit(); }); }
            if(v === 'library') await page.screenshot({ path: path.join(SHOT_DIR, '10_exercise_atlas.png') });
            if(v === 'science'){ await page.evaluate(() => { setSciView('lessons'); }); await new Promise(r => setTimeout(r, 150)); await page.screenshot({ path: path.join(SHOT_DIR, '11_science_hub.png') }); }
            if(v === 'profile') await page.screenshot({ path: path.join(SHOT_DIR, '12_profile_studio.png') });
          }
        }
      }
    }
    await page.evaluate(() => switchLang('en'));
    await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
    chk('zero horizontal overflow across 8 views × 6 viewports (320..1440 px) × LTR & RTL (96 layouts)',
        overflows.length === 0, overflows.slice(0, 5).join('; ') || '96/96 clean');

    /* Real Chromium Accessibility Tree (AXTree) audit for VoiceOver/TalkBack/NVDA */
    const cdp = await page.target().createCDPSession();
    const nameless = [];
    for(const v of ['home', 'session', 'body', 'progress', 'profile', 'science']){
      await page.evaluate(vn => {
        closeSheet();
        go(vn);
        if(vn === 'session') openExerciseDetail('bb-bench');
      }, v);
      await new Promise(r => setTimeout(r, 80));
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      for(const nd of nodes){
        if(nd.ignored) continue;
        const role = nd.role && nd.role.value;
        if(['button','tab','switch','slider','spinbutton','textbox','dialog'].indexOf(role) >= 0){
          const nm = (nd.name && String(nd.name.value || '').trim()) || '';
          if(!nm) nameless.push(v + ':' + role);
        }
      }
    }
    await page.evaluate(() => closeSheet());
    chk('real Chromium Accessibility Tree (AXTree) exposes non-empty names on every interactive control & dialog',
        nameless.length === 0, nameless.slice(0, 6).join(', ') || 'all named');

    /* ================================================================== */
    group('5. Service Worker caching, IndexedDB fail-safe & genuine offline reload');
    await page.goto(baseUrl + '/', { waitUntil: 'networkidle0' });
    const swReady = await page.evaluate(async () => {
      if(!('serviceWorker' in navigator)) return { ok: false, reason: 'no SW API' };
      const reg = await navigator.serviceWorker.ready;
      // Wait briefly for install cache population to settle
      for(let i = 0; i < 30; i++){
        const keys = await caches.keys();
        if(keys.length){
          const cache = await caches.open(keys[0]);
          const reqs = await cache.keys();
          if(reqs.length >= 30) return { ok: true, cache: keys[0], cachedFiles: reqs.length, active: !!reg.active };
        }
        await new Promise(r => setTimeout(r, 150));
      }
      return { ok: false, reason: 'cache incomplete' };
    });
    chk('Service Worker activates and pre-caches modular app + 3D assets',
        swReady.ok && swReady.cachedFiles >= 30, JSON.stringify(swReady));

    await page.setOfflineMode(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(() => go('body'));
    await page.waitForFunction(() => typeof labIsLoaded === 'function' && labIsLoaded() === true, { timeout: 15000 });
    const offlineState = await page.evaluate(() => ({
      sessions: getState().sessions.length,
      muscles: labMuscleCount(),
      px: labSamplePixels()
    }));
    await page.setOfflineMode(false);
    chk('app reloads 100% offline via Service Worker and renders all 218 3D muscles',
        offlineState.sessions === 3 && offlineState.muscles === 218 && offlineState.px.nonEmpty > 400,
        JSON.stringify({ sessions: offlineState.sessions, muscles: offlineState.muscles, px: offlineState.px.nonEmpty }));

    /* IndexedDB fail-safe recovery if localStorage is cleared */
    const idbRecovered = await page.evaluate(async () => {
      saveState();
      await new Promise(r => setTimeout(r, 150));
      localStorage.removeItem('ancestor.state.v1');
      STATE = null;
      await new Promise(resolve => {
        idbRecoverIfEmpty(() => resolve(true));
        setTimeout(() => resolve(false), 1500);
      });
      return getState().sessions.length;
    });
    chk('IndexedDB automatic mirror recovers all user sessions if localStorage is cleared',
        idbRecovered === 3, 'recovered sessions=' + idbRecovered);

    /* ================================================================== */
    group('6. Shipped single-file bundle (dist/ancestor.html) offline + gzip-b64 WebGL');
    const distPage = await browser.newPage();
    const distErrors = [];
    distPage.on('pageerror', e => distErrors.push(e.message));
    distPage.on('console', m => { if(m.type() === 'error') distErrors.push(m.text()); });
    await distPage.setViewport({ width: 1280, height: 800 });
    await distPage.goto(baseUrl + '/dist/ancestor.html', { waitUntil: 'domcontentloaded' });
    /* Cut network BEFORE onboarding or opening the 3D lab so everything proves self-containment */
    await distPage.setOfflineMode(true);
    await distPage.evaluate(() => {
      setConsent(); setP('experience','i'); setP('goal','h'); onbNext();
      setP('equipment','gym'); onbNext(); setP('daysPerWeek',3); onbNext();
      setP('shiftType','none'); onbNext(); onbNext(); setP('style','std');
      onbNext(); onbNext(); finishOnboarding();
      go('body');
    });
    await distPage.waitForFunction(() => typeof labIsLoaded === 'function' && labIsLoaded() === true, { timeout: 15000 });
    const distLab = await distPage.evaluate(() => ({
      muscles: labMuscleCount(),
      px: labSamplePixels()
    }));
    await distPage.close();

    chk('dist/ancestor.html decompresses gzip-b64 runtime + GLB and renders 218 3D muscles offline',
        distLab.muscles === 218 && distLab.px.nonEmpty > 400,
        'muscles=' + distLab.muscles + ', nonEmptyPx=' + distLab.px.nonEmpty);
    chk('zero errors in dist/ancestor.html', distErrors.length === 0, distErrors.join('; '));
    chk('zero console or page errors across the entire modular browser journey',
        errors.length === 0, errors.join('; '));

  } finally {
    await browser.close();
    srv.close();
  }

  console.log('\n' + '='.repeat(64));
  if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' REAL-BROWSER & WEBGL TESTS PASSED\x1b[0m');
  else {
    console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed');
    failures.forEach(f => console.log('   - ' + f));
  }
  console.log('='.repeat(64) + '\n');
  process.exit(fail === 0 ? 0 : 1);
})();
