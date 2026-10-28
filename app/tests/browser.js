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
     3b. Both failure strips (refused write, damaged record) at 320 px, de & ar
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

/* Every capture runs to the full document height.
   Twice now the finding was below the fold of a first-screen shot — the 547 px
   tap icon on Body and the raw `body.selectBody` key — and both times the
   picture said the screen was fine. If a capture stops at 780 px, it is a claim
   about the top of the page only. */
async function shot(page, name){
  if(!SHOT_DIR) return;
  /* Let the reveal finish first. The stagger runs for up to half a second after
     a screen renders, and the capture ran 60 ms later — so the atlas was
     photographed with its first three rows in, a fourth fading and eighty-five
     waiting, a page of pure margin that no one has ever seen. Infinite
     animations are raced against a cap so a spinner cannot hold the camera. */
  await page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))),
    new Promise(r => setTimeout(r, 1200))
  ])).catch(() => {});
  await page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: true });
}

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
    group('0. First launch: the language question, on a real 390 px phone');
    {
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
      await page.reload({ waitUntil: 'networkidle0' });

      const rows = await page.$$eval('.lang-row', els => els.map(e => ({
        lang: e.getAttribute('lang'), dir: e.querySelector('.lang-nm').getAttribute('dir'),
        name: e.querySelector('.lang-nm').textContent.trim(),
        box: Math.round(e.querySelector('.box').getBoundingClientRect().width)
      })));
      chk('seven languages, each named in its own script', rows.length === 7 &&
          rows.some(r => r.lang === 'ar' && /العربية/.test(r.name)) &&
          rows.some(r => r.lang === 'nl' && /Nederlands/.test(r.name)),
          rows.map(r => r.name).join(' / '));
      chk('the Arabic row declares its own direction', rows.filter(r => r.lang === 'ar')
          .every(r => r.dir === 'rtl') && rows.filter(r => r.lang !== 'ar')
          .every(r => r.dir === 'ltr'));
      chk('every row has a real tap target and a visible mark',
          rows.every(r => r.box >= 16), rows.map(r => r.box).join(','));

      const fit = await page.evaluate(() => ({
        docW: document.documentElement.scrollWidth,
        winW: window.innerWidth,
        rows: Array.from(document.querySelectorAll('.lang-row')).map(r => Math.round(r.getBoundingClientRect().right))
      }));
      chk('nothing overflows the language screen at 390 px',
          fit.docW <= fit.winW && Math.max.apply(null, fit.rows) <= fit.winW + 1,
          fit.docW + ' / ' + fit.winW);

      /* Tapping Arabic must flip the whole page before Continue is pressed. */
      await page.click('.lang-row[lang="ar"]');
      const rtl = await page.evaluate(() => ({
        dir: document.documentElement.dir, lang: document.documentElement.lang,
        chosen: getState().langChosen,
        overflow: document.documentElement.scrollWidth - window.innerWidth
      }));
      chk('tapping Arabic flips the page to RTL immediately',
          rtl.dir === 'rtl' && rtl.lang === 'ar', rtl.dir + '/' + rtl.lang);
      chk('the question is still unanswered until Continue', rtl.chosen === false);
      chk('an RTL first screen does not overflow at 390 px', rtl.overflow <= 0, rtl.overflow + ' px');
      await shot(page, 'lang-ar-390.png');

      /* The narrowest phone still sold, in the direction that grows the heading
         the most: the Arabic title is one long word pair with no hyphen. */
      await page.setViewport({ width: 320, height: 640, deviceScaleFactor: 2 });
      const tight = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        h1: document.querySelector('.lang-frame h1').getBoundingClientRect().right
      }));
      chk('and it still fits at 320 px', tight.overflow <= 0, tight.overflow + ' px');
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

      await page.click('.lang-row[lang="en"]');
      await page.click('.lang-frame .onb-actions button');
      const answered = await page.evaluate(() => ({
        chosen: getState().langChosen, lang: getState().lang,
        step: ANC.onbStep, hasNav: getComputedStyle(document.getElementById('nav')).display !== 'none'
      }));
      chk('Continue records the answer and opens the first step',
          answered.chosen === true && answered.lang === 'en' && answered.step === 'welcome',
          JSON.stringify(answered));
      chk('the bottom bar stays out of the way of onboarding', answered.hasNav === false);
      await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
    }

    /* ================================================================== */
    group('1. Onboarding, live workout logging & completion in real Chromium');
    await page.evaluate(() => {
      setConsent();
      setP('name', 'Alex');
      setP('experience', 'i');
      setP('goal', 'h');
      onbNext();
      setP('emphasis', 'glutes');       /* step 3: focus */
      onbNext();
      onbNext();                        /* step 4: approach */
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
    if(SHOT_DIR){ await new Promise(r => setTimeout(r, 350)); await shot(page, '01_dashboard_desktop.png'); }

    await page.evaluate(() => { go('session'); startSession(); });
    if(SHOT_DIR){ await new Promise(r => setTimeout(r, 350)); await shot(page, '02_session_live.png'); }

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
    if(SHOT_DIR) await shot(page, '03_progress_charts.png');

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
    if(SHOT_DIR) await shot(page, '04_anatomy_3d_front.png');

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
    if(SHOT_DIR) await shot(page, '05_anatomy_3d_selected.png');

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
    if(SHOT_DIR){ await new Promise(r => setTimeout(r, 250)); await shot(page, '06_module_interactive.png'); }

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
      if(SHOT_DIR) await shot(page, '13_keyboard_390x420.png');

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
    group('3d. The exercise atlas uses the width it is given');
    for(const [vw, wantCols] of [[1440, 2], [1024, 2], [720, 2], [560, 1], [390, 1]]){
      await page.setViewport({ width: vw, height: 900, deviceScaleFactor: 1 });
      await page.evaluate(() => { openExerciseLibrary(); });
      await new Promise(r => setTimeout(r, 250));
      const m = await page.evaluate(() => {
        const grid = document.querySelector('.ex-grid');
        const cards = [...document.querySelectorAll('.ex-card')];
        const cs = getComputedStyle(grid);
        const clipped = cards.filter(c => c.scrollWidth > c.clientWidth + 2).length;
        const search = document.getElementById('libSearchInput');
        return {
          searchW: search ? Math.round(search.getBoundingClientRect().width) : 0,
          cols: cs.gridTemplateColumns.split(' ').length,
          gridW: Math.round(grid.getBoundingClientRect().width),
          cardW: cards.length ? Math.round(cards[0].getBoundingClientRect().width) : 0,
          cards: cards.length,
          clipped,
          docH: Math.round(document.documentElement.scrollHeight)
        };
      });
      chk('the atlas is ' + wantCols + ' column(s) at ' + vw + ' px',
          m.cols === wantCols && m.cards === 88, JSON.stringify(m));
      /* In two columns a card owns half the register; in one, all of it. */
      const share = m.gridW ? m.cardW / m.gridW : 0;
      /* Next to a row of muscle chips the search field used to shrink to 215 px
         and cut its placeholder mid-word. */
      chk('and the search field is never a stump at ' + vw + ' px',
          m.searchW >= 280, 'input ' + m.searchW + ' px');
      chk('and each card owns its column at ' + vw + ' px',
          share > 0.42 && m.cardW >= 240 && m.clipped === 0,
          'card ' + m.cardW + ' of ' + m.gridW + ' (' + Math.round(share * 100) + '%), ' + m.clipped + ' clipped');
    }
    await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });

    group('4. Real viewport horizontal-overflow audit (320 / 375 / 390 / 768 / 1024 / 1440 px, LTR & RTL)');
    const widths = [320, 375, 390, 768, 1024, 1440];
    const views = ['home', 'session', 'library', 'body', 'progress', 'profile', 'science', 'module'];
    const overflows = [];

    /* Two directions were audited before this pass, and the two longest words in
       the app are German: "Verfügbarkeit" under the readiness figure and "Letzte
       sieben Tage" beside a section rule. Both overflowed a 320 px phone and
       neither language was in the loop. Every language now runs at the two
       narrow widths; English and Arabic keep the full six. */
    const combos = [];
    ['en', 'fr', 'es', 'de', 'it', 'nl', 'ar'].forEach(lang => {
      const set = (lang === 'en' || lang === 'ar') ? widths : [320, 390];
      set.forEach(vw => combos.push({ lang, vw }));
    });

    for(const { lang, vw } of combos){
      await page.evaluate(l => { switchLang(l); }, lang);
      {
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
          /* These gates used to say 360 and 1280, and the loop above walks
             [320, 375, 390, 768, 1024, 1440] — so six of the thirteen captures
             were never taken, and nothing said so. A capture that cannot run is
             worse than no capture: it is evidence in the directory listing. */
          if(SHOT_DIR && vw === 390 && v === 'body' && lang === 'en'){
            await page.waitForFunction(() => typeof labIsLoaded === 'function' && labIsLoaded(), { timeout: 10000 }).catch(()=>{});
            await new Promise(r => setTimeout(r, 250));
            await shot(page, '07_anatomy_mobile_390.png');
          }
          if(SHOT_DIR && vw === 390 && v === 'home' && lang === 'ar'){
            await shot(page, '08_arabic_rtl_390.png');
          }
          if(SHOT_DIR && vw === 1440 && lang === 'en'){
            if(v === 'session'){ await page.evaluate(() => { togglePlanEdit(); }); await new Promise(r => setTimeout(r, 150)); await shot(page, '09_session_planner.png'); await page.evaluate(() => { togglePlanEdit(); }); }
            if(v === 'library') await shot(page, '10_exercise_atlas.png');
            if(v === 'science'){ await page.evaluate(() => { setSciView('lessons'); }); await new Promise(r => setTimeout(r, 150)); await shot(page, '11_science_hub.png'); }
            if(v === 'profile') await shot(page, '12_profile_studio.png');
          }
        }
      }
    }
    await page.evaluate(() => switchLang('en'));
    await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
    chk('zero horizontal overflow across 8 views × 7 languages × 320..1440 px (' +
        combos.length * views.length + ' layouts)',
        overflows.length === 0,
        overflows.slice(0, 5).join('; ') || (combos.length * views.length) + ' layouts clean');

    /* `body{overflow-x:hidden}` was on the page for months and the QA audit
       recorded it as Medium for just as long: it clips content rather than
       making it fit, so real overflow is invisible in exactly the testing that
       is supposed to find it. It hid the printed sheet being 900 px wide on a
       390 px phone. Removed on 2026-10-28 — nothing needed it: the 176 layouts
       above are clean without it. These are the surfaces that were never in
       that loop (sheets, the print card, toasts, the planner mid-edit), and
       they are measured with the rule gone. */
    {
      const grew = [];
      const surfaces = {
        'exercise sheet': () => openExerciseDetail('bb-bench'),
        'planner mid-edit': () => { go('session'); setSessionSub('plan'); togglePlanEdit(); },
        'lesson': () => openModule('muscle-growth'),
        'toast': () => toast('Saved', 'ok')
      };
      for(const lang of ['en', 'ar']){
        for(const vw of [320, 390]){
          await page.setViewport({ width: vw, height: 780, deviceScaleFactor: 1 });
          for(const name of Object.keys(surfaces)){
            await page.evaluate((l, nm) => {
              try { closeSheet(); } catch (e) {}
              try { if(typeof closeModule === 'function') closeModule(); } catch (e) {}
              const root = document.getElementById('printRoot');
              root.innerHTML = ''; root.style.display = ''; root.classList.remove('printing');
              switchLang(l); go('home');
            }, lang, name);
            await page.evaluate(`(${surfaces[name].toString()})()`);
            await new Promise(r => setTimeout(r, 90));
            const res = await page.evaluate(() => ({
              sw: document.documentElement.scrollWidth,
              iw: window.innerWidth,
              bodyOverflow: getComputedStyle(document.body).overflowX
            }));
            if(res.sw > res.iw + 1) grew.push(lang + '@' + vw + '/' + name + ': ' + res.sw + ' > ' + res.iw);
          }
        }
      }
      /* The print document is deliberately not on screen: `#printRoot` is
         display:none and only the @media print block reveals it, where the
         viewport *is* the paper (measured in group 4 above). A 210 mm element
         measured against a 390 px phone is not overflow, it is a different
         medium — so it is asserted as hidden rather than measured as wide. */
      const printHidden = await page.evaluate(() => {
        const root = document.getElementById('printRoot');
        return { display: getComputedStyle(root).display, inline: root.getAttribute('style') || '' };
      });
      chk('the print document is not on screen, so it cannot widen the page',
          printHidden.display === 'none' && !/display:\s*block/.test(printHidden.inline),
          'display:' + printHidden.display);

      /* Leave the page as the rest of the suite expects it. */
      await page.evaluate(() => {
        try { closeSheet(); } catch (e) {}
        try { if(typeof closeModule === 'function') closeModule(); } catch (e) {}
        const root = document.getElementById('printRoot');
        root.innerHTML = ''; root.style.display = ''; root.classList.remove('printing');
        switchLang('en');
      });
      await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
      chk('no sheet, planner, lesson or toast needs body{overflow-x:hidden} to stay inside the phone',
          grew.length === 0,
          grew.slice(0, 4).join('; ') || '4 surfaces × 2 languages × 2 widths, all clean');
    }

    /* The verdict card's figure and its caption, at the narrowest phone, in every
       language: the caption used to break mid-word ("VERFÜGBAR / KEIT"). */
    {
      const wrapped = [];
      await page.setViewport({ width: 320, height: 780, deviceScaleFactor: 1 });
      for(const lang of ['en', 'fr', 'es', 'de', 'it', 'nl', 'ar']){
        await page.evaluate(l => { closeSheet(); switchLang(l); go('home'); }, lang);
        await new Promise(r => setTimeout(r, 120));
        const res = await page.evaluate(() => {
          const cap = document.querySelector('.decision .readiness .cap');
          if(!cap) return null;
          const cs = getComputedStyle(cap);
          const oneLine = Math.round(cap.getBoundingClientRect().height) <=
                          Math.ceil(parseFloat(cs.lineHeight)) + 1;
          return { oneLine, text: cap.textContent.trim(),
                   over: document.documentElement.scrollWidth - window.innerWidth };
        });
        if(!res || !res.oneLine || res.over > 0) wrapped.push(lang + ':' + JSON.stringify(res));
      }
      chk('the readiness caption stays on one line at 320 px in all seven languages',
          wrapped.length === 0, wrapped.join('; ') || '7/7');
      await page.evaluate(() => switchLang('en'));
    }

    /* The paper, measured as paper. This is the only place the sheet is ever
       laid out by a real engine under @media print, and it is where a genuine
       bug lived for a long time: `#printRoot .sheet` only overrode width,
       padding and type, so the modal bottom sheet's `position:fixed;
       max-height:88vh; overflow:auto; border-top:2px` still applied. The
       printed page was a fixed box pinned to the bottom of the *page*,
       clipped at 88 % of the viewport, wearing the modal's 2 px border — and
       it spilled onto a second sheet of A4. Nothing on screen said so. */
    {
      const PX_PER_MM = 96 / 25.4;
      const A4 = { w: 210 * PX_PER_MM, h: 297 * PX_PER_MM };
      /* The viewport becomes the page box first. A real print lays the document
         out in a viewport 210 mm wide, so the print rule's `width:100%` means
         "the paper"; emulating print media at 1280 px would make it mean 1280,
         and every measurement after that would describe a monitor. */
      await page.setViewport({ width: Math.round(A4.w), height: Math.round(A4.h), deviceScaleFactor: 1 });
      await page.emulateMediaType('print');
      /* A six-exercise session is the longest the planner writes for one day;
         it is the worst case for fitting on one sheet. */
      await page.evaluate(() => {
        const s = getState();
        Object.assign(s.profile, {
          name: 'Yanis', experience: 'i', goal: 'h', goals: ['h'], equipment: 'gym',
          shiftType: 'none', sleepHours: 6, sleepVariability: 1, usualWake: 7,
          style: 'std', daysPerWeek: 3, sessionMinutes: 50, unit: 'kg', bodyweight: 112
        });
        s.plan = buildPlan(s.profile);
        saveState();
      });
      const sheets = [];
      for(const lang of ['en', 'fr', 'de', 'ar']){
        const res = await page.evaluate(({ lang, A4 }) => {
          const root = document.getElementById('printRoot');
          const prev = CURRENT_LANG;
          CURRENT_LANG = lang;
          const st = getState();
          const out = [];
          st.plan.sessions.forEach(sn => {
            root.innerHTML = printSheet(st, Date.now(), { planId: sn.id });
            const el = root.querySelector('.sheet');
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            /* Anything sticking out sideways is clipped by the printer, and in
               RTL that is the side the eye starts from. */
            let spill = 0;
            el.querySelectorAll('*').forEach(n => {
              const b = n.getBoundingClientRect();
              if(b.width || b.height) spill = Math.max(spill, Math.round(b.right - r.right), Math.round(r.left - b.left));
            });
            out.push({
              session: sn.name,
              dir: el.getAttribute('dir'),
              exercises: sn.exercises.length,
              top: Math.round(r.top),
              h: Math.round(r.height),
              w: Math.round(r.width),
              position: cs.position,
              maxHeight: cs.maxHeight,
              overflow: cs.overflow,
              spill
            });
          });
          CURRENT_LANG = prev;
          root.innerHTML = '';
          return out;
        }, { lang, A4 });
        sheets.push(...res.map(r => Object.assign({ lang }, r)));
      }
      await page.emulateMediaType(null);
      const tall = sheets.filter(s => s.h > Math.floor(A4.h));
      const displaced = sheets.filter(s => s.top !== 0);
      const modal = sheets.filter(s => s.position !== 'static' || s.maxHeight !== 'none' || s.overflow !== 'visible');
      const spilled = sheets.filter(s => s.spill > 1);
      chk('the printed sheet is a real A4 page: 210 × 297 mm, starting at the top of the paper, in four languages (' + sheets.length + ' sheets)',
          tall.length === 0 && displaced.length === 0 && sheets.every(s => Math.abs(s.w - Math.round(A4.w)) <= 2),
          tall.map(s => s.lang + '/' + s.session + ' ' + s.h + 'px').concat(
            displaced.map(s => s.lang + '/' + s.session + ' top=' + s.top)).join('; ') ||
          'max ' + Math.max(...sheets.map(s => s.h)) + 'px of ' + Math.floor(A4.h));
      chk('the sheet no longer inherits the bottom sheet: static, no 88 vh clamp, no scroll box',
          modal.length === 0,
          modal.slice(0, 3).map(s => s.lang + ':' + s.position + '/' + s.maxHeight + '/' + s.overflow).join('; ') || 'none of ' + sheets.length);
      chk('nothing on the sheet crosses the paper edge, left or right, in LTR or RTL',
          spilled.length === 0,
          spilled.slice(0, 3).map(s => s.lang + ' spill ' + s.spill + 'px').join('; ') || '0 px');
      chk('Arabic still prints right to left on one sheet',
          sheets.some(s => s.lang === 'ar' && s.dir === 'rtl' && s.h <= Math.floor(A4.h)),
          sheets.filter(s => s.lang === 'ar').map(s => s.dir + ' ' + s.h + 'px').join(', '));
    }

    /* The record side of the sheet, measured the same way. It carries more ink
       than the form — one printed line per working set — so it is the worst
       case for fitting on the paper, and it is the document a person keeps. */
    {
      const PX_PER_MM = 96 / 25.4;
      const A4 = { w: 210 * PX_PER_MM, h: 297 * PX_PER_MM };
      const recId = await page.evaluate(() => {
        const s = getState();
        const sn = s.plan.sessions[0];
        const now = Date.now();
        const rec = { id: 'rec-b1', date: now - 2*864e5, startedAt: now - 2*864e5 - 3600e3,
          durationMs: 62*60000, planId: sn.id, name: sn.name, exercises: [] };
        sn.exercises.forEach((e, ei) => {
          const entry = { id: e.id, plan: { sets: e.sets, reps: e.reps.slice(), rir: e.rir }, sets: [] };
          for (let k = 0; k < Math.max(3, e.sets); k++)
            entry.sets.push({ w: 60 + ei*5, r: 8, rir: k ? 0 : 1, warmup:false, skipped:false, committed:true });
          rec.exercises.push(entry);
        });
        s.sessions.push(rec);
        saveState();
        return rec.id;
      });
      await page.setViewport({ width: Math.round(A4.w), height: Math.round(A4.h), deviceScaleFactor: 1 });
      await page.emulateMediaType('print');
      const recSheets = [];
      for(const lang of ['en', 'fr', 'de', 'ar']){
        recSheets.push(...await page.evaluate(({ lang, id }) => {
          const root = document.getElementById('printRoot');
          const prev = CURRENT_LANG;
          CURRENT_LANG = lang;
          root.innerHTML = printSheet(getState(), Date.now(), { sessionId: id });
          const el = root.querySelector('.sheet');
          const r = el.getBoundingClientRect();
          let spill = 0;
          el.querySelectorAll('*').forEach(n => {
            const b = n.getBoundingClientRect();
            if(b.width || b.height) spill = Math.max(spill, Math.round(b.right - r.right), Math.round(r.left - b.left));
          });
          const out = { lang, dir: el.getAttribute('dir'), top: Math.round(r.top),
                        h: Math.round(r.height), w: Math.round(r.width), spill,
                        rows: root.querySelectorAll('.sheet-record-table tbody tr').length,
                        lines: root.querySelectorAll('.sheet-record-table .c-sets .ln').length };
          CURRENT_LANG = prev;
          root.innerHTML = '';
          return [out];
        }, { lang, id: recId }));
      }
      await page.emulateMediaType(null);
      await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
      const overRec = recSheets.filter(s => s.h > Math.floor(A4.h) || s.top !== 0 || s.spill > 1);
      chk('a logged session prints as one A4 record, not two sheets, in four languages',
          overRec.length === 0,
          overRec.map(s => s.lang + ' ' + s.h + 'px top=' + s.top + ' spill=' + s.spill).join('; ') ||
          'max ' + Math.max(...recSheets.map(s => s.h)) + 'px of ' + Math.floor(A4.h) +
          ', ' + recSheets[0].rows + ' exercises / ' + recSheets[0].lines + ' printed lines');
      chk('and the Arabic record mirrors on the same page',
          recSheets.some(s => s.lang === 'ar' && s.dir === 'rtl' && s.h <= Math.floor(A4.h)));
    }

    /* The button has to be on the screen, not only in the source. Logged a
       session through the real UI above; these are the two places its record
       can be reached from. */
    {
      const reach = await page.evaluate(() => {
        /* The history table on Progress, with the session that was just
           logged plus the one seeded above. */
        setSessionSub && setSessionSub('plan');
        go('progress');
        const inTable = [...document.querySelectorAll('#screenBody button')]
          .filter(b => b.getAttribute('data-act') === 'openPrintRecord');
        /* And the completion card, which is rendered from a summary object. */
        showCompletion({ sessionId: 'rec-b1', prs: [], baselines: [], sets: 12, exercises: 3,
                         durationMs: 3600e3, volume: 2400, muscles: [], newMilestones: [],
                         thisWeek: 2, targetDays: 3 });
        const inDone = [...document.querySelectorAll('#doneOverlay button')]
          .filter(b => b.getAttribute('data-act') === 'openPrintRecord');
        const label = inDone.length ? inDone[0].textContent.trim() : '';
        const box = inDone.length ? inDone[0].getBoundingClientRect() : null;
        const name = inTable.length ? inTable[0].getAttribute('aria-label') || '' : '';
        closeCompletion('home');
        /* The record this group added is removed again: later groups count the
           sessions in the log, and a fixture is not a session. */
        deleteSession('rec-b1');
        return { table: inTable.length, done: inDone.length, label,
                 w: box ? Math.round(box.width) : 0, h: box ? Math.round(box.height) : 0, name };
      });
      chk('the history table offers a print action for a logged session', reach.table > 0, reach.table + ' rows');
      chk('the session it prints is named for a screen reader, not just "Print"',
          /record/i.test(reach.name) && /\d/.test(reach.name), reach.name);
      chk('the completion card offers the record of the session it just saved',
          reach.done === 1 && reach.label.length > 0, '"' + reach.label + '"');
      chk('and that control clears a thumb', reach.h >= 44, reach.w + '×' + reach.h + ' px');
    }

    /* The bottom bar is fixed, so anything that ends inside its 65 px is
       unreachable however far the page scrolls. Measured at 390 px on the six
       destinations, with the page scrolled to its true end: the lowest visible
       element must stop at or above the bar. Content inside a closed <details>
       is laid out but not painted (Chrome gives it content-visibility), so it is
       excluded rather than counted as "hidden behind the bar". */
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    const occluded = [];
    for(const v of ['home', 'session', 'progress', 'profile', 'body', 'science']){
      await page.evaluate(vn => {
        closeSheet();
        if(vn === 'session') setSessionSub('plan');
        go(vn);
      }, v);
      await new Promise(r => setTimeout(r, 350));
      const res = await page.evaluate(() => {
        window.scrollTo(0, 999999);
        const bar = document.getElementById('nav').getBoundingClientRect();
        const inClosed = e => {
          let n = e;
          while(n && n !== document.body){
            if(n.tagName === 'DETAILS' && !n.open) return true;
            n = n.parentElement;
          }
          return false;
        };
        const els = Array.from(document.querySelectorAll(
          '#screenBody button, #screenBody a, #screenBody h1, #screenBody h2, ' +
          '#screenBody p, #screenBody summary, #screenBody td'))
          .filter(e => e.getBoundingClientRect().height > 0 && !inClosed(e));
        const lowest = els.reduce((a, e) => Math.max(a, e.getBoundingClientRect().bottom), 0);
        const straddling = els.filter(e => {
          const r = e.getBoundingClientRect();
          return r.top < bar.top - 1 && r.bottom > bar.top + 1;
        }).length;
        return { barTop: Math.round(bar.top), lowest: Math.round(lowest), straddling };
      });
      if(res.straddling > 0 || res.lowest > res.barTop + 1)
        occluded.push(v + ': lowest ' + res.lowest + ' vs bar ' + res.barTop +
                      ' (' + res.straddling + ' straddling)');
    }
    await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
    chk('nothing on the six destinations ends beneath the fixed bottom bar',
        occluded.length === 0, occluded.join('; ') || '6/6 clear');

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
    /* The two failure strips are the only copy in the app that is read while
       something is already wrong, so nobody looks at them until they are the
       last thing between a user and a lost log. `tests/ui.js` owns the strings
       and the flag logic; what jsdom cannot show is whether the longest of
       them — German, and Arabic in RTL — fits a 320 px phone while the user is
       being told their session is not on disk. Both branches run on a real
       page here, and the strip has to appear on its own: nothing in this group
       calls `paintStoreFlag`, it is the app that notices. */
    group('5b. A refused write and a damaged record say so at 320 px, in German and Arabic');

    const failCases = [];
    /* A context per case, not a cleared page: by this point the suite's own
       origin holds a saved state and an IndexedDB mirror of it, so
       `localStorage.clear()` is not a first run — the app recovers the record
       and opens on Home, and a second page in the same context inherits the
       first case's log. These strips only exist before there is a record, so
       each case gets a genuinely empty device. */
    for(const branch of ['store', 'load']){
      for(const lang of ['de', 'ar']){
        const failCtx = await browser.createBrowserContext();
        const fp = await failCtx.newPage();
        await fp.setViewport({ width: 320, height: 844, deviceScaleFactor: 1 });
        await fp.goto(baseUrl + '/index.html', { waitUntil: 'networkidle0' });
        await fp.waitForFunction(() => document.querySelector('.lang-row'), { timeout: 20000 });
        if(branch === 'store'){
          await fp.evaluate(l => {
            chooseLang(l); setConsent(); setP('experience','i'); setP('goal','h');
            onbNext(); onbNext(); onbNext(); setP('equipment','gym'); onbNext();
            setP('daysPerWeek',3); setP('sessionMinutes',50); onbNext();
            setP('shiftType','none'); onbNext(); onbNext(); setP('style','std');
            onbNext(); onbNext(); finishOnboarding();
          }, lang);
          /* A device that refuses the write at the moment it is made — which is
             when a real quota dies, not at boot. Overriding it from the first
             byte instead would break the boot itself, which is a different bug. */
          await fp.evaluate(() => {
            window.__origSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = function(){
              const e = new Error('refused'); e.name = 'QuotaExceededError'; throw e;
            };
            saveState();
          });
        } else {
          /* A truncated blob on disk: the record exists and cannot be parsed. */
          await fp.evaluate(() => {
            localStorage.setItem('ancestor.state.v1', '{"schema":3,"sessions":[');
            location.reload();
          });
          await fp.waitForFunction(() => document.querySelector('.lang-row'), { timeout: 20000 });
          await fp.evaluate(l => { chooseLang(l); }, lang);
        }
        await fp.waitForFunction(b => {
          const el = document.getElementById('storeFlag');
          if(!el || el.hidden) return false;
          return el.querySelector('.sf-t').textContent === t(b === 'store' ? 'app.store.title' : 'app.load.title');
        }, { timeout: 10000 }, branch);
        const m = await fp.evaluate(b => {
          const el = document.getElementById('storeFlag');
          const words = [...el.querySelectorAll('.sf-t,.sf-b,.sf-x')];
          return {
            visible: !el.hidden,
            title: el.querySelector('.sf-t').textContent,
            body: el.querySelector('.sf-b').textContent,
            wantTitle: t(b === 'store' ? 'app.store.title' : 'app.load.title'),
            wantBody: t(b === 'store' ? 'app.store.body' : 'app.load.body'),
            docW: document.documentElement.scrollWidth,
            vw: window.innerWidth,
            dir: document.documentElement.getAttribute('dir'),
            clipped: words.filter(w => w.scrollWidth > w.clientWidth + 1).length
          };
        }, branch);
        await shot(fp, 'fail-' + branch + '-' + lang + '-320.png');
        if(branch === 'store'){
          /* The strip is a report, not a state: the next write that lands has to
             take it away again without a reload. */
          m.clears = await fp.evaluate(() => {
            Storage.prototype.setItem = window.__origSetItem;
            saveState();
            return document.getElementById('storeFlag').hidden === true && !STORAGE_FAILED;
          });
        }
        await failCtx.close();
        failCases.push(Object.assign({ branch, lang }, m));
      }
    }
    const label = c => (c.branch === 'store' ? 'a refused write' : 'a damaged record') +
                       ' at 320 px in ' + (c.lang === 'ar' ? 'Arabic (RTL)' : 'German');
    failCases.forEach(c => {
      chk(label(c) + ' is announced, with the app\'s own translated words',
          c.visible && c.title === c.wantTitle && c.body === c.wantBody,
          c.title.slice(0, 60) + (c.title === c.wantTitle && c.body === c.wantBody ? '' : ' -> not the translated copy'));
      chk(label(c) + ' fits: no overflow and no clipped line',
          c.docW <= c.vw + 1 && c.clipped === 0 && (c.lang !== 'ar' || c.dir === 'rtl'),
          'doc ' + c.docW + '/' + c.vw + ', clipped ' + c.clipped + ', dir ' + c.dir);
      if(c.branch === 'store'){
        chk(label(c) + ' goes away by itself once a write lands again',
            c.clears === true, 'hidden after the retry: ' + c.clears);
      }
    });

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
    /* ================================================================== */
    /* The policy is only worth having if it is the real one and it is doing
       something. These four checks are the difference between a meta tag and a
       backstop: the directive has no escape hatch in it, an injected inline
       script does not run, an injected handler attribute does not run, and the
       shipped bundle carries the hash of every block it inlined — because a
       wrong hash is a silent white page, not a security win. */
    group('6b. The Content-Security-Policy is real, and it blocks what it should');
    const cspPage = await browser.newPage();
    const cspLog = [];
    cspPage.on('console', m => { if(m.type() === 'error') cspLog.push(m.text()); });
    await cspPage.goto(baseUrl + '/index.html', { waitUntil: 'networkidle0' });

    const policy = await cspPage.evaluate(() => {
      const m = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return m ? m.getAttribute('content') : '';
    });
    const scriptSrc = (policy.split(';').map(s => s.trim())
      .filter(s => s.indexOf('script-src') === 0)[0] || '');
    /* Tokens, not substrings: 'wasm-unsafe-eval' is a different permission from
       'unsafe-eval', and it is the only one this app needs. */
    const tokens = scriptSrc.split(/\s+/);
    const has = t => tokens.indexOf("'" + t + "'") >= 0;
    chk('index.html ships a policy, and its script-src has no inline or eval escape',
        !!policy && has('self') && !has('unsafe-inline') && !has('unsafe-eval') && has('wasm-unsafe-eval'),
        scriptSrc.slice(0, 70));

    const attack = await cspPage.evaluate(async () => {
      const out = { pwned: 'no' };
      window.__pwned = 'no';
      const s = document.createElement('script');
      s.textContent = 'window.__pwned = "inline"';
      document.body.appendChild(s);
      out.inline = window.__pwned;
      const b = document.createElement('button');
      b.setAttribute('onclick', 'window.__pwned = "handler"');
      document.body.appendChild(b);
      b.click();
      out.handler = window.__pwned;
      out.blocks = document.querySelectorAll('[data-act]').length;
      return out;
    });
    chk('an injected inline script does not run', attack.inline === 'no', attack.inline);
    chk('an injected handler attribute does not run', attack.handler === 'no', attack.handler);
    chk('the running app still found its own actions', attack.blocks > 5, attack.blocks + ' bound controls');
    chk('the refusals are the only thing in the console', cspLog.length === 2 &&
        cspLog.every(m => /Content Security Policy/.test(m)), cspLog.length + ' messages');
    await cspPage.close();

    const bundled = fs.readFileSync(path.join(ROOT, 'dist/ancestor.html'), 'utf8');
    const bPolicy = (/Content-Security-Policy" content="([^"]+)"/.exec(bundled) || [,''])[1];
    const bScript = (bPolicy.split(';').map(s => s.trim())
      .filter(s => s.indexOf('script-src') === 0)[0] || '');
    const blocks = (bundled.match(/<script>/g) || []).length;
    const hashes = (bScript.match(/'sha256-/g) || []).length;
    /* Every inlined block, plus the three.js runtime — which is not a block in
       the file at all: it ships gzipped and the Lab builds a script element from
       it when it opens, so its hash has to be in the policy or the 3D view dies
       on the one page that cannot report it. */
    chk('the bundle permits every block it inlined, and the lazy runtime, by hash',
        hashes === blocks + 1 && bScript.indexOf('unsafe-inline') < 0,
        hashes + ' hashes for ' + blocks + ' inline blocks + 1 lazy runtime');

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
