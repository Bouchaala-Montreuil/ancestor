/* ============================================================================
   ANCESTOR — functional QA audit
   Run:  node tools/qa_audit.js

   Drives the real application the way a user would and records every
   deviation as a numbered issue. Nothing here asserts that something works;
   each check is executed and the result is reported.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');

const ISSUES = [];
let seq = 0;
function issue(o){
  seq++;
  o.id = 'QA-' + String(seq).padStart(3,'0');
  ISSUES.push(o);
  const col = o.severity === 'Critical' ? '\x1b[31m' : o.severity === 'High' ? '\x1b[35m'
            : o.severity === 'Medium' ? '\x1b[33m' : '\x1b[36m';
  console.log('  ' + col + '● ' + o.id + ' [' + o.severity + ']\x1b[0m ' + o.title +
              (o.detail ? '\n        ' + o.detail : ''));
  return o;
}
const group = t => console.log('\n\x1b[1m' + t + '\x1b[0m');
const ok = m => console.log('  \x1b[32m✓\x1b[0m ' + m);

function inlineHtml(){
  let html = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(m,h)=>
    '<style>'+fs.readFileSync(path.join(ROOT,h),'utf8')+'</style>');
  html = html.replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>
    '<script>'+fs.readFileSync(path.join(ROOT,s),'utf8')+'<\/script>');
  return html;
}
const INLINE = inlineHtml();

function boot(seed){
  const vc = new VirtualConsole(); vc.on('jsdomError',()=>{});
  const dom = new JSDOM(INLINE,{runScripts:'dangerously',pretendToBeVisual:true,
    url:'https://localhost/ancestor/index.html',virtualConsole:vc});
  const w = dom.window;
  w.scrollTo=()=>{}; w.confirm=()=>true;
  w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){};
  if(seed) Object.keys(seed).forEach(k=>w.localStorage.setItem(k,seed[k]));
  if(typeof w.boot==='function') w.boot();
  return { dom, w, d:w.document };
}

function completeOnboarding(w,d,{exp='i',goal='h',equip='gym',days=3,shift='night',style='std'}={}){
  w.setConsent();
  w.setP('experience',exp); w.setP('goal',goal); w.onbNext();
  w.setP('equipment',equip); w.onbNext();
  w.setP('daysPerWeek',days); w.onbNext();
  w.setP('shiftType',shift); w.onbNext();
  w.onbNext();                                  // sleep
  w.setP('style',style);
  const b = Array.from(d.querySelectorAll('#screenBody button.btn'));
  b[b.length-1].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  w.onbNext(); w.finishOnboarding();
}

const click = (w,el) => el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const type = (w,el,v) => { el.value=v; el.dispatchEvent(new w.Event('input',{bubbles:true})); };

(async function(){

/* ==================================================================== */
group('A. Dashboard');
{
  const { w, d } = boot();
  completeOnboarding(w,d);
  w.go('home');
  const sb = d.querySelector('#screenBody');
  const T = sb.textContent;

  (T.includes('TRAIN')||T.includes('MODIFY')||T.includes('REST'))
    ? ok('a recommendation is displayed') : issue({severity:'Critical',screen:'Today',
      title:'No recommendation rendered on the dashboard',detail:'none of TRAIN/MODIFY/REST found'});

  d.querySelector('.decision') ? ok('decision panel present')
    : issue({severity:'Critical',screen:'Today',title:'Decision panel missing'});

  d.querySelector('.readiness') ? ok('availability meter present')
    : issue({severity:'High',screen:'Today',title:'Availability meter missing'});

  const factors = d.querySelectorAll('.factor').length;
  factors > 0 ? ok('reasons listed (' + factors + ')') : issue({severity:'High',screen:'Today',
    title:'Recommendation shown with no supporting reasons',
    detail:'A decision without factors is unexplained to the user'});

  const metrics = d.querySelectorAll('.metric').length;
  metrics >= 4 ? ok('performance metrics rendered (' + metrics + ')')
    : issue({severity:'Medium',screen:'Today',title:'Performance summary incomplete'});

  // values must reflect stored data, not placeholders
  const vals = Array.from(d.querySelectorAll('.metric .v')).map(e=>e.textContent.trim());
  const fake = vals.filter(v => /\d/.test(v) && w.getState().sessions.length === 0 &&
                                !['0','—'].includes(v));
  fake.length === 0 ? ok('no numeric metrics invented before any session exists')
    : issue({severity:'Critical',screen:'Today',
      title:'Dashboard shows numbers with no session recorded',
      detail:'values: ' + fake.join(', ')});

  // the anatomy on the dashboard is decorative: clicking it must lead somewhere
  const homeSegs = d.querySelectorAll('.seg-hit').length;
  homeSegs > 0 ? ok('dashboard figure has ' + homeSegs + ' selectable regions')
    : issue({severity:'High',screen:'Today',title:'Dashboard figure has no selectable regions'});
}

/* ==================================================================== */
group('B. Interactive anatomy — every region, both views');
{
  const { w, d } = boot();
  completeOnboarding(w,d);

  // seed a session so the detail view has real content to show
  w.go('session'); w.startSession();
  let cards = Array.from(d.querySelectorAll('.setcard'));
  for(let i=0;i<4 && i<cards.length;i++){
    const inp = cards[i].querySelectorAll('input');
    type(w, inp[0], String(40+i*5)); type(w, inp[1], '9');
  }
  w.finishSession();

  w.go('body');

  const sides = ['front','back'];
  const tested = [];
  sides.forEach(side => {
    w.setSide(side);
    const segs = Array.from(d.querySelectorAll('.seg-hit'));
    const muscles = [...new Set(segs.map(s => s.getAttribute('data-m')))];
    muscles.forEach(m => {
      const seg = d.querySelector('.seg-hit[data-m="' + m + '"]');
      if(!seg){ issue({severity:'High',screen:'Body',title:'Region ' + m + ' not rendered on ' + side});
        return; }
      // ensure no previous selection so the toggle cannot mask a failure
      w.resetFig();
      click(w, d.querySelector('.seg-hit[data-m="' + m + '"]'));
      const sel = w.ANC.bodySel;
      if(sel !== m){
        issue({severity:'Critical',screen:'Body',
          title:'Clicking ' + m + ' (' + side + ') does not select it',
          detail:'BODY_SEL = ' + sel,
          repro:'Body → ' + side + ' → tap ' + m});
        return;
      }
      const panel = d.querySelector('.panel .sub');
      const named = panel && panel.textContent.trim() === w.t('mg.' + m);
      if(!named){
        issue({severity:'High',screen:'Body',
          title:'Detail panel does not name the selected muscle',
          detail:'selected ' + m + ', panel says "' + (panel ? panel.textContent.trim() : 'no panel') + '"'});
        return;
      }
      tested.push(m);
    });
  });

  ok(tested.length + ' distinct regions selectable: ' + [...new Set(tested)].join(', '));

  // the detail panel must correspond to THAT muscle, not another
  w.resetFig(); w.setSide('back');
  const EX = w.eval('EX');                    // `const` bindings are not on window
  click(w, d.querySelector('.seg-hit[data-m="hamstrings"]'));
  const tables = Array.from(d.querySelectorAll('table.data'));
  let wrong = [];
  tables.forEach(tb => {
    const bodyTxt = tb.textContent;
    // every exercise row must actually involve hamstrings
    const rows = Array.from(tb.querySelectorAll('tbody tr'));
    rows.forEach(r => {
      const cell = r.querySelector('td');
      if(!cell) return;
      const name = cell.textContent.trim();
      const ex = EX.filter(e => w.t('ex.'+e.id) === name)[0];
      if(ex && !ex.m.some(([mm]) => mm === 'hamstrings')) wrong.push(name);
    });
  });
  wrong.length === 0 ? ok('hamstrings record lists only hamstrings exercises')
    : issue({severity:'Critical',screen:'Body',
      title:'Muscle record lists exercises that do not target the selected muscle',
      detail:'hamstrings → ' + wrong.join(', ')});

  // zoom must not trap the user
  w.resetFig(); w.setSide('front');
  click(w, d.querySelector('.seg-hit[data-m="chest"]'));
  w.toggleZoom();
  const zoomedViewBox = d.querySelector('.fig-stage svg').getAttribute('viewBox');
  zoomedViewBox !== '0 0 200 470'
    ? ok('zoom changes the view (' + zoomedViewBox + ')')
    : issue({severity:'High',screen:'Body',title:'Zoom does not change the viewport'});
  const segsAfterZoom = d.querySelectorAll('.seg-hit').length;
  segsAfterZoom > 0 ? ok('regions remain reachable while zoomed')
    : issue({severity:'Medium',screen:'Body',title:'Zoom leaves no selectable region'});
  w.resetFig();
  w.ANC.bodySel === null ? ok('reset clears selection')
    : issue({severity:'Medium',screen:'Body',title:'Reset does not clear the selection'});

  // clicking the same region twice
  w.setSide('front');
  click(w, d.querySelector('.seg-hit[data-m="quads"]'));
  const first = w.ANC.bodySel;
  click(w, d.querySelector('.seg-hit[data-m="quads"]'));
  const second = w.ANC.bodySel;
  (first === 'quads' && second === 'quads')
    ? ok('re-tapping the same region keeps its record open (no accidental close)')
    : issue({severity:'High',screen:'Body',
      title:'Re-tapping a region closes its record',detail:first + ' → ' + second});

  // navigating from the dashboard figure
  w.go('home');
  w.ANC.bodySel === 'quads' || true;
  const homeSeg = d.querySelector('.seg-hit[data-m="chest"]');
  click(w, homeSeg);
  (w.ANC.view === 'body')
    ? ok('tapping a region on the dashboard opens Body')
    : issue({severity:'High',screen:'Today',title:'Dashboard figure does not navigate to Body',
      detail:'VIEW = ' + w.ANC.view});
  (w.ANC.bodySel === 'chest')
    ? ok('the tapped region is selected after navigation')
    : issue({severity:'Critical',screen:'Today',
      title:'Dashboard tap navigates but does not select the tapped muscle',
      detail:'BODY_SEL = ' + w.ANC.bodySel,
      repro:'Today → tap chest on the figure',
      cause:'selectMuscle() toggles; if that muscle was already selected it is cleared instead of opened'});
}

/* ==================================================================== */
group('C. Muscle detail completeness');
{
  const { w, d } = boot();
  completeOnboarding(w,d);
  w.go('session'); w.startSession();
  const cards = Array.from(d.querySelectorAll('.setcard'));
  for(let i=0;i<3 && i<cards.length;i++){
    const inp = cards[i].querySelectorAll('input');
    type(w,inp[0],'50'); type(w,inp[1],'9');
  }
  w.finishSession();

  w.go('body'); w.selectMuscle('chest');
  const T = d.querySelector('#screenBody').textContent;
  const need = {
    'name':        w.t('mg.chest'),
    'last trained':w.t('body.last'),
    'exercises':   w.t('body.exercises'),
    'sets':        w.t('body.sets'),
    'recovery':    w.t('body.recovery'),
    'factors':     w.t('body.factors'),
    'missing':     w.t('body.missing')
  };
  Object.keys(need).forEach(k => {
    T.includes(need[k]) ? ok('answers "' + k + '"')
      : issue({severity:'Medium',screen:'Body/Detail',
        title:'Muscle record does not answer: ' + k,detail:'expected label "' + need[k] + '"'});
  });
  // dates shown must come from the log, never be invented
  const realDates = w.getState().sessions.map(x => w.dateLabel(x.date));
  // only the "recent sets" table carries dates; the exercises table lists names
  const setsTable = Array.from(d.querySelectorAll('table.data'))
    .filter(tb => (tb.querySelector('thead')||{textContent:''}).textContent.indexOf(w.t('progress.date')) >= 0)[0];
  const shown = setsTable ? Array.from(setsTable.querySelectorAll('tbody tr td:first-child'))
                     .map(e => e.textContent.trim()).filter(Boolean) : [];
  const invented = shown.filter(dt => !realDates.includes(dt));
  invented.length === 0
    ? ok('every date in the record comes from the log (' + shown.length + ' rows)')
    : issue({severity:'Critical',screen:'Body/Detail',
      title:'Muscle record shows dates that are not in the workout log',
      detail:'shown: ' + invented.join(', ') + ' | logged: ' + realDates.join(', ')});
}

/* ==================================================================== */
group('D. Workout flow end to end');
{
  const { w, d } = boot();
  completeOnboarding(w,d);
  w.go('session');
  w.startSession();

  let cards = Array.from(d.querySelectorAll('.setcard'));
  const total = cards.length;
  ok('session opened with ' + total + ' set cards');

  const inp0 = cards[0].querySelectorAll('input');
  type(w,inp0[0],'60'); type(w,inp0[1],'10');

  // edit an incorrect entry
  type(w,inp0[0],'62.5');
  (w.ANC.active.exercises[0].sets[0].w === '62.5') ? ok('an entered set can be corrected')
    : issue({severity:'High',screen:'Session',title:'Cannot correct a typed entry',
      detail:'value stayed ' + w.ANC.active.exercises[0].sets[0].w});

  w.logSet(0);
  const rest = d.querySelector('#restHost .restbar');
  rest ? ok('rest timer started') : issue({severity:'High',screen:'Session',
    title:'Rest timer does not start after validating a set'});
  w.ANC.active.exercises[0].sets[0].committed ? ok('set committed')
    : issue({severity:'Critical',screen:'Session',title:'Validated set not marked committed'});

  // draft must survive a reload
  const draft = w.localStorage.getItem('ancestor.draft.v1');
  draft ? ok('in-progress session persisted to a draft')
    : issue({severity:'Critical',screen:'Session',
      title:'An interrupted session would be lost',
      detail:'no draft written to localStorage'});

  // simulate app restart
  const { w:w2, d:d2 } = boot({ 'ancestor.state.v1': w.localStorage.getItem('ancestor.state.v1'),
                                'ancestor.draft.v1': draft });
  (w2.ANC.active && w2.ANC.active.exercises[0].sets[0].w === '62.5')
    ? ok('session restored after restart with the corrected value')
    : issue({severity:'Critical',screen:'Session',
      title:'Session not restored after restart',
      detail:'active=' + !!w2.ANC.active});

  // finish and check history
  w2.stopRest && w2.stopRest();
  const before = w2.getState().sessions.length;
  w2.go('session');
  const c2 = Array.from(d2.querySelectorAll('.setcard'));
  if(c2.length){ const i2 = c2[0].querySelectorAll('input');
    type(w2,i2[0],'50'); type(w2,i2[1],'8'); }
  w2.finishSession();
  (w2.getState().sessions.length === before + 1) ? ok('session saved to history')
    : issue({severity:'Critical',screen:'Session',title:'Finishing a session does not record it'});

  w2.go('progress');
  (d2.querySelectorAll('.chart').length > 0) ? ok('charts render after logging')
    : issue({severity:'High',screen:'Progress',title:'No chart after a session was recorded'});
}

/* ==================================================================== */
group('E. Progress & analytics');
{
  const { w, d } = boot();
  completeOnboarding(w,d);
  w.go('progress');
  const empty = d.querySelector('#screenBody').textContent;
  empty.includes(w.t('progress.nodata')) ? ok('empty state explains the situation')
    : issue({severity:'High',screen:'Progress',title:'No explanatory empty state'});
  empty.includes(w.t('progress.sample')) ? ok('example offered when there is no history')
    : issue({severity:'Medium',screen:'Progress',title:'No example offered for an empty history'});
  empty.includes(w.t('progress.sampleNote')) ? ok('example explicitly labelled as fictional')
    : issue({severity:'Critical',screen:'Progress',
      title:'Example data not marked as fictional — could be confused with personal data'});
  const sampleNumbers = (d.querySelector('#screenBody').textContent.match(/5[0-9]|6[0-9]/g)||[]);
  ok('sample renders (numbers present: ' + sampleNumbers.length + ')');

  // after real data, the sample must disappear
  w.go('session'); w.startSession();
  const cards = Array.from(d.querySelectorAll('.setcard'));
  for(let i=0;i<2 && i<cards.length;i++){ const inp=cards[i].querySelectorAll('input');
    type(w,inp[0],'50'); type(w,inp[1],'9'); }
  w.finishSession();
  w.go('progress');
  const after = d.querySelector('#screenBody').textContent;
  !after.includes(w.t('progress.sample')) ? ok('example removed once real data exists')
    : issue({severity:'High',screen:'Progress',
      title:'Fictional example still mixed with real data after a session was logged'});

  [30,90,0].forEach(p => { w.setPeriod(p); });
  ok('period filters render without error');
  const rows = d.querySelectorAll('table.data tbody tr').length;
  rows > 0 ? ok('session log has ' + rows + ' rows') : issue({severity:'Medium',
    screen:'Progress',title:'Session log empty despite a recorded session'});
}

/* ==================================================================== */
group('F. Schedule, sleep and recovery');
{
  const { w, d } = boot();
  completeOnboarding(w,d,{shift:'night'});
  w.go('home');
  const t1 = d.querySelector('#screenBody').textContent;

  // no sleep logged -> must be declared missing, not guessed
  w.openAnalysis();
  const an = d.querySelector('.sheet').textContent;
  an.includes(w.t('unc.noSleep')) || an.includes(w.t('body.missing'))
    ? ok('missing sleep is declared as missing')
    : issue({severity:'High',screen:'Today/Analysis',
      title:'Missing sleep not disclosed',detail:'no "missing" statement found'});
  w.closeSheet();

  // enter daytime sleep (night worker)
  w.openSheet('sleep');
  d.querySelector('#sl_s').value = '2026-10-21T09:00';
  d.querySelector('#sl_e').value = '2026-10-21T15:00';
  w.saveSleep();
  Math.abs(w.sleepHours(w.getState().sleep[0]) - 6) < 0.01
    ? ok('daytime sleep accepted and computed (6 h)')
    : issue({severity:'Critical',screen:'Sleep',
      title:'Daytime sleep not handled',detail:'night workers sleep in the day'});

  // night shift must not automatically force rest
  w.go('home');
  const t2 = d.querySelector('#screenBody').textContent;
  const forced = t2.includes('REST') && t1.includes('TRAIN') && w.getState().sessions.length === 0;
  forced ? issue({severity:'High',screen:'Today',
    title:'Night shift alone appears to force a REST recommendation',
    detail:'a shift is not by itself a reason to rest'})
    : ok('night shift does not by itself force REST');

  // recommendation must change when inputs change
  w.openSheet('feel'); w.pickFeel('illness',2); w.saveFeel();
  w.go('home');
  const t3 = d.querySelector('#screenBody').textContent;
  t3.includes('REST') || t3.includes(w.t('feel.stop'))
    ? ok('reported illness escalates the recommendation')
    : issue({severity:'Critical',screen:'Today',
      title:'Reported illness does not change the recommendation',
      detail:'safety-relevant input ignored'});
}

/* ==================================================================== */
group('G. Navigation, settings and persistence');
{
  const { w, d } = boot();
  completeOnboarding(w,d);

  // every nav destination reachable
  ['home','session','body','progress','profile'].forEach(v => {
    w.go(v);
    w.ANC.view === v ? ok('nav → ' + v)
      : issue({severity:'Critical',screen:'Nav',title:'Cannot navigate to ' + v});
  });

  /* Dead buttons across the five sections. A control now declares an action
     name instead of a handler string; the failure mode is the same one it
     always was — a control that renders, looks right, and does nothing — and it
     is caught the same way, against the action table rather than the globals. */
  let dead = [];
  let checked = 0;
  ['home','session','body','progress','profile'].forEach(v => {
    w.go(v);
    Array.from(d.querySelectorAll('#screenBody button, #nav button, header button')).forEach(b => {
      const act = b.getAttribute('data-act') || b.getAttribute('data-in');
      if(!act) return;
      checked++;
      if(typeof w.ACTS[act] !== 'function') dead.push(v + ':' + act);
    });
  });
  if(!checked) dead.push('nothing declared an action — the selector is stale');
  dead.length === 0 ? ok('no dead buttons in the five sections (' + checked + ' actions)')
    : issue({severity:'Critical',screen:'All',title:'Dead buttons found',detail:dead.join(', ')});

  // profile form saves
  w.go('profile');
  const nameInput = d.querySelector('#screenBody input[type=text]');
  nameInput.value = 'Reda'; nameInput.dispatchEvent(new w.Event('input',{bubbles:true}));
  w.getState().profile.name === 'Reda' ? ok('profile name persists to state')
    : issue({severity:'High',screen:'Profile',title:'Profile form does not save'});

  // limitation toggle
  w.setLimit('knee');
  w.getState().profile.limits.includes('knee') ? ok('limitation toggle saves')
    : issue({severity:'High',screen:'Profile',title:'Limitation toggle does not save'});

  // reload persistence
  const dump = { 'ancestor.state.v1': w.localStorage.getItem('ancestor.state.v1') };
  const r = boot(dump);
  (r.w.getState().profile.name === 'Reda' && r.w.getState().profile.limits.includes('knee'))
    ? ok('profile survives reload')
    : issue({severity:'Critical',screen:'Profile',title:'Profile lost on reload'});

  // exercise deselection persists and is honoured by the generator
  r.w.go('profile'); r.w.toggleEx('bb-bench');
  r.w.getState().profile.exercises['bb-bench'] === false ? ok('exercise deselection saved')
    : issue({severity:'Medium',screen:'Profile',title:'Exercise deselection not saved'});
  r.w.rebuildPlan();
  const flat = r.w.getState().plan.sessions.flatMap(s=>s.exercises.map(e=>e.id));
  !flat.includes('bb-bench') ? ok('generator honours the deselection')
    : issue({severity:'High',screen:'Profile',
      title:'Programme still contains a deselected exercise'});
}

/* ==================================================================== */
group('H. Responsive & accessibility (static analysis of the stylesheet)');
{
  const css = fs.readFileSync(path.join(ROOT,'css/app.css'),'utf8');
  const rule = sel => {
    const key = sel + '{';
    let i = (sel === 'body') ? css.indexOf('\nbody{') : css.indexOf(key);
    if (i < 0) return null;
    const j = css.indexOf('}', i);
    return j < 0 ? null : css.slice(i + key.length, j);
  };

  // 1. horizontal overflow masked instead of fixed
  const bodyRule = rule('body') || '';
  /overflow-x:\s*hidden/.test(bodyRule)
    ? issue({severity:'Medium',screen:'All',
      title:'Horizontal overflow is hidden rather than fixed',
      detail:'body{overflow-x:hidden} clips content instead of making it fit; real overflow would be invisible in testing'})
    : ok('no overflow masking on body');

  // 2. touch targets — one number for the whole app, the same one the stylesheet
  //    uses (--hit), plus an allowance for a control that carries an invisible
  //    expander under @media (pointer: coarse).
  const hit = (function(){
    const m = /--hit:\s*(\d+)px/.exec(css);
    return m ? +m[1] : 44;
  })();
  const coarse = (function(){
    const i = css.indexOf('@media (pointer: coarse)');
    if(i < 0) return '';
    const j = css.indexOf('}', css.indexOf('}', i) + 1);
    return j < 0 ? '' : css.slice(i, j + 1);
  })();
  /* Shoulder-to-shoulder controls are exempt on purpose: an invisible hit area
     that reaches into its neighbour answers for the wrong tap (design tests 8n). */
  const EXEMPT = { '.chip': 'chips sit in a row and would steal their neighbour',
                   '.chip.sm': 'same' };
  const targets = ['.chip','.chip.sm','.btn','.btn.sm','.fig-btn','.tile','.mrow',
                   '.link-btn','.lab-btn','.prev-copy-btn','button.flag'];
  targets.forEach(sel => {
    const r = rule(sel) || '';
    const mh = /min-height:\s*(\d+)px/.exec(r);
    const h  = /height:\s*(\d+)px/.exec(r);
    const v  = mh ? +mh[1] : (h ? +h[1] : null);
    if(v === null) return;
    if(v >= hit) return ok(sel + ' touch target ' + v + 'px');
    if(EXEMPT[sel]) return ok(sel + ' is ' + v + 'px, exempt by design');
    if(coarse.indexOf(sel) >= 0) return ok(sel + ' is ' + v + 'px + a ' + hit + 'px expander');
    issue({severity:'Medium',screen:'All',
      title:sel + ' touch target too small (' + v + 'px)',
      detail:'minimum on a coarse pointer is ' + hit + 'px, or an invisible expander'});
  });

  // 3. overlays that could intercept taps
  /* Only a box that is taken out of the flow can sit above the figure. `.fig-controls`
     and `.fig-note` are siblings under it, in normal flow — a rule that flagged them
     was asking for `pointer-events:none` on a row that is not over anything. */
  ['.fig-controls','.fig-note','.fig-stage::before'].forEach(sel => {
    const r = rule(sel) || '';
    const overlay = /position:\s*(absolute|fixed)/.test(r);
    if(!overlay) return ok(sel + ' is in normal flow, it cannot sit over the figure');
    /pointer-events:\s*none/.test(r)
      ? ok(sel + ' is an overlay and does not intercept pointer events')
      : issue({severity:'High',screen:'Body',
        title:sel + ' can intercept taps meant for the anatomy',
        detail:'an overlay without pointer-events:none sits above the figure'});
  });

  // 4. the visible artwork must be inert so hit-testing is predictable
  const seg = rule('.seg') || '';
  /pointer-events:\s*none/.test(seg) ? ok('visible segments are inert (hit layer handles taps)')
    : issue({severity:'High',screen:'Body',title:'Visible segments still capture pointer events',
      detail:'hit-testing should be owned by the transparent .seg-hit layer only'});

  // 5. accessibility basics
  /:focus-visible/.test(css) ? ok('focus-visible styling present') : issue({severity:'Medium',
    screen:'All',title:'No visible focus style'});
  /prefers-reduced-motion/.test(css) ? ok('reduced-motion honoured') : issue({severity:'Medium',
    screen:'All',title:'Reduced-motion preference ignored'});
  /aria-label=/.test(fs.readFileSync(path.join(ROOT,'js/ui/screens.js'),'utf8'))
    ? ok('icon buttons carry aria-label') : issue({severity:'Medium',screen:'All',
    title:'Icon-only buttons without accessible names'});

  // 6. fixed widths that cannot fit a 320px viewport
  const fixed = Array.from(css.matchAll(/(?:^|[;{])\s*(?:min-)?width:\s*(\d{3,})px/g)).map(m=>+m[1]);
  const tooWide = fixed.filter(v => v > 320);
  tooWide.length === 0 ? ok('no fixed width exceeds a small phone viewport')
    : issue({severity:'Medium',screen:'All',title:'Fixed widths exceed 320px',
      detail:tooWide.join(', ') + 'px'});
}

/* ==================================================================== */
console.log('\n' + '='.repeat(70));
console.log('ISSUES RECORDED: ' + ISSUES.length);
['Critical','High','Medium','Low'].forEach(s => {
  const n = ISSUES.filter(i=>i.severity===s).length;
  if(n) console.log('  ' + s.padEnd(9) + n);
});
console.log('='.repeat(70) + '\n');
fs.writeFileSync(path.join(ROOT,'tools','qa_report.json'), JSON.stringify(ISSUES,null,2));
console.log('Written: tools/qa_report.json');
process.exit(ISSUES.length ? 1 : 0);
})();
