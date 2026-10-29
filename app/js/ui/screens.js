/* ============================================================================
   ANCESTOR — Screens (Performance Lab)
   Five sections: Today · Session · Body · Progress · Profile
   ========================================================================== */

const DRAFT_KEY = 'ancestor.draft.v1';

let ACTIVE = null;        // live session being logged
let BODY_SIDE = 'front';
let BODY_SEL = null;      // selected muscle group
let BODY_ZOOM = false;
let BODY_MODE = 'model';  // 'model' = real 3D anatomy, 'flat' = 2D figure
/* Set when the 3D model could not be mounted at all (no WebGL, download failed,
   runtime missing). It is a STATE, not an event: the flat figure takes over, and
   this keeps a visible, dismissable-by-fixing note until a model actually
   mounts. It used to be a toast, which meant the explanation was gone four
   seconds later and the user was left in flat mode with no idea why. */
let BODY_FALLBACK = null;
let BODY_LAYER = 'all';   // 'all' | 'superficial' | 'deep'
let BODY_REGION = 'all';  // 'all' | model region key
let LAB_STRUCT = null;    // the individual mesh selected in 3D, if any
let REST = null;
let PROG_EX = null;
let PROG_PERIOD = 90;
let PROG_METRIC = 'primary'; // 'primary' | 'e1rm' | 'sets' | 'volume'
let LAST_SUMMARY = null;

/* Screen registry: one entry per primary section, plus the onboarding flow. */
const Screens = {};

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function $(s){ return document.querySelector(s); }
function $$(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
function unit(){ return (getState().profile && getState().profile.unit) || 'kg'; }

/* Map the engine's internal ladder onto the three displayed recommendations.
   'stop' renders as REST plus a hard safety notice. */
function displayState(k){
  if(k === 'train') return 'train';
  if(k === 'light' || k === 'caution') return 'modify';
  return 'rest';
}
const STATE_WHY = {
  train:'decision.trainWhy', modify:'decision.modifyWhy', rest:'decision.restWhy'
};

/* ===================================================================== */
/*  COMPUTED HELPERS                                                      */
/* ===================================================================== */

/* Load volume for a whole session, summed over the exercises that HAVE a load
   volume. Returns null when none of them do, so the interface can say "not
   applicable" instead of printing 0 kg. */
/* The cost of the session, in a language's own plurals. Each noun is its own
   key and the parts are joined, so "1 lift · 2 sets" and "1 lift · 1 set" are
   both right without the app owning a plural engine. */
function sessionCostLine(n, s, m){
  return [
    n === 1 ? t('home.costLifts1') : t('home.costLifts', { n: n }),
    s === 1 ? t('home.costSets1') : t('home.costSets', { s: s }),
    t('home.costMins', { m: m })
  ].join(' · ');
}

function sessionTotalVolume(sess, state){
  let total = null, any = false;
  (sess.exercises||[]).forEach(e => {
    const ex = EX_BY_ID[e.id]; if(!ex) return;
    const v = setsVolume(e.sets || [], ex, (state && state.profile) || (getState().profile));
    if(v === null) return;
    any = true;
    total = (total === null ? 0 : total) + v;
  });
  return any ? total : null;
}

/* One chart point per session for one exercise, on that exercise's own axis.
   Previously it required a positive LOAD, which meant a bodyweight exercise
   or a timed hold produced an empty chart even with months of history. */
function sessionSeries(state, exId, from){
  const ex = EX_BY_ID[exId];
  const profile = state.profile || {};
  const rows = [];
  if(!ex) return rows;
  state.sessions.filter(s => s.date >= from).sort((a,b)=>a.date-b.date).forEach(s => {
    const e = (s.exercises||[]).filter(x => x.id === exId)[0];
    if(!e) return;
    const b = bestSetScore(workingSets(e.sets), ex, profile);
    if(!b) return;
    rows.push({ label: dateLabel(s.date), v: chartValue(b, ex), best: false,
                text: formatSet(b.set, ex, profile) });
  });
  if(rows.length){
    const mx = rows.reduce((a,r) => r.v > a.v ? r : a, rows[0]);
    mx.best = true;
  }
  return rows;
}

/* What the y-axis means, per exercise mode. The chart title says it too. */
function chartValue(b, ex){
  const m = b.metrics;
  const spec = exLogSpec(ex);
  if(spec.axis === 'time')     return m.seconds;
  if(spec.axis === 'distance') return m.distance;
  if(spec.axis === 'assist')   return m.assistance;
  if(spec.loadRole === 'added' && m.systemLoad !== null) return m.systemLoad;
  if(m.load !== null) return m.load;
  return m.reps === null ? 0 : m.reps;
}
function chartUnit(ex, u){
  const spec = exLogSpec(ex);
  if(spec.axis === 'time')     return t('log.unit.s');
  if(spec.axis === 'distance') return distanceUnit(u);
  if(spec.axis === 'assist')   return u + ' ' + t('log.assistShort');
  return u;
}
function chartLabelKey(ex){
  const spec = exLogSpec(ex);
  if(spec.axis === 'time')     return 'log.time';
  if(spec.axis === 'distance') return 'log.dist';
  if(spec.axis === 'assist')   return 'log.assist';
  if(spec.loadRole === 'added')return 'log.added';
  return 'c.load';
}
/* The basis line under a chart: tells the user what the number actually is. */
function chartBasisKey(ex, profile){
  const spec = exLogSpec(ex);
  if(spec.axis === 'time')     return 'log.basis.time';
  if(spec.axis === 'distance') return 'log.basis.distance';
  if(spec.axis === 'assist')   return 'log.basis.assist';
  if(spec.loadRole === 'added' && !bodyweightOf(profile)) return 'log.basis.reps';
  return 'log.basis.e1rm';
}

/* ===================================================================== */
/*  TODAY                                                                  */
/* ===================================================================== */
Screens.home = function(){
  const s = getState(), p = s.profile, now = Date.now();
  const next = nextSession(s, now);
  const ids = next ? next.session.exercises.map(e => e.id) : [];
  const d = decide(s, ids, now);
  const shown = displayState(d.state);
  const weekAgo = now - 7*86400000;
  const thisWeek = s.sessions.filter(x => x.date >= weekAgo).length;
  const last = s.sessions.length ? s.sessions.slice().sort((a,b)=>b.date-a.date)[0] : null;
  const hasData = s.sessions.length > 0;
  const weekly = weeklySetTotals(s, now);
  const spark  = volumeSparkline(s, 8);
  const insight = contextualInsight(s, now, d);

  let h = '';

  /* 1. Architectural Masthead */
  h += '<div class="masthead masthead-today"><div>' +
       '<p class="masthead-idx">' + esc(greetingFor(now)) + (p.name ? ' · ' + esc(p.name) : '') +
       ' · ' + esc(dateLabel(now)) + '</p>' +
       '<h1 class="masthead-title">' + esc(heroLine(s, d, shown, next, now)) + '</h1>' +
       '<p class="masthead-sub">' + esc(stateBody(d.state)) + '</p></div>' +
       '</div>';

  /* Asymmetric 2-Column Studio Bento Grid */
  h += '<div class="bento-home">';

  /* ==================== LEFT COLUMN ==================== */
  h += '<div class="bento-col">';
  h += bandHead(t('home.bandToday'));

  /* 2. Readiness Verdict + Next Session Blueprint */
  h += '<div class="decision s-' + shown + '"><div class="bar"></div><div class="inner">';
  h += '<div class="top"><div class="grow">';
  h += '<p class="eyebrow">' + esc(t('decision.label')) + '</p>';
  h += '<div class="dec-state">' + esc(t('decision.' + shown)) + '</div>';
  h += '</div>';
  h += readinessMeter(ids.length ? d.ratio : null, null, {showDef:false, ring:true});
  h += '</div>';
  /* The caveat that makes the number honest: an estimate of elapsed time, not a
     measurement of tissue. It stays on the screen, one tap down, instead of
     sitting under the meter on every visit — and it is its own line *under* the
     verdict row, because as a third child of that row its summary competed with
     the verdict word for the same 300 px and the two printed on top of each
     other at 390 px. */
  h += '<details class="dis inline readiness-def mt-2"><summary><span class="dis-t">' +
       esc(t('readiness.title')) + '</span></summary>' +
       '<p class="body-sm mt-2 mb-0">' + esc(t('readiness.definition')) + '</p></details>';

  if(d.reasons.length){
    h += '<div class="factors">';
    d.reasons.forEach(r => {
      h += '<div class="factor ' + r.tone + '"><span class="dot"></span>' +
           '<span class="txt">' + esc(r.text) + '</span></div>';
    });
    h += '</div>';
  }
  if(d.state === 'stop') h += '<div class="safety">' + esc(t('feel.stop')) + '</div>';

  /* Next Workout Blueprint Strip right inside the decision card */
  if(next && next.session && (next.session.exercises || []).length){
    const lifts = next.session.exercises;
    const sets = lifts.reduce((a, e) => a + (+e.sets || 0), 0);
    const mins = estimatedMinutes(next.session, (s.plan && s.plan.restSec) || 120);
    /* The programme is printed on the plan screen. Here the glance is what the
       session costs — movements, sets, minutes — and the lifts themselves wait
       behind one line, because six pills repeating "3×5–12 reps" is the plan
       again, not the decision. */
    h += '<div class="next-blueprint"><div class="next-blueprint-hd">' +
         '<span class="eyebrow">' + esc(t('home.nextSession')) + ': <b>' + esc(next.session.name) + '</b></span>' +
         '<span class="hint">' + esc(sessionCostLine(lifts.length, sets, mins)) + '</span></div>' +
         '<div class="next-ex-pills">' +
         lifts.slice(0, 2).map(e =>
           '<span class="next-ex-pill">' + esc(t('ex.' + e.id)) + ' · ' + esc(numExpr(e.sets + '×' + targetRangeText(EX_BY_ID[e.id]))) + '</span>'
         ).join('') +
         (lifts.length > 2
           ? '<details class="next-ex-more"><summary>' + esc(t('home.moreLifts', { n: lifts.length - 2 })) +
             '</summary><div class="next-ex-pills">' +
             lifts.slice(2).map(e =>
               '<span class="next-ex-pill">' + esc(t('ex.' + e.id)) + ' · ' + esc(numExpr(e.sets + '×' + targetRangeText(EX_BY_ID[e.id]))) + '</span>'
             ).join('') + '</div></details>'
           : '') +
         '</div></div>';
  }

  /* One dominant action. Everything a returning lifter might want is still one
     tap away, but it waits behind a disclosure instead of competing for the
     thumb: seven equal buttons is the same as no instruction. */
  h += '<div class="dash-actions">';
  if(ACTIVE){
    h += '<button class="btn" data-act="go" data-a1="session">' + esc(t('plan.resumeLive')) + '</button>';
  } else if(d.state === 'stop'){
    /* The estimate says rest. The only useful action is to change what it reads. */
    h += '<button class="btn" data-act="go" data-a1="profile">' + esc(t('home.correct')) + '</button>';
  } else if(shown === 'rest'){
    h += '<button class="btn" data-act="openSheet" data-a1="sleep">' + esc(t('home.logsleep')) + '</button>';
    h += '<button class="btn secondary" data-act="startSession">' + esc(t('btn.start')) + '</button>';
  } else if(next){
    h += '<button class="btn" data-act="startSession">' +
         esc(t('home.startNext', { name: next.session.name })) + '</button>';
  }
  h += '<button class="btn quiet" data-act="setSessionSubGo" data-a1="plan">' + esc(t('plan.tabPlan')) + '</button>';
  h += '</div>';
  h += '<details class="dis"><summary><span class="dis-t">' + esc(t('home.moreWays')) +
       '</span></summary><div class="row mt-2">';
  h += '<button class="btn quiet sm" data-act="openAnalysis">' + esc(t('home.analysis')) + '</button>';
  /* The paper is one tap from the answer: print the session the verdict is
     about, not whichever day happens to be selected in the planner. */
  h += '<button class="btn quiet sm" data-act="openPrintCard"' +
       (next ? ' data-a1="' + next.session.id + '"' : '') + '>' + esc(t('pa.button')) + '</button>';
  h += '<button class="btn quiet sm" data-act="openWhy" data-a1="decision">' + esc(t('sci.whyOpen')) + '</button>';
  if(d.state === 'stop' && !ACTIVE){
    h += '<button class="btn quiet sm" data-act="go" data-a1="profile">' + esc(t('home.correct')) + '</button>';
  }
  h += '</div></details>';
  h += '</div></div>';

  /* The page answers three questions in three bands. It used to answer nine,
     in the order the data happened to exist. */
  h += bandHead(t('home.bandWeek'));
  /* 3. Training Progress Sparkline */
  h += '<div><div class="sect mt-0"><h3 class="title">' + esc(t('home.progressTitle')) +
       '</h3><span class="rule"></span></div>';
  h += '<div class="panel dash-progress">';
  h += '<div class="dash-bignum">';
  h += '<div class="k">' + esc(t('home.weeklySets')) + '</div>';
  h += '<div class="v num" id="dashWeekly" data-value="' + (weekly.sets || 0) +
       '" data-num-key="home.weeklySets" data-num-to="' + (weekly.sets || 0) + '" data-num-dec="1">' +
       (weekly.sets || 0) + '</div>';
  h += '<div class="d">' + esc(weekly.sets
        ? t('home.weeklySetsDelta', { n: weekly.sets, groups: weekly.groupsTrained })
        : t('home.noSetsYet')) + '</div>';
  h += '</div>';
  h += '<div class="dash-spark">';
  if(spark.points.length >= 2){
    h += sparkline(spark.points, { label: t('home.sparkLabel'), unit: t('home.sparkUnit') });
  } else {
    h += '<div class="dash-spark-empty">' + esc(t('home.sparkEmpty')) + '</div>';
  }
  h += '</div></div></div>';

  /* 5. Muscle-Group Coverage Matrix */
  h += '<div><div class="sect mt-0"><h3 class="title">' + esc(t('home.coverageTitle')) +
       '</h3><span class="rule"></span>' +
       '<span class="aside">' + esc(t('home.coverageNote')) + '</span></div>';
  h += '<div class="panel">' + coverageBars(s, now) + '</div></div>';

  /* 4. Weekly Activity & Metrics — the band's lead panel, so it carries no
     second heading saying "This week" under a band that already says it. */
  h += '<div>';
  h += '<div class="panel">';
  const targetDays = Math.max(1, +p.daysPerWeek || 3);
  const weekGoalMet = thisWeek >= targetDays;
  const miles = trainingMilestones(s, now);
  const milesEarned = miles.filter(m => m.earned).length;
  h += '<div class="dash-week">';
  h += progressRing(Math.min(1, thisWeek / targetDays),
                    { r: 22, stroke: 4, ringKey: 'home.week', label: t('home.weekTitle') });
  h += '<div class="dash-week-num"><span class="num" data-num-key="home.thisWeek" data-num-to="' +
       thisWeek + '">' + thisWeek + '</span>' +
       '<span class="d">' + esc(t('home.ofPlanned', { n: p.daysPerWeek })) + '</span></div>';
  h += '<div class="dash-week-track">';
  for(let i=6;i>=0;i--){
    const dayStart = bioDayStart(now - i*86400000, p.usualWake != null ? p.usualWake : 4);
    const n = s.sessions.filter(x => x.date >= dayStart && x.date < dayStart + 86400000).length;
    h += '<div class="day ' + (n ? 'on' : '') + '" title="' + esc(dateLabel(dayStart)) + '">' +
         '<i style="height:' + (n ? Math.min(100, 30 + n*35) : 0) + '%"></i>' +
         '<span class="sr-only">' + esc(dateLabel(dayStart)) + ': ' + n + ' ' +
         esc(t('progress.sessions')) + '</span></div>';
  }
  h += '</div></div>';
  if(weekGoalMet || milesEarned > 0){
    h += '<div class="chips mb-3">' +
         (weekGoalMet ? '<span class="flag ok">' + esc(t('mile.weeklyGoal')) + '</span>' : '') +
         '<button type="button" class="flag plain tap" data-act="go" data-a1="progress">' +
           esc(t('mile.title')) + ': ' + numExpr(milesEarned + '/' + miles.length) + '</button>' +
         '</div>';
  }
  const nextPct = next
    ? Math.max(0, next.ratio < 1 ? Math.min(95, Math.round(next.ratio*100/5)*5) : Math.min(100, Math.round(next.ratio*100/5)*5))
    : null;
  h += metricsBlock([
    { k:t('home.lastSession'), v: last ? dateLabel(last.date) : '—',
      d: last ? (last.name||'') : esc(t('state.nodata')), tip: t('tip.lastSession') },
    { k:t('body.trend'), v: trendGlyph(overallTrend(s, 21, now)),
      d: esc(hasData ? t('trend.' + overallTrend(s, 21, now)) : t('state.nodata')), tip: t('tip.trend') },
    { k:t('home.nextSession'), v: next ? esc(next.session.name) : '—',
      d: nextPct !== null ? nextPct + '% ' + esc(t('readiness.label')) : '', tip: t('tip.nextSession') },
    { k:t('profile.sleepLog'), v: sleepSummary(s, now), d: esc(t('home.sleepNote')), tip: t('tip.sleep') }
  ]);
  h += '</div></div>';

  /* 7. Bio-Timeline & Quick Logs */
  h += '<div><div class="sect mt-0"><h3 class="title">' + esc(t('home.timeline')) +
       '</h3><span class="rule"></span></div>';
  h += '<div class="panel">' + timelineStrip(s, now) +
       '<div class="mt-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">' +
       '<button class="btn quiet sm" data-act="openSheet" data-a1="sleep">' + esc(t('home.logsleep')) + '</button>' +
       '<button class="btn quiet sm" data-act="openSheet" data-a1="shift">' + esc(t('home.logshift')) + '</button>' +
       '<button class="btn quiet sm" data-act="openSheet" data-a1="feel">' + esc(t('home.logfeel')) + '</button>' +
       '</div></div></div>';

  h += '</div>'; /* end left bento-col */

  /* ==================== RIGHT COLUMN ==================== */
  h += '<div class="bento-col">';
  h += bandHead(t('home.bandUnderstand'));

  /* 6. Contextual Lab Insight */
  h += '<div><div class="sect mt-0"><h3 class="title">' + esc(t('home.insightTitle')) +
       '</h3><span class="rule"></span></div>';
  h += '<div class="panel dash-insight">';
  h += '<p class="eyebrow">' + esc(t(insight.basisKey)) + '</p>';
  h += '<p class="dash-insight-t">' + esc(insight.text) + '</p>';
  /* The caveat is the honest part, so it stays — one line down, behind the
     question it answers, instead of forty words of hedging every visit. */
  h += '<details class="dis dash-insight-why"><summary><span class="dis-t">' +
       esc(t('home.howToRead')) + '</span></summary>' +
       '<p class="body-sm mt-2 mb-0">' + esc(insight.because) + '</p></details>';
  if(insight.action) h += '<div class="row mt-3">' + insight.action + '</div>';
  h += '</div></div>';

  /* 8. Anatomy & Science Launchpad */
  const recMap = allRecovery(s, now);
  const readyCount = MUSCLES.filter(m => !recMap[m] || recMap[m].state === 'ready' || recMap[m].state === 'fresh').length;
  h += '<div><div class="sect mt-0"><h3 class="title">' + esc(t('home.map')) +
       '</h3><span class="rule"></span>' +
       '<span class="aside"><button class="chip sm" data-act="go" data-a1="body">' + esc(t('lab.open')) + '</button></span></div>';
  h += '<div class="panel dash-figlink">' +
       '<div class="fig-stage bare">' +
       '<div class="dash-fig-duo">' +
         '<div class="fig-wrap">' + anatomyFigure(s, {side:'front', now:now, pointerOnly:true}) +
           '<span class="dash-fig-cap">' + esc(t('body.front')) + '</span></div>' +
         '<div class="fig-wrap">' + anatomyFigure(s, {side:'back', now:now, pointerOnly:true}) +
           '<span class="dash-fig-cap">' + esc(t('body.back')) + '</span></div>' +
       '</div></div>' +
       '<div class="row between mt-2">' +
         '<button type="button" class="link-btn" data-act="go" data-a1="body">' +
         esc(t('home.mapCta')) + '</button>' +
         '<span class="flag sm ok">' + numExpr(readyCount + ' / ' + MUSCLES.length) + ' ' + esc(t('mst.ready')) + '</span>' +
       '</div></div></div>';

  /* Learn carries the card for the next lesson, and the hub itself as a link:
     Science left the bottom bar, and a destination that can only be reached by
     reading one lesson first is not reachable. */
  h += '<div><div class="sect mt-0"><h3 class="title">' + esc(t('home.learnTitle')) +
       '</h3><span class="rule"></span>' +
       '<span class="aside"><button type="button" class="link-btn" data-act="go" data-a1="science">' +
       esc(t('sci.title')) + ' \u2192</button></span></div>' + nextLessonCard(s) + '</div>';

  h += '</div>'; /* end right bento-col */
  h += '</div>'; /* end bento-home */

  return { html: h };
};

function bandHead(label){
  return '<h2 class="band-h">' + esc(label) + '</h2>';
}

/* --------------------------------------------------------- dashboard pieces
   Every number below is derived from the session log. Nothing is synthesised
   to make a screen look populated; where there is no data the section says so.
   ------------------------------------------------------------------------ */

function greetingFor(now){
  const hr = new Date(now).getHours();
  if(hr < 5)  return t('home.greetNight');
  if(hr < 12) return t('home.greetMorning');
  if(hr < 18) return t('home.greetAfternoon');
  return t('home.greetEvening');
}

function heroLine(s, d, shown, next, now){
  if(!s.sessions.length) return t('home.heroFirst');
  if(d.state === 'stop') return t('home.heroStop');
  if(shown === 'rest')   return t('home.heroRest');
  if(shown === 'modify' && next) return t('home.heroModify', { name: next.session.name });
  if(next)               return t('home.heroNext', { name: next.session.name });
  return t('home.heroNoPlan');
}

/* Verifiable training milestones derived strictly from recorded user data.
   Never invented, never reset on missed days, never shames absence. */
function trainingMilestones(state, now){
  const s = state || getState();
  const tNow = now || Date.now();
  const p = s.profile || {};
  const sessCount = (s.sessions || []).length;
  const exSeen = {};
  const musclesSeen = {};
  (s.sessions || []).forEach(sess => {
    (sess.exercises || []).forEach(e => {
      const ex = EX_BY_ID[e.id];
      if(!ex) return;
      if(workingSets(e.sets).length > 0){
        exSeen[e.id] = 1;
        (ex.m || []).forEach(([m]) => { musclesSeen[m] = 1; });
      }
    });
  });
  const baseCount = Object.keys(exSeen).length;
  const muscCount = Object.keys(musclesSeen).length;
  const prTotal = Object.keys(exSeen).filter(id => {
    const h = exerciseHistory(id);
    if(h.length < 2) return false;
    const pb = personalBest(id);
    const first = bestSetScore(workingSets(h[0].sets), EX_BY_ID[id], p);
    return pb && first && pb.score > first.score;
  }).length;
  const targetDays = Math.max(1, +p.daysPerWeek || 3);
  const thisWeek = (s.sessions || []).filter(x => x.date >= tNow - 7*86400000).length;

  return [
    { id:'first-session', cur: Math.min(1, sessCount), max: 1,  earned: sessCount >= 1,
      titleKey:'mile.firstSession', descKey:'mile.firstSession.d' },
    { id:'calibrated',    cur: Math.min(4, baseCount), max: 4,  earned: baseCount >= 4,
      titleKey:'mile.calibrated',   descKey:'mile.calibrated.d' },
    { id:'first-pr',      cur: Math.min(1, prTotal),   max: 1,  earned: prTotal >= 1,
      titleKey:'mile.firstPr',      descKey:'mile.firstPr.d' },
    { id:'weekly-goal',   cur: Math.min(targetDays, thisWeek), max: targetDays, earned: thisWeek >= targetDays,
      titleKey:'mile.weeklyGoal',   descKey:'mile.weeklyGoal.d' },
    { id:'full-coverage', cur: Math.min(12, muscCount),max: 12, earned: muscCount >= 12,
      titleKey:'mile.fullCoverage', descKey:'mile.fullCoverage.d' },
    { id:'ten-sessions',  cur: Math.min(10, sessCount),max: 10, earned: sessCount >= 10,
      titleKey:'mile.tenSessions',  descKey:'mile.tenSessions.d' }
  ];
}

function milestonesPanel(state, now){
  const list = trainingMilestones(state, now);
  const earned = list.filter(m => m.earned).length;
  let h = '<div class="sect"><h2 class="sub">' + esc(t('mile.title')) + '</h2><span class="rule"></span>' +
          '<span class="aside">' + numExpr(earned + ' / ' + list.length) + '</span></div>';
  h += '<div class="mile-grid" data-stagger>';
  list.forEach(m => {
    const pct = m.max > 0 ? Math.round(m.cur / m.max * 100) : 0;
    h += '<div class="mile-card ' + (m.earned ? 'earned' : 'locked') + '">' +
         '<div><div class="row nowrap between row-1 mb-1">' +
           '<span class="mile-card-t">' + esc(t(m.titleKey)) + '</span>' +
           '<span class="flag sm ' + (m.earned ? 'ok' : 'plain') + '">' + numExpr(m.cur + '/' + m.max) + '</span></div>' +
         '<p class="hint">' + esc(t(m.descKey)) + '</p></div>' +
         '<div class="mile-bar"><i style="width:' + pct + '%"></i></div></div>';
  });
  h += '</div>';
  return h;
}

function trendGlyph(k){
  return k === 'up' ? '\u2191' : k === 'down' ? '\u2193' : k === 'flat' ? '\u2192' : '—';
}

function sleepSummary(s, now){
  const ss = sleepStats(s.sleep, now, 7);
  return ss.avg !== null ? (Math.round(ss.avg*10)/10) + ' h' : '—';
}

/* Weekly working-set totals per muscle group, straight from the log. */
function weeklySetTotals(state, now){
  const from = now - 7*86400000;
  const review = volumeReview(state, from);
  let total = 0, trained = 0;
  review.forEach(r => {
    if(r.sets > 0){ total += r.sets; trained++; }
  });
  return { sets: Math.round(total*10)/10, groupsTrained: trained,
           total: total, review: review };
}

/* One point per session: total working sets in that session. */
function volumeSparkline(state, count){
  const rows = state.sessions.slice().sort((a,b)=>a.date-b.date).slice(-count);
  const points = rows.map(sess => {
    let sets = 0;
    (sess.exercises||[]).forEach(e => {
      const ex = EX_BY_ID[e.id];
      sets += workingSets(e.sets).length;
    });
    return { label: dateLabel(sess.date), v: sets };
  }).filter(p => p.v > 0);
  return { points: points };
}

/* Muscle coverage bars. Rendered even when empty: an explained empty state is
   more useful than a blank panel, and it never invents a number. */
function coverageBars(state, now){
  const review = weeklySetTotals(state, now).review;
  const max = review.reduce((a,r) => Math.max(a, r.sets), 0);
  if(!max){
    return '<div class="uncertain"><b>' + esc(t('home.coverageEmpty')) + '</b> ' +
           esc(t('home.coverageEmptyBody')) + '</div>';
  }
  let h = '<div class="coverage">';
  review.forEach(r => {
    const pct = Math.round(r.sets / max * 100);
    const flag = r.flag === 'gap' ? 'gap' : r.flag === 'excess' ? 'excess' : '';
    h += '<div class="cov-row' + (flag ? ' ' + flag : '') + '">' +
         '<span class="cov-n">' + esc(t('mg.' + r.muscle)) + '</span>' +
         '<span class="cov-t"><i style="width:' + pct + '%"></i></span>' +
         '<span class="cov-v num">' + (Math.round(r.sets*10)/10) + '</span>' +
         '<span class="sr-only">' + esc(t('home.coverageSr',
            { muscle: t('mg.' + r.muscle), sets: (Math.round(r.sets*10)/10), band: t('vol.' + r.band) })) +
         '</span></div>';
  });
  h += '</div>';
  /* The method note explains how the bars are counted and what they are not.
     It matters, so it stays — behind the same one-tap line the insight uses. */
  h += '<details class="dis mt-3"><summary><span class="dis-t">' +
       esc(t('home.howToRead')) + '</span></summary>' +
       '<p class="hint mt-2 mb-0">' + esc(t('home.coverageHint')) + '</p></details>';
  return h;
}

/* One insight, chosen by what the data actually shows, always with the reason.
   The basis label tells the user whether this is something their log recorded
   or something the app computed. */
function contextualInsight(state, now, decision){
  const week = weeklySetTotals(state, now);

  if(!state.sessions.length){
    return { basisKey:'sci.algorithm', text: t('home.insightEmpty'),
             because: t('home.insightEmptyBody'),
             action: '<button class="btn" data-act="go" data-a1="session">' + esc(t('progress.start')) + '</button>' };
  }
  /* a group trained far less than the others */
  const trained = week.review.filter(r => r.sets > 0);
  if(trained.length >= 3){
    const sorted = trained.slice().sort((a,b) => a.sets - b.sets);
    const lowest = sorted[0], highest = sorted[sorted.length-1];
    if(highest.sets > 0 && lowest.sets < highest.sets * 0.4){
      return { basisKey:'sci.observation',
               text: t('home.insightGap', { muscle: t('mg.' + lowest.muscle),
                                            low: Math.round(lowest.sets*10)/10,
                                            high: Math.round(highest.sets*10)/10,
                                            other: t('mg.' + highest.muscle) }),
               because: t('home.insightGapBody'),
               action: '<button class="btn quiet" data-act="go" data-a1="body">' +
                       esc(t('home.insightGapCta')) + '</button>' };
    }
  }
  /* stagnation: no new record anywhere recently */
  const recent = state.sessions.filter(x => x.date >= now - 21*86400000);
  if(recent.length >= 4){
    const exIds = [];
    recent.forEach(x => (x.exercises||[]).forEach(e => { if(exIds.indexOf(e.id) < 0) exIds.push(e.id); }));
    const anyRecord = exIds.some(id => {
      const hist = exerciseHistory(id);
      if(hist.length < 2) return false;
      const lastRow = hist[hist.length-1];
      return lastRow.date >= now - 21*86400000 &&
        recordKind(state, id, lastRow.sets, { excludeRow: lastRow }) === 'pr';
    });
    if(!anyRecord){
      return { basisKey:'sci.algorithm', text: t('home.insightFlat'),
               because: t('home.insightFlatBody'),
               action: '<button class="btn quiet" data-act="openWhy" data-a1="progression" data-a2="' +
                       exIds[0] + '">' + esc(t('sci.whyOpen')) + '</button>' };
    }
  }
  /* recovery-driven */
  if(decision && decision.state === 'rest'){
    return { basisKey:'sci.algorithm', text: t('home.insightRest'),
             because: t('home.insightRestBody'), action: '' };
  }
  return { basisKey:'sci.observation',
           text: t('home.insightSteady', { n: state.sessions.length,
                                           sets: Math.round(week.sets*10)/10 }),
           because: t('home.insightSteadyBody'), action: '' };
}

/* The lesson the user has not read yet, or the one most relevant to them. */
function nextLessonCard(state){
  const read = (state.science && state.science.read) || [];
  const pool = LESSONS.filter(l => read.indexOf(l.id) < 0);
  const l = pool[0] || LESSONS[0];
  if(!l) return '';
  let h = '<button class="panel dash-lesson" data-act="openLesson" data-a1="' + l.id + '">';
  h += '<p class="eyebrow">' + esc(t('sci.nextLesson')) + '</p>';
  h += '<h3 class="sub mb-0 mt-2">' + esc(t(l.titleKey)) + '</h3>';
  h += '<p class="body-sm mb-0">' + esc(t(l.summaryKey)) + '</p>';
  const cat = (SCIENCE_CATEGORIES || []).filter(c => c.id === l.cat)[0];
  h += '<div class="chips mt-3">' +
       (cat ? '<span class="flag plain">' + esc(t(cat.label)) + '</span>' : '') +
       '<span class="flag plain">' + esc(t('sci.minutes')) + ' ' + (l.mins || 5) + '</span>' +
       '</div>';
  h += '</button>';
  return h;
}

/* ---------- detailed analysis sheet ---------- */
function openAnalysis(){
  const s = getState(), now = Date.now();
  const next = nextSession(s, now);
  const ids = next ? next.session.exercises.map(e => e.id) : [];
  const d = decide(s, ids, now);
  const ss = sleepStats(s.sleep, now, 7);
  const recent = s.sessions.slice().sort((a,b)=>b.date-a.date).slice(0,3);
  const shifts7 = shiftsOverlapping(s.shifts, now-7*86400000, now);
  const nights = shifts7.filter(x => isNightShift(x)).length;

  let rows = '';
  const add = (k, v) => { rows += '<div class="factor"><span class="dot"></span><span class="txt">' +
      '<b>' + esc(k) + '</b> — ' + esc(v) + '</span></div>'; };

  add(t('home.nextSession'), next ? next.session.name : t('home.noplan'));
  add(t('body.last'), recent.length ? dateLabel(recent[0].date) + ' · ' + recent[0].name : t('state.nodata'));
  add(t('body.recovery'), ids.length
      ? Object.keys(d.recovery).filter(m => (d.recovery[m]||{}).since !== null).length + ' / 12 ' + t('body.tracked')
      : t('state.nodata'));
  add(t('profile.sleepLog'), ss.avg !== null
      ? Math.round(ss.avg*10)/10 + ' h ' + t('sleep.avg') + ' · ' + ss.n + ' ' + t('sleep.entries')
      : t('state.needSetup'));
  add(t('profile.workshifts'), s.shifts.length
      ? shifts7.length + ' ' + t('shift.last7') + ' · ' + nights + ' ' + t('shift.nights')
      : t('state.needSetup'));
  add(t('body.trend'), t('trend.' + overallTrend(s, 21, now)));

  let missing = [];
  if(s.sessions.length < 3) missing.push(t('unc.fewSessions'));
  if(ss.avg === null) missing.push(t('unc.noSleep'));
  if(!s.shifts.length && s.profile.shiftType !== 'none') missing.push(t('unc.noShift'));

  let h = '<div class="eyebrow mb-2">' + esc(t('decision.label')) + ' — ' +
          esc(t('decision.' + displayState(d.state))) + '</div>';
  h += '<div class="factors bare">' + rows + '</div>';
  if(missing.length){
    h += '<div class="uncertain mt-4"><b>' + esc(t('body.missing')) + '</b>' +
         esc(missing.join(' ')) + '</div>';
  }
  h += '<div class="uncertain mt-3"><b>' + esc(t('decision.limits')) + '</b>' +
       esc(t('unc.estimate')) + ' ' + esc(t('body.estimateNote')) + '</div>';
  sheet(t('home.analysis'), h);
}

/* (Session planner, live workout & 84-exercise atlas live in js/ui/workout.js) */

/* ---------- rest timer ----------
   A real timer: it counts down, it can be paused and resumed without losing
   the remaining time, it can be reset to the full rest, and it can be
   skipped. Pausing stores the remaining milliseconds, so resuming continues
   from where it stopped rather than restarting. */
function startRest(sec){
  stopRest();
  REST = { endsAt: Date.now() + sec*1000, total: sec, added: 0, leftMs: sec*1000, paused: false };
  runRestTimer();
  paintRestHost();
}
function runRestTimer(){
  if(!REST || REST.timer) return;
  REST.timer = setInterval(() => {
    if(!REST || REST.paused) return;
    const left = REST.endsAt - Date.now();
    if(left <= 0){
      REST.leftMs = 0;
      stopRest(); render();
      /* A toast is only seen by someone looking at the tab. If they are not,
         and they asked to be told, the service worker says it instead. */
      notifyRestDone();
      toast(t('session.restDone'), 'ok');
      try{ pressFeedback(null); }catch(e){}
      return;
    }
    REST.leftMs = left;
    paintRest();
  }, 250);
  if(REST.timer && typeof REST.timer.unref === 'function') REST.timer.unref();
}
function pauseRest(){
  if(!REST || REST.paused) return;
  REST.paused = true;
  REST.leftMs = Math.max(0, REST.endsAt - Date.now());
  if(REST.timer){ clearInterval(REST.timer); REST.timer = null; }
  paintRestHost();
  restSay(t('session.restPaused'));
}
function resumeRest(){
  if(!REST || !REST.paused) return;
  REST.paused = false;
  REST.endsAt = Date.now() + REST.leftMs;
  runRestTimer();
  paintRestHost();
  restSay(t('session.rest'));
}
function toggleRest(){ if(REST) REST.paused ? resumeRest() : pauseRest(); }
function resetRest(){
  if(!REST) return;
  REST.paused = false;
  REST.added = 0;
  REST.leftMs = REST.total * 1000;
  REST.endsAt = Date.now() + REST.leftMs;
  runRestTimer();
  paintRestHost();
  restSay(t('session.rest'));
}
function addRest(sec){
  if(!REST) return;
  /* Extra time is tracked separately from the rest you programmed: the bar's
     maximum has to grow with it (or the elapsed value runs past its own
     maximum), but Reset must still return to the rest you actually set. */
  REST.added = (REST.added || 0) + sec;
  REST.endsAt += sec*1000;
  REST.leftMs = Math.max(0, REST.endsAt - Date.now());
  paintRestHost();
  restSay(t('session.rest') + ' +' + sec + 's');
}
function stopRest(){
  if(REST && REST.timer) clearInterval(REST.timer);
  REST = null;
  paintRestHost();
}
function paintRest(){
  const el = $('#restT'); if(!el || !REST) return;
  const left = Math.max(0, (REST.paused ? REST.leftMs : REST.endsAt - Date.now()) / 1000);
  el.textContent = fmtClock(left);
  const bar = $('#restBar');
  const spanSec = Math.max(1, REST.total + (REST.added || 0));
  const done = 1 - left / spanSec;
  if(bar){
    bar.style.width = (Math.max(0, Math.min(1, done)) * 100).toFixed(1) + '%';
  }
  const track = $('#restTrack');
  if(track){
    const span = Math.max(1, Math.round(REST.total + (REST.added || 0)));
    const elapsed = Math.max(0, Math.min(span, Math.round(span - left)));
    track.setAttribute('aria-valuenow', String(elapsed));
    track.setAttribute('aria-valuemax', String(span));
    track.setAttribute('aria-valuetext', fmtClock(left));
  }
}
function fmtClock(sec){
  const s = Math.max(0, Math.ceil(sec));
  if(s < 60) return s + 's';
  return Math.floor(s/60) + ':' + String(s % 60).padStart(2, '0');
}
function paintRestHost(){
  const c = $('#restHost'); if(!c) return;
  if(!REST){ c.innerHTML = ''; c.classList.remove('on'); return; }
  const left = Math.max(0, (REST.paused ? REST.leftMs : REST.endsAt - Date.now()) / 1000);
  const spanSec0 = Math.max(1, REST.total + (REST.added || 0));
  const pct = Math.max(0, Math.min(100, (1 - left / spanSec0) * 100));
  const label = REST.paused ? t('session.restPaused') : t('session.rest');
  const span = Math.max(1, Math.round(REST.total + (REST.added || 0)));
  /* The clock repaints four times a second, so it is hidden from assistive
     technology: announcing a countdown at 4 Hz is not information, it is an
     interruption. The countdown is a labelled progressbar (which a screen reader
     can query whenever the user wants the number) and one polite status line
     that speaks only when the state changes. Rest ending was already announced,
     through the toast; rest *starting* said nothing at all. */
  c.classList.add('on');
  c.innerHTML = '<div class="restbar" role="region" aria-label="' + esc(t('session.rest')) + '">' +
    '<div class="in">' +
    '<span class="eyebrow" style="color:var(--accent-on-ink)">' + esc(label) + '</span>' +
    '<div class="track" id="restTrack" role="progressbar" aria-label="' + esc(t('session.rest')) + '" ' +
      'aria-valuemin="0" aria-valuemax="' + span + '" aria-valuenow="' +
      Math.max(0, Math.min(span, Math.round(span - left))) + '" aria-valuetext="' +
      esc(fmtClock(left)) + '">' +
      '<i id="restBar" style="width:' + pct.toFixed(1) + '%"></i></div>' +
    '<span class="t" id="restT" aria-hidden="true">' + fmtClock(left) + '</span>' +
    '<span class="sr-only" id="restSay" role="status" aria-live="polite">' +
      esc(label + ' · ' + fmtClock(left)) + '</span>' +
    '<button class="btn quiet sm" data-act="toggleRest">' +
      esc(REST.paused ? t('session.restResume') : t('session.restPause')) + '</button>' +
    '<button class="btn quiet sm" data-act="resetRest">' + esc(t('session.restReset')) + '</button>' +
    '<button class="btn quiet sm" data-act="addRest" data-a1="15" data-t1="n">+' + 15 + 's</button>' +
    '<button class="btn quiet sm" data-act="closeRest">' + esc(t('btn.close')) + '</button>' +
    '</div></div>';
  paintRest();
}

/* ---------- rest alert ----------
   The countdown is a page timer: it stops when the tab is closed, and a browser
   that suspends a background tab delivers it late. So this is not advertised as
   an alarm — it is the one honest upgrade available to a page-only app: if the
   tab is merely *behind* another window, and the person has opted in and granted
   permission, rest ending is posted as a notification through the service
   worker, which the operating system will show even though the page is not
   visible. Every path that cannot deliver returns false, and nothing claims
   otherwise. */
function restAlertSupported(){
  try{
    return typeof Notification !== 'undefined' &&
           typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  }catch(e){ return false; }
}
function notifyRestDone(){
  const s = getState();
  if(!s || !s.profile || s.profile.restNotify !== true) return false;
  if(!restAlertSupported()) return false;
  if(Notification.permission !== 'granted') return false;
  /* If the screen is on, the toast and the strip have already said it. A
     notification for something already visible is noise. */
  if(!document.hidden) return false;
  try{
    navigator.serviceWorker.ready.then(reg => {
      if(!reg || typeof reg.showNotification !== 'function') return;
      reg.showNotification(t('rest.notifyTitle'), {
        body: t('rest.notifyBody'),
        tag: 'ancestor-rest',        /* a second rest replaces the first */
        renotify: true,
        icon: './img/icon-192.png',
        badge: './img/icon-192.png',
        data: { url: './' }
      });
    }).catch(() => {});
  }catch(e){ return false; }
  return true;
}
/* Permission is asked for here and nowhere else: a request on boot is a dialog
   from an app the person has not used yet. */
function setRestNotify(){
  const s = getState();
  if(s.profile.restNotify === true){
    s.profile.restNotify = false; saveState(); render();
    toast(t('rest.notifyOff'), 'ok');
    return;
  }
  if(!restAlertSupported()){ toast(t('rest.notifyUnsupported'), 'warn'); return; }
  const done = ok => {
    s.profile.restNotify = !!ok; saveState(); render();
    toast(ok ? t('rest.notifyOn') : t('rest.notifyBlocked'), ok ? 'ok' : 'warn');
  };
  try{
    const r = Notification.requestPermission();
    if(r && typeof r.then === 'function'){ r.then(p => done(p === 'granted')).catch(() => done(false)); }
    else done(Notification.permission === 'granted');
  }catch(e){ done(false); }
}

/* One line, spoken only when the rest state changes. */
function restSay(prefix){
  const el = typeof document !== 'undefined' && document.getElementById('restSay');
  if(!el || !REST) return;
  const left = Math.max(0, (REST.paused ? REST.leftMs : REST.endsAt - Date.now()) / 1000);
  el.textContent = prefix + ' · ' + fmtClock(left);
}

function saveDraft(){ try{ if(ACTIVE) localStorage.setItem(DRAFT_KEY, JSON.stringify(ACTIVE)); }catch(e){} }
function clearDraft(){ try{ localStorage.removeItem(DRAFT_KEY); }catch(e){} }
function loadDraft(){
  try{ const raw = localStorage.getItem(DRAFT_KEY); if(raw){ ACTIVE = JSON.parse(raw); return true; } }catch(e){}
  return false;
}

/* ===================================================================== */
/*  BODY — interactive anatomy                                            */
/* ===================================================================== */
Screens.body = function(){
  const s = getState(), now = Date.now();
  const rec = allRecovery(s, now);

  const trackedCount = MUSCLES.filter(m => rec[m] && rec[m].since !== null).length;
  let h = '<div class="masthead masthead-body"><div>' +
          '<p class="masthead-idx">' + numExpr(trackedCount + ' / ' + MUSCLES.length) + ' ' + esc(t('body.tracked')) + '</p>' +
          '<h1 class="masthead-title">' + esc(t('body.title')) + '</h1>' +
          '<p class="masthead-sub">' + esc(BODY_MODE === 'model' ? t('lab3d.atlasTag') : t('body.note2d')) + '</p>' +
          '</div></div>';

  h += '<div class="layout"><div>';
  h += '<div class="fig-stage">';
  h += '<div class="anat-toolbar">' +
       '<div class="chips" role="group" aria-label="' + esc(t('lab3d.mode')) + '">' +
       '<button class="chip sm ' + (BODY_MODE==='model'?'on':'') + '" data-act="setBodyMode" data-a1="model"' +
       ' aria-pressed="' + (BODY_MODE==='model'?'true':'false') + '">' + esc(t('lab3d.mode3d')) + '</button>' +
       '<button class="chip sm ' + (BODY_MODE==='flat'?'on':'') + '" data-act="setBodyMode" data-a1="flat"' +
       ' aria-pressed="' + (BODY_MODE==='flat'?'true':'false') + '">' + esc(t('lab3d.modeFlat')) + '</button></div>' +
       /* Two groups of chips sit on this row, and "Tout" and "Dos" appear in
          both. Sighted users have the group label above each row; a screen
          reader reading a button list does not, so the group goes into the
          accessible name and the visible text stays short. */
       '<div class="chips" role="group" aria-label="' + esc(t('lab3d.filterSide')) + '">' +
       '<button class="chip sm ' + (BODY_SIDE==='front'?'on':'') + '" data-act="setSide" data-a1="front" ' +
       'aria-label="' + esc(t('lab3d.filterSide') + ' — ' + t('body.front')) + '">' + esc(t('body.front')) + '</button>' +
       '<button class="chip sm ' + (BODY_SIDE==='back'?'on':'') + '" data-act="setSide" data-a1="back" ' +
       'aria-label="' + esc(t('lab3d.filterSide') + ' — ' + t('body.back')) + '">' + esc(t('body.back')) + '</button></div>' +
       '</div>';
  /* The reason the 3D view is missing belongs above the figure, not 600 px
     below it: this is the first thing the eye reaches after the chips that
     just failed to do anything. */
  if(BODY_MODE === 'flat' && BODY_FALLBACK){
    h += '<div class="fig-fallback" role="status">' +
         '<span>' + esc(t('lab3d.fallback')) + '</span>' +
         '<button class="btn quiet sm" data-act="retryLab">' + esc(t('lab3d.retry')) + '</button></div>';
  }
  /* the 3D viewer mounts here, and owns its own loading / error states */
  h += '<div class="fig-wrap lab-host" id="labHost"' + (BODY_MODE==='model' ? '' : ' hidden') + '></div>';
  /* the flat figure stays mounted so selection, zoom and reset keep working
     in both modes and remain reachable without WebGL.
     pointerOnly: it is tappable but not a keyboard destination,
     because the muscle list below is the same twelve groups with the same
     states spelled out in words. Without this the figure contributed fourteen
     tab stops announcing "Chest — no data" while the list announced the same
     twelve a second time (measured: 34 focus stops on this screen). */
  h += '<div class="fig-wrap" id="figWrap"' + (BODY_MODE==='model' ? ' hidden' : '') + '>' +
       anatomyFigure(s, { side:BODY_SIDE, selected:BODY_ZOOM ? BODY_SEL : null, now:now, pointerOnly:true }) +
       '</div>';
  h += '<div class="fig-controls"' + (BODY_MODE==='model' ? ' hidden' : '') + '>';
  h += '<button class="fig-btn" title="' + esc(t('body.rotate')) + '" data-act="rotateFig" aria-label="' +
       esc(t('body.rotate')) + '"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15.5-6.2"/>' +
       '<path d="M21 12a9 9 0 0 1-15.5 6.2"/><path d="M18 3v5h-5M6 21v-5h5"/></svg></button>';
  h += '<button class="fig-btn" title="' + esc(t('body.zoom')) + '" data-act="toggleZoom" ' +
       (BODY_SEL ? '' : 'disabled') + ' aria-label="' + esc(t('body.zoom')) +
       '"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/></svg></button>';
  h += '<button class="fig-btn" title="' + esc(t('body.reset')) + '" data-act="resetFig" aria-label="' +
       esc(t('body.reset')) + '"><svg viewBox="0 0 24 24"><path d="M4 4v6h6M20 20v-6h-6"/>' +
       '<path d="M4 10a8 8 0 0 1 13-3M20 14a8 8 0 0 1-13 3"/></svg></button>';
  h += '</div>';
  h += '<div class="fig-note">' + esc(BODY_MODE==='model' ? t('lab3d.note3d') : t('body.note2d')) + '</div>';
  h += '</div>';
  if(BODY_MODE === 'model'){
    h += '<div class="anat-filters">' +
         '<div class="anat-filter-row" role="group" aria-label="' + esc(t('lab3d.filterLayer')) + '">' +
         '<span class="anat-filter-lbl">' + esc(t('lab3d.filterLayer')) + '</span><div class="chips">' +
         ['all','superficial','deep'].map(ly =>
           '<button class="chip sm ' + (BODY_LAYER===ly?'on':'') + '" data-act="setLabLayer" data-a1="' + ly + '" ' +
           'aria-pressed="' + (BODY_LAYER===ly?'true':'false') + '" ' +
           'aria-label="' + esc(t('lab3d.filterLayer') + ' — ' + (ly==='all' ? t('sci.all') : t('lab3d.layer.'+ly))) + '">' +
           esc(ly==='all' ? t('sci.all') : t('lab3d.layer.'+ly)) + '</button>'
         ).join('') + '</div></div>' +
         '<div class="anat-filter-row" role="group" aria-label="' + esc(t('lab3d.filterRegion')) + '">' +
         '<span class="anat-filter-lbl">' + esc(t('lab3d.filterRegion')) + '</span><div class="chips">' +
         ['all','chest','back','shoulder','arms','forearms','core','hips','thigh','calves','neck'].map(rg =>
           '<button class="chip sm ' + (BODY_REGION===rg?'on':'') + '" data-act="setLabRegion" data-a1="' + rg + '" ' +
           'aria-pressed="' + (BODY_REGION===rg?'true':'false') + '" ' +
           'aria-label="' + esc(t('lab3d.filterRegion') + ' — ' + (rg==='all' ? t('sci.all') : t('lab3d.reg.'+rg))) + '">' +
           esc(rg==='all' ? t('sci.all') : t('lab3d.reg.'+rg)) + '</button>'
         ).join('') + '</div></div></div>';
  }
  h += '<div class="fig-hint"><svg viewBox="0 0 24 24"><path d="M9 11V6a1.5 1.5 0 0 1 3 0"/>' +
       '<path d="M12 11v5M8 13l4-2 4 2"/></svg>' + esc(t(BODY_MODE==='model' ? 'lab3d.tapHint' : 'body.tapHint')) + '</div>';
  h += '<div class="lab-credits">' + esc(t('lab3d.credits')) + '</div>';

  /* The muscle list is also the legend: each row carries the colour, the group
     and the state in words, so a separate four-swatch key under the figure was
     the same thing printed twice. */
  h += '<div class="panel flush mt-3"><div class="muscle-list">';
  MUSCLES.forEach(m => {
    const r = rec[m];
    const st = r ? r.state : 'fresh';
    const remPlain = r && r.since !== null
      ? (st === 'ready' ? t('mst.ready')
         : (r.daysLeft > 0 ? r.daysLeft + ' d' : Math.max(1, Math.round(r.hoursLeft || 1)) + ' h'))
      : t('mst.fresh');
    const remLabel = esc(remPlain);
    h += '<button class="mrow ' + (BODY_SEL===m?'sel':'') + '" data-act="selectMuscle" data-a1="' + m + '"' +
         ' aria-pressed="' + (BODY_SEL===m?'true':'false') + '"' +
         ' aria-label="' + esc(t('mg.'+m) + ', ' + (r && r.since !== null ? t('mst.'+st) + ' — ' + remPlain : t('mst.fresh'))) + '">' +
         '<span class="sw" style="background:' + STATE_HEX[st] + ';opacity:' +
         (r && r.since!==null ? 1 : .3) + '"></span>' +
         '<span class="idx" aria-hidden="true">' + (MUSCLES.indexOf(m) + 1) + '</span>' +
         '<span class="nm">' + esc(t('mg.'+m)) + '</span>' +
         '<span class="when">' + remLabel + '</span></button>';
  });
  h += '</div></div></div>';

  /* detail */
  h += '<div id="bodyDetail">';
  if(!BODY_SEL && !LAB_STRUCT){
    h += emptyState('body.select', 'body.selectBody', 'body', '', 2);
  } else if(!BODY_SEL && LAB_STRUCT){
    h += labStructPanel(LAB_STRUCT);
  } else {
    const m = BODY_SEL, r = rec[m];
    const related = EX.filter(e => e.m.some(([mm]) => mm === m))
                      .sort((a,b) => muscleWeight(b,m)-muscleWeight(a,m));
    const hist = [];
    s.sessions.slice().sort((a,b)=>b.date-a.date).forEach(sess => {
      (sess.exercises||[]).forEach(e => {
        const ex = EX_BY_ID[e.id];
        if(!ex || !ex.m.some(([mm]) => mm === m)) return;
        const ex2 = EX_BY_ID[e.id];
        const done = (e.sets||[]).filter(x => x && !x.skipped && isSetComplete(x, ex2));
        if(done.length) hist.push({ date:sess.date, name:t('ex.'+e.id), exId:e.id, sets:done });
      });
    });

    if(LAB_STRUCT) h += labStructPanel(LAB_STRUCT);
    h += '<div class="panel"><div class="panel-hd">' +
         '<h2 class="sub">' + esc(t('mg.'+m)) + '</h2>' +
         '<span class="row nowrap">' +
         '<span class="flag ' + (r.state==='ready'?'ok':r.state==='caution'?'warn':r.state==='rest'?'alert':'nodata') + '">' +
         esc(t('mst.'+r.state)) + '</span>' +
         '<button class="btn quiet sm" data-act="clearMuscle" aria-label="' + esc(t('body.close')) + '">' +
         esc(t('body.close')) + '</button></span></div>';

    const grpAction = groupAnatomicalAction(m);
    if(grpAction){
      h += '<p class="body-sm mb-3"><b>' + esc(t('lab3d.action')) + ':</b> ' +
           esc(grpAction) + '</p>';
    }

    h += metricsBlock([
      { k:t('body.last'), v: r.since !== null ? r.since + '' : '—', u: r.since!==null?'d':'' ,
        d: r.since !== null ? dateLabel(r.last) : esc(t('body.never')) },
      { k:t('body.recovery'), v: Math.round(r.days*10)/10, u:'d', d: esc(t('readiness.label')) },
      { k:t('readiness.label'), v: Math.min(100, Math.round(r.ratio*100/5)*5), u:'%',
        d: r.since !== null ? (r.daysLeft>0 ? r.daysLeft+' d '+t('body.left') : t('mst.ready')) : '' },
      { k:t('body.exercises'), v: related.length, d: esc(t('progress.exercise')) }
    ]);

    h += '<div class="sect mb-2 mt-4"><h2 class="sub">' +
         esc(t('body.exercises')) + '</h2><span class="rule"></span></div>';
    h += dataTable(
      [{label:t('progress.exercise')},{label:t('exd.role')},{label:t('body.contribution'),n:true}],
      related.slice(0,8).map(e => [
        '<button type="button" class="link-btn" data-act="openExerciseDetail" data-a1="' + e.id + '">' +
          esc(t('ex.'+e.id)) + '</button>',
        esc(t('pat.'+e.pat)),
        Math.round(muscleWeight(e,m)*100) + '%'
      ]),
      t('body.contributionNote'));

    if(!hist.length){
      h += '<div class="uncertain mt-4"><b>' + esc(t('body.missing')) +
           '</b>' + esc(t('body.nodataNote')) + '</div>';
    }
    if(hist.length){
      h += '<div class="sect mb-2 mt-4"><h2 class="sub">' +
           esc(t('body.sets')) + '</h2><span class="rule"></span></div>';
      h += dataTable(
        [{label:t('progress.date')},{label:t('progress.exercise')},
         {label:t('progress.best')},{label:t('progress.sets'),n:true}],
        hist.slice(0,8).map(x => {
          const ex = EX_BY_ID[x.exId];
          const b = ex ? bestSetScore(workingSets(x.sets), ex, s.profile) : null;
          return [esc(dateLabel(x.date)),
                  '<button type="button" class="link-btn" data-act="openExerciseDetail" data-a1="' + x.exId + '">' +
                    esc(x.name) + '</button>',
                  esc(b ? formatSet(b.set, ex, s.profile) : '—'),
                  workingSets(x.sets).length];
        }));
    } else {
      h += '<div class="mt-4">' + emptyState('body.neverBody','body.neverHint','inbox') + '</div>';
    }

    h += '<div class="sect mb-2 mt-4"><h2 class="sub">' +
         esc(t('body.factors')) + '</h2><span class="rule"></span></div><div class="factors bare">';
    r.parts.forEach(p => {
      /* The engine hands over keys, not sentences — see js/engine/recovery.js.
         A factor note is either a phrase key or a count plus a noun key. */
      const note = p.noteKey
        ? (p.noteN !== undefined ? p.noteN + ' ' + t(p.noteKey) : t(p.noteKey)) +
          (p.noteIrregular ? ', ' + t('rec.sleep.irregular') : '')
        : '';
      h += '<div class="factor"><span class="dot"></span><span class="txt">' + esc(t(p.labelKey)) +
           (note ? ' <span class="meta">(' + esc(note) + ')</span>' : '') +
           '</span><span class="w">' + esc(numExpr('×' + p.f.toFixed(2))) + '</span></div>';
    });
    h += '</div>';
    h += '<div class="uncertain mt-3"><b>' + esc(t('body.missing')) + '</b>' +
         esc(t('body.estimateNote')) + ' ' + r.observations + ' ' + esc(t('body.observations')) + '.</div>';
    h += '<div class="chips mb-0 mt-3">' +
         lessonsForMuscle(m).map(function(lid){ return '<button class="chip sm" data-act="openLesson" data-a1="' + lid +
         '">' + esc(t((lesson(lid)||{titleKey:'sci.title'}).titleKey)) + '</button>'; }).join('') + '</div>';
    h += '<div class="row mt-4">' +
         '<button class="btn quiet" data-act="openWhy" data-a1="recovery" data-a2="' + m + '">' +
         esc(t('sci.whyOpen')) + '</button>' +
         '<button class="btn" data-act="go" data-a1="session">' + esc(t('body.train')) + '</button>' +
         '<button class="btn quiet" data-act="openExerciseLibrary" data-a1="' + m + '">' + esc(t('plan.tabLibrary')) + '</button>' +
         '<button class="btn quiet" data-act="toggleZoom">' + esc(t('body.zoomTo')) + '</button>' +
         '<button class="btn quiet" data-act="clearMuscle">' + esc(t('body.fullView')) + '</button>' +
         '</div>';
    h += '</div>';
  }
  h += '</div>';
  /* Mobile compact bottom drawer trigger when a structure or muscle is selected */
  if(BODY_SEL || LAB_STRUCT){
    const selTitle = LAB_STRUCT ? LAB_STRUCT.label : t('mg.' + BODY_SEL);
    h += '<div class="body-mob-bar" role="region" aria-label="' + esc(selTitle) + '">' +
         '<span class="body-mob-t">' + esc(selTitle) + '</span>' +
         '<button type="button" class="btn sm" data-act="openMobileMuscleSheet">' +
           esc(t('lab.open')) + '</button>' +
         '<button type="button" class="btn quiet sm" data-act="clearMuscle">' +
           esc(t('body.close')) + '</button></div>';
  }
  h += '</div>';
  return { html: h };
};

/* Which representation the user is looking at. The flat figure is a real
   fallback, not a decoration: it is what runs when WebGL is unavailable and
   what a keyboard or screen reader drives. */
/* What was actually clicked in the 3D model. Shown above the training-group
   record so the user can tell the individual structure apart from the group
   ANCESTOR tracks. */
function labStructPanel(info){
  const side = info.side ? esc(t('lab3d.side.' + info.side)) : '';
  let h = '<div class="panel inset lab-struct">';
  h += '<div class="panel-hd"><h2 class="sub">' + esc(info.label) + '</h2>' +
       '<button class="btn quiet sm" data-act="clearMuscle" aria-label="' +
       esc(t('body.close')) + '">' + esc(t('body.close')) + '</button></div>';
  h += '<div class="chips mb-2">' +
       (info.side ? '<span class="flag plain">' + side + '</span>' : '') +
       (info.layer ? '<span class="flag plain">' + esc(t('lab3d.layer.' + info.layer)) + '</span>' : '') +
       (info.group ? '<span class="flag plain">' + esc(info.group) + '</span>' : '') +
       '</div>';
  if(info.sourceName)
    h += '<p class="hint mb-2">' + esc(t('lab3d.taName')) + ': ' +
         esc(info.sourceName) + '</p>';
  if(info.action)
    h += '<p class="body-sm mb-0"><b>' + esc(t('lab3d.action')) + '</b><br>' +
         esc(info.action) + '</p>';
  if(!info.trainingGroup)
    h += '<div class="uncertain mt-3"><b>' + esc(t('lab3d.noGroup')) +
         '</b> ' + esc(t('lab3d.noGroupBody')) + '</div>';
  else
    h += '<p class="hint mt-2">' +
         esc(t('lab3d.mapsTo', { group: t('mg.' + info.trainingGroup) })) + '</p>';
  h += '</div>';
  return h;
}

function setBodyMode(m){
  BODY_MODE = (m === 'flat') ? 'flat' : 'model';
  if(BODY_MODE === 'flat') destroyAnatomyLab();
  /* Choosing the flat figure on purpose is not a failure, so the note goes. */
  if(BODY_MODE === 'flat') BODY_FALLBACK = null;
  render();
}
/* The single producer of the fallback state. Kept as a function so the state
   can be reached from a test without a browser that refuses WebGL for real. */
function noteLabFallback(reason){
  BODY_FALLBACK = reason || 'render';
  BODY_MODE = 'flat';
  destroyAnatomyLab();
  render();
}
function retryLab(){
  BODY_MODE = 'model';
  render();               // the note survives until onReady proves the retry worked
}
function setSide(x){
  BODY_SIDE = x;
  if(BODY_MODE === 'model' && labIsMounted()) labSetView(x);
  render();
}
/* Selection is always additive. Tapping a region opens its record; it never
   silently closes one. Clearing is an explicit action (the close button or
   "full body view"), which removes the ambiguity that made selection feel
   unreliable on small touch targets. */
function selectMuscle(m){
  if(!m) return;
  BODY_SEL = m;
  LAB_STRUCT = null;
  // make sure the selected group is actually visible on the current side
  if(!FIG.regions[BODY_SIDE][m]) BODY_SIDE = FIG.regions.front[m] ? 'front' : 'back';
  render();
  if(BODY_MODE === 'model' && labIsMounted()) labSelectGroup(m);
}
function clearMuscle(){
  BODY_SEL = null; BODY_ZOOM = false; LAB_STRUCT = null;
  if(labIsMounted()) labClearSelection();
  render();
}
/* In the 3D view "zoom to selection" means isolate the selected structure,
   which is the equivalent gesture: bring the thing you picked to the front. */
function toggleZoom(){
  if(BODY_MODE === 'model' && labIsMounted()){ labToggleIsolate(); return; }
  BODY_ZOOM = !BODY_ZOOM; render();
}
function resetFig(){
  BODY_LAYER = 'all'; BODY_REGION = 'all';
  if(BODY_MODE === 'model' && labIsMounted()) labResetView();
  clearMuscle();
}
function setLabLayer(ly){
  BODY_LAYER = ly || 'all';
  if(labIsMounted()) labLayerFilter(BODY_LAYER);
  render();
}
function setLabRegion(rg){
  BODY_REGION = rg || 'all';
  if(labIsMounted()) labRegionFilter(BODY_REGION);
  render();
}
function groupAnatomicalAction(m){
  const KEY_BY_GROUP = {
    chest:'chest|Chest', back:'back|Lats', shoulders:'shoulder|Deltoids',
    biceps:'arms|Biceps', triceps:'arms|Triceps', forearms:'forearms|Forearms',
    quads:'thigh|Quadriceps', hamstrings:'thigh|Hamstrings', glutes:'hips|Glutes',
    calves:'calves|Calves', abs:'core|Abdominals', lowerback:'back|Spinal extensors'
  };
  return (typeof MESH_GROUP_ACTION === 'object' && MESH_GROUP_ACTION[KEY_BY_GROUP[m]]) || '';
}
function openMobileMuscleSheet(){
  const det = document.getElementById('bodyDetail');
  if(!det) return;
  const title = LAB_STRUCT ? LAB_STRUCT.label : (BODY_SEL ? t('mg.' + BODY_SEL) : t('body.title'));
  sheet(title, det.innerHTML);
}
function rotateFig(){
  BODY_SIDE = (BODY_SIDE === 'front') ? 'back' : 'front';
  // if the selected group does not exist on the new side, drop the selection
  if(BODY_SEL && !FIG.regions[BODY_SIDE][BODY_SEL]) BODY_SEL = null;
  render();
  if(BODY_MODE === 'model' && labIsMounted()){ labSetView(BODY_SIDE); return; }
  const w = $('#figWrap');
  if(!w) return;
  w.classList.add('turning');
  setTimeout(() => w.classList.remove('turning'), 300);
}

/* ------------------------------------------------------------------------
   Anatomy Lab lifecycle.

   The viewer is mounted only while the Body screen is on screen and only in
   3D mode, and it is torn down on every other screen so a WebGL context is
   never left running in the background.
   ---------------------------------------------------------------------- */
function bindAnatomyLab(){
  if(VIEW !== 'body' || BODY_MODE !== 'model'){ destroyAnatomyLab(); return; }
  const host = document.getElementById('labHost');
  if(!host) return;
  if(labIsMounted()){
    /* Re-attach the preserved #labStage so innerHTML updates never destroy WebGL. */
    if(typeof labReattach === 'function') labReattach(host);
    labLayerFilter(BODY_LAYER);
    labRegionFilter(BODY_REGION);
    if(BODY_SEL && !LAB_STRUCT) labSelectGroup(BODY_SEL);
    return;
  }
  mountAnatomyLab(host, {
    onSelect: onLabStruct,
    onReady: () => {
      BODY_FALLBACK = null;   // a real model mounted: the note has done its job
      labSetView(BODY_SIDE);
      labLayerFilter(BODY_LAYER);
      labRegionFilter(BODY_REGION);
      if(BODY_SEL) labSelectGroup(BODY_SEL);
      const n = labMuscleCount();
      if(n) toast(t('lab3d.ready', { n: n }), 'ok');
    },
    onFail: reason => {
      /* Fall back to the flat figure rather than leaving an empty box — and say
         so where the figure now is, with the one action that could change it. */
      noteLabFallback(reason);
    }
  });
}

/* A single mesh was picked. If it maps onto one of ANCESTOR's training
   groups, the app selects that group so the record, the exercises and the
   recovery estimate on the right are driven by real logged data. If it has
   no ANCESTOR group, BODY_SEL is cleared so stale group numbers never mix
   with an unmapped anatomical structure. */
function onLabStruct(info){
  LAB_STRUCT = info;
  if(!info){ BODY_SEL = null; render(); return; }
  if(info.trainingGroup){
    BODY_SEL = info.trainingGroup;
    if(!FIG.regions[BODY_SIDE][BODY_SEL]) BODY_SIDE = FIG.regions.front[BODY_SEL] ? 'front' : 'back';
  } else {
    BODY_SEL = null;
  }
  render();
}

/* ------------------------------------------------------------------------
   Exercise detail sheet — one consistent view from Body, Session & Progress.
   ---------------------------------------------------------------------- */
function openExerciseDetail(exId){
  const ex = EX_BY_ID[exId];
  if(!ex) return;
  const s = getState(), now = Date.now();
  const spec = exLogSpec(ex);
  const rec = recommend(s, exId, now);
  const prev = previousPerformance(s, exId, now + 1);
  const pb = personalBest(exId);
  const hist = exerciseHistory(exId);
  const subs = substitutesFor(s.profile || {}, exId).slice(0, 6);
  const prime = ex.m && ex.m[0] ? ex.m[0][0] : null;
  const action = prime ? groupAnatomicalAction(prime) : '';

  let h = '<div class="chips mb-3">' +
    '<span class="flag accent">' + esc(targetRangeText(ex)) + '</span>' +
    '<span class="flag plain">' + esc(t('pat.' + ex.pat)) + '</span>' +
    '<span class="flag plain">' + esc(t('equip.' + ex.equip)) + '</span>' +
    '<span class="flag plain">' + esc(t('exd.mode.' + spec.mode)) + '</span>' +
    (spec.unilateral ? '<span class="flag plain">' + esc(t('log.unilateral')) + '</span>' : '') +
    '</div>';

  /* Dual-panel anatomical highlight + movement-pattern force-vector plate */
  if(typeof exerciseVisualSvg === 'function'){
    h += exerciseVisualSvg(ex);
  }

  h += '<p class="body-sm mb-3"><b>' + esc(t('session.cue')) + ':</b> ' +
       esc(t('cue.' + ex.id)) + '</p>';
  if(action){
    h += '<p class="body-sm mb-3"><b>' + esc(t('lab3d.action')) +
         ' (' + esc(t('mg.' + prime)) + '):</b> ' + esc(action) + '</p>';
  }

  h += '<p class="eyebrow mb-2">' + esc(t('exd.muscles')) + '</p>';
  h += '<div class="factors mb-4 bare">';
  (ex.m || []).forEach(([m, w], idx) => {
    h += '<div class="factor"><span class="dot"></span><span class="txt">' +
         '<button type="button" class="link-btn" data-act="openMuscleFromSheet" data-a1="' + m + '">' +
         esc(t('mg.' + m)) + '</button>' +
         (idx === 0 ? ' <span class="hint">(' + esc(t('lab.primary')) + ')</span>' : '') +
         '</span><span class="w">' + Math.round(w * 100) + '%</span></div>';
  });
  h += '</div>';

  if((ex.pos || []).length){
    h += '<p class="eyebrow mb-2">' + esc(t('exd.positions')) + '</p>';
    h += '<div class="chips mb-4">' +
         ex.pos.map(p => '<span class="flag plain">' + esc(t('exd.pos.' + p)) + '</span>').join('') +
         '</div>';
  }

  /* Contextual prescription when this exercise is part of the user's current plan */
  const inPlanRows = [];
  if(s.plan && Array.isArray(s.plan.sessions)){
    s.plan.sessions.forEach(ps => {
      (ps.exercises || []).forEach(pe => {
        if(pe.id === exId) inPlanRows.push({ dayName: ps.name, sets: pe.sets, rir: pe.rir, rest: s.plan.restSec || 120 });
      });
    });
  }
  if(inPlanRows.length){
    h += '<p class="eyebrow mb-2">' + esc(t('plan.tabPlan')) + '</p>' +
         '<div class="chips mb-3">' +
         inPlanRows.map(pr =>
           '<span class="flag ok">' + esc(pr.dayName) + ' · ' + esc(numExpr(pr.sets + ' × ' + targetRangeText(ex))) +
           ' · RIR ' + pr.rir + ' · ' + esc(t('session.rest')) + ' ' + pr.rest + 's</span>'
         ).join('') + '</div>';
  }

  h += '<p class="eyebrow mb-2">' + esc(t('sci.history')) + '</p>';
  const lastExNote = (typeof previousExerciseNote === 'function') ? previousExerciseNote(s, exId, now + 1) : null;
  if(prev && prev.text){
    h += '<div class="prev-line"><span class="k">' + esc(t('c.previous')) + '</span>' +
         '<b>' + esc(prev.text) + '</b><span class="d">' + esc(dateLabel(prev.date)) + '</span></div>';
    if(lastExNote){
      h += '<p class="hint tuck"><b>' + esc(t('log.prevNote')) + ':</b> ' +
           esc(lastExNote.note) + ' (' + esc(dateLabel(lastExNote.date)) + ')</p>';
    }
    if(pb && hist.length >= 2){
      h += '<div class="prev-line"><span class="k">' + esc(t('progress.pr')) + '</span>' +
           '<b>' + esc(formatSet(pb.set, ex, s.profile)) + '</b><span class="d">' + esc(dateLabel(pb.date)) + '</span></div>';
    }
    const pts = sessionSeries(s, exId, 0);
    if(pts.length >= 2){
      h += '<div class="mt-2 mb-3">' +
           sparkline(pts, { compact:true, label: t(chartLabelKey(ex)), unit: chartUnit(ex, unit()) }) +
           '</div>';
    }
  } else {
    h += '<p class="hint mb-3">' + esc(t('log.noPrev')) + '</p>';
  }

  if(rec){
    const recLine = recommendationText(rec, ex);
    const whyLine = (rec.reasons && rec.reasons[0]) ? rec.reasons[0].text : '';
    const sameText = (rec.kind === 'baseline') || !whyLine || (recLine === esc(whyLine));
    h += '<div class="banner info mb-0 mt-3"><span class="ic">i</span><span>' +
         recLine + (sameText ? '' : '<br>' + esc(whyLine)) + '</span></div>';
  }

  if(subs.length){
    h += '<p class="eyebrow mb-2">' + esc(t('session.sub')) + '</p>';
    h += '<div class="chips mb-3">' +
         subs.map(sb => '<button type="button" class="chip sm" data-act="openExerciseDetail" data-a1="' + sb.id + '">' +
           esc(t('ex.' + sb.id)) + '</button>').join('') + '</div>';
  }

  const targetDay = (typeof PLAN_DAY !== 'undefined' && PLAN_DAY)
    || (s.plan && s.plan.sessions && s.plan.sessions[0] ? s.plan.sessions[0].id : '');
  h += '<div class="row mt-3">' +
       (prime ? '<button type="button" class="btn quiet sm" data-act="openMuscleFromSheet" data-a1="' + prime + '">' +
         esc(t('home.mapCta')) + '</button>' : '') +
       (ACTIVE
         ? '<button type="button" class="btn sm" data-act="addExerciseToActive" data-a1="' + exId + '">+ ' + esc(t('plan.tabActive')) + '</button>'
         : (targetDay
             ? '<button type="button" class="btn quiet sm" data-act="addExerciseToPlan" data-a1="' + targetDay + '" data-a2="' + exId + '">+ ' + esc(t('plan.tabPlan')) + '</button>'
             : '')) +
       '<button type="button" class="btn quiet sm" data-act="openWhy" data-a1="progression" data-a2="' + exId + '">' +
       esc(t('sci.whyOpen')) + '</button></div>';

  sheet(t('ex.' + ex.id), h);
}

/* ===================================================================== */
/*  PROGRESS                                                              */
/* ===================================================================== */
function setProgMetric(m){ PROG_METRIC = m || 'primary'; render(); }

Screens.progress = function(){
  const s = getState(), now = Date.now();
  const from = PROG_PERIOD === 0 ? 0 : now - PROG_PERIOD*86400000;
  const periodLabel = PROG_PERIOD === 0 ? t('progress.pall')
                    : PROG_PERIOD === 30 ? t('progress.p30') : t('progress.p90');

  let h = '<div class="masthead"><div>' +
          '<p class="masthead-idx">' + s.sessions.length + ' ' + esc(t('progress.sessions').toLowerCase()) + '</p>' +
          '<h1 class="masthead-title">' + esc(t('progress.title')) + '</h1></div>' +
          '<span class="flag plain">' + esc(periodLabel) + '</span></div>';

  if(LAST_SUMMARY){
    const bits = [];
    if(LAST_SUMMARY.prs.length) bits.push(t('session.prs') + ' : ' + LAST_SUMMARY.prs.join(', '));
    if(LAST_SUMMARY.baselines.length) bits.push(t('log.baselineSet') + ' : ' + LAST_SUMMARY.baselines.join(', '));
    h += banner('ok', t('session.saved'), bits.join(' · '));
    LAST_SUMMARY = null;
  }

  /* --- overview --- */
  const inPeriod = s.sessions.filter(x => x.date >= from);
  const vol = volumeByMuscle(s, from);
  const totalVol = Object.keys(vol).reduce((a,k)=>a+vol[k],0);
  const prCount = inPeriod.length ? countPRs(s, from) : 0;
  h += '<div class="sect"><h2 class="sub">' + esc(t('progress.overview')) + '</h2><span class="rule"></span>' +
       '<span class="aside">' + esc(periodLabel) + '</span></div>';
  h += metricsBlock([
    { k:t('progress.sessions'), v: inPeriod.length, d: esc(periodLabel), numKey:'prog.sessions' },
    { k:t('progress.volume'), v: totalVol === null ? '—' : Math.round(totalVol/1000), u:'k',
      d: esc(totalVol === null ? t('log.notApplicable') : t('progress.volumeDef')), numKey:'prog.vol' },
    { k:t('body.trend'), v: t('trend.' + overallTrend(s, 21, now)) },
    { k:t('progress.pr'), v: prCount, d: esc(t('progress.prDef')), numKey:'prog.pr' }
  ]);

  if(!s.sessions.length){
    /* Say what is going on first. The fictional example is shown below it,
       explicitly labelled and visually separated from anything personal. */
    h += '<div class="mt-3">' +
      emptyState('progress.nodata', 'progress.nodataBody', 'chart',
        '<button class="btn" data-act="go" data-a1="session">' + esc(t('progress.start')) + '</button>', 2) +
      '</div>';
    h += '<div class="panel mt-3">' +
      '<div class="eyebrow mb-2">' + esc(t('progress.sample')) + '</div>' +
      '<p class="body-sm mb-3">' + esc(t('progress.sampleNote')) + '</p>' +
      sampleChart() + '</div>';
    h += bodyweightTrendPanel(s);
    return { html: h };
  }

  /* --- volume by muscle --- */
  /* One series, one colour. The old rows carried col:'var(--burnt)' — a token
     inside a presentation attribute, which no browser resolves; the only reason
     the bars had a colour was a stylesheet rule overriding it. */
  const volRows = MUSCLES.map(m => ({ v: vol[m], name: t('mg.'+m),
                                      short: esc(t('mg.'+m)).slice(0,3).toUpperCase() }))
                        .filter(r => r.v > 0);
  h += '<div class="panel mt-3">';
  if(volRows.length){
    h += barChart({ title: t('progress.volume'), period: periodLabel, unit: unit() + '·reps', rows: volRows, highlightMax: true });
  } else {
    h += '<div class="uncertain"><b>' + esc(t('log.notApplicable')) + '</b> ' +
         esc(t('log.volumeNote')) + '</div>';
  }
  h += '<p class="hint mt-2">' + esc(t('progress.volumeDef')) +
       (volumePartiallyUnknown(s, from) ? ' ' + esc(t('log.volumeNote')) : '') + '</p></div>';

  /* --- per-exercise detail --- */
  const exIds = [];
  s.sessions.forEach(x => (x.exercises||[]).forEach(e => {
    if(exIds.indexOf(e.id) < 0 && EX_BY_ID[e.id]) exIds.push(e.id); }));
  if(!PROG_EX || exIds.indexOf(PROG_EX) < 0) PROG_EX = exIds[0];
  const progEx = EX_BY_ID[PROG_EX];

  /* Every record in this log names an exercise this build does not have: the
     log is intact and still exported as it is, but there is nothing to plot.
     Say that, instead of drawing an empty chart or crashing the screen. */
  if(progEx){
  h += '<div class="sect"><h2 class="sub">' + esc(t('progress.detail')) + '</h2><span class="rule"></span></div>';
  h += '<div class="panel">';
  h += '<div class="chips mb-3">';
  [30,90,0].forEach(pd => {
    h += '<button class="chip sm ' + (PROG_PERIOD===pd?'on':'') + '" data-act="setPeriod" data-a1="' + pd + '" data-t1="l">' +
         esc(pd===0?t('progress.pall'):pd===30?t('progress.p30'):t('progress.p90')) + '</button>';
  });
  h += '</div>';
  h += '<div class="chips mb-3">' +
       exIds.map(id => '<button class="chip sm ' + (PROG_EX===id?'on':'') + '" data-act="setProgEx" data-a1="' + id + '">' + esc(t('ex.'+id)) + '</button>').join('') + '</div>';

  const eps = exerciseHistory(PROG_EX).filter(h2 => h2.date >= from).map(h2 => {
    const b = bestSetScore(workingSets(h2.sets), progEx, s.profile);
    return b && b.metrics.score !== null && b.metrics.basis === 'e1rm'
      ? { label: dateLabel(h2.date), v: b.metrics.score, best: false } : null;
  }).filter(Boolean);
  if(eps.length){ const mx = eps.reduce((a,r)=>r.v>a.v?r:a, eps[0]); mx.best = true; }
  const setPts = exerciseHistory(PROG_EX).filter(h2 => h2.date >= from).map(h2 => ({
    label: dateLabel(h2.date), v: workingSets(h2.sets).length, best: false
  })).filter(p => p.v > 0);
  if(setPts.length){ const mx = setPts.reduce((a,r)=>r.v>a.v?r:a, setPts[0]); mx.best = true; }

  const availMetrics = [{ id:'primary', label: t(chartLabelKey(progEx)) }];
  if(eps.length >= 1) availMetrics.push({ id:'e1rm', label: t('chart.e1rm') });
  availMetrics.push({ id:'sets', label: t('progress.sets') });
  const activeMetric = availMetrics.some(m => m.id === PROG_METRIC) ? PROG_METRIC : 'primary';

  h += '<div class="chips mb-4"  role="group" aria-label="' + esc(t('chart.metric')) + '">' +
       availMetrics.map(m =>
         '<button class="chip sm ' + (activeMetric===m.id?'on':'') + '" data-act="setProgMetric" data-a1="' + m.id + '">' +
         esc(m.label) + '</button>'
       ).join('') +
       '<button class="btn quiet sm push" data-act="openExerciseDetail" data-a1="' + PROG_EX + '" ' +
       'aria-label="' + esc(t('exd.open') + ' — ' + t('ex.' + PROG_EX)) + '">' +
       esc(t('exd.open')) + '</button></div>';

  if(activeMetric === 'e1rm'){
    h += lineChart({ title: t('ex.'+PROG_EX) + ' — ' + t('chart.e1rm'),
                     period: periodLabel, unit: unit() + ' (' + t('c.est') + ')',
                     label: t('chart.e1rm'), points: eps });
  } else if(activeMetric === 'sets'){
    h += lineChart({ title: t('ex.'+PROG_EX) + ' — ' + t('progress.sets'),
                     period: periodLabel, unit: t('c.sets'),
                     label: t('progress.sets'), points: setPts });
  } else {
    const pts = sessionSeries(s, PROG_EX, from);
    h += lineChart({ title: t('ex.'+PROG_EX) + ' — ' + t(chartLabelKey(progEx)),
                     period: periodLabel, unit: chartUnit(progEx, unit()),
                     label: t(chartLabelKey(progEx)), points: pts });
  }
  h += '<p class="hint mt-2">' +
       esc(t('chart.basis')) + ': ' + esc(t(chartBasisKey(progEx, s.profile))) + ' · ' + esc(t('hist.note')) + '</p>';
  h += '</div>';

  } else {
    h += '<div class="sect"><h2 class="sub">' + esc(t('progress.detail')) + '</h2><span class="rule"></span></div>';
    h += '<div class="panel"><div class="uncertain"><b>' + esc(t('state.none')) + '</b> ' +
         esc(t('progress.unknownEx')) + '</div></div>';
  }

  /* --- session table --- */
  h += '<div class="sect"><h2 class="sub">' + esc(t('progress.table')) + '</h2><span class="rule"></span></div>';
  h += '<div class="panel flush"><div class="table-wrap"><table class="data">' +
       '<caption>' + esc(periodLabel) + '</caption><thead><tr>' +
       '<th>' + esc(t('progress.date')) + '</th><th>' + esc(t('progress.exercise')) + '</th>' +
       '<th class="end">' + esc(t('progress.sets')) + '</th>' +
       '<th class="end">' + esc(t('progress.best')) + '</th>' +
       '<th class="end">' + esc(t('hist.edit')) + '</th></tr></thead><tbody>';
  const rows = s.sessions.filter(x => x.date >= from).sort((a,b)=>b.date-a.date).slice(0,40);
  if(!rows.length){
    h += '<tr><td colspan="5" class="td-empty">' +
         esc(t('state.noresult')) + '</td></tr>';
  }
  rows.forEach(sess => {
    (sess.exercises||[]).forEach((e,i) => {
      const ex = EX_BY_ID[e.id]; if(!ex) return;
      const done = workingSets(e.sets);
      if(!done.length) return;
      const b = bestSetScore(done, ex, s.profile);
      const idx = (sess.exercises||[]).indexOf(e);
      /* The date cell is the only place that is per session rather than per
         row, so the session's own actions live there: one control, one sheet. */
      h += '<tr><td>' + (i===0
             ? '<span class="td-date">' + esc(dateLabel(sess.date)) + '</span>' +
               '<button class="link-btn" data-act="openPrintRecord" data-a1="' + sess.id + '" ' +
               'aria-label="' + esc(t('pa.printRecord')) + ' · ' + esc(dateLabel(sess.date)) + '">' +
               esc(t('pa.printShort')) + '</button>'
             : '') + '</td>' +
           '<td><button type="button" class="link-btn" data-act="openExerciseDetail" data-a1="' + e.id + '">' +
           esc(t('ex.'+e.id)) + '</button></td><td class="n">' + done.length + '</td>' +
           '<td class="n">' + esc(b ? formatSet(b.set, ex, s.profile) : '—') + '</td>' +
           '<td class="n"><button class="btn quiet sm" data-act="openSessionEditor" data-a1="' + sess.id +
           '" data-a2="' + idx + '" data-t2="l">' + esc(t('hist.edit')) + '</button></td></tr>';
    });
  });
  h += '</tbody></table></div></div>';
  h += '<p class="hint">' + esc(t('hist.recalcNote')) + '</p>';

  /* --- personal records --- */
  h += '<div class="sect"><h2 class="sub">' + esc(t('progress.pr')) + '</h2><span class="rule"></span></div>';
  h += '<div class="panel flush"><div class="table-wrap"><table class="data"><thead><tr>' +
       '<th>' + esc(t('progress.exercise')) + '</th>' +
       '<th>' + esc(t('progress.pr')) + '</th>' +
       '<th>' + esc(t('progress.date')) + '</th></tr></thead><tbody>';
  let any = false;
  exIds.forEach(id => {
    const ex = EX_BY_ID[id]; if(!ex) return;
    const pb = personalBest(id); if(!pb) return;
    const hist = exerciseHistory(id);
    if(hist.length < 2) return;                 // a baseline is not a record
    any = true;
    h += '<tr><td>' + esc(t('ex.'+id)) + '</td><td class="n">' +
         esc(formatSet(pb.set, ex, s.profile)) + '</td><td class="n">' +
         esc(dateLabel(pb.date)) + '</td></tr>';
  });
  if(!any) h += '<tr><td colspan="3" class="td-empty">' +
                esc(t('hist.pr.none')) + '</td></tr>';
  h += '</tbody></table></div></div>';

  /* --- verifiable training milestones --- */
  h += milestonesPanel(s, now);

  /* --- optional bodyweight trend log --- */
  h += bodyweightTrendPanel(s);

  return { html: h };
};

function bodyweightTrendPanel(s){
  const list = (s.bodyweights || []).slice().sort((a,b) => a.date - b.date);
  const u = unit();
  const latest = list.length ? list[list.length - 1] : null;
  let avg7 = null;
  if(list.length >= 2){
    const tail = list.slice(-7);
    avg7 = Math.round(tail.reduce((acc, x) => acc + x.w, 0) / tail.length * 10) / 10;
  }
  let h = '<div class="sect"><h2 class="sub">' + esc(t('profile.bodyweight')) + '</h2><span class="rule"></span>' +
          '<span class="aside"><button type="button" class="chip sm" data-act="openSheet" data-a1="bw">+ ' +
          esc(t('bw.log')) + '</button></span></div>';
  h += '<div class="panel">';
  if(!list.length){
    h += '<p class="body-sm mb-3">' + esc(t('bw.empty')) + '</p>' +
         '<button type="button" class="btn quiet sm" data-act="openSheet" data-a1="bw">+ ' + esc(t('bw.log')) + '</button>';
  } else {
    h += '<div class="chips mb-3">' +
         '<span class="flag accent">' + esc(t('bw.latest')) + ': ' + latest.w + ' ' + esc(u) + '</span>' +
         (avg7 !== null ? '<span class="flag plain">' + esc(t('bw.rolling')) + ': ' + avg7 + ' ' + esc(u) + '</span>' : '') +
         '<span class="flag plain">' + list.length + ' ' + esc(t('sleep.entries')) + '</span></div>';
    if(list.length >= 2){
      const pts = list.slice(-24).map(b => ({ label: dateLabel(b.date), v: b.w, best: false, text: b.w + ' ' + u }));
      h += lineChart({ title: t('profile.bodyweight'), period: list.length + ' ' + t('sleep.entries'),
                       unit: u, label: t('profile.bodyweight'), points: pts });
    } else {
      h += '<p class="body-sm">' + esc(t('bw.oneNote')) + '</p>';
    }
    h += '<p class="hint mt-2">' + esc(t('modB.s4.cap')) + '</p>';
  }
  h += '</div>';
  return h;
}

/* How many exercises hit a genuine personal record in their most recent
   outing. A first-ever exposure is a baseline and is not counted. */
/* Records set in a period — not "exercises whose newest row happens to be one".
   The metric sits in a block headed by the period, so it has to answer about
   the period: every logged row inside it is compared with everything strictly
   before it. A row that ties the previous best is not a record, and a first
   exposure is a baseline, which is why the count is honest on both ends. */
function countPRs(s, from){
  const cutoff = from || 0;
  let n = 0;
  (s.sessions || []).forEach(sess => {
    if(sess.date < cutoff) return;
    (sess.exercises || []).forEach(e => {
      /* exerciseHistory() is the only place that decides what counts as a
         completed set, so the row is looked up there rather than re-derived. */
      const row = exerciseHistory(e.id).filter(h => h.sessionId === sess.id)[0];
      if(!row) return;
      if(recordKind(s, e.id, row.sets, { excludeRow: row }) === 'pr') n++;
    });
  });
  return n;
}

/* A clearly-labelled fictional example, shown only when there is no real data. */
function sampleChart(){
  return '<div style="border:1px dashed var(--line);padding:var(--s3);border-radius:var(--r-sm)">' +
    '<div class="eyebrow mb-2">' + esc(t('progress.sample')) + ' — ' +
    esc(t('progress.sampleNote')) + '</div>' +
    lineChart({ title: t('chart.load') + ' — ' + t('progress.sample'),
      period: '8 ' + t('progress.sessions'), unit: 'kg', label: t('chart.load'),
      points: [58,60,60,62.5,62.5,65,65,67.5].map((v,i) =>
        ({ label: 'S'+(i+1), v: v, best: i===7 })) }) + '</div>';
}


/* =====================================================================
   HISTORY EDITOR

   A logged set can be wrong: a mistyped 80 instead of 60, a set that was
   never done, a warm-up recorded as work. Those numbers feed volume,
   records, trends and progression, so a correction has to change all of
   them — not just the row.

   Edits are kept in EDIT.draft until Save, so typing does not fight with
   re-rendering, and every change goes through updateSet / deleteSet, which
   save once and leave no cached figure behind.
   ===================================================================== */
let EDIT = null;

function openSessionEditor(sessionId, exIdx){
  const sess = findSession(sessionId);
  if(!sess || !sess.exercises[exIdx]) return;
  EDIT = { sessionId: sessionId, exIdx: exIdx,
           draft: sess.exercises[exIdx].sets.map(x => Object.assign({}, x)) };
  renderSessionEditor();
}

function renderSessionEditor(){
  if(!EDIT) return;
  const sess = findSession(EDIT.sessionId);
  if(!sess){ EDIT = null; closeSheet(); return; }
  const e = sess.exercises[EDIT.exIdx];
  if(!e){ EDIT = null; closeSheet(); return; }
  const ex = EX_BY_ID[e.id];
  const spec = exLogSpec(ex);
  const u = unit();
  let h = '<p class="body-sm mb-3">' + esc(t('hist.hint')) + '</p>';
  h += '<div class="panel-hd mb-3"><h3 class="sub">' +
       esc(t('ex.'+e.id)) + '</h3><span class="hint">' + esc(dateLabel(sess.date)) + '</span></div>';

  EDIT.draft.forEach((set, i) => {
    h += '<div class="setcard" style="padding:var(--s3)">';
    h += '<div class="set-head"><span class="eyebrow">' + esc(t('hist.setRow', { n:i+1 })) + '</span>' +
         (set.warmup ? '<span class="flag sm plain">' + esc(t('hist.warmupRow')) + '</span>' : '') + '</div>';
    h += '<div class="editrow">';
    spec.fields.concat(spec.optional).forEach(f => {
      if(f.key === 'rir') return;
      let val = set[f.attr];
      if(f.key === 'distance') val = (val === '' || val === null) ? '' : (Math.round(toDisplayDistance(+val, u)*10)/10);
      const labelKey = f.key === 'load' ? (spec.loadRole === 'added' ? 'log.added' : 'log.load') : f.labelKey;
      h += '<div class="fld"><label class="fld-cap" for="ed_' + i + '_' + f.attr + '">' +
           esc(t(labelKey)) + '</label>' +
           '<input id="ed_' + i + '_' + f.attr + '" type="number" inputmode="decimal" step="' + f.step + '" placeholder="—" value="' +
           esc(val === null || val === undefined ? '' : val) + '" data-in="editField" data-a1="' + i + '" data-t1="l" data-a2="' +
           f.attr + '" data-t3="v"><span class="u">' +
           esc(f.key === 'distance' ? distanceUnit(u)
             : (f.key === 'time' ? t('log.unit.s')
             : (f.key === 'reps' ? t('log.repsShort') : u))) + '</span></div>';
    });
    h += '<button class="btn sm" data-act="saveEditedSet" data-a1="' + i + '" data-t1="l">' + esc(t('hist.save')) + '</button>';
    h += '<button class="btn quiet sm" data-act="markWarmupEditedSet" data-a1="' + i + '" data-t1="l" aria-pressed="' +
         (set.warmup ? 'true' : 'false') + '">' + esc(t('hist.warmupRow')) + '</button>';
    h += '<button class="btn danger sm" data-act="deleteEditedSet" data-a1="' + i + '" data-t1="l">' + esc(t('hist.delSet')) + '</button>';
    h += '</div></div>';
  });

  h += '<div class="row mt-4">' +
       '<button class="btn" data-act="closeSessionEditor">' + esc(t('btn.done')) + '</button>' +
       '<button class="btn danger" data-act="deleteWholeSession">' + esc(t('hist.delSession')) + '</button></div>';
  sheet(t('hist.title'), h);
}

function editField(i, attr, v){
  if(!EDIT || !EDIT.draft[i]) return;
  EDIT.draft[i][attr] = (attr === 'd')
    ? ((v === '' || v === null) ? '' : fromDisplayDistance(+v, unit()))
    : v;
}
function saveEditedSet(i){
  if(!EDIT || !EDIT.draft[i]) return;
  const sess = findSession(EDIT.sessionId);
  const e = sess && sess.exercises[EDIT.exIdx]; if(!e) return;
  const ex = EX_BY_ID[e.id];
  const set = EDIT.draft[i];
  if(!isSetComplete(set, ex)){ toast(t('session.empty')); return; }
  const patch = normaliseLoggedSet(set, ex);
  if(set.warmup !== e.sets[i].warmup) patch.warmup = !!set.warmup;
  updateSet(EDIT.sessionId, EDIT.exIdx, i, patch);
  EDIT.draft[i] = Object.assign({}, findSession(EDIT.sessionId).exercises[EDIT.exIdx].sets[i]);
  toast(t('hist.edited'), 'ok');
  render(); renderSessionEditor();
}
function markWarmupEditedSet(i){
  if(!EDIT || !EDIT.draft[i]) return;
  EDIT.draft[i].warmup = !EDIT.draft[i].warmup;
  const sess = findSession(EDIT.sessionId);
  if(sess && sess.exercises[EDIT.exIdx] && sess.exercises[EDIT.exIdx].sets[i]){
    updateSet(EDIT.sessionId, EDIT.exIdx, i, { warmup: !!EDIT.draft[i].warmup });
    render();
  }
  renderSessionEditor();
}
function deleteEditedSet(i){
  if(!EDIT) return;
  const sess = findSession(EDIT.sessionId);
  if(!sess || !sess.exercises[EDIT.exIdx]) return;
  deleteSet(EDIT.sessionId, EDIT.exIdx, i);
  pruneEmptySessions();
  const s2 = findSession(EDIT.sessionId);
  if(!s2 || !s2.exercises[EDIT.exIdx]){ EDIT = null; closeSheet(); toast(t('hist.setDeleted')); render(); return; }
  EDIT.draft = s2.exercises[EDIT.exIdx].sets.map(x => Object.assign({}, x));
  toast(t('hist.setDeleted'));
  render(); renderSessionEditor();
}
function deleteWholeSession(){
  if(!EDIT) return;
  if(!confirm(t('hist.deleteSessionConfirm'))) return;
  deleteSession(EDIT.sessionId);
  EDIT = null; closeSheet(); toast(t('hist.sessionDeleted')); render();
}
function closeSessionEditor(){ EDIT = null; closeSheet(); render(); }

function setPeriod(p){ PROG_PERIOD = p; render(); }
function setProgEx(id){ PROG_EX = id; render(); }
function setHistEx(id){ PROG_EX = id; render(); }
function delSession(id){ if(confirm(t('dlg.confirm'))){ deleteSession(id); render(); } }

/* ===================================================================== */
/*  PROFILE                                                               */
/* ===================================================================== */
function setEnvEquip(envId){
  const s = getState();
  const mapEq = envId === 'gym' ? 'gym' : envId === 'home' ? 'home' : 'minimal';
  profileSet(s.profile, 'environment', envId);
  profileSet(s.profile, 'equipment', mapEq);
  saveState(); render();
}

Screens.profile = function(){
  const s = getState(), p = s.profile;
  const eq = EQUIP_SETS[p.equipment] || EQUIP_SETS.gym;
  const avail = EX.filter(e => eq.indexOf(e.equip) >= 0);
  const enabledCount = avail.filter(e => !p.exercises || p.exercises[e.id] !== false).length;

  /* What the page is set to, before it asks what you would like to change.
     Eleven panels at full height was a form 621 words long; four records that
     name their own value is a page you can read in one pass. */
  const backupDue = s.sessions.length >= 5 && (!s.lastExportAt || (Date.now() - s.lastExportAt) > 30*86400000);
  const needCount = NEEDS.filter(n => needOn(p, n.id)).length;
  const styleName = t('onb.style.' + (p.style || 'std'));
  /* The summary has to answer the question the fold creates: "where do I change
     X?". Units sit inside the open Programme group, but a person scanning for
     them reads the summary first, so the unit in use is one of the four facts
     it states. Data states when it was last exported for the same reason —
     "Export" was the one setting with no sign it existed until you opened it. */
  /* Equipment and unit are one unit of text: the unit never wraps alone. */
  const valProgramme = [styleName, p.daysPerWeek + 'd', t('onb.avail.len.' + (p.sessionMinutes || 50))].join(' · ') + ' · ' +
                       [t('onb.equip.' + (p.equipment === 'minimal' ? 'min' : (p.equipment || 'gym'))).replace(/ /g, '\u00a0'), unit()].join('\u00a0·\u00a0');
  const valBody = [t('onb.shift.' + ({none:'no', night:'night', rotating:'rot'}[p.shiftType] || 'no')),
                   p.sleepHours + ' ' + t('onb.sleep.h'),
                   needCount ? needCount + ' ' + t('a11y.needsTitle') : ''].filter(Boolean).join(' · ');
  const valA11y = [Math.round((p.display.textScale || 1) * 100) + '%',
                   p.display.highContrast ? t('a11y.contrast') : '',
                   langName(CURRENT_LANG)].filter(Boolean).join(' · ');
  const valData = [s.sessions.length + ' ' + t('progress.sessions'),
                   t('you.lastBackup') + ' ' + (s.lastExportAt ? dateLabel(s.lastExportAt) : '—')].join(' · ');
  const groupOpen = (title, value, open) =>
    '<details class="prof-group"' + (open ? ' open' : '') + '><summary>' +
    '<h2>' + esc(title) + '</h2>' +
    (value ? '<span class="prof-val">' + esc(value) + '</span>' : '') + '</summary>';
  const groupClose = '</details>';

  let h = '<div class="masthead"><div>' +
          '<p class="masthead-idx">' + esc(t('onb.style.' + (p.style || 'std'))) + ' · ' +
          esc(t('onb.equip.' + (p.equipment === 'minimal' ? 'min' : (p.equipment || 'gym')))) + '</p>' +
          '<h1 class="masthead-title">' + esc(t('profile.title')) + '</h1></div>' +
          '<div class="row">' +
          '<button class="btn sm" data-act="rebuildPlan">' + esc(t('profile.rebuild')) + '</button>' +
          '<button class="btn quiet sm" data-act="go" data-a1="onb">' + esc(t('onb.redo')) + '</button></div></div>';

  h += '<div class="profile-grid">';

  /* ==================== LEFT COLUMN: TRAINING & PROGRAMME ==================== */
  h += '<div class="profile-col">';
  h += groupOpen(t('profile.gProgramme'), valProgramme, true);

  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('prog.title')) + '</h3></div>';
  h += '<div class="field"><label for="pf_name">' + esc(t('onb.name')) + '</label>' +
       '<input id="pf_name" type="text" value="' + esc(p.name) + '" data-in="setP" data-a1="name" data-t2="v"></div>';
  h += '<div class="field"><label>' + esc(t('onb.exp.t')) + '</label><div class="chips">' +
       ['b','i','a'].map(g => '<button class="chip sm ' + (p.experience===g?'on':'') + '" data-act="setP" data-a1="experience" data-a2="' + g + '">' + esc(t('onb.exp.'+g)) + '</button>').join('') + '</div></div>';
  h += '<div class="grid2"><div class="field"><label>' + esc(t('onb.avail.t')) + '</label><div class="chips">' +
       [2,3,4,5,6].map(d => '<button class="chip sm ' + (p.daysPerWeek===d?'on':'') + '" data-act="setP" data-a1="daysPerWeek" data-a2="' + d + '" data-t2="l">' + d + '</button>').join('') + '</div></div>' +
       '<div class="field"><label>' + esc(t('onb.avail.len')) + '</label><div class="chips">' +
       [20,35,50,70].map(m => '<button class="chip sm ' + (p.sessionMinutes===m?'on':'') + '" data-act="setP" data-a1="sessionMinutes" data-a2="' + m + '" data-t2="l">' + esc(t('onb.avail.len.'+m)) + '</button>').join('') +
       '</div></div></div>';
  h += '<div class="field mb-0"><label>' + esc(t('profile.limits')) + '</label><div class="chips">' +
       [['shoulder','shoulder'],['knee','knee'],['lowerback','lowback'],['wrist','wrist'],['elbow','elbow']].map(x =>
       '<button class="chip sm ' + (p.limits.indexOf(x[0])>=0?'on':'') + '" data-act="setLimit" data-a1="' + x[0] + '">' +
       esc(t('onb.limits.'+x[1])) + '</button>').join('') + '</div>' +
       '<p class="hint mt-1">' + esc(t('onb.limits.note')) + '</p></div>';
  h += '</div>';

  /* Goals */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('onb.goal.t')) +
       '</h3><span class="hint">' + esc(t('onb.whyBody')) + '</span></div>';
  h += '<div class="chips">' + GOALS.map(g =>
    '<button class="chip ' + (hasGoal(p, g.id) ? 'on' : '') + '" data-act="toggleGoalP" data-a1="' + g.id +
    '" aria-pressed="' + (hasGoal(p, g.id) ? 'true' : 'false') + '">' + esc(t(g.label)) + '</button>').join('') + '</div></div>';

  /* Training focus. Sits directly under Goals because it is the other half of
     the same question: Goals says what the training is FOR, this says where the
     week leans. The stale banner appears only when the plan in hand was built
     with a different answer — never on a fresh plan. */
  /* Folded, not hidden. Goals is the question the profile is organised around;
     where the week *leans* is a refinement of it, and it is already stated in
     words above every plan and on the session screen. Putting thirteen more
     controls on the surface would double the length of a page whose whole point
     is that it stays short — so it is one summary line that names its own
     current answer, and the controls are one tap behind it. */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('profile.focus')) +
       '</h3></div>';
  const emphNow = EMPHASIS.filter(e => e.id === (p.emphasis || 'balanced'))[0] || EMPHASIS[0];
  const prNow = (p.priorities || []).length;
  h += '<details class="prof-sub"' + (planFocusStale(s) ? ' open' : '') + '>' +
       '<summary><span class="prof-sub-t">' + esc(t(emphNow.label)) + '</span>' +
       (prNow ? '<span class="prof-sub-v">\u00b7 ' + esc(prNow === 1 ? t('profile.focusOne') : t('profile.focusN', {n: prNow})) + '</span>' : '') +
       (planFocusStale(s) ? '<span class="flag warn">' + esc(t('focus.shortStale')) + '</span>' : '') +
       '</summary><div class="prof-sub-body">';
  if(planFocusStale(s)){
    h += banner('warn', t('focus.stale'), '') +
         '<div class="row mb-3"><button class="btn sm" data-act="rebuildPlan">' +
         esc(t('focus.rebuild')) + '</button></div>';
  }
  h += '<div class="tiles">' + EMPHASIS.map(e =>
    '<button type="button" class="tile radio ' + ((p.emphasis || 'balanced') === e.id ? 'on' : '') + '" ' +
    'aria-pressed="' + ((p.emphasis || 'balanced') === e.id ? 'true' : 'false') + '" ' +
    'data-act="setEmphasis" data-a1="' + e.id + '">' +
    '<span class="box"></span><span><span class="t">' + esc(t(e.label)) + '</span>' +
    '<span class="d">' + esc(t(e.desc)) + '</span></span></button>').join('') + '</div>';
  h += '<p class="hint mt-3">' + esc(t('profile.focusHint')) + '</p>';
  h += '<div class="mt-4"><p class="eyebrow mb-2">' + esc(t('profile.priorities')) + '</p>' +
       '<div class="chips">' + PRIORITY_GROUPS.filter(g => g.id !== 'balanced').map(g => {
         const on = (p.priorities || []).indexOf(g.id) >= 0;
         return '<button type="button" class="chip ' + (on ? 'on' : '') + '" ' +
           'aria-pressed="' + (on ? 'true' : 'false') + '" data-act="togglePriority" data-a1="' + g.id + '">' +
           esc(t(g.label)) + '</button>';
       }).join('') + '</div>' +
       '<p class="hint mt-2">' + esc(t('profile.prioritiesHint')) + '</p></div>';
  h += '</div></details></div>';

  /* Training Style, Bodyweight & Units */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('onb.style.t')) + '</h3></div>';
  h += '<div class="tiles">' +
    ['hit','std','min','freq'].map(k =>
      '<button class="tile radio ' + (p.style===k?'on':'') + '" data-act="setP" data-a1="style" data-a2="' + k + '">' +
      '<span class="box"></span><span><span class="t">' + esc(t('onb.style.'+k)) + '</span>' +
      '<span class="d">' + esc(t('onb.style.'+k+'.d')) + '</span></span></button>').join('') + '</div>';
  h += '<div class="grid2 mt-4"><div class="field mb-0"><label for="pf_bw">' +
       esc(t('profile.bodyweight')) + ' <span class="hint">' + esc(t('c.optional')) + '</span></label>' +
       '<input id="pf_bw" type="number" inputmode="decimal" step="any" min="0" placeholder="—" value="' +
       (p.bodyweight === null || p.bodyweight === undefined ? '' : esc(p.bodyweight)) +
       '" data-in="setBodyweight" data-t1="v"><p class="hint mt-1">' + esc(t('profile.bodyweightHint')) + '</p></div>' +
       '<div class="field mb-0"><label>' + esc(t('onb.units.t')) + '</label><div class="chips">' +
       '<button class="chip ' + (p.unit==='kg'?'on':'') + '" data-act="setP" data-a1="unit" data-a2="kg">' + esc(t('onb.units.kg')) + '</button>' +
       '<button class="chip ' + (p.unit==='lb'?'on':'') + '" data-act="setP" data-a1="unit" data-a2="lb">' + esc(t('onb.units.lb')) + '</button></div></div></div>';
  h += '</div>';

  /* Unified Environment & Equipment */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('profile.environment')) + '</h3></div>' +
       '<div class="tiles">' + ENVIRONMENTS.map(env =>
       '<button class="tile radio ' + (p.environment === env.id ? 'on' : '') + '" data-act="setEnvEquip" data-a1="' + env.id + '"><span class="box"></span>' +
       '<span><span class="t">' + esc(t(env.label)) + '</span><span class="d">' + esc(t(env.desc)) +
       '</span></span></button>').join('') + '</div></div>';

  /* Exercise Pool Summary + Full Atlas Launchpad */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('profile.exercises')) + '</h3>' +
       '<span class="hint">' + numExpr(enabledCount + ' / ' + avail.length) + '</span></div>';
  h += '<p class="body-sm mb-3">' + esc(t('onb.ex.d')) + '</p>';
  h += '<p class="hint mb-3">' + esc(t('onb.ex.hint')) + '</p>';
  h += '<button type="button" class="btn quiet block mb-3"  data-act="openExerciseLibrary">' +
       esc(t('plan.tabLibrary')) + ' (' + EX.length + ')</button>';
  /* Same component as the onboarding step, for the same reason: this is a list
     of things you remove from, not a form you fill in. It used to be twelve
     disclosures of an older pattern with the first two forced open — a second
     accordion that behaved differently for no reason. */
  const byPat = {};
  avail.forEach(e => { (byPat[e.pat] = byPat[e.pat] || []).push(e); });
  Object.keys(byPat).forEach(pat => {
    const list = byPat[pat];
    const patOn = list.filter(e => !p.exercises || p.exercises[e.id] !== false).length;
    const changed = patOn < list.length;
    h += '<details class="dis onb-ex-group"' + (changed ? ' open' : '') + '>' +
         '<summary><span class="dis-t">' + esc(t('pat.'+pat)) + '</span>' +
         '<span class="flag sm ' + (changed ? 'warn' : 'plain') + '">' +
         numExpr(patOn + ' / ' + list.length) + '</span></summary>' +
         '<div class="chips mt-2">' + list.map(e => {
           const on = p.exercises ? p.exercises[e.id] !== false : true;
           return '<button type="button" class="chip sm ' + (on?'on':'') + '" ' +
                  'aria-pressed="' + (on ? 'true' : 'false') + '" ' +
                  'data-act="toggleEx" data-a1="' + e.id + '">' +
                  esc(t('ex.'+e.id)) + '</button>';
         }).join('') + '</div></details>';
  });
  if(enabledCount < avail.length){
    h += '<p class="hint mt-3 mb-0">' + esc(t('plan.excludedCount', { n: avail.length - enabledCount })) +
         ' <button type="button" class="link-btn" data-act="restoreExPool">' +
         esc(t('profile.restorePool')) + '</button></p>';
  }
  h += '</div>';

  /* Session alert. Opt-in, and the hint says what it can and cannot do: a
     promise the platform cannot keep is worse than no promise. */
  const notifyOn = p.restNotify === true;
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('rest.notifyT')) + '</h3>' +
       '<span class="flag sm ' + (notifyOn ? 'ok' : 'plain') + '">' +
       esc(notifyOn ? t('rest.notifyStateOn') : t('rest.notifyStateOff')) + '</span></div>';
  h += '<button type="button" class="tile ' + (notifyOn ? 'on' : '') + '" role="switch" ' +
       'aria-checked="' + (notifyOn ? 'true' : 'false') + '" data-act="setRestNotify">' +
       '<span class="box"></span><span><span class="t">' + esc(t('rest.notifyLbl')) +
       '</span><span class="d">' + esc(t('rest.notifyHint')) + '</span></span></button>';
  if(!restAlertSupported()){
    h += '<p class="hint mt-2">' + esc(t('rest.notifyUnsupported')) + '</p>';
  } else if(notifyOn && typeof Notification !== 'undefined' && Notification.permission !== 'granted'){
    h += '<p class="hint mt-2">' + esc(t('rest.notifyBlocked')) + '</p>';
  }
  h += '</div>';

  h += groupClose;
  h += '</div>'; /* end left profile-col */

  /* ==================== RIGHT COLUMN: ADAPTATION, SCHEDULE & DATA ==================== */
  h += '<div class="profile-col">';

  /* Schedule & Sleep */
  h += groupOpen(t('profile.gBody'), valBody, false);
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('profile.planning')) +
       '</h3><span class="hint">' + esc(t('onb.shift.note')) + '</span></div>';
  h += '<div class="field"><label>' + esc(t('onb.shift.t')) + '</label><div class="chips">' +
       [['none','no'],['night','night'],['rotating','rot']].map(x =>
       '<button class="chip sm ' + (p.shiftType===x[0]?'on':'') + '" data-act="setP" data-a1="shiftType" data-a2="' + x[0] + '">' + esc(t('onb.shift.'+x[1])) + '</button>').join('') + '</div></div>';
  h += '<div class="field"><label for="pf_slp">' + esc(t('onb.sleep.t')) + '</label>' +
       '<div class="row nowrap row-base">' +
       '<span class="num num-lg">' + p.sleepHours + '</span>' +
       '<span class="hint">' + esc(t('onb.sleep.h')) + '</span></div>' +
       '<input id="pf_slp" type="range" min="3" max="11" step="0.5" value="' + p.sleepHours +
       '" data-in="setP" data-a1="sleepHours" data-t2="N"></div>';
  h += '<div class="field mb-0"><label for="pf_wake">' + esc(t('onb.sleep.wake')) + '</label>' +
       '<input id="pf_wake" type="time" value="' + String(p.usualWake).padStart(2,'0') +
       ':00" data-in="setP" data-a1="usualWake" data-t2="hour"></div>';
  h += '<div class="row mt-3">' +
       '<button class="btn quiet sm" data-act="openSheet" data-a1="shift">' + esc(t('home.logshift')) + '</button>' +
       '<button class="btn quiet sm" data-act="openSheet" data-a1="sleep">' + esc(t('home.logsleep')) + '</button>' +
       '<button class="btn quiet sm" data-act="openSheet" data-a1="feel">' + esc(t('home.logfeel')) + '</button></div>';
  h += '</div>';

  /* Adaptations */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('a11y.needsTitle')) +
       '</h3></div><p class="body-sm mb-3">' + esc(t('a11y.needsHint')) + '</p>';
  h += '<div class="chips">' + NEEDS.map(n =>
    '<button class="chip ' + (needOn(p, n.id) ? 'on' : '') + '" data-act="toggleNeedP" data-a1="' + n.id +
    '" aria-pressed="' + (needOn(p, n.id) ? 'true' : 'false') + '">' + esc(t(n.label)) + '</button>').join('') + '</div>';
  h += '<div class="uncertain mt-3"><b>' + esc(t('a11y.disclaimer')) + '</b></div>';
  if(hasAnyNeed(p)){
    const excluded = EX.filter(e => !exerciseAllowed(e, p) && (EQUIP_SETS[p.equipment] || []).indexOf(e.equip) >= 0);
    h += '<p class="hint mt-2">' + excluded.length + ' ' + esc(t('a11y.adaptedOut')) + '</p>';
  }
  h += '<div class="mt-3"><button class="btn quiet sm" data-act="rebuildPlan">' +
       esc(t('profile.rebuild')) + '</button></div></div>';

  h += groupClose;

  /* Display & Accessibility */
  h += groupOpen(t('profile.gAccess'), valA11y, false);
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('a11y.title')) + '</h3></div>';
  h += '<div class="field"><label>' + esc(t('a11y.textSize')) + '</label><div class="chips">' +
       [1, 1.15, 1.3].map(v => '<button class="chip sm ' + (p.display.textScale === v ? 'on' : '') + '" data-act="setDisplay" data-a1="textScale" data-a2="' + v + '" data-t2="l">' + Math.round(v*100) + '%</button>').join('') +
       '</div><p class="hint mt-1">' + esc(t('a11y.textSizeHint')) + '</p></div>';
  h += '<div class="tiles">' +
    '<button class="tile ' + (p.display.theme === 'paper' ? 'on' : '') + '" data-act="setDisplay" data-a1="theme" data-a2="' + (p.display.theme === 'paper' ? 'dark' : 'paper') +
      '" data-t2="l" role="switch" aria-checked="' + (p.display.theme === 'paper' ? 'true' : 'false') + '"><span class="box"></span>' +
      '<span><span class="t">' + esc(t('a11y.theme')) + '</span><span class="d">' + esc(t('a11y.themeHint')) + '</span></span></button>' +
    '<button class="tile ' + (p.display.highContrast ? 'on' : '') + '" data-act="setDisplay" data-a1="highContrast" data-a2="' + (p.display.highContrast ? 'false' : 'true') +
      '" data-t2="l" role="switch" aria-checked="' + (p.display.highContrast ? 'true' : 'false') + '"><span class="box"></span>' +
      '<span><span class="t">' + esc(t('a11y.contrast')) + '</span><span class="d">' + esc(t('a11y.contrastHint')) + '</span></span></button>' +
    '<button class="tile ' + (p.display.reducedMotion === 'on' ? 'on' : '') + '" data-act="setDisplay" data-a1="reducedMotion" data-a2="' + (p.display.reducedMotion === 'on' ? 'auto' : 'on') +
      '" role="switch" aria-checked="' + (p.display.reducedMotion === 'on' ? 'true' : 'false') + '"><span class="box"></span>' +
      '<span><span class="t">' + esc(t('a11y.motion')) + '</span><span class="d">' + esc(t('a11y.motionHint')) + '</span></span></button>' +
    '<button class="tile ' + (p.display.simpleUI ? 'on' : '') + '" data-act="setDisplay" data-a1="simpleUI" data-a2="' + (p.display.simpleUI ? 'false' : 'true') +
      '" data-t2="l" role="switch" aria-checked="' + (p.display.simpleUI ? 'true' : 'false') + '"><span class="box"></span>' +
      '<span><span class="t">' + esc(t('a11y.simple')) + '</span><span class="d">' + esc(t('a11y.simpleHint')) + '</span></span></button>' +
    '</div>';
  h += '<p class="hint mt-2">' + esc(t('keyboard.hint')) + '</p></div>';

  /* Language */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('profile.language')) +
       '</h3></div><div class="tiles">' +
       LANGS.map(l => '<button class="tile radio ' + (CURRENT_LANG===l?'on':'') + '" data-act="switchLang" data-a1="' + l + '"><span class="box"></span>' +
         '<span><span class="t">' + esc(langName(l)) + ' (' + esc(langLabel(l)) + ')</span></span></button>').join('') +
       '</div>' +
       /* If the language you are reading is not fully translated, say so here as
          well as on the first-launch screen: a partly translated interface is a
          fact about the product, not a secret kept in a corner. */
       (function(){
         const cov = (typeof langStatus === 'function') ? langStatus(CURRENT_LANG) : null;
         if(!cov) return '';
         /* Interface first, then the honest caveat about what is not translated.
            Both numbers are measured by langStatus(); neither is typed in. */
         const chrome = (cov.percent < 100)
           ? '<p class="hint mt-2">' + esc(t('lang.coverageNote', { p: cov.percent })) + '</p>' : '';
         const content = (cov.contentPercent !== undefined && cov.contentPercent < 100)
           ? '<p class="hint mt-2">' + esc(t('lang.contentNote', { p: cov.contentPercent })) + '</p>' : '';
         return chrome + content;
       })() +
       '</div>';

  h += groupClose;

  /* Local Data Vault */
  const persistLabel = (typeof STORAGE_PERSISTED !== 'undefined' && STORAGE_PERSISTED === true)
    ? t('you.persistProtected') : t('you.persistStandard');
  h += groupOpen(t('profile.gData'), valData, false);
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('profile.data')) + '</h3>' +
       '<span class="flag sm ' + ((typeof STORAGE_PERSISTED !== 'undefined' && STORAGE_PERSISTED === true) ? 'ok' : 'plain') + '">' +
       esc(persistLabel) + '</span></div>';
  if(backupDue){
    h += banner('warn', t('you.backupDue'), t('you.backupDueBody'));
  }
  h += '<div class="grid3 mb-3">' +
       metric(t('progress.sessions'), s.sessions.length) +
       metric(t('profile.sleepLog'), (s.sleep||[]).length) +
       metric(t('profile.workshifts'), (s.shifts||[]).length) + '</div>';
  h += '<p class="hint mb-3">' + esc(t('you.lastBackup')) + ': ' +
       esc(s.lastExportAt ? dateLabel(s.lastExportAt) : t('state.none')) + ' · ' + esc(t('you.idbNote')) + '</p>';
  h += '<div class="stack">' +
       '<button class="btn quiet" data-act="openSheet" data-a1="bw">+ ' + esc(t('bw.log')) + '</button>' +
       '<button class="btn quiet" data-act="doExport">' + esc(t('you.export')) + '</button>' +
       '<button class="btn quiet" data-act="doImport" data-t1="e">' + esc(t('you.import')) + '</button>' +
       '<button class="btn danger" data-act="doErase">' + esc(t('you.erase')) + '</button></div></div>';

  /* About */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('profile.about')) + '</h3></div>';
  [1,2,3,4,5].forEach(i => { h += '<p class="body-sm mb-2">' +
    esc(t('about.p'+i)) + '</p>'; });
  h += '<div class="uncertain mt-3"><b>' + esc(t('lab3d.credits')) +
       '</b> ' + esc(t('body.note2d')) + '</div>';

  /* Which build is this? A tab can be running yesterday's code against
     today's cache, and until now there was no way to tell from inside the
     page — the header shows the tagline, not a version. */
  const build = (typeof APP_BUILD !== 'undefined') ? APP_BUILD : '—';
  h += '<p class="mono mt-3">' + esc(t('app.build')) + ' ' + esc(build) + '</p>';

  /* The last uncaught error, kept outside the log so it survives the tab. It
     is shown, dated, with the build it came from, and it can be cleared —
     a note that can never be dismissed is clutter, and one that is never
     shown is the same as not keeping it. */
  const crash = (typeof lastCrash === 'function') ? lastCrash() : null;
  if(crash && crash.message){
    const when = crash.at ? dateLabel(crash.at) + ' · ' + hhmm(crash.at) : '';
    h += '<details class="fail-more mt-3"><summary>' +
         esc(t('app.crash.title')) + ' — ' + esc(when) + '</summary>' +
         '<p class="mono mt-2">' + esc((crash.build || '—') + ' · ' + crash.message) + '</p>' +
         (crash.stack ? '<pre>' + esc(String(crash.stack).slice(0, 600)) + '</pre>' : '') +
         '<p class="body-sm mt-2">' + esc(t('app.crash.note')) + '</p>' +
         '<button class="btn quiet sm mt-2" data-act="forgetCrashShown">' +
         esc(t('app.crash.clear')) + '</button></details>';
  }
  h += '</div>';

  h += groupClose;
  /* Explore. Body and Science left the bottom bar because a thumb's map has
     room for four destinations, not six. They are not hidden: each is a full row
     here, drawn with the same mark it had in the bar, and Today links to both. */
  h += groupOpen(t('profile.explore'), t('nav.body') + ' · ' + t('nav.science'), false);
  h += '<div class="stack">' +
       '<button class="btn quiet block nav-link" data-act="go" data-a1="body">' +
         '<svg viewBox="0 0 24 24" aria-hidden="true" class="nav-link-mark">' + NAV_MARK.body + '</svg>' +
         esc(t('nav.body')) + '</button>' +
       '<button class="btn quiet block nav-link" data-act="go" data-a1="science">' +
         '<svg viewBox="0 0 24 24" aria-hidden="true" class="nav-link-mark">' + NAV_MARK.science + '</svg>' +
         esc(t('nav.science')) + '</button>' +
       '</div>';
  h += groupClose;

  h += '</div>'; /* end right profile-col */
  h += '</div>'; /* end profile-grid */
  return { html: h };
};

function toggleGoalP(id){
  const s = getState();
  toggleGoal(s.profile, id);
  saveState(); render();
}
function toggleNeedP(id){
  const s = getState();
  toggleNeed(s.profile, id);
  saveState(); render();
}
function setBodyweight(v){
  const s = getState();
  const n = (v === '' || v === null || v === undefined) ? null : +v;
  s.profile.bodyweight = (n !== null && isFinite(n) && n > 0) ? n : null;
  saveState();
}
function setDisplay(key, value){
  const s = getState();
  s.profile.display = s.profile.display || {};
  s.profile.display[key] = value;
  saveState(); render();
}

function rebuildPlan(){
  const s = getState();
  const wasStale = planFocusStale(s);
  s.plan = buildPlan(s.profile);
  saveState();
  /* The message says which of the two things happened, because "saved" alone
     cannot tell a person whether the programme they are looking at is the new
     one. Logged sessions and any active session are untouched by design. */
  savedToast(wasStale ? 'focus.rebuilt' : 'you.saved');
  go('session');
}
function replayOnboarding(){ const s = getState(); s.onboarded = false; saveState(); onbIdx = 0; go('onb'); }

function doExport(){
  /* Exporting an empty log while the real one sits unreadable would be a claim
     about the wrong data. The strip has the action that makes sense. */
  if(typeof LOAD_FAILED !== 'undefined' && LOAD_FAILED){
    toast(t('app.load.title'), 'alert');
    return;
  }
  const s = getState();
  s.lastExportAt = Date.now();
  saveState();
  const blob = new Blob([exportJSON()], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ancestor-data-' + dateKey(Date.now()) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  toast(t('you.export'),'ok');
  if(VIEW === 'profile') render();
}
/* The busy state, finally attached to something. `.btn.loading` — the masked
   tally that replaced the app's fourth spinner — has existed in the stylesheet
   with no producer: nothing ever set it. Import is the one genuinely async
   action (a file has to be read), so a large record no longer leaves the button
   looking untouched, and a failed read now says so instead of doing nothing. */
function setBtnBusy(btn, on){
  if(!btn || !btn.classList) return;
  btn.classList.toggle('loading', !!on);
  if(on) btn.setAttribute('aria-busy', 'true');
  else btn.removeAttribute('aria-busy');
}
function doImport(btn){
  const i = document.createElement('input');
  i.type = 'file'; i.accept = 'application/json,.json';
  i.onchange = () => {
    const f = i.files[0]; if(!f) return;
    setBtnBusy(btn, true);
    const r = new FileReader();
    r.onload = () => {
      setBtnBusy(btn, false);
      try{ importJSON(r.result); savedToast('you.saved'); go('home'); }
      catch(e){ toast(t('err.generic'),'alert'); }
    };
    r.onerror = () => { setBtnBusy(btn, false); toast(t('err.generic'),'alert'); };
    r.readAsText(f);
  };
  i.click();
}
function doErase(){
  if(!confirm(t('you.erase.warn'))) return;
  if(!confirm(t('dlg.confirm'))) return;
  eraseAll(); ACTIVE = null; clearDraft(); BODY_SEL = null;
  onbIdx = 0; go('onb');
}

/* ===================================================================== */
/*  SHEETS                                                                */
/* ===================================================================== */
let LAST_FOCUS = null;

function focusables(root){
  return Array.prototype.slice.call(root.querySelectorAll(
    'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.classList.contains('skip-link'));
}
function sheetKeyHandler(e){
  if(e.key === 'Escape'){ closeSheet(); return; }
  if(e.key !== 'Tab') return;
  const f = focusables(this);
  if(!f.length) return;
  const first = f[0], last = f[f.length-1];
  if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
}

/* A dialog must be reachable and escapable without a pointer. */
function sheet(title, bodyHtml){
  const host = $('#sheetHost');
  LAST_FOCUS = document.activeElement;
  /* Backdrop fades, panel rises: one coordinated movement, not two. */
  /* The only visible way out used to be a Close button at the very bottom of
     the sheet — 1 845 px down the scroll on a 390 px phone, below the whole
     exercise record. Tap-outside and Escape both worked; nothing said so. The
     title row is sticky and carries the way out, at the top, in reach of a
     thumb. One Close, not two: a second control with the same name is noise for
     a screen reader. */
  host.innerHTML = '<div class="sheet sheet-backdrop" data-act="closeSheetBackdrop">' +
    '<div class="panel sheet-panel" role="dialog" aria-modal="true" aria-label="' + esc(title) + '" tabindex="-1">' +
    '<div class="sheet-hd"><h2>' + esc(title) + '</h2>' +
    '<button type="button" class="btn quiet sm sheet-x" data-act="closeSheet">' +
    esc(t('btn.close')) + '</button></div>' + bodyHtml +
    '</div></div>';
  const panel = host.querySelector('.panel');
  if(panel){
    panel.addEventListener('keydown', sheetKeyHandler);
    /* A picker starts on its current value (or its first option), so one Tab
       or arrow is enough to choose. Other sheets keep the panel as the target:
       focusing a text field there would open a keyboard unasked. */
    const firstPick = panel.querySelector('.pick.on') || panel.querySelector('.pick');
    setTimeout(() => (firstPick || panel).focus(), 0);
  }
}

function closeSheet(){
  const host = $('#sheetHost');
  if(!host) return;
  host.innerHTML = '';
  if(LAST_FOCUS && LAST_FOCUS.focus) { try { LAST_FOCUS.focus(); } catch(e){} }
  LAST_FOCUS = null;
}

function openSheet(kind){
  if(kind === 'sleep') return sheet(t('sleep.title'),
    '<div class="field"><label for="sl_s">' + esc(t('sleep.start')) + '</label>' +
    '<input type="datetime-local" id="sl_s" value="' + toLocalInput(Date.now()-8*3600000) + '"></div>' +
    '<div class="field"><label for="sl_e">' + esc(t('sleep.end')) + '</label>' +
    '<input type="datetime-local" id="sl_e" value="' + toLocalInput(Date.now()) + '"></div>' +
    '<div class="field"><label>' + esc(t('sleep.quality')) + '</label><div class="chips" id="sl_q">' +
    [1,2,3,4,5].map(q => '<button class="chip sm ' + (q===3?'on':'') + '" data-act="pickQuality" data-a1="' + q + '" data-t1="l">' + esc(t('sleep.q'+q)) + '</button>').join('') + '</div></div>' +
    '<p class="hint mb-4">' + esc(t('sleep.note')) + '</p>' +
    '<button class="btn block" data-act="saveSleep">' + esc(t('btn.save')) + '</button>');

  if(kind === 'shift') return sheet(t('shift.title'),
    '<div class="field"><label for="sf_s">' + esc(t('shift.start')) + '</label>' +
    '<input type="datetime-local" id="sf_s" value="' + toLocalInput(Date.now()-10*3600000) + '"></div>' +
    '<div class="field"><label for="sf_e">' + esc(t('shift.end')) + '</label>' +
    '<input type="datetime-local" id="sf_e" value="' + toLocalInput(Date.now()) + '"></div>' +
    '<p class="hint mb-4">' + esc(t('onb.shift.note')) + '</p>' +
    '<button class="btn block" data-act="saveShift">' + esc(t('btn.save')) + '</button>');

  if(kind === 'feel') return sheet(t('feel.title'),
    [['soreness','feel.soreness'],['joint','feel.joint'],['fatigue','feel.fatigue'],['illness','feel.illness']]
      .map(([k,lbl]) => '<div class="field"><label>' + esc(t(lbl)) + '</label><div class="chips" id="fl_' + k + '">' +
        [0,1,2,3].map(v => '<button class="chip sm ' + (v===0?'on':'') + '" data-act="pickFeel" data-a1="' + k + '" data-a2="' + v + '" data-t2="l">' +
          (v===0?esc(t('feel.none')):esc(t('feel.'+['mild','moderate','high'][v-1]))) + '</button>').join('') +
        '</div></div>').join('') +
    '<div class="banner warn mb-4"><span class="ic">i</span><span>' +
    esc(t('feel.stop')) + '</span></div>' +
    '<button class="btn block" data-act="saveFeel">' + esc(t('btn.save')) + '</button>');

  if(kind === 'bw'){
    const s = getState(), u = unit();
    const cur = (s.profile && s.profile.bodyweight) || '';
    const recent = (s.bodyweights || []).slice().sort((a,b)=>b.date-a.date).slice(0, 6);
    return sheet(t('bw.log'),
      '<div class="grid2"><div class="field"><label for="bw_v">' + esc(t('profile.bodyweight')) + ' (' + esc(u) + ')</label>' +
      '<input type="number" inputmode="decimal" step="0.1" min="20" max="400" id="bw_v" value="' + esc(cur) + '" placeholder="—"></div>' +
      '<div class="field"><label for="bw_d">' + esc(t('progress.date')) + '</label>' +
      '<input type="date" id="bw_d" value="' + dateKey(Date.now()) + '"></div></div>' +
      '<p class="hint mb-3">' + esc(t('profile.bodyweightHint')) + '</p>' +
      '<button class="btn block" data-act="saveBodyweightSheet">' + esc(t('btn.save')) + '</button>' +
      (recent.length ? '<div class="mt-4">' + recent.map(b =>
        '<div class="factor"><span class="dot"></span><span class="txt"><b>' + b.w + ' ' + esc(u) +
        '</b> · ' + esc(dateLabel(b.date)) + '</span>' +
        '<button type="button" class="btn danger sm" data-act="removeBodyweightRow" data-a1="' + b.id + '">' +
        esc(t('hist.delSet')) + '</button></div>').join('') + '</div>' : ''));
  }
}

function saveBodyweightSheet(){
  const v = parseFloat((document.getElementById('bw_v') || {}).value);
  const dStr = (document.getElementById('bw_d') || {}).value;
  if(!isFinite(v) || v <= 0){ toast(t('err.generic'), 'alert'); return; }
  const ts = dStr ? new Date(dStr + 'T12:00:00').getTime() : Date.now();
  addBodyweight(v, isFinite(ts) ? ts : Date.now());
  closeSheet(); savedToast('you.saved'); render();
}
function removeBodyweightRow(id){
  deleteBodyweight(id);
  render(); openSheet('bw');
}

let QUALITY = 3;
function pickQuality(q){
  QUALITY = q;
  $$('#sl_q .chip').forEach((c,i) => c.classList.toggle('on', i+1 === q));
}
function saveSleep(){
  const a = ($('#sl_s')||{}).value, b = ($('#sl_e')||{}).value;
  if(!a || !b){ toast(t('err.generic'),'alert'); return; }
  addSleep({ start:a, end:b, quality:QUALITY });
  closeSheet(); savedToast('sleep.saved'); render();
}
function saveShift(){
  const a = ($('#sf_s')||{}).value, b = ($('#sf_e')||{}).value;
  if(!a || !b){ toast(t('err.generic'),'alert'); return; }
  addShift({ start:a, end:b });
  closeSheet(); savedToast('shift.saved'); render();
}
let FEEL = { soreness:0, joint:0, fatigue:0, illness:0 };
function pickFeel(k,v){
  FEEL[k] = v;
  $$('#fl_'+k+' .chip').forEach((c,i) => c.classList.toggle('on', i === v));
}
function saveFeel(){
  addFeeling(Object.assign({}, FEEL));
  closeSheet(); savedToast('feel.saved');
  FEEL = { soreness:0, joint:0, fatigue:0, illness:0 };
  render();
}

/* ===================================================================== */
/*  ONBOARDING (restyled, same data model)                                */
/* ===================================================================== */
/* ===================================================================== */
/*  FIRST LAUNCH — language, before anything else is asked                */
/* ===================================================================== */
/* The screen is the whole of onboarding step zero: it renders instead of the
   welcome step while `state.langChosen` is false, and it disappears for good
   once a language has been chosen. It is a step, not a modal, because a person
   who cannot read the interface cannot dismiss a dialog they cannot read.

   The list prints each language in its own name and script, the way its
   speakers write it. Coverage is measured, not claimed: `langStatus()` counts
   the translated keys, so a language that is 97% done says 97%. */
Screens.lang = function(){
  const status = (typeof langStatus === 'function') ? langStatus : (() => null);
  const rows = LANGS.map(l => {
    const st = status(l) || { percent: 100, contentPercent: 100, status: 'full' };
    const on = (l === CURRENT_LANG);   // the page is already in the picked language
    /* A language is written in its own script in this list, so each row
       declares its own direction and language: the Arabic row reads
       right-to-left inside an otherwise left-to-right page. */
    const rtl = (typeof isRTL === 'function') && isRTL(l);
    return '<button type="button" class="lang-row ' + (on ? 'on' : '') + '" ' +
      'lang="' + l + '" ' +
      'aria-pressed="' + (on ? 'true' : 'false') + '" ' +
      'data-act="pickLang" data-a1="' + l + '">' +
      '<span class="box" aria-hidden="true"></span>' +
      '<span class="lang-nm" dir="' + (rtl ? 'rtl' : 'ltr') + '">' + esc(langName(l)) + '</span>' +
      '<span class="lang-code">' + esc(String(l).toUpperCase()) + '</span>' +
      /* The interface is fully translated in all seven; the lesson text is not.
         Saying only the first number would be the flattering version, so the
         row carries the second one too. */
      ((st.contentPercent !== undefined && st.contentPercent < 100)
        ? '<span class="flag sm warn">' + esc(t('lang.contentPct', { p: st.contentPercent })) + '</span>'
        : '') +
      '</button>';
  }).join('');

  /* No second wordmark: the masthead is already above this screen and says the
     name. Repeating it inside the frame made the first thing a new user sees a
     logo stacked on a logo. */
  let h = '<div class="onb-frame lang-frame">' +
    '<h1 class="display pre mb-2">' + esc(t('lang.title')) + '</h1>' +
    '<p class="onb-prose">' + esc(t('lang.sub')) + '</p>' +
    '<div class="lang-list">' + rows + '</div>' +
    '<div class="onb-actions">' +
    '<button class="btn block" data-act="chooseCurrentLang">' +
    esc(t('lang.continue')) + '</button></div>' +
    '<p class="hint mt-3">' + esc(t('lang.note')) + '</p>' +
    (function(){
      const st = status(CURRENT_LANG);
      return (st && st.contentPercent !== undefined && st.contentPercent < 100)
        ? '<p class="hint mt-2">' + esc(t('lang.contentNote', { p: st.contentPercent })) + '</p>'
        : '';
    })() +
    '</div>';
  return { html: h, noNav: true };
};

/* Choosing applies immediately — the whole page re-renders in the new language,
   including this screen — and is written in two places for two different
   reasons: `localStorage['ancestor.lang']` so the very first paint of the next
   launch is already in the right language (i18n/core.js reads it before any
   screen exists), and the record itself so an export carries the choice. */
/* Two acts, not one.
   `pickLang` applies a language the moment it is tapped — the heading above the
   list changes under the finger, which is the only honest way to answer "did I
   get the right one?" — and writes it to the language key, so a launcher who
   abandons the screen still comes back to the language they were reading.
   `chooseLang` is the Continue button: it marks the question answered, which is
   what stops the screen appearing on every launch. Tapping a row alone does not
   answer it, so a mis-tap is one more tap to undo instead of a page in a script
   you cannot read. */
function pickLang(l){
  if(LANGS.indexOf(l) < 0) return;
  setLang(l);
  render();
  window.scrollTo(0, 0);
}
function chooseLang(l){
  const pick = (LANGS.indexOf(l) >= 0) ? l : CURRENT_LANG;
  setLang(pick);
  const s = getState();
  s.lang = pick;
  s.langChosen = true;
  saveState();
  render();
  window.scrollTo(0, 0);
}

const ONB_STEPS = ['welcome','exp','focus','approach','equip','avail','shift','sleep','style','ex','ready'];
let ONB_EX_OPEN = {};
function onbExOpen(pat, open){ if(open) ONB_EX_OPEN[pat] = true; else delete ONB_EX_OPEN[pat]; }
let onbIdx = 0;
function onbGo(i){ onbIdx = Math.max(0, Math.min(ONB_STEPS.length-1, i)); render(); window.scrollTo(0,0); }
function onbNext(){ onbGo(onbIdx+1); }

function tile(on, title, desc, act, args, radio){
  return '<button class="tile ' + (on?'on':'') + (radio?' radio':'') + '"' + actAttr(act, ...(args || [])) + '>' +
    '<span class="box"></span><span><span class="t">' + esc(title) + '</span>' +
    (desc ? '<span class="d">' + esc(desc) + '</span>' : '') + '</span></button>';
}

Screens.onb = function(){
  const s = getState(), p = s.profile;
  const step = ONB_STEPS[onbIdx];
  const bar = '<div class="onb-bar">' +
    ONB_STEPS.map((_,i) => '<i class="' + (i<=onbIdx?'on':'') + '"></i>').join('') + '</div>';
  /* The step index is the one navigational fact on the screen, so it is set as
     a dossier number rather than a sentence: 02 over / 09 STEP. */
  const pad2 = function(n){ return (n < 10 ? '0' : '') + n; };
  const head = '<div class="onb-idx">' +
    '<span class="n num">' + pad2(onbIdx + 1) + '</span>' +
    '<span class="d"><b>/ ' + pad2(ONB_STEPS.length) + '</b>' +
    '<i>' + esc(t('onb.step')) + '</i></span></div>';
  let b = '';

  if(step === 'welcome'){
    b = head +
      '<h1 class="display pre mb-3">' + esc(t('onb.welcome.t')) + '</h1>' +
      '<p class="onb-prose">' + esc(t('onb.welcome.d')) + '</p>' +
      '<div class="panel"><p class="eyebrow mb-3">' + esc(t('onb.privacy.t')) + '</p>';
    [1,2,3,4].forEach(i => { b += '<div class="factor"><span class="dot"></span><span class="txt">' +
      esc(t('onb.privacy.l'+i)) + '</span></div>'; });
    b += '<div class="mt-4"><button class="btn block" data-act="setConsent">' +
      esc(t('onb.privacy.agree')) + '</button></div></div>';
    return { html: '<div class="onb-frame">' + bar + b + '</div>', noNav: true };
  }

  if(step === 'exp'){
    b = head + '<h1 class="display pre mb-4">' + esc(t('onb.exp.t')) + '</h1>' +
      '<div class="tiles">' +
      tile(p.experience==='b', t('onb.exp.b'), t('onb.exp.b.d'), 'setP', ['experience','b'], true) +
      tile(p.experience==='i', t('onb.exp.i'), t('onb.exp.i.d'), 'setP', ['experience','i'], true) +
      tile(p.experience==='a', t('onb.exp.a'), t('onb.exp.a.d'), 'setP', ['experience','a'], true) +
      '</div><div class="sp-4"></div>' +
      '<p class="eyebrow mb-2">' + esc(t('onb.goal.t')) + '</p><div class="chips">' +
      ['h','s','r','g'].map(g => '<button class="chip ' + (p.goal===g?'on':'') + '" data-act="setP" data-a1="goal" data-a2="' + g + '">' + esc(t('onb.goal.'+g)) + '</button>').join('') +
      '</div>' +
      '<div class="onb-why">' + esc(t('onb.whyBody')) + '</div>' +
      '<div class="onb-actions">' +
      '<button class="btn quiet" data-act="onbBack">' + esc(t('btn.back')) + '</button>' +
      '<button class="btn grow"  ' + (p.experience && p.goal ? '' : 'disabled') +
      ' data-act="onbNext">' + esc(t('btn.next')) + '</button></div>';
  }

  if(step === 'focus'){
    /* Multi-select, nothing pre-selected, and the "whole body" chip is an answer
       rather than a reset: choosing it clears the specific picks, because a
       programme cannot emphasise everything and one thing at once. */
    const picked = p.priorities || [];
    b = head + '<h1 class="display pre mb-3">' + esc(t('onb.focus.t')) + '</h1>' +
      '<p class="onb-prose">' + esc(t('onb.focus.d')) + '</p>' +
      '<div class="focus-grid">' +
      PRIORITY_GROUPS.map(g => {
        const on = (g.id === 'balanced') ? (!picked.length && (p.emphasis || 'balanced') === 'balanced')
                                         : picked.indexOf(g.id) >= 0;
        return '<button type="button" class="tile focus-tile ' + (on ? 'on' : '') + '" ' +
          'aria-pressed="' + (on ? 'true' : 'false') + '" ' +
          'data-act="togglePriority" data-a1="' + g.id + '">' +
          '<span class="box"></span><span><span class="t">' + esc(t(g.label)) + '</span>' +
          (g.id === 'balanced' ? '<span class="d">' + esc(t('emphasis.balanced.d')) + '</span>' : '') +
          '</span></button>';
      }).join('') + '</div>' +
      '<p class="hint mt-3">' + esc(t('onb.focus.note')) + '</p>' +
      '<div class="onb-actions">' +
      '<button class="btn quiet" data-act="onbBack">' + esc(t('btn.back')) + '</button>' +
      '<button class="btn grow" data-act="onbNext">' + esc(t('btn.next')) + '</button></div>';
  }

  if(step === 'approach'){
    /* Five options, all of them available to everybody. Nothing on this screen
       reads any earlier answer: the copy says so, the code does it by writing
       the choice straight into `emphasis`. */
    b = head + '<h1 class="display pre mb-3">' + esc(t('onb.approach.t')) + '</h1>' +
      '<p class="onb-prose">' + esc(t('onb.approach.d')) + '</p>' +
      '<div class="tiles">' + EMPHASIS.map(e =>
        tile((p.emphasis || 'balanced') === e.id, t(e.label), t(e.desc),
             'setEmphasis', [e.id], true)).join('') + '</div>' +
      ((p.emphasis === 'custom')
        ? '<p class="eyebrow mt-4 mb-2">' + esc(t('profile.priorities')) + '</p>' +
          '<div class="focus-grid">' + PRIORITY_GROUPS.filter(g => g.id !== 'balanced').map(g => {
            const on = (p.priorities || []).indexOf(g.id) >= 0;
            return '<button type="button" class="chip ' + (on ? 'on' : '') + '" ' +
              'aria-pressed="' + (on ? 'true' : 'false') + '" data-act="togglePriority" data-a1="' + g.id + '">' +
              esc(t(g.label)) + '</button>';
          }).join('') + '</div>'
        : '') +
      '<p class="hint mt-3">' + esc(t('onb.approach.note')) + '</p>' +
      '<div class="onb-actions">' +
      '<button class="btn quiet" data-act="onbBack">' + esc(t('btn.back')) + '</button>' +
      '<button class="btn grow" data-act="onbNext">' + esc(t('btn.next')) + '</button></div>';
  }

  if(step === 'equip'){
    b = head + '<h1 class="display mb-4">' + esc(t('onb.equip.t')) + '</h1>' +
      '<div class="tiles">' +
      tile(p.equipment==='gym', t('onb.equip.gym'), t('onb.equip.gym.d'), 'setP', ['equipment','gym'], true) +
      tile(p.equipment==='home', t('onb.equip.home'), t('onb.equip.home.d'), 'setP', ['equipment','home'], true) +
      tile(p.equipment==='minimal', t('onb.equip.min'), t('onb.equip.min.d'), 'setP', ['equipment','minimal'], true) +
      '</div><div class="sp-5"></div>' +
      '<p class="eyebrow mb-2">' + esc(t('onb.limits.t').replace('\n',' ')) + '</p>' +
      '<div class="chips"><button class="chip ' + (p.limits.length===0?'on':'') + '" data-act="setLimit" data-a1="__none__">' + esc(t('onb.limits.h')) + '</button>' +
      [['shoulder','shoulder'],['knee','knee'],['lowerback','lowback'],['wrist','wrist'],['elbow','elbow']].map(x =>
      '<button class="chip ' + (p.limits.indexOf(x[0])>=0?'on':'') + '" data-act="setLimit" data-a1="' + x[0] + '">' +
      esc(t('onb.limits.'+x[1])) + '</button>').join('') + '</div>' +
      '<p class="hint mt-2">' + esc(t('onb.limits.note')) + '</p>' +
      '<div class="onb-actions">' +
      '<button class="btn quiet" data-act="onbBack">' + esc(t('btn.back')) + '</button>' +
      '<button class="btn grow"  data-act="onbNext">' + esc(t('btn.next')) + '</button></div>';
  }

  if(step === 'avail'){
    /* Two sliders, not chips. The days answer is a whole number from 2 to 6; the
       session length snaps to the four durations the planner actually uses. Each
       drag saves the answer and rewrites its readout in place: a re-render would
       tear the slider out from under the finger. Same profile fields as before. */
    const days = Math.max(2, Math.min(6, Math.round(+p.daysPerWeek) || 3));
    const mins = [20, 35, 50, 70];
    const mi = Math.max(0, mins.indexOf(+p.sessionMinutes));
    const mIdx = mi < 0 ? 2 : mi;
    b = head + '<h1 class="display pre mb-4">' + esc(t('onb.avail.t')) + '</h1>' +
      '<output class="slide-num" id="obDaysV" aria-hidden="true">' + days + '</output>' +
      '<input class="slide" id="obDays" type="range" min="2" max="6" step="1" value="' + days + '"' +
      ' aria-label="' + esc(t('onb.avail.t')) + '" data-in="setOnbDays" data-t2="v">' +
      '<p class="eyebrow mb-2 mt-5">' + esc(t('onb.avail.len')) + '</p>' +
      '<output class="slide-num slide-num--sm" id="obMinV" aria-hidden="true">' + esc(t('onb.avail.len.' + mins[mIdx])) + '</output>' +
      '<input class="slide" id="obMin" type="range" min="0" max="3" step="1" value="' + mIdx + '"' +
      ' aria-label="' + esc(t('onb.avail.len')) + '" data-in="setOnbMinutes" data-t2="v">' +
      '    <div class="onb-actions">' +
      '<button class="btn quiet" data-act="onbBack">' + esc(t('btn.back')) + '</button>' +
      '<button class="btn grow"  data-act="onbNext">' + esc(t('btn.next')) + '</button></div>';
  }

  if(step === 'shift'){
    b = head + '<h1 class="display mb-4">' + esc(t('onb.shift.t')) + '</h1>' +
      '<div class="tiles">' +
      tile(p.shiftType==='none', t('onb.shift.no'), '', 'setP', ['shiftType','none'], true) +
      tile(p.shiftType==='night', t('onb.shift.night'), '', 'setP', ['shiftType','night'], true) +
      tile(p.shiftType==='rotating', t('onb.shift.rot'), '', 'setP', ['shiftType','rotating'], true) +
      '</div>';
    if(p.shiftType !== 'none'){
      b += '<div class="panel mt-4"><p class="eyebrow mb-3">' +
        esc(t('onb.shift.times')) + '</p><div class="grid2">' +
        '<div class="field"><label for="sh_s">' + esc(t('shift.start')) + '</label>' +
        '<input type="time" id="sh_s" value="19:00" data-in="syncShiftPreview"></div>' +
        '<div class="field"><label for="sh_e">' + esc(t('shift.end')) + '</label>' +
        '<input type="time" id="sh_e" value="07:00" data-in="syncShiftPreview"></div></div>' +
        '<p id="sh_prev" class="hint" style="color:var(--burnt-text)"></p>' +
        '<button class="btn quiet sm" data-act="addShiftFromOnb">' + esc(t('onb.shift.add')) + '</button>';
      b += '<div class="mt-3">' + (s.shifts||[]).slice(-4).map(sh =>
        '<div class="factor"><span class="dot"></span><span class="txt">' + esc(sh.start.slice(5)) + ' → ' +
        esc(sh.end.slice(5)) + '</span><span class="w">' + shiftHours(sh).toFixed(1) + ' h</span></div>').join('') + '</div></div>';
    }
    b += '<p class="hint mt-3">' + esc(t('onb.shift.note')) + '</p>' +
      '<div class="onb-actions">' +
      '<button class="btn quiet" data-act="onbBack">' + esc(t('btn.back')) + '</button>' +
      '<button class="btn grow"  data-act="onbNext">' + esc(t('btn.next')) + '</button></div>';
  }

  if(step === 'sleep'){
    b = head + '<h1 class="display pre mb-4">' +
      esc(t('onb.sleep.t')) + '</h1>' +
      '<div class="panel"><div class="row nowrap row-base mb-2">' +
      '<span class="num num-xl" id="sl_v">' + p.sleepHours + '</span>' +
      '<span class="hint">' + esc(t('onb.sleep.h')) + '</span></div>' +
      '<input aria-label="' + esc(t('onb.sleep.t')) + '" type="range" min="3" max="11" step="0.5" value="' + p.sleepHours +
      '" data-in="setSleepHours"></div>' +
      '<div class="panel"><p class="eyebrow mb-2">' + esc(t('onb.sleep.var')) +
      '</p><div class="chips">' + [1,2,3].map(v => '<button class="chip ' + (p.sleepVariability===v?'on':'') + '" data-act="setP" data-a1="sleepVariability" data-a2="' + v + '" data-t2="l">' + esc(t('onb.sleep.var.'+v)) + '</button>').join('') +
      '</div></div>' +
      '<div class="panel"><div class="field m-0"><label for="onb_wake">' + esc(t('onb.sleep.wake')) + '</label>' +
      '<input id="onb_wake" type="time" value="' + String(p.usualWake).padStart(2,'0') +
      ':00" data-in="setP" data-a1="usualWake" data-t2="hour"></div></div>' +
      '<div class="onb-actions">' +
      '<button class="btn quiet" data-act="onbBack">' + esc(t('btn.back')) + '</button>' +
      '<button class="btn grow"  data-act="onbNext">' + esc(t('btn.next')) + '</button></div>';
  }

  if(step === 'style'){
    b = head + '<h1 class="display pre mb-4">' +
      esc(t('onb.style.t')) + '</h1><div class="tiles">' +
      tile(p.style==='hit', t('onb.style.hit'), t('onb.style.hit.d'), 'setP', ['style','hit'], true) +
      tile(p.style==='std', t('onb.style.std'), t('onb.style.std.d'), 'setP', ['style','std'], true) +
      tile(p.style==='min', t('onb.style.min'), t('onb.style.min.d'), 'setP', ['style','min'], true) +
      tile(p.style==='freq', t('onb.style.freq'), t('onb.style.freq.d'), 'setP', ['style','freq'], true) +
      '</div><div class="banner info mt-4"><span class="ic">i</span><span>' +
      esc(t('onb.style.note')) + '</span></div>' +
      '<div class="panel mt-3"><p class="eyebrow mb-2">' +
      esc(t('onb.units.t')) + '</p><div class="chips">' +
      '<button class="chip ' + (p.unit==='kg'?'on':'') + '" data-act="setP" data-a1="unit" data-a2="kg">' +
      esc(t('onb.units.kg')) + '</button>' +
      '<button class="chip ' + (p.unit==='lb'?'on':'') + '" data-act="setP" data-a1="unit" data-a2="lb">' +
      esc(t('onb.units.lb')) + '</button></div></div>' +
      '<div class="onb-actions">' +
      '<button class="btn quiet" data-act="onbBack">' + esc(t('btn.back')) + '</button>' +
      '<button class="btn grow"  data-act="onbNext">' + esc(t('btn.next')) + '</button></div>';
  }

  if(step === 'ex'){
    const eq = EQUIP_SETS[p.equipment] || EQUIP_SETS.gym;
    const pool = EX.filter(e => eq.indexOf(e.equip) >= 0);
    const byPat = {};
    pool.forEach(e => { (byPat[e.pat] = byPat[e.pat] || []).push(e); });
    /* The step asks you to remove what you cannot do, and it arrived as eighty
       chips all already switched on. Everything your equipment allows is in the
       plan by default, so the list starts as eleven collapsed groups that say
       how many each still holds; only a group you have changed starts open. */
    b = head + '<h1 class="display pre mb-2">' +
      esc(t('onb.ex.t')) + '</h1><p class="onb-prose">' + esc(t('onb.ex.d')) + '</p>' +
      '<p class="hint mb-3">' + esc(t('onb.ex.hint')) + '</p>';
    Object.keys(byPat).forEach(pat => {
      const list = byPat[pat];
      const kept = list.filter(e => !p.exercises || p.exercises[e.id] !== false).length;
      /* an explicit open/close wins; otherwise a group you have changed
         starts open so your removals are visible */
      const open = (pat in ONB_EX_OPEN) ? ONB_EX_OPEN[pat] : kept < list.length;
      b += '<details class="dis onb-ex-group"' + (open ? ' open' : '') +
        ' ontoggle="onbExOpen(\'' + pat + '\', this.open)">' +
        '<summary><span class="dis-t">' + esc(t('pat.' + pat)) + '</span>' +
        '<span class="flag sm ' + (kept === list.length ? 'plain' : 'warn') + '">' +
        numExpr(kept + ' / ' + list.length) + '</span></summary>' +
        '<div class="chips mt-2">' + list.map(e => {
          const on = p.exercises ? p.exercises[e.id] !== false : true;
          return '<button type="button" class="chip sm ' + (on?'on':'') + '" ' +
            'aria-pressed="' + (on ? 'true' : 'false') + '" ' +
            'data-act="toggleEx" data-a1="' + e.id + '">' +
            esc(t('ex.'+e.id)) + '</button>';
        }).join('') + '</div></details>';
    });
    b += '<div class="onb-actions">' +
      '<button class="btn quiet" data-act="onbBack">' + esc(t('btn.back')) + '</button>' +
      '<button class="btn grow"  data-act="onbNext">' + esc(t('btn.next')) + '</button></div>';
  }

  if(step === 'ready'){
    const plan = buildPlan(p);
    b = head + '<h1 class="display mb-2">' + esc(t('onb.ready.t')) + '</h1>' +
      '<p class="onb-prose">' + esc(t('onb.ready.d')) + '</p>';
    plan.sessions.forEach(s2 => {
      b += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(s2.name) +
        '</h3><span class="hint">' + s2.exercises.length + ' ' + esc(t('progress.exercise')) + '</span></div>';
      s2.exercises.forEach(e => {
        b += '<div class="factor"><span class="dot"></span><span class="txt">' + esc(t('ex.'+e.id)) +
          '</span><span class="w">' + esc(numExpr(e.sets + '×' + targetRangeText(EX_BY_ID[e.id]))) + ' RIR' + e.rir + '</span></div>';
      });
      b += '</div>';
    });
    b += '<div class="onb-actions">' +
      '<button class="btn quiet" data-act="onbBack">' + esc(t('btn.back')) + '</button>' +
      '<button class="btn grow"  data-act="finishOnboarding">' +
      esc(t('onb.ready.cta')) + '</button></div>';
  }

  return { html: '<div class="onb-frame">' + bar + b + '</div>', noNav: true };
};

function setConsent(){ const s = getState(); s.consented = true; saveState(); onbNext(); }
/* `goal` (one string) and `goals` (an array) are two fields for one concept.
   `goals` is what the engine reads, so writing `goal` alone used to be a dead
   end: the answer was stored and then ignored. profileSet() keeps them in
   step in both directions. */
/* Onboarding sliders. Write the answer, then rewrite the readout in place. */
function setOnbDays(v){
  const n = Math.max(2, Math.min(6, Math.round(+v) || 3));
  const st = getState(); profileSet(st.profile, 'daysPerWeek', n); saveState();
  const o = document.getElementById('obDaysV'); if(o) o.textContent = String(n);
}
function setOnbMinutes(v){
  const mins = [20, 35, 50, 70];
  const i = Math.max(0, Math.min(3, Math.round(+v) || 0));
  const st = getState(); profileSet(st.profile, 'sessionMinutes', mins[i]); saveState();
  const o = document.getElementById('obMinV'); if(o) o.textContent = t('onb.avail.len.' + mins[i]);
}
function setP(k,v){ const s = getState(); profileSet(s.profile, k, v); saveState(); render(); }

/* Training focus has two setters rather than one, because the two answers do
   different things: `setEmphasis` picks which strategy the generator follows,
   `togglePriority` edits the muscle list the custom strategy reads. Both live in
   the profile, so they travel with the record and survive a language change, a
   reload and an import.

   Neither touches `state.plan`. Editing what you want is not the same act as
   rebuilding what you have, and silently regenerating a plan under someone who
   is mid-week — or mid-session — is exactly the overwrite the brief forbids. */
function setEmphasis(id){
  if(!EMPHASIS.some(e => e.id === id)) return;
  const s = getState();
  s.profile.emphasis = id;
  saveState(); render();
}
function togglePriority(id){
  if(id === 'balanced'){
    const s = getState();
    s.profile.priorities = [];
    s.profile.emphasis = 'balanced';
    saveState(); render(); return;
  }
  const s = getState();
  const arr = Array.isArray(s.profile.priorities) ? s.profile.priorities : [];
  const i = arr.indexOf(id);
  if(i >= 0) arr.splice(i, 1); else arr.push(id);
  s.profile.priorities = arr;
  /* Picking muscles IS choosing the custom strategy: making a person find a
     "custom" tile afterwards would be a second answer to one question. */
  if(arr.length) s.profile.emphasis = 'custom';
  else if(s.profile.emphasis === 'custom') s.profile.emphasis = 'balanced';
  saveState(); render();
}
/* Does the plan in hand match the focus in the profile? Compared on what the
   plan was BUILT with, which is stamped on it, not on what today's settings say. */
function planFocusStale(s){
  const plan = (s || getState()).plan;
  if(!plan || !plan.sessions || !plan.sessions.length) return false;
  if(typeof plan.emphasis === 'undefined') return false;   // built before focus existed
  const p = (s || getState()).profile || {};
  const a = plan.emphasis || 'balanced';
  const b = p.emphasis || 'balanced';
  if(a !== b) return true;
  if(a !== 'custom') return false;
  const x = (plan.priorities || []).slice().sort().join(',');
  const y = (p.priorities || []).slice().sort().join(',');
  return x !== y;
}
function setLimit(l){
  const s = getState(), arr = s.profile.limits;
  if(l === '__none__'){ s.profile.limits = []; }
  else { const i = arr.indexOf(l); if(i>=0) arr.splice(i,1); else arr.push(l); }
  saveState(); render();
}
/* One action to undo removals, because "put it back" is the thing a person
   needs after an experiment, and hunting the group they changed is not. */
function restoreExPool(){
  const s = getState();
  s.profile.exercises = {};
  EX.forEach(e => { s.profile.exercises[e.id] = true; });
  saveState(); render();
  toast(t('profile.poolRestored'));
}
function toggleEx(id){
  const s = getState();
  if(!s.profile.exercises){ s.profile.exercises = {}; EX.forEach(e => s.profile.exercises[e.id] = true); }
  s.profile.exercises[id] = s.profile.exercises[id] === false;
  saveState(); render();
}
function syncShiftPreview(){
  const a = ($('#sh_s')||{}).value, b = ($('#sh_e')||{}).value, el = $('#sh_prev');
  if(!el) return;
  if(!a || !b){ el.textContent = ''; return; }
  const today = dateKey(Date.now());
  const hrs = shiftHours({ start: today+'T'+a, end: today+'T'+b });
  el.textContent = (hrs > 0 ? hrs.toFixed(1) + ' h' : '') + (b <= a ? ' · ' + t('shift.crosses') : '');
}
function addShiftFromOnb(){
  const a = ($('#sh_s')||{}).value, b = ($('#sh_e')||{}).value;
  if(!a || !b) return;
  addShift({ start: dateKey(Date.now())+'T'+a, end: dateKey(Date.now())+'T'+b });
  render();
}
function finishOnboarding(){
  const s = getState();
  s.profile.exercises = s.profile.exercises || {};
  s.plan = buildPlan(s.profile);
  s.onboarded = true;
  saveState();
  go('home');
}
