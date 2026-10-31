/* ============================================================================
   ANCESTOR — Progressive overload engine

   DETERMINISTIC. Same history in -> same recommendation out. No randomness,
   no calendar, no generative model. The next target depends on what you
   actually did, never on how many days have passed.

   Ten explicit rules (see RULES below). Every recommendation carries the
   reasons that produced it so the interface can explain itself.

   MODE-AWARE. A barbell press progresses by load, a plank by seconds held,
   an assisted pull-up by reducing assistance, a carry by distance. Applying
   one formula to all of them is how the app ended up telling people to add
   2.5 kg to a dead hang. The axis comes from exLogSpec(), never from the
   screen and never from a guess.
   ========================================================================== */

/* Estimated one-rep-max proxy (Epley). Used only as a TREND signal.
   It is an estimate, never presented as a measured maximum. */
function e1rm(w, r){ return (+w||0) * (1 + (+r||0)/30); }

/* Best comparable effort in a set list. `ex` is required for a truthful
   score: without it a 40-second plank scores zero and any trend built on it
   is fiction. When ex is omitted the sets are scored as load x reps, which
   is the only thing that can be assumed about an untyped record. */
function sessionScore(sets, ex, profile){
  if(ex) {
    const b = bestSetScore(workingSets(sets), ex, profile || (getState ? getState().profile : null));
    return b ? b.score : 0;
  }
  let best = 0;
  (sets||[]).forEach(s => { if(s && !s.skipped) best = Math.max(best, e1rm(s.w, s.r)); });
  return best;
}

const RULES = [
  'R1  Establish a baseline on the first exposure to an exercise.',
  'R2  Build repetitions within the target range at the current load.',
  'R3  Increase the training variable only when every prescribed set reaches the top of the range at the target effort.',
  'R4  Hold the variable when the increase has not been earned.',
  'R5  Reduce the variable when performance or technique deteriorates.',
  'R6  A missed or delayed session never triggers an increase.',
  'R7  Repeated stagnation is flagged, not punished with more weight.',
  'R8  A deload is recommended only after stagnation combined with fatigue evidence.',
  'R9  Progress is tracked across weeks and months, not session to session.',
  'R10 Every change is explained in the interface.'
];

/* Round a load to something that exists in a real gym. */
function roundLoad(w, ex, unit){
  if(w === null || w === undefined || !isFinite(w)) return null;
  const stepKg = (ex && ex.equip === 'dumbbell') ? 2 : 2.5;
  const stepLb = 5;
  const step = (unit === 'lb') ? stepLb : stepKg;
  const rounded = Math.round(w/step)*step;
  return Math.max(0, Math.round(rounded*100)/100);
}

/* Same, but always DOWN to the next load that actually exists. Rounding to
   nearest meant a reduction could land back on the load it was trying to
   reduce from: 2.5 kg minus 7.5% is 2.31 kg, which rounds straight back to
   2.5 kg, so the app told a struggling user to repeat the weight that was
   already too heavy. */
function roundLoadDown(w, ex, unit){
  if(w === null || w === undefined || !isFinite(w)) return null;
  const stepKg = (ex && ex.equip === 'dumbbell') ? 2 : 2.5;
  const step = (unit === 'lb') ? 5 : stepKg;
  const rounded = Math.floor(w/step)*step;
  return Math.max(0, Math.round(rounded*100)/100);
}

/* Smallest meaningful jump, by equipment and region. */
function stepFor(ex, unit){
  if(unit === 'lb') return 5;
  return (ex && ex.equip === 'dumbbell') ? 2 : 2.5;
}

/* One step of progress for an axis that is not measured in kg. */
const TIME_STEP_SEC   = 10;
const DIST_STEP_RATIO = 0.10;
function roundSeconds(v){ return Math.max(5, Math.round(v/5)*5); }
function roundDistance(m){ return Math.max(5, Math.round(m/5)*5); }

const LOWER_PATTERNS = ['squat','hinge','calf'];

/* ----------------------------------------------------------------------------
   recommend() — the single decision point for "what should I do today?"
   ---------------------------------------------------------------------------- */
function recommend(state, exId, now){
  const ex = EX_BY_ID[exId];
  if(!ex) return null;
  const unit = (state.profile && state.profile.unit) || 'kg';
  const profile = state.profile || {};
  const spec = exLogSpec(ex);
  const range = exTargetRange(ex);
  const hist = exerciseHistory(exId);
  const out = {
    exId, unit, mode: spec.mode, axis: spec.axis, rangeUnit: range.unit,
    lo: range.lo, hi: range.hi, rir: ex.rir,
    reasons: [], rule: null, kind: null,
    load: null, assist: null,
    targetReps: null, targetTime: null, targetDistance: null,
    prev: null, trend: 'unknown'
  };

  /* ---- R1: baseline ---------------------------------------------------- */
  if(!hist.length){
    out.kind = 'baseline';
    out.rule = 'R1';
    applyTarget(out, spec, range, null, null, range.lo);
    out.reasons.push({ k:'r1', tone:'up', text: t('train.firsttime') });
    return out;
  }

  const last = hist[hist.length-1];
  const lastSets = workingSets(last.sets);
  const best = bestSetScore(lastSets, ex, profile);

  /* What the user actually did, on this exercise's own axis. */
  const curLoad   = spec.hasAssist ? (best ? best.metrics.assistance : null)
                                   : (best ? best.metrics.load : null);
  const curReps   = best ? best.metrics.reps : null;
  const curTime   = best ? best.metrics.seconds : null;
  const curDist   = best ? best.metrics.distance : null;
  const curScore  = best ? best.score : 0;

  /* How far the reference set got, on the axis that judges this exercise.
     Load, repetition and assistance work are all judged on repetitions: how
     many reps were completed at the load (or assistance) that was used. */
  const primaryValue = spec.axis === 'time'     ? curTime
                     : spec.axis === 'distance' ? curDist
                     : curReps;
  const bottomOfRange = range.lo;

  const rirReported = lastSets.map(s => (s.rir === undefined || s.rir === null || s.rir === '') ? null : +s.rir).filter(x => x !== null);
  const worstRir = rirReported.length ? Math.max.apply(null, rirReported) : null;

  out.prev = { load: curLoad, reps: curReps, time: curTime, distance: curDist,
               date: last.date, score: curScore };

  /* trend over the last three exposures */
  if(hist.length >= 2){
    const scores = hist.slice(-3).map(h =>
      sessionScore(workingSets(h.sets), ex, profile));
    const cur = scores[scores.length-1];
    const base = scores.slice(0,-1).reduce((a,b)=>a+b,0) / Math.max(1, scores.length-1);
    const pct = base > 0 ? (cur-base)/base : 0;
    out.trend = pct > 0.02 ? 'up' : (pct < -0.02 ? 'down' : 'flat');
  }

  const daysSince = (now - last.date) / 86400000;
  const step = stepFor(ex, unit);

  /* ---- R6: a long gap never earns an increase ------------------------- */
  if(daysSince > 21){
    out.kind = 'reentry';
    out.rule = 'R6';
    if(spec.axis === 'load' || spec.axis === 'reps'){
      out.load = curLoad === null ? null : roundLoadDown(curLoad * 0.95, ex, unit);
      out.targetReps = range.lo;
    } else if(spec.axis === 'assist'){
      out.assist = curLoad === null ? null : Math.min(range.hi, (curLoad||0) + step);
      out.targetReps = range.lo;
    } else if(spec.axis === 'time'){
      out.targetTime = curTime === null ? range.lo : Math.max(5, roundSeconds(curTime*0.9));
    } else {
      out.targetDistance = curDist === null ? range.lo : roundDistance(curDist*0.9);
    }
    out.reasons.push({ k:'r6', tone:'warn',
      text: 'Long gap (' + Math.round(daysSince) + ' days) since the last exposure to this exercise. ' +
            'Re-establish slightly below your last result and rebuild before pushing on. Time alone never earns an increase.' });
    return out;
  }

  /* ---- R5/R8: deterioration ------------------------------------------- */
  const scoreAt = i => sessionScore(workingSets(hist[i].sets), ex, profile);
  const declinedTwice = hist.length >= 3 &&
      scoreAt(hist.length-1) < scoreAt(hist.length-2) &&
      scoreAt(hist.length-2) < scoreAt(hist.length-3);

  if(declinedTwice){
    out.kind = 'deload';
    out.rule = 'R8';
    reduceBy(out, spec, range, curLoad, curTime, curDist, ex, unit, 0.10, step);
    out.reasons.push({ k:'r8', tone:'down',
      text: 'Performance dropped in two consecutive sessions. Follow the adjusted target and rebuild.' });
    return out;
  }

  /* Below the bottom of the range: the work was too hard, not too easy. */
  const fellShort = primaryValue !== null && primaryValue < bottomOfRange;
  if(fellShort){
    out.kind = 'reduce';
    out.rule = 'R5';
    reduceBy(out, spec, range, curLoad, curTime, curDist, ex, unit, 0.075, step);
    out.reasons.push({ k:'r5', tone:'down',
      text: 'Last session fell short of the target range. Follow the adjusted target and rebuild.' });
    return out;
  }

  /* ---- R7: stagnation -------------------------------------------------- */
  const stagnant = hist.length >= 3 && (function(){
    const s3 = hist.slice(-3).map((h,i) => scoreAt(hist.length-3+i));
    const mx = Math.max.apply(null, s3), mn = Math.min.apply(null, s3);
    return mx > 0 && (mx-mn)/mx < 0.02;
  })();

  const allSetsAtTop = lastSets.length >= 1 && lastSets.every(s => {
    const m = setMetrics(s, ex, profile);
    if(spec.axis === 'time')     return m.seconds  !== null && m.seconds  >= range.hi;
    if(spec.axis === 'distance') return m.distance !== null && m.distance >= range.hi;
    return m.reps !== null && m.reps >= range.hi;
  });
  const effortMet = (worstRir === null)
    ? allSetsAtTop
    : (worstRir <= ex.rir);

  /* ---- R3: earned increase -------------------------------------------- */
  if(allSetsAtTop && effortMet){
    out.kind = 'increase';
    out.rule = 'R3';
    advance(out, spec, range, curLoad, curTime, curDist, ex, unit, step, profile);
    out.reasons.push({ k:'r3', tone:'up', text: r3Reason(spec, out, range, unit) });
    return out;
  }

  /* ---- R2/R4: hold and chase one more unit ------------------------------ */
  out.kind = stagnant ? 'plateau' : 'hold';
  out.rule = stagnant ? 'R7' : 'R4';
  holdAndBuild(out, spec, range, curLoad, curTime, curDist, curReps, step);
  if(stagnant){
    // Time and distance are the primary training variable for these modes:
    // a plateau holds that variable rather than quietly increasing it.
    if(spec.axis === 'time') out.targetTime = curTime === null ? range.lo : curTime;
    if(spec.axis === 'distance') out.targetDistance = curDist === null ? range.lo : curDist;
    out.reasons.push({ k:'r7', tone:'warn',
      text: 'Three sessions with no measurable progress on this exercise. Hold, and check sleep and recovery before adding anything.' });
  } else {
    out.reasons.push({ k:'r4', tone:'warn',
      text: 'The increase has not been earned yet. Hold and aim to beat your last result by one step.' });
  }
  return out;
}

/* ------------------------------------------------------------ target writers */
function applyTarget(out, spec, range, load, assist, primary){
  if(spec.axis === 'time')        out.targetTime = primary;
  else if(spec.axis === 'distance') out.targetDistance = primary;
  else if(spec.axis === 'assist') { out.assist = assist; out.targetReps = primary; }
  else { out.load = load; out.targetReps = primary; }
}

/* One step forward on whatever axis this exercise uses. */
function advance(out, spec, range, curLoad, curTime, curDist, ex, unit, step, profile){
  if(spec.axis === 'time'){
    const base = (curTime === null ? range.hi : curTime);
    out.targetTime = roundSeconds(base + TIME_STEP_SEC);
    if(spec.loadRole === 'added' && out.targetTime > 60){
      // past a minute the useful next step is load, not another ten seconds
      out.load = roundLoad((curLoad || 0) + step, ex, unit);
    } else if(spec.loadRole === 'added'){
      out.load = curLoad;
    }
    return;
  }
  if(spec.axis === 'distance'){
    const base = (curDist === null ? range.hi : curDist);
    out.targetDistance = roundDistance(base * (1 + DIST_STEP_RATIO));
    out.load = curLoad;
    return;
  }
  if(spec.axis === 'assist'){
    // LESS assistance is progress. Never below zero: that would be added weight.
    const next = Math.max(0, (curLoad || 0) - step);
    out.assist = next;
    out.targetReps = range.lo;
    return;
  }
  if(spec.axis === 'reps'){
    // Bodyweight progression: once every set reaches the top of the rep range
    // the next step is a small amount of ADDED load and back to the bottom of
    // the range. It is never a percentage of bodyweight, and never a guess at
    // total system load.
    out.load = roundLoad((curLoad || 0) + step, ex, unit);
    out.targetReps = range.lo;
    return;
  }
  // load axis
  const isLower = LOWER_PATTERNS.indexOf(ex.pat) >= 0;
  const pct = isLower ? 0.05 : 0.025;
  let next = (curLoad || 0) * (1 + pct);
  if(!curLoad) next = step;                                  // bodyweight -> first plate
  else if(next - curLoad < step) next = curLoad + step;      // never sub-increment
  out.load = roundLoad(next, ex, unit);
  out.targetReps = range.lo;
}

/* One step back, always to a value that exists. */
function reduceBy(out, spec, range, curLoad, curTime, curDist, ex, unit, ratio, step){
  if(spec.axis === 'time'){
    const base = (curTime === null ? range.lo : curTime);
    out.targetTime = Math.max(5, roundSeconds(base * (1 - ratio)));
    return;
  }
  if(spec.axis === 'distance'){
    const base = (curDist === null ? range.lo : curDist);
    out.targetDistance = Math.max(5, roundDistance(base * (1 - ratio)));
    out.load = curLoad;
    return;
  }
  if(spec.axis === 'assist'){
    out.assist = (curLoad === null || curLoad === 0) ? step : curLoad + step;  // more help
    out.targetReps = range.lo;
    return;
  }
  // load / reps axis
  if(curLoad === null || curLoad === 0){
    out.load = 0;
    out.targetReps = range.lo;
    return;
  }
  let next = roundLoadDown(curLoad * (1 - ratio), ex, unit);
  if(next >= curLoad) next = Math.max(0, curLoad - step);     // guarantee movement
  out.load = next;
  out.targetReps = range.lo;
}

/* Hold the variable, chase one more repetition / second / metre. */
function holdAndBuild(out, spec, range, curLoad, curTime, curDist, curReps, step){
  if(spec.axis === 'time'){
    out.targetTime = curTime === null ? range.lo : Math.min(range.hi, roundSeconds(curTime + TIME_STEP_SEC));
    return;
  }
  if(spec.axis === 'distance'){
    out.targetDistance = curDist === null ? range.lo : roundDistance(curDist * 1.05);
    out.load = curLoad;
    return;
  }
  if(spec.axis === 'assist'){
    out.assist = curLoad;
    out.targetReps = Math.min(range.hi, (curReps || range.lo) + 1);
    return;
  }
  out.load = curLoad;
  out.targetReps = Math.min(range.hi, (curReps || range.lo) + 1);
}

function r3Reason(spec, out, range, unit){
  if(spec.axis === 'time')        return 'Every hold reached the top of the target range. Add ' + TIME_STEP_SEC + ' seconds.';
  if(spec.axis === 'distance')    return 'Every carry reached the top of the target range. Extend the distance slightly.';
  if(spec.axis === 'assist')      return 'Every set reached the top of the rep range. Reduce the assistance by one increment — lifting more of your own body is the progression.';
  if(spec.axis === 'reps')        return 'Every set reached the top of the rep range at the target effort. Add the smallest practical load and start the range again.';
  return 'Every set reached the top of the rep range at the target effort. Smallest practical increase applied.';
}

/* ------------------------------------------------------------------ records */
/* 'none' | 'baseline' | 'pr'. A first-ever exposure is a baseline, not a
   record: there is nothing to beat yet. */
function recordKindFor(state, exId, sets){
  return recordKind(state || (typeof getState === 'function' ? getState() : null), exId, sets);
}

/* Did this session beat the previous best for this exercise?
   Kept as a boolean for callers that only need yes/no. */
function isPersonalBest(exId, sets){
  return recordKindFor(null, exId, sets) === 'pr';
}

function personalBest(exId){
  const hist = exerciseHistory(exId);
  const ex = EX_BY_ID[exId];
  if(!hist.length || !ex) return null;
  const profile = (typeof getState === 'function' ? getState().profile : null) || {};
  let best = null;
  hist.forEach(h => {
    const b = bestSetScore(workingSets(h.sets), ex, profile);
    if(!b) return;
    if(!best || b.score > best.score) best = { score: b.score, date: h.date, sets: h.sets, set: b.set, metrics: b.metrics };
  });
  return best;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { e1rm, sessionScore, recommend, roundLoad, roundLoadDown, stepFor,
                     isPersonalBest, personalBest, recordKindFor, RULES,
                     TIME_STEP_SEC, DIST_STEP_RATIO };
}
