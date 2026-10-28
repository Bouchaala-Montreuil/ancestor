/* ============================================================================
   ANCESTOR — inclusive foundations tests
   Run:  node tests/inclusive.js

   Covers: profile migration safety, accessibility metadata, adaptive
   filtering, unit conversion, locale / RTL, pluralisation and honest
   translation coverage.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

let pass = 0, fail = 0; const failures = [];
const chk = (n,c,x) => {
  if(c){ pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + n + (x ? '  \x1b[2m' + x + '\x1b[0m' : '')); }
  else { fail++; failures.push(n); console.log('  \x1b[31mFAIL\x1b[0m  ' + n + (x ? '  -> ' + x : '')); }
};
const group = t => console.log('\n\x1b[1m' + t + '\x1b[0m');

const store = {};
const sandbox = {
  localStorage:{ getItem:k=>k in store?store[k]:null, setItem:(k,v)=>{store[k]=String(v);}, removeItem:k=>{delete store[k];} },
  console, Math, Date, JSON, Object, Array, String, Number, isNaN, isFinite,
  setTimeout, clearTimeout, parseInt, parseFloat, RegExp, Error, Intl
};
sandbox.globalThis = sandbox; sandbox.global = sandbox;
vm.createContext(sandbox);
['js/i18n/core.js','js/i18n/ui.js','js/i18n/exercises.js','js/i18n/screens.js',
 'js/i18n/acc.js','js/i18n/ar.js','js/i18n/v2.js','js/i18n/locale.js',
 'js/data/exercises.js','js/data/ex_meta.js','js/data/ex_logging.js',
 'js/core/time.js','js/core/profile.js','js/core/store.js',
 'js/engine/progression.js','js/engine/recovery.js',
 'js/engine/readiness.js','js/engine/program.js'
].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'), sandbox, {filename:f}));
const R = e => vm.runInContext(e, sandbox);
const near = (a,b,eps) => Math.abs(a-b) < (eps===undefined?1e-6:eps);

/* ==================================================================== */
group('1. Profile migration is additive and lossless');
{
  const v1 = {
    version:1, created:1, onboarded:true, consented:true,
    profile:{ name:'Reda', experience:'i', goal:'h', equipment:'gym', limits:['knee'],
              daysPerWeek:3, sessionMinutes:50, shiftType:'night', sleepHours:6,
              sleepVariability:3, usualWake:16, style:'std', unit:'kg', exercises:null },
    plan:{ sessions:[] },
    sessions:[{ id:'s1', date: 1700000000000, name:'Push',
                exercises:[{ id:'bb-bench', sets:[{w:60,r:8,rir:2}] }] }],
    sleep:[{ id:'a', start:'2026-10-21T09:00', end:'2026-10-21T15:00', quality:3 }],
    shifts:[{ id:'b', start:'2026-10-21T19:00', end:'2026-10-22T07:00' }],
    feelings:[{ id:'c', date:1700000000000, soreness:2 }],
    adaptation:{ chest:{ mult:1.1, obs:4 } }
  };
  const out = R('migrate(' + JSON.stringify(v1) + ')');
  chk('existing name preserved', out.profile.name === 'Reda', out.profile.name);
  chk('existing single goal mirrored into goals[]',
      Array.isArray(out.profile.goals) && out.profile.goals[0] === 'h', JSON.stringify(out.profile.goals));
  chk('original goal string kept for old code paths', out.profile.goal === 'h');
  chk('limitations preserved', out.profile.limits.indexOf('knee') >= 0);
  chk('sessions preserved with their sets',
      out.sessions.length === 1 && out.sessions[0].exercises[0].sets[0].w === 60);
  chk('sleep preserved', out.sleep.length === 1);
  chk('shifts preserved', out.shifts.length === 1);
  chk('feelings preserved', out.feelings.length === 1);
  chk('learned adaptation preserved',
      out.adaptation.chest && near(out.adaptation.chest.mult, 1.1));
  chk('new v2 fields added',
      out.profile.environment === 'gym' && out.profile.positions.length === 0 &&
      typeof out.profile.needs === 'object' && out.profile.display.textScale === 1);
  chk('version bumped to 3', out.version === 3, String(out.version));

  const twice = R('migrate(migrate(' + JSON.stringify(v1) + '))');
  chk('migration is idempotent',
      JSON.stringify(twice.profile) === JSON.stringify(out.profile));
  chk('a null payload does not throw', (() => {
    try { R('migrate(null)'); R('migrate("oops")'); return true; } catch(e){ return false; }
  })());
}

/* ==================================================================== */
group('2. Exercise accessibility model');
{
  const EX = R('EX'), meta = R('EX_META'), acc = R('EX_ACCESSIBLE');
  chk('library grew with accessible exercises', EX.length >= 70, EX.length + ' exercises');
  chk('new exercises were appended, not swapped', acc.length >= 16, acc.length + ' new');
  const missing = EX.filter(e => !e.pos || !e.req || !e.cat);
  chk('every exercise carries positions, requirements and categories',
      missing.length === 0, missing.slice(0,4).map(e=>e.id).join(', '));
  chk('original 59 kept their muscle weights',
      R("EX_BY_ID['bb-bench'].m[0][1]") === 0.75, String(R("EX_BY_ID['bb-bench'].m[0][1]")));
  chk('muscle weights still sum to ~1 across the whole library',
      EX.every(e => Math.abs(e.m.reduce((a,[,w])=>a+w,0) - 1) < 0.02));
  const seated = EX.filter(e => (e.pos||[]).indexOf('seated') >= 0);
  chk('seated options exist', seated.length >= 10, seated.length + ' seated');
  const wc = EX.filter(e => (e.acc||[]).indexOf('wheelchair') >= 0);
  chk('wheelchair-compatible options exist', wc.length >= 4, wc.length + ' wheelchair');
  const mob = EX.filter(e => (e.cat||[]).indexOf('mobility') >= 0);
  chk('mobility category populated', mob.length >= 4, mob.length + ' mobility');
  const bal = EX.filter(e => (e.cat||[]).indexOf('balance') >= 0);
  chk('balance category populated', bal.length >= 2, bal.length + ' balance');
  const band = EX.filter(e => e.equip === 'band');
  chk('resistance band exercises exist', band.length >= 5, band.length + ' band');
  chk('categories are non-exclusive', R('CATEGORIES').length >= 11);

  // every language has a name and a cue for the new exercises
  const T = R('T');
  const missed = [];
  Object.keys(T).forEach(l => acc.forEach(e => {
    if(!T[l]['ex.'+e.id] || !T[l]['cue.'+e.id]) missed.push(l+':'+e.id);
  }));
  chk('new exercises are named and instructed in every language',
      missed.length === 0, missed.length ? missed.slice(0,5).join(', ') : Object.keys(T).length + ' languages');
}

/* ==================================================================== */
group('3. Adaptive filtering');
{
  const EX = R('EX');
  const mk = o => Object.assign({ equipment:'gym', environment:'gym', limits:[], needs:{} }, o);

  const seatedOnly = mk({ needs:{ seatedOnly:true } });
  const seatedOk = EX.filter(e => R('exerciseAllowed')(e, seatedOnly));
  chk('seated-only keeps only seated exercises',
      seatedOk.length > 0 && seatedOk.every(e => (e.pos||[]).indexOf('seated') >= 0),
      seatedOk.length + ' of ' + EX.length);

  const wc = mk({ needs:{ wheelchair:true } });
  const wcOk = EX.filter(e => R('exerciseAllowed')(e, wc));
  chk('wheelchair filter keeps only wheelchair-compatible exercises',
      wcOk.length > 0 && wcOk.every(e => (e.acc||[]).indexOf('wheelchair') >= 0),
      wcOk.length + ' exercises');

  const noGrip = mk({ needs:{ noGrip:true } });
  chk('limited grip removes grip-dependent exercises',
      EX.filter(e => R('exerciseAllowed')(e, noGrip)).every(e => (e.req||[]).indexOf('grip') < 0));

  const noFloor = mk({ needs:{ noFloor:true } });
  chk('cannot get on the floor removes floor exercises',
      EX.filter(e => R('exerciseAllowed')(e, noFloor)).every(e => (e.req||[]).indexOf('floorTransfer') < 0));

  const lowImp = mk({ needs:{ lowImpactOnly:true } });
  chk('low-impact preference is respected',
      EX.filter(e => R('exerciseAllowed')(e, lowImp)).every(e => (e.acc||[]).indexOf('lowImpact') >= 0));

  chk('no needs means nothing is excluded',
      EX.filter(e => R('exerciseAllowed')(e, mk({}))).length === EX.length);

  chk('exclusions are explainable, not silent',
      R("exclusionReason(EX_BY_ID['bb-squat'], {needs:{seatedOnly:true}})") === 'a11y.needSeated',
      R("exclusionReason(EX_BY_ID['bb-squat'], {needs:{seatedOnly:true}})"));

  // plans are still generated for constrained users
  ['seatedOnly','wheelchair','lowImpactOnly','noGrip','noFloor','noStanding','noKneeling'].forEach(n => {
    const p = mk({ needs:{} }); p.needs[n] = true;
    const plan = R('buildPlan')(p);
    const flat = plan.sessions.flatMap(s => s.exercises.map(e => e.id));
    chk('a plan is generated with `' + n + '`',
        flat.length > 0 && flat.every(id => R('exerciseAllowed')(R("EX_BY_ID['"+id+"']"), p)),
        flat.length + ' exercises');
  });

  // environment narrows equipment
  const home = mk({ environment:'home' });
  chk('home environment excludes barbells and machines',
      R('allowedExercises')(home).every(e => ['dumbbell','bodyweight','band'].indexOf(e.equip) >= 0));
  const out = mk({ environment:'outdoor' });
  chk('outdoor environment allows only bodyweight and bands',
      R('allowedExercises')(out).every(e => ['bodyweight','band'].indexOf(e.equip) >= 0));
}

/* ==================================================================== */
group('4. Goals and progression bias');
{
  const mk = o => Object.assign({ equipment:'gym', environment:'gym', limits:[], needs:{}, goals:['h'] }, o);
  const strength = R('buildPlan')(mk({ goals:['s'] }));
  chk('strength goal produces low-rep ranges',
      strength.sessions.every(s => s.exercises.every(e => e.reps[1] <= 8)),
      JSON.stringify(strength.sessions[0].exercises[0].reps));
  const endurance = R('buildPlan')(mk({ goals:['e'] }));
  chk('endurance goal produces high-rep ranges',
      endurance.sessions.every(s => s.exercises.every(e => e.reps[0] >= 15)));
  const mobility = R('buildPlan')(mk({ goals:['m'] }));
  chk('mobility goal keeps effort low',
      mobility.sessions.every(s => s.exercises.every(e => e.rir >= 3)));
  const hypertrophy = R('buildPlan')(mk({ goals:['h'] }));
  chk('hypertrophy respects each exercise\'s own range',
      hypertrophy.sessions.every(s => s.exercises.every(e => {
        const ex = R("EX_BY_ID['"+e.id+"']");
        return e.reps[0] === ex.reps[0] && e.reps[1] === ex.reps[1];
      })));
  chk('multiple goals are supported',
      Array.isArray(R('buildPlan')(mk({ goals:['h','m','c'] })).sessions));
  chk('beginners are never taken near failure with a strength goal',
      R('buildPlan')(R('migrateProfile')({ equipment:'gym', experience:'b', goals:['s'] }))
        .sessions.every(s => s.exercises.every(e => e.rir >= 2)));
}

/* ==================================================================== */
group('5. Units and locale');
{
  chk('kg -> lb -> kg round-trips',
      near(R('convertWeight')(R('convertWeight')(100,'kg','lb'),'lb','kg'), 100, 1e-9));
  chk('100 kg is 220.46 lb', near(R('convertWeight')(100,'kg','lb'), 220.462, 1e-3),
      R('convertWeight')(100,'kg','lb').toFixed(2));

  const st = R('defaultState()');
  st.sessions = [{ id:'s1', date:1, exercises:[{ id:'bb-bench', sets:[{w:100,r:5}] }] }];
  st.profile.unit = 'kg';
  const touched = R('convertStateUnits')(st, 'lb');
  chk('changing units converts stored loads', touched === 1, touched + ' sets converted');
  chk('100 kg became 220 lb', near(st.sessions[0].exercises[0].sets[0].w, 220, 0.01),
      String(st.sessions[0].exercises[0].sets[0].w));

  chk('Arabic is right-to-left', R('isRTL')('ar') === true);
  chk('Latin languages are left-to-right',
      ['en','fr','es','de','it','nl'].every(l => R('isRTL')(l) === false));
  chk('locale tags are BCP-47', R('localeTag')('ar') === 'ar' && R('localeTag')('fr') === 'fr-FR');
  chk('numbers format per locale',
      typeof R('formatNumber')(1234.5,'de') === 'string' &&
      R('formatNumber')(1234.5,'de') !== R('formatNumber')(1234.5,'en'),
      R('formatNumber')(1234.5,'de') + ' vs ' + R('formatNumber')(1234.5,'en'));
  chk('missing values render as a dash', R('formatNumber')(null,'en') === '—');
  chk('English plural rules work',
      R('plural')('en', 1, {one:'a', other:'b'}) === 'a' &&
      R('plural')('en', 3, {one:'a', other:'b'}) === 'b');
  const arPlural = R('plural')('ar', 3, {few:'few', other:'other'});
  chk('Arabic plural rules are delegated to Intl, not guessed',
      arPlural === 'few' || arPlural === 'other', arPlural);

  /* A range is a number, and numbers run left to right in Arabic too. The bidi
     algorithm disagrees: the dash between two digits is neutral, so it takes
     the paragraph direction and the range is laid out backwards. This shipped
     once — Arabic read "6–10 reps" as "10–6" and "1 / 3" as "3 / 1". */
  const withLang = (l, expr) => {
    vm.runInContext("CURRENT_LANG='" + l + "'", sandbox);
    const v = vm.runInContext(expr, sandbox);
    vm.runInContext("CURRENT_LANG='en'", sandbox);
    return v;
  };
  chk('the isolate is idempotent, so nested wrapping cannot pile up',
      withLang('ar', 'numExpr(numExpr("3×6–10"))') === '\u20663×6–10\u2069',
      JSON.stringify(withLang('ar', 'numExpr(numExpr("3×6–10"))')));
  chk('a set counter reads "1 / 3", not "3 / 1", in Arabic',
      withLang('ar', 'numExpr(1 + " / " + 3)') === '\u20661 / 3\u2069');
  chk('a two-digit range keeps its own order inside the isolate',
      /^\u2066(\d+)–(\d+)\u2069$/.test(withLang('ar', 'numExpr("6–10")')),
      JSON.stringify(withLang('ar', 'numExpr("6–10")')));
  chk('…while English, which has no bidi problem, gets no invisible characters',
      withLang('en', 'numExpr("6–10")') === '6–10');
  chk('a numeric expression is left alone when there is no number in it',
      withLang('ar', 'numExpr("—")') === '—');
}

/* ==================================================================== */
group('6. Translation coverage is measured, not assumed');
{
  const T = R('T'), cov = R('coverageAll()');
  cov.forEach(c => console.log('       ' + c.lang + ': ' + c.percent + '% (' + c.translated + '/' + c.total + ')'));
  const established = cov.filter(c => ['en','fr','es','de','it','nl'].indexOf(c.lang) >= 0);
  chk('established languages cover the core flows',
      established.every(c => c.percent >= 95),
      established.map(c=>c.lang+':'+c.percent+'%').join(' '));
  chk('Arabic has substantial coverage', cov.filter(c=>c.lang==='ar')[0].percent >= 60,
      cov.filter(c=>c.lang==='ar')[0].percent + '%');
  chk('a language below 95% is reported as partial',
      R('langStatus')('ar').status === (cov.filter(c=>c.lang==='ar')[0].percent >= 95 ? 'full' : 'partial'),
      R('langStatus')('ar').status);
  chk('coverage never exceeds 100%', cov.every(c => c.percent <= 100));

  // no core key may resolve to its own raw key in any language
  const LANGS = R('LANGS'), core = R('coreKeys()');
  const leaked = [];
  LANGS.forEach(l => {
    vm.runInContext("CURRENT_LANG='" + l + "'", sandbox);
    core.forEach(k => { if(R('t')('' + k) === k) leaked.push(l + ':' + k); });
  });
  vm.runInContext("CURRENT_LANG='en'", sandbox);
  chk('no interface string falls through to a raw key', leaked.length === 0,
      leaked.length ? leaked.slice(0,5).join(', ') : core.length + ' core keys x ' + LANGS.length + ' languages');

  // every language declares the accessibility disclaimer
  const noDisclaimer = LANGS.filter(l => !T[l]['a11y.disclaimer']);
  chk('every language warns that accessibility flags are not universal guarantees',
      noDisclaimer.length === 0, noDisclaimer.join(', '));
  const noAlt = LANGS.filter(l => !T[l]['a11y.figureAlt']);
  chk('every language provides a text alternative for the figure',
      noAlt.length === 0, noAlt.join(', '));
}

/* ==================================================================== */
console.log('\n' + '='.repeat(66));
if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' INCLUSIVE TESTS PASSED\x1b[0m');
else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed');
       failures.forEach(f => console.log('   - ' + f)); }
console.log('='.repeat(66) + '\n');
process.exit(fail === 0 ? 0 : 1);
