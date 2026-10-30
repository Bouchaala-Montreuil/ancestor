/* ============================================================================
   ANCESTOR — Workout Studio, Split Planner, Live Logger & Exercise Atlas

   Three cohesive views under the primary Session route:
     1. PLAN     — view every day of your split, see muscle recovery per day,
                   customise sets/order/exercises/rest, or launch any day
     2. ACTIVE   — focused gym-floor HUD with live clock, tabular mode-aware
                   set rows, mid-session exercise addition & completion summary
     3. LIBRARY  — searchable, multi-facet exercise atlas with muscle
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

/* A primary Train tap always returns to the active workout or plan, never
   to the library just because that was the previous session sub-view. */
function openTrain(){
  SESSION_SUB = ACTIVE ? 'live' : 'plan';
  if(VIEW !== 'session') go('session');
  else { render(); window.scrollTo(0, 0); }
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
  const planSelected = cur === 'plan' || cur === 'plan-peek';
  let h = '<div class="subnav" data-subnav="session" role="tablist" aria-label="' + esc(t('nav.session')) + '">' +
          '<i class="subnav-ind" hidden></i>';
  if(ACTIVE){
    h += '<button type="button" role="tab" aria-selected="' + (cur==='live'?'true':'false') +
         '" class="subnav-btn ' + (cur==='live'?'on':'') + '" data-act="setSessionSub" data-a1="live">' +
         esc(t('plan.tabActive')) + '<span class="subnav-cnt" aria-hidden="true">●</span></button>';
  }
  h += '<button type="button" role="tab" aria-selected="' + (planSelected?'true':'false') +
       '" class="subnav-btn ' + (planSelected?'on':'') + '" data-act="setSessionSub" data-a1="' + (ACTIVE ? 'plan-peek' : 'plan') + '">' +
       esc(t('plan.tabPlan')) + '</button>';
  /* Library already has a primary destination. Repeating it here clipped the
     last tab on phones and made the two workout states harder to distinguish. */
  h += '</div>';
  return h;
}

/* ============================================================================
   MAIN ENTRY: Screens.session
   ========================================================================== */
Screens.session = function(){
  if(SESSION_SUB === 'library'){
    setTimeout(syncLiveClock, 0);
    return { html: renderSessionMasthead('library') + renderExerciseLibrary() };
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
  const title = mode === 'library' ? t('nav.library') : t('nav.train');
  const sub = mode === 'library' ? t('plan.libSub') : t('session.warmup');
  return '<div class="masthead masthead-' + (mode === 'library' ? 'library' : 'train') + '"><div>' +
         '<p class="masthead-idx">' + esc(idx) + '</p>' +
         '<h1 class="masthead-title">' + esc(title) + '</h1>' +
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
  let h = renderSessionMasthead('plan') + (ACTIVE ? sessionSubnavHtml() : '');

  if(!s.plan || !s.plan.sessions || !s.plan.sessions.length){
    h += emptyState('session.noplan', 'session.noplanBody', 'plan',
      '<button class="btn" data-act="rebuildPlan">' + esc(t('profile.rebuild')) + '</button>', 2);
    return { html: h };
  }

  const next = nextSession(s, now);
  if(!next){
    h += emptyState('session.noplan', 'session.noplanBody', 'plan', '', 2);
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
  /* `plan-days` marks this as the buttons, not the SVG week strip that shares
     the .day-grid name — the strip's seven-column layout was being applied to
     three cards. */
  h += '<div class="day-grid plan-days" role="tablist" aria-label="' + esc(t('prog.title')) + '">';
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
         '" class="day-card ' + (on?'on':'') + '" data-act="selectPlanDay" data-a1="' + ds.id + '">' +
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

  /* --- What the week is asked to emphasise --- */
  /* The plan says what it is built around, in one line, before the exercises.
     This is the "explain why a programme was recommended" requirement, and it is
     generated from the plan's own stamp rather than from today's settings — so a
     stale plan cannot claim a focus it was not built with. */
  if(typeof emphasisSummary === 'function'){
    const es = emphasisSummary(s.plan, { emphasis: s.plan.emphasis, priorities: s.plan.priorities });
    if(es && es.key){
      const vars = { n: es.sessions || 0, total: es.total || sessions.length, list: '' };
      if(es.key === 'plan.focusCustom'){
        const names = (s.plan.priorities || []).map(gid => {
          const g = (typeof PRIORITY_GROUPS !== 'undefined' ? PRIORITY_GROUPS : [])
                      .filter(x => x.id === gid)[0];
          return g ? t(g.label) : '';
        }).filter(Boolean);
        if(names.length) vars.list = names.join(', ');
      }
      h += '<div class="plan-focus"><span class="eyebrow">' + esc(t('plan.focus')) + '</span>' +
           '<p class="body-sm mb-0">' + esc(t(es.key, vars)) + '</p></div>';
    }
  }

  /* --- Selected Day Blueprint Header --- */
  h += '<div class="panel heavy">';
  h += '<div class="panel-hd"><div class="shrink">' +
       '<p class="eyebrow">' + esc(isRec ? t('plan.nextUp') : t('session.planned')) + '</p>' +
       '<h2 class="sub ex-title mt-1">' + esc(selected.name) + '</h2></div>' +
       '<span class="hint">~' + estimatedMinutes(selected, s.plan.restSec) + ' min · ' +
       esc(t('session.rest')) + ' ' + (s.plan.restSec || 120) + 's</span></div>';

  if((selected.focus || []).length){
    h += '<div class="chips mb-3">' +
         selected.focus.slice(0, 6).map(m =>
           '<button type="button" class="flag plain tap" data-act="openMuscle" data-a1="' + m + '">' +
           esc(t('mg.' + m)) + '</button>'
         ).join('') + '</div>';
  }

  h += '<div class="row">' +
       (ACTIVE
         ? '<button class="btn" data-act="go" data-a1="session">' + esc(t('plan.resumeLive')) + '</button>'
         : '<button class="btn" data-act="startSession" data-a1="' + selected.id + '">' +
           esc(isRec ? t('btn.start') : t('home.startNext', { name: selected.name })) + '</button>') +
       '<button class="btn quiet sm" data-act="togglePlanEdit" aria-pressed="' + (PLAN_EDIT?'true':'false') + '">' +
       esc(PLAN_EDIT ? t('btn.done') : t('plan.customize')) + '</button></div>' +
       (ACTIVE ? '<p class="hint mt-2 mb-0">' + esc(t('workout.activePlan')) + '</p>' : '') +
       '<details class="dis" data-remember="plan-options"><summary><span class="dis-t">' +
       esc(t('journey.moreOptions')) + '</span></summary><div class="row mt-2">' +
       '<button class="btn quiet sm" data-act="openAddExerciseSheet" data-a1="plan" data-a2="' + selected.id + '">+ ' +
       esc(t('plan.addEx')) + '</button>' +
       (!ACTIVE ? '<button class="btn quiet sm" data-act="startCustomSession">' +
         esc(t('plan.custom')) + '</button>' : '') +
       '<button class="btn quiet sm" data-act="openPrintCard" data-a1="' + selected.id + '">' +
       esc(t('pa.button')) + '</button>' +
       '<button class="btn quiet sm" data-act="go" data-a1="profile">' + esc(t('prog.change')) + '</button>' +
       '</div></details>';

  if(PLAN_EDIT){
    h += '<div class="row mt-3" style="padding-top:var(--s3);border-top:var(--hair) solid var(--line)">' +
         '<span class="eyebrow">' + esc(t('session.rest')) + ':</span>' +
         '<button type="button" class="chip sm on" data-act="openRestPicker">' + (s.plan.restSec||120) + 's</button>' +
         '</div>';
  }
  h += '</div>';

  /* --- Exercise Blueprint Rows --- */
  if(!(selected.exercises || []).length){
    h += '<div class="mt-3">' +
         emptyState('plan.emptyDay', 'plan.emptyDayBody', 'plan',
           '<button class="btn" data-act="openAddExerciseSheet" data-a1="plan" data-a2="' + selected.id + '">+ ' +
           esc(t('plan.addEx')) + '</button>', 2) + '</div>';
    return { html: h, noRefresh: true };
  }

  h += '<div class="plan-ex-list mt-3">';
  (selected.exercises || []).forEach((e, i) => {
    const ex = EX_BY_ID[e.id]; if(!ex) return;
    const r = recommend(s, e.id, now);
    const spec = exLogSpec(ex);
    const prev = previousPerformance(s, e.id, now);

    h += '<div class="panel plan-ex-row">';
    h += '<div class="plan-ex-top">';
    h += '<span class="plan-ex-idx">' + String(i + 1).padStart(2, '0') + '</span>';
    h += '<div class="plan-ex-main">';
    h += '<button type="button" class="plan-ex-title" data-act="openExerciseDetail" data-a1="' + e.id + '">' +
         esc(t('ex.' + e.id)) + '</button>';
    h += '<div class="chips mt-1">' +
         '<span class="flag accent">' + numExpr(e.sets + ' × ' + targetRangeText(ex)) + '</span>' +
         '<span class="flag plain">' + esc(t('session.rir')) + ' ' + e.rir + '</span>' +
         '<span class="flag plain">' + esc(t('equip.' + ex.equip)) + '</span>' +
         '<span class="flag plain">' + esc(t('exd.mode.' + spec.mode)) + '</span>' +
         (spec.unilateral ? '<span class="flag plain">' + esc(t('log.unilateral')) + '</span>' : '') +
         '</div></div>';

    if(PLAN_EDIT){
      h += '<div class="plan-ex-rx">' +
           '<div class="stepper" role="group" aria-label="' + esc(t('c.sets')) + '">' +
             '<button type="button" data-act="adjustPlanSets" data-a1="' + selected.id + '" data-a2="' + i + '" data-t2="l" data-a3="-1" data-t3="n" aria-label="-">−</button>' +
             '<span>' + e.sets + ' ' + esc(t('c.sets')) + '</span>' +
             '<button type="button" data-act="adjustPlanSets" data-a1="' + selected.id + '" data-a2="' + i + '" data-t2="l" data-a3="1" data-t3="n" aria-label="+">+</button>' +
           '</div>' +
           '<button type="button" class="btn quiet sm" ' + (i===0?'disabled':'') +
             ' data-act="movePlanExercise" data-a1="' + selected.id + '" data-a2="' + i + '" data-t2="l" data-a3="-1" data-t3="n" aria-label="Up">↑</button>' +
           '<button type="button" class="btn quiet sm" ' + (i===selected.exercises.length-1?'disabled':'') +
             ' data-act="movePlanExercise" data-a1="' + selected.id + '" data-a2="' + i + '" data-t2="l" data-a3="1" data-t3="n" aria-label="Down">↓</button>' +
           '<button type="button" class="btn quiet sm" data-act="openPlanSub" data-a1="' + selected.id + '" data-a2="' + i + '" data-t2="l">' +
             esc(t('session.sub')) + '</button>' +
           '<button type="button" class="btn danger sm" data-act="removePlanExercise" data-a1="' + selected.id + '" data-a2="' + i + '" data-t2="l">' +
             esc(t('log.removeSet')) + '</button>' +
           '</div>';
    }
    h += '</div>';
    h += '<details class="dis plan-ex-more" data-remember="plan-ex-' + esc(selected.id + '-' + e.id + '-' + i) + '">' +
         '<summary><span class="dis-t">' + esc(t('journey.exerciseDetails')) + '</span></summary>';
    h += '<p class="body-sm mb-0 mt-2">' + esc(t('cue.' + e.id)) + '</p>';

    /* The "previous" slot is for a previous. With no history it used to say
       "First time with this exercise" and the recommendation banner said
       "First time — establish a baseline" directly underneath — the same fact
       twice in a four-line row, six rows in a row. The banner carries it now,
       once, because the banner is the line that also says what to do. */
    if(prev && prev.text){
      h += '<div class="prev-line"><span class="k">' + esc(t('c.previous')) + '</span>' +
           '<b>' + esc(prev.text) + '</b><span class="d">' + esc(dateLabel(prev.date)) + '</span></div>';
    }

    /* Recommendation banner — NEVER repeat the baseline phrase twice! */
    if(r){
      const recLine = recommendationText(r, ex);
      const whyLine = (r.reasons && r.reasons[0]) ? r.reasons[0].text : '';
      const sameText = (r.kind === 'baseline') || !whyLine || (recLine === esc(whyLine));
      h += '<div class="banner info mb-0 mt-2"><span class="ic">i</span><span>' +
           recLine + (sameText ? '' : '<br>' + esc(whyLine)) + '</span></div>';
    }

    h += '<div class="row mt-2">' +
         '<button type="button" class="btn quiet sm" data-act="openWhy" data-a1="progression" data-a2="' + e.id + '">' +
           esc(t('sci.whyOpen')) + '</button>' +
         /* Six of these on one screen, all reading "Détails de l'exercice".
            In a screen reader's button list that is six identical controls:
            the name has to say which exercise. */
         '<button type="button" class="btn quiet sm" data-act="openExerciseDetail" data-a1="' + e.id + '" ' +
           'aria-label="' + esc(t('exd.open') + ' — ' + t('ex.' + e.id)) + '">' +
           esc(t('exd.open')) + '</button></div>';
    h += '</details></div>';
  });
  h += '</div>';

  return { html: h, noRefresh: true };
}

function selectPlanDay(id){ PLAN_DAY = id; render(); }
function togglePlanEdit(){ PLAN_EDIT = !PLAN_EDIT; render(); }
/* Bottom-sheet pickers. Rest durations and rep counts open the sheet the app
   already uses. Each choice goes through the function the inline control used
   (setPlanRest, setVal), so the stored data path is unchanged. */
function openRestPicker(){
  const cur = (getState().plan || {}).restSec || 120;
  const body = '<div class="pick-grid">' + [60, 90, 120, 180].map(sec =>
    '<button type="button" class="pick' + (sec === cur ? ' on' : '') + '" aria-pressed="' + (sec === cur) +
    '" data-act="setPlanRestPick" data-a1="' + sec + '" data-t1="l">' + sec + 's</button>').join('') + '</div>';
  sheet(t('session.rest'), body);
}
function setPlanRestPick(sec){ setPlanRest(sec); closeSheet(); }
function openRepPicker(ei, si, attr){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  let g = '';
  for(let n = 1; n <= 30; n++){
    g += '<button type="button" class="pick" data-act="pickRep" data-a1="' + ei + '" data-t1="l" data-a2="' + si +
         '" data-t2="l" data-a3="' + attr + '" data-t3="l" data-a4="' + n + '" data-t4="l">' + n + '</button>';
  }
  sheet(t('session.reps'), '<div class="pick-grid pick-grid--reps">' + g + '</div>');
}
function pickRep(ei, si, attr, n){
  setVal(ei, si, attr, String(n));
  const el = document.getElementById('sf_' + ei + '_' + si + '_reps');
  if(el) el.value = String(n);
  closeSheet();
}

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
    '<p class="body-sm mb-3">' + esc(t('session.keep')) + '</p><div class="tiles">' +
    subs.map(e => '<button class="tile" data-act="applyPlanSub" data-a1="' + dayId + '" data-a2="' + exIdx + '" data-t2="l" data-a3="' + e.id + '"><span class="box"></span>' +
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
          '" data-in="filterAddExSheet" data-t1="v"></div>';
  h += '<div class="tiles scroll" id="addExList">';
  list.forEach(e => {
    const spec = exLogSpec(e);
    const searchBlob = (t('ex.'+e.id) + ' ' + t('pat.'+e.pat) + ' ' + e.m.map(x=>t('mg.'+x[0])).join(' ')).toLowerCase();
    const action = targetKind === 'active'
      ? actAttr('addExerciseToActive', e.id)
      : actAttr('addExerciseToPlan', dayId || '', e.id);
    h += '<button type="button" class="tile" data-q="' + esc(searchBlob) + '"' + action + '>' +
         '<span class="box"></span><span class="grow">' +
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
  /* There is one recoverable draft. Never replace it with another workout,
     even if a stale button, shortcut or rapid second tap reaches this handler. */
  if(ACTIVE){ openTrain(); return; }
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
  if(r.unit === 'time')     return numExpr(t('log.holdTarget', { lo:r.lo, hi:r.hi }));
  if(r.unit === 'distance') return numExpr(t('log.distTarget', { lo:r.lo, hi:r.hi }) + ' ' + distanceUnit(unit()));
  return numExpr(t('log.repTarget', { lo:r.lo, hi:r.hi }));
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

/* Remember the actual exercise/set objects, not their names or positions: a
   workout can contain the same movement twice, and a substitution can insert
   a row. Each disclosure then stays attached to the work it describes. */
let EX_OPEN = new WeakMap();
let EX_OPTIONS_OPEN = new WeakMap();
let SET_OPTIONS_OPEN = new WeakMap();
let EX_WAS_CURRENT = null;
function exOpen(id, open, index){
  const list = ACTIVE && ACTIVE.exercises || [];
  const e = (Number.isInteger(index) && list[index] && list[index].id === id)
    ? list[index] : list.find(x => x.id === id);
  if(e) EX_OPEN.set(e, open);
}
function exerciseOptionsOpen(ei, open){
  const e = ACTIVE && ACTIVE.exercises[ei];
  if(e) EX_OPTIONS_OPEN.set(e, open);
}
function setOptionsOpen(ei, si, open){
  const e = ACTIVE && ACTIVE.exercises[ei];
  const st = e && e.sets[si];
  if(st) SET_OPTIONS_OPEN.set(st, open);
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
  h += '<div><p class="eyebrow" style="color:var(--accent-on-ink)">' +
       esc(ACTIVE.paused ? t('session.restPaused') : t('plan.liveBadge')) + '</p>' +
       '<div class="row nowrap row-base mt-1">' +
       '<h1 class="sess-h">' +
       esc(ACTIVE.name || t('session.title')) + '</h1>' +
       '<span class="live-clock" id="liveClock">' + formatElapsed(activeElapsedMs()) + '</span>' +
       '</div></div>';
  h += '<div class="live-hud-meta">' +
       (liveLoadVol > 0 ? '<span>' + Math.round(liveLoadVol) + ' ' + esc(unit()) + '·' + esc(t('log.repsShort')) + '</span>' : '') +
       '<button type="button" class="btn quiet sm" data-act="togglePauseWorkout" aria-pressed="' + (ACTIVE.paused?'true':'false') + '">' +
       esc(ACTIVE.paused ? t('session.restResume') : t('session.restPause')) + '</button>' +
       '<button type="button" class="btn quiet sm" data-act="startRest" data-a1="' + (ACTIVE.restSec || 120) + '" data-t1="l">' +
       esc(t('session.rest')) + ' ' + (ACTIVE.restSec || 120) + 's</button>' +
       '<button type="button" class="btn quiet sm" data-act="openAddExerciseSheet" data-a1="active">+ ' + esc(t('plan.addEx')) + '</button>' +
       '</div></div>';
  h += '<div class="session-progress" id="sessProg"><span class="eyebrow">' +
       esc(t('log.remaining', { n: logged, m: total })) +
       '</span><span class="track"><i style="width:' + (total ? Math.round(logged / total * 100) : 0) + '%"></i></span></div>';
  h += '</div>';

  if(FINISH_SAVE_FAILED){
    h += '<div class="banner alert workout-save-warning" role="alert"><div>' +
         '<strong>' + esc(t('workout.finishFailedTitle')) + '</strong>' +
         '<p class="body-sm mt-1">' + esc(t('workout.finishFailedBody')) + '</p>' +
         '<button class="btn quiet sm" data-act="finishSession">' + esc(t('workout.trySave')) + '</button>' +
         '</div></div>';
  }

  /* When work advances, the new current exercise always presents itself. */
  const currentExercise = curEi >= 0 ? ACTIVE.exercises[curEi] : null;
  if(currentExercise && currentExercise !== EX_WAS_CURRENT){
    EX_OPEN.delete(currentExercise);
    EX_WAS_CURRENT = currentExercise;
  }

  ACTIVE.exercises.forEach((e, ei) => {
    const ex = EX_BY_ID[e.id]; if(!ex) return;
    const spec = exLogSpec(ex);
    const range = exTargetRange(ex);
    const prev = previousPerformance(s, e.id, ACTIVE.startedAt);
    const prevNote = previousExerciseNote(s, e.id, ACTIVE.startedAt);
    const isCurrent = (ei === curEi);

    /* Every exercise used to render in full: six headings, six set blocks and
       eighteen live rows of inputs at once, 774 words in one scroll. The session
       is now the current exercise, open, with the rest folded to one line that
       says how much of it is done. Nothing is removed from the DOM, so a
       collapsed exercise still counts, prints and reads. */
    const doneHere = e.sets.filter(st => st.committed).length;
    const skippedHere = e.sets.filter(st => st.skipped).length;
    /* An exercise the user opened stays open across the re-render every keystroke
       causes; otherwise looking ahead at the next lift would close itself. */
    const openHere = EX_OPEN.has(e) ? EX_OPEN.get(e) : isCurrent;
    h += '<details class="panel ex-block' + (isCurrent ? ' is-current' : '') + '"' +
         (openHere ? ' open' : '') + '>';
    /* Record the intended click state, not the initial `toggle` event that a
       freshly rendered <details> can dispatch on its own. */
    h += '<summary class="ex-block-sum" data-act="exOpen" data-a1="' + e.id + '" data-t2="o" data-a3="' + ei + '" data-t3="l"><span class="ex-block-hd">' +
         (typeof exerciseThumbSvg === 'function' ? exerciseThumbSvg(ex) : '') +
         '<span class="mono ex-block-idx">' + String(ei+1).padStart(2,'0') + '</span>' +
         '<h2 class="sess-ex-h">' + esc(t('ex.'+e.id)) + '</h2>' +
         '</span><span class="ex-block-meta">' +
         esc(t('log.remaining', { n: doneHere, m: e.sets.length })) +
         (skippedHere ? ' · ' + esc(t('log.skippedShort')) : '') +
         '</span></summary>';
    h += '<div class="ex-block-body">';
    h += '<div class="hint mb-2">' +
         (ex.m || []).map(([m,w], idx) => esc(t('mg.' + m)) + (idx===0 ? ' (' + Math.round(w*100) + '%)' : '')).join(' · ') +
         '</div>';
    h += '<div class="chips mb-2">' +
         '<span class="flag accent">' + targetRangeText(ex) + '</span>' +
         '<span class="flag plain">' + esc(t('session.rir')) + ' ' + e.rir + '</span>' +
         '<span class="flag plain">' + esc(t('session.rest')) + ' ' + (ACTIVE.restSec || 120) + 's</span>' +
         (spec.unilateral ? '<span class="flag plain">' + esc(t('log.unilateral')) + '</span>' : '') + '</div>';

    if(prev && prev.text){
      h += '<div class="prev-line"><span class="k">' + esc(t('c.previous')) + '</span>' +
           '<b>' + esc(prev.text) + '</b><span class="d">' + esc(dateLabel(prev.date)) + '</span>' +
           (prev.best && prev.best.set
             ? '<button type="button" class="prev-copy-btn" data-act="copyPrevToExercise" data-a1="' + ei + '" data-t1="l">' +
               esc(t('log.useLast')) + '</button>' : '') +
           '</div>';
    } else {
      h += '<div class="prev-line"><span class="k">' + esc(t('c.previous')) + '</span>' +
           '<span class="d">' + esc(t('log.noPrev')) + '</span></div>';
    }
    if(prevNote){
      h += '<p class="hint tuck"><b>' + esc(t('log.prevNote')) + ':</b> ' +
           esc(prevNote.note) + ' (' + esc(dateLabel(prevNote.date)) + ')</p>';
    }

    e.sets.forEach((set, si) => { h += setRowHtml(e, set, ei, si, ex, spec, range, ei === curEi && si === curSi); });

    /* Per-exercise note */
    h += '<div class="ex-note-wrap">' +
         '<label for="exnote_' + ei + '" class="sr-only">' + esc(t('log.notePlaceholder')) + '</label>' +
         '<input id="exnote_' + ei + '" type="text" value="' + esc(e.note || '') +
         '" placeholder="' + esc(t('log.notePlaceholder')) + '" data-in="setExNote" data-a1="' + ei + '" data-t1="l" data-t2="v"></div>';

    const canSkip = e.sets.some(st => !st.skipped && !st.committed);
    h += '<details class="dis ex-opts"' + (EX_OPTIONS_OPEN.get(e) ? ' open' : '') +
         '><summary data-act="exerciseOptionsOpen" data-a1="' + ei + '" data-t1="l" data-t2="o"><span class="dis-t">' +
         esc(t('log.exOptions')) + '</span></summary><div class="row mt-2">';
    h += '<button class="btn quiet sm" data-act="addSet" data-a1="' + ei + '" data-t1="l">' + esc(t('log.addSet')) + '</button>';
    h += '<button class="btn quiet sm" data-act="skipSet" data-a1="' + ei + '" data-t1="l"' + (canSkip ? '' : ' disabled') + '>' + esc(t('workout.skipNext')) + '</button>';
    h += '<button class="btn quiet sm" data-act="skipExercise" data-a1="' + ei + '" data-t1="l"' + (canSkip ? '' : ' disabled') + '>' + esc(t('log.skipEx')) + '</button>';
    h += '<button class="btn quiet sm" data-act="openSub" data-a1="' + ei + '" data-t1="l">' + esc(t('session.sub')) + '</button>';
    h += '<button class="btn quiet sm" data-act="openExerciseDetail" data-a1="' + e.id + '" ' +
         'aria-label="' + esc(t('exd.open') + ' — ' + t('ex.' + e.id)) + '">' + esc(t('exd.open')) + '</button>';
    h += '</div></details>';

    h += '<p class="hint mb-1 mt-2">' +
         esc(spec.mode === 'assisted' ? t('log.assistHint')
           : spec.loadRole === 'added' ? t('log.addedHint')
           : t('log.warmupNote')) + '</p>';
    h += '<p class="body-sm m-0">' + esc(t('cue.'+e.id)) + '</p>';
    h += '</div></details>';   /* ex-block */
  });

  h += '<div class="panel mt-4 heavy">';
  h += '<button class="btn ' + (logged ? '' : 'secondary') + ' block" data-act="finishSession">' +
       esc(t('session.finish')) + ' (' + numExpr(logged + '/' + total) + ')</button>';
  /* Discard is destructive and reversible by nobody: it sits below the primary
     action, in text weight, and still asks before it throws the session away. */
  h += '<p class="hint mt-2 mb-0 tac">' +
       '<button type="button" class="link-btn" data-act="discardSession">' +
       esc(t('session.discard')) + '</button></p>';
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
  h += '<div class="set-head"><span class="eyebrow">' + esc(t('session.setOf')) + ' ' + numExpr((si+1) + ' / ' + e.sets.length) + '</span>' +
       (isCurrentSet && !set.committed ? '<span class="flag sm accent">' + esc(t('log.currentSet')) + '</span>'
         : '<span class="flag sm ' + STATE_FLAG[state] + '">' + esc(t(STATE_LABEL[state])) + '</span>') +
       (set.warmup ? '<span class="flag sm plain">' + esc(t('log.warmupShort')) + '</span>' : '') +
       (!locked && spec.unilateral && (spec.hasReps || spec.hasTime)
         ? '<button type="button" class="prev-copy-btn" data-act="toggleLrSplit" data-a1="' + ei + '" data-t1="l" data-a2="' + si + '" data-t2="l" aria-pressed="' +
           (set.lrSplit ? 'true' : 'false') + '">' + esc(t('log.lrSplit')) + '</button>' : '') +
       '</div>';

  h += '<div class="shrink">';
  if(!locked){
    h += '<div class="row nowrap">';
    spec.fields.concat(spec.optional).forEach(f => {
      if(set.lrSplit && (f.key === 'reps' || f.key === 'time')){
        h += sideFieldsHtml(f, ei, si, set, range);
      } else {
        h += fieldHtml(f, ei, si, set, ex, range, u, e.sets.length);
      }
    });
    h += '</div>';
    if(!ready){
      const missing = missingFields(set, ex);
      h += '<p class="hint mt-1">' + esc(emptyHintFor(spec, missing)) + '</p>';
    }
  }
  h += '</div>';

  h += '<div class="set-actions">';
  if(locked){
    h += '<button class="btn quiet sm" data-act="unskipSet" data-a1="' + ei + '" data-t1="l" data-a2="' + si + '" data-t2="l">' + esc(t('btn.retry')) + '</button>';
  } else {
    h += '<button class="btn ' + (set.committed ? 'quiet' : '') + ' sm" id="logbtn_' + ei + '_' + si + '" ' +
         (ready ? '' : 'disabled') + ' data-act="toggleSet" data-a1="' + ei + '" data-t1="l" data-a2="' + si + '" data-t2="l">' +
         esc(set.committed ? t('log.correct') : t('log.logSet')) + '</button>';
  }
  h += '</div>';
  if(!locked){
    h += '<details class="dis inline set-opts"' + (SET_OPTIONS_OPEN.get(set) ? ' open' : '') +
         '><summary data-act="setOptionsOpen" data-a1="' + ei + '" data-t1="l" data-a2="' + si + '" data-t2="l" data-t3="o"><span class="dis-t">' +
         esc(t('log.setOptions')) + '</span></summary><div class="row mt-1">' +
         '<button class="btn quiet sm" data-act="toggleWarmup" data-a1="' + ei + '" data-t1="l" data-a2="' + si + '" data-t2="l" aria-pressed="' +
         (set.warmup ? 'true' : 'false') + '">' + esc(t('log.warmup')) + '</button>' +
         '<button class="btn quiet sm" data-act="removeSet" data-a1="' + ei + '" data-t1="l" data-a2="' + si + '" data-t2="l">' +
         esc(t('log.removeSet')) + '</button></div></details>';
  }
  h += '</div>';
  return h;
}

function fieldHtml(f, ei, si, set, ex, range, u, nSets){
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
    suffix = numExpr(range.lo + '–' + range.hi);
  } else if(f.key === 'rir'){
    suffix = '';                 // the label already says RIR; the suffix repeated it
  }
  const labelKey = f.key === 'load' ? (exLogSpec(ex).loadRole === 'added' ? 'log.added' : 'log.load') : f.labelKey;
  const optional = exLogSpec(ex).optional.indexOf(f) >= 0;
  const fid = 'sf_' + ei + '_' + si + '_' + f.key;
  return '<div class="fld"><label for="' + fid + '">' + esc(t(labelKey)) +
         (optional ? ' <span class="opt">' + esc(t('c.optional')) + '</span>' : '') +
         '<span class="sr-only">, ' + esc(t('session.setOf')) + ' ' + numExpr((si+1) + ' / ' + nSets) + '</span></label>' +
         '<input id="' + fid + '" type="number" inputmode="decimal" step="' + f.step + '" placeholder="—" value="' + esc(val) + '" ' +
         'data-in="setVal" data-a1="' + ei + '" data-t1="l" data-a2="' + si + '" data-t2="l" data-a3="' + f.attr + '" data-t4="v">' +
         (f.key === 'reps'
           ? '<button type="button" class="u u-btn" aria-haspopup="dialog" data-act="openRepPicker" data-a1="' + ei + '" data-t1="l" data-a2="' + si + '" data-t2="l" data-a3="' + f.attr + '" data-t3="l">' + esc(suffix) + '</button>'
           : '<span class="u">' + esc(suffix) + '</span>') +
         '</div>';
}

function sideFieldsHtml(f, ei, si, set, range){
  const baseAttr = f.attr; // 'r' or 't'
  const lKey = baseAttr + 'L', rKey = baseAttr + 'R';
  const vL = set[lKey] !== undefined ? set[lKey] : set[baseAttr];
  const vR = set[rKey] !== undefined ? set[rKey] : set[baseAttr];
  const suffix = f.key === 'time' ? t('log.unit.s') : numExpr(range.lo + '–' + range.hi);
  const idL = 'sf_' + ei + '_' + si + '_' + lKey, idR = 'sf_' + ei + '_' + si + '_' + rKey;
  return '<div class="fld"><label for="' + idL + '">' + esc(t('lab3d.side.left')) + '</label>' +
         '<input id="' + idL + '" type="number" inputmode="decimal" step="1" placeholder="—" value="' + esc(vL) + '" ' +
         'data-in="setSideVal" data-a1="' + ei + '" data-t1="l" data-a2="' + si + '" data-t2="l" data-a3="' + baseAttr + '" data-a4="L" data-t5="v">' +
         '<span class="u">' + esc(suffix) + '</span></div>' +
         '<div class="fld"><label for="' + idR + '">' + esc(t('lab3d.side.right')) + '</label>' +
         '<input id="' + idR + '" type="number" inputmode="decimal" step="1" placeholder="—" value="' + esc(vR) + '" ' +
         'data-in="setSideVal" data-a1="' + ei + '" data-t1="l" data-a2="' + si + '" data-t2="l" data-a3="' + baseAttr + '" data-a4="R" data-t5="v">' +
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
  if(ACTIVE){ openTrain(); return; }
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
  /* Skip the next unfinished set, never a set already logged. */
  const i = e.sets.findIndex(x => !x.skipped && !x.committed);
  if(i < 0) return;
  e.sets[i].skipped = true;
  saveDraft(); render();
}
function unskipSet(ei, si){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e) return;
  const set = e.sets[si]; if(!set) return;
  /* Skipping is reversible; do not rewrite any existing status or value. */
  set.skipped = false;
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
/* Optional RIR and explicit set options are also user input. They do not mark
   a planned set as performed, but must survive substitution and removal. Look
   at the values themselves so older saved drafts get the same protection. */
function setHasWork(st){
  return !!(st && (st.entered || st.committed || st.warmup || st.lrSplit ||
    (st.rir !== '' && st.rir != null)));
}
function removeSet(ei, si){
  const e = ACTIVE && ACTIVE.exercises[ei]; if(!e || !e.sets[si]) return;
  if(e.sets.length <= 1){ toast(t('log.needOneSet')); return; }
  if(setHasWork(e.sets[si]) && !confirm(t('workout.removeConfirm'))) return;
  e.sets.splice(si, 1);
  saveDraft(); render();
}

function exerciseHasWork(e){
  return !!(e && ((e.note && String(e.note).trim()) || e.sets.some(setHasWork)));
}
function unstartedSets(e){
  return e.sets.filter(st => st && !st.skipped && !setHasWork(st));
}
function openSub(ei){
  const current = ACTIVE && ACTIVE.exercises[ei]; if(!current) return;
  const subs = substitutesFor(getState().profile, current.id);
  const workNote = exerciseHasWork(current)
    ? '<p class="body-sm mb-3">' + esc(t(unstartedSets(current).length ? 'workout.subKeep' : 'workout.subAdd')) + '</p>' : '';
  sheet(t('session.sub'), subs.length ? (
    '<p class="body-sm mb-3">' + esc(t('session.keep')) + '</p>' + workNote + '<div class="tiles">' +
    subs.map(e => '<button class="tile" data-act="applySub" data-a1="' + ei + '" data-t1="l" data-a2="' + e.id + '"><span class="box"></span>' +
      '<span><span class="t">' + esc(t('ex.'+e.id)) + '</span><span class="d">' +
      esc(e.m.map(function(x){ return t('mg.'+x[0]); }).join(', ')) + '</span></span></button>').join('') + '</div>')
    : emptyState('session.nosub','session.nosubBody','inbox'));
}
function applySub(ei, id){
  const ex = EX_BY_ID[id], current = ACTIVE && ACTIVE.exercises[ei];
  if(!ex || !current || current.id === id) return;
  const untouched = unstartedSets(current);
  const keepWork = exerciseHasWork(current);
  const replacement = newActiveExercise({ id:id, sets:Math.max(1, untouched.length), reps:ex.reps.slice(), rir:ex.rir });
  if(keepWork){
    /* Keep actual/partially entered work and notes on the exercise they belong
       to. Only genuinely untouched slots move to the new movement. */
    untouched.forEach(st => { st.skipped = true; });
    ACTIVE.exercises.splice(ei + 1, 0, replacement);
  } else {
    ACTIVE.exercises[ei] = replacement;
  }
  saveDraft(); closeSheet(); render();
  if(keepWork) toast(t('workout.subKept'), 'ok');
  const blocks = document.querySelectorAll('#screenBody .ex-block > summary');
  const target = blocks[keepWork ? ei + 1 : ei];
  if(target && target.focus) target.focus();
}
function discardSession(){
  if(!ACTIVE || !confirm(t('workout.discardConfirm'))) return;
  /* If storage refuses removal, do not pretend the old draft was discarded. */
  if(!clearDraft()){ toast(t('workout.discardFailed'), 'alert'); return; }
  ACTIVE = null; SESSION_SUB = 'plan'; FINISH_SAVE_FAILED = false;
  stopRest(); syncLiveClock();
  go('session');
}

let FINISHING = false;
let FINISH_SAVE_FAILED = false;
function finishSession(){
  if(!ACTIVE || FINISHING) return;
  const s = getState();
  const startedAt = ACTIVE.startedAt;
  if(s.sessions.some(x => x.startedAt === startedAt)){
    /* An in-memory record is not proof of a successful write. */
    if(LOAD_FAILED || (STORAGE_FAILED && !saveState())){
      FINISH_SAVE_FAILED = true; render(); return;
    }
    toast(t('log.alreadySaved')); ACTIVE = null; SESSION_SUB = 'plan';
    FINISH_SAVE_FAILED = false; clearDraft(); go('progress'); return;
  }
  const exercises = [], loggable = [];
  let omittedWork = false;
  ACTIVE.exercises.forEach(e => {
    const ex = EX_BY_ID[e.id];
    const cleanNote = e.note && String(e.note).trim() ? String(e.note).trim().slice(0, 240) : '';
    if(!ex){
      if(cleanNote || (e.sets || []).some(setHasWork)) omittedWork = true;
      return;
    }
    const sets = [];
    e.sets.forEach(x => {
      if(!x) return;
      if(x.skipped || !(x.committed || x.entered)){
        if(setHasWork(x)) omittedWork = true;
        return;
      }
      if(!isSetComplete(x, ex)){ omittedWork = true; return; }
      sets.push(normaliseLoggedSet(x, ex));
    });
    if(!sets.length){ if(cleanNote) omittedWork = true; return; }
    const entry = { id:e.id, sets:sets, plan:e.plan || null };
    if(cleanNote) entry.note = cleanNote;
    loggable.push(entry);
    exercises.push(entry);
  });
  if(!exercises.length){ toast(emptySessionMessage()); return; }
  /* A log cannot represent unfinished work. Let the person return to it or
     explicitly choose to finish without it, rather than silently dropping it. */
  if(omittedWork && !confirm(t('workout.finishUnstored'))) return;

  FINISHING = true;
  const nowFinish = Date.now();
  const beforeMiles = (typeof trainingMilestones === 'function')
    ? trainingMilestones(s, nowFinish).filter(m => m.earned).map(m => m.id) : [];
  const durationMs = activeElapsedMs();
  const rec = addSession({ planId:ACTIVE.planId, name:ACTIVE.name, startedAt:startedAt,
                           exercises:exercises, durationMs:durationMs });
  if(LOAD_FAILED || STORAGE_FAILED){
    /* The append was only in memory. Roll it back and retain the draft, so a
       retry cannot duplicate a session and a reload can still restore the work. */
    const at = s.sessions.indexOf(rec);
    if(at >= 0) s.sessions.splice(at, 1);
    FINISHING = false;
    FINISH_SAVE_FAILED = true;
    render();
    return;
  }
  FINISH_SAVE_FAILED = false;
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
  LAST_SUMMARY = { sessionId: rec.id,
                   prs: records.pr, baselines: records.baseline,
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
  h += '<div class="row nowrap between">' +
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
         '<div class="row between row-base">' +
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
       '<p class="body-sm mb-0">' + esc(t('done.nextStepBody')) + '</p></div>';

  /* The sheet is a document, and the moment you want the record of it is the
     moment it exists. It sits beside "view history" rather than behind it. */
  h += '<div class="done-actions">' +
       '<button class="btn" data-act="closeCompletion" data-a1="progress">' + esc(t('done.viewHistory')) + '</button>' +
       (sum.sessionId
         ? '<button class="btn quiet" data-act="openPrintRecord" data-a1="' + sum.sessionId + '">' +
           esc(t('pa.printRecord')) + '</button>' : '') +
       '<button class="btn quiet" data-act="closeCompletion" data-a1="home">' + esc(t('done.backHome')) + '</button>' +
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
  savedToast('session.saved');
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
   3. EXERCISE ATLAS LIBRARY
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
  h += '<div class="field mb-3"><label for="libSearchInput">' +
       esc(t('plan.searchLabel')) + ' (' + numExpr(filtered.length + ' / ' + EX.length) + ')</label>' +
       '<input id="libSearchInput" type="text" value="' + esc(LIB_QUERY) +
       '" placeholder="' + esc(t('plan.searchEx')) + '" data-in="setLibQuery" data-t1="v"></div>';

  /* All filters sit behind one labelled disclosure; selected filters remain
     visible in its summary, even when it is closed. */
  const activeExtra = [LIB_MUSCLE !== 'all' ? t('mg.' + LIB_MUSCLE) : '',
                       LIB_EQUIP !== 'all' ? t('equip.' + LIB_EQUIP) : '',
                       LIB_MODE !== 'all' ? t('exd.mode.' + LIB_MODE) : ''].filter(Boolean).join(' · ');
  h += '<details class="dis atlas-more" data-remember="library-filters"' + (activeExtra ? ' open' : '') + '>' +
       '<summary><span class="dis-t">' + esc(t('journey.filters')) + '</span>' +
       (activeExtra ? '<span class="flag sm accent">' + esc(activeExtra) + '</span>' : '') +
       '</summary><div class="atlas-more-body">';
  h += '<div class="anat-filter-row mb-2">' +
       '<span class="anat-filter-lbl">' + esc(t('exd.muscles')) + '</span><div class="chips">' +
       '<button type="button" class="chip sm ' + (LIB_MUSCLE==='all'?'on':'') + '" data-act="setLibMuscle" data-a1="all">' + esc(t('sci.all')) + '</button>' +
       MUSCLES.map(m =>
         '<button type="button" class="chip sm ' + (LIB_MUSCLE===m?'on':'') + '" data-act="setLibMuscle" data-a1="' + m + '">' +
         esc(t('mg.' + m)) + '</button>'
       ).join('') + '</div></div>';

  h += '<div class="anat-filter-row mb-2">' +
       '<span class="anat-filter-lbl">' + esc(t('plan.equipLabel')) + '</span><div class="chips">' +
       '<button type="button" class="chip sm ' + (LIB_EQUIP==='all'?'on':'') + '" data-act="setLibEquip" data-a1="all">' + esc(t('sci.all')) + '</button>' +
       ['barbell','dumbbell','machine','cable','bodyweight','band'].map(eq =>
         '<button type="button" class="chip sm ' + (LIB_EQUIP===eq?'on':'') + '" data-act="setLibEquip" data-a1="' + eq + '">' +
         esc(t('equip.' + eq)) + '</button>'
       ).join('') + '</div></div>';

  h += '<div class="anat-filter-row">' +
       '<span class="anat-filter-lbl">' + esc(t('chart.basis')) + '</span><div class="chips">' +
       '<button type="button" class="chip sm ' + (LIB_MODE==='all'?'on':'') + '" data-act="setLibMode" data-a1="all">' + esc(t('sci.all')) + '</button>' +
       ['load','bodyweight','weighted','assisted','timed','distance'].map(md =>
         '<button type="button" class="chip sm ' + (LIB_MODE===md?'on':'') + '" data-act="setLibMode" data-a1="' + md + '">' +
         esc(t('exd.mode.' + md)) + '</button>'
       ).join('') + '</div></div>';
  h += '</div></details>';
  h += '</div>';

  if(!filtered.length){
    h += emptyState('sci.noResults', 'sci.noResults.body', 'inbox',
      '<button class="btn quiet sm" data-act="resetLibFilters">' + esc(t('sci.all')) + '</button>');
    return h;
  }

  /* A register, not a grid of cards. Eighty-eight exercises each carried a
     heading, four flags, a contribution bar, a three-muscle sentence and four
     controls: 382 buttons and 1 304 words in one scroll, which is a wall you
     scroll past rather than a library you search. One row per exercise, one
     tap to the sheet that already holds every action, and the two filter
     axes that nobody changes (equipment, mode) behind a disclosure. */
  h += '<div class="ex-grid" data-stagger>';
  filtered.forEach((e, i) => {
    if(i === 12){
      h += '</div><details class="journey-fold library-more" data-remember="library-more"><summary>' +
           '<span class="journey-fold-copy"><span class="journey-fold-title">' +
           esc(t('journey.moreExercises', { n: filtered.length - 12 })) + '</span></span></summary>' +
           '<div class="ex-grid" data-stagger>';
    }
    const spec = exLogSpec(e);
    const inPool = p.exercises ? p.exercises[e.id] !== false : true;
    const pb = personalBest(e.id);
    const histCount = exerciseHistory(e.id).length;
    const excl = exclusionReason(e, p);
    const top = (e.m || [])[0];
    const meta = [
      top ? t('mg.' + top[0]) : '',
      t('equip.' + e.equip),
      targetRangeText(e)
    ].filter(Boolean).join(' · ');

    h += '<button type="button" class="ex-card' + (inPool ? '' : ' excluded') +
         '" data-act="openExerciseDetail" data-a1="' + e.id + '">';
    h += '<span class="ex-thumb">' +
         (typeof exerciseThumbSvg === 'function' ? exerciseThumbSvg(e) : '') + '</span>';
    h += '<span class="ex-main">' +
         '<span class="ex-card-t">' + esc(t('ex.' + e.id)) + '</span>' +
         '<span class="ex-meta">' + esc(meta) +
         (pb && histCount >= 2 ? '<b class="ex-pr">PR ' + esc(formatSet(pb.set, e, p)) + '</b>' : '') +
         (excl ? '<span class="ex-excl">' + esc(t(excl)) + '</span>' : '') +
         '</span>' +
         '<span class="ex-mbar" aria-hidden="true">' +
         (e.m || []).map((x, idx) => '<i class="' + (idx === 0 ? '' : 'sec') +
           '" style="width:' + Math.round(x[1]*100) + '%"></i>').join('') +
         '</span></span>';
    h += '<span class="ex-go" aria-hidden="true">\u203a</span>';
    h += '</button>';
  });
  h += '</div>' + (filtered.length > 12 ? '</details>' : '');
  return h;
}
