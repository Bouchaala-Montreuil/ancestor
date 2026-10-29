/* ============================================================================
   ANCESTOR — logic audit probe (evidence gathering, not a test suite)
   Boots the real app in jsdom and OBSERVES behaviour. Prints facts only.
   Run: node tools/audit_logic.js
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
function onboard(w, d, opts){
  opts = opts || {};
  w.setConsent();
  w.setP('experience', opts.exp || 'i');
  w.setP('goal', opts.goal || 'h');
  w.onbNext();
  w.setP('equipment', opts.equip || 'gym'); w.onbNext();
  w.setP('daysPerWeek', opts.days || 3); w.onbNext();
  w.setP('shiftType','none'); w.onbNext();
  w.onbNext();
  w.setP('style','std'); w.setP('unit','kg');
  const b = Array.from(d.querySelectorAll('#screenBody button.btn'));
  b[b.length-1].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  w.onbNext(); w.finishOnboarding();
}
function setPlan(w, sessions){
  w.getState().plan = { mode:'std', split:3, restSec:120, builtAt:Date.now(), sessions:sessions };
}
/* Fill a field by its LABEL, the way a user finds it. */
function fillByLabel(w, d, card, label, value){
  const flds = Array.from(card.querySelectorAll('.fld'));
  const f = flds.filter(x => (x.querySelector('label')||{}).textContent
              && x.querySelector('label').textContent.indexOf(label) === 0)[0];
  if(!f) throw new Error('no field labelled ' + label + ' (have: ' +
        flds.map(x=>(x.querySelector('label')||{}).textContent).join('|') + ')');
  const inp = f.querySelector('input');
  inp.value = value; inp.dispatchEvent(new w.Event('input', {bubbles:true}));
  return inp;
}

const P = (...a) => console.log(...a);
const H = s => P('\n\x1b[1m### ' + s + '\x1b[0m');

/* ------------------------------------------------------------------ 1 */
H('1. Onboarding goal question: does it change the plan?');
{
  const { w, d } = boot();
  onboard(w, d, { goal: 's' });          // user picks STRENGTH
  const st = w.getState();
  P('  profile.goal  =', JSON.stringify(st.profile.goal));
  P('  profile.goals =', JSON.stringify(st.profile.goals));
  P('  goalRepBias   =', JSON.stringify(w.goalRepBias(st.profile)));
  P('  plan rep ranges:', st.plan.sessions.map(s =>
      s.exercises.map(e => e.id + ':' + e.reps.join('-')).join(' ')).join(' | '));
}

/* ------------------------------------------------------------------ 2 */
H('2. Bodyweight exercise: fields offered and whether a set can be logged');
{
  const { w, d } = boot();
  onboard(w, d);
  setPlan(w, [
    { id:'A', name:'Push', focus:['chest'], exercises:[{ id:'pushup', sets:2, reps:[8,20], rir:1 }] },
    { id:'B', name:'Pull', focus:['back'], exercises:[{ id:'pullup', sets:2, reps:[5,12], rir:2 }] },
    { id:'C', name:'Legs', focus:['quads'], exercises:[{ id:'bw-squat', sets:2, reps:[12,25], rir:2 }] }
  ]);
  w.go('session'); w.startSession();
  const card = d.querySelector('.setcard');
  P('  field labels:', JSON.stringify(Array.from(card.querySelectorAll('.fld label')).map(l=>l.textContent.trim())));
  fillByLabel(w, d, card, w.t('session.reps'), '14');
  P('  after typing 14 reps:', JSON.stringify(w.ANC.active.exercises[0].sets[0]));
  w.toggleSet(0,0);
  P('  after Log set:', JSON.stringify(w.ANC.active.exercises[0].sets[0]));
  w.stopRest(); w.finishSession();
  const st = w.getState();
  P('  sessions saved =', st.sessions.length);
  if(st.sessions.length) P('  stored set =', JSON.stringify(st.sessions[0].exercises[0].sets));
}

/* ------------------------------------------------------------------ 3 */
H('3. Bodyweight session: what do the derived numbers say?');
{
  const { w, d } = boot();
  onboard(w, d);
  w.addSession({ date: Date.now()-7*86400000, startedAt: Date.now()-7*86400000, name:'X', planId:'A',
    exercises:[{ id:'pushup', sets:[{w:null,r:12,rir:2,t:null,d:null,a:null},{w:null,r:10,rir:2,t:null,d:null,a:null}] }] });
  const st = w.getState();
  P('  exerciseHistory rows =', w.exerciseHistory('pushup').length);
  P('  muscleVolume chest   =', JSON.stringify(w.muscleVolume(st,0).chest));
  P('  lastTrained chest    =', JSON.stringify(w.lastTrainedByMuscle().chest));
  P('  overallTrend         =', w.overallTrend(st, 21, Date.now()));
  P('  personalBest         =', JSON.stringify(w.personalBest('pushup')));
  P('  recommend            =', JSON.stringify(w.recommend(st,'pushup',Date.now()).load), 'kg / target',
                                w.recommend(st,'pushup',Date.now()).targetReps, 'reps');
  P('  WITH bodyweight 80kg recorded:');
  st.profile.bodyweight = 80;
  P('   muscleVolume chest  =', JSON.stringify(w.muscleVolume(st,0).chest));
  P('   personalBest score  =', JSON.stringify(w.personalBest('pushup').score.toFixed(2)),
     '(e1rm of 80 kg x 12 =', (80*(1+12/30)).toFixed(2) + ')');
}

/* ------------------------------------------------------------------ 4 */
H('4. Timed exercise (plank): fields, previous result, storing');
{
  const { w, d } = boot();
  onboard(w, d);
  setPlan(w, [
    { id:'A', name:'Core', focus:['abs'], exercises:[{ id:'plank', sets:2, reps:[20,60], rir:2 }] },
    { id:'B', name:'Push', focus:['chest'], exercises:[{ id:'pushup', sets:2, reps:[8,20], rir:1 }] },
    { id:'C', name:'Legs', focus:['quads'], exercises:[{ id:'bw-squat', sets:2, reps:[12,25], rir:2 }] }
  ]);
  w.go('session'); w.startSession();
  const card = d.querySelector('.setcard');
  P('  target shown    =', JSON.stringify(Array.from(d.querySelectorAll('.flag')).map(f=>f.textContent.trim()).slice(0,3)));
  P('  field labels    =', JSON.stringify(Array.from(card.querySelectorAll('.fld label')).map(l=>l.textContent.trim())));
  fillByLabel(w, d, card, w.t('log.time'), '45');
  w.toggleSet(0,0); w.stopRest(); w.finishSession();
  const st = w.getState();
  P('  stored set      =', JSON.stringify(st.sessions[0].exercises[0].sets[0]));
  P('  previous result =', JSON.stringify(w.previousPerformance(st,'plank',Date.now()+1).text));
  P('  history rows    =', w.exerciseHistory('plank').length, '(was 0 before this fix)');
  P('  recommend       =', JSON.stringify((r=>({load:r.load,seconds:r.targetTime,rule:r.rule,kind:r.kind}))(w.recommend(st,'plank',Date.now()))));
}

/* ------------------------------------------------------------------ 5 */
H('5. Assisted pull-up: assistance is not weight lifted');
{
  const { w, d } = boot();
  onboard(w, d);
  setPlan(w, [
    { id:'A', name:'Pull', focus:['back'], exercises:[{ id:'assisted-pullup', sets:2, reps:[5,12], rir:2 }] },
    { id:'B', name:'Push', focus:['chest'], exercises:[{ id:'pushup', sets:2, reps:[8,20], rir:1 }] },
    { id:'C', name:'Legs', focus:['quads'], exercises:[{ id:'bw-squat', sets:2, reps:[12,25], rir:2 }] }
  ]);
  w.go('session'); w.startSession();
  const card = d.querySelector('.setcard');
  P('  field labels    =', JSON.stringify(Array.from(card.querySelectorAll('.fld label')).map(l=>l.textContent.trim())));
  fillByLabel(w, d, card, w.t('log.assist'), '20');
  fillByLabel(w, d, card, w.t('session.reps'), '8');
  w.toggleSet(0,0); w.stopRest(); w.finishSession();
  const st = w.getState();
  const set = st.sessions[0].exercises[0].sets[0];
  P('  stored set      =', JSON.stringify(set));
  P('  load volume     =', w.setsVolume(st.sessions[0].exercises[0].sets, w.eval("EX_BY_ID['assisted-pullup']"), st.profile),
     '(null = correctly no load volume)');
  P('  formatSet       =', JSON.stringify(w.formatSet(set, w.eval("EX_BY_ID['assisted-pullup']"), st.profile)));
  const rec = w.recommend(st,'assisted-pullup',Date.now());
  P('  recommend after =', JSON.stringify({assist:rec.assist, reps:rec.targetReps, kind:rec.kind}));
}

/* ------------------------------------------------------------------ 6 */
H('6. Weighted dip: added load vs total system load');
{
  const { w, d } = boot();
  onboard(w, d);
  setPlan(w, [
    { id:'A', name:'Push', focus:['chest'], exercises:[{ id:'weighted-dip', sets:2, reps:[5,10], rir:2 }] },
    { id:'B', name:'Pull', focus:['back'], exercises:[{ id:'pullup', sets:2, reps:[5,12], rir:2 }] },
    { id:'C', name:'Legs', focus:['quads'], exercises:[{ id:'bw-squat', sets:2, reps:[12,25], rir:2 }] }
  ]);
  w.go('session'); w.startSession();
  const card = d.querySelector('.setcard');
  P('  field labels    =', JSON.stringify(Array.from(card.querySelectorAll('.fld label')).map(l=>l.textContent.trim())));
  fillByLabel(w, d, card, w.t('log.added'), '10');
  fillByLabel(w, d, card, w.t('session.reps'), '8');
  w.toggleSet(0,0); w.stopRest(); w.finishSession();
  const st = w.getState();
  const ex = w.eval("EX_BY_ID['weighted-dip']");
  const set = st.sessions[0].exercises[0].sets[0];
  P('  stored set      =', JSON.stringify(set));
  P('  NO bodyweight:  volume =', w.setsVolume([set], ex, st.profile), ' score basis =', w.setMetrics(set, ex, st.profile).basis);
  st.profile.bodyweight = 82;
  P('  WITH bodyweight: systemLoad =', w.setMetrics(set, ex, st.profile).systemLoad,
     ' volume =', w.setsVolume([set], ex, st.profile));
  P('  formatSet       =', JSON.stringify(w.formatSet(set, ex, st.profile)));
}

/* ------------------------------------------------------------------ 7 */
H('7. Loaded exercise: previous result is shown, planned values are not saved');
{
  const { w, d } = boot();
  onboard(w, d);
  w.addSession({ date: Date.now()-4*86400000, startedAt: Date.now()-4*86400000, planId:'A', name:'prev',
    exercises:[{ id:'bb-bench', sets:[{w:60,r:8,rir:2,t:null,d:null,a:null}] }] });
  setPlan(w, [
    { id:'A', name:'Push', focus:['chest'], exercises:[{ id:'bb-bench', sets:3, reps:[6,10], rir:2 }] },
    { id:'B', name:'Pull', focus:['back'], exercises:[{ id:'bb-row', sets:3, reps:[6,10], rir:2 }] },
    { id:'C', name:'Legs', focus:['quads'], exercises:[{ id:'bb-squat', sets:3, reps:[5,8], rir:2 }] }
  ]);
  w.go('session'); w.startSession();
  P('  set 1 prefilled =', JSON.stringify(w.ANC.active.exercises[0].sets[0]));
  const prevLine = d.querySelector('.prev-line');
  P('  previous shown  =', JSON.stringify(prevLine ? prevLine.textContent.replace(/\s+/g,' ').trim() : 'none'));
  P('  finishing WITHOUT touching anything:');
  w.finishSession();
  P('   sessions =', w.getState().sessions.length, '(must stay 1 — planned values are not results)');
  P('   toast    =', JSON.stringify(d.querySelector('#toast').textContent));
}

/* ------------------------------------------------------------------ 8 */
H('8. Full journey: log a mixed session, correct a set, finish once');
{
  const { w, d } = boot();
  onboard(w, d);
  setPlan(w, [
    { id:'A', name:'Mixed', focus:['chest','abs'], exercises:[
        { id:'bb-bench', sets:2, reps:[6,10], rir:2 },
        { id:'plank',    sets:2, reps:[20,60], rir:2 } ] },
    { id:'B', name:'Pull', focus:['back'], exercises:[{ id:'pullup', sets:2, reps:[5,12], rir:2 }] },
    { id:'C', name:'Legs', focus:['quads'], exercises:[{ id:'bw-squat', sets:2, reps:[12,25], rir:2 }] }
  ]);
  w.go('session'); w.startSession();
  let cards = Array.from(d.querySelectorAll('.setcard'));
  fillByLabel(w, d, cards[0], w.t('log.load'), '62.5');
  fillByLabel(w, d, cards[0], w.t('session.reps'), '7');
  w.toggleSet(0,0); w.stopRest();
  cards = Array.from(d.querySelectorAll('.setcard'));
  fillByLabel(w, d, cards[1], w.t('log.load'), '62.5');
  fillByLabel(w, d, cards[1], w.t('session.reps'), '9');
  w.toggleSet(0,1); w.stopRest();
  cards = Array.from(d.querySelectorAll('.setcard'));
  fillByLabel(w, d, cards[2], w.t('log.time'), '40');
  w.toggleSet(1,0); w.stopRest();
  // correct the first set: 7 -> 6 reps
  w.toggleSet(0,0);                                   // reopen
  cards = Array.from(d.querySelectorAll('.setcard'));
  fillByLabel(w, d, cards[0], w.t('session.reps'), '6');
  P('  set 1 after correction:', JSON.stringify(w.ANC.active.exercises[0].sets[0]));
  w.toggleSet(0,0); w.stopRest();
  const before = w.getState().sessions.length;
  w.finishSession();
  w.finishSession();                                   // second tap must not duplicate
  const st = w.getState();
  P('  sessions before/after =', before, '/', st.sessions.length);
  P('  stored =', JSON.stringify(st.sessions[st.sessions.length-1].exercises));
  P('  summary =', JSON.stringify(w.eval('LAST_SUMMARY')));
}

/* ------------------------------------------------------------------ 9 */
H('9. Progression can actually step down');
{
  const { w, d } = boot();
  onboard(w, d);
  const t0 = Date.now();
  w.addSession({ date:t0-3*86400000, startedAt:t0-3*86400000, planId:'A', name:'a',
    exercises:[{ id:'ohp', sets:[{w:2.5,r:6,rir:3,t:null,d:null,a:null}] }] });
  w.addSession({ date:t0-2*86400000, startedAt:t0-2*86400000, planId:'A', name:'b',
    exercises:[{ id:'ohp', sets:[{w:2.5,r:3,rir:1,t:null,d:null,a:null}] }] });
  const r = w.recommend(w.getState(),'ohp',t0);
  P('  2.5 kg with 3 reps (below the 5-rep floor):',
     JSON.stringify({kind:r.kind, load:r.load, rule:r.rule}));
}

/* ------------------------------------------------------------------ 10 */
H('10. Trend metric across alternating push / legs sessions');
{
  const { w, d } = boot();
  onboard(w, d);
  const t = Date.now();
  const mk = (dt, id, w_, r) => ({ date:t-dt*86400000, startedAt:t-dt*86400000, planId:'A', name:id,
    exercises:[{ id:id, sets:[{w:w_, r:r, rir:2, w:w_, r:r, t:null, d:null, a:null}] }] });
  w.addSession(mk(12,'bb-bench',60,8));
  w.addSession(mk(9, 'bb-squat',100,6));
  w.addSession(mk(6, 'bb-bench',62.5,8));
  w.addSession(mk(3, 'bb-squat',102.5,6));
  P('  bench 60->62.5, squat 100->102.5, i.e. both improved');
  P('  overallTrend =', w.overallTrend(w.getState(), 21, t));
}

/* ------------------------------------------------------------------ 11 */
H('11. First exposure: baseline, not a personal record');
{
  const { w, d } = boot();
  onboard(w, d);
  w.addSession({ date: Date.now(), startedAt:Date.now(), planId:'A', name:'first',
    exercises:[{ id:'bb-bench', sets:[{w:40,r:8,rir:3,t:null,d:null,a:null}] }] });
  P('  recordKind first exposure =', w.recordKind(w.getState(),'bb-bench',[{w:40,r:8,rir:3,t:null,d:null,a:null}]));
  w.addSession({ date: Date.now()+1000, startedAt:Date.now()+1000, planId:'A', name:'second',
    exercises:[{ id:'bb-bench', sets:[{w:45,r:8,rir:3,t:null,d:null,a:null}] }] });
  P('  recordKind after a better session =', w.recordKind(w.getState(),'bb-bench',[{w:45,r:8,rir:3,t:null,d:null,a:null}]));
  w.addSession({ date: Date.now()+2000, startedAt:Date.now()+2000, planId:'A', name:'third',
    exercises:[{ id:'bb-bench', sets:[{w:40,r:8,rir:3,t:null,d:null,a:null}] }] });
  P('  recordKind after a worse session  =', w.recordKind(w.getState(),'bb-bench',[{w:40,r:8,rir:3,t:null,d:null,a:null}]));
}

/* ------------------------------------------------------------------ 12 */
H('12. History editing and raw keys in the UI');
{
  const { w, d } = boot();
  onboard(w, d);
  w.addSession({ date: Date.now(), startedAt:Date.now(), planId:'A', name:'x',
    exercises:[{ id:'bb-bench', sets:[{w:60,r:8,rir:2,t:null,d:null,a:null}] }] });
  const st = w.getState();
  const vol0 = w.muscleVolume(st, 0).chest.load;
  w.updateSet(st.sessions[0].id, 0, 0, { w:80, r:5 });
  const vol1 = w.muscleVolume(w.getState(), 0).chest.load;
  P('  chest load volume 60x8 =', vol0, '-> 80x5 =', vol1);
  w.deleteSet(st.sessions[0].id, 0, 0);
  P('  after deleting the only set, exercises in session =',
     w.getState().sessions[0].exercises.length, '(exercise removed with it)');
  P('  pruneEmptySessions removed =', w.pruneEmptySessions(), 'empty session(s)');
  w.go('profile');
  const txt = d.querySelector('#screenBody').textContent;
  P('  raw pattern keys on Profile =',
     JSON.stringify(['pushH','pushV','pullH','pullV','squat','hinge','calf','curl','extend','forearm','core']
       .filter(k => txt.indexOf(k) >= 0)));
}

P('\n\x1b[2m(probe complete)\x1b[0m\n');
