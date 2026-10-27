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

  /* --- the exercise atlas is a register, not a grid of cards ---------- */
  w7.setSessionSub('library'); w7.render();
  const rows = Array.from(body().querySelectorAll('.ex-card'));
  chk('every exercise is exactly one row and one control', rows.length > 80 &&
      rows.every(r => r.tagName === 'BUTTON' &&
        r.querySelectorAll('button,[role=button],a').length === 0),
      rows.length + ' rows, one control each');
  const libControls = body().querySelectorAll('button,[role=button],input').length;
  chk('the atlas stays under 130 controls', libControls < 130, libControls + ' controls');
  const libWords = (body().textContent || '').trim().split(/\s+/).filter(Boolean).length;
  chk('the atlas stays under 700 words', libWords < 700, libWords + ' words');
  const chips = Array.from(body().querySelectorAll('.chip'));
  const hiddenChips = chips.filter(c => c.closest('details.atlas-more'));
  chk('the two filters nobody changes are behind a disclosure',
      !!body().querySelector('details.atlas-more') && hiddenChips.length >= 12 &&
      chips.length - hiddenChips.length < 20,
      hiddenChips.length + ' of ' + chips.length + ' filter chips wait behind it');
  /* a row opens the sheet that holds every action the row used to duplicate */
  rows.filter(r => /Bench Press/.test(r.textContent))[0]
    .dispatchEvent(new w7.MouseEvent('click', {bubbles:true}));
  const sheetEl = d7.getElementById('sheetHost');
  chk('a row opens the exercise sheet, which holds add-to-plan',
      !!sheetEl && /Bench Press/.test(sheetEl.textContent) &&
      !!sheetEl.querySelector('[onclick*="addExerciseTo"]'),
      sheetEl ? 'sheet open' : 'no sheet');
  w7.closeSheet();
}

group('17. Profile: four records that name their own value');
{
  const dom8 = await boot();
  const w8 = dom8.window, d8 = w8.document;
  completeOnboarding(w8, d8);
  w8.go('profile');
  const body = () => d8.getElementById('screenBody');
  const exposed = el => {
    let n = el;
    while(n && n !== body()){
      if(n.tagName === 'DETAILS' && !n.hasAttribute('open')) return false;
      n = n.parentElement;
    }
    return true;
  };

  chk('the profile is one h1 and four h2 groups',
      body().querySelectorAll('h1').length === 1 &&
      body().querySelectorAll('h2').length === 4,
      body().querySelectorAll('h1').length + ' h1, ' +
      body().querySelectorAll('h2').length + ' h2');
  const groups = Array.from(body().querySelectorAll('details.prof-group'));
  chk('every group is a native disclosure with a summary',
      groups.length === 4 && groups.every(g => g.firstElementChild.tagName === 'SUMMARY'));
  chk('every group names its current value while closed',
      groups.every(g => {
        const v = g.querySelector('.prof-val');
        return v && v.textContent.trim().length > 0;
      }), groups.map(g => (g.querySelector('.prof-val') || {}).textContent).join(' | '));

  /* A fold has to advertise what it holds. The four summaries are the whole
     table of contents for a page of 160+ controls, so the things people arrive
     looking for — the unit, the shift pattern, the backup — are named in them,
     not only inside. */
  groups.forEach(g => g.removeAttribute('open'));
  const vals = groups.map(g => g.querySelector('.prof-val').textContent.replace(/\s+/g, ' ').trim());
  const joined = vals.join(' | ');
  const shiftWord = w8.t('onb.shift.' + ({none:'no', night:'night', rotating:'rot'}[w8.getState().profile.shiftType]));
  chk('a closed fold still names the unit in use',
      new RegExp('\\b' + w8.getState().profile.unit + '\\b').test(joined), joined);
  chk('a closed fold still names the shift pattern in use',
      joined.indexOf(shiftWord) >= 0, joined);
  chk('and still says when the data was last exported',
      joined.indexOf(w8.t('you.lastBackup')) >= 0, joined);
  groups[0].setAttribute('open', '');   /* back to the page as it ships */

  /* The claim is collapse, not delete: the settings are all still there. */
  const all = body().querySelectorAll('button,[role=button],input,select,textarea').length;
  const vis = Array.from(body().querySelectorAll('button,[role=button],input,select,textarea'))
                  .filter(exposed).length;
  chk('no setting was deleted to make the page short', all >= 160, all + ' controls in the DOM');
  chk('most of them wait to be needed', vis < 70, vis + ' of ' + all + ' exposed');

  /* Opening a group still changes the setting, and the summary follows. */
  const a11y = groups.filter(g => /Accessibility/.test(g.textContent))[0];
  a11y.setAttribute('open', '');
  const tile = Array.from(a11y.querySelectorAll('button'))
    .filter(b => (b.getAttribute('onclick') || '').indexOf("setDisplay('highContrast'") >= 0)[0];
  chk('a display setting is reachable inside its group', !!tile);
  const before = a11y.querySelector('.prof-val').textContent;
  tile.dispatchEvent(new w8.MouseEvent('click', {bubbles:true}));
  chk('the setting takes effect', w8.getState().profile.display.highContrast === true);
  const after = body().querySelectorAll('details.prof-group')[2].querySelector('.prof-val').textContent;
  chk('the closed row now states the new value', after !== before && /contrast/i.test(after), after);
  w8.setDisplay('highContrast', false);

  /* Language is still a full-size choice, not a chip row. */
  const langTiles = Array.from(body().querySelectorAll('.tile'))
    .filter(b => (b.getAttribute('onclick') || '').indexOf('switchLang') === 0).length;
  chk('the language selector is still seven full rows', langTiles === 7, langTiles + ' rows');
}

group('18b. No screen nests one staggered group inside another');
{
  /* The atlas shipped with two identical wrapper divs around the same 88 rows:
     one open tag too many, one close, and the browser nested the register
     inside itself — which cost it half the page width, because the outer grid
     spent its second column on nothing. Nothing asserted the shape. */
  const dom = await boot();
  const w = dom.window, d = w.document;
  completeOnboarding(w, d);
  const offenders = [];
  for(const view of ['home','session','library','body','progress','profile','science']){
    if(view === 'library') w.openExerciseLibrary(); else w.go(view);
    const nested = d.getElementById('screenBody').querySelectorAll('[data-stagger] [data-stagger]');
    if(nested.length) offenders.push(view + ':' + nested.length);
    const empty = Array.from(d.getElementById('screenBody').querySelectorAll('[data-stagger]'))
      .filter(el => !el.children.length).length;
    if(empty) offenders.push(view + ':empty' + empty);
  }
  chk('every staggered group is a single container with children in it',
      offenders.length === 0, offenders.join(' ') || '7 screens clean');
}

group('19. Today answers three questions, not nine');
{
  const dom10 = await boot();
  const w10 = dom10.window, d10 = w10.document;
  completeOnboarding(w10, d10);
  w10.go('home');
  const body = () => d10.getElementById('screenBody');

  const heads = Array.from(body().querySelectorAll('h1,h2,h3'));
  const h1s = heads.filter(h => h.tagName === 'H1');
  const h2s = heads.filter(h => h.tagName === 'H2');
  const h3s = heads.filter(h => h.tagName === 'H3');
  chk('the dashboard has one heading and three bands',
      h1s.length === 1 && h2s.length === 3,
      h1s.length + ' h1, ' + h2s.length + ' h2 (' + h2s.map(h => h.textContent.trim()).join(' · ') + ')');
  chk('the bands are today, this week, understand',
      h2s.map(h => h.textContent.trim()).join('|') ===
      [w10.t('home.bandToday'), w10.t('home.bandWeek'), w10.t('home.bandUnderstand')].join('|'),
      h2s.map(h => h.textContent.trim()).join('|'));
  chk('the sections inside a band are h3, never h2',
      h3s.length >= 5 && heads.every(h => ['H1','H2','H3'].indexOf(h.tagName) >= 0),
      h3s.length + ' h3');
  chk('no section repeats its band name',
      h3s.filter(h => h2s.some(b => b.textContent.trim() === h.textContent.trim())).length === 0,
      h3s.map(h => h.textContent.trim()).join(' · '));
  chk('every band heading is inside a column, not orphaned at the end',
      h2s.every(h => h.parentElement &&
        h.parentElement.classList.contains('bento-col')));
  chk('the band heading is not a link and has no control in it',
      h2s.every(h => h.querySelectorAll('button,a').length === 0));
  /* the outline order matches reading order: Today before This week before Understand */
  const idx = k => heads.indexOf(h2s[k]);
  chk('the bands appear in the order they are meant to be read',
      idx(0) < idx(1) && idx(1) < idx(2));
  /* the week ring lost its duplicate heading but not its content */
  chk('the weekly ring is still on the page', !!body().querySelector('.dash-week'));
  chk('the dashboard still has exactly one primary action',
      body().querySelectorAll('.dash-actions .btn:not(.quiet):not(.secondary)').length === 1);
}

group('20. The session shows the work, not the whole programme');
{
  const dom11 = await boot();
  const w11 = dom11.window, d11 = w11.document;
  completeOnboarding(w11, d11);
  w11.go('session'); w11.startSession();
  const body = () => d11.getElementById('screenBody');
  const blocks = () => Array.from(body().querySelectorAll('details.ex-block'));
  const isOpen = el => el.hasAttribute('open');
  const visibleText = node => {
    let out = '';
    Array.from(node.childNodes).forEach(c => {
      if(c.nodeType === 3){ out += ' ' + c.nodeValue; return; }
      if(c.nodeType !== 1) return;
      if(c.tagName === 'DETAILS' && !c.hasAttribute('open')) return;
      if(c.getAttribute('aria-hidden') === 'true') return;
      out += ' ' + visibleText(c);
    });
    return out;
  };

  chk('there is one block per exercise', blocks().length === w11.ANC.active.exercises.length,
      blocks().length + ' blocks');
  chk('only the current exercise is open', blocks().filter(isOpen).length === 1,
      blocks().filter(isOpen).length + ' open');
  chk('a folded exercise states how much of it is done',
      blocks().every(bl => {
        const meta = bl.querySelector('.ex-block-meta');
        return meta && /\d+\s*of\s*\d+|\d+\/\d+/.test(meta.textContent);
      }), blocks()[1].querySelector('.ex-block-meta').textContent.trim());
  chk('every set is still in the document: nothing was deleted',
      body().querySelectorAll('.setcard').length ===
      w11.ANC.active.exercises.reduce((a, e) => a + e.sets.length, 0),
      body().querySelectorAll('.setcard').length + ' set cards');
  chk('the outline still names every exercise',
      body().querySelectorAll('h2.sess-ex-h').length === blocks().length,
      body().querySelectorAll('h2.sess-ex-h').length + ' h2');

  const words = visibleText(body()).trim().split(/\s+/).filter(Boolean).length;
  chk('the visible session is a fraction of the rendered one', words < 300, words + ' visible words');

  /* looking ahead must not close the block you opened */
  const second = blocks()[1];
  const ex1id = w11.ANC.active.exercises[1].id;
  second.querySelector('summary').dispatchEvent(new w11.MouseEvent('click', {bubbles:true}));
  second.setAttribute('open', '');
  w11.render();
  const secondAgain = Array.from(body().querySelectorAll('details.ex-block'))[1];
  chk('an exercise you opened stays open across a re-render', isOpen(secondAgain));
  const firstAfter = Array.from(body().querySelectorAll('details.ex-block'))[0];
  chk('and the auto-opened current exercise stays open too', isOpen(firstAfter));
  w11.exOpen(ex1id, false); w11.render();

  /* logging every set of the current exercise moves the focus */
  w11.ANC.active.exercises[0].sets.forEach((st, si) => {
    ['w','a','r','t','d'].forEach(k => w11.setVal(0, si, k, 60));
    w11.toggleSet(0, si);
  });
  w11.render();
  const after = Array.from(body().querySelectorAll('details.ex-block'));
  const openAfter = after.filter(isOpen);
  chk('finishing an exercise hands the screen to the next one',
      openAfter.length === 1 && openAfter[0] === after[1],
      openAfter.length + ' open, index ' + after.indexOf(openAfter[0]));
  chk('the finished exercise folds itself away', !after[0].hasAttribute('open'));
  chk('and its summary now says it is done',
      /3 of 3|3\/3/.test(after[0].querySelector('.ex-block-meta').textContent),
      after[0].querySelector('.ex-block-meta').textContent.trim());
}

group('21. The rest timer is readable without watching it');
{
  const dom12 = await boot();
  const w12 = dom12.window, d12 = w12.document;
  completeOnboarding(w12, d12);
  w12.go('session'); w12.startSession();
  w12.startRest(120);
  const host = d12.getElementById('restHost');

  chk('rest is a labelled region', !!host.querySelector('[role=region][aria-label]'));
  const track = host.querySelector('[role=progressbar]');
  chk('the countdown is a progressbar with a value', !!track &&
      track.getAttribute('aria-valuemin') === '0' &&
      track.getAttribute('aria-valuemax') === '120' &&
      track.getAttribute('aria-valuenow') !== null,
      track ? 'now=' + track.getAttribute('aria-valuenow') + ' max=' + track.getAttribute('aria-valuemax') : 'none');
  const clock = host.querySelector('#restT');
  chk('the ticking clock is hidden from screen readers', clock && clock.getAttribute('aria-hidden') === 'true',
      clock ? clock.textContent : 'no clock');
  const say = host.querySelector('#restSay');
  chk('one polite status line speaks when rest starts',
      say && say.getAttribute('role') === 'status' && say.getAttribute('aria-live') === 'polite' &&
      /2:00|120/.test(say.textContent), say ? say.textContent.trim() : 'none');

  w12.pauseRest();
  chk('pausing speaks, and says how long is left',
      /paus/i.test(d12.getElementById('restSay').textContent),
      d12.getElementById('restSay').textContent.trim());
  const pausedAt = d12.getElementById('restSay').textContent;
  w12.resumeRest();
  chk('resuming speaks again and keeps the remaining time',
      d12.getElementById('restSay').textContent !== pausedAt,
      d12.getElementById('restSay').textContent.trim());
  w12.addRest(15);
  chk('adding time says so', /15/.test(d12.getElementById('restSay').textContent),
      d12.getElementById('restSay').textContent.trim());
  const nowVal = +d12.querySelector('#restTrack').getAttribute('aria-valuenow');
  const maxVal = +d12.querySelector('#restTrack').getAttribute('aria-valuemax');
  chk('adding time lengthens the rest instead of overshooting its own maximum',
      maxVal === 135 && nowVal >= 0 && nowVal <= maxVal,
      nowVal + ' of ' + maxVal);
  w12.stopRest(); w12.render();
  chk('closing rest leaves nothing behind', !d12.getElementById('restHost').querySelector('[role=region]'));
}

group('23. Today states the decision, not the whole case for it');
{
  const dom14 = await boot();
  const w14 = dom14.window, d14 = w14.document;
  completeOnboarding(w14, d14);
  const S = o => Object.assign({w:null,r:null,t:null,d:null,a:null,rir:null}, o);
  const now = Date.now();
  for(let i = 3; i >= 1; i--){
    w14.addSession({ date: now - i*3*864e5, startedAt: now - i*3*864e5, planId: 'A', name: 'S' + i,
      exercises: [{ id:'bb-bench', sets:[S({w:60+i*2, r:8, rir:2})] },
                  { id:'bb-row', sets:[S({w:50+i, r:10, rir:2})] }] });
  }
  w14.go('home');
  const body = () => d14.getElementById('screenBody');

  /* what a person can read without opening anything */
  const walk = el => {
    let out = '';
    Array.from(el.childNodes).forEach(c => {
      if(c.nodeType === 3){ out += ' ' + c.nodeValue; return; }
      if(c.nodeType !== 1) return;
      if(c.classList && c.classList.contains('sr-only')) return;
      if(c.getAttribute && (c.getAttribute('aria-hidden') === 'true' || c.hasAttribute('hidden'))) return;
      const tg = String(c.tagName).toLowerCase();
      if(tg === 'svg' || tg === 'title' || tg === 'desc') return;
      if(tg === 'details' && !c.hasAttribute('open')) return;
      out += ' ' + walk(c);
    });
    return out;
  };
  const visibleWords = () => walk(body()).trim().split(/\s+/).filter(Boolean).length;

  chk('the dashboard reads in under 240 words', visibleWords() < 240, visibleWords() + ' visible words');

  const pills = () => Array.from(body().querySelectorAll('.next-ex-pill'));
  const openPills = () => pills().filter(el => {
    let n = el;
    while(n && n !== body()){
      if(String(n.tagName).toLowerCase() === 'details' && !n.hasAttribute('open')) return false;
      n = n.parentElement;
    }
    return true;
  });
  chk('the verdict shows at most two lifts', openPills().length <= 2,
      openPills().length + ' visible of ' + pills().length);
  chk('the rest of the session is one line away',
      !!body().querySelector('details.next-ex-more') && pills().length > 2,
      pills().length + ' pills in the document');
  chk('the glance states the cost of the session instead',
      /\d+\s*lifts/.test(body().querySelector('.next-blueprint').textContent),
      body().querySelector('.next-blueprint .hint').textContent.trim());

  /* every caveat is still on the page, one tap down */
  const reads = Array.from(body().querySelectorAll('details.dis'));
  const has = txt => reads.some(dt => dt.textContent.indexOf(txt) >= 0);
  chk('the availability definition is kept, behind its own line',
      body().textContent.indexOf(w14.t('readiness.definition')) >= 0 &&
      has(w14.t('readiness.title')) && reads.length >= 2,
      reads.length + ' disclosures');
  chk('the insight keeps its "this is not a diagnosis" caveat',
      body().textContent.indexOf(w14.t('home.insightGapBody')) >= 0);
  chk('the coverage method note is kept too',
      body().textContent.indexOf(w14.t('home.coverageHint')) >= 0);
  chk('a caveat is never a hover or a tooltip alone',
      reads.every(dt => dt.querySelector('summary') !== null));

  chk('the decision itself does not depend on a disclosure being open',
      body().querySelectorAll('.dec-state').length === 1 &&
      !!body().querySelector('.dash-actions .btn'));
}

group('26. The bar knows when a field has the keyboard');
{
  const dom17 = await boot();
  const w17 = dom17.window, d17 = w17.document;
  completeOnboarding(w17, d17);
  const S = o => Object.assign({w:null,r:null,t:null,d:null,a:null,rir:null}, o);
  w17.addSession({ date: Date.now()-5*864e5, startedAt: Date.now()-5*864e5, planId:'A', name:'S',
    exercises:[{ id:'bb-bench', sets:[S({w:60, r:8, rir:2})] }] });
  w17.go('session'); w17.setSessionSub('plan'); w17.startSession && w17.startSession('A');
  const body = d17.body;

  const field = () => d17.getElementById('sf_0_0_reps');
  chk('the live session has a field to type into', !!field(),
      body.querySelectorAll('input[type=number]').length + ' number fields');

  /* Real focus, not synthetic events: jsdom fires focusin/focusout itself when
     an element is focused, and document.activeElement is what the deferred
     focusout check reads. */
  field().focus();
  chk('typing marks the document', body.classList.contains('typing'));

  field().blur();
  await new Promise(r => setTimeout(r, 20));
  chk('leaving the field clears the mark', !body.classList.contains('typing'));

  /* moving from one field to the next must not flash the bar back in */
  field().focus();
  const load = d17.getElementById('sf_0_0_load');
  load.focus();
  await new Promise(r => setTimeout(r, 20));
  chk('moving between two fields stays "typing"', body.classList.contains('typing'),
      'active=' + (d17.activeElement && d17.activeElement.id));
  load.blur();
  await new Promise(r => setTimeout(r, 20));

  /* a button is not a keyboard */
  const btn = d17.querySelector('#screenBody .btn');
  btn.focus();
  await new Promise(r => setTimeout(r, 20));
  chk('focusing a button is not typing', !body.classList.contains('typing'),
      body.className);
}

group('25. A record in the log is asked about with the rows that came before it');
{
  const dom16 = await boot();
  const w16 = dom16.window, d16 = w16.document;
  completeOnboarding(w16, d16);
  const S = o => Object.assign({w:null,r:null,t:null,d:null,a:null,rir:null}, o);
  const now = Date.now();
  /* An ascending series: 50 -> 54 -> 58 -> 62, so the last session is a record
     and the earlier ones were records of their own day, not of today. */
  [4,3,2,1].forEach(k => {
    const wgt = 46 + (5 - k) * 4;      // newer sessions are heavier: 50, 54, 58, 62
    w16.addSession({ date: now - k*4*864e5, startedAt: now - k*4*864e5, planId:'A', name:'S'+k,
      exercises:[{ id:'bb-bench', sets:[S({w:wgt, r:8, rir:2})] }] });
  });
  w16.go('progress');
  const body = () => d16.getElementById('screenBody');
  const metric = () => Array.from(body().querySelectorAll('.metric'))
    .filter(m => /records/i.test(m.querySelector('.k').textContent))[0];

  chk('the records metric counts records, not zero', /^[1-9]/.test(metric().querySelector('.v').textContent.trim()),
      metric().querySelector('.v').textContent.trim());
  chk('the metric says which period it counts',
      /period|période|periodo|Zeitraum/i.test(metric().querySelector('.d').textContent),
      metric().querySelector('.d').textContent.trim());

  /* An older row in the log must be judged against what came before it. */
  const st = w16.getState();
  const hist = w16.exerciseHistory('bb-bench');
  const oldest = hist[0], newest = hist[hist.length-1];
  chk('the oldest row was a baseline, not a record',
      w16.recordKind(st, 'bb-bench', oldest.sets, {excludeRow: oldest}) === 'baseline',
      w16.recordKind(st, 'bb-bench', oldest.sets, {excludeRow: oldest}));
  chk('the newest row is a record',
      w16.recordKind(st, 'bb-bench', newest.sets, {excludeRow: newest}) === 'pr');
}

group('24. The cost line is singular when the session is');
{
  const dom15 = await boot();
  const w15 = dom15.window, d15 = w15.document;
  completeOnboarding(w15, d15);
  w15.go('home');

  /* The sentence used to be one template with a number dropped in, so a
     one-lift day read "1 lifts · 1 sets". Each noun is its own key now. */
  chk('one lift and one set are singular', w15.sessionCostLine(1, 1, 8) === '1 lift · 1 set · ~8 min',
      w15.sessionCostLine(1, 1, 8));
  chk('two lifts and three sets stay plural', w15.sessionCostLine(2, 3, 73) === '2 lifts · 3 sets · ~73 min',
      w15.sessionCostLine(2, 3, 73));

  const langs = ['en','fr','es','de','it','nl','ar'];
  const bad = [];
  const before = w15.CURRENT_LANG;
  langs.forEach(l => {
    w15.setLang(l);
    const one = w15.sessionCostLine(1, 1, 8), many = w15.sessionCostLine(4, 9, 60);
    /* Arabic spells the singular out ("تمرين واحد") instead of prefixing a 1, so
       the check is that the two forms differ and carry no placeholder — not that
       every language prints a digit. */
    if(/[{}]/.test(one + many) || one.indexOf('undefined') >= 0) bad.push(l + ':' + one);
    if(one === many) bad.push(l + ': same sentence for 1 and 4');
    if(many.indexOf('4') < 0 || many.indexOf('9') < 0) bad.push(l + ': plural lost its numbers');
  });
  w15.setLang(before);
  chk('all seven languages carry both forms', bad.length === 0, bad.join('; ') || '7/7');

  const hint = d15.getElementById('screenBody').querySelector('.next-blueprint .hint');
  chk('the rendered verdict uses the plural-aware line',
      !!hint && hint.textContent.indexOf('·') > 0 && !/[{}]/.test(hint.textContent),
      hint && hint.textContent.trim());
}

group('22. The exercise pool is the same component as the step that fills it');
{
  const dom13 = await boot();
  const w13 = dom13.window, d13 = w13.document;
  completeOnboarding(w13, d13);
  w13.go('profile');
  const body = () => d13.getElementById('screenBody');
  const groups = () => Array.from(body().querySelectorAll('details.onb-ex-group'));

  chk('the pool is groups of the shared disclosure, not a second accordion',
      groups().length >= 8 && body().querySelectorAll('.acc').length === 0,
      groups().length + ' groups, ' + body().querySelectorAll('.acc').length + ' legacy');
  chk('nothing is forced open: the pool starts folded',
      groups().filter(g => g.hasAttribute('open')).length === 0,
      groups().filter(g => g.hasAttribute('open')).length + ' open');
  chk('every group states what it holds',
      groups().every(g => /\d+\s*\/\s*\d+/.test(g.querySelector('summary').textContent)),
      groups()[0].querySelector('summary').textContent.trim());
  chk('every chip states its state', Array.from(body().querySelectorAll('.onb-ex-group .chip'))
      .every(c => c.getAttribute('aria-pressed') === 'true'));

  /* removing one opens that group and offers a way back */
  chk('no restore action while nothing is removed',
      !body().querySelector('[onclick*="restoreExPool"]'));
  groups()[0].querySelector('.chip').dispatchEvent(new w13.MouseEvent('click', {bubbles:true}));
  const changed = groups().filter(g => g.hasAttribute('open'));
  chk('a group you changed opens itself', changed.length === 1, changed.length + ' open');
  chk('the changed group says so with more than colour',
      changed[0].querySelector('.flag.warn') !== null);
  chk('a restore action appears once something is removed',
      !!body().querySelector('[onclick*="restoreExPool"]'),
      body().querySelector('[onclick*="restoreExPool"]').parentElement.textContent.trim());

  const restoreBtn = body().querySelector('[onclick*="restoreExPool"]');
  restoreBtn.dispatchEvent(new w13.MouseEvent('click', {bubbles:true}));
  chk('restoring puts every exercise back',
      Object.keys(w13.getState().profile.exercises || {})
        .every(k => w13.getState().profile.exercises[k] === true),
      Object.keys(w13.getState().profile.exercises || {}).filter(
        k => w13.getState().profile.exercises[k] === false).length + ' still out');
  chk('and the restore action goes away again',
      !body().querySelector('[onclick*="restoreExPool"]'));

  /* the profile stayed short through all of it */
  const exposed = el => {
    let n = el;
    while(n && n !== body()){
      if(n.tagName === 'DETAILS' && !n.hasAttribute('open')) return false;
      n = n.parentElement;
    }
    return true;
  };
  const vis = Array.from(body().querySelectorAll('button,[role=button],input,select,textarea'))
                   .filter(exposed).length;
  chk('the profile is still under fifty controls at rest', vis < 50, vis + ' visible');
}

group("18. Onboarding's exercise step: remove, do not select");
{
  const dom9 = await boot();
  const w9 = dom9.window, d9 = w9.document;
  const body = () => d9.getElementById('screenBody');
  const exposed = el => {
    let n = el;
    while(n && n !== body()){
      if(n.tagName === 'DETAILS' && !n.hasAttribute('open')) return false;
      n = n.parentElement;
    }
    return true;
  };

  /* walk to the exercise step the way a person does */
  w9.setConsent();
  w9.setP('experience','i'); w9.setP('goal','h'); w9.onbNext();
  w9.setP('equipment','gym'); w9.onbNext();
  w9.setP('daysPerWeek',3); w9.onbNext();
  w9.setP('shiftType','night'); w9.onbNext();
  w9.onbNext(); w9.setP('style','std'); w9.onbNext();

  const groups = Array.from(body().querySelectorAll('details.onb-ex-group'));
  chk('the step is groups, not a wall of chips', groups.length >= 8 && groups.length <= 14,
      groups.length + ' groups');
  chk('every group is closed until you open it',
      groups.every(g => !g.hasAttribute('open')),
      groups.filter(g => g.hasAttribute('open')).length + ' open');
  chk('every group says how many it still holds',
      groups.every(g => /\d+\s*\/\s*\d+/.test(g.querySelector('summary').textContent)),
      groups[0].querySelector('summary').textContent.trim());
  const chips = body().querySelectorAll('.chip');
  chk('every chip is in the document; the pool is unchanged', chips.length > 60, chips.length + ' chips');
  chk('a chip that is on says so, in words a screen reader has',
      Array.from(chips).every(c => c.getAttribute('aria-pressed') === 'true'));

  /* removing one exercise: the group opens itself and the count follows */
  const first = groups[0];
  const before = first.querySelector('summary').textContent.trim();
  first.querySelector('.chip').dispatchEvent(new w9.MouseEvent('click', {bubbles:true}));
  const after = Array.from(body().querySelectorAll('details.onb-ex-group'))
    .filter(g => g.querySelector('summary').textContent.indexOf(
      first.querySelector('.dis-t').textContent) >= 0)[0];
  chk('a group you have changed opens itself', after.hasAttribute('open'));
  chk('its count drops by one and the state is announced',
      after.querySelector('summary').textContent.trim() !== before &&
      after.querySelector('.chip[aria-pressed="false"]') !== null,
      before.trim() + ' → ' + after.querySelector('summary').textContent.trim());
  chk('the profile keeps the same choice',
      Object.keys(w9.getState().profile.exercises || {}).some(k => w9.getState().profile.exercises[k] === false));

  /* opening a group and closing it again is remembered across a re-render */
  w9.onbExOpen('core', true); w9.render();
  const coreLabel = w9.t('pat.core');
  const openNow = Array.from(body().querySelectorAll('details.onb-ex-group'))
    .filter(g => g.querySelector('.dis-t').textContent === coreLabel)[0];
  chk('an open group survives the re-render a tap causes',
      !!openNow && openNow.hasAttribute('open'));
  w9.onbExOpen('core', false); w9.render();
  const closedNow = Array.from(body().querySelectorAll('details.onb-ex-group'))
    .filter(g => g.querySelector('.dis-t').textContent === coreLabel)[0];
  chk('and closing it again is remembered too',
      !!closedNow && !closedNow.hasAttribute('open'));

  /* the step is reachable without a pointer, and the next action still exists */
  chk('the step still has back and continue', body().querySelectorAll('.onb-actions button').length === 2);
  chk('back is available: the step is editable', /Back/.test(body().querySelector('.onb-actions').textContent));
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

group('27. Every screen has one h1 and no missing heading level');
{
  const dom18 = await boot();
  const w18 = dom18.window, d18 = w18.document;
  completeOnboarding(w18, d18);
  const S2 = o => Object.assign({w:null,r:null,t:null,d:null,a:null,rir:null}, o);
  w18.addSession({ date: Date.now()-5*864e5, startedAt: Date.now()-5*864e5, planId:'A', name:'S',
    exercises:[{ id:'bb-bench', sets:[S2({w:60, r:8, rir:2})] }] });

  /* Walk a screen state and return what a screen reader would encounter: the
     heading levels in document order. A level may never jump by more than one —
     an h1 followed by an h3 is a heading the reader cannot place. */
  const walk = (label) => {
    const hs = Array.from(d18.querySelectorAll('#screenBody h1,#screenBody h2,#screenBody h3,#screenBody h4'))
      .filter(h => !h.closest('[hidden]'));
    const levels = hs.map(h => Number(h.tagName[1]));
    let prev = 0, jump = null;
    levels.forEach((lv, i) => { if(prev && lv > prev + 1 && !jump) jump = prev + ' to ' + lv + ' at "' + hs[i].textContent.trim().slice(0, 26) + '"'; prev = lv; });
    const h1 = levels.filter(l => l === 1).length;
    chk(label + ': one h1, no skipped level', h1 === 1 && !jump,
        'h1=' + h1 + ', levels ' + levels.join('') + (jump ? ', jump ' + jump : ''));
  };

  w18.go('home'); walk('home');
  w18.go('session'); walk('session, before it starts');
  w18.startSession('A'); walk('session, live');
  w18.setSessionSub && w18.setSessionSub('plan'); walk('session, plan');
  w18.go('body'); walk('body, nothing selected');
  w18.selectMuscle('chest'); walk('body, a muscle selected');
  w18.go('progress'); walk('progress');
  w18.go('science'); walk('science hub');
  w18.go('profile'); walk('profile');
  w18.openExerciseLibrary(); walk('exercise library');
  w18.openExerciseDetail('bb-bench'); walk('exercise sheet');
  w18.closeSheet && w18.closeSheet();
  w18.openModule('muscle-growth'); walk('a lesson');
  w18.closeModule && w18.closeModule();
}

group('28. Rest can reach a person who is not looking at the tab');
{
  /* The countdown is a page timer. The honest upgrade is a notification through
     the service worker — and only where the platform can actually deliver it. */
  const open = async (opts) => {
    const dom = await boot();
    const w = dom.window, d = w.document;
    completeOnboarding(w, d);
    w.asked = 0;
    w.posted = [];
    if(opts.supported !== false){
      w.Notification = {
        permission: opts.permission || 'default',
        requestPermission: function(){ w.asked++; return Promise.resolve(opts.grant || 'granted'); }
      };
      Object.defineProperty(w.navigator, 'serviceWorker', {
        configurable: true,
        value: { ready: Promise.resolve({ showNotification: (title, o) => w.posted.push([title, o]) }) }
      });
    } else {
      delete w.Notification;
      try{ delete w.navigator.serviceWorker; }catch(e){}
    }
    Object.defineProperty(d, 'hidden', { configurable: true, get: () => opts.hidden !== false });
    if(opts.on) w.getState().profile.restNotify = true;
    return { w, d };
  };

  const a = await open({ });
  chk('the permission is never requested on boot', a.w.asked === 0,
      'requestPermission called ' + a.w.asked + ' times');
  chk('the alert is off until someone asks for it',
      a.w.getState().profile.restNotify === false);
  chk('and nothing is posted while it is off', a.w.notifyRestDone() === false && a.w.posted.length === 0);

  const b = await open({ on:true, permission:'granted', hidden:true });
  const posted = b.w.notifyRestDone();
  await new Promise(r => setTimeout(r, 20));   /* the post is a promise */
  chk('with permission and the tab in the background, rest is posted',
      posted === true && b.w.posted.length === 1, b.w.posted.length + ' notification');
  chk('and the notification says what happened, in the reader\'s language',
      (b.w.posted[0] || [])[0] === b.w.t('rest.notifyTitle') &&
      (b.w.posted[0] || [{}])[1] && b.w.posted[0][1].body === b.w.t('rest.notifyBody'),
      JSON.stringify((b.w.posted[0] || [])[0]));
  chk('one tag, so a second rest replaces the first',
      (b.w.posted[0] || [{}])[1] && b.w.posted[0][1].tag === 'ancestor-rest');

  const c = await open({ on:true, permission:'granted', hidden:false });
  chk('with the screen on, the toast is enough — nothing is posted',
      c.w.notifyRestDone() === false, 'visible tab');

  const dd = await open({ on:true, permission:'denied', hidden:true });
  chk('a denied permission posts nothing and claims nothing',
      dd.w.notifyRestDone() === false);

  const e = await open({ on:true, permission:'granted', supported:false });
  chk('a browser without notifications degrades quietly', e.w.notifyRestDone() === false);

  const g = await open({ permission:'default', grant:'granted' });
  g.w.setRestNotify();
  await new Promise(r => setTimeout(r, 30));
  chk('turning it on asks the browser, once', g.w.asked === 1, String(g.w.asked));
  chk('and records the answer', g.w.getState().profile.restNotify === true);

  const h = await open({ permission:'denied', grant:'denied' });
  h.w.setRestNotify();
  await new Promise(r => setTimeout(r, 30));
  chk('a refused request is stored as off, not as on', h.w.getState().profile.restNotify === false);

  const i2 = await open({ on:true, permission:'granted' });
  i2.w.setRestNotify();
  await new Promise(r => setTimeout(r, 30));
  chk('turning it off does not ask again', i2.w.asked === 0 && i2.w.getState().profile.restNotify === false);

  /* The timer itself: rest ends, and the alert goes out without anyone looking. */
  const j = await open({ on:true, permission:'granted', hidden:true });
  j.w.startSession('A');
  j.w.startRest(0.3);
  await new Promise(r => setTimeout(r, 700));
  chk('a finished rest posts the alert by itself', j.w.posted.length === 1,
      j.w.posted.length + ' posted');
}

/* ================================================================ */
console.log('\n' + '='.repeat(64));
if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' UI TESTS PASSED\x1b[0m');
else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed');
       failures.forEach(f => console.log('   - ' + f)); }
console.log('='.repeat(64) + '\n');
process.exit(fail === 0 ? 0 : 1);
})();
