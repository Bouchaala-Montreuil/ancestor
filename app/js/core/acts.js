/* ============================================================================
   ACTIONS — one listener per event kind, and markup that names what it wants.

   Every control in this app carried its behaviour in an `onclick` attribute
   built by string concatenation: 259 of them, 169 distinct shapes, arguments
   assembled from loop variables, `this.value` and `+this.value.slice(0,2)`.
   That worked, and it was the one reason a Content-Security-Policy could not be
   honest: a policy that permits inline handlers permits every injected one too,
   so the only policy available was no policy at all.

   The handler is no longer markup. Markup names an action, the action reads its
   own arguments off the element, and one delegated listener per event kind
   calls it. Nothing is ever parsed as code, which is what lets index.html carry
   `script-src 'self'` with no unsafe-inline — and what makes an injected
   handler inert.

     markup   <button data-act="openSheet" data-a1="sleep">
     action   ACT('openSheet', el => openSheet(arg(el, 1)));

   `data-act` fires on click, `data-in` on input, and `data-focus`/`data-hover`
   on focus or pointer entry. Arguments are `data-a1…a9`
   with an optional `data-t1…t9` saying how to read them:

     (absent)  the attribute text, as a string
     n         the attribute text, as a number
     v  N      the element's value, as a string / as a number
     b         the element's checked state
     e         the element itself
     o         whether its parent <details> is open
     hour      the value clipped to an hour-of-day

   The `n` marker is not decoration. Inline handlers were re-parsed from text,
   so a number interpolated into `onclick="addSet(3)"` arrived as a number and a
   quoted one as a string. `data-t="n"` is how a call site keeps saying which
   it was.
   ========================================================================== */

/* `var`, not `const`: the table is part of the app's global surface the way
   every other function here is, and the suites read it to prove no markup names
   an action that does not exist. */
var ACTS = Object.create(null);

function ACT(name, fn){
  if(typeof fn !== 'function') throw new Error('ACT(' + name + ') needs a function');
  ACTS[name] = fn;
}

/* Everything a call site was allowed to compute inline, computed at the
   element instead. */
function arg(el, i){
  const t = el.getAttribute('data-t' + i);
  if(t === 'v') return el.value;
  if(t === 'N') return +el.value;
  if(t === 'hour') return +el.value.slice(0, 2);
  if(t === 'b') return el.checked;
  if(t === 'e') return el;
  if(t === 'o') return !el.parentElement.open;
  const v = el.getAttribute('data-a' + i);
  if(v === null) return undefined;
  if(t === 'n') return +v;
  if(t === 'l') return literal(v);
  return v;
}

/* Inline handlers were re-parsed from text, so `onclick="setDisplay('high',
   ' + flag + ')"` passed the boolean `false`, not the word. A call site that
   interpolates a bare value keeps meaning what it meant: read the text the way
   that parser read it, and nothing else. */
function literal(v){
  if(v === 'true') return true;
  if(v === 'false') return false;
  if(/^-?\d+(\.\d+)?$/.test(v)) return +v;
  if(v.length > 1 && (v[0] === "'" || v[0] === '"') && v[v.length-1] === v[0]) return v.slice(1, -1);
  return v;
}

/* Attribute text for the few places that build a control in a loop and cannot
   write the tag literally: a tile, a layer chip, a search result. Numbers keep
   their type, because the markup is not parsed back into code any more. */
function actAttr(name, ...args){
  let out = ' data-act="' + escAttr(name) + '"';
  args.forEach((v, i) => {
    if(v === undefined) return;
    out += ' data-a' + (i + 1) + '="' + escAttr(v) + '"';
    if(typeof v === 'number') out += ' data-t' + (i + 1) + '="n"';
  });
  return out;
}
function escAttr(s){
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* The old markup fired every handler on the path from the tapped element up to
   the document, innermost first — a tile inside a sheet closed it, then the
   tile's own action ran. Walking the ancestry and firing each keeps that order
   instead of inventing a new one: the first element to claim the event does not
   swallow it. */
function fireFrom(target, ev, attr){
  const chain = [];
  for(let n = target; n && n.nodeType === 1; n = n.parentElement){
    const name = n.getAttribute(attr);
    if(name) chain.push([n, name]);
  }
  for(let i = 0; i < chain.length; i++){
    const el = chain[i][0];
    const fn = ACTS[chain[i][1]];
    if(!fn) continue;
    try { fn(el, ev); }
    catch(e){ if(typeof reportUncaught === 'function') reportUncaught(e); else throw e; }
  }
}

function wireActs(){
  document.addEventListener('click', ev => {
    /* Record a person's disclosure choice before the native toggle. This is
       deliberately a click listener: toggle also fires for generated markup. */
    const summary = ev.target.closest && ev.target.closest('summary');
    const group = summary && summary.parentElement;
    if(group && group.matches('details[data-ex-group]') && typeof rememberExGroup === 'function'){
      rememberExGroup(group.dataset.exGroup, group.dataset.exScope, !group.open);
    }
    fireFrom(ev.target, ev, 'data-act');
  }, false);
  document.addEventListener('input', ev => fireFrom(ev.target, ev, 'data-in'), false);
  document.addEventListener('focusin', ev => fireFrom(ev.target, ev, 'data-focus'), false);
  document.addEventListener('mouseover', ev => fireFrom(ev.target, ev, 'data-hover'), false);
}
wireActs();

/* ============================================================================
   The table. One line per action, grouped by the file whose functions it calls.
   ========================================================================== */

/* the shell */
ACT('go',                           el => { const dest = arg(el, 1); if(dest === 'session') openTrain(); else go(dest); });
ACT('reloadApp',                    el => reloadApp());
ACT('render',                       el => render());
ACT('switchLang',                   el => switchLang(arg(el, 1)));

/* shared components */
ACT('showChartTip',                 el => showChartTip(arg(el, 1), arg(el, 2)));

/* learning modules */
ACT('closeModule',                  el => closeModule());
ACT('openModule',                   el => openModule(arg(el, 1)));
ACT('setEnergy',                    el => setEnergy(arg(el, 1), arg(el, 2)));
ACT('setModStep',                   el => setModStep(arg(el, 1)));
ACT('setRecSim',                    el => setRecSim(arg(el, 1), arg(el, 2)));

/* the printed sheet */
ACT('openPrintCard',                el => openPrintCard(arg(el, 1)));
ACT('openPrintRecord',              el => openPrintRecord(arg(el, 1)));

/* science hub, lessons and explainers */
ACT('acceptWhy',                    el => acceptWhy());
ACT('answerQuiz',                   el => answerQuiz(arg(el, 1), arg(el, 2), arg(el, 3)));
ACT('backToScience',                el => backToScience());
ACT('finishQuiz',                   el => finishQuiz(arg(el, 1)));
ACT('markRead',                     el => markRead(arg(el, 1)));
ACT('openExplorer',                 el => openExplorer(arg(el, 1)));
ACT('openLesson',                   el => openLesson(arg(el, 1)));
ACT('openWhy',                      el => openWhy(arg(el, 1), arg(el, 2)));
ACT('rejectWhy',                    el => rejectWhy());
ACT('retryQuiz',                    el => retryQuiz(arg(el, 1)));
ACT('setMechEx',                    el => setMechEx(arg(el, 1)));
ACT('setSciCat',                    el => setSciCat(arg(el, 1)));
ACT('setSciQuery',                  el => setSciQuery(arg(el, 1)));
ACT('setSciView',                   el => setSciView(arg(el, 1)));
ACT('setSim',                       el => setSim(arg(el, 1), arg(el, 2)));

/* screens and onboarding */
ACT('addRest',                      el => addRest(arg(el, 1)));
ACT('openRestInfo',                 () => openRestInfo());
ACT('addShiftFromOnb',              el => addShiftFromOnb());
ACT('clearMuscle',                  el => clearMuscle());
ACT('closeSessionEditor',           el => closeSessionEditor());
ACT('closeSheet',                   el => closeSheet());
ACT('deleteEditedSet',              el => deleteEditedSet(arg(el, 1)));
ACT('deleteWholeSession',           el => deleteWholeSession());
ACT('doErase',                      el => doErase());
ACT('doExport',                     el => doExport());
/* The header's single recovery control changes purpose with the failure. */
ACT('storeRecovery',                () => {
  if(LOAD_FAILED) keepDamagedRecord();
  else if(STORAGE_FAILED) doExport();
  else if(ACTIVE && DRAFT_STORAGE_FAILED) retryStore();
});
ACT('doImport',                     el => doImport(arg(el, 1)));
ACT('editField',                    el => editField(arg(el, 1), arg(el, 2), arg(el, 3)));
ACT('finishOnboarding',             el => finishOnboarding());
ACT('markWarmupEditedSet',          el => markWarmupEditedSet(arg(el, 1)));
ACT('onbNext',                      el => onbNext());
ACT('openAnalysis',                 el => openAnalysis());
ACT('openExerciseDetail',           el => openExerciseDetail(arg(el, 1)));
ACT('openMobileMuscleSheet',        el => openMobileMuscleSheet());
ACT('openSessionEditor',            el => openSessionEditor(arg(el, 1), arg(el, 2)));
ACT('openSheet',                    el => openSheet(arg(el, 1)));
ACT('pickFeel',                     el => pickFeel(arg(el, 1), arg(el, 2)));
ACT('pickLang',                     el => pickLang(arg(el, 1)));
ACT('pickQuality',                  el => pickQuality(arg(el, 1)));
ACT('rebuildPlan',                  el => rebuildPlan());
ACT('removeBodyweightRow',          el => removeBodyweightRow(arg(el, 1)));
ACT('resetFig',                     el => resetFig());
ACT('resetRest',                    el => resetRest());
ACT('restoreExPool',                el => restoreExPool());
ACT('rotateFig',                    el => rotateFig());
ACT('saveBodyweightSheet',          el => saveBodyweightSheet());
ACT('saveEditedSet',                el => saveEditedSet(arg(el, 1)));
ACT('saveFeel',                     el => saveFeel());
ACT('saveShift',                    el => saveShift());
ACT('saveSleep',                    el => saveSleep());
ACT('selectMuscle',                 el => selectMuscle(arg(el, 1)));
ACT('setBodyMode',                  el => setBodyMode(arg(el, 1)));
ACT('retryLab',                     el => retryLab());
ACT('setBodyweight',                el => setBodyweight(arg(el, 1)));
ACT('setConsent',                   el => setConsent());
ACT('setDisplay',                   el => setDisplay(arg(el, 1), arg(el, 2)));
ACT('setEmphasis',                  el => setEmphasis(arg(el, 1)));
ACT('setEnvEquip',                  el => setEnvEquip(arg(el, 1)));
ACT('setLabLayer',                  el => setLabLayer(arg(el, 1)));
ACT('setLabRegion',                 el => setLabRegion(arg(el, 1)));
ACT('setLimit',                     el => setLimit(arg(el, 1)));
ACT('setP',                         el => setP(arg(el, 1), arg(el, 2)));
ACT('setOnbDays',                   el => setOnbDays(arg(el, 2)));
ACT('setOnbMinutes',                el => setOnbMinutes(arg(el, 2)));
ACT('setPeriod',                    el => setPeriod(arg(el, 1)));
ACT('setProgEx',                    el => setProgEx(arg(el, 1)));
ACT('setProgMetric',                el => setProgMetric(arg(el, 1)));
ACT('setRestNotify',                el => setRestNotify());
ACT('setSide',                      el => setSide(arg(el, 1)));
ACT('startRest',                    el => startRest(arg(el, 1)));
ACT('syncShiftPreview',             el => syncShiftPreview());
ACT('toggleEx',                     el => toggleEx(arg(el, 1)));
ACT('toggleGoalP',                  el => toggleGoalP(arg(el, 1)));
ACT('toggleNeedP',                  el => toggleNeedP(arg(el, 1)));
ACT('togglePriority',               el => togglePriority(arg(el, 1)));
ACT('toggleRest',                   el => toggleRest());
ACT('toggleZoom',                   el => toggleZoom());

/* the session, the planner and the exercise library */
ACT('addExerciseToActive',          el => addExerciseToActive(arg(el, 1)));
ACT('addExerciseToPlan',            el => addExerciseToPlan(arg(el, 1), arg(el, 2)));
ACT('addSet',                       el => addSet(arg(el, 1)));
ACT('adjustPlanSets',               el => adjustPlanSets(arg(el, 1), arg(el, 2), arg(el, 3)));
ACT('applyPlanSub',                 el => applyPlanSub(arg(el, 1), arg(el, 2), arg(el, 3)));
ACT('applySub',                     el => applySub(arg(el, 1), arg(el, 2)));
ACT('closeCompletion',              el => closeCompletion(arg(el, 1)));
ACT('copyPrevToExercise',           el => copyPrevToExercise(arg(el, 1)));
ACT('discardSession',               el => discardSession());
ACT('exOpen',                       el => exOpen(arg(el, 1), arg(el, 2), arg(el, 3)));
ACT('exerciseOptionsOpen',          el => exerciseOptionsOpen(arg(el, 1), arg(el, 2)));
ACT('setOptionsOpen',               el => setOptionsOpen(arg(el, 1), arg(el, 2), arg(el, 3)));
ACT('filterAddExSheet',             el => filterAddExSheet(arg(el, 1)));
ACT('finishSession',                el => finishSession());
ACT('movePlanExercise',             el => movePlanExercise(arg(el, 1), arg(el, 2), arg(el, 3)));
ACT('openAddExerciseSheet',         el => openAddExerciseSheet(arg(el, 1), arg(el, 2)));
ACT('openExerciseLibrary',          el => openExerciseLibrary(arg(el, 1)));
ACT('openExerciseSettings',         () => openExerciseSettings());
ACT('openPlanSub',                  el => openPlanSub(arg(el, 1), arg(el, 2)));
ACT('openSub',                      el => openSub(arg(el, 1)));
ACT('removePlanExercise',           el => removePlanExercise(arg(el, 1), arg(el, 2)));
ACT('removeSet',                    el => removeSet(arg(el, 1), arg(el, 2)));
ACT('resetLibFilters',              el => resetLibFilters());
ACT('selectPlanDay',                el => selectPlanDay(arg(el, 1)));
ACT('setExNote',                    el => setExNote(arg(el, 1), arg(el, 2)));
ACT('setLibEquip',                  el => setLibEquip(arg(el, 1)));
ACT('setLibMode',                   el => setLibMode(arg(el, 1)));
ACT('setLibMuscle',                 el => setLibMuscle(arg(el, 1)));
ACT('setLibQuery',                  el => setLibQuery(arg(el, 1)));
ACT('openRestPicker',                el => openRestPicker());
ACT('setPlanRestPick',               el => setPlanRestPick(arg(el, 1)));
ACT('openRepPicker',                 el => openRepPicker(arg(el, 1), arg(el, 2), arg(el, 3)));
ACT('pickRep',                       el => pickRep(arg(el, 1), arg(el, 2), arg(el, 3), arg(el, 4)));
ACT('setSessionSub',                el => setSessionSub(arg(el, 1)));
ACT('setSideVal',                   el => setSideVal(arg(el, 1), arg(el, 2), arg(el, 3), arg(el, 4), arg(el, 5)));
ACT('setVal',                       el => setVal(arg(el, 1), arg(el, 2), arg(el, 3), arg(el, 4)));
ACT('skipExercise',                 el => skipExercise(arg(el, 1)));
ACT('skipSet',                      el => skipSet(arg(el, 1)));
ACT('startCustomSession',           el => startCustomSession());
ACT('startSession',                 el => startSession(arg(el, 1)));
ACT('toggleLrSplit',                el => toggleLrSplit(arg(el, 1), arg(el, 2)));
ACT('togglePauseWorkout',           el => togglePauseWorkout());
ACT('togglePlanEdit',               el => togglePlanEdit());
ACT('toggleSet',                    el => toggleSet(arg(el, 1), arg(el, 2)));
ACT('toggleWarmup',                 el => toggleWarmup(arg(el, 1), arg(el, 2)));
ACT('unskipSet',                    el => unskipSet(arg(el, 1), arg(el, 2)));

/* Composites: the sites that made two calls, looked at the event, or read
   the click-time state of the app rather than the render-time one. */
ACT('chooseCurrentLang',            (el) => { chooseLang(CURRENT_LANG); });
ACT('closeRest',                    (el) => { stopRest(); render(); focusAfterRest(); });
ACT('setRestNotifyFromRest',        () => { closeSheet(); setRestNotify(); });
ACT('closeSheetBackdrop',           (el, ev) => { if(ev.target === el) closeSheet(); });
ACT('forgetCrashShown',             (el) => { forgetCrash(); render(); });
ACT('onbBack',                      (el) => { onbGo(onbIdx - 1); });
ACT('openLessonFromSheet',          (el) => { closeSheet(); openLesson(arg(el, 1)); });
ACT('openMuscle',                   (el) => { selectMuscle(arg(el, 1)); go('body'); });
ACT('openMuscleFromSheet',          (el) => { closeSheet(); selectMuscle(arg(el, 1)); go('body'); });
ACT('setSciCatAll',                 (el) => { setSciCat('all'); setSciQuery(''); });
ACT('setSessionSubGo',              (el) => {
  const sub = arg(el, 1) || 'plan';
  SESSION_SUB = (ACTIVE && sub === 'plan') ? 'plan-peek' : sub;
  go('session');
});
ACT('setSleepHours',                (el) => { setP('sleepHours', arg(el, 1)); const lab = document.getElementById('sl_v'); if(lab) lab.textContent = el.value; });
