/* ============================================================================
   ANCESTOR — logic regression tests (jsdom, real app)
   Run:  node tests/logic.js

   Each case below is a behaviour that was demonstrably broken. They are kept
   as regression tests so a future refactor cannot quietly reintroduce them:

     · a bodyweight set could not be saved without inventing a load
     · a timed hold was counted in repetitions
     · assistance was added to the load as if it had been lifted
     · bodyweight work produced zero volume and no chart
     · the first ever session was reported as a personal record
     · a reduction could round straight back to the load it left
     · the trend metric compared a bench press against a squat
     · the onboarding goal question was stored and then ignored
     · planned values were saved as if they were results
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const DAY = 86400000;

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
function onboard(w, d, over){
  over = over || {};
  w.setConsent();
  w.setP('experience', over.experience || 'i');
  w.setP('goal', over.goal || 'h');
  w.onbNext();
  w.setP('equipment', over.equipment || 'gym'); w.onbNext();
  w.setP('daysPerWeek', over.days || 3); w.onbNext();
  w.setP('shiftType','none'); w.onbNext();
  w.onbNext();
  w.setP('style','std'); w.setP('unit','kg');
  const b = Array.from(d.querySelectorAll('#screenBody button.btn'));
  b[b.length-1].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  w.onbNext(); w.finishOnboarding();
}
/* Replace the generated plan with a known one so tests are deterministic. */
function setPlan(w, sessions){
  w.getState().plan = { mode:'std', split:sessions.length, restSec:120,
    builtAt:Date.now(), sessions:sessions };
}
function oneSession(w, exercises){
  setPlan(w, [
    { id:'A', name:'A', focus:['chest'], exercises:exercises },
    { id:'B', name:'B', focus:['back'], exercises:[{ id:'bb-row', sets:1, reps:[6,10], rir:2 }] },
    { id:'C', name:'C', focus:['quads'], exercises:[{ id:'bb-squat', sets:1, reps:[5,8], rir:2 }] }
  ]);
}
function labels(w, d, card){
  return Array.from(card.querySelectorAll('.fld label')).map(l => l.textContent.trim());
}
/* A field is present when a label starts with the string (labels carry a
   trailing "optional" marker, so equality is the wrong test). */
function hasField(w, d, card, label){
  return labels(w, d, card).some(l => l.indexOf(label) === 0);
}
function lacksField(w, d, card, label){
  return !hasField(w, d, card, label);
}
/* Type into a field the way a user finds it: by its label. */
function fill(w, d, card, label, value){
  const flds = Array.from(card.querySelectorAll('.fld'));
  const f = flds.filter(x => {
    const l = x.querySelector('label');
    return l && l.textContent.trim().indexOf(label) === 0;
  })[0];
  if(!f) throw new Error('no field labelled "' + label + '" — have: ' +
    flds.map(x => (x.querySelector('label')||{}).textContent).join(' | '));
  const inp = f.querySelector('input');
  inp.value = value;
  inp.dispatchEvent(new w.Event('input', {bubbles:true}));
  return inp;
}
function cardAt(d, i){ return Array.from(d.querySelectorAll('.setcard'))[i]; }

let pass = 0, fail = 0; const failures = [];
function chk(n, c, x){
  if(c){ pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + n + (x ? '  \x1b[2m' + x + '\x1b[0m' : '')); }
  else { fail++; failures.push(n); console.log('  \x1b[31mFAIL\x1b[0m  ' + n + (x ? '  -> ' + x : '')); }
}
function group(t){ console.log('\n\x1b[1m' + t + '\x1b[0m'); }

/* A logged set in stored form, as the app writes it. */
const S = (o) => Object.assign({ w:null, r:null, t:null, d:null, a:null, rir:null }, o);

(async function(){

/* ==================================================================== */
group('1. A barbell exercise displays weight and repetitions');
{
  const { w, d } = boot();
  onboard(w, d);
  oneSession(w, [{ id:'bb-bench', sets:2, reps:[6,10], rir:2 }]);
  w.go('session'); w.startSession();
  const card = cardAt(d, 0);
  const ls = labels(w, d, card);
  chk('the load field is offered', hasField(w, d, card, w.t('log.load')), ls.join(', '));
  chk('the repetition field is offered', hasField(w, d, card, w.t('session.reps')), ls.join(', '));
  chk('no duration field is offered', lacksField(w, d, card, w.t('log.time')), ls.join(', '));
  chk('no distance field is offered', lacksField(w, d, card, w.t('log.dist')), ls.join(', '));
  fill(w, d, card, w.t('log.load'), '60');
  fill(w, d, card, w.t('session.reps'), '8');
  w.toggleSet(0,0); w.stopRest(); w.finishSession();
  const set = w.getState().sessions[0].exercises[0].sets[0];
  chk('load and reps are stored as numbers', set.w === 60 && set.r === 8, JSON.stringify(set));
  chk('no duration or distance was fabricated', set.t === null && set.d === null);
}

/* ==================================================================== */
group('2. An unweighted bodyweight exercise does not require external load');
{
  const { w, d } = boot();
  onboard(w, d);
  oneSession(w, [{ id:'pushup', sets:2, reps:[8,20], rir:1 }]);
  w.go('session'); w.startSession();
  const card = cardAt(d, 0);
  const ls = labels(w, d, card);
  chk('the repetition field is offered', hasField(w, d, card, w.t('session.reps')), ls.join(', '));
  chk('any load field is marked optional', (card.textContent.indexOf(w.t('c.optional')) >= 0), ls.join(', '));
  fill(w, d, card, w.t('session.reps'), '14');
  w.toggleSet(0,0);
  chk('the set is committed without entering a load',
      w.ANC.active.exercises[0].sets[0].committed === true);
  w.stopRest(); w.finishSession();
  const sess = w.getState().sessions[0];
  chk('the session was saved', w.getState().sessions.length === 1);
  chk('the set is stored with no load value', sess.exercises[0].sets[0].w === null,
      JSON.stringify(sess.exercises[0].sets[0]));
  chk('the exercise appears in history', w.exerciseHistory('pushup').length === 1);
}

/* ==================================================================== */
group('3. A weighted bodyweight exercise distinguishes added load from assistance');
{
  const { w, d } = boot();
  onboard(w, d);
  oneSession(w, [{ id:'weighted-dip', sets:1, reps:[5,10], rir:2 }]);
  w.go('session'); w.startSession();
  let card = cardAt(d, 0);
  chk('the added-load field is labelled as ADDED',
      hasField(w, d, card, w.t('log.added')), labels(w, d, card).join(', '));
  fill(w, d, card, w.t('log.added'), '10');
  fill(w, d, card, w.t('session.reps'), '8');
  w.toggleSet(0,0); w.stopRest(); w.finishSession();
  const st = w.getState();
  const ex = w.eval("EX_BY_ID['weighted-dip']");
  const set = st.sessions[0].exercises[0].sets[0];
  chk('added load is stored as load, not assistance', set.w === 10 && set.a === null,
      JSON.stringify(set));
  chk('no bodyweight recorded -> no system load is invented',
      w.setMetrics(set, ex, st.profile).systemLoad === null);
  chk('volume is reported as unknown, not zero', w.setsVolume([set], ex, st.profile) === null);
  chk('the score basis says it is counting repetitions',
      w.setMetrics(set, ex, st.profile).basis === 'reps');
  st.profile.bodyweight = 82;
  chk('with a bodyweight, system load = bodyweight + added',
      w.setMetrics(set, ex, st.profile).systemLoad === 92,
      String(w.setMetrics(set, ex, st.profile).systemLoad));

  /* the assisted counterpart */
  const a = boot(); onboard(a.w, a.d);
  oneSession(a.w, [{ id:'assisted-pullup', sets:1, reps:[5,12], rir:2 }]);
  a.w.go('session'); a.w.startSession();
  const acard = cardAt(a.d, 0);
  chk('the assistance field is labelled as ASSISTANCE',
      hasField(a.w, a.d, acard, a.w.t('log.assist')), labels(a.w, a.d, acard).join(', '));
  fill(a.w, a.d, acard, a.w.t('log.assist'), '20');
  fill(a.w, a.d, acard, a.w.t('session.reps'), '8');
  a.w.toggleSet(0,0); a.w.stopRest(); a.w.finishSession();
  const ast = a.w.getState();
  const aex = a.w.eval("EX_BY_ID['assisted-pullup']");
  const aset = ast.sessions[0].exercises[0].sets[0];
  chk('assistance is stored in its own field, never as load',
      aset.a === 20 && aset.w === null, JSON.stringify(aset));
  chk('assistance produces no load volume',
      a.w.setsVolume([aset], aex, ast.profile) === null);
  chk('assistance is displayed as removed weight, not lifted weight',
      a.w.formatSet(aset, aex, ast.profile).indexOf('−20') === 0,
      a.w.formatSet(aset, aex, ast.profile));
  const rec = a.w.recommend(ast, 'assisted-pullup', Date.now());
  chk('progress on an assisted exercise is expressed as assistance',
      rec.assist !== null && rec.targetReps !== null,
      JSON.stringify({assist:rec.assist, reps:rec.targetReps}));
}

/* ==================================================================== */
group('4. A timed exercise accepts duration without requiring repetitions');
{
  const { w, d } = boot();
  onboard(w, d);
  oneSession(w, [{ id:'plank', sets:2, reps:[20,60], rir:2 }]);
  w.go('session'); w.startSession();
  const card = cardAt(d, 0);
  const ls = labels(w, d, card);
  chk('a duration field is offered', hasField(w, d, card, w.t('log.time')), ls.join(', '));
  chk('no repetition field is offered', lacksField(w, d, card, w.t('session.reps')), ls.join(', '));
  /* #screenBody, not d.body: this harness inlines the dictionaries into the
     document, so a d.body search matches the script text and can never fail. */
  chk('the target is stated in seconds',
      d.querySelector('#screenBody').textContent.indexOf(w.t('log.holdTarget',{lo:20,hi:60})) >= 0);
  fill(w, d, card, w.t('log.time'), '45');
  w.toggleSet(0,0);
  chk('the set commits on duration alone', w.ANC.active.exercises[0].sets[0].committed === true);
  w.stopRest(); w.finishSession();
  const st = w.getState();
  chk('the session was saved', st.sessions.length === 1);
  chk('seconds are stored, no repetitions', st.sessions[0].exercises[0].sets[0].t === 45 &&
      st.sessions[0].exercises[0].sets[0].r === null,
      JSON.stringify(st.sessions[0].exercises[0].sets[0]));
  chk('a hold appears in history (it did not before)', w.exerciseHistory('plank').length === 1);
  chk('the chart has a point for it', w.sessionSeries(st, 'plank', 0).length === 1);
  const rec = w.recommend(st, 'plank', Date.now());
  chk('progression is expressed in seconds', rec.targetTime > 45 && rec.rangeUnit === 'time',
      JSON.stringify({seconds:rec.targetTime}));
  /* a dead hang is a hold, not 20-60 reps any more */
  chk('a dead hang is measured in time',
      w.exTargetRange(w.eval("EX_BY_ID['dead-hang']")).unit === 'time');
}

/* ==================================================================== */
group('5. An exercise with no history does not show fabricated previous results');
{
  const { w, d } = boot();
  onboard(w, d);
  oneSession(w, [{ id:'bb-bench', sets:2, reps:[6,10], rir:2 }]);
  /* These two checks used to read d.body.textContent, which in this harness
     contains the inlined i18n script — so they matched the dictionary itself and
     were true whatever the screen said. They read #screenBody now, and they
     assert the sentence the product actually prints. */
  w.go('session');
  const planned = d.querySelector('#screenBody').textContent;
  chk('the planned screen states there is no previous result',
      planned.indexOf(w.t('train.firsttime')) >= 0 && planned.indexOf(w.t('log.noPrev')) < 0,
      w.t('train.firsttime') + ' · no empty "previous" slot');
  chk('and it does not print the same fact twice',
      planned.split(w.t('train.firsttime')).length - 1 ===
      d.querySelectorAll('.plan-ex-row').length,
      'one line per exercise');
  w.startSession();
  chk('the live row states there is no previous result',
      d.querySelector('#screenBody').textContent.indexOf(w.t('log.noPrev')) >= 0);
  chk('no load is prescribed without history',
      w.recommend(w.getState(), 'bb-bench', Date.now()).load === null);
  chk('the previous-performance accessor returns null, not a zero row',
      w.previousPerformance(w.getState(), 'bb-bench', Date.now()) === null);
}

/* ==================================================================== */
group('6. An incomplete set is not counted as completed');
{
  const { w, d } = boot();
  onboard(w, d);
  oneSession(w, [{ id:'bb-bench', sets:2, reps:[6,10], rir:2 }]);
  w.go('session'); w.startSession();
  const card = cardAt(d, 0);
  /* The plan pre-fills a target, so "incomplete" means a REQUIRED field was
     emptied — not merely that the user has not typed anything. */
  fill(w, d, card, w.t('log.load'), '60');
  fill(w, d, card, w.t('session.reps'), '');
  chk('a row with an empty required field is not complete',
      w.isSetComplete(w.ANC.active.exercises[0].sets[0], w.eval("EX_BY_ID['bb-bench']")) === false);
  const btn = d.querySelector('#logbtn_0_0');
  chk('the log button is disabled while the row is incomplete', btn && btn.disabled === true);
  w.toggleSet(0,0);
  chk('attempting to log it does not commit it',
      w.ANC.active.exercises[0].sets[0].committed === false);
  w.finishSession();
  chk('nothing is saved when no set was completed', w.getState().sessions.length === 0);
  chk('the loaded exercise asks for a load and a rep count',
      d.querySelector('#toast').textContent === w.t('log.emptyLoad'),
      d.querySelector('#toast').textContent);
  /* the same refusal, phrased for a hold rather than a lift */
  w.applySub(0, 'plank');
  fill(w, d, cardAt(d,0), w.t('log.time'), '');
  chk('a hold with no duration is not complete',
      w.isSetComplete(w.ANC.active.exercises[0].sets[0], w.eval("EX_BY_ID['plank']")) === false);
  w.finishSession();
  chk('the hold asks for a duration, not a load',
      d.querySelector('#toast').textContent === w.t('log.emptyTime'),
      d.querySelector('#toast').textContent);
}

/* ==================================================================== */
group('7. Editing a historical set recalculates affected statistics correctly');
{
  const { w, d } = boot();
  onboard(w, d);
  w.addSession({ date: Date.now()-2*DAY, startedAt: Date.now()-2*DAY, planId:'A', name:'s1',
    exercises:[{ id:'bb-bench', sets:[ S({w:60,r:8,rir:2}) ] }] });
  let st = w.getState();
  /* Chest takes 0.75 of a bench press, so the attributed volume is 0.75 x
     load x reps. */
  const vol0 = w.muscleVolume(st, 0).chest.load;
  chk('starting chest volume is 0.75 x 60 x 8', Math.abs(vol0 - 360) < 1e-9, String(vol0));

  w.updateSet(st.sessions[0].id, 0, 0, { w:80, r:5 });
  st = w.getState();
  const vol1 = w.muscleVolume(st, 0).chest.load;
  chk('the corrected chest volume is 0.75 x 80 x 5', Math.abs(vol1 - 300) < 1e-9, String(vol1));
  chk('the record follows the correction',
      Math.abs(w.personalBest('bb-bench').metrics.volume - 400) < 1e-9,
      JSON.stringify(w.personalBest('bb-bench').set));
  chk('the trend input follows the correction',
      Math.abs(w.sessionScore([S({w:80,r:5})], w.eval("EX_BY_ID['bb-bench']"), st.profile) -
               w.personalBest('bb-bench').score) < 1e-9);

  w.deleteSet(st.sessions[0].id, 0, 0);
  st = w.getState();
  chk('deleting the only set removes the exercise from the session',
      st.sessions[0].exercises.length === 0);
  chk('the volume returns to nothing', w.muscleVolume(st, 0).chest.load === 0);
  chk('removing every set removes the empty session itself', w.pruneEmptySessions() === 1);
  chk('history is empty afterwards', w.exerciseHistory('bb-bench').length === 0);
}

/* ==================================================================== */
group('8. Missing values do not become zero silently');
{
  const { w, d } = boot();
  onboard(w, d);
  const st = w.getState();
  const ex = w.eval("EX_BY_ID['pushup']");
  const set = S({ r:14 });                       // bodyweight set, no load
  chk('an unrecorded load stays null', w.setMetrics(set, ex, st.profile).load === null);
  chk('volume is reported as unknown, not 0',
      w.setsVolume([set], ex, st.profile) === null,
      String(w.setsVolume([set], ex, st.profile)));
  chk('the session total is reported as not applicable, not 0',
      w.sessionTotalVolume({ exercises:[{ id:'pushup', sets:[set] }] }, st) === null);
  const mv = w.muscleVolume({ sessions:[{ date:Date.now(), exercises:[{ id:'pushup', sets:[set] }] }],
                              profile: st.profile }, 0);
  chk('the muscle still records the work as sets', mv.chest.sets > 0, JSON.stringify(mv.chest));
  chk('and flags that no load volume applies', mv.chest.counted === 0 && mv.chest.uncounted > 0);
  chk('a hold is never given a repetition count',
      w.setMetrics(S({ t:45 }), w.eval("EX_BY_ID['plank']"), st.profile).reps === null);
  chk('a carry is never given a load volume',
      w.setsVolume([S({ d:40 })], w.eval("EX_BY_ID['farmer-carry']"), st.profile) === null);
}

/* ==================================================================== */
group('9. A recommendation does not overwrite actual performance');
{
  const { w, d } = boot();
  onboard(w, d);
  oneSession(w, [{ id:'bb-bench', sets:3, reps:[6,10], rir:2 }]);
  w.go('session'); w.startSession();
  const prefilled = Object.assign({}, w.ANC.active.exercises[0].sets[0]);
  chk('rows start from the planned target', prefilled.entered === false);
  chk('a planned row is not presented as a result', prefilled.committed === false);
  w.finishSession();
  chk('finishing without touching a row saves nothing',
      w.getState().sessions.length === 0, String(w.getState().sessions.length));

  const card = cardAt(d, 0);
  fill(w, d, card, w.t('log.load'), '50');      // deliberately below the plan
  fill(w, d, card, w.t('session.reps'), '6');
  w.toggleSet(0,0); w.stopRest(); w.finishSession();
  const stored = w.getState().sessions[0].exercises[0].sets[0];
  chk('what the user typed is what is stored', stored.w === 50 && stored.r === 6,
      JSON.stringify(stored));
  const rec = w.recommend(w.getState(), 'bb-bench', Date.now());
  chk('the next suggestion is derived from the actual result',
      rec.prev.load === 50 && rec.load === 50, JSON.stringify({prev:rec.prev.load, next:rec.load}));
}

/* ==================================================================== */
group('10. A completed workout cannot accidentally be duplicated');
{
  const { w, d } = boot();
  onboard(w, d);
  oneSession(w, [{ id:'bb-bench', sets:2, reps:[6,10], rir:2 }]);
  w.go('session'); w.startSession();
  const card = cardAt(d, 0);
  fill(w, d, card, w.t('log.load'), '60');
  fill(w, d, card, w.t('session.reps'), '8');
  w.toggleSet(0,0); w.stopRest();
  w.finishSession();
  w.finishSession();
  w.finishSession();
  chk('three taps on Finish produce one session', w.getState().sessions.length === 1,
      String(w.getState().sessions.length));
  chk('the draft was cleared', w.localStorage.getItem('ancestor.draft.v1') === null);
  chk('the live session is closed', w.ANC.active === null);
  /* a restart with the same start time is refused rather than duplicated */
  const st = w.getState();
  w.ANC.go('session');
  w.eval("ACTIVE = { planId:'A', name:'A', startedAt:" + st.sessions[0].startedAt +
         ", finished:false, restSec:120, exercises:[] }");
  w.finishSession();
  chk('a session with an identical start time is refused',
      w.getState().sessions.length === 1, String(w.getState().sessions.length));
}

/* ==================================================================== */
group('11. Switching exercises updates the fields and the validation');
{
  const { w, d } = boot();
  onboard(w, d);
  oneSession(w, [{ id:'bb-bench', sets:2, reps:[6,10], rir:2 }]);
  w.go('session'); w.startSession();
  chk('a barbell row asks for load and reps',
      hasField(w, d, cardAt(d,0), w.t('log.load')) &&
      hasField(w, d, cardAt(d,0), w.t('session.reps')));
  w.applySub(0, 'plank');
  chk('the row now asks for duration', hasField(w, d, cardAt(d,0), w.t('log.time')),
      labels(w, d, cardAt(d,0)).join(', '));
  chk('the row no longer asks for repetitions',
      lacksField(w, d, cardAt(d,0), w.t('session.reps')),
      labels(w, d, cardAt(d,0)).join(', '));
  fill(w, d, cardAt(d,0), w.t('log.time'), '');
  chk('a duration is now required, not a load',
      w.isSetComplete(w.ANC.active.exercises[0].sets[0], w.eval("EX_BY_ID['plank']")) === false);
  fill(w, d, cardAt(d,0), w.t('log.time'), '40');
  chk('the row validates on the new field',
      w.isSetComplete(w.ANC.active.exercises[0].sets[0], w.eval("EX_BY_ID['plank']")) === true);
  w.applySub(0, 'assisted-pullup');
  chk('an assisted row asks for assistance',
      hasField(w, d, cardAt(d,0), w.t('log.assist')),
      labels(w, d, cardAt(d,0)).join(', '));
}

/* ==================================================================== */
group('12. Existing user data remain intact after the change');
{
  /* A v2 record: sets with only {w, r, rir}, a single-string goal, no
     bodyweight, no startedAt. Everything must survive and stay usable. */
  const v2 = {
    version: 2, created: Date.now(), onboarded: true, consented: true,
    profile: { name:'Old', experience:'i', goal:'h', equipment:'gym', limits:[],
      daysPerWeek:3, sessionMinutes:50, shiftType:'none', sleepHours:7,
      sleepVariability:2, usualWake:7, style:'std', unit:'kg', exercises:null,
      goals:['h'], environment:'gym', positions:[], needs:{},
      display:{ textScale:1, highContrast:false, reducedMotion:'auto', simpleUI:false, captions:true } },
    plan: { mode:'std', split:3, restSec:120, builtAt:Date.now(), sessions:[
      { id:'A', name:'Push', focus:['chest'], exercises:[{ id:'bb-bench', sets:3, reps:[6,10], rir:2 }] },
      { id:'B', name:'Pull', focus:['back'], exercises:[{ id:'bb-row', sets:3, reps:[6,10], rir:2 }] },
      { id:'C', name:'Legs', focus:['quads'], exercises:[{ id:'bb-squat', sets:3, reps:[5,8], rir:2 }] } ] },
    sessions: [
      { id:'old1', date: Date.now()-10*DAY, planId:'A', name:'Push',
        exercises:[{ id:'bb-bench', sets:[{ w:60, r:8, rir:2 }] }] },
      { id:'old2', date: Date.now()-4*DAY, planId:'A', name:'Push',
        exercises:[{ id:'bb-bench', sets:[{ w:62.5, r:8, rir:2 }] }] } ],
    sleep: [], shifts: [], feelings: [], adaptation: {},
    science: { read:[], achievements:[], explorers:[], evidenceOpened:[] }
  };
  const { w, d } = boot({ 'ancestor.state.v1': JSON.stringify(v2) });
  const st = w.getState();
  chk('the record migrates to schema 3', st.version === 3, String(st.version));
  chk('both sessions survive', st.sessions.length === 2, String(st.sessions.length));
  chk('the logged numbers are unchanged',
      st.sessions[0].exercises[0].sets[0].w === 60 &&
      st.sessions[1].exercises[0].sets[0].w === 62.5);
  chk('old sets gain the new fields without gaining values',
      st.sessions[0].exercises[0].sets[0].t === null &&
      st.sessions[0].exercises[0].sets[0].d === null &&
      st.sessions[0].exercises[0].sets[0].a === null);
  chk('a start time is backfilled for old sessions',
      typeof st.sessions[0].startedAt === 'number');
  chk('the plan survives', st.plan.sessions.length === 3);
  chk('history is readable after migration', w.exerciseHistory('bb-bench').length === 2);
  chk('progression still works off migrated data',
      w.recommend(st, 'bb-bench', Date.now()).prev.load === 62.5,
      String(w.recommend(st, 'bb-bench', Date.now()).prev.load));
  chk('an unrecorded bodyweight stays null', st.profile.bodyweight === null);
  const exported = JSON.parse(w.exportJSON());
  chk('export still contains every collection',
      ['profile','sessions','sleep','shifts','feelings','science'].every(k => k in exported));
}

/* ==================================================================== */
group('13. Journey: open a planned session, log sets, finish, review');
{
  const { w, d } = boot();
  onboard(w, d);
  setPlan(w, [
    { id:'A', name:'Mixed', focus:['chest','abs'], exercises:[
        { id:'bb-bench', sets:2, reps:[6,10], rir:2 },
        { id:'plank',    sets:2, reps:[20,60], rir:2 },
        { id:'pushup',   sets:2, reps:[8,20],  rir:1 } ] },
    { id:'B', name:'Pull', focus:['back'], exercises:[{ id:'bb-row', sets:2, reps:[6,10], rir:2 }] },
    { id:'C', name:'Legs', focus:['quads'], exercises:[{ id:'bb-squat', sets:2, reps:[5,8], rir:2 }] }
  ]);

  w.go('session');
  chk('the planned session lists its exercises', d.querySelectorAll('.panel').length >= 3);
  w.startSession();
  chk('the session opens in the live view', !!w.ANC.active);
  chk('all three exercises are present', w.ANC.active.exercises.length === 3);

  /* barbell */
  fill(w, d, cardAt(d,0), w.t('log.load'), '62.5');
  fill(w, d, cardAt(d,0), w.t('session.reps'), '7');
  w.toggleSet(0,0);
  chk('logging a set starts the rest timer', !!d.querySelector('#restHost .restbar'));
  w.stopRest();
  fill(w, d, cardAt(d,1), w.t('log.load'), '62.5');
  fill(w, d, cardAt(d,1), w.t('session.reps'), '9');
  w.toggleSet(0,1); w.stopRest();

  /* plank */
  fill(w, d, cardAt(d,2), w.t('log.time'), '40');
  w.toggleSet(1,0); w.stopRest();
  fill(w, d, cardAt(d,3), w.t('log.time'), '35');
  w.toggleSet(1,1); w.stopRest();

  /* push-ups, no load */
  fill(w, d, cardAt(d,4), w.t('session.reps'), '18');
  w.toggleSet(2,0); w.stopRest();

  /* correct a mistyped value without restarting */
  w.toggleSet(0,0);                                    // reopen set 1
  fill(w, d, cardAt(d,0), w.t('session.reps'), '6');
  w.toggleSet(0,0); w.stopRest();
  chk('a corrected set is re-confirmed', w.ANC.active.exercises[0].sets[0].committed === true);
  chk('the corrected value is kept', w.ANC.active.exercises[0].sets[0].r === '6');

  w.addSet(2);
  chk('a set can be added beyond the plan', w.ANC.active.exercises[2].sets.length === 3);
  w.removeSet(2, 2);
  chk('and removed again', w.ANC.active.exercises[2].sets.length === 2);

  w.finishSession();
  const st = w.getState();
  chk('one session is stored', st.sessions.length === 1, String(st.sessions.length));
  const byId = {};
  st.sessions[0].exercises.forEach(e => byId[e.id] = e);
  chk('the barbell work is stored as load x reps',
      byId['bb-bench'].sets[0].w === 62.5 && byId['bb-bench'].sets[0].r === 6,
      JSON.stringify(byId['bb-bench'].sets));
  chk('the hold is stored in seconds', byId['plank'].sets[0].t === 40);
  chk('the bodyweight set is stored with no load', byId['pushup'].sets[0].w === null &&
      byId['pushup'].sets[0].r === 18);
  chk('the plan snapshot is kept with the result, not instead of it',
      byId['bb-bench'].plan && byId['bb-bench'].plan.sets === 2);

  /* review */
  w.go('progress');
  chk('progress renders', d.querySelectorAll('.metric').length >= 4);
  chk('a chart is drawn for the logged exercise', d.querySelectorAll('.chart').length > 0);
  chk('the session log table offers a correction action',
      d.querySelector('#screenBody').textContent.indexOf(w.t('hist.edit')) >= 0);

  /* correct a historical set through the editor */
  const chestBefore = w.muscleVolume(st, 0).chest.load;
  w.openSessionEditor(st.sessions[0].id, 0);
  chk('the editor opens', !!d.querySelector('.sheet'));
  w.editField(0, 'w', '70');
  w.saveEditedSet(0);
  const chestAfter = w.muscleVolume(w.getState(), 0).chest.load;
  chk('editing a historical set recalculates the volume',
      chestAfter !== chestBefore && chestAfter > chestBefore,
      chestBefore + ' -> ' + chestAfter);
  w.closeSessionEditor();
}

/* ==================================================================== */
group('14. Progression rules hold for every exercise mode');
{
  const { w } = boot();
  onboard(w, w.document);
  const st = w.getState();
  const t0 = Date.now();
  const sess = (dt, id, set) => ({ date:t0-dt*DAY, startedAt:t0-dt*DAY, planId:'A', name:id,
    exercises:[{ id:id, sets:[set] }] });

  /* reduction must actually reach a lower load that exists */
  w.addSession(sess(6,'ohp', S({w:30,r:5,rir:2})));
  w.addSession(sess(3,'ohp', S({w:30,r:3,rir:1})));
  let r = w.recommend(st,'ohp',t0);
  chk('a load below the rep floor steps DOWN, not back to the same plate',
      r.kind === 'reduce' && r.load < 30, JSON.stringify({kind:r.kind, load:r.load}));
  r = w.recommend(st,'ohp',t0);
  chk('the reduced load is a real plate', r.load % 2.5 === 0, String(r.load));

  /* The trend metric compares like with like. It used to take each session's
     best lift across every exercise in it, which with a push/pull/legs split
     meant comparing a bench press against a squat. */
  {
    const b2 = boot(); onboard(b2.w, b2.d);
    const t2 = b2.w.getState();
    const s2 = (dt, id, set) => ({ date:t0-dt*DAY, startedAt:t0-dt*DAY, planId:'A', name:id,
      exercises:[{ id:id, sets:[set] }] });
    b2.w.addSession(s2(12,'bb-squat', S({w:100,r:6,rir:2})));
    b2.w.addSession(s2(9, 'bb-bench', S({w:60,r:8,rir:2})));
    b2.w.addSession(s2(6, 'bb-squat', S({w:102.5,r:6,rir:2})));
    b2.w.addSession(s2(3, 'bb-bench', S({w:62.5,r:8,rir:2})));
    chk('alternating sessions where BOTH lifts improved -> trend up',
        b2.w.overallTrend(t2, 21, t0) === 'up', b2.w.overallTrend(t2, 21, t0));
    b2.w.addSession(s2(1, 'bb-bench', S({w:50,r:8,rir:2})));
    b2.w.addSession(s2(1, 'bb-squat', S({w:90,r:6,rir:2})));
    chk('both lifts regressed -> trend down',
        b2.w.overallTrend(t2, 21, t0) === 'down', b2.w.overallTrend(t2, 21, t0));
  }

  /* a first exposure is a baseline, not a record */
  w.addSession(sess(0,'db-calf', S({w:20,r:15,rir:2})));
  chk('a first exposure is a baseline',
      w.recordKind(st,'db-calf',[S({w:20,r:15,rir:2})]) === 'baseline');
  w.addSession({ date:t0+1000, startedAt:t0+1000, planId:'A', name:'db-calf',
    exercises:[{ id:'db-calf', sets:[S({w:24,r:15,rir:2})] }] });
  chk('a genuinely better result is a record',
      w.recordKind(st,'db-calf',[S({w:24,r:15,rir:2})]) === 'pr');
  w.addSession({ date:t0+2000, startedAt:t0+2000, planId:'A', name:'db-calf',
    exercises:[{ id:'db-calf', sets:[S({w:20,r:15,rir:2})] }] });
  chk('a worse result is not a record',
      w.recordKind(st,'db-calf',[S({w:20,r:15,rir:2})]) === 'none');

  /* A row that is already in the log is asked about with excludeRow. Asking the
     old way — passing the row's sets as if they were new work — answers about a
     different question, and two silent mistakes hide behind it: leave the row in
     and it ties with itself so nothing is ever a record; drop a row as well and
     the record is measured against the wrong month. */
  {
    const b3 = boot(); onboard(b3.w, b3.d);
    const ss = (dt, id, wgt) => ({ date:t0-dt*DAY, startedAt:t0-dt*DAY, planId:'A', name:id,
      exercises:[{ id:id, sets:[S({w:wgt,r:8,rir:2})] }] });
    b3.w.addSession(ss(18,'bb-curl', 40));
    b3.w.addSession(ss(12,'bb-curl', 45));
    b3.w.addSession(ss(6, 'bb-curl', 50));
    const st3 = b3.w.getState();
    const hist = b3.w.exerciseHistory('bb-curl');
    const newest = hist[hist.length - 1], older = hist[0];
    chk('the newest row, asked about as a row, is a record',
        b3.w.recordKind(st3,'bb-curl',newest.sets,{excludeRow:newest}) === 'pr');
    chk('an older row is judged against what came before it, not against the now',
        b3.w.recordKind(st3,'bb-curl',older.sets,{excludeRow:older}) === 'baseline');
    chk('a row that ties the best is not a record',
        b3.w.recordKind(st3,'bb-curl',[{w:50,r:8,t:null,d:null,a:null,rir:2}]) === 'pr' &&
        b3.w.recordKind(st3,'bb-curl',newest.sets,{excludeRow:newest}) === 'pr');
    b3.w.addSession(ss(0,'bb-curl', 50));
    const h2 = b3.w.exerciseHistory('bb-curl');
    const tie = h2[h2.length - 1];
    chk('a tie is not a record either', b3.w.recordKind(b3.w.getState(),'bb-curl',tie.sets,{excludeRow:tie}) === 'none',
        b3.w.recordKind(b3.w.getState(),'bb-curl',tie.sets,{excludeRow:tie}));
    chk('nothing before the first row at all is a baseline',
        b3.w.recordKind(b3.w.getState(),'bb-curl',tie.sets) === 'none');
  }

  /* warm-up sets never count */
  const benchSets = [ S({w:60,r:8,rir:3}), S({w:20,r:8,rir:3}) ];
  benchSets[1].warmup = true;
  w.addSession({ date:t0+3000, startedAt:t0+3000, planId:'A', name:'b',
    exercises:[{ id:'bb-bench2', sets:benchSets }] });
  chk('warm-up sets are excluded from the working set count',
      w.workingSets(benchSets).length === 1 &&
      w.loggedSets(benchSets).length === 2,
      w.workingSets(benchSets).length + ' working / ' + w.loggedSets(benchSets).length + ' logged');
}

/* ==================================================================== */
group('15. Questions asked once are not asked again, and they work');
{
  const { w, d } = boot();
  onboard(w, d, { goal:'s' });                     // the user picks STRENGTH
  const st = w.getState();
  chk('the answer reaches the field the engine reads',
      st.profile.goals.indexOf('s') >= 0, JSON.stringify(st.profile.goals));
  chk('the single-string mirror follows it', st.profile.goal === 's');
  chk('the programme actually reflects the answer',
      st.plan.sessions.every(s => s.exercises.every(e => e.reps[0] === 4 && e.reps[1] === 7)),
      JSON.stringify(st.plan.sessions[0].exercises[0].reps));
  w.setP('goal','h');
  chk('changing it later updates the goals array too',
      w.getState().profile.goals.join() === 'h', w.getState().profile.goals.join());
  w.go('profile');
  const txt = d.querySelector('#screenBody').textContent;
  /* the pool's group labels moved from .eyebrow to the shared disclosure label
     (.dis-t) when the pool adopted the one accordion the app has */
  const headings = Array.from(d.querySelectorAll('#screenBody .eyebrow, #screenBody .dis-t'))
    .map(x => x.textContent.trim());
  const PATTERNS = ['pushH','pushV','pullH','pullV','squat','hinge','calf','curl','extend','forearm','core'];
  const raw = headings.filter(x => PATTERNS.indexOf(x) >= 0);
  chk('no internal pattern key is used as a group heading', raw.length === 0, raw.join(', '));
  chk('group headings are translated', headings.some(x => x === w.t('pat.hinge')),
      headings.slice(0,4).join(', '));
  const goalPanels = Array.from(d.querySelectorAll('.panel h3'))
    .filter(x => x.textContent === w.t('onb.goal.t')).length;
  chk('there is exactly one goal control on the profile screen', goalPanels === 1,
      String(goalPanels));
}

/* ==================================================================== */
group('Training focus: emphasis adds attention, never subtracts coverage');
{
  const { w, d } = boot();
  w.chooseLang('en');
  const byId = w.eval('EX_BY_ID');

  /* A fixed, ordinary profile: 3 days, gym, 50 minutes, intermediate, hypertrophy. */
  function base(over){
    return Object.assign({}, w.getState().profile, {
      experience:'i', goal:'h', equipment:'gym', environment:'gym',
      daysPerWeek:3, sessionMinutes:50, emphasis:'balanced', priorities:[]
    }, over || {});
  }
  /* Planned set-volume per muscle, the same weighting the review uses:
     n sets × the muscle's share of the movement. */
  function plannedVolume(plan){
    const out = {};
    (plan.sessions || []).forEach(sess => (sess.exercises || []).forEach(e => {
      const ex = byId[e.id];
      if(!ex) return;
      ex.m.forEach(([m, weight]) => { out[m] = (out[m] || 0) + (e.sets || 0) * weight; });
    }));
    return out;
  }
  const countEx = plan => (plan.sessions || []).reduce((n, s) => n + s.exercises.length, 0);

  const balanced = w.buildPlan(base());
  const vBalanced = plannedVolume(balanced);
  chk('a balanced plan is the same eighteen exercises it always was',
      countEx(balanced) === 18 && balanced.sessions.length === 3, countEx(balanced) + ' exercises');
  chk('and it says so on its own stamp',
      balanced.emphasis === 'balanced' && (balanced.priorities || []).length === 0);
  chk('asking for balanced twice gives the same sessions',
      JSON.stringify(w.buildPlan(base({ emphasis:'balanced', priorities:[] })).sessions) ===
      JSON.stringify(balanced.sessions));

  /* Every emphasis is legal; none of them may delete a muscle from the week. */
  const covered = v => Object.keys(v).filter(m => v[m] > 0).length;
  const emphases = ['lower','upper','glutes'];
  const problems = [];
  emphases.forEach(e => {
    const plan = w.buildPlan(base({ emphasis:e }));
    const v = plannedVolume(plan);
    if(covered(v) < covered(vBalanced)) problems.push(e + ' covers ' + covered(v) + ' muscles');
    if(countEx(plan) > countEx(balanced) + 2)
      problems.push(e + ' added ' + (countEx(plan) - countEx(balanced)) + ' exercises');
  });
  chk('no emphasis removes a muscle from the week', problems.length === 0,
      problems.join('; ') || '3 emphases, full coverage');
  chk('at most two extra exercises a week, as the copy promises', problems.length === 0);

  const glutes = w.buildPlan(base({ emphasis:'glutes' }));
  const vGlutes = plannedVolume(glutes);
  chk('glute emphasis raises planned glute work',
      vGlutes.glutes > vBalanced.glutes,
      vBalanced.glutes.toFixed(2) + ' → ' + vGlutes.glutes.toFixed(2));
  chk('and it does not buy that volume by cutting the quads',
      vGlutes.quads >= vBalanced.quads,
      vBalanced.quads.toFixed(2) + ' → ' + vGlutes.quads.toFixed(2));

  const upper = w.buildPlan(base({ emphasis:'upper' }));
  chk('upper emphasis raises chest work',
      plannedVolume(upper).chest > vBalanced.chest,
      vBalanced.chest.toFixed(2) + ' → ' + plannedVolume(upper).chest.toFixed(2));

  const custom = w.buildPlan(base({ emphasis:'custom', priorities:['chest','shoulders'] }));
  const vCustom = plannedVolume(custom);
  chk('custom priorities favour exactly what was asked for',
      vCustom.chest > vBalanced.chest && vCustom.shoulders > vBalanced.shoulders,
      'chest ' + vBalanced.chest.toFixed(2) + '→' + vCustom.chest.toFixed(2) +
      ', shoulders ' + vBalanced.shoulders.toFixed(2) + '→' + vCustom.shoulders.toFixed(2));

  /* No session may list the same movement twice: emphasis widens the pool, it
     does not let one movement be counted twice in the same day. */
  const dupes = [];
  ['balanced','lower','upper','glutes','custom'].forEach(e => {
    const plan = w.buildPlan(base({ emphasis:e,
      priorities: e === 'custom' ? ['chest','shoulders'] : [] }));
    plan.sessions.forEach(sess => {
      const ids = sess.exercises.map(x => x.id);
      if(new Set(ids).size !== ids.length) dupes.push(e + ':' + sess.name);
    });
  });
  chk('no session repeats a movement', dupes.length === 0, dupes.join(', ') || '5 plans clean');

  /* Changing the answer never rebuilds the programme behind the user's back. */
  const { w:w2 } = boot();
  w2.chooseLang('en');
  w2.getState().profile = Object.assign(w2.getState().profile, base());
  w2.getState().plan = w2.buildPlan(w2.getState().profile);
  const before = JSON.stringify(w2.getState().plan);
  const vBefore = plannedVolume(w2.getState().plan);
  w2.setEmphasis('glutes');
  chk('changing the focus leaves the programme in hand untouched',
      JSON.stringify(w2.getState().plan) === before);
  chk('but the mismatch is now visible on the profile',
      w2.planFocusStale(w2.getState()) === true);
  w2.rebuildPlan();
  chk('rebuilding applies the new focus',
      w2.getState().plan.emphasis === 'glutes' && w2.planFocusStale(w2.getState()) === false);
  const vAfter = plannedVolume(w2.getState().plan);
  chk('and the programme in hand now carries the glute work',
      vAfter.glutes > vBefore.glutes,
      vBefore.glutes.toFixed(2) + ' → ' + vAfter.glutes.toFixed(2));
  chk('the rebuilt plan names its focus on the session screen',
      w2.getState().plan.emphasis === 'glutes' &&
      w2.emphasisSummary(w2.getState().plan, w2.getState().profile).key === 'plan.focusGlutes');
}

/* ==================================================================== */
console.log('\n' + '='.repeat(64));
if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' LOGIC TESTS PASSED\x1b[0m');
else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed');
       failures.forEach(f => console.log('   - ' + f)); }
console.log('='.repeat(64) + '\n');
process.exit(fail === 0 ? 0 : 1);
})();
