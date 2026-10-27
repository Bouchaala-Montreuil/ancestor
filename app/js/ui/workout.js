/* ============================================================================
   ANCESTOR — Workout Studio, Split Planner, Live Logger & Exercise Atlas

   Three cohesive views under the primary Session route:
     1. PLAN     — view every day of your split, see muscle recovery per day,
                   customise sets/order/exercises/rest, or launch any day
     2. ACTIVE   — focused gym-floor HUD with live clock, tabular mode-aware
                   set rows, mid-session exercise addition & completion summary
     3. LIBRARY  — searchable, multi-facet 84-exercise atlas with muscle
                   contribution bars, logging modes, PRs & 1-tap add to plan

   Preserves 100% of schema v3, deterministic progression, planned-vs-actual
   separation, and every public handler contract.
   ========================================================================== */

let SESSION_SUB = 'plan';     // 'plan' | 'live' | 'library'
let PLAN_DAY    = null;       // selected plan session id ('A','B',...)
let PLAN_EDIT   = false;      // inline workout plan editor toggle
let LIB_QUERY   = '';
let LIB_MUSCLE  = 'all';
let LIB_EQUIP   = 'all';
let LIB_MODE    = 'all';
let LIVE_CLOCK  = null;
let LAST_LOGGED_SET = null;

const ENTERING_FIELDS = { w:1, r:1, t:1, d:1, a:1 };

function setSessionSub(tab){
  SESSION_SUB = tab || 'plan';
  render();
}

function openExerciseLibrary(muscle){
  LIB_MUSCLE = muscle || 'all';
  SESSION_SUB = 'library';
  if(VIEW !== 'session') go('session');
  else render();
}

function activeElapsedMs(){
  if(!ACTIVE) return 0;
  const end = ACTIVE.paused ? (ACTIVE.pausedAt || Date.now()) : Date.now();
  return Math.max(0, end - (ACTIVE.startedAt || end) - (ACTIVE.pausedMs || 0));
}

function togglePauseWorkout(){
  if(!ACTIVE) return;
  if(ACTIVE.paused){
    ACTIVE.pausedMs = (ACTIVE.pausedMs || 0) + Math.max(0, Date.now() - (ACTIVE.pausedAt || Date.now()));
    ACTIVE.paused = false;
    ACTIVE.pausedAt = null;
    if(typeof REST !== 'undefined' && REST && REST.paused) resumeRest();
  } else {
    ACTIVE.paused = true;
    ACTIVE.pausedAt = Date.now();
    if(typeof REST !== 'undefined' && REST && !REST.paused) pauseRest();
  }
  saveDraft();
  syncLiveClock();
  render();
}

function syncLiveClock(){
  if(LIVE_CLOCK){ clearInterval(LIVE_CLOCK); LIVE_CLOCK = null; }
  if(typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) return;
  if(VIEW === 'session' && ACTIVE && !ACTIVE.paused && SESSION_SUB !== 'library'){
    LIVE_CLOCK = setInterval(() => {
      if(!ACTIVE || ACTIVE.paused || VIEW !== 'session'){ clearInterval(LIVE_CLOCK); LIVE_CLOCK = null; return; }
      const el = document.getElementById('liveClock');
      if(el) el.textContent = formatElapsed(activeElapsedMs());
    }, 1000);
  }
}

function formatElapsed(ms){
  const sec = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/* ----------------------------------------------------------- sub-navigation */
function sessionSubnavHtml(){
  const cur = (ACTIVE && SESSION_SUB === 'plan') ? 'live' : SESSION_SUB;
  let h = '<div class="subnav" data-subnav="session" role="tablist" aria-label="' + esc(t('nav.session')) + '">' +
          '<i class="subnav-ind" hidden></i>';
  if(ACTIVE){
    h += '<button type="button" role="tab" aria-selected="' + (cur==='live'?'true':'false') +
         '" class="subnav-btn ' + (cur==='live'?'on':'') + '" onclick="setSessionSub(\'live\')">' +
         esc(t('plan.tabActive')) + '<span class="subnav-cnt">●</span></button>';
  }
  h += '<button type="button" role="tab" aria-selected="' + (cur==='plan' && !ACTIVE ? 'true' : (cur==='plan'?'true':'false')) +
       '" class="subnav-btn ' + (!ACTIVE && cur==='plan' ? 'on' : (ACTIVE && SESSION_SUB==='plan-peek' ? 'on' : '')) +
       '" onclick="setSessionSub(\'' + (ACTIVE ? 'plan-peek' : 'plan') + '\')">' +
       esc(t('plan.tabPlan')) + '</button>';
  h += '<button type="button" role="tab" aria-selected="' + (cur==='library'?'true':'false') +
       '" class="subnav-btn ' + (cur==='library'?'on':'') + '" onclick="setSessionSub(\'library\')">' +
       esc(t('plan.tabLibrary')) + '<span class="subnav-cnt">' + EX.length + '</span></button>';
  h += '</div>';
  return h;
}

/* ============================================================================
   MAIN ENTRY: Screens.session
   ========================================================================== */
Screens.session = function(){
  if(SESSION_SUB === 'library'){
    setTimeout(syncLiveClock, 0);
    return { html: renderSessionMasthead('library') + sessionSubnavHtml() + renderExerciseLibrary() };
  }
  if(ACTIVE && SESSION_SUB !== 'plan-peek'){
    SESSION_SUB = 'live';
    setTimeout(syncLiveClock, 0);
    return { html: renderLive() };
  }
  setTimeout(syncLiveClock, 0);
  return renderWorkoutPlanner();
};

function renderSessionMasthead(mode){
  const s = getState(), p = s.profile || {};
  const splitN = (s.plan && s.plan.sessions) ? s.plan.sessions.length : (p.daysPerWeek || 3);
  const idx = mode === 'library'
    ? t('plan.exCount', { n: EX.length })
    : (splitN + ' ' + t('plan.day') + ' · ' + t('onb.style.' + (p.style || 'std')));
  const title = mode === 'library' ? t('plan.libTitle') : t('nav.session');
  const sub = mode === 'library' ? t('plan.libSub') : t('session.warmup');
  return '<div class="masthead"><div>' +
         '<p class="masthead-idx">' + esc(idx) + '</p>' +
         '<h2 class="masthead-title">' + esc(title) + '</h2>' +
         '<p class="masthead-sub">' + esc(sub) + '</p>' +
         '</div></div>';
}

/* ============================================================================
   1. WORKOUT PLANNER & SPLIT EDITOR
   ========================================================================== */
function dayRecoveryRatio(state, sess, now){
  const rec = allRecovery(state, now);
  let worst = 1;
  const involved = (typeof sessionInvolvedMuscles === 'function')
    ? sessionInvolvedMuscles(sess) : (sess.focus || []);
  involved.forEach(m => { if(rec[m] && rec[m].ratio < worst) worst = rec[m].ratio; });
  return Math.max(0, Math.min(1, worst));
}

function renderWorkoutPlanner(){
  const s = getState(), now = Date.now();
  let h = renderSessionMasthead('plan') + sessionSubnavHtml();

  if(!s.plan || !s.plan.sessions || !s.plan.sessions.length){
    h += emptyState('session.noplan', 'session.noplanBody', 'plan',
      '<button class="btn" onclick="rebuildPlan()">' + esc(t('profile.rebuild')) + '</button>');
    return { html: h };
  }

  const next = nextSession(s, now);
  if(!next){
    h += emptyState('session.noplan', 'session.noplanBody', 'plan');
    return { html: h };
  }

  const sessions = s.plan.sessions;
  if(!PLAN_DAY || !sessions.some(x => x.id === PLAN_DAY)){
    PLAN_DAY = next.session.id;
  }
  const selected = sessions.filter(x => x.id === PLAN_DAY)[0] || next.session;
  const isRec = (selected.id === next.session.id);

  /* Last recorded completion per split day */
  const lastByDay = {};
  (s.sessions || []).forEach(x => {
    if(x.planId) lastByDay[x.planId] = Math.max(lastByDay[x.planId] || 0, x.date || 0);
  });
  const wakeAnchor = (s.profile && s.profile.usualWake != null) ? s.profile.usualWake : 4;
  const todayStart = bioDayStart(now, wakeAnchor);

  /* --- Split Day Switcher --- */
  h += '<div class="day-grid" role="tablist" aria-label="' + esc(t('prog.title')) + '">';
  sessions.forEach((ds, idx) => {
    const on = (ds.id === selected.id);
    const recDay = (ds.id === next.session.id);
    const inProg = !!(ACTIVE && ACTIVE.planId === ds.id);
    const lastD = lastByDay[ds.id] || 0;
    const doneToday = !inProg && lastD >= todayStart;
    const rawR = dayRecoveryRatio(s, ds, now);
    const roundedR = Math.round(rawR * 100 / 5) * 5;
    const ratioPct = rawR < 1 ? Math.min(95, roundedR) : Math.min(100, roundedR);
    const statusBadge = inProg
      ? '<span class="flag sm accent">' + esc(t('plan.inProgress')) + '</span>'
      : doneToday
      ? '<span class="flag sm ok">' + esc(t('plan.doneToday')) + '</span>'
      : recDay
      ? '<span class="flag sm ok">' + esc(t('plan.recommended')) + '</span>'
      : '';
    h += '<button type="button" role="tab" aria-selected="' + (on?'true':'false') +
         '" class="day-card ' + (on?'on':'') + '" onclick="selectPlanDay(\'' + ds.id + '\')">' +
         '<span class="d-idx"><span>' + esc(t('plan.day')) + ' ' + (idx + 1) + '</span>' +
         statusBadge + '</span>' +
         '<span class="d-nm">' + esc(ds.name) + '</span>' +
         '<span class="d-meta">' + esc(t('plan.exCount', { n: ds.exercises.length })) +
         ' · ~' + estimatedMinutes(ds, s.plan.restSec) + ' min · ' + ratioPct + '% ' +
         esc(t('readiness.label')) +
         (lastD && !doneToday ? ' · ' + esc(dateLabel(lastD)) : '') +
         '</span></button>';
  });
  h += '</div>';

  /* --- Selected Day Blueprint Header --- */
  h += '<div class="panel" style="border-top:3px solid var(--charcoal)">';
  h += '<div class="panel-hd"><div style="min-width:0">' +
       '<p class="eyebrow">' + esc(isRec ? t('plan.nextUp') : t('session.planned')) + '</p>' +
       '<h3 class="sub" style="font-size:18px;color:var(--ink);margin-top:2px">' + esc(selected.name) + '</h3></div>' +
       '<span class="hint">~' + estimatedMinutes(selected, s.plan.restSec) + ' min · ' +
       esc(t('session.rest')) + ' ' + (s.plan.restSec || 120) + 's</span></div>';

  if((selected.focus || []).length){
    h += '<div class="chips" style="margin-bottom:var(--s3)">' +
         selected.focus.slice(0, 6).map(m =>
           '<button type="button" class="flag plain" style="cursor:pointer" onclick="selectMuscle(\'' + m + '\');go(\'body\')">' +
           esc(t('mg.' + m)) + '</button>'
         ).join('') + '</div>';
  }

  h += '<div style="display:flex;gap:var(--s2);flex-wrap:wrap;align-items:center">' +
       '<button class="btn" onclick="startSession(\'' + selected.id + '\')">' +
       esc(isRec ? t('btn.start') : t('home.startNext', { name: selected.name })) + '</button>' +
       '<button class="btn quiet sm" onclick="togglePlanEdit()" aria-pressed="' + (PLAN_EDIT?'true':'false') + '">' +
       esc(PLAN_EDIT ? t('btn.done') : t('plan.customize')) + '</button>' +
       '<button class="btn quiet sm" onclick="openAddExerciseSheet(\'plan\',\'' + selected.id + '\')">+ ' +
       esc(t('plan.addEx')) + '</button>' +
       '<button class="btn quiet sm" onclick="startCustomSession()">' +
       esc(t('plan.custom')) + '</button>' +
       '<button class="btn quiet sm" onclick="openPrintCard(\'' + selected.id + '\')">' +
       esc(t('pa.button')) + '</button>' +
       '<button class="btn quiet sm" onclick="go(\'profile\')">' + esc(t('prog.change')) + '</button>' +
       '</div>';

  if(PLAN_EDIT){
    h += '<div style="margin-top:var(--s3);padding-top:var(--s3);border-top:var(--hair) solid var(--line);display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap">' +
         '<span class="eyebrow">' + esc(t('session.rest')) + ':</span>' +
         [60, 90, 120, 180].map(sec =>
           '<button type="button" class="chip sm ' + ((s.plan.restSec||120)===sec?'on':'') +
           '" onclick="setPlanRest(' + sec + ')">' + sec + 's</button>'
         ).join('') + '</div>';
  }
  h += '</div>';

  /* --- Exercise Blueprint Rows --- */
  if(!(selected.exercises || []).length){
    h += '<div style="margin-top:var(--s3)">' +
         emptyState('plan.emptyDay', 'plan.emptyDayBody', 'plan',
           '<button class="btn" onclick="openAddExerciseSheet(\'plan\',\'' + selected.id + '\')">+ ' +
           esc(t('plan.addEx')) + '</button>') + '</div>';
    return { html: h, noRefresh: true };
  }

  h += '<div class="plan-ex-list" style="margin-top:var(--s3)">';
  (selected.exercises || []).forEach((e, i) => {
    const ex = EX_BY_ID[e.id]; if(!ex) return;
    const r = recommend(s, e.id, now);
    const spec = exLogSpec(ex);
    const prev = previousPerformance(s, e.id, now);

    h += '<div class="panel plan-ex-row">';
    h += '<div class="plan-ex-top">';
    h += '<span class="plan-ex-idx">' + String(i + 1).padStart(2, '0') + '</span>';
    h += '<div class="plan-ex-main">';
    h += '<button type="button" class="plan-ex-title" onclick="openExerciseDetail(\'' + e.id + '\')">' +
         esc(t('ex.' + e.id)) + '</button>';
    h += '<div class="chips" style="margin-top:6px">' +
         '<span class="flag accent">' + e.sets + ' × ' + targetRangeText(ex) + '</span>' +
         '<span class="flag plain">' + esc(t('session.rir')) + ' ' + e.rir + '</span>' +
         '<span class="flag plain">' + esc(t('equip.' + ex.equip)) + '</span>' +
         '<span class="flag plain">' + esc(t('exd.mode.' + spec.mode)) + '</span>' +
         (spec.unilateral ? '<span class="flag plain">' + esc(t('log.unilateral')) + '</span>' : '') +
         '</div></div>';

    if(PLAN_EDIT){
      h += '<div class="plan-ex-rx">' +
           '<div class="stepper" role="group" aria-label="' + esc(t('c.sets')) + '">' +
             '<button type="button" onclick="adjustPlanSets(\'' + selected.id + '\',' + i + ',-1)" aria-label="-">−</button>' +
             '<span>' + e.sets + ' ' + esc(t('c.sets')) + '</span>' +
             '<button type="button" onclick="adjustPlanSets(\'' + selected.id + '\',' + i + ',1)" aria-label="+">+</button>' +
           '</div>' +
           '<button type="button" class="btn quiet sm" ' + (i===0?'disabled':'') +
             ' onclick="movePlanExercise(\'' + selected.id + '\',' + i + ',-1)" aria-label="Up">↑</button>' +
           '<button type="button" class="btn quiet sm" ' + (i===selected.exercises.length-1?'disabled':'') +
             ' onclick="movePlanExercise(\'' + selected.id + '\',' + i + ',1)" aria-label="Down">↓</button>' +
           '<button type="button" class="btn quiet sm" onclick="openPlanSub(\'' + selected.id + '\',' + i + ')">' +
             esc(t('session.sub')) + '</button>' +
           '<button type="button" class="btn danger sm" onclick="removePlanExercise(\'' + selected.id + '\',' + i + ')">' +
             esc(t('log.removeSet')) + '</button>' +
           '</div>';
    }
    h += '</div>';

    h += '<p class="body-sm" style="margin:var(--s2) 0">' + esc(t('cue.' + e.id)) + '</p>';

    if(prev && prev.text){
      h += '<div class="prev-line"><span class="k">' + esc(t('c.previous')) + '</span>' +
           '<b>' + esc(prev.text) + '</b><span class="d">' + esc(dateLabel(prev.date)) + '</span></div>';
    } else {
      h += '<div class="prev-line"><span class="k">' + esc(t('c.previous')) + '</span>' +
           '<span class="d">' + esc(t('log.noPrev')) + '</span></div>';
    }

    /* Recommendation banner — NEVER repeat the baseline phrase twice! */
    if(r){
      const recLine = recommendationText(r, ex);
      const whyLine = (r.reasons && r.reasons[0]) ? r.reasons[0].text : '';
      const sameText = (r.kind === 'baseline') || !whyLine || (recLine === esc(whyLine));
      h += '<div class="banner info" style="margin-top:var(--s2);margin-bottom:0"><span class="ic">i</span><span>' +
           recLine + (sameText ? '' : '<br>' + esc(whyLine)) + '</span></div>';
    }

    h += '<div style="display:flex;gap:var(--s2);flex-wrap:wrap;margin-top:var(--s2)">' +
         '<button type="button" class="btn quiet sm" onclick="openWhy(\'progression\',\'' + e.id + '\')">' +
           esc(t('sci.whyOpen')) + '</button>' +
         '<button type="button" class="btn quiet sm" onclick="openExerciseDetail(\'' + e.id + '\')">' +
           esc(t('exd.open')) + '</button></div>';
    h += '</div>';
  });
  h += '</div>';

  return { html: h, noRefresh: true };
}

function selectPlanDay(id){ PLAN_DAY = id; render(); }
function togglePlanEdit(){ PLAN_EDIT = !PLAN_EDIT; render(); }
function setPlanRest(sec){
  const s = getState();
  if(!s.plan) return;
  s.plan.restSec = sec;
  saveState(); render();
}
function adjustPlanSets(dayId, exIdx, delta){
  const s = getState();
  const day = s.plan && (s.plan.sessions || []).filter(x => x.id === dayId)[0];
  if(!day || !day.exercises[exIdx]) return;
  day.exercises[exIdx].sets = Math.max(1, Math.min(8, (day.exercises[exIdx].sets || 3) + delta));
  saveState(); render();
}
function movePlanExercise(dayId, exIdx, dir){
  const s = getState();
  const day = s.plan && (s.plan.sessions || []).filter(x => x.id === dayId)[0];
  if(!day) return;
  const to = exIdx + dir;
  if(to < 0 || to >= day.exercises.length) return;
  const tmp = day.exercises[exIdx];
  day.exercises[exIdx] = day.exercises[to];
  day.exercises[to] = tmp;
  saveState(); render();
}
function removePlanExercise(dayId, exIdx){
  const s = getState();
  const day = s.plan && (s.plan.sessions || []).filter(x => x.id === dayId)[0];
  if(!day || !day.exercises[exIdx]) return;
  day.exercises.splice(exIdx, 1);
  saveState(); render();
}
function openPlanSub(dayId, exIdx){
  const s = getState();
  const day = s.plan && (s.plan.sessions || []).filter(x => x.id === dayId)[0];
  if(!day || !day.exercises[exIdx]) return;
  const curId = day.exercises[exIdx].id;
  const subs = substitutesFor(s.profile, curId);
  sheet(t('session.sub'), subs.length ? (
    '<p class="body-sm" style="margin-bottom:var(--s3)">' + esc(t('session.keep')) + '</p><div class="tiles">' +
    subs.map(e => '<button class="tile" onclick="applyPlanSub(\'' + dayId + '\',' + exIdx + ',\'' + e.id + '\')"><span class="box"></span>' +
      '<span><span class="t">' + esc(t('ex.'+e.id)) + '</span><span class="d">' +
      esc(e.m.map(x => t('mg.'+x[0])).join(', ')) + '</span></span></button>').join('') + '</div>')
    : emptyState('session.nosub','session.nosubBody','inbox'));
}
function applyPlanSub(dayId, exIdx, newId){
  const s = getState();
  const day = s.plan && (s.plan.sessions || []).filter(x => x.id === dayId)[0];
  const ex = EX_BY_ID[newId];
  if(!day || !day.exercises[exIdx] || !ex) return;
  const keepSets = day.exercises[exIdx].sets || 3;
  day.exercises[exIdx] = { id: newId, sets: keepSets, reps: ex.reps.slice(), rir: ex.rir };
  saveState(); closeSheet(); render();
}

/* Add an exercise to a planned day OR to the live active workout! */
function openAddExerciseSheet(targetKind, dayId){
  const s = getState();
  const pool = allowedExercises(s.profile || {});
  const list = pool.length ? pool : EX;
  let h = '<div class="field"><label for="addExFilter">' + esc(t('sci.search')) + '</label>' +
          '<input type="text" id="addExFilter" placeholder="' + esc(t('plan.searchEx')) +
          '" oninput="filterAddExSheet(this.value)"></div>';
  h += '<div class="tiles" id="addExList" style="max-height:54vh;overflow:auto">';
  list.forEach(e => {
    const spec = exLogSpec(e);
    const searchBlob = (t('ex.'+e.id) + ' ' + t('pat.'+e.pat) + ' ' + e.m.map(x=>t('mg.'+x[0])).join(' ')).toLowerCase();
    const action = targetKind === 'active'
      ? 'addExerciseToActive(\'' + e.id + '\')'
      : 'addExerciseToPlan(\'' + (dayId || '') + '\',\'' + e.id + '\')';
    h += '<button type="button" class="tile" data-q="' + esc(searchBlob) + '" onclick="' + action + '">' +
         '<span class="box"></span><span style="flex:1;min-width:0">' +
         '<span class="t">' + esc(t('ex.' + e.id)) + '</span>' +
         '<span class="d">' + esc(t('pat.' + e.pat)) + ' · ' + esc(t('equip.' + e.equip)) +
         ' · ' + esc(t('exd.mode.' + spec.mode)) + ' · ' +
         esc(e.m.map(x => t('mg.' + x[0])).join(', ')) + '</span></span></button>';
  });
  h += '</div>';
  sheet(t('plan.addEx'), h);
}
function filterAddExSheet(q){
  const term = String(q || '').trim().toLowerCase();
  $$('#addExList .tile').forEach(el => {
    const hay = el.getAttribute('data-q') || '';
    el.hidden = !!(term && hay.indexOf(term) < 0);
  });
}
function addExerciseToPlan(dayId, exId){
  const s = getState();
  const ex = EX_BY_ID[exId]; if(!ex || !s.plan) return;
  const day = (s.plan.sessions || []).filter(x => x.id === dayId)[0] || s.plan.sessions[0];
  if(!day) return;
  const cfg = setsFor(ex, s.profile || {});
  const rangeUnit = exTargetRange(ex).unit;
  const reps = (cfg.bias && rangeUnit === 'reps') ? [cfg.bias.lo, cfg.bias.hi] : ex.reps.slice();
  const rir  = cfg.bias ? Math.max(cfg.rir, cfg.bias.rir) : cfg.rir;
  day.exercises.push({ id: ex.id, sets: cfg.sets, reps: reps, rir: rir });
  if(ex.m && ex.m[0] && day.focus && day.focus.indexOf(ex.m[0][0]) < 0){
    day.focus.push(ex.m[0][0]);
  }
  saveState(); closeSheet();
  toast(t('ex.' + ex.id), 'ok');
  if(SESSION_SUB === 'library') SESSION_SUB = 'plan';
  PLAN_DAY = day.id;
  render();
}
function addExerciseToActive(exId){
  const ex = EX_BY_ID[exId]; if(!ex || !ACTIVE) return;
  const cfg = setsFor(ex, getState().profile || {});
  ACTIVE.exercises.push(newActiveExercise({ id: ex.id, sets: cfg.sets, reps: ex.reps.slice(), rir: cfg.rir }));
  saveDraft(); closeSheet();
  SESSION_SUB = 'live';
  toast(t('ex.' + ex.id), 'ok');
  render();
}
function startCustomSession(){
  const s = getState(), now = Date.now();
  const firstPool = allowedExercises(s.profile || {});
  const seedEx = firstPool[0] || EX[0];
  ACTIVE = {
    planId: 'custom',
    name: t('plan.customName'),
    startedAt: now,
    finished: false,
    restSec: (s.plan && s.plan.restSec) ? s.plan.restSec : 120,
    exercises: seedEx ? [newActiveExercise({ id: seedEx.id, sets: 3, reps: seedEx.reps.slice(), rir: seedEx.rir })] : []
  };
  SESSION_SUB = 'live';
  saveDraft(); go('session');
}

/* ============================================================================
   2. ACTIVE WORKOUT — LIVE HUD & TABULAR SET LOGGER
   ========================================================================== */
function targetRangeText(ex){
  const r = exTargetRange(ex);
  if(r.unit === 'time')     return t('log.holdTarget', { lo:r.lo, hi:r.hi });
  if(r.unit === 'distance') return t('log.distTarget', { lo:r.lo, hi:r.hi }) + ' ' + distanceUnit(unit());
  return t('log.repTarget', { lo:r.lo, hi:r.hi });
}

function recommendationText(r, ex){
  const u = r.unit;
  if(r.rangeUnit === 'time'){
    return (r.targetTime ? '<b>' + r.targetTime + ' ' + esc(t('log.unit.s')) + '</b>' : '—') +
           (r.load ? ' · +' + r.load + ' ' + esc(u) : '');
  }
  if(r.rangeUnit === 'distance'){
    return (r.targetDistance ? '<b>' + esc(formatDistance(r.targetDistance, u)) + '</b>' : '—') +
           (r.load ? ' · ' + r.load + ' ' + esc(u) : '');
  }
  if(r.mode === 'assisted'){
    return (r.assist !== null ? '<b>−' + r.assist + ' ' + esc(u) + '</b> ' + esc(t('log.assistShort')) : esc(t('c.none'))) +
           ' × ' + r.targetReps + ' ' + esc(t('session.reps'));
  }
  if(r.load === null) return esc(t('train.firsttime'));
  const role = exLogSpec(ex).loadRole;
  if(role === 'added' && !r.load) return esc(t('log.basis.reps')) + ' · ' + r.targetReps;
  return '<b>' + (role === 'added' ? '+' : '') + r.load + ' ' + esc(u) + '</b> × ' +
         r.targetReps + ' ' + esc(t('session.reps'));
}

function recommendationTextPlain(r, ex){
  const u = r.unit;
  if(r.rangeUnit === 'time')     return (r.targetTime ? r.targetTime + ' ' + t('log.unit.s') : '—') +
                                        (r.load ? ' · +' + r.load + ' ' + u : '');
  if(r.rangeUnit === 'distance') return (r.targetDistance ? formatDistance(r.targetDistance, u) : '—') +
                                        (r.load ? ' · ' + r.load + ' ' + u : '');
  if(r.mode === 'assisted')      return (r.assist !== null ? '−' + r.assist + ' ' + u : t('c.none')) +
                                        ' × ' + r.targetReps;
  if(r.load === null) return '';
  const role = exLogSpec(ex).loadRole;
  if(role === 'added' && !r.load) return r.targetReps + ' ' + t('log.repsShort');
  return (role === 'added' ? '+' : '') + r.load + ' ' + u + ' × ' + r.targetReps;
}

function plannedSet(ex, rec, range){
  const spec = exLogSpec(ex);
  const set = blankSet();
  set.planned = true;
  set.entered = false;
  if(spec.hasAssist && rec && rec.assist !== null) set.a = String(rec.assist);
  else if(spec.hasLoad && rec && rec.load !== null) set.w = String(rec.load);
  if(spec.hasReps && rec && rec.targetReps) set.r = String(rec.targetReps);
  if(spec.hasTime && rec && rec.targetTime) set.t = String(rec.targetTime);
  if(spec.hasDistance && rec && rec.targetDistance) set.d = String(rec.targetDistance);
  return set;
}

function newActiveExercise(planEntry){
  const ex = EX_BY_ID[planEntry.id];
  const rec = recommend(getState(), planEntry.id, Date.now());
  const range = exTargetRange(ex);
  const sets = [];
  for(let i=0;i<planEntry.sets;i++) sets.push(plannedSet(ex, rec, range));
  return {
    id: planEntry.id,
    prescribed: planEntry.sets,
    sets: sets,
    reps: planEntry.reps.slice(),
    rir: planEntry.rir,
    note: '',
    plan: { sets: planEntry.sets, reps: planEntry.reps.slice(), rir: planEntry.rir }
  };
}

function previousExerciseNote(state, exId, before){
  const list = (state && state.sessions || []).filter(s => before === undefined || s.date < before)
                 .slice().sort((a,b) => b.date - a.date);
  for(let i = 0; i < list.length; i++){
    const exRow = (list[i].exercises || []).filter(x => x.id === exId && x.note && String(x.note).trim())[0];
    if(exRow) return { note: String(exRow.note).trim(), date: list[i].date };
  }
  return null;
}

function setExNote(ei, val){
  const e = ACTIVE && ACTIVE.exercises[ei];
  if(!e) return;
  e.note = String(val || '').slice(0, 240);
  saveDraft();
}

function skipExercise(ei){
  const e = ACTIVE && ACTIVE.exercises[ei];
  if(!e) return;
  e.sets.forEach(st => { if(!st.committed) st.skipped = true; });
  saveDraft();
  render();
}

function renderLive(){
  const s = getState();
  let logged = 0, total = 0, liveLoadVol = 0;
  let curEi = -1, curSi = -1;

  ACTIVE.exercises.forEach((e, ei) => {
    const ex = EX_BY_ID[e.id];
    total += e.sets.length;
    e.sets.forEach((st, si) => {
      if(curEi < 0 && !st.committed && !st.skipped){ curEi = ei; curSi = si; }
      if(st.committed){
        logged++;
        if(ex){
          const m = setMetrics(st, ex, s.profile);
          if(m.volume !== null) liveLoadVol += m.volume;
        }
      }
    });
  });

  let h = sessionSubnavHtml();

  /* Sticky Live Instrument HUD */
  h += '<div class="live-hud">';
  h += '<div class="live-hud-top">';
  h += '<div><p class="eyebrow" style="color:var(--burnt)">' +
       esc(ACTIVE.paused ? t('session.restPaused') : t('plan.liveBadge')) + '</p>' +
       '<div style="display:flex;align-items:baseline;gap:var(--s3);margin-top:2px">' +
       '<strong style="font-family:var(--f-display);font-size:20px;letter-spacing:.04em;text-transform:uppercase">' +
       esc(ACTIVE.name || t('session.title')) + '</strong>' +
       '<span class="live-clock" id="liveClock">' + formatElapsed(activeElapsedMs()) + '</span>' +
       '</div></div>';
  h += '<div class="live-hud-meta">' +
       (liveLoadVol > 0 ? '<span>' + Math.round(liveLoadVol) + ' ' + esc(unit()) + '·' + esc(t('log.repsShort')) + '</span>' : '') +
       '<button type="button" class="btn quiet sm" onclick="togglePauseWorkout()" aria-pressed="' + (ACTIVE.paused?'true':'false') + '">' +
       esc(ACTIVE.paused ? t('session.restResume') : t('session.restPause')) + '</button>' +
       '<button type="button" class="btn quiet sm" onclick="startRest(' + (ACTIVE.restSec || 120) + ')">' +
       esc(t('session.rest')) + ' ' + (ACTIVE.restSec || 120) + 's</button>' +
       '<button type="button" class="btn quiet sm" onclick="openAddExerciseSheet(\'active\')">+ ' + esc(t('plan.addEx')) + '</button>' +
       '<button type="button" class="btn danger sm" style="border-color:rgba(241,235,221,.35);color:var(--ivory)" onclick="discardSession()">' +
       esc(t('session.discard')) + '</button>' +
       '</div></div>';
  h += '<div class="session-progress" id="sessProg"><span class="eyebrow">' +
       esc(t('log.remaining', { n: logged, m: total })) +
       '</span><span class="track"><i style="width:' + (total ? Math.round(logged / total * 100) : 0) + '%"></i></span></div>';
  h += '</div>';

  /* Exercise panels */
  ACTIVE.exercises.forEach((e, ei) => {
    const ex = EX_BY_ID[e.id]; if(!ex) return;
    const spec = exLogSpec(ex);
    const range = exTargetRange(ex);
    const prev = previousPerformance(s, e.id, ACTIVE.startedAt);
    const prevNote = previousExerciseNote(s, e.id, ACTIVE.startedAt);
    const isCurrent = (ei === curEi);

    h += '<div class="panel" style="' + (isCurrent ? 'border-color:var(--burnt);box-shadow:var(--shadow-2)' : '') + '">';
    h += '<div class="panel-hd" style="align-items:center"><div style="display:flex;align-items:center;gap:var(--s3);min-width:0">' +
         (typeof exerciseThumbSvg === 'function' ? exerciseThumbSvg(ex) : '') +
         '<div style="min-width:0">' +
           '<div style="display:flex;align-items:baseline;gap:var(--s2);flex-wrap:wrap">' +
             '<span class="mono" style="font-size:11px;color:var(--burnt-text);font-weight:700">' + String(ei+1).padStart(2,'0') + '</span>' +
             '<button type="button" class="plan-ex-title" onclick="openExerciseDetail(\'' + e.id + '\')">' +
             esc(t('ex.'+e.id)) + '</button>' +
           '</div>' +
           '<div class="hint" style="margin-top:2px">' +
             (ex.m || []).map(([m,w], idx) => esc(t('mg.' + m)) + (idx===0 ? ' (' + Math.round(w*100) + '%)' : '')).join(' · ') +
           '</div>' +
         '</div></div>' +
         '<span class="hint">' + (ei+1) + '/' + ACTIVE.exercises.length + '</span></div>';

    h += '<div class="chips" style="margin-bottom:var(--s2)">' +
         '<span class="flag accent">' + targetRangeText(ex) + '</span>' +
         '<span class="flag plain">' + esc(t('session.rir')) + ' ' + e.rir + '</span>' +
         '<span class="flag plain">' + esc(t('session.rest')) + ' ' + (ACTIVE.restSec || 120) + 's</span>' +
         '<span class="flag plain">' + esc(t('exd.mode.' + spec.mode)) + '</span>' +
         (spec.unilateral ? '<span class="flag plain">' + esc(t('log.unilateral')) + '</span>' : '') + '</div>';

    if(prev && prev.text){
      h += '<div class="prev-line"><span class="k">' + esc(t('c.previous')) + '</span>' +
           '<b>' + esc(prev.text) + '</b><span class="d">' + esc(dateLabel(prev.date)) + '</span>' +
           (prev.best && prev.best.set
             ? '<button type="button" class="prev-copy-btn" onclick="copyPrevToExercise(' + ei + ')">' +
               esc(t('log.useLast')) + '</button>' : '') +
           '</div>';
    } else {
      h += '<div class="prev-line"><span class="k">' + esc(t('c.previous')) + '</span>' +
           '<span class="d">' + esc(t('log.noPrev')) + '</span></div>';
    }
    if(prevNote){
      h += '<p class="hint" style="margin:-4px 0 var(--s2)"><b>' + esc(t('log.prevNote')) + ':</b> ' +
           esc(prevNote.note) + ' (' + esc(dateLabel(prevNote.date)) + ')</p>';
    }

    e.sets.forEach((set, si) => { h += setRowHtml(e, set, ei, si, ex, spec, range, ei === curEi && si === curSi); });

    /* Per-exercise note */
    h += '<div class="ex-note-wrap">' +
         '<label for="exnote_' + ei + '" class="sr-only">' + esc(t('log.notePlaceholder')) + '</label>' +
         '<input id="exnote_' + ei + '" type="text" value="' + esc(e.note || '') +
         '" placeholder="' + esc(t('log.notePlaceholder')) + '" oninput="setExNote(' + ei + ',this.value)"></div>';

    h += '<div style="display:flex;gap:var(--s2);flex-wrap:wrap;margin-top:var(--s2);align-items:center">';
    h += '<button class="btn quiet sm" onclick="addSet(' + ei + ')">' + esc(t('log.addSet')) + '</button>';
    h += '<button class="btn quiet sm" onclick="skipSet(' + ei + ')">' + esc(t('session.skipset')) + '</button>';
    h += '<button class="btn quiet sm" onclick="skipExercise(' + ei + ')">' + esc(t('log.skipEx')) + '</button>';
    h += '<button class="btn quiet sm" onclick="openSub(' + ei + ')">' + esc(t('session.sub')) + '</button>';
    h += '<button class="btn quiet sm" onclick="openExerciseDetail(\'' + e.id + '\')">' + esc(t('exd.open')) + '</button>';
    h += '</div>';

    h += '<p class="hint" style="margin-top:var(--s2);margin-bottom:4px">' +
         esc(spec.mode === 'assisted' ? t('log.assistHint')
           : spec.loadRole === 'added' ? t('log.addedHint')
           : t('log.warmupNote')) + '</p>';
    h += '<p class="body-sm" style="margin:0">' + esc(t('cue.'+e.id)) + '</p>';
    h += '</div>';
  });

  h += '<div class="panel" style="margin-top:var(--s4);border-top:2px solid var(--charcoal)">';
  h += '<button class="btn ' + (logged ? '' : 'secondary') + ' block" onclick="finishSession()">' +
       esc(t('session.finish')) + ' (' + logged + '/' + total + ')</button>';
  h += '</div>';
  return h;
}

function setRowHtml(e, set, ei, si, ex, spec, range, isCurrentSet){
  const u = unit();
  const locked = set.skipped;
  const ready = !locked && isSetComplete(set, ex);
  const state = locked ? 'skipped' : (set.committed ? 'done' : (set.entered ? 'entered' : 'planned'));
  const STATE_LABEL = { skipped:'session.skipped', done:'log.done', entered:'log.actual', planned:'session.planned' };
  const STATE_FLAG  = { skipped:'nodata', done:'ok', entered:'accent', planned:'plain' };
  const justDone = (LAST_LOGGED_SET === (ei + ':' + si));
  if(justDone) LAST_LOGGED_SET = null;

  let h = '<div class="setcard setcard-grid ' + (set.committed ? 'done' : (isCurrentSet ? 'current-set' : '')) + (justDone ? ' just-done' : '') + '" style="' + (locked?'opacity:.45':'') + '">';
  h += '<div class="set-head"><span class="eyebrow">' + esc(t('session.setOf')) + ' ' + (si+1) + ' / ' + e.sets.length + '</span>' +
       (isCurrentSet && !set.committed ? '<span class="flag sm accent">' + esc(t('log.currentSet')) + '</span>'
         : '<span class="flag sm ' + STATE_FLAG[state] + '">' + esc(t(STATE_LABEL[state])) + '</span>') +
       (set.warmup ? '<span class="flag sm plain">' + esc(t('log.warmupShort')) + '</span>' : '') +
       (!locked && spec.unilateral && (spec.hasReps || spec.hasTime)
         ? '<button type="button" class="prev-copy-btn" onclick="toggleLrSplit(' + ei + ',' + si + ')" aria-pressed="' +
           (set.lrSplit ? 'true' : 'false') + '">' + esc(t('log.lrSplit')) + '</button>' : '') +
       '</div>';

  h += '<div style="min-width:0">';
  if(!locked){
    h += '<div class="row">';
    spec.fields.concat(spec.optional).forEach(f => {
      if(set.lrSplit && (f.key === 'reps' || f.key === 'time')){
        h += sideFieldsHtml(f, ei, si, set, range);
      } else {
        h += fieldHtml(f, ei, si, set, ex, range, u);
      }
    });
    h += '</div>';
    if(!ready){
      const missing = missingFields(set, ex);
      h += '<p class="hint" style="margin-top:6px">' + esc(emptyHintFor(spec, missing)) + '</p>';
    }
  }
  h += '</div>';

  h += '<div class="set-actions">';
  if(locked){
    h += '<button class="btn quiet sm" onclick="unskipSet(' + ei + ',' + si + ')">' + esc(t('btn.retry')) + '</button>';
  } else {
    h += '<button class="btn ' + (set.committed ? 'quiet' : '') + ' sm" id="logbtn_' + ei + '_' + si + '" ' +
         (ready ? '' : 'disabled') + ' onclick="toggleSet(' + ei + ',' + si + ')">' +
         esc(set.committed ? t('log.correct') : t('log.logSet')) + '</button>';
    h += '<button class="btn quiet sm" onclick="toggleWarmup(' + ei + ',' + si + ')" aria-pressed="' +
         (set.warmup ? 'true' : 'false') + '">' + esc(t('log.warmup')) + '</button>';
    h += '<button class="btn quiet sm" onclick="removeSet(' + ei + ',' + si + ')">' + esc(t('log.removeSet')) + '</button>';
  }
  h += '</div>';
  h += '</div>';
  return h;
}

function fieldHtml(f, ei, si, set, ex, range, u){
  const raw = set[f.attr];
  let val = raw, suffix = '';
  if(f.key === 'distance'){
    val = (raw === '' || raw === null) ? '' : (Math.round(toDisplayDistance(+raw, u)*10)/10);
    suffix = distanceUnit(u);
  } else if(f.key === 'load' || f.key === 'added' || f.key === 'assist'){
    suffix = u;
  } else if(f.key === 'time'){
    suffix = t('log.unit.s');
  } else if(f.key === 'reps'){
    suffix = range.lo + '–' + range.hi;
  } else if(f.key === 'rir'){
    suffix = 'RIR';
  }
  const labelKey = f.key === 'load' ? (exLogSpec(ex).loadRole === 'added' ? 'log.added' : 'log.load') : f.labelKey;
  const optional = exLogSpec(ex).optional.indexOf(f) >= 0;
  const fid = 'sf_' + ei + '_' + si + '_' + f.key;
  return '<div class="fld"><label for="' + fid + '">' + esc(t(labelKey)) +
         (optional ? ' <span class="opt">' + esc(t('c.optional')) + '</span>' : '') + '</label>' +
         '<input id="' + fid + '" type="number" inputmode="decimal" step="' + f.step + '" placeholder="—" value="' + esc(val) + '" ' +
         'oninput="setVal(' + ei + ',' + si + ',\'' + f.attr + '\',this.value)">' +
         '<span class="u">' + esc(suffix) + '</span></div>';
}

function sideFieldsHtml(f, ei, si, set, range){
  const baseAttr = f.attr; // 'r' or 't'
  const lKey = baseAttr + 'L', rKey = baseAttr + 'R';
  const vL = set[lKey] !== undefined ? set[lKey] : set[baseAttr];
  const vR = set[rKey] !== undefined ? set[rKey] : set[baseAttr];
  const suffix = f.key === 'time' ? t('log.unit.s') : (range.lo + '–' + range.hi);
  const idL = 'sf_' + ei + '_' + si + '_' + lKey, idR = 'sf_' + ei + '_' + si + '_' + rKey;
  return '<div class="fld"><label for="' + idL + '">' + esc(t('lab3d.side.left')) + '</label>' +
         '<input id="' + idL + '" type="number" inputmode="decimal" step="1" placeholder="—" value="' + esc(vL) + '" ' +
         'oninput="setSideVal(' + ei + ',' + si + ',\'' + baseAttr + '\',\'L\',this.value)">' +
         '<span class="u">' + esc(suffix) + '</span></div>' +
         '<div class="fld"><label for="' + idR + '">' + esc(t('lab3d.side.right')) + '</label>' +
         '<input id="' + idR + '" type="number" inputmode="decimal" step="1" placeholder="—" value="' + esc(vR) + '" ' +
         'oninput="setSideVal(' + ei + ',' + si + ',\'' + baseAttr + '\',\'R\',this.value)">' +
         '<span class="u">' + esc(suffix) + '</span></div>';
}

function toggleLrSplit(ei, si){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e || !e.sets[si]) return;
  const st = e.sets[si];
  st.lrSplit = !st.lrSplit;
  if(st.lrSplit){
    if(st.r !== '' && st.r !== null){ if(st.rL === undefined) st.rL = st.r; if(st.rR === undefined) st.rR = st.r; }
    if(st.t !== '' && st.t !== null){ if(st.tL === undefined) st.tL = st.t; if(st.tR === undefined) st.tR = st.t; }
  }
  saveDraft(); render();
}

function setSideVal(ei, si, baseAttr, side, v){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e || !e.sets[si]) return;
  const st = e.sets[si];
  st[baseAttr + side] = v;
  const a = parseFloat(st[baseAttr + 'L']), b = parseFloat(st[baseAttr + 'R']);
  if(isFinite(a) && isFinite(b) && a > 0 && b > 0){
    /* Conservative bilateral summary: the weaker limb governs progression */
    st[baseAttr] = String(Math.min(a, b));
  } else {
    st[baseAttr] = '';
  }
  st.entered = true;
  st.committed = false;
  saveDraft();
  paintSetActions(ei, si);
}

function emptyHintFor(spec, missing){
  if(missing.indexOf('time') >= 0)     return t('log.emptyTime');
  if(missing.indexOf('distance') >= 0) return t('log.emptyDistance');
  if(missing.indexOf('external') >= 0) return t('log.emptyLoad');
  if(missing.indexOf('added') >= 0)    return t('log.emptyLoad');
  if(missing.indexOf('load') >= 0)     return t('log.emptyLoad');
  if(missing.indexOf('assist') >= 0)   return t('log.emptyLoad');
  return t('log.emptyReps');
}

/* Starts the recommended session when called with no args, or a specific split
   day when given its plan session id. */
function startSession(dayId){
  const s = getState(), now = Date.now();
  let chosen = null;
  if(dayId && s.plan && s.plan.sessions){
    chosen = s.plan.sessions.filter(x => x.id === dayId)[0] || null;
  }
  if(!chosen){
    const next = nextSession(s, now);
    if(!next) return;
    chosen = next.session;
  }
  ACTIVE = {
    planId: chosen.id, name: chosen.name, startedAt: now,
    finished: false,
    restSec: s.plan ? s.plan.restSec : 120,
    exercises: (chosen.exercises || []).map(newActiveExercise)
  };
  SESSION_SUB = 'live';
  saveDraft(); go('session');
}

function setVal(ei, si, f, v){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  const set = e.sets[si]; if(!set || set.skipped) return;
  if(f === 'd'){ set.d = (v === '' || v === null) ? '' : fromDisplayDistance(+v, unit()); }
  else set[f] = v;
  if(ENTERING_FIELDS[f]) set.entered = true;
  set.committed = false;
  saveDraft();
  paintSetActions(ei, si);
}

function paintSetActions(ei, si){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  const set = e.sets[si]; if(!set) return;
  const btn = document.getElementById('logbtn_' + ei + '_' + si);
  if(btn){
    const ex = EX_BY_ID[e.id];
    btn.disabled = !isSetComplete(set, ex);
    btn.textContent = t(set.committed ? 'log.correct' : 'log.logSet');
  }
  const bar = document.getElementById('sessProg');
  if(bar){
    let logged = 0, total = 0;
    ACTIVE.exercises.forEach(x => { total += x.sets.length; logged += x.sets.filter(y=>y.committed).length; });
    const lbl = bar.querySelector('.eyebrow'), fill = bar.querySelector('.track i');
    if(lbl) lbl.textContent = t('log.remaining', { n:logged, m:total });
    if(fill) fill.style.width = (total ? Math.round(logged/total*100) : 0) + '%';
  }
}

function copyPrevToExercise(ei){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  const prev = previousPerformance(getState(), e.id, ACTIVE.startedAt);
  if(!prev || !prev.best || !prev.best.set) return;
  const src = prev.best.set;
  let copied = 0;
  e.sets.forEach(st => {
    if(st.committed || st.skipped) return;
    ['w','r','t','d','a','rir'].forEach(k => {
      if(src[k] !== null && src[k] !== undefined && src[k] !== '') st[k] = String(src[k]);
    });
    st.entered = true;
    copied++;
  });
  if(copied){ saveDraft(); toast(t('log.useLast'), 'ok'); render(); }
}

function toggleSet(ei, si){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  const set = e.sets[si]; if(!set || set.skipped) return;
  const ex = EX_BY_ID[e.id];
  if(set.committed){
    set.committed = false;
    saveDraft(); render();
    return;
  }
  if(!isSetComplete(set, ex)) return;
  set.committed = true;
  set.entered = true;
  LAST_LOGGED_SET = ei + ':' + si;
  saveDraft();
  try { pressFeedback(null); } catch(err){}
  startRest(ACTIVE.restSec);
  render();
}

function logSet(ei, si){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  const ex = EX_BY_ID[e.id];
  let i = (si === undefined || si === null) ? -1 : si;
  if(i < 0) i = e.sets.findIndex(x => !x.skipped && !x.committed && isSetComplete(x, ex));
  if(i < 0 || !e.sets[i] || e.sets[i].skipped) return;
  if(!isSetComplete(e.sets[i], ex)) return;
  e.sets[i].committed = true;
  e.sets[i].entered = true;
  LAST_LOGGED_SET = ei + ':' + i;
  saveDraft();
  startRest(ACTIVE.restSec);
  render();
}

function skipSet(ei){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  const i = e.sets.findIndex(x => !x.skipped);
  if(i < 0) return;
  e.sets[i].skipped = true;
  e.sets[i].committed = false;
  saveDraft(); render();
}
function unskipSet(ei, si){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  const set = e.sets[si]; if(!set) return;
  set.skipped = false; set.committed = false; set.entered = false;
  saveDraft(); render();
}
function toggleWarmup(ei, si){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  const set = e.sets[si]; if(!set) return;
  set.warmup = !set.warmup;
  saveDraft(); render();
}
function addSet(ei){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  const ex = EX_BY_ID[e.id]; if(!ex) return;
  const rec = recommend(getState(), e.id, Date.now());
  const set = plannedSet(ex, rec, exTargetRange(ex));
  set.entered = false;
  e.sets.push(set);
  saveDraft(); render();
}
function removeSet(ei, si){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  if(e.sets.length <= 1){ toast(t('log.needOneSet')); return; }
  e.sets.splice(si, 1);
  saveDraft(); render();
}

function openSub(ei){
  const subs = substitutesFor(getState().profile, ACTIVE.exercises[ei].id);
  sheet(t('session.sub'), subs.length ? (
    '<p class="body-sm" style="margin-bottom:var(--s3)">' + esc(t('session.keep')) + '</p><div class="tiles">' +
    subs.map(e => '<button class="tile" onclick="applySub(' + ei + ',\'' + e.id + '\')"><span class="box"></span>' +
      '<span><span class="t">' + esc(t('ex.'+e.id)) + '</span><span class="d">' +
      esc(e.m.map(function(x){ return t('mg.'+x[0]); }).join(', ')) + '</span></span></button>').join('') + '</div>')
    : emptyState('session.nosub','session.nosubBody','inbox'));
}
function applySub(ei, id){
  const ex = EX_BY_ID[id]; if(!ex) return;
  const keep = ACTIVE.exercises[ei].prescribed;
  ACTIVE.exercises[ei] = newActiveExercise({ id:id, sets:keep, reps:ex.reps.slice(), rir:ex.rir });
  saveDraft(); closeSheet(); render();
}
function discardSession(){
  if(!confirm(t('dlg.confirm'))) return;
  ACTIVE = null; SESSION_SUB = 'plan';
  clearDraft(); stopRest(); syncLiveClock();
  go('session');
}

let FINISHING = false;
function finishSession(){
  if(!ACTIVE || FINISHING) return;
  const s = getState();
  const startedAt = ACTIVE.startedAt;
  if(s.sessions.some(x => x.startedAt === startedAt)){
    toast(t('log.alreadySaved')); ACTIVE = null; SESSION_SUB = 'plan'; clearDraft(); go('progress'); return;
  }
  const exercises = [], loggable = [];
  ACTIVE.exercises.forEach(e => {
    const ex = EX_BY_ID[e.id]; if(!ex) return;
    const sets = [];
    e.sets.forEach(x => {
      if(!x || x.skipped) return;
      if(!(x.committed || x.entered)) return;
      if(!isSetComplete(x, ex)) return;
      sets.push(normaliseLoggedSet(x, ex));
    });
    if(!sets.length) return;
    const cleanNote = e.note && String(e.note).trim() ? String(e.note).trim().slice(0, 240) : '';
    const entry = { id:e.id, sets:sets, plan:e.plan || null };
    if(cleanNote) entry.note = cleanNote;
    loggable.push(entry);
    exercises.push(entry);
  });
  if(!exercises.length){ toast(emptySessionMessage()); return; }

  FINISHING = true;
  const nowFinish = Date.now();
  const beforeMiles = (typeof trainingMilestones === 'function')
    ? trainingMilestones(s, nowFinish).filter(m => m.earned).map(m => m.id) : [];
  const durationMs = activeElapsedMs();
  const rec = addSession({ planId:ACTIVE.planId, name:ACTIVE.name, startedAt:startedAt,
                           exercises:exercises, durationMs:durationMs });
  loggable.forEach(e => updateAdaptation(s, e.id, rec.date));

  const records = { pr:[], baseline:[] };
  const musclesMap = {};
  loggable.forEach(e => {
    const kind = recordKind(s, e.id, e.sets);
    if(kind === 'pr') records.pr.push(t('ex.'+e.id));
    else if(kind === 'baseline') records.baseline.push(t('ex.'+e.id));
    const exObj = EX_BY_ID[e.id];
    if(exObj && exObj.m && exObj.m[0]) musclesMap[exObj.m[0][0]] = 1;
  });

  const afterMiles = (typeof trainingMilestones === 'function')
    ? trainingMilestones(s, nowFinish).filter(m => m.earned && beforeMiles.indexOf(m.id) < 0) : [];
  const sessVol = (typeof sessionTotalVolume === 'function') ? sessionTotalVolume(rec, s) : null;
  const targetDays = Math.max(1, +(s.profile && s.profile.daysPerWeek) || 3);
  const thisWeek = (s.sessions || []).filter(x => x.date >= nowFinish - 7*86400000).length;

  ACTIVE = null; SESSION_SUB = 'plan'; clearDraft(); stopRest(); syncLiveClock();
  LAST_SUMMARY = { prs: records.pr, baselines: records.baseline,
                   sets: exercises.reduce((a,e)=>a+e.sets.length,0),
                   exercises: exercises.length, durationMs: durationMs,
                   volume: sessVol, muscles: Object.keys(musclesMap),
                   newMilestones: afterMiles.map(m => m.titleKey),
                   thisWeek: thisWeek, targetDays: targetDays };
  FINISHING = false;
  showCompletion(LAST_SUMMARY);
}

function showCompletion(sum){
  const host = document.getElementById('sheetHost') || document.body;
  const mins = Math.max(1, Math.round((sum.durationMs || 0) / 60000));
  render();
  let h = '<div class="done-overlay" id="doneOverlay" role="dialog" aria-modal="true" ' +
          'aria-label="' + esc(t('done.title')) + '"><div class="done-card" tabindex="-1">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--s3)">' +
       '<div class="done-mark" aria-hidden="true">' +
       '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg></div>' +
       (sum.targetDays ? progressRing(Math.min(1, (sum.thisWeek||0)/sum.targetDays),
         { r:18, stroke:3.5, ringKey:'done.week', label:t('home.weekTitle') }) : '') +
       '</div>';
  h += '<p class="eyebrow">' + esc(t('done.saved')) + '</p>';
  h += '<h2 class="done-t">' + esc(t('done.title')) + '</h2>';

  h += '<div class="done-stats" data-stagger>';
  h += '<div class="done-stat"><span class="k">' + esc(t('done.sets')) + '</span>' +
       '<span class="v num" id="doneSets">0</span></div>';
  h += '<div class="done-stat"><span class="k">' + esc(t('done.exercises')) + '</span>' +
       '<span class="v num" id="doneEx">0</span></div>';
  h += '<div class="done-stat"><span class="k">' + esc(t('done.duration')) + '</span>' +
       '<span class="v num" id="doneMin">0</span></div>';
  h += '</div>';

  if(sum.volume !== null && sum.volume !== undefined && sum.volume > 0){
    h += '<div class="done-block"><p class="eyebrow">' + esc(t('progress.volume')) + '</p>' +
         '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap">' +
         '<strong class="num" style="font-size:18px">' + Math.round(sum.volume).toLocaleString() + ' ' + esc(unit()) + '·' + esc(t('log.repsShort')) + '</strong>' +
         (sum.muscles && sum.muscles.length
           ? '<span class="hint">' + sum.muscles.map(m => esc(t('mg.' + m))).join(' · ') + '</span>' : '') +
         '</div></div>';
  }

  if(sum.newMilestones && sum.newMilestones.length){
    h += '<div class="done-block"><p class="eyebrow">' + esc(t('mile.unlocked')) + '</p>' +
         '<div class="chips">' + sum.newMilestones.map(mk =>
           '<span class="flag ok flag-new">' + esc(t(mk)) + '</span>').join('') + '</div></div>';
  }

  if(sum.prs.length){
    h += '<div class="done-block"><p class="eyebrow">' + esc(t('done.records')) + '</p>';
    h += '<div class="chips">' + sum.prs.map(n =>
         '<span class="flag ok flag-new">' + esc(n) + '</span>').join('') + '</div></div>';
  }
  if(sum.baselines.length){
    h += '<div class="done-block"><p class="eyebrow">' + esc(t('done.baselines')) + '</p>';
    h += '<div class="chips">' + sum.baselines.map(n =>
         '<span class="flag accent">' + esc(n) + '</span>').join('') + '</div>' +
         '<p class="hint">' + esc(t('log.record.baseline')) + '</p></div>';
  }
  if(!sum.prs.length && !sum.baselines.length){
    h += '<div class="done-block"><p class="body-sm">' + esc(t('done.recordsNone')) + '</p></div>';
  }

  h += '<div class="done-block"><p class="eyebrow">' + esc(t('done.nextStep')) + '</p>' +
       '<p class="body-sm" style="margin-bottom:0">' + esc(t('done.nextStepBody')) + '</p></div>';

  h += '<div class="done-actions">' +
       '<button class="btn" onclick="closeCompletion(\'progress\')">' + esc(t('done.viewHistory')) + '</button>' +
       '<button class="btn quiet" onclick="closeCompletion(\'home\')">' + esc(t('done.backHome')) + '</button>' +
       '</div>';
  h += '</div></div>';
  host.innerHTML = h;

  const ovEl = document.getElementById('doneOverlay');
  if(ovEl){
    const ringC = ovEl.querySelector('circle[data-ring]');
    if(ringC) animateRing(ringC, parseFloat(ringC.getAttribute('data-ring')) || 0);
  }
  staggerIn(ovEl, { selector: '.done-stat, .done-block, .done-actions > *' });
  animateNumber(document.getElementById('doneSets'), sum.sets || 0);
  animateNumber(document.getElementById('doneEx'),   sum.exercises || 0);
  animateNumber(document.getElementById('doneMin'),  mins, { suffix: ' ' + t('c.min') });
  const card = document.querySelector('.done-card');
  if(card) setTimeout(() => card.focus(), 0);
}

function closeCompletion(to){
  const host = document.getElementById('sheetHost');
  if(host) host.innerHTML = '';
  toast(t('session.saved'), 'ok');
  go(to || 'progress');
}

function emptySessionMessage(){
  const first = (ACTIVE && ACTIVE.exercises || []).map(e => EX_BY_ID[e.id]).filter(Boolean)[0];
  if(!first) return t('session.empty');
  const spec = exLogSpec(first);
  if(spec.axis === 'time')     return t('log.emptyTime');
  if(spec.axis === 'distance') return t('log.emptyDistance');
  if(spec.hasLoad && spec.fields.some(f => f.key === 'load')) return t('log.emptyLoad');
  return t('log.emptyReps');
}

function normaliseLoggedSet(x, ex){
  const out = { w:null, r:null, t:null, d:null, a:null, rir:null };
  const spec = exLogSpec(ex);
  const n = v => (v === '' || v === null || v === undefined || !isFinite(+v)) ? null : +v;
  if(spec.hasLoad && spec.loadRole !== 'assist') out.w = n(x.w);
  if(spec.hasAssist) out.a = n(x.a);
  if(spec.hasReps)   out.r = n(x.r);
  if(spec.hasTime)   out.t = n(x.t);
  if(spec.hasDistance) out.d = n(x.d);
  out.rir = n(x.rir);
  if(x.rL !== undefined && n(x.rL) !== null && n(x.rR) !== null){ out.rL = n(x.rL); out.rR = n(x.rR); }
  if(x.tL !== undefined && n(x.tL) !== null && n(x.tR) !== null){ out.tL = n(x.tL); out.tR = n(x.tR); }
  if(x.warmup) out.warmup = true;
  return out;
}

/* ============================================================================
   3. 84-EXERCISE ATLAS LIBRARY
   ========================================================================== */
function setLibQuery(v){ LIB_QUERY = v || ''; render(); const inp = document.getElementById('libSearchInput'); if(inp){ inp.focus(); inp.setSelectionRange(LIB_QUERY.length, LIB_QUERY.length); } }
function setLibMuscle(m){ LIB_MUSCLE = m || 'all'; render(); }
function setLibEquip(eq){ LIB_EQUIP = eq || 'all'; render(); }
function setLibMode(md){ LIB_MODE = md || 'all'; render(); }
function resetLibFilters(){ LIB_QUERY = ''; LIB_MUSCLE = 'all'; LIB_EQUIP = 'all'; LIB_MODE = 'all'; render(); }

function renderExerciseLibrary(){
  const s = getState(), p = s.profile || {};
  const q = LIB_QUERY.trim().toLowerCase();
  const filtered = EX.filter(e => {
    const spec = exLogSpec(e);
    if(LIB_MUSCLE !== 'all' && !e.m.some(x => x[0] === LIB_MUSCLE)) return false;
    if(LIB_EQUIP !== 'all'  && e.equip !== LIB_EQUIP) return false;
    if(LIB_MODE !== 'all'   && spec.mode !== LIB_MODE) return false;
    if(q){
      const hay = (t('ex.' + e.id) + ' ' + t('cue.' + e.id) + ' ' + t('pat.' + e.pat) + ' ' +
                   e.m.map(x => t('mg.' + x[0])).join(' ')).toLowerCase();
      if(hay.indexOf(q) < 0) return false;
    }
    return true;
  });

  let h = '<div class="atlas-toolbar">';
  h += '<div class="field" style="margin-bottom:var(--s3)"><label for="libSearchInput">' +
       esc(t('plan.searchLabel')) + ' (' + filtered.length + ' / ' + EX.length + ')</label>' +
       '<input id="libSearchInput" type="text" value="' + esc(LIB_QUERY) +
       '" placeholder="' + esc(t('plan.searchEx')) + '" oninput="setLibQuery(this.value)"></div>';

  /* Muscle filter */
  h += '<div class="anat-filter-row" style="margin-bottom:var(--s2)">' +
       '<span class="anat-filter-lbl">' + esc(t('exd.muscles')) + '</span><div class="chips">' +
       '<button type="button" class="chip sm ' + (LIB_MUSCLE==='all'?'on':'') + '" onclick="setLibMuscle(\'all\')">' + esc(t('sci.all')) + '</button>' +
       MUSCLES.map(m =>
         '<button type="button" class="chip sm ' + (LIB_MUSCLE===m?'on':'') + '" onclick="setLibMuscle(\'' + m + '\')">' +
         esc(t('mg.' + m)) + '</button>'
       ).join('') + '</div></div>';

  /* Equipment filter */
  h += '<div class="anat-filter-row" style="margin-bottom:var(--s2)">' +
       '<span class="anat-filter-lbl">' + esc(t('plan.equipLabel')) + '</span><div class="chips">' +
       '<button type="button" class="chip sm ' + (LIB_EQUIP==='all'?'on':'') + '" onclick="setLibEquip(\'all\')">' + esc(t('sci.all')) + '</button>' +
       ['barbell','dumbbell','machine','cable','bodyweight','band'].map(eq =>
         '<button type="button" class="chip sm ' + (LIB_EQUIP===eq?'on':'') + '" onclick="setLibEquip(\'' + eq + '\')">' +
         esc(t('equip.' + eq)) + '</button>'
       ).join('') + '</div></div>';

  /* Mode filter */
  h += '<div class="anat-filter-row">' +
       '<span class="anat-filter-lbl">' + esc(t('chart.basis')) + '</span><div class="chips">' +
       '<button type="button" class="chip sm ' + (LIB_MODE==='all'?'on':'') + '" onclick="setLibMode(\'all\')">' + esc(t('sci.all')) + '</button>' +
       ['load','bodyweight','weighted','assisted','timed','distance'].map(md =>
         '<button type="button" class="chip sm ' + (LIB_MODE===md?'on':'') + '" onclick="setLibMode(\'' + md + '\')">' +
         esc(t('exd.mode.' + md)) + '</button>'
       ).join('') + '</div></div>';
  h += '</div>';

  if(!filtered.length){
    h += emptyState('sci.noResults', 'sci.noResults.body', 'inbox',
      '<button class="btn quiet sm" onclick="resetLibFilters()">' + esc(t('sci.all')) + '</button>');
    return h;
  }

  h += '<div class="ex-grid" data-stagger>';
  const targetDay = PLAN_DAY || (s.plan && s.plan.sessions && s.plan.sessions[0] ? s.plan.sessions[0].id : '');
  filtered.forEach(e => {
    const spec = exLogSpec(e);
    const inPool = p.exercises ? p.exercises[e.id] !== false : true;
    const pb = personalBest(e.id);
    const histCount = exerciseHistory(e.id).length;
    const excl = exclusionReason(e, p);

    h += '<div class="ex-card ' + (inPool ? '' : 'excluded') + '">';
    h += '<div>';
    h += '<div class="ex-card-hd">' +
         '<div style="display:flex;align-items:flex-start;gap:var(--s2);min-width:0;flex:1">' +
           (typeof exerciseThumbSvg === 'function' ? exerciseThumbSvg(e) : '') +
           '<div style="min-width:0"><button type="button" class="ex-card-t" onclick="openExerciseDetail(\'' + e.id + '\')">' +
             esc(t('ex.' + e.id)) + '</button>' +
           '<div style="margin-top:4px"><span class="flag sm plain">' + esc(t('equip.' + e.equip)) + '</span></div></div>' +
         '</div></div>';

    h += '<div class="chips" style="margin:8px 0">' +
         '<span class="flag sm accent">' + esc(targetRangeText(e)) + '</span>' +
         '<span class="flag sm plain">' + esc(t('pat.' + e.pat)) + '</span>' +
         '<span class="flag sm plain">' + esc(t('exd.mode.' + spec.mode)) + '</span>' +
         (pb && histCount >= 2 ? '<span class="flag sm ok">PR: ' + esc(formatSet(pb.set, e, p)) + '</span>' : '') +
         '</div>';

    /* Muscle contribution bar */
    h += '<div class="ex-mbar" aria-hidden="true">' +
         e.m.map((x, idx) => '<i class="' + (idx===0?'':'sec') + '" style="width:' + Math.round(x[1]*100) + '%"></i>').join('') +
         '</div>';
    h += '<p class="hint">' +
         e.m.map(x => esc(t('mg.' + x[0])) + ' ' + Math.round(x[1]*100) + '%').join(' · ') + '</p>';
    if(excl){
      h += '<p class="hint" style="color:var(--warn);margin-top:4px">' + esc(t(excl)) + '</p>';
    }
    h += '</div>';

    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:var(--s2);border-top:var(--hair) solid var(--recess)">' +
         '<button type="button" class="btn quiet sm" onclick="openExerciseDetail(\'' + e.id + '\')">' +
           esc(t('exd.open')) + '</button>' +
         (ACTIVE
           ? '<button type="button" class="btn sm" onclick="addExerciseToActive(\'' + e.id + '\')">+ ' + esc(t('plan.tabActive')) + '</button>'
           : (targetDay
               ? '<button type="button" class="btn quiet sm" onclick="addExerciseToPlan(\'' + targetDay + '\',\'' + e.id + '\')">+ ' + esc(t('plan.tabPlan')) + '</button>'
               : '')) +
         '<button type="button" class="chip sm ' + (inPool?'on':'') + '" style="margin-inline-start:auto" ' +
           'onclick="toggleEx(\'' + e.id + '\')" aria-pressed="' + (inPool?'true':'false') + '">' +
           esc(inPool ? t('plan.inPool') : t('plan.excluded')) + '</button>' +
         '</div>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}
