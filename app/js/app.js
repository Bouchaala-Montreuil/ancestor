/* ============================================================================
   ANCESTOR — Router & boot
   Five primary destinations: Today · Train · Progress · Library · Me
   ========================================================================== */

/* The section marks. Drawn, not picked from a set: every one is built from
   the mark's own numbers — 24 grid, 2.4 mass, 3.2 margin, 4.2..19.8 span — so
   the navigation is in the same hand as the logo. Solid, not stroked: a 1.4 px
   hairline disappears on a 3x phone screen, 2.4 px of mass does not. */
const T_ICON = 2.4, M_ICON = 3.2, Y_ICON = 4.2, Y2_ICON = 19.8, R_ICON = 20.8;
const _bar = (x, y, w, h) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
const _frame = (x, y, w, h) =>
  _bar(x, y, w, T_ICON) + _bar(x, y + h - T_ICON, w, T_ICON) +
  _bar(x, y, T_ICON, h) + _bar(x + w - T_ICON, y, T_ICON, h);

/* Five destinations: the exercise library has its own reliable entry point.
   Body, Science, lessons and modules belong to the Progress group. */
const NAV = [
  /* a calendar with one day inked — today, not a week */
  { id:'home', label:'nav.today', icon:
      _frame(M_ICON, Y_ICON, R_ICON - M_ICON, Y2_ICON - Y_ICON) +
      _bar(M_ICON, Y_ICON + 4.6, R_ICON - M_ICON, T_ICON) +
      _bar(M_ICON + T_ICON + 2.4, Y_ICON + 9.4, 7.2, 5.0) },
  /* a tally of two */
  { id:'session', label:'nav.train', icon:
      _bar(7.0, Y_ICON, T_ICON, Y2_ICON - Y_ICON) +
      _bar(13.4, Y_ICON, T_ICON, Y2_ICON - Y_ICON) +
      '<rect x="2.30" y="10.8" width="19.4" height="2.4" transform="rotate(-16 12 12)"/>' },
  /* ascending bars on a baseline */
  { id:'progress', shortLabel:'nav.progressShort', icon:
      _bar(M_ICON, Y2_ICON + 0.4, R_ICON - M_ICON, T_ICON) +
      _bar(4.6, 14.2, 2.8, 5.2) +
      _bar(9.0, 10.6, 2.8, 8.8) +
      _bar(13.4, 7.4, 2.8, 12.0) +
      _bar(17.8, 4.2, 2.8, 15.2) },
  /* three ruled lines of decreasing length: a list of movements, not a shelf */
  { id:'library', shortLabel:'nav.libraryShort', act:'openExerciseLibrary', arg:'', icon:
      _bar(3.2, 5.2, 17.6, 2.4) +
      _bar(3.2, 10.8, 17.6, 2.4) +
      _bar(3.2, 16.4, 10.8, 2.4) },
  /* the dossier stamp itself: an inked block with the record knocked out of it,
     the same device that numbers every section in the app */
  { id:'profile', label:'nav.me', icon:
      '<path fill-rule="evenodd" d="M3.2 4.2h17.6v15.6H3.2z M7.6 8.6h8.8v2.4H7.6z M7.6 13h5.6v2.4H7.6z"/>' },
];

/* The two marks that moved out of the bar are still drawn here, in the same
   hand, so the Explore links on Profile and Today are the same drawing wherever
   the section appears. */
const NAV_MARK = {
  body:
      _bar(9.6, 3.2, 4.8, 4.8) +
      _bar(4.4, 9.6, 15.2, 3.2) +
      _bar(6.4, 13.6, 11.2, 2.6) +
      _bar(7.6, 17.0, 8.8, 2.2),
  science:
      _bar(M_ICON + 3.0, Y_ICON, R_ICON - M_ICON - 3.0, T_ICON) +
      _bar(M_ICON + 1.4, Y_ICON + 3.6, R_ICON - M_ICON - 1.4, T_ICON) +
      _bar(M_ICON, Y_ICON + 7.2, R_ICON - M_ICON, T_ICON) +
      _bar(M_ICON + 1.4, Y_ICON + 10.8, R_ICON - M_ICON - 1.4, T_ICON) +
      _bar(M_ICON + 3.0, Y_ICON + 14.4, R_ICON - M_ICON - 3.0, T_ICON)
};

let VIEW = 'home';

/* Navigation cross-fades. The DOM is always updated; only the paint is
   animated, so the back stack, screen readers and tests never see a stale
   screen. Without View Transitions we animate the incoming screen only and
   do not pretend to animate an exit we cannot produce. */
function go(v){
  const ov = document.getElementById('doneOverlay');
  if(ov && ov.parentNode){ ov.parentNode.innerHTML = ''; modalBackground(false); }
  if(VIEW === v && document.getElementById('screenBody').innerHTML){ render(); window.scrollTo(0,0); return; }
  VIEW = v;
  transitionView(() => { render(); window.scrollTo(0,0); });
}

/* Language is a setting, not a permanent control. The seven chips that used to
   sit in every header are gone: on a 390 px phone they took the whole right half
   of the masthead, and a language you switch once does not belong in the
   furniture. `switchLang` stays because settings calls it. */
function switchLang(l){
  setLang(l);
  const s = getState();
  s.lang = l;
  saveLangChosen(s);
  saveState();
  render();
  window.scrollTo(0, 0);
}
/* Changing a language must never be read as "this person has not answered the
   first-run question": it is the same answer, given again. */
function saveLangChosen(s){
  if(s) s.langChosen = true;
}

/* The nav is built once and then updated in place. Rebuilding its markup on
   every render would destroy the selection indicator, and an indicator that
   is recreated cannot be animated. */
let NAV_SIG = '';
function renderNav(show){
  const nav = $('#nav');
  if(!nav) return;
  if(!show){ nav.style.display = 'none'; NAV_SIG = ''; return; }
  nav.style.display = '';
  nav.setAttribute('aria-label', t('journey.primaryNav'));

  /* These screens have a visible route back to the Progress group. The
     library shares the session renderer, but is a destination in its own right. */
  const here = (VIEW === 'session' && typeof SESSION_SUB !== 'undefined' && SESSION_SUB === 'library') ? 'library'
             : (['body','science','lesson','module'].indexOf(VIEW) >= 0) ? 'progress' : VIEW;
  const inBar = NAV.some(n => n.id === here);
  const active = inBar ? here : null;
  const sig = CURRENT_LANG + '|' + NAV.map(n => n.id).join(',');
  if(NAV_SIG !== sig || !nav.querySelector('.inner')){
    nav.innerHTML = '<div class="inner"><i class="nav-ind" hidden></i>' + NAV.map(n => {
      const full = t(n.label || ('nav.' + n.id));
      const visible = t(n.shortLabel || n.label || ('nav.' + n.id));
      /* The accessible name starts with the visible label for speech control. */
      const name = visible === full ? full : visible + ' — ' + full;
      return '<button data-nav="' + n.id + '" class="" data-act="' + (n.act || 'go') + '" data-a1="' + (n.arg === undefined ? n.id : n.arg) + '" ' +
        'aria-label="' + esc(name) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + n.icon + '</svg><span>' + esc(visible) + '</span></button>';
    }).join('') + '</div>';
    NAV_SIG = sig;
  }
  let activeBtn = null;
  NAV.forEach(n => {
    const b = nav.querySelector('[data-nav="' + n.id + '"]');
    if(!b) return;
    const on = (active === n.id);
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
    if(on) activeBtn = b;
  });
  const ind = nav.querySelector('.nav-ind');
  if(activeBtn){
    const axis = (typeof window !== 'undefined' && window.innerWidth >= 1024) ? 'y' : 'x';
    moveIndicator(ind, activeBtn, axis);
  } else if(ind){
    ind.hidden = true;
  }
}

/* The storage strip. It lives in the header, outside the screen that is
   re-rendered, so a refused write is visible on every tab until one succeeds —
   including the tab the user is about to leave. Export is offered inline
   because the data is still in memory and this is the last moment to keep it. */
function paintStoreFlag(){
  const el = document.getElementById('storeFlag');
  if(!el) return;
  const failing = (typeof STORAGE_FAILED !== 'undefined') && STORAGE_FAILED;
  const damaged = (typeof LOAD_FAILED !== 'undefined') && LOAD_FAILED;
  const conflict = (typeof STORE_CONFLICT !== 'undefined') && STORE_CONFLICT;
  const eraseIncomplete = (typeof ERASE_INCOMPLETE !== 'undefined') && ERASE_INCOMPLETE;
  const mirrorUnchecked = (typeof MIRROR_UNCHECKED !== 'undefined') && MIRROR_UNCHECKED;
  const draftUnreadable = (typeof RAW_DRAFT !== 'undefined') && RAW_DRAFT !== null;
  const draftConflict = (typeof DRAFT_CONFLICT !== 'undefined') && DRAFT_CONFLICT;
  const draftFailing = (typeof ACTIVE !== 'undefined' && ACTIVE &&
                        typeof DRAFT_STORAGE_FAILED !== 'undefined' && DRAFT_STORAGE_FAILED);
  if(!failing && !damaged && !draftFailing && !conflict && !eraseIncomplete && !draftUnreadable && !draftConflict && !mirrorUnchecked){
    if(!el.hidden){ el.hidden = true; }
    cancelStoreRetry();
    return;
  }
  const tEl = el.querySelector('.sf-t');
  const bEl = el.querySelector('.sf-b');
  const xEl = el.querySelector('.sf-x');
  if(damaged){
    const newer = (typeof LOAD_NEWER !== 'undefined') && LOAD_NEWER;
    if(tEl) tEl.textContent = t('app.load.title');
    if(bEl) bEl.textContent = newer ? t('app.load.newer') : t('app.load.body');
    if(xEl) xEl.textContent = t('app.load.get');
  } else if(conflict){
    if(tEl) tEl.textContent = t('data.conflictTitle');
    if(bEl) bEl.textContent = ACTIVE ? t('data.conflictActive') : t('data.conflictBody');
    if(xEl) xEl.textContent = t('data.exportLabel');
  } else if(failing){
    if(tEl) tEl.textContent = t('app.store.title');
    /* The ordinary export contains the log, not the active draft. Say so. */
    if(bEl) bEl.textContent = ACTIVE ? t('workout.storeActive') : t('app.store.body');
    if(xEl) xEl.textContent = t('you.export');
  } else if(draftUnreadable){
    if(tEl) tEl.textContent = t('data.draftUnreadableTitle');
    if(bEl) bEl.textContent = t('data.draftUnreadable');
    if(xEl) xEl.textContent = t('data.draftDownload');
  } else if(draftConflict){
    if(tEl) tEl.textContent = t('data.draftConflictTitle');
    if(bEl) bEl.textContent = ACTIVE ? t('data.draftConflictActive') : t('data.draftConflictIdle');
    if(xEl) xEl.textContent = ACTIVE ? t('data.exportLabel') : t('data.draftReload');
  } else if(draftFailing){
    if(tEl) tEl.textContent = t('workout.draftTitle');
    if(bEl) bEl.textContent = t('workout.draftBody');
    if(xEl) xEl.textContent = t('btn.retry');
  } else if(mirrorUnchecked){
    if(tEl) tEl.textContent = t('data.mirrorTitle');
    if(bEl) bEl.textContent = t('data.mirrorBody') + (ACTIVE ? ' ' + t('data.exportNote') : '');
    if(xEl) xEl.textContent = t('btn.retry');
  } else {
    if(tEl) tEl.textContent = t('data.eraseIncompleteTitle');
    if(bEl) bEl.textContent = t('data.eraseIncomplete');
    if(xEl) xEl.textContent = t('data.dismiss');
  }
  el.hidden = false;
  /* A refused write is retried; an unreadable one is not, because the retry would
     be the overwrite. There the only way forward is the button. */
  if((failing && !conflict) || (draftFailing && !draftConflict)) scheduleStoreRetry();
  else cancelStoreRetry();
}

/* ---------------------------------------------------------- a deploy landed
   sw.js calls skipWaiting() and clients.claim(), so a new build takes control
   of the open tab the moment it installs. The tab keeps running the JS it
   loaded — that is how the browser works — and everything it fetches after that
   comes from the new cache. Two builds in one tab is exactly the state that
   makes a bug report unreproducible, and the person cannot see it happening.

   The signal is `controllerchange` after we already had a controller: a first
   install also fires it, and prompting then would be a lie about an update
   that did not happen. Nothing reloads by itself — a tab can be mid-session,
   and discarding someone's place to save a click is the wrong trade. */
let UPDATE_SHOWN = false;
function showUpdateReady(){
  const el = document.getElementById('updateFlag');
  if(!el || UPDATE_SHOWN) return;
  UPDATE_SHOWN = true;
  const tEl = el.querySelector('.uf-t');
  const bEl = el.querySelector('.uf-b');
  const xEl = el.querySelector('.uf-x');
  if(tEl) tEl.textContent = t('app.update.title');
  if(bEl) bEl.textContent = t('app.update.body');
  if(xEl) xEl.textContent = t('app.update.reload');
  el.hidden = false;
}
function reloadApp(){
  try{ location.reload(); }catch(e){ /* nothing better to offer */ }
}
function watchForDeploy(reg){
  try{
    if(!('serviceWorker' in navigator) || !navigator.serviceWorker) return;
    const sw = navigator.serviceWorker;
    /* A tab opened before this app ever registered a worker has no controller;
       the first one it receives is an install, not an update. */
    let had = !!sw.controller;
    sw.addEventListener('controllerchange', () => {
      if(!had){ had = true; return; }
      showUpdateReady();
    });
    if(reg && reg.waiting && had) showUpdateReady();
  }catch(e){ /* no worker, no banner */ }
}

/* The one action that is safe when the record will not open: hand the bytes back,
   put them somewhere they can be found again, and only then let the log start. */
function dismissEraseNotice(){
  try{ localStorage.removeItem(ERASE_NOTICE_KEY); }catch(e){ return; }
  ERASE_INCOMPLETE = false; paintStoreFlag();
}

function keepDamagedRecord(){
  const raw = (typeof RAW_RECORD === 'string') ? RAW_RECORD : '';
  try{
    const blob = new Blob([raw], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ancestor-unreadable-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }catch(e){ /* the archive below is the second copy */ }
  if(archiveDamagedRecord() === false){
    paintStoreFlag();
    toast(t('data.archiveFailed'), 'alert');
    return false;
  }
  const saved = saveState();
  paintStoreFlag();
  try{ render(); }catch(e){}
  if(saved) toast(t('app.load.kept'), 'ok');
  return saved;
}

/* A refused write is retried, not just reported. STATE is still the whole truth
   in memory, so every retry is a complete save: the first one that lands makes
   the log whole again and the strip goes away by itself. Three triggers, because
   they fail differently — the timer covers a quota that frees up, the focus and
   visibility events cover a browser that was suspended and came back, and a
   successful write anywhere cancels the loop. */
let storeRetryTimer = null;
function storeNeedsRetry(){
  return !!((typeof STORAGE_FAILED !== 'undefined' && STORAGE_FAILED && !STORE_CONFLICT) ||
    (typeof ACTIVE !== 'undefined' && ACTIVE && typeof DRAFT_STORAGE_FAILED !== 'undefined' && DRAFT_STORAGE_FAILED && !DRAFT_CONFLICT));
}
function retryStore(){
  if(!storeNeedsRetry()) return false;
  if(typeof STORAGE_FAILED !== 'undefined' && STORAGE_FAILED && !STORE_CONFLICT) saveState();
  if(typeof ACTIVE !== 'undefined' && ACTIVE &&
     typeof DRAFT_STORAGE_FAILED !== 'undefined' && DRAFT_STORAGE_FAILED && !DRAFT_CONFLICT) saveDraft();
  return !storeNeedsRetry();
}
function cancelStoreRetry(){
  if(storeRetryTimer){ clearTimeout(storeRetryTimer); storeRetryTimer = null; }
}
function scheduleStoreRetry(){
  if(storeRetryTimer) return;
  storeRetryTimer = setTimeout(function tick(){
    storeRetryTimer = null;
    if(!storeNeedsRetry()) return;
    if(retryStore()) return;          /* written — the strip is already gone */
    scheduleStoreRetry();
  }, 15000);
}

/* A screen that throws inside an event handler never goes through render(), so
   the designed failure state above never sees it: the button simply stops
   answering, on a page that still looks fine. One global net catches the rest of
   the app, and it shows the same block a screen failure shows. */
let LAST_UNCAUGHT = null;
let UPDATE_REG = null;
function reportUncaught(err){
  LAST_UNCAUGHT = err || new Error('unknown');
  /* Survives the tab. The failure state can only describe the crash to the
     person who is already looking at it; this is what lets Profile answer
     "what went wrong, and in which build" afterwards. */
  try{ if(typeof rememberCrash === 'function') rememberCrash(LAST_UNCAUGHT); }catch(e){}
  try{
    if(typeof console !== 'undefined' && console.error) console.error(err);
    const body = document.getElementById('screenBody');
    if(!body || body.querySelector('.fail')) return;   /* one failure, not two */
    if(typeof failureState !== 'function') return;
    body.innerHTML = failureState(LAST_UNCAUGHT);
    if(typeof paintStoreFlag === 'function') paintStoreFlag();
  }catch(e){ /* a handler that throws must not throw */ }
}

/* Browser/device Back follows actual screens, including the library, rather
   than abandoning a single-page app with no history. State updates within a
   screen do not create extra entries. A route contains no personal data. */
let ROUTE_HISTORY_READY = false;
let ROUTE_HISTORY_RESTORING = false;
function routeSnapshot(){
  const r = { view: VIEW };
  if(VIEW === 'session') r.sub = SESSION_SUB;
  if(VIEW === 'science') r.science = SCI_VIEW;
  if(VIEW === 'lesson') r.lesson = LESSON_ID;
  if(VIEW === 'module'){ r.module = MOD_ID; r.step = MOD_STEP; }
  return r;
}
function recordNavigation(){
  if(ROUTE_HISTORY_RESTORING || !getState().onboarded || typeof history === 'undefined') return;
  try{
    const route = routeSnapshot();
    const previous = history.state && history.state.ancestorRoute;
    const state = Object.assign({}, history.state || {}, { ancestorRoute: route });
    if(!ROUTE_HISTORY_READY){ history.replaceState(state, ''); ROUTE_HISTORY_READY = true; }
    else if(JSON.stringify(previous) !== JSON.stringify(route)) history.pushState(state, '');
  }catch(e){ /* history is optional: the tab bar and back links still work */ }
}
function restoreNavigation(ev){
  const r = ev && ev.state && ev.state.ancestorRoute;
  if(!r || !getState().onboarded ||
     ['home','session','progress','body','science','profile','lesson','module','onb'].indexOf(r.view) < 0) return;
  ROUTE_HISTORY_RESTORING = true;
  try{
    if(r.view === 'session') SESSION_SUB = r.sub || 'plan';
    if(r.view === 'science' && r.science) SCI_VIEW = r.science;
    if(r.view === 'lesson') LESSON_ID = r.lesson;
    if(r.view === 'module'){ MOD_ID = r.module; MOD_STEP = r.step || 0; }
    VIEW = r.view;
    const ov = document.getElementById('doneOverlay');
    if(ov && ov.parentNode) ov.parentNode.innerHTML = '';
    if(typeof closeSheet === 'function') closeSheet();
    transitionView(() => { render(); window.scrollTo(0, 0); });
  }finally{ ROUTE_HISTORY_RESTORING = false; }
}

/* Keep a disclosure open while its controls re-render the screen. Keys are
   stable across languages and routes; no preference or training data is saved. */
const OPEN_DISCLOSURES = Object.create(null);
function rememberDisclosures(root){
  if(!root) return;
  root.querySelectorAll('details[data-remember]').forEach(el => {
    OPEN_DISCLOSURES[el.getAttribute('data-remember')] = el.open;
  });
}
function restoreDisclosures(root){
  if(!root) return;
  root.querySelectorAll('details[data-remember]').forEach(el => {
    const key = el.getAttribute('data-remember');
    if(Object.prototype.hasOwnProperty.call(OPEN_DISCLOSURES, key)) el.open = OPEN_DISCLOSURES[key];
  });
}

/* A render replaces the screen, not the user's place. Track the actual
   control, not its translated label or a positional index that can shift. */
let FOCUS_VIEW_KEY = '';
function focusViewKey(view){
  if(view === 'onb') return view + ':' + onbIdx;
  if(view === 'session') return view + ':' + SESSION_SUB;
  if(view === 'science') return view + ':' + SCI_VIEW;
  if(view === 'lesson') return view + ':' + LESSON_ID;
  if(view === 'module') return view + ':' + MOD_ID + ':' + MOD_STEP;
  return view;
}
function captureScreenFocus(body, element){
  const el = element || document.activeElement, nav = document.getElementById('nav');
  const inside = !!(body && body.contains(el)), inNav = !!(nav && nav.contains(el));
  if(!inside && !inNav) return null;
  let keyboard = false, start, end, direction;
  try { keyboard = el.matches(':focus-visible'); } catch(e){}
  try { start = el.selectionStart; end = el.selectionEnd; direction = el.selectionDirection; } catch(e){}
  const action = el.hasAttribute('data-act') ? 'data-act' : el.hasAttribute('data-in') ? 'data-in' : '';
  const group = el.tagName === 'SUMMARY' && el.parentElement;
  return { el, inside, keyboard, id:el.id, tag:el.tagName, nav:el.dataset.nav,
    classes:Array.from(el.classList).filter(c => c !== 'on'),
    action, name:action && el.getAttribute(action),
    args:[1,2,3,4].map(n => el.getAttribute('data-a'+n)), start, end, direction,
    disclosure:group && group.getAttribute('data-remember'),
    exGroup:group && group.getAttribute('data-ex-group'), exScope:group && group.getAttribute('data-ex-scope') };
}
function focusScreenStart(){
  const body = document.getElementById('screenBody');
  const target = body && (body.querySelector('h1') || body);
  if(target){ if(!target.hasAttribute('tabindex')) target.setAttribute('tabindex','-1'); target.focus({preventScroll:true}); }
}
function findScreenFocusTarget(body, snap){
  if(!snap.inside){
    return snap.nav ? document.querySelector('#nav [data-nav="' + snap.nav + '"]') : null;
  }
  let target = snap.id && Array.from(body.querySelectorAll('[id]')).find(el => el.id === snap.id);
  if(!target && snap.tag === 'H1') target = body.querySelector('h1');
  if(!target && (snap.disclosure || snap.exGroup)){
    target = Array.from(body.querySelectorAll('details')).find(el =>
      snap.disclosure ? el.getAttribute('data-remember') === snap.disclosure :
        el.getAttribute('data-ex-group') === snap.exGroup && el.getAttribute('data-ex-scope') === snap.exScope);
    target = target && target.querySelector(':scope > summary');
  }
  if(!target && snap.action){
    const choices = Array.from(body.querySelectorAll('[' + snap.action + ']')).filter(el =>
      el.tagName === snap.tag && el.getAttribute(snap.action) === snap.name);
    const exact = choices.filter(el => snap.args.every((v,i) => el.getAttribute('data-a'+(i+1)) === v));
    const stable = choices.filter(el => el.getAttribute('data-a1') === snap.args[0]);
    /* A rerender can add another action with the same arguments (for example,
       a second bodyweight button in an empty state). Stable visual classes
       disambiguate the original control without relying on translated text. */
    const sameClasses = exact.filter(el => snap.classes.length && snap.classes.every(c => el.classList.contains(c)));
    target = exact.length === 1 ? exact[0] : sameClasses.length === 1 ? sameClasses[0] : stable.length === 1 ? stable[0] : null;
  }
  if(target){
    /* A changed choice may fold its parent; return to that disclosure instead
       of trying to focus a control hidden inside it. */
    for(let p = target.parentElement; p && p !== body; p = p.parentElement){
      if(p.tagName === 'DETAILS' && !p.open){ target = p.querySelector(':scope > summary'); break; }
    }
  }
  return target;
}
function restoreScreenFocus(body, snap){
  if(!snap) return;
  if(!snap.inside){
    if(!snap.el.isConnected){
      const nav = findScreenFocusTarget(body, snap);
      if(nav) nav.focus({preventScroll:true});
    }
    return;
  }
  const target = findScreenFocusTarget(body, snap);
  if(target && !target.disabled && !target.closest('[inert],[hidden]')){
    if(snap.tag === 'H1' && !target.hasAttribute('tabindex')) target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
    if(document.activeElement === target){
      try { if(typeof snap.start === 'number') target.setSelectionRange(snap.start, snap.end, snap.direction); } catch(e){}
      return;
    }
  }
  if(snap.keyboard) focusScreenStart();
}

function render(){
  const oldBody = document.getElementById('screenBody');
  const focus = captureScreenFocus(oldBody), previousFocusView = FOCUS_VIEW_KEY;
  /* A sheet may render its inert background before it closes or replaces
     itself. Rebind its opener to the new DOM without stealing dialog focus. */
  const sheetOpen = document.querySelector('#sheetHost .panel[role="dialog"]');
  const sheetOpener = sheetOpen && LAST_FOCUS ? captureScreenFocus(oldBody, LAST_FOCUS) : null;
  rememberDisclosures(oldBody);
  const s = getState();
  const onboarding = !s.onboarded;
  /* Step zero of onboarding is the language the rest of it is written in. The
     gate is "has a language ever been chosen", not "is there a saved string" —
     a record from before this screen existed reads as not-yet-asked, which is
     true, and asking once is the right number of times. */
  const askingLang = onboarding && !s.langChosen;
  const view = onboarding ? (askingLang ? 'lang' : 'onb') : VIEW;

  renderNav(!onboarding);

  // Accessibility + locale preferences come from the profile, every render.
  try { applyDisplay(s.profile); } catch(e){}
  try { applyLocale(CURRENT_LANG); } catch(e){}

  /* A screen that throws used to take the whole render with it, leaving
     whatever was on the page before — or nothing. It now degrades to a
     designed failure state that says the log is intact and offers a way out. */
  let out;
  try {
    out = askingLang ? (Screens.lang ? Screens.lang() : Screens.onb())
        : onboarding ? Screens.onb()
        : (Screens[view] ? Screens[view]() : Screens.home());
  } catch (err) {
    if (typeof console !== 'undefined' && console.error) console.error(err);
    out = { html: (typeof failureState === 'function') ? failureState(err) : '' };
  }
  // Science lessons hide the tab bar's "active" state is handled by renderNav

  const body = $('#screenBody');
  if(view === 'body' && typeof BODY_MODE !== 'undefined' && BODY_MODE === 'model' &&
     typeof labDetachStage === 'function'){
    try { labDetachStage(); } catch(e){}
  }
  body.className = 'screens on';
  body.innerHTML = out.html || '';
  restoreDisclosures(body);
  syncChoiceButtons(body);
  if(sheetOpener){
    let opener = findScreenFocusTarget(body, sheetOpener);
    if(!opener || opener.disabled || opener.closest('[hidden]')){
      opener = body.querySelector('h1') || body;
      if(!opener.hasAttribute('tabindex')) opener.setAttribute('tabindex','-1');
    }
    LAST_FOCUS = opener;
  }
  FOCUS_VIEW_KEY = focusViewKey(view);
  if(focus && previousFocusView && previousFocusView !== FOCUS_VIEW_KEY){
    /* Keep a selected subnavigation control focused; a keyboard page change
       or onboarding step starts at its heading instead. */
    if(focus.inside && (focus.name === 'setSessionSub' || focus.name === 'setSciView')) restoreScreenFocus(body, focus);
    else if(focus.keyboard) focusScreenStart();
  } else restoreScreenFocus(body, focus);

  $('#wordmark').textContent = t('app.name');
  $('#ver').textContent = t('app.tag');
  const nf = document.getElementById('netFlag');
  if(nf){
    const off = (typeof navigator !== 'undefined' && navigator.onLine === false);
    nf.hidden = !off;
    /* Offline is not a fault in this product — it is the design. The header
       says so, instead of raising an alarm about it. */
    if(off) nf.textContent = t('app.offlineOk');
  }

  paintStoreFlag();

  paintRestHost();
  bindFigure();
  try { bindAnatomyLab(); } catch(e) { /* the flat figure still works */ }
  try { bindModuleView(); } catch(e) { /* static diagram still renders */ }
  try { if(typeof hydrateMotion === 'function') hydrateMotion(body); } catch(e){}
  recordNavigation();
}

/* Tapping a region on the figure selects that muscle on the Body screen. */
/* Binds the transparent hit layer that sits above the visible artwork.
   Tapping a region always opens that muscle's record: select first, then
   navigate, so the destination screen is guaranteed to show the selection. */
function bindFigure(){
  $$('.seg-hit').forEach(el => {
    const m = el.getAttribute('data-m');
    // Activation is a plain function so it can be called from a pointer OR a
    // keystroke. `el.click()` is not used: SVGElement does not reliably
    // implement it across browsers.
    const activate = () => {
      if(!m) return;
      if(VIEW !== 'body'){
        selectMuscle(m);      // select while still on the current screen
        go('body');           // then navigate — the record is already open
      } else {
        selectMuscle(m);
      }
    };
    el.onkeydown = (ev) => {
      if(ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar'){
        ev.preventDefault(); activate();
      }
    };
    el.onclick = activate;
  });
}

function toast(msg, kind){
  /* Six call sites passed 'err' for eleven passes while the stylesheet only knew
     .toast.ok and .toast.alert — so every error looked exactly like a message.
     A kind with no rule is not a kind. */
  if(kind === 'err') kind = 'alert';
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast on' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
}
let toastTimer = null;

/* A green confirmation is a claim about a write. On the one path where the write
   was refused, the header strip has already told the truth; a "Saved" toast on
   top of it would be the lie the strip exists to prevent. So confirmations go
   through here, and it checks the last write rather than assuming it. */
function savedToast(key){
  if((typeof LOAD_FAILED !== 'undefined' && LOAD_FAILED) ||
     (typeof STORAGE_FAILED !== 'undefined' && STORAGE_FAILED) ||
     (typeof STORE_CONFLICT !== 'undefined' && STORE_CONFLICT)) return false;
  toast(t(key), 'ok');
  return true;
}

/* ------------------------------------------------------------------ DEBUG */
window.ANC = {
  get active(){ return ACTIVE; },
  get view(){ return VIEW; },
  get onbStep(){ return ONB_STEPS[onbIdx]; },
  get bodySel(){ return BODY_SEL; },
  get bodySide(){ return BODY_SIDE; },
  get bodyMode(){ return BODY_MODE; },
  get bodyFallback(){ return BODY_FALLBACK; },
  get labStruct(){ return LAB_STRUCT; },
  go: go,
  render: render
};

/* ------------------------------------------------------------------- BOOT */
function handleHashShortcut(){
  try{
    if(typeof location === 'undefined' || !location.hash) return false;
    const h = String(location.hash).replace(/^#\/?/, '').toLowerCase();
    const s = getState();
    if(!s.onboarded) return false;
    if(h === 'sleep'){
      VIEW = 'home'; render(); openSheet('sleep');
      try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
      return true;
    }
    if(h === 'train' || h === 'session'){
      VIEW = 'session';
      if(!ACTIVE) startSession(); else render();
      try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
      return true;
    }
  }catch(e){}
  return false;
}

/* The boot veil speaks the app's language, not the source project's. It used to
   say "PERFORMANCE LAB // OFFLINE ENGINE" in every language. */
function bootCopy(){
  try{
    const k = document.getElementById('bootKicker');
    const n = document.getElementById('bootNote');
    const b = document.getElementById('appBoot');
    if(k) k.textContent = t('app.tag');
    if(n) n.textContent = t('app.bootNote');
    if(b) b.setAttribute('aria-label', t('app.name'));
  }catch(e){}
}

function boot(){
  bootCopy();
  loadState();
  const s = getState();
  const restored = loadDraft();
  if(restored && ACTIVE) restoreRestFromDraft();
  if(!s.onboarded) VIEW = 'onb';
  else if(ACTIVE) VIEW = 'session';
  render();
  handleHashShortcut();
  try { if(typeof dismissAppBoot === 'function') dismissAppBoot(); } catch(e){}
  if(restored && ACTIVE) toast(t('session.draftRestored'), 'ok');
  try {
    if(typeof requestPersistentStorage === 'function'){
      requestPersistentStorage(() => { if(VIEW === 'profile') render(); });
    }
    if(typeof idbRecoverIfEmpty === 'function'){
      idbRecoverIfEmpty((rec, saved) => {
        if(rec && rec.onboarded){
          if(VIEW === 'onb') VIEW = ACTIVE ? 'session' : 'home';
          render(); if(saved) toast(t('you.recovered'), 'ok');
        }
      });
    }
  } catch(e){}

  const isSingleFile = !!(document.getElementById('three-runtime') &&
                          document.getElementById('three-runtime').textContent);
  if('serviceWorker' in navigator && !isSingleFile &&
     location && (location.protocol === 'https:' || location.protocol === 'http:')){
    navigator.serviceWorker.register('sw.js').then(reg => {
      UPDATE_REG = reg;
      watchForDeploy(reg);
    }).catch(()=>{});
  }
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) return;
    retryStore();
    /* A suspended page catches up to the actual deadline as soon as it returns. */
    tickRest();
    /* A tab left open overnight is the case this exists for: the browser only
       looks for a new worker on navigation and on its own slow schedule, so
       coming back to the tab asks once. Offline, it throws and is ignored. */
    try{ if(UPDATE_REG && UPDATE_REG.update) UPDATE_REG.update().catch(()=>{}); }catch(e){}
    if(VIEW === 'home') render();
  });
  window.addEventListener('focus', () => { retryStore(); });
  /* Another tab wrote: adopt it rather than overwrite it later. */
  window.addEventListener('storage', ev => {
    if(ev && ev.key === IDB_UNCHECKED_KEY){
      MIRROR_UNCHECKED = ev.newValue !== null; paintStoreFlag(); return;
    }
    if(ev && ev.key === DRAFT_KEY){
      if(ev.newValue !== LAST_DRAFT_RAW){ DRAFT_CONFLICT = true; if(ACTIVE) DRAFT_STORAGE_FAILED = true; paintStoreFlag(); }
      return;
    }
    if(ev && ev.key !== null && typeof STORE_KEY !== 'undefined' && ev.key !== STORE_KEY) return;
    /* Never throw away this tab's unsaved data or the sole unreadable copy just
       because another tab wrote. Retry is paused until the user keeps a copy. */
    if(STORAGE_FAILED || STORE_CONFLICT || LOAD_FAILED){
      STORE_CONFLICT = true; paintStoreFlag(); return;
    }
    try{ reloadState(); }catch(e){ return; }
    try{ render(); }catch(e){}
  });
  window.addEventListener('error', ev => { if(ev && ev.error) reportUncaught(ev.error); });
  window.addEventListener('unhandledrejection', ev => { if(ev && ev.reason) reportUncaught(ev.reason); });
  window.addEventListener('beforeunload', () => { retryStore(); });
  window.addEventListener('online',  () => { retryStore(); render(); });
  window.addEventListener('offline', () => render());
  window.addEventListener('hashchange', () => handleHashShortcut());
  window.addEventListener('popstate', restoreNavigation);
  window.addEventListener('resize', () => {
    try { renderNav(!!getState().onboarded); syncRestHeight(); } catch(e){}
  });

  /* Typing. On a phone the on-screen keyboard covers the bottom half of the
     screen — which is exactly where the tab bar sits, and often where the set's
     own Log button lands. Measured at 390x420 (a 390 px phone with the numeric
     keyboard up): the Log button sat at y=368..404 and the tab bar was painted
     from y=355 down, so the one action a session exists for was underneath the
     navigation. The bar steps aside while a field has focus — it is behind the
     keyboard in reality anyway — and the set being typed into pins its action to
     the bottom of what is left. See .typing in the stylesheet. */
  document.addEventListener('focusin', e => {
    const el = e.target;
    const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
    document.body.classList.toggle('typing', typing);
    if(REST) syncRestHeight();
  });
  document.addEventListener('focusout', () => {
    /* Deferred by a tick: moving between two fields fires focusout then focusin,
       and clearing here would flash the bar back in between them. */
    setTimeout(() => {
      const a = document.activeElement;
      const still = !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT');
      if(!still){
        document.body.classList.remove('typing');
        if(REST) syncRestHeight();
      }
    }, 0);
  });
}

document.addEventListener('DOMContentLoaded', boot);
