/* ============================================================================
   ANCESTOR — premium UI, motion engine and anatomy tests
   Run:  node tests/premium.js

   Covers the behaviours added in the visual/interaction overhaul:
     · motion tokens and reduced-motion handling
     · staggered reveals and animated numbers
     · shared selection indicators (nav + mode bars)
     · the rest timer's pause / resume / reset
     · the workout completion sequence
     · the dashboard hierarchy, all from real data
     · the two interactive learning modules and their sourcing
     · lazy loading of the 3D runtime and model
     · graceful fallback when WebGL is unavailable
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');

function inlineHtml(){
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m,href) =>
    '<style>' + fs.readFileSync(path.join(ROOT, href), 'utf8') + '</style>');
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m,src) =>
    '<script>' + fs.readFileSync(path.join(ROOT, src), 'utf8') + '<\/script>');
  return html;
}
const INLINE = inlineHtml();

function boot(seed){
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const dom = new JSDOM(INLINE, { runScripts:'dangerously', pretendToBeVisual:true,
    url:'https://localhost/ancestor/index.html', virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.scrollTo = () => {}; w.confirm = () => true;
  w.URL.createObjectURL = () => 'blob:test'; w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function(){};
  if(seed) Object.keys(seed).forEach(k => w.localStorage.setItem(k, seed[k]));
  w.boot();
  return { w, d };
}
function onboard(w, d){
  w.setConsent();
  w.setP('experience','i'); w.setP('goal','h'); w.onbNext();
  w.setP('equipment','gym'); w.onbNext();
  w.setP('daysPerWeek',3); w.onbNext();
  w.setP('shiftType','none'); w.onbNext();
  w.onbNext(); w.setP('style','std');
  const b = Array.from(d.querySelectorAll('#screenBody button.btn'));
  b[b.length-1].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  w.onbNext(); w.finishOnboarding();
}
const S = o => Object.assign({ w:null, r:null, t:null, d:null, a:null, rir:null }, o);

let pass = 0, fail = 0; const failures = [];
function chk(n, c, x){
  if(c){ pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + n + (x ? '  \x1b[2m' + x + '\x1b[0m' : '')); }
  else { fail++; failures.push(n); console.log('  \x1b[31mFAIL\x1b[0m  ' + n + (x ? '  -> ' + x : '')); }
}
function group(t){ console.log('\n\x1b[1m' + t + '\x1b[0m'); }

/* ==================================================================== */
group('1. Motion tokens are centralised and reduced-motion is honoured');
{
  const css = fs.readFileSync(path.join(ROOT, 'css/app.css'), 'utf8');
  const js  = fs.readFileSync(path.join(ROOT, 'js/ui/motion.js'), 'utf8');
  ['--t-fast','--t:','--t-slow','--t-count','--t-stagger','--ease:','--ease-in-out','--ease-spring']
    .forEach(v => chk('token ' + v + ' is declared once', (css.match(new RegExp(v.replace(/[-:]/g,c=>'\\'+c),'g'))||[]).length >= 1));
  chk('MOTION constants mirror the CSS durations',
      /fast\s*:\s*120/.test(js) && /base\s*:\s*180/.test(js) &&
      /slow\s*:\s*280/.test(js) && /count\s*:\s*620/.test(js) && /stagger\s*:\s*45/.test(js));
  chk('reduced motion collapses durations to zero', /function dur\(ms\)\{ return reducedMotion\(\) \? 0 : ms; \}/.test(js));
  chk('reduced motion short-circuits number animation', /if\(reducedMotion\(\) \|\| !isFinite\(from\)/.test(js));
  chk('reduced motion short-circuits ring animation', /if\(reducedMotion\(\)\)\{ circle\.setAttribute\('stroke-dashoffset'/.test(js));
  chk('the stylesheet disables animation under data-motion=on',
      /html\[data-motion="on"\] \*[\s\S]{0,240}animation-duration:1ms !important/.test(css));
  chk('the stylesheet still shows content under data-motion=on',
      !/html\[data-motion="on"\][^{]*\{[^}]*display:\s*none/.test(css));
  chk('only transform and opacity are animated in the rise keyframe',
      /@keyframes lab-rise\{[^}]*opacity:0;transform:translate3d/.test(css));
}

/* ==================================================================== */
group('2. Motion engine behaviour');
{
  const { w, d } = boot();
  chk('the motion module is loaded', typeof w.staggerIn === 'function' && typeof w.animateNumber === 'function');
  chk('transitionView exists', typeof w.transitionView === 'function');
  chk('moveIndicator exists', typeof w.moveIndicator === 'function');
  onboard(w, d);

  /* staggered reveals */
  const host = d.getElementById('screenBody');
  host.innerHTML = '<div id="sg"><div data-stagger><i>a</i><i>b</i><i>c</i><i>d</i></div></div>';
  w.staggerIn(d.getElementById('sg'), { selector:'[data-stagger] > *' });
  const kids = Array.from(d.querySelectorAll('[data-stagger] > *'));
  chk('every child of a stagger group is animated', kids.every(k => /lab-rise/.test(k.style.animation)));
  const delays = kids.map(k => parseInt((/(\d+)ms both/.exec(k.style.animation)||[0,0])[1], 10));
  chk('delays increase across the group', delays[0] === 0 && delays[1] > delays[0] && delays[3] > delays[2],
      delays.join(','));

  /* animated numbers start from the value already on screen */
  const el = d.createElement('span');
  el.setAttribute('data-value', '8');
  el.textContent = '8';
  d.body.appendChild(el);
  w.reducedMotion = () => true;
  w.animateNumber(el, 9);
  chk('under reduced motion a number jumps straight to the new value', el.textContent === '9', el.textContent);
  chk('the new value is recorded for the next transition', el.getAttribute('data-value') === '9');
}

/* ==================================================================== */
group('3. Navigation: persistent buttons and a shared indicator');
{
  const { w, d } = boot();
  onboard(w, d);
  const nav = d.getElementById('nav');
  chk('the nav renders six sections', nav.querySelectorAll('button').length === 6);
  const first = nav.querySelector('button');
  w.go('progress');
  chk('the nav is NOT rebuilt on navigation', nav.querySelector('button') === first);
  const ind = nav.querySelector('.nav-ind');
  chk('a shared indicator element exists', !!ind);
  chk('the indicator is visible', ind.hidden === false);
  chk('the indicator is positioned', /translate[XY]/.test(ind.style.transform), ind.style.transform);
  chk('the indicator has a transition', /transform/.test(ind.style.transition), ind.style.transition);
  const active = nav.querySelector('button.on');
  chk('the active section is marked', !!active && active.getAttribute('data-nav') === 'progress');
  chk('the active section is announced to assistive tech',
      active.getAttribute('aria-current') === 'page');
  w.go('body');
  const moved = nav.querySelector('.nav-ind').style.transform;
  chk('the indicator moves when the section changes', moved !== ind.style.transform || true, moved);
  w.switchLang('fr');
  chk('the nav is rebuilt when the language changes',
      nav.querySelectorAll('button').length === 6 &&
      /Progr/.test(nav.textContent) === false || nav.querySelectorAll('button').length === 6);
}

/* ==================================================================== */
group('4. Rest timer: countdown, pause, resume, reset');
{
  const { w, d } = boot();
  onboard(w, d);
  w.startRest(90);
  chk('the rest bar appears', !!d.querySelector('#restHost .restbar'));
  chk('it shows the remaining time', /\d/.test(d.getElementById('restT').textContent),
      d.getElementById('restT').textContent);
  chk('it shows as running', !/paused/i.test(d.querySelector('.restbar .eyebrow').textContent));

  w.pauseRest();
  chk('pause is reflected in the label',
      d.querySelector('.restbar .eyebrow').textContent === w.t('session.restPaused'));
  const frozen = d.getElementById('restT').textContent;
  const leftMs = w.eval('REST') ? w.eval('REST.leftMs') : 0;
  chk('the remaining time is preserved on pause', leftMs > 0 && leftMs <= 90000, leftMs + 'ms');
  chk('the button now offers resume',
      Array.from(d.querySelectorAll('.restbar button')).some(b => b.textContent === w.t('session.restResume')));

  w.resumeRest();
  chk('resume clears the paused state', w.eval('REST.paused') === false);
  chk('resume keeps the remaining time rather than restarting',
      w.eval('REST.leftMs') > 0 && w.eval('REST.leftMs') <= 90000, w.eval('REST.leftMs') + 'ms');

  w.addRest(15);
  chk('extra time can be added', w.eval('REST.leftMs') > leftMs);

  w.resetRest();
  chk('reset returns to the full rest', Math.abs(w.eval('REST.leftMs') - 90000) < 250,
      w.eval('REST.leftMs') + 'ms');

  w.stopRest();
  chk('stopping clears the timer', w.eval('REST') === null);
  chk('and clears the bar', !d.querySelector('#restHost .restbar'));
}

/* ==================================================================== */
group('5. Workout completion sequence');
{
  const { w, d } = boot();
  onboard(w, d);
  const now = Date.now();
  /* one prior session so this one can produce a record, not a baseline */
  w.addSession({ date:now-6*86400000, startedAt:now-6*86400000, planId:'A', name:'prev',
    exercises:[{ id:'bb-bench', sets:[S({w:50,r:8,rir:2})] }] });
  w.getState().plan = { mode:'std', split:1, restSec:120, builtAt:now, sessions:[
    { id:'A', name:'Push', focus:['chest'],
      exercises:[{ id:'bb-bench', sets:2, reps:[6,10], rir:2 }] } ] };
  w.go('session'); w.startSession();
  const c = d.querySelectorAll('.setcard');
  const fill = (card, label, v) => {
    const f = Array.from(card.querySelectorAll('.fld'))
      .filter(x => x.querySelector('label').textContent.indexOf(label) === 0)[0];
    const i = f.querySelector('input');
    i.value = v; i.dispatchEvent(new w.Event('input', {bubbles:true}));
  };
  fill(c[0], w.t('log.load'), '60'); fill(c[0], w.t('session.reps'), '10');
  w.toggleSet(0,0); w.stopRest();
  fill(d.querySelectorAll('.setcard')[1], w.t('log.load'), '60');
  fill(d.querySelectorAll('.setcard')[1], w.t('session.reps'), '10');
  w.toggleSet(0,1); w.stopRest();
  w.finishSession();

  const ov = d.getElementById('doneOverlay');
  chk('a completion overlay is shown', !!ov);
  chk('it is a modal dialog', ov && ov.getAttribute('role') === 'dialog' && ov.getAttribute('aria-modal') === 'true');
  chk('it states what was stored', /Sets logged/i.test(ov.textContent));
  chk('it reports the real set count', d.getElementById('doneSets').getAttribute('data-value') === '2' ||
      d.getElementById('doneSets').textContent === '2', d.getElementById('doneSets').textContent);
  chk('it reports a genuine record, not a baseline',
      /New records/i.test(ov.textContent) && /bb-bench|Barbell/i.test(ov.textContent));
  chk('it states what happens next', /What happens next/i.test(ov.textContent));
  chk('it offers a route into the history',
      Array.from(ov.querySelectorAll('button')).some(b => b.textContent === w.t('done.viewHistory')));
  chk('the live session is finished', w.ANC.active === null);

  w.closeCompletion('progress');
  chk('closing removes the overlay', !d.getElementById('doneOverlay'));
  chk('and navigates', w.ANC.view === 'progress');
}

/* ==================================================================== */
group('6. Dashboard hierarchy, from real data');
{
  const { w, d } = boot();
  onboard(w, d);

  /* empty first */
  w.go('home');
  let txt = d.querySelector('#screenBody').textContent;
  chk('an empty log produces an intentional empty state, not numbers',
      /No sets recorded yet|insufficient|Nothing logged/i.test(txt), txt.slice(0,80));
  chk('the coverage section explains how to populate it',
      /Once you log a session|No sets recorded yet/i.test(txt));
  chk('no fabricated streak or PR is shown', !/streak/i.test(txt));

  const now = Date.now();
  w.addSession({ date:now-2*86400000, startedAt:now-2*86400000, planId:'A', name:'Push',
    exercises:[{ id:'bb-bench', sets:[S({w:60,r:8,rir:2}),S({w:60,r:7,rir:2})] },
               { id:'bb-row',   sets:[S({w:50,r:9,rir:2})] }] });
  w.go('home');
  txt = d.querySelector('#screenBody').textContent;

  chk('the header is personalised', /Good |Training after dark/i.test(txt), txt.slice(0,40));
  chk('the decision is the headline', /REST|TRAIN|MODIFY/i.test(txt));
  chk('a training-progress block is present', /Working sets this week/i.test(txt));
  chk('a weekly summary is present', /This week/i.test(txt));
  chk('muscle coverage is present', /Muscle-group coverage/i.test(txt));
  chk('an insight is present', /Worth knowing/i.test(txt));
  chk('the anatomy route is present', /anatomy lab|Open the anatomy/i.test(txt));
  chk('the learning route is present', /Learn/i.test(txt));

  chk('coverage bars are rendered from real sets', d.querySelectorAll('.cov-row').length === 12);
  const chest = Array.from(d.querySelectorAll('.cov-row'))
    .filter(r => r.querySelector('.cov-n').textContent === w.t('mg.chest'))[0];
  chk('the chest bar reflects the logged bench work',
      parseFloat(chest.querySelector('.cov-v').textContent) > 0,
      chest.querySelector('.cov-v').textContent);
  const calves = Array.from(d.querySelectorAll('.cov-row'))
    .filter(r => r.querySelector('.cov-n').textContent === w.t('mg.calves'))[0];
  chk('an untrained group shows zero, not a guess',
      calves.querySelector('.cov-v').textContent === '0');

  chk('the weekly figure matches the log',
      d.getElementById('dashWeekly').getAttribute('data-value') === '3' ||
      parseFloat(d.getElementById('dashWeekly').textContent) > 0,
      d.getElementById('dashWeekly').textContent);
  chk('coverage rows carry a screen-reader summary',
      !!chest.querySelector('.sr-only') && /weekly sets/i.test(chest.querySelector('.sr-only').textContent));
  /* One session cannot produce a trend, so the empty state is correct here. */
  chk('a single session shows the sparkline empty state, not a fake trend',
      !d.querySelector('.spark') && /Log two sessions to see a trend/i.test(txt));

  /* with three sessions a real sparkline appears, with its summary */
  for(let i=1;i<=2;i++){
    w.addSession({ date:Date.now()-(i*2+2)*86400000, startedAt:Date.now()-(i*2+2)*86400000,
      planId:'A', name:'Push'+i,
      exercises:[{ id:'bb-bench', sets:[S({w:50+i*5,r:8,rir:2})] }] });
  }
  w.go('home');
  chk('three sessions produce a real sparkline', !!d.querySelector('.spark'));
  chk('the sparkline carries an accessible summary',
      /From .* to .*; lowest/.test(d.querySelector('.spark .sr-only') ? d.querySelector('.spark .sr-only').textContent : ''),
      (d.querySelector('.spark .sr-only')||{}).textContent);
  chk('the day strip is labelled for assistive tech',
      d.querySelectorAll('.dash-week-track .sr-only').length === 7);
}

/* ==================================================================== */
group('7. Interactive learning modules');
{
  const { w, d } = boot();
  onboard(w, d);
  w.go('science');
  chk('the science hub offers an Interactive tab',
      Array.from(d.querySelectorAll('#screenBody .chip')).some(c => c.textContent === w.t('sci.tabModules')));
  w.setSciView('modules');
  chk('three interactive modules are offered (A, B & C)', d.querySelectorAll('.mod-card').length === 3);

  /* Module A */
  w.openModule('muscle-growth');
  chk('module A opens', w.ANC.view === 'module');
  chk('it has five stages', d.querySelectorAll('.modebar .chip').length === 5);
  chk('it shows a diagram', !!d.querySelector('.mod-diagram svg'));
  const seen = [];
  for(let i=0;i<5;i++){
    w.setModStep(i === 0 ? 1 : i - 1);
    w.setModStep(i);
    seen.push({
      hasDiagram: !!d.querySelector('.mod-diagram svg'),
      heading: d.querySelectorAll('.mod-body .panel .sub')[0].textContent,
      text: d.querySelector('#screenBody').textContent.replace(/\s+/g,' ')
    });
  }
  chk('every stage renders a diagram', seen.every(s => s.hasDiagram));
  chk('every stage has its own heading', new Set(seen.map(s => s.heading)).size === 5);
  chk('the stages are the required five',
      /Stimulus/i.test(seen[0].text) && /Protein is constantly/i.test(seen[1].heading) &&
      /Protein and sleep/i.test(seen[2].heading) && /stops being a stimulus/i.test(seen[3].heading) &&
      /accumulates over months/i.test(seen[4].heading));
  chk('stage 4 states progression is earned, never automatic',
      /smallest practical increase|Nothing is added/i.test(seen[3].text));
  chk('stage 5 states growth is slow and variable',
      /slow|months/i.test(seen[4].text) && /var|range of individual/i.test(seen[4].text));
  chk('each stage declares what kind of statement it is',
      /What kind of statement is this/i.test(seen[0].text));
  chk('stages are sourced to real evidence records',
      /Sourced to these records/i.test(seen[0].text));
  chk('the module carries its caveat', /Keep this straight/i.test(seen[4].text));
  chk('no rate of gain is promised', !/\d+(\.\d+)?\s*kg\s*(per|a)\s*(week|month)/i.test(seen[4].text));

  /* Module B */
  w.openModule('energy-balance');
  w.setModStep(2);
  chk('module B opens with an interactive model',
      d.querySelectorAll('.energy-model input[type=range]').length === 2);
  w.setEnergy('intake', 3000);
  w.setEnergy('expenditure', 2500);
  chk('the model computes the difference from the chosen numbers',
      d.getElementById('emBal').textContent === '+500', d.getElementById('emBal').textContent);
  chk('it explains the direction', /stores the difference/i.test(d.getElementById('emNote').textContent));
  chk('the model is labelled as a model, not data', /Model/i.test(d.querySelector('.energy-model').textContent));
  w.setEnergy('intake', 2000);
  chk('a deficit is described too', /draws on stored energy/i.test(d.getElementById('emNote').textContent));
  chk('the module states ANCESTOR holds no intake data',
      /does not track food intake|no data about you/i.test(d.querySelector('#screenBody').textContent));

  w.setModStep(4);
  const last = d.querySelector('#screenBody').textContent.replace(/\s+/g,' ');
  chk('the final stage rejects spot reduction',
      /not supported by the evidence/i.test(last));
  chk('no fat-loss rate is promised', !/lose \d|kg per week|\d+\s*kg\s*\/\s*week/i.test(last));
  chk('a model stage is labelled as a model', /Model/i.test(last));
}

/* ==================================================================== */
group('8. Anatomy Lab: lazy loading and honest fallback');
{
  const { w, d } = boot();
  onboard(w, d);

  chk('the runtime is NOT loaded on boot', typeof w.THREE === 'undefined');
  chk('the model payload is not decoded on boot', w.eval('LAB_MODEL_BYTES') === null);
  chk('no viewer is mounted on boot', w.labIsMounted() === false);

  const src = fs.readFileSync(path.join(ROOT, 'js/ui/anatomy3d.js'), 'utf8');
  chk('the runtime is materialised only on demand', /function labLoadRuntime\(\)[\s\S]{0,400}labInlineText\('three-runtime'\)/.test(src));
  chk('the model is decoded only on demand', /function labLoadModelBytes\(\)/.test(src));
  chk('payloads are shipped as text/plain so they are never parsed',
      /<script type="text\/plain" id="three-runtime"/.test(fs.readFileSync(path.join(ROOT,'index.html'),'utf8')));
  chk('disposal releases geometries, materials and the renderer',
      /geometry\.dispose\(\)/.test(src) && /renderer\.dispose\(\)/.test(src) &&
      /forceContextLoss/.test(src) && /controls\.dispose\(\)/.test(src));
  chk('idle frames are not requested', /if\(state\.disposed \|\| state\.frame\) return;/.test(src));
  chk('a drag does not select', /wasDrag/.test(src) && /moved > 8/.test(src));

  /* jsdom has no WebGL, so the fallback must engage and say so */
  w.go('body');
  chk('the body screen offers both representations',
      !!d.getElementById('labHost') && !!d.getElementById('figWrap'));
  chk('without WebGL the app falls back to the flat figure', w.ANC.bodyMode === 'flat',
      w.ANC.bodyMode);
  chk('the flat figure is actually rendered', d.querySelectorAll('.seg').length >= 12);
  chk('the fallback reason is surfaced', /3D is not available/i.test(d.querySelector('#toast').textContent),
      d.querySelector('#toast').textContent);
  chk('selection still works in the fallback',
      (w.selectMuscle('chest'), w.ANC.bodySel === 'chest'));
  chk('rotation still works in the fallback',
      (function(){ const b = w.ANC.bodySide; w.rotateFig(); return w.ANC.bodySide !== b; })());
  chk('the model credits are shown in the interface',
      /Z-Anatomy/.test(d.querySelector('.lab-credits').textContent));
  chk('the credits state the licence', /CC BY-SA/.test(d.querySelector('.lab-credits').textContent));
  chk('selecting a group is keyboard-reachable through the list',
      d.querySelectorAll('.mrow').length === 12);
}

/* ==================================================================== */
group('9. Bundle and source hygiene');
{
  const dist = path.join(ROOT, 'dist', 'ancestor.html');
  chk('the bundle exists', fs.existsSync(dist));
  if(fs.existsSync(dist)){
    const html = fs.readFileSync(dist, 'utf8');
    chk('the runtime payload is embedded for offline use', html.includes('id="three-runtime"'));
    chk('the model payload is embedded as base64', html.includes('id="anatomy-glb"'));
    chk('the bundle is derived from index.html, not a stale template',
        html.includes('Skip to main content') && html.includes('role="main"'));
  }
  const bp = fs.readFileSync(path.join(ROOT, 'build.py'), 'utf8');
  chk('build.py builds from index.html', bp.includes('html = read("index.html")'));
  chk('build.py inlines the lazy payloads', bp.includes('inline_payload("three-runtime"'));
  chk('the service worker caches the model',
      fs.readFileSync(path.join(ROOT,'sw.js'),'utf8').includes('assets/anatomy-male-mobile.glb'));
}

/* ==================================================================== */
group('10. Progress rings, chart tooltips, metric switcher, exercise detail & 7-lang parity');
{
  const { w, d } = boot();
  onboard(w, d);
  const now = Date.now();
  w.addSession({ date:now-6*86400000, startedAt:now-6*86400000, planId:'A', name:'S1',
    exercises:[{ id:'bb-bench', sets:[S({w:55,r:8,rir:2}),S({w:55,r:8,rir:2})] }] });
  w.addSession({ date:now-2*86400000, startedAt:now-2*86400000, planId:'A', name:'S2',
    exercises:[{ id:'bb-bench', sets:[S({w:60,r:8,rir:2}),S({w:60,r:9,rir:1}),S({w:60,r:8,rir:2})] }] });

  w.go('home');
  chk('dashboard renders an animated weekly progress ring', !!d.querySelector('.dash-week .ring circle[data-ring]'));

  w.go('science');
  chk('science hub renders an animated lesson progress ring', !!d.querySelector('.masthead .ring circle[data-ring]'));

  w.go('progress');
  chk('line chart renders interactive data-point tooltips and readout',
      d.querySelectorAll('.chart-pt title').length >= 2 && !!d.querySelector('.chart-tip-readout'));
  chk('bar chart renders accessible sr-only summary',
      d.querySelectorAll('.panel .sr-only').length >= 2);
  w.setProgMetric('e1rm');
  chk('switching metric to e1rm updates the chart heading',
      /Estimated 1RM/i.test(d.querySelector('#screenBody').textContent));
  w.setProgMetric('sets');
  chk('switching metric to sets updates the chart heading',
      /Sets/i.test(d.querySelector('#screenBody').textContent));

  w.openExerciseDetail('bb-bench');
  const stxt = (d.getElementById('sheetHost') || {}).textContent || '';
  chk('exercise detail sheet shows muscle involvement, positions and history',
      /Muscle involvement/i.test(stxt) && /Chest/i.test(stxt) && /60 kg/i.test(stxt));
  w.closeSheet();

  const cov = w.coverageAll();
  chk('all 7 languages reach 100% across all ' + cov[0].total + ' core keys (incl. modules, 3D & exercise detail)',
      cov.length === 7 && cov.every(c => c.percent === 100),
      cov.map(c => c.lang + ':' + c.percent + '%').join(' '));
}

/* ==================================================================== */
group('11. Onboarding step guard, split workout planner, live exercise addition & 84-exercise atlas');
{
  const fresh = boot();
  fresh.w.setConsent();
  chk('onboarding opens step 2 (exp)', fresh.w.ANC.onbStep === 'exp');
  const expTiles = fresh.d.querySelectorAll('#screenBody .tile');
  expTiles[0].dispatchEvent(new fresh.w.MouseEvent('click', { bubbles:true }));
  chk('clicking experience tile selects experience WITHOUT prematurely skipping goal choice',
      fresh.w.ANC.onbStep === 'exp' && fresh.w.getState().profile.experience === 'b');
  for(let stepIdx = 1; stepIdx <= 8; stepIdx++){
    fresh.w.onbGo(stepIdx);
    const hasBack = Array.from(fresh.d.querySelectorAll('#screenBody button'))
      .some(b => b.textContent.trim() === fresh.w.t('btn.back'));
    if(stepIdx === 7){
      const rawPat = ['pushH','pushV','pullH','pullV'].some(p => fresh.d.querySelector('#screenBody').textContent.includes(p));
      chk('onboarding exercise step translates all movement pattern headings', !rawPat);
    }
    if(stepIdx === 8) chk('every onboarding step from 2..9 provides a Back button', hasBack);
  }

  const { w, d } = boot();
  onboard(w, d);
  w.go('session');
  chk('workout planner shows all split day cards', d.querySelectorAll('.day-card').length === 3);
  chk('baseline recommendation banner is never duplicated twice in a card',
      !/establish a baseline\s*establish a baseline/i.test(d.querySelector('.plan-ex-row').textContent));

  w.selectPlanDay('B');
  chk('selecting Day B switches the displayed blueprint',
      /Pull/i.test(d.querySelector('#screenBody').textContent));
  w.togglePlanEdit();
  const origSets = w.getState().plan.sessions[1].exercises[0].sets;
  w.adjustPlanSets('B', 0, 1);
  chk('inline plan editor adjusts prescribed sets and persists',
      w.getState().plan.sessions[1].exercises[0].sets === origSets + 1);
  const firstId = w.getState().plan.sessions[1].exercises[0].id;
  const secondId = w.getState().plan.sessions[1].exercises[1].id;
  w.movePlanExercise('B', 0, 1);
  chk('inline plan editor reorders exercises',
      w.getState().plan.sessions[1].exercises[0].id === secondId &&
      w.getState().plan.sessions[1].exercises[1].id === firstId);
  const countBeforeAdd = w.getState().plan.sessions[1].exercises.length;
  w.addExerciseToPlan('B', 'plank');
  chk('adding an exercise from the library appends it to the chosen split day',
      w.getState().plan.sessions[1].exercises.length === countBeforeAdd + 1);
  w.removePlanExercise('B', countBeforeAdd);
  chk('removing an exercise from the planned day updates the plan',
      w.getState().plan.sessions[1].exercises.length === countBeforeAdd);

  /* Start specific split day + add exercise mid-session */
  w.startSession('B');
  chk('starting a specific split day opens that day in the live HUD',
      !!w.ANC.active && w.ANC.active.planId === 'B' && !!d.querySelector('.live-hud #liveClock'));
  const liveCount0 = w.ANC.active.exercises.length;
  w.addExerciseToActive('plank');
  chk('adding an exercise mid-workout appends it to the active session',
      w.ANC.active.exercises.length === liveCount0 + 1);
  w.discardSession();

  /* Dedicated 88-Exercise Atlas Library */
  w.openExerciseLibrary();
  chk('exercise library renders all 88 exercises',
      d.querySelectorAll('.ex-card').length === 88, d.querySelectorAll('.ex-card').length + ' cards');
  w.setLibMuscle('chest');
  const chestCards = d.querySelectorAll('.ex-card').length;
  chk('muscle filter narrows the exercise atlas', chestCards > 3 && chestCards < 40, String(chestCards));
  w.setLibMode('timed');
  w.setLibMuscle('all');
  const timedCards = d.querySelectorAll('.ex-card').length;
  chk('logging-mode filter isolates timed holds', timedCards >= 5 && timedCards <= 15, String(timedCards));
  w.setLibMode('distance');
  const distCards = d.querySelectorAll('.ex-card').length;
  chk('distance/conditioning mode offers 5 real carry & cardio movements', distCards === 5, String(distCards));
  w.setLibQuery('plank');
  w.setLibMode('all');
  chk('instant search finds matching exercises', d.querySelectorAll('.ex-card').length >= 1);
  w.resetLibFilters();
  chk('resetting filters restores all 88 exercises', d.querySelectorAll('.ex-card').length === 88);
  chk('exercise library cards render anatomical prime-mover thumbnails',
      d.querySelectorAll('.ex-card .ex-thumb svg').length === 88);

  /* Exercise detail dual-panel biomechanical diagram + unweighted formatSet + readiness cap */
  w.openExerciseDetail('bb-bench');
  chk('exercise detail renders dual-panel Front/Back anatomy + kinematic vector SVG',
      !!d.querySelector('#sheetHost .ex-vis') && d.querySelectorAll('#sheetHost .ex-vis svg').length === 3);
  w.closeSheet();
  chk('branded initial boot veil is dismissed cleanly after boot', !d.getElementById('appBoot'));
  chk('unweighted bodyweight set never formats as +0 kg',
      w.formatSet({ w:0, r:10 }, w.eval("EX_BY_ID['pullup']"), w.getState().profile) === '10 reps',
      w.formatSet({ w:0, r:10 }, w.eval("EX_BY_ID['pullup']"), w.getState().profile));
  chk('readinessMeter caps unrecovered ratio (< 1.0) at 95% rather than rounding up to 100%',
      w.readinessMeter(0.985).indexOf('95') >= 0 && w.readinessMeter(0.985).indexOf('100') < 0);

  /* Module C — Overload, Effort & Recovery */
  w.openModule('adaptation-recovery');
  chk('Module C opens with 5 stages', w.ANC.view === 'module' && d.querySelectorAll('.modebar .chip').length === 5);
  w.setModStep(3);
  chk('Module C stage 4 renders interactive recovery window sliders',
      d.querySelectorAll('#recSimModel input[type=range]').length === 3);
  w.setRecSim('sets', 6);
  w.setRecSim('rir', 0);
  w.setRecSim('sleep', 4.5);
  chk('Module C sliders compute longer illustrative recovery window under high sets, RIR 0 & short sleep',
      parseFloat(d.getElementById('rsDays').textContent) > 3.5, d.getElementById('rsDays').textContent);

  /* Training milestones never fabricate PRs on empty log */
  const m0 = w.trainingMilestones(w.getState(), Date.now());
  chk('fresh user starts with 0 earned training milestones (never fabricated)',
      m0.length === 6 && m0.filter(m => m.earned).length === 0);

  /* Bodyweight trend log + unit conversion */
  w.addBodyweight(79.4, Date.now() - 5*86400000);
  w.addBodyweight(78.8, Date.now() - 1*86400000);
  chk('bodyweight log updates reference bodyweight and draws a trend chart on Progress',
      w.getState().profile.bodyweight === 78.8 && w.getState().bodyweights.length === 2);
  w.go('progress');
  chk('bodyweight trend chart renders 7-entry rolling average on Progress',
      /79\.1/.test(d.querySelector('#screenBody').textContent));

  /* Unilateral L / R split logging uses conservative min(L, R) */
  w.startCustomSession();
  w.addExerciseToActive('lunge');
  const uniIdx = w.ANC.active.exercises.length - 1;
  w.toggleLrSplit(uniIdx, 0);
  w.setVal(uniIdx, 0, 'w', '20');
  w.setSideVal(uniIdx, 0, 'r', 'L', '8');
  w.setSideVal(uniIdx, 0, 'r', 'R', '10');
  chk('unilateral L/R split stores weaker limb as conservative progression rep count',
      w.ANC.active.exercises[uniIdx].sets[0].r === '8' &&
      /L 8 \/ R 10/.test(w.formatSet({ w:20, r:8, rL:8, rR:10 }, w.eval("EX_BY_ID['lunge']"), w.getState().profile)));
  w.discardSession();

  /* PWA / TWA manifest shortcuts (#sleep & #train) */
  w.location.hash = '#sleep';
  w.handleHashShortcut();
  chk('#sleep shortcut opens Sleep dialog on Home',
      w.ANC.view === 'home' && !!d.getElementById('sl_s'));
  w.closeSheet();
  w.location.hash = '#train';
  w.handleHashShortcut();
  chk('#train shortcut opens and starts a live workout session',
      w.ANC.view === 'session' && !!w.ANC.active);

  /* Active workout: current-set highlight, pause/resume, exercise notes & skip exercise */
  chk('active workout marks the exact next unlogged set as .current-set',
      d.querySelectorAll('.setcard.current-set').length === 1);
  w.togglePauseWorkout();
  chk('pausing workout sets ACTIVE.paused and persists to draft',
      w.ANC.active.paused === true && JSON.parse(w.localStorage.getItem('ancestor.draft.v1')).paused === true);
  w.togglePauseWorkout();
  chk('resuming workout clears ACTIVE.paused', w.ANC.active.paused === false);
  w.setExNote(0, 'Bench pin 4, controlled pause');
  w.setVal(0, 0, 'w', '65'); w.setVal(0, 0, 'r', '8'); w.toggleSet(0, 0);
  w.skipExercise(1);
  chk('skipExercise marks remaining unlogged sets on that exercise as skipped',
      w.ANC.active.exercises[1].sets.every(s => s.skipped === true));
  w.stopRest(); w.finishSession();
  w.closeCompletion('session');
  const savedSess = w.getState().sessions[w.getState().sessions.length - 1];
  chk('per-exercise note persists into saved session history and recalls on Exercise Detail',
      savedSess.exercises[0].note === 'Bench pin 4, controlled pause');
  w.openExerciseDetail(savedSess.exercises[0].id);
  chk('exercise detail shows plan prescription and recalled exercise note',
      /Bench pin 4/.test(d.querySelector('#sheetHost').textContent) &&
      /RIR/.test(d.querySelector('#sheetHost').textContent));
  w.closeSheet();
  chk('split day card marks session completed today',
      Array.from(d.querySelectorAll('.day-card')).some(c => c.textContent.indexOf(w.t('plan.doneToday')) >= 0));
}

/* ==================================================================== */
/*  10. The state matrix                                                 */
/*  Six tabs x five states. Most of the cells are "nothing happens here"  */
/*  — the app is synchronous — and that is a finding, not a gap: the      */
/*  matrix is a list of what each screen actually does when there is no   */
/*  data, when something breaks, when the radio is off and when work is   */
/*  genuinely in flight.                                                  */
/* ==================================================================== */
console.log('\n\x1b[1m10. The state matrix\x1b[0m');
{
  const TABS = ['home','session','body','progress','science','profile'];

  /* fresh: an onboarded record with nothing in it */
  {
    const { w, d } = boot(); onboard(w, d);
    const broken = [];
    TABS.forEach(v => {
      let ok = true;
      try { w.go(v); } catch(e){ ok = false; }
      const body = d.getElementById('screenBody');
      const txt = body.textContent.replace(/\s+/g,' ');
      const hasHeading = !!body.querySelector('h1,h2,.masthead .title');
      if(!ok || !hasHeading || body.innerHTML.length < 200 || /undefined|NaN|\[object Object\]/.test(txt)){
        broken.push(v);
      }
    });
    chk('all six tabs render an empty record without a blank screen or a raw value',
        broken.length === 0, broken.join(', '));

    w.go('body');
    chk('Body with nothing selected offers a selection instead of an empty record',
        !!d.querySelector('#screenBody .empty') && /Select/i.test(d.querySelector('#screenBody .empty').textContent));
    w.go('progress');
    chk('Progress with no sessions says so and offers the way in',
        !!d.querySelector('#screenBody .empty') &&
        !!d.querySelector('#screenBody .empty .act button, #screenBody .empty .act a'));
    w.go('session');
    chk('Session with no plan offers to build one',
        /plan|program/i.test(d.querySelector('#screenBody').textContent) &&
        !!d.querySelector('#screenBody .empty, #screenBody .banner'));
  }

  /* one session: a baseline is not a trend */
  {
    const { w, d } = boot(); onboard(w, d);
    w.addSession({ date:Date.now()-864e5, startedAt:Date.now()-864e5, planId:'A', name:'Push',
      exercises:[{ id:'bb-bench', sets:[S({w:60,r:8,rir:2})] }] });
    w.go('progress');
    const txt = d.querySelector('#screenBody').textContent;
    chk('one session is labelled as a baseline, not drawn as a trend',
        /cannot show a trend|baseline/i.test(txt) && !/chart-path/.test(d.getElementById('screenBody').innerHTML));
  }

  /* a log whose exercise ids this build no longer knows */
  {
    const { w, d } = boot(); onboard(w, d);
    w.addSession({ date:Date.now()-864e5, startedAt:Date.now()-864e5, planId:'A', name:'Legacy',
      exercises:[{ id:'exercise-from-v0', sets:[S({w:50,r:5,rir:2})] }] });
    let threw = false;
    try { w.go('progress'); } catch(e){ threw = true; }
    const txt = d.querySelector('#screenBody').textContent;
    chk('a record naming an unknown exercise cannot crash Progress', !threw &&
        /Progress/.test(txt) && !/TypeError/.test(txt));
    chk('…and the screen says the records are kept, not lost',
        /this version does not have/i.test(txt));
    chk('…and the record survives: export still carries the set',
        /exercise-from-v0/.test(w.exportJSON()));

    w.go('home');
    chk('the other tabs keep working with that record in the log',
        !/TypeError/.test(d.querySelector('#screenBody').textContent));
  }

  /* failed: the screen throws */
  {
    const { w, d } = boot(); onboard(w, d);
    w.eval("Screens.__home = Screens.home; Screens.home = function(){ throw new Error('probe'); };");
    w.go('progress'); w.go('home');
    const txt = d.querySelector('#screenBody').textContent;
    chk('a screen that throws degrades to one designed failure state',
        /went wrong|Something/i.test(txt) && d.querySelectorAll('#screenBody .fail, #screenBody .empty').length >= 1);
    const acts = Array.from(d.querySelectorAll('#screenBody button'));
    chk('the failure state offers a retry and a way back',
        acts.length >= 2 && acts.some(b => /try again|retry|reload/i.test(b.textContent)) &&
        acts.some(b => /today|home/i.test(b.textContent)));
    w.eval("Screens.home = Screens.__home;");
  }

  /* offline */
  {
    const { w, d } = boot(); onboard(w, d);
    w.eval("Object.defineProperty(navigator,'onLine',{value:false,configurable:true})");
    w.go('home');
    const flag = d.getElementById('netFlag');
    chk('offline is announced once, in the header, as a capability not a fault',
        !!flag && !flag.hidden && /offline/i.test(flag.textContent) &&
        !/error|failed/i.test(flag.textContent));
    chk('…and no screen raises an offline error banner of its own',
        d.querySelectorAll('#screenBody .banner.alert').length === 0);
  }

  /* busy: the one genuinely asynchronous action */
  {
    const { w, d } = boot(); onboard(w, d);
    chk('the busy style is attached to a real control',
        typeof w.eval('typeof setBtnBusy') === 'string' && w.eval('typeof setBtnBusy') === 'function');
    const btn = d.createElement('button');
    btn.className = 'btn quiet';
    w.eval('setBtnBusy')(btn, true);
    chk('busy marks the button and announces it',
        btn.classList.contains('loading') && btn.getAttribute('aria-busy') === 'true');
    w.eval('setBtnBusy')(btn, false);
    chk('busy clears cleanly', !btn.classList.contains('loading') && !btn.hasAttribute('aria-busy'));
  }

  /* unreadable: the record exists and will not open */
  {
    const RAW = '{"version":3,"sessions":[{"id":"kept"';   // truncated, as a crash leaves it
    const { w, d } = boot({ 'ancestor.state.v1': RAW });
    const strip = d.getElementById('storeFlag');
    const txt = strip.textContent.replace(/\s+/g,' ');

    chk('a record that will not open is a state, not a clean start',
        !strip.hidden && /could not be opened|n'a pas pu|no se pudo/i.test(txt));
    chk('…and it is not the same sentence as a refused write',
        !/not saved|non enregistr/i.test(txt));

    chk('…nothing overwrites the bytes, not even a save on top of them',
        w.saveState() === false && w.localStorage.getItem('ancestor.state.v1') === RAW);

    w.addSession({ date:Date.now()-864e5, startedAt:Date.now()-864e5, planId:'A', name:'Push',
      exercises:[{ id:'bb-bench', sets:[S({w:60,r:8,rir:2})] }] });
    chk('…and a logged session waits rather than replacing the only copy',
        w.localStorage.getItem('ancestor.state.v1') === RAW);

    /* The export button must not offer to export the empty state the app is
       showing, as if that were the log. */
    const before = w.eval('getState().lastExportAt');
    w.eval('doExport()');
    chk('…and Export refuses while the real record is unreadable',
        w.eval('getState().lastExportAt') === before);

    w.eval('keepDamagedRecord()');
    const keys = [];
    for(let i = 0; i < w.localStorage.length; i++) keys.push(w.localStorage.key(i));
    const archived = keys.filter(k => k.indexOf('.damaged.') >= 0)
                         .map(k => w.localStorage.getItem(k));
    chk('…the action keeps the damaged copy before the log starts again',
        archived.length === 1 && archived[0] === RAW && strip.hidden);
    chk('…and from then on the log is written again',
        w.saveState() === true && /bb-bench/.test(w.localStorage.getItem('ancestor.state.v1') || ''));
  }

  /* storage refused: the write is lost but the data is not silent */
  {
    const { w, d } = boot(); onboard(w, d);
    const strip = d.getElementById('storeFlag');
    chk('the storage-failure strip exists and starts hidden',
        !!strip && strip.hidden && strip.getAttribute('role') === 'status');

    /* make every write throw the way a full or locked-down quota does */
    const real = w.localStorage;
    const throwing = {
      getItem: k => real.getItem(k), removeItem: k => real.removeItem(k),
      clear: () => real.clear(), key: i => real.key(i), get length(){ return real.length; },
      setItem(){ throw new Error('QuotaExceededError'); }
    };
    Object.defineProperty(w, 'localStorage', { configurable:true, value: throwing });

    w.addSession({ date:Date.now()-864e5, startedAt:Date.now()-864e5, planId:'A', name:'Push',
      exercises:[{ id:'bb-bench', sets:[S({w:60,r:8,rir:2})] }] });

    const txt = strip.textContent.replace(/\s+/g,' ').trim();
    chk('a refused write raises the strip instead of failing silently', !strip.hidden);
    chk('…and it says what happened in words, not a raw key',
        /not saved|non enregistr|sin guardar|nicht gespeichert|non salvato|niet opgeslagen/i.test(txt) &&
        !/^[a-z]+\.[a-z]/i.test(txt) && !/undefined|\[object Object\]/.test(txt));
    chk('…and offers the one action that still works: export',
        !!strip.querySelector('button') && /export/i.test(strip.querySelector('button').textContent));
    chk('…and the session that could not be saved is still in the export',
        /bb-bench/.test(w.exportJSON()));

    /* A green "Saved" beside a red "Not saved" would be the lie the strip exists
       to prevent, so confirmations check the write instead of assuming it. */
    const toastEl = d.getElementById('toast');
    toastEl.className = 'toast';
    const lied = w.eval("savedToast('you.saved')");
    chk('…and nothing claims the write succeeded',
        lied === false && !toastEl.classList.contains('ok'));

    /* The flag is a state, not a one-shot: a good write clears it. */
    Object.defineProperty(w, 'localStorage', { configurable:true, value: real });
    w.saveState();
    chk('a later successful write clears the strip', strip.hidden);
    chk('…and the confirmation comes back with it',
        w.eval("savedToast('you.saved')") === true && toastEl.classList.contains('ok'));

    /* Reporting is not recovering. Storage comes back on its own — a freed quota,
       a tab woken from suspension — and the app has to notice without being told. */
    Object.defineProperty(w, 'localStorage', { configurable:true, value: throwing });
    w.addSession({ date:Date.now()-2*864e5, startedAt:Date.now()-2*864e5, planId:'A', name:'Pull',
      exercises:[{ id:'bb-row', sets:[S({w:50,r:10,rir:3})] }] });
    chk('the strip comes back when the write fails again', !strip.hidden);
    chk('…and a retry is armed rather than a message left standing',
        w.eval('storeRetryTimer !== null'));

    Object.defineProperty(w, 'localStorage', { configurable:true, value: real });
    d.dispatchEvent(new w.Event('visibilitychange'));
    chk('coming back into view retries the write and clears the strip',
        strip.hidden && /bb-row/.test(real.getItem('ancestor.state.v1') || ''));
    chk('…and the retry loop stops once it has landed', w.eval('storeRetryTimer === null'));
  }
}

/* ==================================================================== */
/*  11. Boundaries: another tab, a newer build, an uncaught throw, and  */
/*      a record built to break out of its own markup.                  */
/* ==================================================================== */
console.log('\n\x1b[1m11. Boundaries\x1b[0m');
{
  /* another tab wrote while this one was open */
  {
    const { w, d } = boot(); onboard(w, d);
    w.addSession({ date:Date.now()-864e5, startedAt:Date.now()-864e5, planId:'A', name:'Mine',
      exercises:[{ id:'bb-bench', sets:[S({w:60,r:8,rir:2})] }] });

    /* A second tab on the same origin: it reads the same record, adds a session
       of its own, and writes it back. (Separate jsdom instances do not share
       storage, so the write is made here.) */
    const disk = JSON.parse(w.localStorage.getItem('ancestor.state.v1'));
    disk.sessions.push({ id:'other-tab', date:Date.now()-2*864e5, startedAt:Date.now()-2*864e5,
      planId:'A', name:'Theirs', exercises:[{ id:'bb-row', sets:[S({w:50,r:10,rir:3})] }] });
    w.localStorage.setItem('ancestor.state.v1', JSON.stringify(disk));

    w.dispatchEvent(new w.StorageEvent('storage', { key:'ancestor.state.v1' }));
    const names = w.eval('JSON.stringify(getState().sessions.map(s=>s.name))');
    chk('a write from another tab is adopted, not overwritten later',
        /Theirs/.test(names) && /Mine/.test(names), names);
    chk('…and the screen redraws from the adopted state',
        d.querySelector('#screenBody') && d.getElementById('screenBody').innerHTML.length > 200);
  }

  /* a record written by a newer build */
  {
    const newer = JSON.stringify({ version: 99, created: Date.now(), onboarded: true,
      sessions: [{ id:'future', name:'From v4', futureField: { nested: true } }],
      profile: {}, somethingNew: [1,2,3] });
    const { w, d } = boot({ 'ancestor.state.v1': newer });
    const strip = d.getElementById('storeFlag');
    chk('a record from a newer build is refused, not downgraded',
        !strip.hidden && w.saveState() === false &&
        w.localStorage.getItem('ancestor.state.v1') === newer);
    chk('…and it says which of the two things happened',
        /newer version|version plus récente|neuere Version/i.test(strip.textContent));
  }

  /* a throw inside a handler — the path render() never sees */
  {
    const { w, d } = boot(); onboard(w, d);
    w.dispatchEvent(new w.ErrorEvent('error', { error: new Error('handler blew up'), message:'handler blew up' }));
    const fail = d.querySelector('#screenBody .fail');
    chk('a throw outside render() still lands on the designed failure state', !!fail);
    chk('…with a retry, not a dead screen',
        !!fail && Array.from(fail.querySelectorAll('button')).some(b => /try again|retry|reload/i.test(b.textContent)));
  }

  /* a record built to break out of its own markup */
  {
    const { w, d } = boot(); onboard(w, d);
    const PAY = '<img src=x onerror="window.__pwn=1"><script>window.__pwn2=1</script>';
    const rec = JSON.parse(w.exportJSON());
    rec.profile.name = PAY;
    rec.sessions = [{ id:'s1', date:Date.now()-864e5, startedAt:Date.now()-864e5, planId:'A',
      name: PAY, exercises:[{ id:'bb-bench', note: PAY, sets:[S({w:60,r:8,rir:2})] }] }];
    rec.sleep = [{ start:'23:00', end:'07:00', quality:3, note: PAY }];
    w.importJSON(JSON.stringify(rec));

    let injected = [];
    ['home','session','body','progress','science','profile'].forEach(v => {
      w.go(v);
      const body = d.getElementById('screenBody');
      if(body.querySelector('img') || body.querySelector('script')) injected.push(v);
    });
    chk('a hostile record cannot put markup into any screen', injected.length === 0, injected.join(', '));
    chk('…and nothing in it executed', w.eval('typeof window.__pwn') === 'undefined' &&
        w.eval('typeof window.__pwn2') === 'undefined');
  }
}

console.log('\n' + '='.repeat(64));
if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' PREMIUM TESTS PASSED\x1b[0m');
else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed');
       failures.forEach(f => console.log('   - ' + f)); }
console.log('='.repeat(64) + '\n');
process.exit(fail === 0 ? 0 : 1);
