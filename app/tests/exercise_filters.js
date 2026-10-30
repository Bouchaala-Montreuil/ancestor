/* Regression tests for exercise eligibility across plans, pickers, details and
   live drafts. These checks exercise the real app, not a parallel filter. */
const fs = require('fs'), path = require('path');
const {JSDOM, VirtualConsole} = require('jsdom');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
  '<script>' + fs.readFileSync(path.join(root, src), 'utf8') + '</script>');
const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
const dom = new JSDOM(html, {runScripts:'dangerously', pretendToBeVisual:true,
  url:'https://localhost/', virtualConsole:vc});
const w = dom.window, d = w.document;
w.scrollTo = () => {}; w.confirm = () => true;
w.boot(); w.chooseLang('en'); w.finishOnboarding();
let passed = 0, failed = 0;
function check(name, ok, detail){
  if(ok){ passed++; console.log('  PASS  ' + name); }
  else { failed++; console.error('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
const EX = w.eval('EX'), byId = w.eval('EX_BY_ID');
const profile = overrides => Object.assign({equipment:'gym', environment:'gym',
  limits:[], needs:{}, positions:[], exercises:{}, experience:'i', style:'std',
  daysPerWeek:3, sessionMinutes:35, goals:['h']}, overrides || {});
const scenarios = [
  ['default', profile()],
  ['wheelchair', profile({needs:{wheelchair:true}})],
  ['seated only', profile({needs:{seatedOnly:true}})],
  ['wheelchair and limited grip', profile({needs:{wheelchair:true,noGrip:true}})],
  ['low-impact only', profile({needs:{lowImpactOnly:true}})],
  ['no standing or floor', profile({needs:{noStanding:true,noFloor:true}})],
  ['no floor', profile({needs:{noFloor:true}})],
  ['no standing', profile({needs:{noStanding:true}})],
  ['no kneeling', profile({needs:{noKneeling:true}})],
  ['no overhead', profile({needs:{noOverhead:true}})],
  ['preferred seated position', profile({positions:['seated']})],
  ['outdoor with legacy gym equipment', profile({environment:'outdoor'})],
  ['home environment', profile({environment:'home'})],
  ['minimal equipment', profile({equipment:'minimal',environment:'limited'})],
  ['shoulder limitation', profile({limits:['shoulder']})],
  ['individually excluded', profile({exercises:{'db-bench':false,'cable-row':false}})]
];
for(const [name, p] of scenarios){
  const allowed = new Set(w.allowedExercises(p).map(e => e.id));
  const bad = [];
  for(const ex of EX) for(const sub of w.substitutesFor(p, ex.id))
    if(!allowed.has(sub.id)) bad.push(ex.id + '→' + sub.id);
  check(name + ': every suggested substitute is in the actual plan pool', bad.length === 0, bad.slice(0,4).join(', '));
  const plan = w.buildPlan(p);
  const prescribed = plan.sessions.flatMap(s => s.exercises);
  check(name + ': the generated plan only uses that same pool', prescribed.every(e => allowed.has(e.id)));
}
const contra = [
  ['sit-to-stand cannot be offered as seated-only', 'chair-stand', {seatedOnly:true}],
  ['sit-to-stand cannot be offered when standing is excluded', 'chair-stand', {noStanding:true}],
  ['overhead reach cannot be offered when overhead movement is excluded', 'overhead-reach', {noOverhead:true}],
  ['pike push-up cannot be offered when the floor is excluded', 'pike-pushup', {noFloor:true}],
  ['pike push-up cannot be offered when overhead movement is excluded', 'pike-pushup', {noOverhead:true}],
  ['ab wheel cannot be offered when kneeling is excluded', 'ab-wheel', {noKneeling:true}],
  ['kneeling cable crunch cannot be offered as seated-only', 'cable-crunch', {seatedOnly:true}],
  ['kneeling cable crunch cannot be offered when kneeling is excluded', 'cable-crunch', {noKneeling:true}],
  ['floor crunch cannot be offered as seated-only', 'db-crunch', {seatedOnly:true}],
  ['cat-cow cannot be offered when the floor is excluded', 'cat-cow', {noFloor:true}],
  ['bench-supported dumbbell row cannot be offered when kneeling is excluded', 'db-row', {noKneeling:true}],
  ['a standing-only cable fly cannot be offered when standing is excluded', 'cable-fly', {noStanding:true}],
  ['standing band curls cannot be offered as seated-only', 'band-curl', {seatedOnly:true}],
  ['standing dumbbell curls cannot be offered as seated-only', 'db-curl', {seatedOnly:true}],
  ['standing shoulder press cannot be offered as seated-only', 'db-ohp', {seatedOnly:true}]
];
for(const [name,id,needs] of contra){
  const p = profile({needs});
  check(name, !w.allowedExercises(p).some(e=>e.id === id) &&
    !w.buildPlan(p).sessions.some(day=>day.exercises.some(e=>e.id===id)));
}
// These exercises are deliberately kept as seated options. Their localized
// setup must say so, rather than telling a seated-only user to stand.
const seatedGuides = ['face-pull','tri-pushdown','oh-tri-ext','band-pull-apart','band-pressdown'];
const seatedPool = new Set(w.allowedExercises(profile({needs:{seatedOnly:true,noStanding:true}})).map(e=>e.id));
check('the documented seated adaptations remain available without standing', seatedGuides.every(id=>seatedPool.has(id)));
const seatedWords = {en:/stand or sit/i,fr:/debout ou assis/i,es:/de pie o sentado/i,
  de:/stehe oder sitze/i,it:/in piedi o seduto/i,nl:/sta of zit/i,ar:/قف أو اجلس/};
const guideMap = w.eval('MOVEMENT_GUIDES'), allTranslations = w.eval('T');
for(const [lang,words] of Object.entries(seatedWords)){
  check(lang + ': every standing-or-seated guide explicitly describes the seated setup',
    seatedGuides.every(id=>words.test(allTranslations[lang]['movement.guide.'+guideMap[id][2]])));
  w.setLang(lang);
  check(lang + ': the illustration is clearly labelled as the standing option', seatedGuides.every(id=>{
    const el=d.createElement('div'); el.innerHTML=w.exerciseMovement(byId[id]);
    return !!allTranslations[lang]['movement.seatedNote'] &&
      el.querySelector('[data-seated-option]')?.textContent===allTranslations[lang]['movement.seatedNote'];
  }));
}
w.setLang('en');
check('explicit low-impact metadata is not lost during augmentation',
  ['plank','side-plank','hollow-hold'].every(id=>w.exerciseAllowed(byId[id], profile({needs:{lowImpactOnly:true}}))));
check('filter reasons cover equipment, the environment, chosen limitations and individual exclusions',
  w.exerciseFilterReasons(byId['bb-bench'], profile({environment:'outdoor',limits:['shoulder'],exercises:{'bb-bench':false}})).join('|') ===
    ['exercise.filterEquipment','exercise.filterLimit','exercise.filterExcluded'].join('|'));
check('a combined restriction exposes every recorded mismatch for an override',
  w.exerciseFilterReasons(byId['pike-pushup'], profile({needs:{noFloor:true,noOverhead:true}})).join('|') ===
    ['a11y.needFloor','a11y.needOverhead'].join('|'));
check('preferred-position exclusion is explainable',
  w.exerciseFilterReasons(byId['pike-pushup'], profile({positions:['seated']})).includes('a11y.needPosition'));
check('floor push-ups do not match a standing position filter',
  !w.allowedExercises(profile({positions:['standing']})).some(e=>e.id==='pushup'));

function reset(){
  w.eval("ACTIVE=null; SESSION_SUB='plan'; PLAN_DAY='A'");
  const s = w.getState();
  Object.assign(s.profile, profile()); s.feelings = []; s.sessions = [];
  s.plan = {mode:'std', split:2, restSec:120, builtAt:Date.now(), sessions:[
    {id:'A', name:'Upper', focus:['chest'], exercises:[{id:'bb-bench',sets:3,reps:[6,10],rir:2}]},
    {id:'B', name:'Lower', focus:['quads'], exercises:[{id:'bb-squat',sets:2,reps:[5,8],rir:2}]}]};
  w.saveState(); w.go('session');
  return s;
}
function current(){ return w.eval('ACTIVE'); }
let s = reset();
// A truly empty pool must stay empty, including when the custom workout starts.
s.profile.exercises = Object.fromEntries(EX.map(e=>[e.id,false]));
w.eval("onbIdx = ONB_STEPS.indexOf('ready')");
check('onboarding explains an empty plan before completion',
  w.eval('Screens.onb().html').includes(w.t('a11y.poolEmpty')));
w.openPlanSub('A',0);
check('an empty substitute picker does not offer the full library',
  !d.querySelector('#sheetHost [data-act="applyPlanSub"]') && d.querySelector('#sheetHost').textContent.includes(w.t('session.nosub')));
w.closeSheet(); w.openAddExerciseSheet('plan','A');
check('empty plan add-picker does not fall back to the whole library',
  d.querySelectorAll('#addExList .tile').length === 0 && !d.querySelector('#sheetHost [data-act="addExerciseToPlan"]'));
check('empty plan add-picker explains how to recover',
  d.querySelector('#sheetHost').textContent.includes(w.t('a11y.poolEmpty')) &&
  !!d.querySelector('#sheetHost [data-act="openExerciseSettings"]'));
w.closeSheet(); w.startCustomSession();
check('empty custom workout does not seed the first excluded library exercise', current() && current().exercises.length === 0);
check('empty live workout gives a visible recovery path',
  d.querySelector('#screenBody').textContent.includes(w.t('a11y.poolEmpty')) &&
  !!d.querySelector('#screenBody [data-act="openAddExerciseSheet"]'));

// The full library remains browseable, but a deliberate addition requires an
// explicit, specific warning; cancelling must not change any stored plan.
s = reset(); s.profile.needs = {noFloor:true,noOverhead:true}; let prompt = '';
w.confirm = m => {prompt = m; return false;};
w.openExerciseDetail('pike-pushup');
check('exercise detail marks an exercise outside the current choices',
  !!d.querySelector('#sheetHost [data-filter-warning]') &&
  d.querySelector('#sheetHost').textContent.includes(w.t('a11y.needFloor')) &&
  d.querySelector('#sheetHost').textContent.includes(w.t('a11y.needOverhead')));
const before = JSON.stringify(s.plan);
w.addExerciseToPlan('A','pike-pushup');
check('cancelling an incompatible manual addition preserves the plan', JSON.stringify(s.plan)===before);
check('manual-add confirmation names the exercise and the conflicting preference',
  prompt.includes(w.t('ex.pike-pushup')) && prompt.includes(w.t('a11y.needFloor')) &&
  prompt.includes(w.t('a11y.needOverhead')));
w.confirm = () => true; w.addExerciseToPlan('A','pike-pushup');
check('a deliberate confirmed addition remains possible', s.plan.sessions[0].exercises.some(e=>e.id==='pike-pushup'));
check('a manually overridden planned exercise remains visibly marked',
  d.querySelector('#screenBody').textContent.includes(w.t('workout.planConflictTitle')));

// A picker can become stale before its click handler runs. It may not apply a
// newly excluded choice, even through a direct handler call.
s = reset(); s.profile.exercises['db-bench'] = false; const planBefore = JSON.stringify(s.plan);
w.applyPlanSub('A',0,'db-bench');
check('stale plan substitution is revalidated without modifying the plan', JSON.stringify(s.plan) === planBefore);
s = reset(); s.profile.exercises['db-bench'] = false;
w.startSession('A'); w.setVal(0,0,'w','60');
const draftBefore = JSON.stringify(current());
w.applySub(0,'db-bench');
check('stale live substitution preserves every entered field and exercise', JSON.stringify(current()) === draftBefore);
prompt = ''; w.confirm = m => {prompt=m; return false;};
const activeBefore = JSON.stringify(current());
w.addExerciseToActive('db-bench');
check('cancelling an incompatible live addition preserves the draft', JSON.stringify(current()) === activeBefore);
check('live-add warning explains an individually excluded exercise',
  prompt.includes(w.t('ex.db-bench')) && prompt.includes(w.t('exercise.filterExcluded')));

// Preferences changed after a plan was saved must not silently rewrite it or
// bypass the new choices when starting or resuming a session.
s = reset(); const oldPlan = JSON.stringify(s.plan); w.setLimit('shoulder');
check('changing a limitation never silently rebuilds a customised plan', JSON.stringify(s.plan) === oldPlan);
check('the existing plan flags a newly conflicting exercise',
  d.querySelector('#screenBody').textContent.includes(w.t('workout.planConflictTitle')) &&
  d.querySelector('#screenBody').textContent.includes(w.t('ex.bb-bench')));
prompt = ''; w.confirm = m => {prompt=m; return false;}; w.startSession('A');
check('a conflicting plan requires explicit acknowledgement before starting',
  !current() && prompt.includes(w.t('ex.bb-bench')));
w.confirm = () => true; w.startSession('A'); w.setVal(0,0,'w','60');
check('an existing conflicting workout has a persistent visible warning',
  d.querySelector('#screenBody').textContent.includes(w.t('workout.activeConflictTitle')));
const saved = JSON.stringify(current()); w.toggleNeedP('noFloor');
check('changing settings mid-workout does not erase active data', JSON.stringify(current())===saved);

// The same stop recommendation shown on Today must not vanish when starting
// from Plan or Custom. It is advisory: an explicit acknowledgement can retain
// access to recording, and never deletes an existing draft.
s = reset(); w.addFeeling({date:Date.now(),illness:1,joint:0,soreness:0,fatigue:0});
w.go('home');
check('a first-time user with a stop recommendation does not see the start-first hero',
  !d.querySelector('#screenBody').textContent.includes(w.t('home.heroFirst')));
prompt = ''; w.confirm = m => {prompt=m; return false;}; w.startSession('A');
check('plan start surfaces the existing stop recommendation and can be cancelled',
  !current() && prompt.includes(w.t('workout.stopTitle')));
prompt = ''; w.startCustomSession();
check('custom start also surfaces the stop recommendation', !current() && prompt.includes(w.t('workout.stopTitle')));
w.confirm = () => true; w.startSession('A');
check('a stop warning does not make an acknowledged session or its draft inaccessible', !!current());

const keys = ['exercise.filterEquipment','exercise.filterLimit','exercise.filterExcluded','a11y.needPosition',
  'workout.filterTitle','workout.filterDetail','workout.addConfirm','workout.filteredOption',
  'workout.planConflictTitle','workout.planConflictBody','workout.activeConflictTitle','workout.activeConflictBody',
  'workout.conflictStart','workout.emptyPoolTitle','workout.reviewSettings','workout.stopTitle','workout.stopConfirm',
  'movement.barbellSafety'];
const dict = w.eval('T');
for(const l of ['en','fr','es','de','it','nl','ar']){
  check(l + ': all new safety and filter messages are present', keys.every(k=>typeof dict[l][k]==='string' && dict[l][k].trim()),
    keys.filter(k=>!dict[l][k]).join(', '));
  w.setLang(l);
  for(const id of ['bb-bench','closegrip-bench','bb-squat']){
    const el=d.createElement('div'); el.innerHTML=w.exerciseMovement(byId[id]);
    check(l + ': ' + id + ' guide includes the localized failed-lift safety note',
      el.querySelector('[data-barbell-safety]')?.textContent === dict[l]['movement.barbellSafety']);
  }
}
w.setLang('en');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
w.close();
if(failed) process.exitCode = 1;
