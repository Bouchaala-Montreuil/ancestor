/* ============================================================================
   ANCESTOR — Muscle-specific recovery estimator

   HONEST BY DESIGN. This cannot measure muscle recovery. It produces a
   transparent estimate from: when you last trained a muscle, how much work
   you did, your logged sleep, your schedule, what you reported about soreness,
   and — once there is enough of it — how your own performance responded to
   previous gaps.

   There are no fixed universal durations. The defaults below are conservative
   starting points that adapt cautiously and stay inside hard bounds.
   ========================================================================== */

/* Conservative starting points, in days. NOT universal truths. */
const BASE_DAYS = {
  chest: 2.5, back: 2.5, shoulders: 2.0, biceps: 2.0, triceps: 2.0, forearms: 1.0,
  quads: 3.0, hamstrings: 3.0, glutes: 3.0, calves: 1.5, abs: 1.0, lowerback: 3.0
};

/* A "reference stimulus": three hard sets where the muscle is the prime mover. */
const REF_STIMULUS = 3.0;

const STYLE_FACTOR = { hit: 1.15, std: 1.0, min: 1.05, freq: 0.95 };
const EXP_FACTOR   = { b: 1.15, i: 1.0, a: 0.95 };

/* How much the app is allowed to learn. Never more. */
const ADAPT_MIN = 0.65, ADAPT_MAX = 1.50, ADAPT_STEP = 0.05, ADAPT_MIN_OBS = 3;

/* ----------------------------------------------------------------------------
   recoveryDays(state, muscle, now) -> { days, ratio, state, parts, learned }
   ---------------------------------------------------------------------------- */
function recoveryDays(state, muscle, now){
  const p = state.profile || {};
  const last = lastTrainedByMuscle()[muscle] || null;
  const base = BASE_DAYS[muscle] !== undefined ? BASE_DAYS[muscle] : 2.5;

  const parts = [];
  let factor = 1;

  /* --- how much work was done on this muscle last time ----------------- */
  let stim = REF_STIMULUS;
  if(last){
    // sets-equivalent: contribution relative to a reference set at the exercise's weight
    const ex = EX_BY_ID[last.exId];
    const sets = (function(){
      const sess = state.sessions.filter(s => s.date === last.date)[0];
      if(!sess) return 3;
      const e = (sess.exercises||[]).filter(x => x.id === last.exId)[0];
      return e ? workingSets(e.sets).length : 3;
    })();
    const w = ex ? muscleWeight(ex, muscle) : 1;
    stim = Math.max(0.5, sets * Math.max(0.2, w));
  }
  const stimF = 1 + clampNum((stim - REF_STIMULUS)/REF_STIMULUS * 0.30, -0.25, 0.60);
  factor *= stimF;
  /* Every factor carries a KEY, never a sentence: this file has no business
     knowing English. `labelKey` and `noteKey` are resolved by `t()` in the UI
     (js/ui/screens.js) and in the why-engine (js/engine/why.js). An English
     string here reached the screen untranslated in six of seven languages. */
  parts.push({ k:'volume', f:stimF, labelKey:'rec.volume' });

  /* --- intensity: how close to failure --------------------------------- */
  const avgRir = recentRir(state, 21, now);
  let intF = 1;
  if(avgRir !== null){
    if(avgRir <= 1) intF = 1.10;
    else if(avgRir >= 4) intF = 0.92;
  }
  factor *= intF;
  parts.push({ k:'intensity', f:intF, labelKey:'rec.intensity' });

  /* --- style ----------------------------------------------------------- */
  const styleF = STYLE_FACTOR[p.style] !== undefined ? STYLE_FACTOR[p.style] : 1;
  factor *= styleF;
  parts.push({ k:'style', f:styleF, labelKey:'rec.style' });

  /* --- experience ------------------------------------------------------ */
  const expF = EXP_FACTOR[p.experience] !== undefined ? EXP_FACTOR[p.experience] : 1;
  factor *= expF;
  parts.push({ k:'experience', f:expF, labelKey:'rec.experience' });

  /* --- sleep (logged, not assumed) ------------------------------------- */
  const ss = sleepStats(state.sleep, now, 7);
  let sleepF = 1, sleepKey = 'rec.sleep.none', irregular = false;
  if(ss.avg !== null && ss.avg !== undefined){
    if(ss.avg < 5)      { sleepF = 1.30; sleepKey = 'rec.sleep.under5'; }
    else if(ss.avg < 6) { sleepF = 1.20; sleepKey = 'rec.sleep.under6'; }
    else if(ss.avg < 7) { sleepF = 1.08; sleepKey = 'rec.sleep.under7'; }
    else if(ss.avg > 9) { sleepF = 0.96; sleepKey = 'rec.sleep.over9'; }
    else                { sleepF = 1.00; sleepKey = 'rec.sleep.range'; }
    const varH = sleepStartVariability(state.sleep, now, 7);
    if(varH !== null && varH > 4){ sleepF *= 1.08; irregular = true; }
  }
  factor *= sleepF;
  parts.push({ k:'sleep', f:sleepF, labelKey:'rec.sleep', noteKey: sleepKey, noteIrregular: irregular });

  /* --- reported soreness / joint discomfort ---------------------------- */
  const feel = latestFeeling();
  let feelF = 1;
  if(feel && (now - feel.date) < 36*3600000){
    const s = +feel.soreness || 0, j = +feel.joint || 0;
    if(s >= 3) feelF *= 1.30; else if(s === 2) feelF *= 1.15; else if(s === 1) feelF *= 1.05;
    if(j >= 2) feelF *= 1.20; else if(j === 1) feelF *= 1.08;
  }
  factor *= feelF;
  parts.push({ k:'reported', f:feelF, labelKey:'rec.reported' });

  /* --- performance trend as a fatigue proxy ---------------------------- */
  const tr = overallTrend(state, 21, now);
  let trendF = 1;
  if(tr === 'down') trendF = 1.15;
  else if(tr === 'up') trendF = 0.96;
  factor *= trendF;
  parts.push({ k:'trend', f:trendF, labelKey:'rec.trend' });

  /* --- learned adaptation, bounded ------------------------------------- */
  const ad = state.adaptation && state.adaptation[muscle];
  const learned = ad ? ad.mult : 1;
  const obs = ad ? ad.obs : 0;
  factor *= learned;
  parts.push({ k:'learned', f:learned, labelKey:'rec.learned', noteKey:'rec.learned.obs', noteN: obs });

  const days = clampNum(base * factor, 0.5, 14);

  let ratio = 1, since = null, st = 'fresh';
  if(last){
    since = (now - last.date)/86400000;
    ratio = since / days;
    st = ratio >= 1 ? 'ready' : (ratio >= 0.7 ? 'caution' : 'rest');
  }

  return {
    muscle, base, days: days, factor: factor, parts: parts,
    last: last ? last.date : null,
    since: since === null ? null : round1(since),
    ratio: ratio, state: st,
    hoursLeft: since === null ? 0 : Math.max(0, round1((days - since)*24)),
    daysLeft: since === null ? 0 : Math.max(0, round1(days - since)),
    learned: learned, observations: obs
  };
}

function allRecovery(state, now){
  const out = {};
  MUSCLES.forEach(m => out[m] = recoveryDays(state, m, now));
  return out;
}

/* ----------------------------------------------------------------------------
   Learning: did this gap turn out to be long enough?
   Called after each logged session. Cautious, bounded, evidence-gated.
   ---------------------------------------------------------------------------- */
function updateAdaptation(state, exId, now){
  const ex = EX_BY_ID[exId]; if(!ex) return;
  const hist = exerciseHistory(exId);
  if(hist.length < 2) return;                    // need a previous exposure to judge

  const cur = hist[hist.length-1], prev = hist[hist.length-2];
  const gap = (cur.date - prev.date)/86400000;
  const improved = sessionScore(workingSets(cur.sets), ex, state.profile) > sessionScore(workingSets(prev.sets), ex, state.profile) * 1.005;
  const declined = sessionScore(workingSets(cur.sets), ex, state.profile) < sessionScore(workingSets(prev.sets), ex, state.profile) * 0.985;

  if(!state.adaptation) state.adaptation = {};

  ex.m.forEach(([m]) => {
    const est = recoveryDays(state, m, prev.date).days;
    const rec = state.adaptation[m] || { mult: 1, obs: 0 };

    // Trained sooner than estimated and still improved -> we were too cautious.
    if(gap < est * 0.95 && improved)      rec.mult -= ADAPT_STEP;
    // Waited longer than estimated and still got worse -> we were too optimistic.
    else if(gap >= est && declined)       rec.mult += ADAPT_STEP;
    else                                  rec.obs += 0.5;   // neutral evidence accrues slowly

    if(gap < est * 0.95 && improved || (gap >= est && declined)) rec.obs += 1;

    rec.mult = clampNum(rec.mult, ADAPT_MIN, ADAPT_MAX);
    state.adaptation[m] = rec;
  });
  saveState();
}

/* ----------------------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------------------- */
function recentRir(state, days, now){
  const from = now - days*86400000;
  const vals = [];
  state.sessions.forEach(s => {
    if(s.date < from) return;
    (s.exercises||[]).forEach(e => (e.sets||[]).forEach(x => {
      if(x && !x.skipped && x.rir !== undefined && x.rir !== null && x.rir !== '') vals.push(+x.rir);
    }));
  });
  if(!vals.length) return null;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}

/* ----------------------------------------------------------------------------
   Overall performance trend across the last N days.

   It used to take each session's single best e1RM across every exercise in
   it. With a push/pull/legs split that compares a bench press against a
   squat, so the "trend" simply oscillated with the rotation and reported
   progress or decline that never happened.

   A trend is now computed PER EXERCISE, where the numbers are genuinely
   comparable, and the per-exercise results are then combined. Exercises
   without at least two data points in the window contribute nothing rather
   than contributing noise.
   -------------------------------------------------------------------------- */
function exerciseTrend(state, exId, days, now){
  const from = now - days*86400000;
  const ex = EX_BY_ID[exId]; if(!ex) return null;
  const profile = state.profile || {};
  const pts = exerciseHistory(exId).filter(h => h.date >= from).map(h => {
    const b = bestSetScore(workingSets(h.sets), ex, profile);
    return b ? { d: h.date, v: b.score } : null;
  }).filter(Boolean);
  if(pts.length < 2) return null;
  const mid = Math.floor(pts.length/2);
  const early = pts.slice(0, mid).reduce((x,p)=>x+p.v,0) / Math.max(1, mid);
  const late  = pts.slice(mid).reduce((x,p)=>x+p.v,0) / Math.max(1, pts.length-mid);
  if(early <= 0) return null;
  const pct = (late - early) / early;
  return { pct: pct, dir: pct > 0.02 ? 'up' : (pct < -0.02 ? 'down' : 'flat'), points: pts.length };
}

function overallTrend(state, days, now){
  const measured = [];
  (state.sessions || []).forEach(sess => (sess.exercises||[]).forEach(e => {
    if(measured.indexOf(e.id) >= 0) return;
    const tr = exerciseTrend(state, e.id, days, now);
    if(!tr) return;
    measured.push(e.id);
    measured.push(tr);
  }));
  const trends = measured.filter(x => typeof x === 'object');
  if(!trends.length) return 'unknown';
  const mean = trends.reduce((a,t) => a + t.pct, 0) / trends.length;
  return mean > 0.02 ? 'up' : (mean < -0.02 ? 'down' : 'flat');
}

function clampNum(v,a,b){ return Math.max(a, Math.min(b, v)); }
function round1(v){ return Math.round(v*10)/10; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BASE_DAYS, recoveryDays, allRecovery, updateAdaptation, overallTrend, exerciseTrend, recentRir };
}
