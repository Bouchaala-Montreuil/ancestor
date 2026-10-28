/* ============================================================================
   ANCESTOR — automated test suite
   Run:  node tests/run.js
   Covers: progression rules, recovery, shift/timezone handling, persistence,
   program generation, and the refusal engine.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HOUR = 3600000, DAY = 86400000;

/* ----------------------------- environment ----------------------------- */
function makeStorage(){
  const d = {};
  return {
    getItem: k => (k in d ? d[k] : null),
    setItem: (k,v) => { d[k] = String(v); },
    removeItem: k => { delete d[k]; },
    clear: () => { Object.keys(d).forEach(k => delete d[k]); },
    _dump: () => d
  };
}
const storage = makeStorage();

const sandbox = {
  localStorage: storage,
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, isNaN, isFinite,
  setTimeout, clearTimeout, parseInt, parseFloat, RegExp, Error,
  document: { addEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; },
              createElement(){ return {}; }, body:{ appendChild(){}, removeChild(){} } },
  window: { scrollTo(){} },
  navigator: {},
  Blob: function(){}, URL: { createObjectURL(){ return ''; }, revokeObjectURL(){} }
};
sandbox.globalThis = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

const FILES = [
  'js/i18n/core.js','js/i18n/ui.js','js/i18n/exercises.js','js/i18n/screens.js',
  'js/i18n/acc.js','js/i18n/ar.js','js/i18n/v2.js','js/i18n/science.js','js/i18n/science2.js','js/i18n/ex_modes.js','js/i18n/modes.js','js/i18n/focus.js','js/i18n/lesson_bodies_en.js','js/i18n/lesson_bodies_fr.js','js/i18n/lesson_bodies_es_de.js','js/i18n/lesson_bodies_it_nl_ar.js','js/i18n/locale.js',
  'js/data/exercises.js','js/data/ex_meta.js','js/data/ex_logging.js','js/data/anatomy_map.js',
 'js/data/evidence.js','js/data/lessons.js',
  'js/core/time.js','js/core/profile.js','js/core/store.js',
  'js/engine/progression.js','js/engine/recovery.js',
  'js/engine/readiness.js','js/engine/program.js','js/engine/why.js'
];
FILES.forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});
const R = expr => vm.runInContext(expr, sandbox);
const run = (fn, arg) => vm.runInContext('(' + fn.toString() + ')(' + JSON.stringify(arg) + ')', sandbox);

/* ----------------------------- assertions ------------------------------ */
let pass = 0, fail = 0;
const failures = [];
function chk(name, cond, extra){
  if(cond){ pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + name + (extra ? '  \x1b[2m' + extra + '\x1b[0m' : '')); }
  else { fail++; failures.push(name); console.log('  \x1b[31mFAIL\x1b[0m  ' + name + (extra ? '  -> ' + extra : '')); }
}
function group(t){ console.log('\n\x1b[1m' + t + '\x1b[0m'); }
const near = (a,b,eps) => Math.abs(a-b) < (eps === undefined ? 1e-6 : eps);

/* ------------------------- state construction -------------------------- */
function baseProfile(o){
  return Object.assign({
    name:'Test', experience:'i', goal:'h', equipment:'gym', limits:[],
    daysPerWeek:3, sessionMinutes:50, shiftType:'none', sleepHours:7.5,
    sleepVariability:2, usualWake:7, style:'std', unit:'kg', exercises:null
  }, o || {});
}
function mkState(o){
  const s = R('defaultState()');
  s.profile = baseProfile(o && o.profile);
  s.sessions = (o && o.sessions) || [];
  s.sleep = (o && o.sleep) || [];
  s.shifts = (o && o.shifts) || [];
  s.feelings = (o && o.feelings) || [];
  s.adaptation = (o && o.adaptation) || {};
  setState(s);
  return s;
}
/* `let STATE` is a lexical binding inside the vm, NOT a property of the
   sandbox object. It can only be assigned by code run inside the context. */
function setState(s){
  vm.runInContext('STATE = ' + JSON.stringify(s) + '; saveState();', sandbox);
}
function readState(){ return JSON.parse(JSON.stringify(R('getState()'))); }
function patchState(fn){
  const s = readState();
  fn(s);
  setState(s);
  return s;
}
const NOW = new Date(2026, 9, 22, 14, 0, 0).getTime();   // 22 Oct 2026 14:00 local
const at = (d, h, m) => new Date(2026, 9, d, h || 12, m || 0, 0).getTime();

/* ========================================================================== */
group('1. i18n completeness');
{
  const LANGS = R('LANGS'), T = R('T');
  chk('7 languages registered', LANGS.length === 7, LANGS.join(','));
  const en = Object.keys(T.en);
  const CORE = R('coreKeys()');
  chk('English key count > 300', en.length > 300, en.length + ' keys');
  // All seven are complete, Arabic included: it arrived last, and until the
  // science prose landed it fell back to English in the middle of a lesson.
  const ESTABLISHED = ['en','fr','es','de','it','nl','ar'];
  ESTABLISHED.forEach(l => {
    const bag = T[l] || {};
    const missing = CORE.filter(k => bag[k] === undefined || bag[k] === '');
    chk(l + ': covers every core interface key', missing.length === 0,
        missing.length ? missing.slice(0,5).join(', ') : CORE.length + ' core keys');
    const extra = en.filter(k => bag[k] === undefined || bag[k] === '');
    console.log('       ' + l + ' also translates ' + (en.length - extra.length) + '/' + en.length + ' keys overall');
  });

  // Declared localisation depth for Science Hub content
  const sciKeys = en.filter(k => /^(sci|les|cat|takeaway|myth|quiz|why|rule|ev|lab|sim|met|mg|feature)\./.test(k));
  const sciHave = l => sciKeys.filter(k => (T[l]||{})[k] !== undefined && (T[l]||{})[k] !== '').length;
  chk('science content is fully localised in English', sciHave('en') === sciKeys.length,
      sciHave('en') + '/' + sciKeys.length);
  chk('science content is fully localised in French', sciHave('fr') === sciKeys.length,
      sciHave('fr') + '/' + sciKeys.length);
  ['es','de','it','nl','ar'].forEach(l => {
    chk(l + ': science content is localised in full', sciHave(l) === sciKeys.length,
        sciHave(l) + '/' + sciKeys.length);
  });
  /* And the number the interface shows is a measurement, not a promise: take
     one string out of a bag and the declared count has to drop by exactly one.
     This is the check that would have caught a language claiming 100 % while
     falling back to English. */
  const before = R("contentCoverage('de')");
  const savedText = T.de['takeaway.mg.1'];
  delete T.de['takeaway.mg.1'];
  const after = R("contentCoverage('de')");
  T.de['takeaway.mg.1'] = savedText;
  chk('the declared content count falls by one when a string is removed',
      after.translated === before.translated - 1 && after.total === before.total,
      before.translated + ' -> ' + after.translated + ' of ' + after.total);
  const EX = R('EX');
  const missingNames = [];
  ESTABLISHED.forEach(l => EX.forEach(e => { if(!T[l] || !T[l]['ex.'+e.id]) missingNames.push(l+':'+e.id); }));
  chk('exercise names in every established language', missingNames.length === 0,
      missingNames.slice(0,5).join(', ') || (EX.length + ' names x 6'));
  const missingCues = [];
  ESTABLISHED.forEach(l => EX.forEach(e => { if(!T[l] || !T[l]['cue.'+e.id]) missingCues.push(l+':'+e.id); }));
  chk('exercise cues in every established language', missingCues.length === 0,
      missingCues.slice(0,5).join(', ') || (EX.length + ' cues x 6'));

  // Partial languages must be HONEST: measured coverage, never raw keys.
  const cov = R('coverageAll()');
  const ar = cov.filter(c => c.lang === 'ar')[0];
  /* Arabic reached full coverage once dead keys were removed and the last live
     strings translated. The assertion now checks completeness instead of
     encoding an outdated assumption about which language was partial. */
  const arCov = R("coverage('ar')");
  chk('Arabic covers the core interface keys', arCov.percent === 100,
      arCov.percent + '% (' + arCov.translated + '/' + arCov.total + ')');
  chk('every shipped language is labelled full',
      R("coverageAll()").every(function(c) { return c.percent === 100; }),
      R("coverageAll()").map(function(c) { return c.lang + ':' + c.percent + '%'; }).join(' '));
  const leaked = [];
  LANGS.forEach(l => {
    vm.runInContext("CURRENT_LANG='" + l + "'", sandbox);
    CORE.forEach(k => { if(R('t')('' + k) === k) leaked.push(l + ':' + k); });
  });
  vm.runInContext("CURRENT_LANG='en'", sandbox);
  chk('no language leaks a raw key into the interface', leaked.length === 0,
      leaked.length ? leaked.slice(0,4).join(', ') : CORE.length + ' core keys x ' + LANGS.length);
  chk('unknown key falls back to English', R("t('totally.missing.key')") === 'totally.missing.key');
}

/* ========================================================================== */
group('2. Exercise library integrity');
{
  const EX = R('EX'), MUSCLES = R('MUSCLES');
  chk('library has 40+ exercises', EX.length >= 40, EX.length);
  let bad = [];
  EX.forEach(e => {
    const sum = e.m.reduce((a,[,w]) => a+w, 0);
    if(Math.abs(sum - 1) > 0.02) bad.push(e.id + ' weights=' + sum.toFixed(2));
    if(!e.reps || e.reps[0] >= e.reps[1]) bad.push(e.id + ' rep range');
    if(!['compound','isolation'].includes(e.type)) bad.push(e.id + ' type');
    if(!['barbell','dumbbell','machine','cable','bodyweight','band'].includes(e.equip)) bad.push(e.id + ' equip');
    if(typeof e.rir !== 'number') bad.push(e.id + ' rir');
  });
  chk('muscle contributions sum to ~1', bad.filter(b=>b.includes('weights')).length === 0, bad.slice(0,4).join(' | '));
  chk('valid rep ranges / types / equipment', bad.length === 0, bad.slice(0,4).join(' | '));
  const ids = EX.map(e=>e.id);
  chk('ids unique', new Set(ids).size === ids.length);
  const badSubs = EX.filter(e => (e.subs||[]).some(s => ids.indexOf(s) < 0));
  chk('substitution ids all resolve', badSubs.length === 0, badSubs.map(e=>e.id).join(','));
  const orphanMuscles = [];
  EX.forEach(e => e.m.forEach(([m]) => { if(MUSCLES.indexOf(m) < 0) orphanMuscles.push(m); }));
  chk('no unknown muscle ids', orphanMuscles.length === 0, [...new Set(orphanMuscles)].join(','));
  // EVERY muscle group must be reachable in EVERY equipment tier.
  // This caught a real defect: bodyweight-only users could not train 8 of 12.
  const EQUIP_SETS = R('EQUIP_SETS');
  ['gym','home','minimal'].forEach(tier => {
    const missing = MUSCLES.filter(m => !EX.some(e =>
      EQUIP_SETS[tier].includes(e.equip) && e.m.some(([mm,w]) => mm === m && w >= 0.40)));
    chk('every muscle trainable with: ' + tier, missing.length === 0,
        missing.length ? 'unreachable: ' + missing.join(', ') : 'all 12 groups covered');
  });
}

/* ========================================================================== */
group('3. Progression engine — the ten rules');
{
  const st = mkState({});
  const exId = 'db-bench';                       // 8-12 reps, RIR 2
  const ex = R('EX_BY_ID')['db-bench'];

  // R1 baseline
  let r = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R1 first exposure -> baseline', r.kind === 'baseline' && r.load === null, r.kind);

  // R2/R4: build reps, do not increase
  mkState({ sessions:[{ id:'s1', date: NOW-3*DAY, exercises:[
    { id:exId, sets:[{w:50,r:8,rir:2},{w:50,r:8,rir:2},{w:50,r:8,rir:2}] }]}] });
  r = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R4 not at top of range -> hold, no increase', r.kind === 'hold' && r.load === 50, r.kind + ' ' + r.load);
  chk('R2 targets one more rep', r.targetReps === 9, 'target ' + r.targetReps);

  // R3: earned increase
  mkState({ sessions:[{ id:'s1', date: NOW-3*DAY, exercises:[
    { id:exId, sets:[{w:50,r:12,rir:1},{w:50,r:12,rir:1},{w:50,r:12,rir:1}] }]}] });
  r = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R3 all sets at top + effort met -> increase', r.kind === 'increase', r.kind);
  chk('R3 increase is small (2-5%)', r.load >= 50*1.02 && r.load <= 50*1.05, '50 -> ' + r.load);
  // db-bench uses dumbbells: the smallest real jump is 2 kg total
  chk('R3 rounded to a real increment', r.load % 2 === 0, r.load + ' kg (2 kg dumbbell step)');

  // R3 must NOT fire when effort was too easy
  mkState({ sessions:[{ id:'s1', date: NOW-3*DAY, exercises:[
    { id:exId, sets:[{w:50,r:12,rir:5},{w:50,r:12,rir:5},{w:50,r:12,rir:5}] }]}] });
  r = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R3 blocked when RIR above target', r.kind !== 'increase', r.kind);

  // R4: mixed sets, one hit the top
  mkState({ sessions:[{ id:'s1', date: NOW-3*DAY, exercises:[
    { id:exId, sets:[{w:50,r:12,rir:2},{w:50,r:9,rir:2},{w:50,r:8,rir:2}] }]}] });
  r = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R4 not every set reached the top -> hold', r.kind === 'hold' && r.load === 50, r.kind);

  // R5: fell below the bottom of the range
  mkState({ sessions:[{ id:'s1', date: NOW-3*DAY, exercises:[
    { id:exId, sets:[{w:50,r:6,rir:1},{w:50,r:5,rir:0}] }]}] });
  r = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R5 below bottom of range -> reduce', r.kind === 'reduce' && r.load < 50, r.kind + ' ' + r.load);

  // R6 + the headline claim: TIME NEVER TRIGGERS AN INCREASE
  const perf = { date: NOW-30*DAY, exercises:[
    { id:exId, sets:[{w:50,r:8,rir:2},{w:50,r:8,rir:2},{w:50,r:8,rir:2}] }]};
  mkState({ sessions:[Object.assign({id:'s1'}, perf)] });
  const rLong = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R6 30-day gap with unfinished range -> no increase', rLong.kind !== 'increase', rLong.kind);

  mkState({ sessions:[{ id:'s1', date: NOW-30*DAY, exercises:[
    { id:exId, sets:[{w:50,r:12,rir:1},{w:50,r:12,rir:1},{w:50,r:12,rir:1}] }]}] });
  const rLongTop = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R6 very long gap -> re-entry, never a free increase', rLongTop.kind === 'reentry' && rLongTop.load < 52, rLongTop.kind + ' ' + rLongTop.load);

  // identical performance, different elapsed time -> identical decision
  const mk = daysAgo => ({ sessions:[{ id:'s1', date: NOW-daysAgo*DAY, exercises:[
    { id:exId, sets:[{w:50,r:9,rir:2},{w:50,r:9,rir:2},{w:50,r:9,rir:2}] }]}] });
  mkState(mk(2));  const a = R(`recommend(STATE,'${exId}',${NOW})`);
  mkState(mk(9));  const b = R(`recommend(STATE,'${exId}',${NOW})`);
  mkState(mk(18)); const c = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('TIME NEVER INCREASES THE LOAD (2d vs 9d vs 18d identical)',
      a.kind === b.kind && b.kind === c.kind && a.load === b.load && b.load === c.load,
      [a.kind+'/'+a.load, b.kind+'/'+b.load, c.kind+'/'+c.load].join('  '));

  // R8: two consecutive declines -> deload
  mkState({ sessions:[
    { id:'s1', date: NOW-15*DAY, exercises:[{ id:exId, sets:[{w:60,r:10,rir:1}] }]},
    { id:'s2', date: NOW-9*DAY,  exercises:[{ id:exId, sets:[{w:57,r:9,rir:1}] }]},
    { id:'s3', date: NOW-3*DAY,  exercises:[{ id:exId, sets:[{w:55,r:8,rir:1}] }]}
  ]});
  r = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R8 two consecutive declines -> deload', r.kind === 'deload' && r.load < 55, r.kind + ' -> ' + r.load);

  // R7: stagnation flagged, not punished
  mkState({ sessions:[
    { id:'s1', date: NOW-15*DAY, exercises:[{ id:exId, sets:[{w:50,r:10,rir:2}] }]},
    { id:'s2', date: NOW-9*DAY,  exercises:[{ id:exId, sets:[{w:50,r:10,rir:2}] }]},
    { id:'s3', date: NOW-3*DAY,  exercises:[{ id:exId, sets:[{w:50,r:10,rir:2}] }]}
  ]});
  r = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R7 three flat sessions -> plateau, load held', r.kind === 'plateau' && r.load === 50, r.kind + ' ' + r.load);

  // The brief's worked example (50 -> 50 -> 50 -> 50x12 -> 52.5) is a barbell
  // lift, so it is verified on bb-bench (6-10 reps, 2.5 kg plates).
  const bb = 'bb-bench';
  mkState({ sessions:[
    { id:'s1', date: NOW-21*DAY, exercises:[{ id:bb, sets:[{w:50,r:6,rir:2}] }]},
    { id:'s2', date: NOW-17*DAY, exercises:[{ id:bb, sets:[{w:50,r:7,rir:2}] }]},
    { id:'s3', date: NOW-13*DAY, exercises:[{ id:bb, sets:[{w:50,r:9,rir:2}] }]},
    { id:'s4', date: NOW-9*DAY,  exercises:[{ id:bb, sets:[{w:50,r:10,rir:2},{w:50,r:10,rir:2},{w:50,r:10,rir:2}] }]}
  ]});
  r = R(`recommend(STATE,'${bb}',${NOW})`);
  chk('brief example: 50 kg reaching the top of 6-10 -> 52.5 kg', r.load === 52.5, 'got ' + r.load);
  mkState({ sessions:[
    { id:'s4', date: NOW-9*DAY, exercises:[{ id:bb, sets:[{w:50,r:10,rir:2},{w:50,r:10,rir:2},{w:50,r:10,rir:2}] }]},
    { id:'s5', date: NOW-4*DAY, exercises:[{ id:bb, sets:[{w:52.5,r:10,rir:2},{w:52.5,r:10,rir:2},{w:52.5,r:10,rir:2}] }]}
  ]});
  r = R(`recommend(STATE,'${bb}',${NOW})`);
  chk('no jump to 57.5/60 after the next block', r.load > 52.5 && r.load <= 55 && r.load % 2.5 === 0, 'got ' + r.load);

  // R10: every recommendation explains itself
  mkState({ sessions:[{ id:'s1', date: NOW-3*DAY, exercises:[{ id:exId, sets:[{w:50,r:9,rir:2}] }]}] });
  r = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('R10 recommendation carries a reason', r.reasons.length > 0 && r.reasons[0].text.length > 10);

  // lower body gets a slightly larger step
  mkState({ sessions:[{ id:'s1', date: NOW-3*DAY, exercises:[
    { id:'leg-press', sets:[{w:200,r:15,rir:2},{w:200,r:15,rir:2},{w:200,r:15,rir:2}] }]}] });
  r = R(`recommend(STATE,'leg-press',${NOW})`);
  chk('lower body step is larger than upper', r.kind === 'increase' && r.load >= 210, '200 -> ' + r.load);

  // lb rounding
  mkState({ profile:{ unit:'lb' }, sessions:[{ id:'s1', date: NOW-3*DAY, exercises:[
    { id:exId, sets:[{w:135,r:12,rir:1},{w:135,r:12,rir:1},{w:135,r:12,rir:1}] }]}] });
  r = R(`recommend(STATE,'${exId}',${NOW})`);
  chk('lb loads round to 5 lb', r.load % 5 === 0 && r.load > 135, '135 -> ' + r.load);

  // bodyweight with no added load progresses by adding load
  mkState({ sessions:[{ id:'s1', date: NOW-3*DAY, exercises:[
    { id:'pushup', sets:[{w:0,r:20,rir:0},{w:0,r:20,rir:0}] }]}] });
  r = R(`recommend(STATE,'pushup',${NOW})`);
  chk('bodyweight at top of range -> add load, not multiply zero', r.kind === 'increase' && r.load > 0, 'got ' + r.load);

  // RULES documentation present
  chk('RULES array documents all ten', R('RULES').length === 10);
}

/* ========================================================================== */
group('4. Recovery engine — no fixed durations, bounded, explained');
{
  const st = mkState({});
  const BASE = R('BASE_DAYS');
  chk('defaults are not the Mentzer 7/4 folklore', BASE.chest <= 3 && BASE.biceps <= 2.5,
      'chest=' + BASE.chest + ' biceps=' + BASE.biceps);
  chk('all 12 muscle groups have defaults', R('MUSCLES').every(m => typeof BASE[m] === 'number'));

  // short sleep extends recovery
  const a = mkState({ sleep:[
    { id:'1', start: toLocalInput(NOW-24*HOUR), end: toLocalInput(NOW-19*HOUR), quality:3 },
    { id:'2', start: toLocalInput(NOW-48*HOUR), end: toLocalInput(NOW-43*HOUR), quality:3 }
  ]});
  const shortSleep = R(`recoveryDays(STATE,'chest',${NOW})`).days;
  const b = mkState({ sleep:[
    { id:'1', start: toLocalInput(NOW-32*HOUR), end: toLocalInput(NOW-24*HOUR), quality:5 },
    { id:'2', start: toLocalInput(NOW-56*HOUR), end: toLocalInput(NOW-48*HOUR), quality:5 }
  ]});
  const goodSleep = R(`recoveryDays(STATE,'chest',${NOW})`).days;
  chk('short sleep lengthens the estimate', shortSleep > goodSleep,
      shortSleep.toFixed(2) + 'd vs ' + goodSleep.toFixed(2) + 'd');

  // bounds
  const extreme = mkState({ profile:{ style:'hit', experience:'b' }, sleep:[
    { id:'1', start: toLocalInput(NOW-20*HOUR), end: toLocalInput(NOW-16*HOUR), quality:1 }
  ], feelings:[{ id:'f', date: NOW-2*HOUR, soreness:3, joint:3, fatigue:3, illness:0 }] });
  const bounded = R(`recoveryDays(STATE,'quads',${NOW})`).days;
  chk('estimate stays within hard bounds (0.5-14 d)', bounded >= 0.5 && bounded <= 14, bounded.toFixed(2) + ' d');

  // every estimate is explainable
  const rr = R(`recoveryDays(STATE,'quads',${NOW})`);
  chk('estimate breaks down into named factors', rr.parts.length >= 6 && rr.parts.every(p => p.label && typeof p.f === 'number'),
      rr.parts.map(p=>p.k).join(','));

  // fresh user
  const fresh = mkState({});
  const rf = R(`recoveryDays(STATE,'chest',${NOW})`);
  // An untrained muscle has NO data, so it is reported as 'fresh', not 'ready'.
  // It still yields ratio 1, so it never blocks a session.
  chk('untrained muscle -> fresh, never penalised', rf.state === 'fresh' && rf.since === null && rf.ratio === 1,
      'state=' + rf.state + ' ratio=' + rf.ratio);

  // ratio maths
  mkState({ sessions:[{ id:'s1', date: NOW - 2*DAY, exercises:[
    { id:'bb-bench', sets:[{w:60,r:8,rir:2},{w:60,r:8,rir:2},{w:60,r:8,rir:2}] }]}] });
  const rc = R(`recoveryDays(STATE,'chest',${NOW})`);
  chk('ratio reflects days since / days needed', near(rc.ratio, 2/rc.days, 1e-9), rc.since + '/' + rc.days.toFixed(2) + ' = ' + rc.ratio.toFixed(2));
  chk('daysLeft computed', rc.daysLeft === Math.max(0, Math.round((rc.days - rc.since)*10)/10));

  // adaptation learns, but stays bounded
  const ad = mkState({});
  for(let i=0;i<40;i++){
    patchState(st => { st.adaptation['chest'] = { mult:1, obs:0 }; });
    vm.runInContext(`updateAdaptation(STATE,'bb-bench',${NOW})`, sandbox);
  }
  const learned = readState().adaptation['chest'] || {mult:1};
  chk('learning stays inside [0.65, 1.50]', learned.mult >= 0.65 && learned.mult <= 1.50, 'mult=' + learned.mult.toFixed(2));

  // no adaptation without history
  mkState({});
  vm.runInContext(`updateAdaptation(STATE,'bb-bench',${NOW})`, sandbox);
  chk('no learning from a single session', !readState().adaptation['chest']);
}

/* ========================================================================== */
group('5. Shift & sleep handling (midnight, timezones, biological day)');
{
  // A 19:00 -> 07:00 night shift
  const s1 = { start:'2026-10-21T19:00', end:'2026-10-22T07:00' };
  chk('night shift crossing midnight = 12 h', near(R('shiftHours')(s1), 12, 1e-6), R('shiftHours')(s1) + ' h');
  chk('detected as a night shift', R('isNightShift')(s1) === true);

  const s2 = { start:'2026-10-22T09:00', end:'2026-10-22T17:00' };
  chk('day shift = 8 h', near(R('shiftHours')(s2), 8, 1e-6));
  chk('day shift is not a night shift', R('isNightShift')(s2) === false);

  // Local-time parsing must not be shifted by UTC offset
  const probe = new Date(2026, 9, 22, 19, 0, 0, 0).getTime();
  chk('datetime-local round-trips in local time', R('fromLocalInput')(R('toLocalInput')(probe)) === probe,
      R('toLocalInput')(probe));

  // overlap queries
  const shifts = [s1, s2];
  const mon = at(22, 3, 0);                 // 03:00 on the 22nd, mid-shift
  chk('workedWithin finds the in-progress shift',
      R('workedWithin')(shifts, 12, mon).length === 1);
  chk('nextShift finds a shift 1 h ahead',
      (R('nextShift')(shifts, at(22,8,0), 6) || {}).end === '2026-10-22T17:00');
  chk('nextShift returns nothing when no shift is imminent',
      R('nextShift')(shifts, at(22,20,0), 6) === null);

  // biological day: 02:00 belongs to the previous day for a 07:00 riser
  chk('02:00 belongs to the previous biological day',
      R('bioDayKey')(at(22,2,0), 7) === '2026-10-21', R('bioDayKey')(at(22,2,0), 7));
  chk('14:00 belongs to the same biological day',
      R('bioDayKey')(at(22,14,0), 7) === '2026-10-22');
  chk('night worker anchored at 16:00 keeps 23:00 on the same day',
      R('bioDayKey')(at(22,23,0), 16) === '2026-10-22');
  chk('night worker: 06:00 is still the previous day',
      R('bioDayKey')(at(22,6,0), 16) === '2026-10-21');

  // sleep crossing midnight
  const sl = { start:'2026-10-22T23:30', end:'2026-10-23T07:30' };
  chk('sleep crossing midnight = 8 h', near(R('sleepHours')(sl), 8, 1e-6), R('sleepHours')(sl) + ' h');

  // sleep stats
  mkState({ sleep:[
    { id:'a', start: toLocalInput(NOW-24*HOUR), end: toLocalInput(NOW-17*HOUR), quality:4 },
    { id:'b', start: toLocalInput(NOW-48*HOUR), end: toLocalInput(NOW-41*HOUR), quality:3 }
  ]});
  const ss = R(`sleepStats(STATE.sleep, ${NOW}, 7)`);
  chk('sleepStats averages 7 h over two nights', near(ss.avg, 7, 1e-9), 'avg=' + ss.avg);
  chk('sleepStats reports n and quality', ss.n === 2 && near(ss.qualityAvg, 3.5, 1e-9));

  mkState({});
  chk('no sleep logged -> avg is null, not zero', R(`sleepStats(STATE.sleep, ${NOW}, 7)`).avg === null);

  // variability
  mkState({ sleep:[
    { id:'a', start:'2026-10-21T23:00', end:'2026-10-22T07:00' },
    { id:'b', start:'2026-10-20T23:00', end:'2026-10-21T07:00' }
  ]});
  const consistent = R(`sleepStartVariability(STATE.sleep, ${NOW}, 7)`);
  mkState({ sleep:[
    { id:'a', start:'2026-10-21T23:00', end:'2026-10-22T07:00' },
    { id:'b', start:'2026-10-20T04:00', end:'2026-10-20T12:00' }
  ]});
  const irregular = R(`sleepStartVariability(STATE.sleep, ${NOW}, 7)`);
  chk('irregular sleep timing scores higher than regular',
      irregular > consistent, 'regular=' + consistent + ' irregular=' + irregular);

  // sleep window prediction + intrusion
  const win = { startHour: 23, hours: 8, endHour: 7 };
  const at2330 = at(22, 23, 30);
  chk('training at 23:30 intrudes on a 23:00 sleep window',
      R('intrudesOnSleep')(win, at2330, 45, 1.5) === true);
  chk('training at 14:00 does not',
      R('intrudesOnSleep')(win, at(22,14,0), 45, 1.5) === false);
}

/* ========================================================================== */
group('6. Program generation');
{
  [2,3,4,5,6].forEach(d => {
    const st = mkState({ profile:{ daysPerWeek:d } });
    const plan = R('buildPlan')(st.profile);
    chk(d + ' days/week -> ' + d + ' sessions', plan.sessions.length === d, plan.sessions.length);
    chk(d + ' days: every session has exercises', plan.sessions.every(s => s.exercises.length >= 2),
        plan.sessions.map(s=>s.exercises.length).join('/'));
  });

  // equipment filters
  const gym = R('buildPlan')(baseProfile({ equipment:'gym' }));
  const home = R('buildPlan')(baseProfile({ equipment:'home' }));
  const min = R('buildPlan')(baseProfile({ equipment:'minimal' }));
  const flat = p => p.sessions.flatMap(s => s.exercises.map(e => e.id));
  chk('home plan excludes barbell/cable/machine work',
      flat(home).every(id => ['dumbbell','bodyweight','band'].includes(R('EX_BY_ID')[id].equip)));
  // "minimal" still permits a resistance band: it is cheap, portable and
  // central to accessible training, so it is not treated as equipment.
  chk('bodyweight plan allows only bodyweight and bands',
      flat(min).every(id => ['bodyweight','band'].includes(R('EX_BY_ID')[id].equip)));
  chk('gym plan uses the widest pool', flat(gym).length > 0);

  // limitations remove exercises
  const knee = R('buildPlan')(baseProfile({ limits:['knee'] }));
  chk('knee limitation removes contraindicated lifts',
      flat(knee).every(id => R('EX_BY_ID')[id].avoid.indexOf('knee') < 0));
  const lowback = R('buildPlan')(baseProfile({ limits:['lowerback'] }));
  chk('lower-back limitation removes deadlift & barbell row',
      flat(lowback).indexOf('deadlift') < 0 && flat(lowback).indexOf('bb-row') < 0);

  // user-deselected exercises are respected
  const ex = {}; R('EX').forEach(e => ex[e.id] = true); ex['bb-bench'] = false;
  const custom = R('buildPlan')(baseProfile({ exercises: ex }));
  chk('deselected exercise never appears', flat(custom).indexOf('bb-bench') < 0);

  // style drives volume and effort
  const hitPlan = R('buildPlan')(baseProfile({ style:'hit' }));
  const stdPlan = R('buildPlan')(baseProfile({ style:'std' }));
  const totalSets = p => flat(p).reduce((a,id) => a + 0, 0) + p.sessions.reduce((a,s)=>
      a + s.exercises.reduce((b,e)=>b+e.sets,0), 0);
  chk('hit style prescribes less total work than standard',
      totalSets(hitPlan) < totalSets(stdPlan), totalSets(hitPlan) + ' vs ' + totalSets(stdPlan));
  // Precise claim: hit never prescribes an EASIER effort than standard, and is
  // strictly harder for at least one exercise. (Heavy compound lifts such as the
  // deadlift deliberately keep 2 reps in reserve in every style.)
  const rirOf = p => { const o = {}; p.sessions.forEach(s => s.exercises.forEach(e => o[e.id] = e.rir)); return o; };
  const rh = rirOf(hitPlan), rs = rirOf(stdPlan);
  const shared = Object.keys(rh).filter(k => rs[k] !== undefined);
  chk('hit style never prescribes an easier effort than standard',
      shared.length > 0 && shared.every(k => rh[k] <= rs[k]),
      shared.slice(0,5).map(k => k + ' ' + rh[k] + '/' + rs[k]).join('  '));
  chk('hit style is strictly closer to failure somewhere',
      shared.some(k => rh[k] < rs[k]));
  chk('heavy compounds keep 2 reps in reserve even in hit mode',
      shared.filter(k => k === 'deadlift').every(k => rs[k] >= 2 && rh[k] >= 2));

  // beginners are not taken to failure
  const beg = R('buildPlan')(baseProfile({ experience:'b', style:'std' }));
  chk('beginners keep 2+ reps in reserve',
      beg.sessions.every(s => s.exercises.every(e => e.rir >= 2)));
  chk('beginners get fewer sets',
      beg.sessions.every(s => s.exercises.every(e => e.sets <= 2)));

  // session length cap
  const shortPlan = R('buildPlan')(baseProfile({ daysPerWeek:3, sessionMinutes:20 }));
  chk('20-minute session keeps the exercise count small',
      shortPlan.sessions.every(s => s.exercises.length <= 3), shortPlan.sessions.map(s=>s.exercises.length).join('/'));

  // substitutions preserve purpose
  const subs = R("substitutesFor")(baseProfile({}), 'bb-bench');
  chk('substitutes exist for bench press', subs.length > 0, subs.map(e=>e.id).join(','));
  chk('substitutes share the movement pattern', subs.every(e => e.pat === 'pushH'));
  const subsLimited = R("substitutesFor")(baseProfile({ limits:['shoulder'] }), 'bb-bench');
  chk('substitutes respect limitations', subsLimited.every(e => e.avoid.indexOf('shoulder') < 0));

  // nextSession prefers the recovered session
  mkState({});
  patchState(st => {
    st.plan = R('buildPlan')(st.profile);
    st.sessions = [{ id:'x', date: NOW - 4*DAY, planId: st.plan.sessions[0].id,
      exercises:[{ id: st.plan.sessions[0].exercises[0].id, sets:[{w:50,r:10,rir:2}] }] }];
  });
  const nx = R(`nextSession(STATE, ${NOW})`);
  chk('nextSession exists', !!nx && !!nx.session);
}

/* ========================================================================== */
group('7. Refusal engine — it is willing to say no');
{
  // freshly trained -> should not be told to train
  const trained = mkState({
    sessions:[{ id:'s1', date: NOW - 1*HOUR, exercises:[
      { id:'bb-bench', sets:[{w:60,r:8,rir:0},{w:60,r:7,rir:0},{w:60,r:6,rir:0}] },
      { id:'db-bench', sets:[{w:28,r:10,rir:0},{w:28,r:9,rir:0},{w:28,r:8,rir:0}] }
    ]}] });
  const d1 = R(`decide(STATE, ['bb-bench','db-bench'], ${NOW})`);
  chk('one hour after a hard chest session -> not "train"', d1.state !== 'train', d1.state);
  chk('limiting muscle identified', d1.limitingMuscle === 'chest' || d1.limitingMuscle === 'triceps', d1.limitingMuscle);
  chk('reasons are given', d1.reasons.length > 0);
  chk('uncertainty stated when data is thin', d1.uncertainties.length > 0);

  // fully recovered + good sleep -> train
  const recovered = mkState({
    sessions:[{ id:'s1', date: NOW - 8*DAY, exercises:[
      { id:'bb-bench', sets:[{w:60,r:8,rir:2},{w:60,r:8,rir:2},{w:60,r:8,rir:2}] }]}] });
  const d2 = R(`decide(STATE, ['bb-bench'], ${NOW})`);
  chk('8 days later with no negative signals -> train', d2.state === 'train', d2.state);

  // illness is a hard stop
  const ill = mkState({ feelings:[{ id:'f', date: NOW-1*HOUR, soreness:0, joint:0, fatigue:1, illness:2 }] });
  const d3 = R(`decide(STATE, ['bb-bench'], ${NOW})`);
  chk('reported illness -> stop', d3.state === 'stop', d3.state);
  chk('stop carries an explanation', d3.reasons.some(r => r.k === 'illness'));

  // severe joint pain is a hard stop
  const pain = mkState({ feelings:[{ id:'f', date: NOW-1*HOUR, soreness:0, joint:3, fatigue:0, illness:0 }] });
  chk('severe joint pain -> stop', R(`decide(STATE, ['bb-bench'], ${NOW})`).state === 'stop');

  // A shift is NOT an automatic ban
  const shiftState = mkState({ shifts:[{ id:'s', start:'2026-10-22T09:00', end:'2026-10-22T17:00' }] });
  const d5 = R(`decide(STATE, ['bb-bench'], ${at(22,20,0)})`);   // 3 h after the shift ended
  chk('finishing a shift 3 h ago does not ban training outright',
      d5.state !== 'stop', d5.state);
  const midShift = R(`decide(STATE, ['bb-bench'], ${at(22,13,0)})`);
  chk('being mid-shift is flagged, not silently ignored',
      midShift.reasons.some(r => r.k === 'shift' || r.k === 'shiftNext'), midShift.state);

  // poor sleep downgrades but does not claim certainty
  const poorSleep = mkState({ sleep:[
    { id:'1', start: toLocalInput(NOW-20*HOUR), end: toLocalInput(NOW-16*HOUR), quality:2 },
    { id:'2', start: toLocalInput(NOW-44*HOUR), end: toLocalInput(NOW-40*HOUR), quality:2 } ] });
  const d6 = R(`decide(STATE, ['bb-bench'], ${NOW})`);
  chk('4 h sleep is reflected in the reasons', d6.reasons.some(r => r.k === 'sleep'));
  chk('poor sleep alone does not hard-stop', d6.state !== 'stop', d6.state);

  // no sleep logged -> stated as missing information
  const noSleep = mkState({});
  const d7 = R(`decide(STATE, ['bb-bench'], ${NOW})`);
  chk('missing sleep is declared as uncertainty', d7.uncertainties.length > 0);

  // severity ladder integrity
  const order = R('SEVERITY');
  chk('severity ladder is train<light<caution<rest<stop',
      order.join(',') === 'train,light,caution,rest,stop', order.join(','));
}

/* ========================================================================== */
group('8. Persistence, export, import, erase');
{
  mkState({ profile:{ name:'Reda', unit:'lb' } });
  patchState(st => {
    st.sessions.push({ id:'t1', date: NOW, name:'Push', exercises:[{ id:'bb-bench', sets:[{w:225,r:5,rir:2}] }] });
  });

  const raw = storage.getItem('ancestor.state.v1');
  chk('state written to localStorage', !!raw && raw.length > 50);

  // reload from storage
  vm.runInContext('STATE = null', sandbox);
  const reloaded = R('loadState()');
  chk('profile survives reload', reloaded.profile.name === 'Reda' && reloaded.profile.unit === 'lb');
  chk('sessions survive reload', reloaded.sessions.length === 1 && reloaded.sessions[0].exercises[0].sets[0].w === 225);
  chk('exercise history rebuilt from storage', R("exerciseHistory('bb-bench')").length === 1);

  // export contains everything
  const json = R('exportJSON()');
  const parsed = JSON.parse(json);
  chk('export contains profile, sessions, sleep, shifts',
      parsed.profile && parsed.sessions && parsed.sleep && parsed.shifts);
  chk('export is valid JSON round-trip', parsed.profile.name === 'Reda');

  // import
  parsed.profile.name = 'Imported';
  vm.runInContext('STATE = null', sandbox);
  R('importJSON(' + JSON.stringify(JSON.stringify(parsed)) + ')');
  chk('import replaces state', R('getState()').profile.name === 'Imported');

  // migration of a partial/legacy record
  const partial = R('migrate({ version: 0, profile: { name: "Old" } })');
  chk('migrate fills missing fields', partial.profile.equipment === 'gym' && Array.isArray(partial.sessions));
  chk('migrate preserves known data', partial.profile.name === 'Old');
  chk('migrate bumps the schema version', partial.version === R('SCHEMA_VERSION'));

  // corrupt payload must not throw
  let threw = false;
  try { R('migrate("not an object")'); R('migrate(null)'); } catch(e){ threw = true; }
  chk('corrupt payload handled without throwing', !threw);

  // erase
  R('eraseAll()');
  chk('erase clears storage', storage.getItem('ancestor.state.v1') === null);
  chk('erase resets to a clean default', R('getState()').sessions.length === 0);
}

/* ========================================================================== */
group('9. Safety & honesty guards');
{
  const src = FILES.map(f => fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n');
  chk('no "testosterone" claimed anywhere in the engine',
      !/testosterone|cortisol level|growth hormone/i.test(src));
  chk('no fixed 7-day chest / 4-day arm constants',
      !/chest\s*[:=]\s*7/.test(src) && !/biceps\s*[:=]\s*4\s*[,}]/.test(src));
  chk('recovery estimate is documented as an estimate',
      /not measure/i.test(fs.readFileSync(path.join(ROOT,'js/engine/recovery.js'),'utf8')));
  // The word "anabolic" is legitimate physiology. What must never appear is a
  // recommendation, suggestion or sourcing of performance-enhancing drug use.
  const pedPattern = /anabolic[ -]?(steroid|androgenic)|recommend\w*[^.\n]{0,40}(steroid|SARM)|(take|use|cycle|buy|source)\s+(steroids|SARMs?)(\s|\.|,|$)|where to (buy|get)\s+(steroids|SARMs?)/i;
  const pedHits = (src.match(new RegExp(pedPattern.source,'gi')) || []);
  chk('app never recommends performance-enhancing drugs', pedHits.length === 0,
      pedHits.slice(0,3).join(' | '));

  // Scientific terminology is allowed, but it must never be framed as advice.
  chk('scientific terms are educational, not prescriptive',
      !/you should (take|use)\s+(steroids|SARMs?|hormones)/i.test(src));
  chk('decision engine has a hard stop path', /state === 'stop'|'stop'/.test(src));

  // load increases are capped
  mkState({ sessions:[{ id:'s1', date: NOW-3*DAY, exercises:[
    { id:'db-bench', sets:[{w:100,r:12,rir:1},{w:100,r:12,rir:1},{w:100,r:12,rir:1}] }]}] });
  const big = R(`recommend(STATE,'db-bench',${NOW})`);
  chk('increase capped at ~5% even on large numbers', big.load <= 105, '100 -> ' + big.load);

  // bodyweight-only user still gets a complete program
  const bw = R('buildPlan')(baseProfile({ equipment:'minimal', daysPerWeek:3 }));
  chk('bodyweight-only user gets a usable program',
      bw.sessions.every(s => s.exercises.length >= 2), bw.sessions.map(s=>s.exercises.length).join('/'));
}

/* ========================================================================== */
console.log('\n' + '='.repeat(64));
if(fail === 0){
  console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' TESTS PASSED\x1b[0m');
} else {
  console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed');
  failures.forEach(f => console.log('   - ' + f));
}
console.log('='.repeat(64) + '\n');
process.exit(fail === 0 ? 0 : 1);

/* helper used above */
function toLocalInput(ms){ return R('toLocalInput')(ms); }
