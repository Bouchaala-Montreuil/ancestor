/* ============================================================================
   ANCESTOR — Program generator

   Builds a plan from the profile: equipment, limitations, exercises the user
   can perform, days available, session length, goal and chosen style.

   Deliberately agnostic. The low-volume high-intensity mode is offered, not
   imposed, and the app says so.
   ========================================================================== */

const STYLE = {
  hit:  { compound:{sets:1, rirAdj:-1}, isolation:{sets:1, rirAdj:-1}, restSec:180 },
  std:  { compound:{sets:3, rirAdj:0}, isolation:{sets:3, rirAdj:-1}, restSec:120 },
  min:  { compound:{sets:2, rirAdj:-1}, isolation:{sets:1, rirAdj:0}, restSec:90 },
  freq: { compound:{sets:2, rirAdj:+1}, isolation:{sets:2, rirAdj:+1}, restSec:90 }
};

const EXERCISES_BY_MINUTES = { 20:3, 35:4, 50:6, 70:7 };

/* Splits by days available. Names are translated at render time. */
const SPLITS = {
  2: [ {id:'A', key:'full', focus:['chest','back','quads','hamstrings','shoulders','biceps','triceps','abs'],
        patterns:['squat','pushH','pullH','hinge','core']},
       {id:'B', key:'full', focus:['quads','hamstrings','glutes','chest','back','shoulders','biceps','triceps','calves'],
        patterns:['hinge','pushV','pullV','squat','calf']} ],
  3: [ {id:'A', key:'push', focus:['chest','shoulders','triceps'],
        patterns:['pushH','pushV','extend','pushH']},
       {id:'B', key:'pull', focus:['back','biceps','forearms','lowerback'],
        patterns:['pullV','pullH','curl','pullH']},
       {id:'C', key:'legs', focus:['quads','hamstrings','glutes','calves','abs'],
        patterns:['squat','hinge','calf','core','squat']} ],
  4: [ {id:'A', key:'upper', focus:['chest','back','shoulders','biceps','triceps'],
        patterns:['pushH','pullV','pushV','pullH','curl']},
       {id:'B', key:'lower', focus:['quads','hamstrings','glutes','calves','abs'],
        patterns:['squat','hinge','squat','calf','core']},
       {id:'C', key:'upper', focus:['shoulders','chest','back','triceps','biceps'],
        patterns:['pushV','pullH','pushH','extend','curl']},
       {id:'D', key:'lower', focus:['hamstrings','glutes','quads','calves','lowerback'],
        patterns:['hinge','squat','hinge','calf','core']} ],
  5: [ {id:'A', key:'push', focus:['chest','shoulders','triceps'], patterns:['pushH','pushV','extend','pushH','extend']},
       {id:'B', key:'pull', focus:['back','biceps','forearms'],   patterns:['pullV','pullH','curl','pullH','curl']},
       {id:'C', key:'legs', focus:['quads','hamstrings','glutes','calves'], patterns:['squat','hinge','squat','calf','hinge']},
       {id:'D', key:'upper',focus:['back','chest','shoulders','biceps'], patterns:['pullH','pushH','pushV','pullV','curl']},
       {id:'E', key:'lower',focus:['quads','hamstrings','glutes','abs','calves'], patterns:['squat','hinge','squat','core','calf']} ],
  6: [ {id:'A', key:'push', focus:['chest','shoulders','triceps'], patterns:['pushH','pushV','extend','pushH']},
       {id:'B', key:'pull', focus:['back','biceps','forearms'],   patterns:['pullV','pullH','curl','pullH']},
       {id:'C', key:'legs', focus:['quads','hamstrings','glutes','calves'], patterns:['squat','hinge','squat','calf']},
       {id:'D', key:'push', focus:['shoulders','chest','triceps'], patterns:['pushV','pushH','extend','pushV']},
       {id:'E', key:'pull', focus:['back','biceps','lowerback'],  patterns:['pullH','pullV','curl','pullH']},
       {id:'F', key:'legs', focus:['hamstrings','glutes','quads','calves','abs'], patterns:['hinge','squat','hinge','calf','core']} ]
};

const SPLIT_NAMES = {
  A:{2:'fullA',3:'push',4:'upperA',5:'push',6:'pushA'},
  B:{2:'fullB',3:'pull',4:'lowerA',5:'pull',6:'pullA'},
  C:{2:null,   3:'legs',4:'upperB',5:'legs',6:'legsA'},
  D:{2:null,   3:null,  4:'lowerB',5:'upper',6:'pushB'},
  E:{2:null,   3:null,  4:null,    5:'lower',6:'pullB'},
  F:{2:null,   3:null,  4:null,    5:null,   6:'legsB'}
};

function sessionName(id, days){
  /* A session name is a heading on every workout screen and on the printed
     sheet, so it is assembled in the reader's language like every other word
     around it. These used to be English literals — only "Full body" went
     through t(), and even that key did not exist yet, so the plan header read
     "Push" over an Arabic session and "Full body A" over a French one.
     The A/B suffixes stay Latin: they label two sessions, they are not words. */
  const key = (SPLIT_NAMES[id]||{})[days];
  if (key) {
    const k = 'prog.' + key, v = t(k);
    if (v !== k && v !== '') return v;
    return key.charAt(0).toUpperCase() + key.slice(1);   /* never a raw key */
  }
  const k = 'prog.session', v = t(k);
  return (v !== k && v !== '' ? v : 'Session') + ' ' + id;
}

/* ---------- training focus -------------------------------------------
   The programme answers two different questions: what is being trained
   (goals) and what is being emphasised (focus). Until now only the first
   existed, so every plan was the same plan wearing different rep ranges.

   The rules here are deliberately small and legible, because a programme a
   person cannot explain to themselves is a programme they will abandon:
     1. A session whose focus already covers a prioritised muscle keeps it at
        the front of its focus list, so pickForPattern() picks it first.
     2. A session that does NOT cover a prioritised muscle gets one extra
        movement for it, if the session length has room.
     3. Nothing is ever removed. Emphasis adds attention; it never subtracts
        coverage, which is what keeps a glute block from becoming a leg curl
        competition.
   ---------------------------------------------------------------------- */
const EMPHASIS_MAX_EXTRA_SESSIONS = 2;

/* Which muscles this emphasis prioritises, in the profile's own words. */
function focusMuscles(profile){
  if(typeof emphasisMuscles === 'function') return emphasisMuscles(profile);
  const e = (profile && profile.emphasis) || 'balanced';
  if(e === 'lower')  return ['quads','hamstrings','glutes','calves'];
  if(e === 'glutes') return ['glutes','hamstrings','quads'];
  if(e === 'upper')  return ['chest','back','shoulders','biceps','triceps'];
  return [];
}

/* Movement patterns that train a muscle group, most specific first. */
const MUSCLE_PATTERNS = {
  glutes:     ['hinge','squat'],
  hamstrings: ['hinge'],
  quads:      ['squat'],
  calves:     ['calf'],
  chest:      ['pushH','pushV'],
  back:       ['pullH','pullV'],
  lowerback:  ['hinge'],
  shoulders:  ['pushV','pushH'],
  biceps:     ['curl'],
  triceps:    ['extend'],
  forearms:   ['curl'],
  abs:        ['core']
};

function patternsForMuscles(muscles){
  const out = [];
  (muscles || []).forEach(m => (MUSCLE_PATTERNS[m] || []).forEach(p => {
    if(out.indexOf(p) < 0) out.push(p);
  }));
  return out;
}

/* A session covers a muscle if the muscle is in its focus or in the primary
   mover of one of its movements. */
function sessionCovers(sess, muscle){
  if((sess.focus || []).indexOf(muscle) >= 0) return true;
  return (sess.exercises || []).some(e => {
    const ex = EX_BY_ID[e.id];
    return ex && ex.m && ex.m.some(([m]) => m === muscle);
  });
}

/* A plain-language account of what the focus did to the plan, so the screens
   can say it rather than leaving the user to infer it from the exercise list. */
function emphasisSummary(plan, profile){
  const p = profile || {};
  const e = p.emphasis || 'balanced';
  const focus = focusMuscles(p);
  if(e === 'balanced' || !focus.length) return { key:'plan.focusBalanced', muscles:[] };
  const covered = (plan.sessions || []).filter(s => focus.some(m => sessionCovers(s, m))).length;
  return {
    key: 'plan.focus' + e.charAt(0).toUpperCase() + e.slice(1),
    muscles: focus,
    sessions: covered,
    total: (plan.sessions || []).length
  };
}

/* ---------- candidate pool ---------- */
/* One source of truth for every automatic candidate AND a readable account
   of why a deliberately browsed exercise is outside the current choices. */
function exerciseFilterReasons(ex, profile){
  if(!ex) return [];
  const p = profile || {};
  const eq = EQUIP_SETS[p.equipment] || equipmentFor(p);
  const envEq = (p.environment && p.environment !== 'gym') ? equipmentFor(p) : null;
  const reasons = [];
  if(eq.indexOf(ex.equip) < 0 || (envEq && envEq.indexOf(ex.equip) < 0)) reasons.push('exercise.filterEquipment');
  if((ex.avoid || []).some(tag => (p.limits || []).indexOf(tag) >= 0)) reasons.push('exercise.filterLimit');
  if(p.exercises && p.exercises[ex.id] === false) reasons.push('exercise.filterExcluded');
  return reasons.concat(exclusionReasons(ex, p));
}
function allowedExercises(profile){
  return EX.filter(ex => exerciseFilterReasons(ex, profile).length === 0);
}

/* Scoring bonus so the pool favours exercises matching the user's stated
   goals and adaptations. A preference, never an exclusion. */
function goalBonus(ex, profile){
  const p = profile || {};
  const g = activeGoals(p);
  const needs = p.needs || {};
  const cat = ex.cat || [], acc = ex.acc || [];
  let bonus = 0;
  /* Training focus. Weighted above the goal nudges below because it is the
     answer to "which movement in this pattern", not "whether to train". */
  const focus = focusMuscles(p);
  if(focus.length){
    /* Weighted by how much of the movement is the asked-for muscle, and by how
       high that muscle is in the focus list. This only ever breaks ties BETWEEN
       movements of the same kind (see the type weight in pickForPattern): a
       share on its own rewards isolation, because isolation exists to put almost
       all of the work on one muscle, and that is not what "emphasise glutes"
       means at the top of a session. */
    let best = 0;
    focus.forEach((m, i) => {
      const hit = (ex.m || []).filter(([mm]) => mm === m)[0];
      if(hit) best = Math.max(best, hit[1] * (14 - i * 3));
    });
    bonus += best;
  }
  if(g.indexOf('m') >= 0 && cat.indexOf('mobility') >= 0)    bonus += 3;
  if(g.indexOf('b') >= 0 && cat.indexOf('balance')  >= 0)    bonus += 3;
  if(g.indexOf('f') >= 0 && cat.indexOf('functional') >= 0) bonus += 2;
  if(g.indexOf('e') >= 0 && ex.type === 'isolation')        bonus += 1;
  if(needs.lowImpactOnly && acc.indexOf('lowImpact') >= 0)  bonus += 3;
  if(needs.seatedOnly     && acc.indexOf('seated')    >= 0) bonus += 3;
  if(needs.wheelchair     && acc.indexOf('wheelchair')>= 0) bonus += 3;
  return bonus;
}

function pickForPattern(pool, pattern, used, focus, profile, avoid){
  const ban = avoid || used;
  const isBonusSlot = !!(avoid && avoid.length);
  const cands = pool.filter(e => e.pat === pattern && used.indexOf(e.id) < 0 && ban.indexOf(e.id) < 0);
  if(!cands.length) return null;
  /* Kind first, preference second.
       prime slot — a compound, because the first movement of a pattern is the
       one that carries the session;
       bonus slot — a movement whose PRIME mover is the muscle being topped up,
       preferring an isolation when one exists.
     Both ×10 terms exist because without them the focus share outvoted the
     kind, and a glute block opened with leg extensions; and a leg curl (prime
     mover: hamstrings) won a glute top-up because it was the only isolation in
     the hinge pattern. */
  const target = isBonusSlot ? focus[0] : null;
  const primeIsTarget = e => !!target && e.m && e.m[0] && e.m[0][0] === target;
  const score = e => isBonusSlot
      ? (primeIsTarget(e) ? 10 : 0)
        + (e.type === 'isolation' ? 2 : 0)
        + goalBonus(e, profile)
      : 10 * (e.type === 'compound' ? 1 : 0)
        + (focus.indexOf(e.m[0][0]) >= 0 ? 2 : 0)
        + goalBonus(e, profile);
  cands.sort((a,b) => score(b) - score(a));
  return cands[0];
}

function setsFor(ex, profile){
  const st = STYLE[profile.style] || STYLE.std;
  const base = ex.type === 'compound' ? st.compound : st.isolation;
  let sets = base.sets, rir = Math.max(0, ex.rir + base.rirAdj);
  const gp = activeGoals(profile);
  if(gp.indexOf('s') >= 0){ rir = Math.max(rir, 2); }        // strength: keep reps crisp
  if(gp.indexOf('h') >= 0 && ex.type === 'isolation'){ rir = Math.max(0, rir - 1); }
  // Beginner guard runs LAST: a novice is never taken near failure, whatever
  // the goal says. (It previously ran first and the goal line undid it.)
  if(profile.experience === 'b'){ sets = Math.min(sets, 2); rir = Math.max(rir, 2); }
  if(ex.cat && ex.cat.indexOf('mobility') >= 0 && ex.type !== 'compound'){ rir = Math.max(rir, 3); }
  /* Goal-driven ranges only override the exercise's own range where the goal
     clearly implies one. An exercise's rep range already encodes its purpose.
     Priority: strength > endurance > mobility/balance. */
  const g = activeGoals(profile);
  let bias = null;
  if(g.indexOf('s') >= 0)                              bias = {lo:4,  hi:7,  rir:2};
  else if(g.indexOf('e') >= 0)                         bias = {lo:15, hi:25, rir:1};
  else if(g.indexOf('m') >= 0 || g.indexOf('b') >= 0)  bias = {lo:10, hi:20, rir:3};
  return { sets: sets, rir: rir, bias: bias };
}

function restFor(profile){
  const st = STYLE[profile.style] || STYLE.std;
  return st.restSec;
}

/* ---------- build ---------- */
function buildPlan(profile){
  const days = Math.max(2, Math.min(6, +profile.daysPerWeek || 3));
  const split = SPLITS[days] || SPLITS[3];
  const pool = allowedExercises(profile);
  const count = EXERCISES_BY_MINUTES[profile.sessionMinutes] || 5;
  const rest = restFor(profile);

  const focus = focusMuscles(profile);
  /* An exercise already used this week is not prescribed again — that is how a
     glute block turns into five hip hinges and two chest movements. `weeklyUsed`
     is plan-wide, so the check is "has the week seen this?", not "this session". */
  const weeklyUsed = [];
  let extrasLeft = focus.length ? EMPHASIS_MAX_EXTRA_SESSIONS : 0;

  const sessions = split.map(s => {
    const used = [];
    const list = [];
    /* Focus ordering: a session that already trains a prioritised muscle names
       it first, so the prime slot goes to it. A session that trains none of the
       prioritised muscles may gain ONE movement for them, on at most two
       sessions in the week, and never one the week has already used. */
    /* The top-up targets the ONE muscle asked for first, not the whole list:
       "one extra movement for glutes" is a sentence a person can check, while
       "one extra movement for whichever of four muscles this session lacks" is
       how a push day ended up with a leg curl on it. */
    const uncovered = focus.slice(0, 1).filter(m => (s.focus || []).indexOf(m) < 0);
    let extraPat = null;
    if(uncovered.length && count < 7 && extrasLeft > 0){
      const pats = patternsForMuscles(uncovered);
      for(let i2 = 0; i2 < pats.length && !extraPat; i2++){
        const ok = pool.some(e => e.pat === pats[i2] && weeklyUsed.indexOf(e.id) < 0 &&
                                  used.indexOf(e.id) < 0);
        if(ok) extraPat = pats[i2];
      }
    }
    if(extraPat) extrasLeft--;
    const patterns = extraPat ? s.patterns.concat([extraPat]) : s.patterns.slice();
    const limit = patterns.length > s.patterns.length ? count + 1 : count;
    const orderedFocus = focus.filter(m => (s.focus || []).indexOf(m) >= 0)
                              .concat(s.focus || []);
    for(let i=0;i<limit;i++){
      const pat = patterns[i % patterns.length];
      /* The emphasis slot is the only one that refuses a repeat: the rest of the
         session keeps the old behaviour, where a pattern may come round twice. */
      const avoid = (extraPat && i >= patterns.length - 1) ? weeklyUsed : null;
      /* The top-up slot is scored against the one muscle it exists for, so it
         cannot be won by a different member of the focus list. */
      const focusArg = avoid ? [focus[0]]
                             : (orderedFocus.length ? orderedFocus : s.focus);
      let ex = pickForPattern(pool, pat, used, focusArg, profile, avoid);
      if(!ex){
        // fall back to anything unused that touches the focus
        ex = pool.filter(e => used.indexOf(e.id) < 0 && e.m.some(([m]) => (s.focus || []).indexOf(m) >= 0))
                 .sort((a,b)=> (b.type==='compound'?1:0) - (a.type==='compound'?1:0))[0] || null;
      }
      if(!ex) break;
      used.push(ex.id);
      weeklyUsed.push(ex.id);
      const cfg = setsFor(ex, profile);
      /* A goal bias of "4-7 reps" is meaningless for a 40-second hold or a
         40-metre carry: the exercise's own range is already expressed in the
         unit it is measured in. The EFFORT part of the bias applies to every
         unit though — a mobility goal keeps effort low whether the work is
         counted in reps, seconds or metres. */
      const unit = exTargetRange(ex).unit;
      const reps = (cfg.bias && unit === 'reps') ? [cfg.bias.lo, cfg.bias.hi] : ex.reps.slice();
      const rir  = cfg.bias ? Math.max(cfg.rir, cfg.bias.rir) : cfg.rir;
      list.push({ id: ex.id, sets: cfg.sets, reps: reps, rir: rir });
    }
    return { id: s.id, name: sessionName(s.id, days), focus: s.focus, exercises: list };
  });

  /* If accessibility filtering emptied the pool, report it rather than
     silently returning a plan that ignores the user's needs. */
  let unfiltered = pool.length;
  try {
    const saved = profile.needs; profile.needs = {};
    unfiltered = allowedExercises(profile).length;
    profile.needs = saved;
  } catch(e){}

  return {
    mode: profile.style || 'std',
    split: days,
    restSec: rest,
    /* What the plan was asked to emphasise, and the muscles that came out of
       it. Stored on the plan so a rebuilt profile can be compared against the
       plan actually in hand — that comparison is what lets the settings screen
       say "rebuild to apply" instead of guessing. */
    emphasis: profile.emphasis || 'balanced',
    priorities: (profile.priorities || []).slice(),
    focusMuscles: focus,
    builtAt: Date.now(),
    sessions: sessions,
    poolSize: pool.length,
    adaptationNote: (pool.length === 0 && unfiltered > 0) ? 'a11y.poolEmpty' : null
  };
}

function sessionInvolvedMuscles(sess){
  const seen = {};
  (sess && sess.focus || []).forEach(m => { seen[m] = 1; });
  (sess && sess.exercises || []).forEach(e => {
    const ex = EX_BY_ID[e.id];
    if(ex && ex.m) ex.m.forEach(([m]) => { seen[m] = 1; });
  });
  return Object.keys(seen);
}

/* Which session comes next? Rotate, but prefer the one whose muscles are
   most recovered, so a missed day does not force you into an unrecovered
   session just because the calendar says so. */
function nextSession(state, now){
  const plan = state.plan;
  if(!plan || !plan.sessions || !plan.sessions.length) return null;
  const rec = allRecovery(state, now);
  const lastBySession = {};
  state.sessions.forEach(s => { if(s.planId) lastBySession[s.planId] = Math.max(lastBySession[s.planId]||0, s.date); });

  let best = null;
  plan.sessions.forEach(s => {
    let worst = 1, limiting = null;
    sessionInvolvedMuscles(s).forEach(m => { if(rec[m] && rec[m].ratio < worst){ worst = rec[m].ratio; limiting = m; } });
    const lastDone = lastBySession[s.id] || 0;
    // prefer recovered, and among those the one not done most recently
    const score = worst*1000 - (lastDone ? 1/Math.max(1,(now-lastDone)/86400000) : 0);
    if(!best || score > best.score) best = { session: s, score: score, ratio: worst, limiting: limiting };
  });
  return best;
}

/* Authored alternatives followed by same-pattern candidates, all filtered. */
function substitutesFor(profile, exId){
  const ex = EX_BY_ID[exId]; if(!ex) return [];
  const allowed = new Set(allowedExercises(profile || {}).map(e => e.id));
  const ids = [exId].concat(ex.subs || []);
  // Keep the authored ordering, then related movement patterns, but apply the
  // exact same preferences as plan generation to both groups.
  EX.forEach(e => { if(e.pat === ex.pat && ids.indexOf(e.id) < 0) ids.push(e.id); });
  return ids.filter(id => id !== exId && allowed.has(id)).map(id => EX_BY_ID[id]);
}

/* A set of 10 reps takes roughly 8 seconds a rep; a hold takes its own
   duration; a carry is walked at about 1.2 m/s. Multiplying a hold range by
   eight is what produced a "17 minute" plank session. */
function setSecondsEstimate(e){
  const ex = EX_BY_ID[e.id];
  const range = exTargetRange(ex);
  if(range.unit === 'time')     return range.hi;
  if(range.unit === 'distance') return Math.round(range.hi / 1.2);
  return range.hi * 8;
}
function estimatedMinutes(session, restSec){
  if(!session) return 0;
  let sec = 0;
  session.exercises.forEach(e => {
    const per = setSecondsEstimate(e);
    if(exTargetRange(EX_BY_ID[e.id]).unit === 'time') sec += 30;   // brief setup
    else sec += 2*45;                                              // two warm-up sets
    for(let i=0;i<e.sets;i++) sec += per + restSec;
  });
  return Math.round(sec/60);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildPlan, nextSession, substitutesFor, allowedExercises, exerciseFilterReasons, setsFor, estimatedMinutes, STYLE, SPLITS,
                     setSecondsEstimate, volumePartiallyUnknown };
}


/* ============================================================================
   Weekly volume accounting, split into direct and indirect involvement.

   Sets are counted per muscle using each exercise's contribution weights, so
   a set contributes a fraction of a set to every muscle it involves. The
   primary muscle receives the DIRECT share; every other muscle receives an
   INDIRECT share.

   Bands below are for REVIEW, not prescription. Evidence links set counts to
   average hypertrophy at the group level with wide individual variation, so a
   low or high count is a prompt to look, never a diagnosis.
   ========================================================================== */
const VOLUME_BANDS = [
  { id:'none',     min:0,          max:0,          flag:null },
  { id:'low',      min:0.0001,     max:4,          flag:'gap'    },
  { id:'typical',  min:4,          max:10,         flag:null     },
  { id:'high',     min:10,         max:20,         flag:null     },
  { id:'veryHigh', min:20,         max:Infinity,   flag:'excess' }
];

function volumeBandFor(sets){
  if(!sets || sets <= 0) return VOLUME_BANDS[0];      // 'none' — never fall through
  for(let i = 0; i < VOLUME_BANDS.length; i++){
    const b = VOLUME_BANDS[i];
    if(sets >= b.min && sets < b.max) return b;
  }
  return VOLUME_BANDS[VOLUME_BANDS.length - 1];
}

/* Weighted per-muscle accounting over a window. `from` is a timestamp. */
function muscleVolume(state, from){
  const out = {};
  MUSCLES.forEach(m => {
    out[m] = { sets:0, directSets:0, indirectSets:0,
               load:0, directLoad:0, indirectLoad:0,
               counted:0, uncounted:0 };
  });
  (state.sessions || []).forEach(sess => {
    if(from && sess.date < from) return;
    (sess.exercises || []).forEach(e => {
      const ex = EX_BY_ID[e.id];
      if(!ex) return;
      const sets = (e.sets || []).filter(x => x && !x.skipped);
      if(!sets.length) return;
      /* Load volume only exists when the exercise is actually loaded with a
         known weight. A plank contributes sets and no load volume; pretending
         it contributes zero kilograms makes a bodyweight block look empty. */
      const vol = setsVolume(sets, ex, state.profile);
      const n   = sets.length;
      const primary = ex.m[0][0];
      ex.m.forEach(([m,w]) => {
        if(!out[m]) return;
        const ds = n * w, dl = (vol === null ? 0 : vol * w);
        out[m].sets += ds;
        out[m].load += dl;
        if(vol === null) out[m].uncounted += ds; else out[m].counted += ds;
        if(m === primary){ out[m].directSets += ds; out[m].directLoad += dl; }
        else            { out[m].indirectSets += ds; out[m].indirectLoad += dl; }
      });
    });
  });
  return out;
}

/* True when some of the recorded work has no meaningful load volume, so the
   interface can say so instead of printing a smaller number as if it were
   the whole picture. */
function volumePartiallyUnknown(state, from){
  const mv = muscleVolume(state, from);
  return MUSCLES.some(m => mv[m].uncounted > 0);
}

/* Backwards-compatible flat totals (used by older callers and tests). */
function volumeByMuscle(state, from){
  const mv = muscleVolume(state, from);
  const out = {};
  Object.keys(mv).forEach(m => out[m] = mv[m].load);
  return out;
}

/* Per-muscle review rows: counts, split, band and whether anything is worth
   a second look. Never stated as a judgement about the user's body. */
function volumeReview(state, from){
  const mv = muscleVolume(state, from);
  return MUSCLES.map(m => {
    const v = mv[m];
    const band = volumeBandFor(v.sets);
    return {
      muscle: m,
      sets: v.sets,
      directSets: v.directSets,
      indirectSets: v.indirectSets,
      load: v.load,
      volumeKnown: v.counted > 0,
      volumePartial: v.counted > 0 && v.uncounted > 0,
      band: band.id,
      flag: band.flag
    };
  });
}
