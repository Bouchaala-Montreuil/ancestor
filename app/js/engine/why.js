/* ============================================================================
   ANCESTOR — "Why ANCESTOR recommends this"

   Every user-facing recommendation is produced by a named, versioned rule.
   A rule links to evidence records, and any change to a rule is recorded in
   RULE_CHANGELOG with its rationale and sources.

   Three distinct kinds of statement are never blurred:
     PRINCIPLE  — a general scientific finding, sourced to an evidence record
     ALGORITHM  — what this app computed, from which inputs
     OBSERVATION— something recorded in your own history
   ========================================================================== */

const RULE_KINDS = { PRINCIPLE:'principle', ALGORITHM:'algorithm', OBSERVATION:'observation' };

const RECOMMENDATION_RULES = {
  'prog.baseline': {
    id:'prog.baseline', titleKey:'rule.prog.baseline', howKey:'rule.prog.baseline.how',
    evidence:['acsm-2009-progression'], confidence:'high', version:1, updated:'2026-10-26',
    feature:'session'
  },
  'prog.increase': {
    id:'prog.increase', titleKey:'rule.prog.increase', howKey:'rule.prog.increase.how',
    evidence:['acsm-2009-progression','schoenfeld-2017-load'], confidence:'moderate', version:1, updated:'2026-10-26',
    feature:'session'
  },
  'prog.hold': {
    id:'prog.hold', titleKey:'rule.prog.hold', howKey:'rule.prog.hold.how',
    evidence:['acsm-2009-progression'], confidence:'high', version:1, updated:'2026-10-26',
    feature:'session'
  },
  'prog.reduce': {
    id:'prog.reduce', titleKey:'rule.prog.reduce', howKey:'rule.prog.reduce.how',
    evidence:['acsm-2009-progression'], confidence:'moderate', version:1, updated:'2026-10-26',
    feature:'session'
  },
  'prog.deload': {
    id:'prog.deload', titleKey:'rule.prog.deload', howKey:'rule.prog.deload.how',
    evidence:['acsm-2009-progression'], confidence:'moderate', version:1, updated:'2026-10-26',
    feature:'session'
  },
  'prog.plateau': {
    id:'prog.plateau', titleKey:'rule.prog.plateau', howKey:'rule.prog.plateau.how',
    evidence:['acsm-2009-progression'], confidence:'moderate', version:1, updated:'2026-10-26',
    feature:'session'
  },
  'prog.reentry': {
    id:'prog.reentry', titleKey:'rule.prog.reentry', howKey:'rule.prog.reentry.how',
    evidence:['acsm-2009-progression'], confidence:'moderate', version:1, updated:'2026-10-26',
    feature:'session'
  },
  'goal.repRange': {
    id:'goal.repRange', titleKey:'rule.goal.repRange', howKey:'rule.goal.repRange.how',
    evidence:['schoenfeld-2017-load'], confidence:'moderate', version:1, updated:'2026-10-26',
    feature:'programme'
  },
  'volume.tracking': {
    id:'volume.tracking', titleKey:'rule.volume.tracking', howKey:'rule.volume.tracking.how',
    evidence:['schoenfeld-2016-volume'], confidence:'moderate', version:1, updated:'2026-10-26',
    feature:'progress'
  },
  'recovery.estimate': {
    id:'recovery.estimate', titleKey:'rule.recovery.estimate', howKey:'rule.recovery.estimate.how',
    evidence:['recovery-model-note'], confidence:'low', version:1, updated:'2026-10-26',
    feature:'body'
  },
  'recovery.sleepBand': {
    id:'recovery.sleepBand', titleKey:'rule.recovery.sleepBand', howKey:'rule.recovery.sleepBand.how',
    evidence:['watson-2015-sleep'], confidence:'moderate', version:1, updated:'2026-10-26',
    feature:'home'
  },
  'decision.ladder': {
    id:'decision.ladder', titleKey:'rule.decision.ladder', howKey:'rule.decision.ladder.how',
    evidence:['recovery-model-note','watson-2015-sleep'], confidence:'low', version:1, updated:'2026-10-26',
    feature:'home'
  },
  'volume.reviewBand': {
    id:'volume.reviewBand', titleKey:'rule.volume.reviewBand', howKey:'rule.volume.reviewBand.how',
    evidence:['schoenfeld-2016-volume'], confidence:'low', version:1, updated:'2026-10-26',
    feature:'progress'
  },
  'evidence.reviewGate': {
    id:'evidence.reviewGate', titleKey:'rule.evidence.reviewGate', howKey:'rule.evidence.reviewGate.how',
    evidence:['ioannidis-2005'], confidence:'high', version:1, updated:'2026-10-26',
    feature:'science'
  }
};

/* Audit trail. Newest first. Nothing reaches users without an entry here. */
const RULE_CHANGELOG = [
  { date:'2026-10-26', ruleId:'prog.increase', from:'n/a', to:'v1',
    rationale:'Formalised the existing double-progression behaviour as a named, versioned rule so it can be cited and audited.',
    sources:['acsm-2009-progression','schoenfeld-2017-load'], reviewer:'ANCESTOR', feature:'session' },
  { date:'2026-10-26', ruleId:'decision.ladder', from:'n/a', to:'v1',
    rationale:'Recorded the severity ladder already used by the refusal engine, including the rule that a night shift alone never forces rest.',
    sources:['recovery-model-note','watson-2015-sleep'], reviewer:'ANCESTOR', feature:'home' },
  { date:'2026-10-26', ruleId:'volume.tracking', from:'n/a', to:'v1',
    rationale:'Weekly sets per muscle group surfaced as tracked context to be reviewed by the user, not as an optimum to be prescribed.',
    sources:['schoenfeld-2016-volume'], reviewer:'ANCESTOR', feature:'progress' },
  { date:'2026-10-26', ruleId:'prog.hold', from:'n/a', to:'v1',
    rationale:'Registered the hold behaviour: elapsed time is never an input to a load increase.',
    sources:['acsm-2009-progression'], reviewer:'ANCESTOR', feature:'session' },
  { date:'2026-10-26', ruleId:'prog.reduce', from:'n/a', to:'v1',
    rationale:'Registered the step-back behaviour when a session falls below the bottom of the rep range.',
    sources:['acsm-2009-progression'], reviewer:'ANCESTOR', feature:'session' },
  { date:'2026-10-26', ruleId:'prog.deload', from:'n/a', to:'v1',
    rationale:'Registered the reduction after two consecutive declines, so recovery precedes chasing load.',
    sources:['acsm-2009-progression'], reviewer:'ANCESTOR', feature:'session' },
  { date:'2026-10-26', ruleId:'prog.plateau', from:'n/a', to:'v1',
    rationale:'Registered stagnation as a review flag rather than a trigger to add weight.',
    sources:['acsm-2009-progression'], reviewer:'ANCESTOR', feature:'session' },
  { date:'2026-10-26', ruleId:'prog.reentry', from:'n/a', to:'v1',
    rationale:'Registered re-establishment after a long gap; absence is never treated as progress.',
    sources:['acsm-2009-progression'], reviewer:'ANCESTOR', feature:'session' },
  { date:'2026-10-26', ruleId:'prog.baseline', from:'n/a', to:'v1',
    rationale:'Registered that no load is prescribed without recorded history.',
    sources:['acsm-2009-progression'], reviewer:'ANCESTOR', feature:'session' },
  { date:'2026-10-26', ruleId:'goal.repRange', from:'n/a', to:'v1',
    rationale:'Registered goal-driven rep ranges with documented priority and beginner override.',
    sources:['schoenfeld-2017-load'], reviewer:'ANCESTOR', feature:'programme' },
  { date:'2026-10-26', ruleId:'recovery.estimate', from:'n/a', to:'v1',
    rationale:'Registered the recovery model and its limits so every recovery figure is traceable.',
    sources:['recovery-model-note'], reviewer:'ANCESTOR', feature:'body' },
  { date:'2026-10-26', ruleId:'recovery.sleepBand', from:'n/a', to:'v1',
    rationale:'Registered the reported-sleep comparison band as context, never as a measurement.',
    sources:['watson-2015-sleep'], reviewer:'ANCESTOR', feature:'home' },
  { date:'2026-10-26', ruleId:'volume.reviewBand', from:'n/a', to:'v1',
    rationale:'Weekly sets per muscle group are split into direct and indirect involvement and compared against review bands. Out-of-band counts raise a prompt to review, never a prescription or a diagnosis.',
    sources:['schoenfeld-2016-volume'], reviewer:'ANCESTOR', feature:'progress' },
  { date:'2026-10-26', ruleId:'evidence.reviewGate', from:'n/a', to:'v1',
    rationale:'Registered the gate separating evidence review from production deployment.',
    sources:['ioannidis-2005'], reviewer:'ANCESTOR', feature:'science' }
];

function rule(id){ return RECOMMENDATION_RULES[id] || null; }
function rulesAffectedByEvidence(evId){
  return Object.keys(RECOMMENDATION_RULES).filter(k => (RECOMMENDATION_RULES[k].evidence || []).indexOf(evId) >= 0);
}
function changelogFor(ruleId){
  return RULE_CHANGELOG.filter(c => c.ruleId === ruleId)
                       .sort((a,b) => a.date < b.date ? 1 : -1);
}

/* --------------------------------------------------------------- helpers */
function stmt(kind, text, source){
  return { kind: kind, text: text, source: source || null };
}
function ruleBlock(ruleId){
  const r = rule(ruleId);
  if(!r) return null;
  return {
    ruleId: r.id,
    title: t(r.titleKey),
    how: t(r.howKey),
    version: r.version,
    updated: r.updated,
    confidence: r.confidence,
    feature: r.feature,
    evidence: evidenceFor(r.evidence),
    changelog: changelogFor(r.id)
  };
}
/* Only reviewed, usable-quality evidence may drive a rule. */
function drivingEvidence(ruleId){
  const r = rule(ruleId);
  if(!r) return [];
  return evidenceFor(r.evidence).filter(canAffectRecommendations);
}

/* ======================================================================== */
/*  EXPLANATIONS                                                            */
/* ======================================================================== */

/* Why this load for the next set of this exercise. */
function explainProgression(state, exId, now){
  now = now || Date.now();
  const ex = EX_BY_ID[exId];
  if(!ex) return null;
  const rec = recommend(state, exId, now);
  const hist = exerciseHistory(exId);
  const ruleId = 'prog.' + (rec.kind === 'baseline' ? 'baseline'
                          : rec.kind === 'increase' ? 'increase'
                          : rec.kind === 'reduce'   ? 'reduce'
                          : rec.kind === 'deload'   ? 'deload'
                          : rec.kind === 'reentry'  ? 'reentry'
                          : rec.kind === 'plateau'  ? 'plateau' : 'hold');

  const out = {
    kind:'progression',
    rule: ruleBlock(ruleId),
    /* The target is expressed in whatever unit the exercise uses. Saying
       "0 kg" — or falling back to "first time" when there is a full history —
       is what happened when every exercise was assumed to be load x reps. */
    what: (function(){
      if(rec.kind === 'baseline') return t('why.prog.whatBaseline');
      const plain = (typeof recommendationTextPlain === 'function')
        ? recommendationTextPlain(rec, ex) : '';
      if(!plain) return t('why.prog.whatBaseline');
      if(rec.rangeUnit === 'reps' && rec.load !== null && rec.load !== undefined)
        return t('why.prog.what', { load: rec.load + ' ' + unitName(state), reps: rec.targetReps });
      return t('why.prog.whatGeneric', { target: plain });
    })(),
    goal: goalLine(state),
    history: [],
    preferences: [],
    dataUsed: [],
    reasoning: [],
    assumptions: [],
    missing: [],
    confidence: (ruleBlock(ruleId) || {}).confidence || 'low',
    alternatives: [],
    lessons: lessonsForExercise(exId),
    distinguish: []
  };

  if(hist.length){
    const last = hist[hist.length-1];
    const hb = bestSetScore(workingSets(last.sets), ex, state.profile);
    out.history.push(stmt(RULE_KINDS.OBSERVATION,
      t('why.prog.lastSession', { date: dateLabel(last.date), sets: last.sets.length,
        load: hb ? formatSet(hb.set, ex, state.profile)
                 : (Math.max.apply(null, last.sets.map(s=>+s.w||0)) + ' ' + unitName(state)) })));
    out.dataUsed.push(t('why.data.setsFor', { ex: t('ex.'+exId) }));
  } else {
    out.missing.push(t('why.missing.noHistory'));
  }
  const rng = exTargetRange(ex);
  if(rng.unit === 'reps'){
    out.dataUsed.push(t('why.data.repRange', { lo: rng.lo, hi: rng.hi }));
  } else {
    const u = (state.profile && state.profile.unit) || 'kg';
    out.dataUsed.push(t('why.data.rangeOther', { lo: rng.lo, hi: rng.hi,
      unit: rng.unit === 'time' ? t('log.unit.s') : distanceUnit(u) }));
  }
  out.dataUsed.push(t('why.data.effortTarget', { rir: ex.rir }));
  if(hist.some(h => (h.sets||[]).some(s => s && s.rir !== null && s.rir !== undefined))) out.dataUsed.push(t('why.data.rirLogged'));
  else out.missing.push(t('why.missing.noRir'));

  (rec.reasons || []).forEach(r => out.reasoning.push(stmt(RULE_KINDS.ALGORITHM, r.text)));
  out.reasoning.push(stmt(RULE_KINDS.PRINCIPLE, t('why.prog.principle'),
    'acsm-2009-progression'));

  if(rng.unit === 'reps') out.assumptions.push(t('why.assume.repRangeFits'));
  out.assumptions.push(t('why.assume.techniqueOwnJudgement'));
  out.assumptions.push(t('why.assume.sameExercise'));

  out.alternatives.push({ label:t('why.alt.holdLoad'), note:t('why.alt.holdLoad.n') });
  out.alternatives.push({ label:t('why.alt.smallJump'), note:t('why.alt.smallJump.n') });
  out.alternatives.push({ label:t('why.alt.swapExercise'), note:t('why.alt.swapExercise.n') });

  out.distinguish.push({ kind:RULE_KINDS.OBSERVATION, text:t('why.dist.observation') });
  out.distinguish.push({ kind:RULE_KINDS.ALGORITHM,  text:t('why.dist.algorithm') });
  out.distinguish.push({ kind:RULE_KINDS.PRINCIPLE,  text:t('why.dist.principle') });
  return out;
}

/* Why this training decision today. */
function explainDecision(state, exIds, now){
  now = now || Date.now();
  const d = decide(state, exIds || [], now);
  const out = {
    kind:'decision',
    rule: ruleBlock('decision.ladder'),
    what: t('decision.' + (d.state === 'train' ? 'train' : (d.state === 'light' || d.state === 'caution') ? 'modify' : 'rest')),
    goal: goalLine(state),
    history: [], preferences: [], dataUsed: [], reasoning: [],
    assumptions: [], missing: [], confidence:'low',
    alternatives: [], lessons:['sleep-recovery','training-principles'], distinguish:[]
  };

  const recent = state.sessions.slice().sort((a,b)=>b.date-a.date).slice(0,3);
  if(recent.length){
    out.history.push(stmt(RULE_KINDS.OBSERVATION,
      t('why.dec.recent', { n: recent.length, date: dateLabel(recent[0].date) })));
    out.dataUsed.push(t('why.data.sessionDates'));
  } else out.missing.push(t('why.missing.noSessions'));

  const ss = sleepStats(state.sleep, now, 7);
  if(ss.avg !== null){
    out.history.push(stmt(RULE_KINDS.OBSERVATION, t('why.dec.sleep', { h: Math.round(ss.avg*10)/10, n: ss.n })));
    out.dataUsed.push(t('why.data.reportedSleep'));
  } else out.missing.push(t('why.missing.noSleep'));

  const sh = shiftsOverlapping(state.shifts, now-7*86400000, now);
  if(sh.length){
    out.preferences.push(stmt(RULE_KINDS.OBSERVATION, t('why.dec.shifts', { n: sh.length })));
    out.dataUsed.push(t('why.data.workShifts'));
  } else out.missing.push(t('why.missing.noShifts'));

  const feel = latestFeeling();
  if(feel){
    out.preferences.push(stmt(RULE_KINDS.OBSERVATION, t('why.dec.feel')));
    out.dataUsed.push(t('why.data.reportedFeel'));
  } else out.missing.push(t('why.missing.noFeel'));

  (d.reasons||[]).forEach(r => out.reasoning.push(stmt(RULE_KINDS.ALGORITHM, r.text)));
  (d.uncertainties||[]).forEach(u => out.missing.push(u));
  out.reasoning.push(stmt(RULE_KINDS.PRINCIPLE, t('why.dec.principle'), 'watson-2015-sleep'));

  out.assumptions.push(t('why.assume.recoveryModel'));
  out.assumptions.push(t('why.assume.selfReport'));
  out.assumptions.push(t('why.assume.shiftNotRest'));

  out.alternatives.push({ label:t('why.alt.modifySession'), note:t('why.alt.modifySession.n') });
  out.alternatives.push({ label:t('why.alt.restDay'), note:t('why.alt.restDay.n') });
  out.alternatives.push({ label:t('why.alt.proceedAnyway'), note:t('why.alt.proceedAnyway.n') });

  out.distinguish.push({ kind:RULE_KINDS.OBSERVATION, text:t('why.dist.observation') });
  out.distinguish.push({ kind:RULE_KINDS.ALGORITHM,  text:t('why.dist.algorithm') });
  out.distinguish.push({ kind:RULE_KINDS.PRINCIPLE,  text:t('why.dist.principle') });
  return out;
}

/* Why this recovery figure for a muscle. */
function explainRecovery(state, muscle, now){
  now = now || Date.now();
  const r = recoveryDays(state, muscle, now);
  const out = {
    kind:'recovery',
    rule: ruleBlock('recovery.estimate'),
    what: t('mg.' + muscle),
    goal: goalLine(state),
    history: [], preferences: [], dataUsed: [], reasoning: [],
    assumptions: [], missing: [], confidence:'low',
    alternatives: [], lessons:['sleep-recovery'], distinguish:[]
  };

  if(r.since !== null){
    out.history.push(stmt(RULE_KINDS.OBSERVATION, t('why.rec.lastTrained', { d: r.since, date: dateLabel(r.last) })));
    out.dataUsed.push(t('why.data.lastExposure'));
  } else {
    out.missing.push(t('why.missing.neverTrained'));
  }
  (r.parts||[]).forEach(p => {
    out.reasoning.push(stmt(RULE_KINDS.ALGORITHM,
      t('why.rec.factor', { label: p.label, f: p.f.toFixed(2) })));
    out.dataUsed.push(p.label + (p.note ? ' (' + p.note + ')' : ''));
  });
  out.reasoning.push(stmt(RULE_KINDS.PRINCIPLE, t('why.rec.principle'), 'recovery-model-note'));
  out.assumptions.push(t('why.assume.estimateNotMeasurement'));
  out.assumptions.push(t('why.assume.boundedAdaptation'));
  if(r.observations < 3) out.missing.push(t('why.missing.fewObservations'));
  out.alternatives.push({ label:t('why.alt.trainAnyway'), note:t('why.alt.trainAnyway.n') });
  out.alternatives.push({ label:t('why.alt.reduceVolume'), note:t('why.alt.reduceVolume.n') });
  out.distinguish.push({ kind:RULE_KINDS.OBSERVATION, text:t('why.dist.observation') });
  out.distinguish.push({ kind:RULE_KINDS.ALGORITHM,  text:t('why.dist.algorithm') });
  out.distinguish.push({ kind:RULE_KINDS.PRINCIPLE,  text:t('why.dist.principle') });
  return out;
}

/* Why the volume review flags these muscle groups. */
function explainVolume(state, now){
  now = now || Date.now();
  const from = now - 7*86400000;
  const rev = volumeReview(state, from);
  const flagged = rev.filter(r => r.flag);
  const out = {
    kind:'volume',
    rule: ruleBlock('volume.reviewBand'),
    what: t('rule.volume.reviewBand'),
    goal: goalLine(state),
    history: [], preferences: [], dataUsed: [], reasoning: [],
    assumptions: [], missing: [], confidence:'low',
    alternatives: [], lessons:['training-principles','muscle-growth'], distinguish:[]
  };
  if(!state.sessions.length){
    out.missing.push(t('why.missing.noSessions'));
    return out;
  }
  rev.filter(r => r.sets > 0).forEach(r => {
    out.history.push(stmt(RULE_KINDS.OBSERVATION,
      t('why.vol.row', { muscle:t('mg.'+r.muscle), direct:(Math.round(r.directSets*10)/10).toFixed(1),
                         indirect:(Math.round(r.indirectSets*10)/10).toFixed(1) })));
  });
  flagged.forEach(r => out.reasoning.push(stmt(RULE_KINDS.ALGORITHM,
    t('why.vol.flagged', { muscle:t('mg.'+r.muscle), band:t('vol.band.'+r.band) }))));
  if(!flagged.length) out.reasoning.push(stmt(RULE_KINDS.ALGORITHM, t('why.vol.none')));
  out.reasoning.push(stmt(RULE_KINDS.PRINCIPLE, t('why.vol.principle'), 'schoenfeld-2016-volume'));
  out.dataUsed.push(t('why.data.setsWeights'));
  out.dataUsed.push(t('why.data.lastSevenDays'));
  out.assumptions.push(t('why.assume.contributionWeights'));
  out.assumptions.push(t('why.assume.bandsAreReview'));
  out.missing.push(t('why.missing.noIntensityMeasure'));
  out.alternatives.push({ label:t('why.alt.changeVolume'), note:t('why.alt.changeVolume.n') });
  out.alternatives.push({ label:t('why.alt.ignoreFlag'), note:t('why.alt.ignoreFlag.n') });
  out.distinguish.push({ kind:RULE_KINDS.OBSERVATION, text:t('why.dist.observation') });
  out.distinguish.push({ kind:RULE_KINDS.ALGORITHM,  text:t('why.dist.algorithm') });
  out.distinguish.push({ kind:RULE_KINDS.PRINCIPLE,  text:t('why.dist.principle') });
  return out;
}

/* ------------------------------------------------------------- utilities */
function unitName(state){
  return ((state && state.profile && state.profile.unit) === 'lb') ? t('c.lb') : t('c.kg');
}
function goalLine(state){
  const p = (state && state.profile) || {};
  const goals = activeGoals(p).map(g => {
    const def = GOALS.filter(x => x.id === g)[0];
    return def ? t(def.label) : g;
  });
  return goals.join(' + ');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { explainVolume, RECOMMENDATION_RULES, RULES:RECOMMENDATION_RULES, RULE_CHANGELOG, RULE_KINDS, rule, rulesAffectedByEvidence,
                     changelogFor, drivingEvidence, explainProgression, explainDecision,
                     explainRecovery, unitName, goalLine };
}
