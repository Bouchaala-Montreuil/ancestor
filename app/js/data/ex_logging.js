/* ============================================================================
   ANCESTOR — exercise-aware logging model

   ONE definition of "what a set of this exercise actually is".

   Before this module every set was assumed to be {load, reps}. That is true
   for a barbell bench press and false for a plank, a set of push-ups, an
   assisted pull-up or a loaded carry. Forcing every movement through the same
   two fields produced nonsense: a bodyweight set could not be saved without
   inventing a load, a hold was counted in repetitions, and assistance was
   silently added to the load as if the user had lifted it.

   The rules that follow are the single source of truth. The session screen,
   the validation, the volume accounting, the progression engine, the personal
   records and the history editor all read from here. No screen decides for
   itself which fields an exercise has.

   ---------------------------------------------------------------------------
   MODES
   ---------------------------------------------------------------------------
   load        externally loaded resistance      required: load, reps
   weighted    bodyweight + ADDED external load  required: reps  optional: load
   bodyweight  bodyweight only                   required: reps  optional: load
   assisted    bodyweight MINUS assistance       required: reps  optional: assist
   timed       static hold / time-based work     required: time  optional: load
   distance    loaded carry / cardio             required: distance  optional: time

   ---------------------------------------------------------------------------
   LOADS — three different things, never conflated
   ---------------------------------------------------------------------------
   external    the weight on the bar. Volume = load x reps.
   added       weight ADDED to the user's own body. "40 kg" means +40 kg.
   assist      weight REMOVED from the user's own body. Never a lifted load.
               Assistance is stored in `a`, never in `w`, and it is never
               added to any volume, PR or load figure.

   Total system load (body + added) is only computed when the user has
   actually recorded a bodyweight. Otherwise the app reports repetitions and
   says why it is not reporting a load. It never guesses.
   ========================================================================== */

const SET_MODES = {
  load:       { axis:'load',     loadRole:'external', require:['load','reps'],     optional:['rir'] },
  weighted:   { axis:'load',     loadRole:'added',    require:['reps'],            optional:['load','rir'] },
  bodyweight: { axis:'reps',     loadRole:'added',    require:['reps'],            optional:['load','rir'] },
  assisted:   { axis:'assist',   loadRole:'assist',   require:['reps'],            optional:['assist','rir'] },
  timed:      { axis:'time',     loadRole:'added',    require:['time'],            optional:['load','rir'] },
  distance:   { axis:'distance', loadRole:'external', require:['distance'],        optional:['time','rir'] }
};

/* Default mode by equipment. Bars, machines, cables and bands are loaded.
   Anything done with the body alone is bodyweight until told otherwise. */
const MODE_BY_EQUIP = {
  barbell:'load', dumbbell:'load', machine:'load', cable:'load',
  band:'load', bodyweight:'bodyweight'
};

/* Explicit overrides. Only movements whose nature the equipment cannot express. */
const MODE_OVERRIDES = {
  'dead-hang':      'timed',       // a hang is held for seconds, not counted in reps
  'balance-stand':  'timed',       // a balance hold is held for seconds
  'plank':          'timed',
  'side-plank':     'timed',
  'hollow-hold':    'timed',
  'wall-sit':       'timed',
  'farmer-carry':   'distance',
  'sled-push':      'distance',
  'row-erg':        'distance',
  'bike-erg':       'distance',
  'run-interval':   'distance',
  'assisted-pullup':'assisted',
  'assisted-dip':   'assisted',
  'weighted-pullup':'weighted',
  'weighted-dip':   'weighted'
};

/* Movements performed one limb at a time. Logging stays per set, but the
   interface stops implying both sides share the number. */
const UNILATERAL = ['bulgarian-split','lunge','step-up','seated-leg-ext',
                    'side-plank','heel-slide'];

/* Field catalogue: label key, unit, input type, step. Order drives layout. */
const SET_FIELDS = {
  load:     { key:'load',  labelKey:'log.load',   input:'number', step:'any',    attr:'w' },
  added:    { key:'added', labelKey:'log.added',  input:'number', step:'any',    attr:'w' },
  assist:   { key:'assist',labelKey:'log.assist', input:'number', step:'any',    attr:'a' },
  reps:     { key:'reps',  labelKey:'session.reps', input:'number', step:'1',    attr:'r' },
  time:     { key:'time',  labelKey:'log.time',   input:'number', step:'1',      attr:'t' },
  distance: { key:'distance',labelKey:'log.dist', input:'number', step:'any',    attr:'d' },
  rir:      { key:'rir',   labelKey:'session.rir', input:'number', step:'1',    attr:'rir' }
};

/* ------------------------------------------------------------------ spec */
function exMode(ex){
  if(!ex) return 'load';
  if(MODE_OVERRIDES[ex.id]) return MODE_OVERRIDES[ex.id];
  if(ex.mode && SET_MODES[ex.mode]) return ex.mode;
  return MODE_BY_EQUIP[ex.equip] || 'load';
}

/* The resolved logging contract for one exercise. Pure, no side effects. */
function exLogSpec(ex){
  const mode = exMode(ex);
  const def  = SET_MODES[mode];
  const role = def.loadRole;
  const fields = def.require.map(k => {
    const f = SET_FIELDS[role === 'added' && k === 'load' ? 'added'
            : role === 'assist' && k === 'load' ? 'assist' : k];
    return f;
  });
  const optional = def.optional.map(k => {
    const f = SET_FIELDS[role === 'added' && k === 'load' ? 'added'
            : role === 'assist' && k === 'load' ? 'assist' : k];
    return f;
  }).filter(Boolean);
  return {
    mode: mode,
    axis: def.axis,
    loadRole: role,
    fields: fields,
    optional: optional,
    hasLoad:   role !== 'assist' && (fields.concat(optional)
                 .some(f => f && (f.key === 'load' || f.key === 'added'))),
    hasAssist: role === 'assist',
    hasReps:   fields.concat(optional).some(f => f && f.key === 'reps'),
    hasTime:   fields.concat(optional).some(f => f && f.key === 'time'),
    hasDistance: fields.concat(optional).some(f => f && f.key === 'distance'),
    unilateral: UNILATERAL.indexOf(ex.id) >= 0,
    increments: (INCREMENT && INCREMENT[ex.equip]) || null
  };
}

function isUnilateral(ex){ return UNILATERAL.indexOf(ex && ex.id) >= 0; }

/* ------------------------------------------------------------ target range
   Repetitions are only one possible target. A hold is targeted in seconds, a
   carry in metres. `reps` is NOT reused for those: a second is not a
   repetition and a metre is not a repetition, and reusing the field is what
   made the app ask for "20-60 reps" of a dead hang.
   Returns { lo, hi, unit } where unit is 'reps' | 'time' | 'distance'. */
function exTargetRange(ex){
  if(!ex) return { lo:8, hi:12, unit:'reps' };
  const mode = exMode(ex);
  if(mode === 'timed')    return { lo:(ex.hold || ex.reps)[0],  hi:(ex.hold || ex.reps)[1],  unit:'time' };
  if(mode === 'distance') return { lo:(ex.dist || ex.reps)[0],  hi:(ex.dist || ex.reps)[1],  unit:'distance' };
  return { lo:ex.reps[0], hi:ex.reps[1], unit:'reps' };
}

/* A blank record for this exercise, with every field the mode requires. */
function blankSet(){
  return { w:'', r:'', t:'', d:'', a:'', rir:'', skipped:false, committed:false, warmup:false };
}

/* -------------------------------------------------------------- reading */
function num(v){
  if(v === null || v === undefined || v === '') return null;
  const n = +v;
  return isFinite(n) ? n : null;
}

/* Sets that were actually performed. Warm-ups are logged but never counted. */
function loggedSets(sets){ return (sets||[]).filter(s => s && !s.skipped); }
function workingSets(sets){ return (sets||[]).filter(s => s && !s.skipped && !s.warmup); }
function countedSets(sets, ex){
  // timed and distance work has no meaningful "set" concept for volume review:
  // one logged entry is one effort. Everything else counts working sets only.
  if(ex && exLogSpec(ex).mode === 'timed') return loggedSets(sets);
  if(ex && exLogSpec(ex).mode === 'distance') return loggedSets(sets);
  return workingSets(sets);
}

/* Is this set ready to be logged? Mode decides, not the screen. */
function isSetComplete(set, ex){
  if(!set || set.skipped) return false;
  const spec = exLogSpec(ex);
  if(spec.hasReps   && !(num(set.r) > 0)) return false;
  if(spec.hasTime   && spec.fields.some(f => f.key === 'time')     && !(num(set.t) > 0)) return false;
  if(spec.hasDistance && spec.fields.some(f => f.key === 'distance') && !(num(set.d) > 0)) return false;
  const needsLoad = spec.fields.some(f => f.key === 'load');
  if(needsLoad && num(set.w) === null) return false;
  if(needsLoad && num(set.w) < 0) return false;
  return true;
}

/* Which field is missing — used to explain a refusal instead of just failing. */
function missingFields(set, ex){
  const out = [];
  const spec = exLogSpec(ex);
  if(spec.hasReps && spec.fields.some(f => f.key === 'reps') && !(num(set.r) > 0)) out.push('reps');
  if(spec.fields.some(f => f.key === 'time') && !(num(set.t) > 0)) out.push('time');
  if(spec.fields.some(f => f.key === 'distance') && !(num(set.d) > 0)) out.push('distance');
  if(spec.fields.some(f => f.key === 'load') && num(set.w) === null) out.push(spec.loadRole);
  return out;
}

/* ------------------------------------------------------------- measuring */
function bodyweightOf(profile){
  const bw = profile ? num(profile.bodyweight) : null;
  return (bw !== null && bw > 0) ? bw : null;
}

/* Everything one set means, in comparable numbers.
   `null` means "not applicable / not known" and is never rendered as zero. */
function setMetrics(set, ex, profile){
  const spec = exLogSpec(ex);
  const w = num(set && set.w), r = num(set && set.r);
  const t = num(set && set.t), d = num(set && set.d), a = num(set && set.a);
  const bw = bodyweightOf(profile);
  const m = {
    reps: spec.hasReps ? (r !== null && r > 0 ? r : null) : null,
    seconds: t !== null && t > 0 ? t : null,
    distance: d !== null && d > 0 ? d : null,
    load: null,        // external or added load exactly as entered
    assistance: spec.hasAssist ? (a !== null && a >= 0 ? a : null) : null,
    systemLoad: null,  // bodyweight + added, only when bodyweight is known
    volume: null,      // load x reps, only when a real lifted load exists
    score: null,       // one monotone number, comparable for THIS exercise
    basis: null
  };

  if(spec.loadRole === 'external'){
    m.load = (w !== null && w >= 0) ? w : null;
    if(m.load !== null && m.reps !== null && m.reps > 0){
      m.volume = m.load * m.reps;
      m.score  = e1rm(m.load, m.reps);
      m.basis  = 'e1rm';
    }
  } else if(spec.loadRole === 'added'){
    m.load = (w !== null && w >= 0) ? w : null;
    if(bw !== null && m.reps !== null && m.reps > 0){
      m.systemLoad = bw + (m.load || 0);
      m.volume = m.systemLoad * m.reps;
      m.score  = e1rm(m.systemLoad, m.reps);
      m.basis  = 'e1rm';
    } else if(m.reps !== null && m.reps > 0){
      // No bodyweight recorded: report repetitions and say so. Never invent a load.
      m.score = m.reps;
      m.basis = 'reps';
    } else if(m.seconds !== null && spec.axis === 'time'){
      m.score = m.seconds;
      m.basis = 'time';
    }
  } else if(spec.loadRole === 'assist'){
    // Assistance is not lifted. The rank rewards LESS assistance, then more reps.
    if(m.reps !== null && m.reps > 0){
      m.score = m.reps * 1000 - (m.assistance || 0);
      m.basis = 'assist';
    }
  }

  if(spec.axis === 'time' && m.seconds !== null && (m.basis === null || m.basis === 'time')){
    m.score = m.seconds; m.basis = 'time';
    if(m.load !== null && m.load > 0){                 // weighted hold: load breaks ties
      m.score = m.seconds + m.load;
      m.basis = 'timeLoad';
    }
  }
  if(spec.axis === 'distance' && m.distance !== null){
    m.volume = (m.load !== null && m.load > 0) ? m.load * m.distance : null;
    m.score = m.distance;
    m.basis = 'distance';
  }
  return m;
}

/* Best comparable effort in a list of sets, or null. */
function bestSetScore(sets, ex, profile){
  let best = null, bs = null;
  (sets||[]).forEach(s => {
    if(!s || s.skipped || s.warmup) return;
    const m = setMetrics(s, ex, profile);
    if(m.score === null) return;
    if(best === null || m.score > best){ best = m.score; bs = s; }
  });
  return bs ? { set: bs, score: best, metrics: setMetrics(bs, ex, profile) } : null;
}

/* Load-volume for a whole set list. Returns null when the exercise has no
   meaningful load volume at all (holds, carries, unweighted bodyweight
   without a recorded bodyweight) so callers can say "not applicable". */
function setsVolume(sets, ex, profile){
  let total = null;
  countedSets(sets, ex).forEach(s => {
    const m = setMetrics(s, ex, profile);
    if(m.volume === null) return;
    total = (total === null ? 0 : total) + m.volume;
  });
  return total;
}

/* ---------------------------------------------------------- presentation */
function fmtLoad(v, unit){ return (v === null || v === undefined) ? '—' : (Math.round(v*100)/100) + ' ' + unit; }

/* Human-readable one-line summary of a set, in the exercise's own terms. */
function formatSet(set, ex, profile){
  if(!set) return '—';
  if(set.skipped) return t('log.skippedShort');
  const spec = exLogSpec(ex);
  const unit = (profile && profile.unit) || 'kg';
  const m = setMetrics(set, ex, profile);
  const bits = [];
  if(spec.hasAssist && m.assistance !== null) bits.push('−' + fmtLoad(m.assistance, unit) + ' ' + t('log.assistShort'));
  else if(m.load !== null && m.load > 0 && spec.loadRole === 'added') bits.push('+' + fmtLoad(m.load, unit));
  else if(m.load !== null && spec.loadRole !== 'added') bits.push(fmtLoad(m.load, unit));
  if(set.rL != null && set.rR != null && set.rL !== '' && set.rR !== '' && +set.rL !== +set.rR){
    bits.push('L ' + (+set.rL) + ' / R ' + (+set.rR) + ' ' + t('log.repsShort'));
  } else if(m.reps !== null){
    bits.push(m.reps + ' ' + t('log.repsShort'));
  }
  if(set.tL != null && set.tR != null && set.tL !== '' && set.tR !== '' && +set.tL !== +set.tR){
    bits.push('L ' + formatDuration(+set.tL) + ' / R ' + formatDuration(+set.tR));
  } else if(m.seconds !== null){
    bits.push(formatDuration(m.seconds));
  }
  if(m.distance !== null) bits.push(formatDistance(m.distance, unit));
  if(set.warmup) bits.push('(' + t('log.warmupShort') + ')');
  return bits.join(' · ') || '—';
}

function formatDuration(sec){
  if(sec === null || sec === undefined) return '—';
  const s = Math.round(sec);
  if(s < 60) return s + ' ' + t('log.unit.s');
  const m = Math.floor(s/60), r = s % 60;
  return r ? m + ' ' + t('log.unit.min') + ' ' + r + ' ' + t('log.unit.s')
           : m + ' ' + t('log.unit.min');
}
/* Distance is ALWAYS stored in metres; only the display unit follows the
   user's preference. A loaded carry is 20-60 m, which is 0.02 km — readable
   in metres, useless in kilometres. */
const FT_PER_M = 3.28084;
function formatDistance(metres, unit){
  if(metres === null || metres === undefined) return '—';
  return (Math.round(toDisplayDistance(metres, unit)*10)/10) + ' ' + distanceUnit(unit);
}
function distanceUnit(unit){ return unit === 'lb' ? t('log.unit.ft') : t('log.unit.m'); }
function toDisplayDistance(m, unit){ return unit === 'lb' ? m * FT_PER_M : m; }
function fromDisplayDistance(v, unit){ return unit === 'lb' ? v / FT_PER_M : v; }

/* ------------------------------------------------------------- history */
/* The last time this exercise was performed, strictly before `before`.
   Returns null when there is none — never a fabricated placeholder. */
function previousPerformance(state, exId, before){
  const s = getState ? (state || getState()) : state;
  const ex = EX_BY_ID[exId];
  const rows = exerciseHistory(exId).filter(h => (before === undefined || h.date < before));
  if(!rows.length || !ex) return null;
  const row = rows[rows.length-1];
  const best = bestSetScore(row.sets, ex, s.profile);
  return {
    date: row.date,
    sets: workingSets(row.sets).length,
    best: best,
    text: best ? formatSet(best.set, ex, s.profile) : null
  };
}

/* --------------------------------------------------------------- records */
/* A first exposure is a BASELINE, not a record. A record needs something to
   beat. Returning 'pr' on the first session made the app congratulate users
   for simply turning up. */
function recordKind(state, exId, sets){
  const ex = EX_BY_ID[exId];
  if(!ex) return 'none';
  const hist = exerciseHistory(exId);
  const cur = bestSetScore(workingSets(sets), ex, (state && state.profile) || null);
  if(!cur) return 'none';
  if(hist.length <= 1) return 'baseline';
  const prev = hist.slice(0, -1).reduce((a, h) => {
    const b = bestSetScore(workingSets(h.sets), ex, (state && state.profile) || null);
    return b && b.score > a ? b.score : a;
  }, -Infinity);
  if(!isFinite(prev)) return 'baseline';
  return cur.score > prev ? 'pr' : 'none';
}

/* ---------------------------------------------------------------- export */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SET_MODES, MODE_BY_EQUIP, MODE_OVERRIDES, UNILATERAL, SET_FIELDS,
    exMode, exLogSpec, isUnilateral, blankSet, num,
    loggedSets, workingSets, countedSets, isSetComplete, missingFields,
    bodyweightOf, setMetrics, bestSetScore, setsVolume,
    formatSet, formatDuration, formatDistance, distanceUnit,
    toDisplayDistance, fromDisplayDistance,
    previousPerformance, recordKind, exTargetRange
  };
}
