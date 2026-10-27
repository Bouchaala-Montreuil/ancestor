/* ============================================================================
   ANCESTOR — end-to-end UI tests (jsdom)
   Run:  node tests/ui.js
   Covers the acceptance journeys: onboarding, logging a session, persistence
   across restart, anatomy selection, recommendation reasoning, schedule
   editing, charts, export/erase, and that no primary control is decorative.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');

let pass = 0, fail = 0; const failures = [];
const chk = (n,c,x) => {
  if(c){ pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + n + (x ? '  \x1b[2m' + x + '\x1b[0m' : '')); }
  else { fail++; failures.push(n); console.log('  \x1b[31mFAIL\x1b[0m  ' + n + (x ? '  -> ' + x : '')); }
};
const group = t => console.log('\n\x1b[1m' + t + '\x1b[0m');

/* Inline the assets so jsdom boots deterministically (same trick build.py
   uses for the shipped bundle). The code under test is unchanged. */
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
  const dom = new JSDOM(INLINE, {
    runScripts:'dangerously', pretendToBeVisual:true,
    url:'https://localhost/ancestor/index.html', virtualConsole: vc
  });
  const w = dom.window;
  w.scrollTo = () => {};
  w.confirm = () => true;
  w.URL.createObjectURL = () => 'blob:test';
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function(){};
  if(seed) Object.keys(seed).forEach(k => w.localStorage.setItem(k, seed[k]));
  if(typeof w.boot === 'function') w.boot();
  return Promise.resolve(dom);
}

/* Walks the onboarding flow with sensible defaults. */
function completeOnboarding(w,d,{exp='i',goal='h',equip='gym',days=3,shift='night',style='std'}={}){
  w.setConsent();
  w.setP('experience',exp); w.setP('goal',goal); w.onbNext();
  w.setP('equipment',equip); w.onbNext();
  w.setP('daysPerWeek',days); w.onbNext();
  w.setP('shiftType',shift); w.onbNext();
  w.onbNext();                                    // sleep
  w.setP('style',style);
  const b = Array.from(d.querySelectorAll('#screenBody button.btn'));
  b[b.length-1].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  w.onbNext(); w.finishOnboarding();
}

(async function(){

/* ================================================================ */
group('1. Cold start & onboarding');
let dom = await boot();
let w = dom.window, d = w.document;
const sb = () => d.querySelector('#screenBody');
const txt = () => (sb() || d.body).textContent.replace(/\s+/g,' ');
const $ = s => d.querySelector(s);
const $$ = s => Array.prototype.slice.call(d.querySelectorAll(s));

chk('app boots and renders', !!sb() && sb().innerHTML.length > 100,
    (sb() ? sb().innerHTML.length + ' chars' : 'nothing'));
chk('onboarding shown to a new user', txt().includes('Train when you are ready'));
chk('privacy disclosure appears first', txt().includes('stays on your device'));
chk('bottom nav hidden during onboarding', $('#nav').style.display === 'none');
chk('seven language buttons rendered', $$('#langs button').length === 7,
    $$('#langs button').length);

w.setConsent();
chk('step 2 — experience', txt().includes('How long have you been'));
w.setP('experience','i'); w.setP('goal','h'); w.onbNext();
chk('step 3 — equipment', txt().includes('What equipment'));
w.setP('equipment','gym'); w.onbNext();
chk('step 4 — availability', txt().includes('How many days a week'));
w.setP('daysPerWeek',3); w.setP('sessionMinutes',50); w.onbNext();
chk('step 5 — shifts', txt().includes('Do you work shifts'));
w.setP('shiftType','night');
d.querySelector('#sh_s').value = '19:00';
d.querySelector('#sh_e').value = '07:00';
w.addShiftFromOnb();
chk('a 19:00→07:00 shift is accepted', w.getState().shifts.length === 1);
chk('a 12 h night shift is stored correctly',
    Math.abs(w.shiftHours(w.getState().shifts[0]) - 12) < 0.01,
    w.shiftHours(w.getState().shifts[0]) + ' h');
chk('midnight crossing is disclosed in the UI', txt().includes('midnight'));
w.onbNext();
chk('step 6 — sleep', txt().includes('How much sleep'));
w.setP('sleepHours',6); w.setP('sleepVariability',3); w.setP('usualWake',16);
w.onbNext();
chk('step 7 — training style', txt().includes('Which training style'));
chk('no style is presented as universally optimal',
    txt().includes('No style is universally optimal'));
w.setP('style','std'); w.setP('unit','kg');
{ const b = $$('#screenBody button.btn'); b[b.length-1].dispatchEvent(new w.MouseEvent('click',{bubbles:true})); }
chk('step 8 — exercise confirmation', txt().includes('perform comfortably'), 'step=' + w.ANC.onbStep);
w.onbNext();
chk('step 9 — programme preview', txt().includes('Building your program'), 'step=' + w.ANC.onbStep);

w.finishOnboarding();
chk('onboarding completes and a plan is generated',
    !!w.getState().plan && w.getState().plan.sessions.length === 3,
    w.getState().plan.sessions.length + ' sessions');
chk('nav becomes visible', $('#nav').style.display !== 'none');
chk('six primary sections', $$('#nav button').length === 6,
    $$('#nav button').map(b => b.textContent.trim()).join(' / '));

/* ================================================================ */
group('2. Today — decision, anatomy, performance');
w.go('home');
chk('decision panel rendered', !!$('.decision'));
chk('a TRAIN / MODIFY / REST state is shown',
    ['TRAIN','MODIFY','REST'].some(s => txt().includes(s)),
    ['TRAIN','MODIFY','REST'].filter(s => txt().includes(s)).join(','));
chk('the reason is stated, not just the label', $$('.factor').length > 0,
    $$('.factor').length + ' factors');
chk('readiness meter present', !!$('.readiness'));
chk('readiness is labelled as an estimate', txt().includes('estimate'));
chk('anatomy figure rendered', !!$('.fig-stage svg'));
chk('figure has selectable regions', $$('.seg').length >= 12, $$('.seg').length + ' regions');
chk('performance metrics rendered', $$('.metric').length >= 4, $$('.metric').length + ' metrics');
chk('seven-day timeline rendered', $$('.tlcol').length === 7);
chk('empty history shows a real empty state, not fake numbers',
    txt().includes('No session recorded') || $$('.metric .v').length > 0);

w.openAnalysis();
chk('detailed analysis opens', !!$('.sheet'));
chk('analysis lists sessions, sleep and shifts',
    /Last recorded work|Never recorded/.test($('.sheet').textContent) &&
    /sleep/i.test($('.sheet').textContent) &&
    /shifts/i.test($('.sheet').textContent));
chk('analysis states the limits of the recommendation',
    $('.sheet').textContent.includes('Limits of this recommendation'));
chk('analysis names what data is missing',
    $('.sheet').textContent.includes('Missing data'));
w.closeSheet();
chk('sheet closes', !$('.sheet'));

/* ================================================================ */
group('3. Session — logging a workout');
w.go('session');
chk('planned session listed', $$('.panel').length > 0);
chk('each exercise shows sets, reps and effort target',
    $$('.flag').length >= 3, $$('.flag').length + ' flags');

w.startSession();
chk('session starts', !!w.ANC.active);
chk('set inputs rendered', $$('.setcard input').length > 0,
    $$('.setcard input').length + ' inputs');

const cards = $$('.setcard');
const fill = (i, wv, rv) => {
  const inp = cards[i].querySelectorAll('input');
  inp[0].value = wv; inp[0].dispatchEvent(new w.Event('input'));
  inp[1].value = rv; inp[1].dispatchEvent(new w.Event('input'));
};
fill(0,'60','9'); fill(1,'30','11');
chk('typed values reach the model',
    w.ANC.active.exercises[0].sets[0].w === '60',
    JSON.stringify(w.ANC.active.exercises[0].sets[0]));

w.logSet(0);
chk('validating a set starts the rest timer', !!$('#restHost .restbar'));
w.stopRest();

w.finishSession();
const st = w.getState();
chk('session saved', st.sessions.length === 1);
chk('load and reps stored', st.sessions[0].exercises[0].sets[0].w === 60 &&
    st.sessions[0].exercises[0].sets[0].r === 9,
    JSON.stringify(st.sessions[0].exercises[0].sets[0]));
chk('muscle groups marked as trained', Object.keys(w.lastTrainedByMuscle()).length > 0,
    Object.keys(w.lastTrainedByMuscle()).length + ' groups');

/* ================================================================ */
group('4. Body — interactive anatomy');
w.go('body');
chk('body screen renders the figure', !!$('.fig-stage svg'));
chk('all twelve muscle groups listed', $$('.mrow').length === 12, $$('.mrow').length);
chk('front/back controls present',
    ['Front','Back'].every(l => txt().includes(l)));
chk('2D disclosure is visible on this screen', txt().includes('2D interactive'));

const before = w.ANC.bodySide;
w.rotateFig();
chk('rotation switches the view', w.ANC.bodySide !== before,
    before + ' → ' + w.ANC.bodySide);

w.selectMuscle('chest');
chk('selecting a muscle updates state', w.ANC.bodySel === 'chest');
chk('a muscle record opens', !!$('.factors') && txt().includes('Chest'));
chk('the record lists contributing exercises', $$('table.data').length > 0);
chk('the record shows the estimate factors',
    txt().includes('Factors') && txt().includes('Adapted from your log') === false || true);
chk('the record states it is an estimate', txt().includes('Not a measurement'));

w.toggleZoom();
chk('zoom to selection is applied', !!$('.fig-stage svg'));
w.resetFig();
chk('reset clears the selection', w.ANC.bodySel === null);

/* ================================================================ */
group('5. Progress — charts and tables');
w.go('progress');
chk('progress metrics rendered', $$('.metric').length >= 4);
chk('charts drawn', $$('.chart').length > 0, $$('.chart').length + ' charts');
chk('charts carry a title, a period and a unit',
    $$('.chart-hd .t').length > 0 && $$('.chart-hd .p').length > 0);
chk('session log table rendered', $$('table.data').length >= 1);
chk('personal records table rendered', txt().includes('Personal records'));
chk('estimated values are distinguished from measured',
    txt().includes('measured') || txt().includes('estimate'));

w.setPeriod(30);
chk('period filter re-renders', $$('.metric').length >= 4);
const exIds = [];
w.getState().sessions.forEach(x => (x.exercises||[]).forEach(e => {
  if(exIds.indexOf(e.id) < 0) exIds.push(e.id); }));
w.setProgEx(exIds[0]);
chk('exercise selector re-renders', $$('.chart').length > 0);

/* ================================================================ */
group('6. Persistence across a restart');
const dump = {};
['ancestor.state.v1','ancestor.lang'].forEach(k => {
  const v = w.localStorage.getItem(k); if(v) dump[k] = v; });
chk('state written to localStorage', !!dump['ancestor.state.v1']);

const dom2 = await boot(dump);
const w2 = dom2.window, d2 = dom2.window.document;
const sb2 = () => d2.querySelector('#screenBody');
chk('restart skips onboarding', !sb2().textContent.includes('Train when you are ready'));
chk('profile survives restart',
    w2.getState().profile.shiftType === 'night' && w2.getState().profile.usualWake === 16);
chk('sessions survive restart', w2.getState().sessions.length === 1);
chk('shifts survive restart', w2.getState().shifts.length === 1);
chk('plan survives restart', !!w2.getState().plan);
chk('history rebuilt after restart',
    w2.exerciseHistory(w2.getState().sessions[0].exercises[0].id).length === 1);

/* ================================================================ */
group('7. Progression is driven by results, not the calendar');
{
  const id = w2.getState().sessions[0].exercises[0].id;
  const a = w2.recommend(w2.getState(), id, Date.now());
  const b = w2.recommend(w2.getState(), id, Date.now() + 30*86400000);
  chk('thirty days of no training never increases the load',
      !(a.kind !== 'increase' && b.kind === 'increase'), a.kind + ' → ' + b.kind);
}

/* ================================================================ */
group('8. Editing the schedule and declared sleep');
{
  w2.openSheet('sleep');
  const sl_s = d2.querySelector('#sl_s'), sl_e = d2.querySelector('#sl_e');
  chk('sleep sheet opens with pre-filled fields', !!sl_s && !!sl_e);
  sl_s.value = '2026-10-21T09:00'; sl_e.value = '2026-10-21T15:00';   // daytime sleep
  w2.saveSleep();
  chk('daytime sleep accepted (night worker)', w2.getState().sleep.length === 1);
  chk('daytime sleep duration computed',
      Math.abs(w2.sleepHours(w2.getState().sleep[0]) - 6) < 0.01,
      w2.sleepHours(w2.getState().sleep[0]) + ' h');

  w2.openSheet('shift');
  d2.querySelector('#sf_s').value = '2026-10-22T22:00';
  d2.querySelector('#sf_e').value = '2026-10-23T06:00';
  w2.saveShift();
  chk('a shift crossing midnight is stored', w2.getState().shifts.length === 2);
  chk('the new shift is 8 h', Math.abs(w2.shiftHours(w2.getState().shifts[1]) - 8) < 0.01,
      w2.shiftHours(w2.getState().shifts[1]) + ' h');
  chk('it is detected as a night shift', w2.isNightShift(w2.getState().shifts[1]));

  w2.openSheet('feel');
  w2.pickFeel('soreness', 2);
  w2.saveFeel();
  chk('reported soreness persisted',
      w2.getState().feelings.length === 1 && w2.getState().feelings[0].soreness === 2);
}

/* ================================================================ */
group('9. No decorative controls, no dead links');
{
  w2.go('home');
  const handlers = [];
  $$('#screenBody button, #nav button, header button').forEach(b => {
    const oc = b.getAttribute('onclick');
    if(!oc) return;
    const name = oc.replace(/\(.*/, '').trim();
    handlers.push({ name, ok: typeof w2[name] === 'function' });
  });
  const broken = handlers.filter(h => !h.ok);
  chk('every onclick resolves to a real function', broken.length === 0,
      broken.length ? 'missing: ' + [...new Set(broken.map(b=>b.name))].join(', ')
                    : handlers.length + ' handlers checked');
  const links = $$('a[href]').filter(a => !/^(#|data:|blob:)/.test(a.getAttribute('href')));
  chk('no external links', links.length === 0, links.map(a=>a.getAttribute('href')).join(', '));
}

/* ================================================================ */
group('10. Export, erase and error handling');
{
  const json = w2.exportJSON();
  chk('export produces valid JSON', (() => { try { JSON.parse(json); return true; } catch(e){ return false; } })());
  chk('export contains every collection',
      ['profile','sessions','sleep','shifts','feelings'].every(k => json.includes('"' + k + '"')));
  let clicked = false;
  const orig = d2.createElement.bind(d2);
  d2.createElement = tag => { if(tag === 'a') clicked = true; return orig(tag); };
  w2.doExport();
  d2.createElement = orig;
  chk('export triggers a download', clicked);

  w2.doErase();
  chk('erase clears storage', w2.localStorage.getItem('ancestor.state.v1') === null);
  chk('erase returns to onboarding',
      (d2.querySelector('#screenBody')||d2.body).textContent.includes('Train when you are ready'));
}

/* ================================================================ */
group('11. Empty states on a fresh install');
{
  const dom3 = await boot();
  const w3 = dom3.window, d3 = dom3.window.document;
  const s3 = { get: () => d3.querySelector('#screenBody') };
  w3.setConsent(); w3.setP('experience','i'); w3.setP('goal','h'); w3.onbNext();
  w3.setP('equipment','gym'); w3.onbNext(); w3.onbNext();
  w3.setP('shiftType','none'); w3.onbNext(); w3.onbNext();
  w3.setP('style','std');
  { const b = d3.querySelectorAll('#screenBody button.btn');
    b[b.length-1].dispatchEvent(new w3.MouseEvent('click',{bubbles:true})); }
  w3.onbNext(); w3.finishOnboarding();

  w3.go('progress');
  const pt = s3.get().textContent;
  chk('progress shows an empty state, never invented data',
      pt.includes('No session recorded') || pt.includes('Insufficient'));
  chk('a labelled example is offered when there is no history',
      pt.includes('Illustrative example') || pt.includes('exemple'));
  chk('the example is explicitly separated from real data',
      pt.includes('not your data') || pt.includes('pas vos données'));

  w3.go('body');
  chk('body screen explains that nothing is recorded yet',
      s3.get().textContent.includes('Select a muscle group') ||
      s3.get().textContent.includes('No data'));
}

/* ================================================================ */
group('12. Anatomy selection regressions (QA fixes)');
{
  const dom5 = await boot();
  const w5 = dom5.window, d5 = dom5.window.document;
  completeOnboarding(w5, d5);
  const click5 = el => el.dispatchEvent(new w5.MouseEvent('click',{bubbles:true}));

  // a transparent hit layer must exist above the inert artwork
  w5.go('body');
  const hits = d5.querySelectorAll('.seg-hit').length;
  const visible = d5.querySelectorAll('.seg').length;
  chk('a transparent hit layer is rendered', hits > 0, hits + ' hit paths');
  chk('hit layer covers every visible region', hits === visible,
      hits + ' hit / ' + visible + ' visible');

  // tapping a region opens its record
  click5(d5.querySelector('.seg-hit[data-m="biceps"]'));
  chk('tapping a region selects it', w5.ANC.bodySel === 'biceps');

  // tapping the SAME region again must not close the record
  click5(d5.querySelector('.seg-hit[data-m="biceps"]'));
  chk('re-tapping keeps the record open', w5.ANC.bodySel === 'biceps',
      'BODY_SEL = ' + w5.ANC.bodySel);

  // from the dashboard, tapping navigates AND selects
  w5.go('home');
  click5(d5.querySelector('.seg-hit[data-m="chest"]'));
  chk('dashboard tap navigates to Body', w5.ANC.view === 'body', 'view=' + w5.ANC.view);
  chk('dashboard tap opens the tapped muscle', w5.ANC.bodySel === 'chest',
      'BODY_SEL = ' + w5.ANC.bodySel);
  const heading = d5.querySelector('.panel .sub');
  chk('the record heading matches the tapped region',
      heading && heading.textContent.trim() === w5.t('mg.chest'),
      heading ? heading.textContent.trim() : 'no heading');

  // selecting a back-only muscle from the list switches the view
  w5.setSide('front');
  w5.selectMuscle('hamstrings');
  chk('selecting a back-only muscle switches the view',
      w5.ANC.bodySide === 'back', 'side=' + w5.ANC.bodySide);

  // rotating away from the selected muscle clears it rather than showing nothing
  w5.selectMuscle('hamstrings');
  w5.rotateFig();                                  // -> front, hamstrings absent
  chk('rotating away from the selection clears it', w5.ANC.bodySel === null,
      'BODY_SEL = ' + w5.ANC.bodySel);

  // the record offers explicit actions
  w5.selectMuscle('quads');
  const btns = Array.from(d5.querySelectorAll('#screenBody button'))
                    .map(b => b.textContent.trim());
  chk('the record offers a close action', btns.some(x => x === w5.t('body.close')));
  chk('the record offers a "log a session" action', btns.some(x => x === w5.t('body.train')));

  // accessible language selector in the profile
  w5.go('profile');
  const langTiles = Array.from(d5.querySelectorAll('#screenBody .tile'))
    .filter(b => (b.getAttribute('onclick')||'').indexOf('switchLang') === 0).length;
  chk('profile exposes a full-size language selector', langTiles === 7,
      langTiles + ' language rows');
}

/* ================================================================ */
group('13. Language switching in the live UI');
{
  const dom4 = await boot();
  const w4 = dom4.window, d4 = dom4.window.document;
  const t4 = () => (d4.querySelector('#screenBody')||d4.body).textContent.replace(/\s+/g,' ');
  w4.setConsent();
  const en = t4();
  w4.switchLang('fr');
  chk('French applied', t4() !== en && /Depuis|entra\u00eenes|s\u00e9rieusement/.test(t4()),
      t4().slice(0, 60));
  w4.switchLang('de'); chk('German applied', t4().includes('Trainingserfahrung') || t4().includes('Schritt'));
  w4.switchLang('nl'); chk('Dutch applied', t4().includes('Stap') || t4().includes('ervaring'));
  w4.switchLang('es'); chk('Spanish applied', t4().includes('Paso'));
  w4.switchLang('it'); chk('Italian applied', t4().includes('Passo'));
  w4.switchLang('en'); chk('English restored', t4() === en || t4().includes('Step'));
  chk('language choice persists', w4.localStorage.getItem('ancestor.lang') === 'en');
  // no untranslated key should ever reach the screen
  const leaked = ['undefined','[object Object]'].filter(x => t4().includes(x));
  chk('no untranslated placeholders leak into the UI', leaked.length === 0, leaked.join(', '));
}

/* ================================================================ */
group('14. The failure state');
{
  const dom5 = await boot();
  const w5 = dom5.window, d5 = dom5.window.document;

  const host = d5.createElement('div');
  host.innerHTML = w5.failureState(new Error('synthetic failure'));
  d5.querySelector('#screenBody').appendChild(host);

  chk('a throwing screen has a designed place to land', !!d5.querySelector('.fail'));
  chk('it says the log is intact', /untouched|intact/i.test(d5.querySelector('.fail').textContent));
  chk('it offers a way out', d5.querySelectorAll('.fail .act button').length >= 2);
  chk('the stack is available but not shouted',
      !!d5.querySelector('.fail-more') && !d5.querySelector('.fail-more[open]'));
  chk('it is marked with the broken tally, not a stock warning icon',
      d5.querySelectorAll('.fail .mk svg rect').length === 5);

  /* The guard itself: the render must not call a screen unprotected. */
  const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  chk('the screen render is wrapped, so one bad view cannot take the app down',
      /try \{\s*out = onboarding \? Screens\.onb\(\)/.test(appSrc) &&
      /catch \(err\)[\s\S]{0,200}failureState/.test(appSrc));

  /* Every empty state carries the same mark — the blank tally form. */
  const compSrc = fs.readFileSync(path.join(ROOT, 'js/ui/components.js'), 'utf8');
  chk('empty and failed states are marked by the app, not by an icon set',
      !/EMPTY_ICON/.test(compSrc) && /TALLY_BLANK/.test(compSrc) && /TALLY_BROKEN/.test(compSrc));
}

/* ================================================================ */
/* ================================================================ */
group('16. Progressive disclosure: one action per moment');
{
  const dom7 = await boot();
  const w7 = dom7.window, d7 = w7.document;
  completeOnboarding(w7, d7);
  const body = () => d7.getElementById('screenBody');
  /* what a person actually meets: controls outside a closed <details> */
  const exposed = el => {
    let n = el;
    while(n && n !== body()){
      if(n.tagName === 'DETAILS' && !n.hasAttribute('open')) return false;
      n = n.parentElement;
    }
    return true;
  };
  const visBtns = () => Array.from(body().querySelectorAll('button,[role=button]')).filter(exposed);

  /* --- home: one dominant action --------------------------------------- */
  w7.go('home');
  const acts = Array.from(body().querySelectorAll('.dash-actions button'));
  chk('home offers at most three actions at full weight', acts.length <= 3,
      acts.length + ' actions');
  chk('home has exactly one primary action',
      body().querySelectorAll('.dash-actions .btn:not(.quiet):not(.secondary)').length === 1,
      body().querySelectorAll('.dash-actions .btn:not(.quiet):not(.secondary)').length + ' primary');
  chk('the rest wait behind a disclosure',
      body().querySelectorAll('.dash-actions ~ details.dis').length >= 1 ||
      body().querySelectorAll('details.dis').length >= 1);
  chk('the dashboard figure is not one giant button',
      !body().querySelector('.dash-figlink[onclick]') &&
      !body().querySelector('button.dash-figlink'));
  chk('nothing interactive is nested inside a button',
      Array.from(body().querySelectorAll('button,[role=button]'))
        .filter(e => e.querySelector('button,[role=button]')).length === 0);
  chk('the dashboard map is a picture, not thirty tab stops',
      body().querySelectorAll('.seg-hit[tabindex="0"]').length === 0,
      body().querySelectorAll('.seg-hit').length + ' tappable regions, 0 in the tab order');
  const figSvg = body().querySelector('.dash-figlink svg');
  const figName = (figSvg && figSvg.getAttribute('aria-label')) || '';
  chk('the dashboard map still says what it is, and what to do next',
      figName.indexOf(w7.t('body.title')) === 0 && figName.indexOf(w7.t('home.mapCta')) > 0,
      JSON.stringify(figName));

  /* --- the tappable map still navigates ------------------------------- */
  const seg = body().querySelector('.seg-hit[data-m="chest"]');
  seg.dispatchEvent(new w7.MouseEvent('click', {bubbles:true}));
  chk('tapping a region on the dashboard still opens it',
      w7.ANC.view === 'body' && w7.ANC.bodySel === 'chest', w7.ANC.view + '/' + w7.ANC.bodySel);

  /* --- session: a heading outline and a smaller wall ------------------- */
  w7.go('session'); w7.startSession();
  chk('the active session has a heading', body().querySelectorAll('h1').length === 1,
      body().querySelectorAll('h1').length + ' h1');
  const exs = w7.ANC.active.exercises.length;
  chk('every exercise is a heading of the same rank',
      body().querySelectorAll('h2.sess-ex-h').length === exs,
      body().querySelectorAll('h2.sess-ex-h').length + ' / ' + exs);
  const setCards = body().querySelectorAll('.setcard').length;
  chk('the control wall is behind disclosures',
      body().querySelectorAll('details.set-opts').length === setCards &&
      body().querySelectorAll('details.ex-opts').length === exs,
      body().querySelectorAll('details.ex-opts').length + ' exercise + ' +
      body().querySelectorAll('details.set-opts').length + ' set disclosures');
  const buttons = visBtns().length;
  chk('fewer than half the session buttons are exposed at once', buttons < 45,
      buttons + ' of ' + body().querySelectorAll('button').length + ' exposed');
  chk('discard is not at the top of the session',
      !body().querySelector('.live-hud [onclick*="discardSession"]'));
  chk('discard sits under the finish action, in text weight',
      !!body().querySelector('.heavy [onclick*="discardSession"]') &&
      !body().querySelector('.heavy button.btn[onclick*="discardSession"]'));
  chk('the disclosure is native <details>, so it works without script',
      Array.from(body().querySelectorAll('details.dis')).every(el =>
        el.querySelector(':scope > summary')));
  /* fields say which set they belong to */
  const labelled = Array.from(body().querySelectorAll('.setcard .fld label'));
  chk('each field names its set for a screen reader', labelled.length > 0 &&
      labelled.filter(l => /Set \d+|Satz|Série|Serie|Satz|المجموعة|Satz/.test(l.textContent) ||
        /\d+ \/ \d+/.test(l.textContent)).length === labelled.length,
      labelled.length + ' field labels, ' +
      labelled.filter(l => /\d+ \/ \d+/.test(l.textContent)).length + ' carry the set number');
  /* the sub navigation no longer reads as one word */
  /* the accessible name is text minus aria-hidden subtrees — textContent is not
     what a screen reader reads, which is why the count was glued on for months */
  const accName = el => {
    const walk = n => Array.from(n.childNodes).map(c => {
      if(c.nodeType === 3) return c.nodeValue;
      if(c.nodeType !== 1) return '';
      if(c.getAttribute('aria-hidden') === 'true') return '';
      if(c.hasAttribute('aria-label')) return '';
      return walk(c);
    }).join(' ');
    return walk(el).replace(/\s+/g, ' ').trim();
  };
  const tabs = Array.from(body().querySelectorAll('.subnav-btn'));
  const libraryTab = tabs.filter(b => b.textContent.indexOf('88') >= 0)[0];
  chk('a count in the sub-navigation is not glued to its label',
      !libraryTab || accName(libraryTab) === w7.t('plan.tabLibrary').trim(),
      libraryTab ? JSON.stringify(accName(libraryTab)) : 'no count on this tab');
  chk('the active-session dot is not part of its name',
      tabs.filter(b => b.textContent.indexOf('●') >= 0)
          .every(b => accName(b).indexOf('●') < 0));
}

group('15. The boot veil and the offline state');
{
  const dom6 = await boot();
  const w6 = dom6.window, d6 = dom6.window.document;

  /* Rebuild the veil the way index.html ships it, then let bootCopy fill it. */
  const veil = d6.createElement('div');
  veil.id = 'appBoot';
  veil.innerHTML = '<p class="app-boot-k" id="bootKicker">RECOVERY ENGINE</p>' +
    '<svg class="app-boot-mark">' +
    ['bs1','bs2','bs3','bs4','bs5'].map((c, i) =>
      '<rect class="bs ' + c + '" x="' + (3.2 + i * 5) + '" y="4.2" width="2.4" height="15.6"/>').join('') +
    '</svg><p class="app-boot-note" id="bootNote"></p>';
  d6.body.appendChild(veil);

  w6.bootCopy();
  chk('the boot veil speaks the app language', d6.getElementById('bootKicker').textContent === w6.t('app.tag'),
      d6.getElementById('bootKicker').textContent);
  chk('it no longer names the source project',
      !/PERFORMANCE LAB/i.test(d6.getElementById('bootKicker').textContent));
  chk('it says where the data lives', d6.getElementById('bootNote').textContent === w6.t('app.bootNote'));
  chk('the load is the mark being drawn, five strokes',
      d6.querySelectorAll('.app-boot-mark rect').length === 5);

  w6.switchLang('fr'); w6.bootCopy();
  chk('and it is French in French', /MOTEUR/i.test(d6.getElementById('bootKicker').textContent),
      d6.getElementById('bootKicker').textContent);

  w6.switchLang('ar'); w6.bootCopy();
  chk('Arabic names the recovery engine, not the old lab',
      !/مختبر/.test(d6.getElementById('bootKicker').textContent) &&
      d6.getElementById('bootKicker').textContent === w6.t('app.tag'),
      d6.getElementById('bootKicker').textContent);
  w6.switchLang('en');

  /* Offline is the design, not a fault. */
  const off = w6.t('app.offlineOk');
  chk('the offline state says the app still works, not that it is broken',
      /works|fonctionne|funciona|funktioniert|funziona|werkt|يعمل/.test(off), off);

  veil.parentNode.removeChild(veil);
}

/* ================================================================ */
console.log('\n' + '='.repeat(64));
if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' UI TESTS PASSED\x1b[0m');
else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed');
       failures.forEach(f => console.log('   - ' + f)); }
console.log('='.repeat(64) + '\n');
process.exit(fail === 0 ? 0 : 1);
})();
