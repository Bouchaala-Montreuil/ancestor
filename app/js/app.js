/* ============================================================================
   ANCESTOR — Router & boot
   Five sections: today · session · body · progress · profile
   ========================================================================== */

/* The six section marks. Drawn, not picked from a set: every one is built from
   the mark's own numbers — 24 grid, 2.4 mass, 3.2 margin, 4.2..19.8 span — so
   the navigation is in the same hand as the logo. Solid, not stroked: a 1.4 px
   hairline disappears on a 3x phone screen, 2.4 px of mass does not. */
const T_ICON = 2.4, M_ICON = 3.2, Y_ICON = 4.2, Y2_ICON = 19.8, R_ICON = 20.8;
const _bar = (x, y, w, h) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
const _frame = (x, y, w, h) =>
  _bar(x, y, w, T_ICON) + _bar(x, y + h - T_ICON, w, T_ICON) +
  _bar(x, y, T_ICON, h) + _bar(x + w - T_ICON, y, T_ICON, h);

const NAV = [
  /* a calendar with one day inked — today, not a week */
  { id:'home', icon:
      _frame(M_ICON, Y_ICON, R_ICON - M_ICON, Y2_ICON - Y_ICON) +
      _bar(M_ICON, Y_ICON + 4.6, R_ICON - M_ICON, T_ICON) +
      _bar(M_ICON + T_ICON + 2.4, Y_ICON + 9.4, 7.2, 5.0) },
  /* a tally of two */
  { id:'session', icon:
      _bar(7.0, Y_ICON, T_ICON, Y2_ICON - Y_ICON) +
      _bar(13.4, Y_ICON, T_ICON, Y2_ICON - Y_ICON) +
      '<rect x="2.30" y="10.8" width="19.4" height="2.4" transform="rotate(-16 12 12)"/>' },
  /* the figure, as mass */
  { id:'body', icon:
      _bar(9.6, 3.2, 4.8, 4.8) +
      _bar(4.4, 9.6, 15.2, 3.2) +
      _bar(6.4, 13.6, 11.2, 2.6) +
      _bar(7.6, 17.0, 8.8, 2.2) },
  /* ascending bars on a baseline */
  { id:'progress', icon:
      _bar(M_ICON, Y2_ICON + 0.4, R_ICON - M_ICON, T_ICON) +
      _bar(4.6, 14.2, 2.8, 5.2) +
      _bar(9.0, 10.6, 2.8, 8.8) +
      _bar(13.4, 7.4, 2.8, 12.0) +
      _bar(17.8, 4.2, 2.8, 15.2) },
  /* the dossier stamp itself: an inked block with the record knocked out of it,
     the same device that numbers every section in the app */
  { id:'profile', icon:
      '<path fill-rule="evenodd" d="M3.2 4.2h17.6v15.6H3.2z M7.6 8.6h8.8v2.4H7.6z M7.6 13h5.6v2.4H7.6z"/>' },
  /* a library: five stacked spines, an index of what is known */
  { id:'science', icon:
      _bar(M_ICON + 3.0, Y_ICON, R_ICON - M_ICON - 3.0, T_ICON) +
      _bar(M_ICON + 1.4, Y_ICON + 3.6, R_ICON - M_ICON - 1.4, T_ICON) +
      _bar(M_ICON, Y_ICON + 7.2, R_ICON - M_ICON, T_ICON) +
      _bar(M_ICON + 1.4, Y_ICON + 10.8, R_ICON - M_ICON - 1.4, T_ICON) +
      _bar(M_ICON + 3.0, Y_ICON + 14.4, R_ICON - M_ICON - 3.0, T_ICON) }
];

let VIEW = 'home';

/* Navigation cross-fades. The DOM is always updated; only the paint is
   animated, so the back stack, screen readers and tests never see a stale
   screen. Without View Transitions we animate the incoming screen only and
   do not pretend to animate an exit we cannot produce. */
function go(v){
  const ov = document.getElementById('doneOverlay');
  if(ov && ov.parentNode) ov.parentNode.innerHTML = '';
  if(VIEW === v && document.getElementById('screenBody').innerHTML){ render(); window.scrollTo(0,0); return; }
  VIEW = v;
  transitionView(() => { render(); window.scrollTo(0,0); });
}

function renderLangs(){
  const el = $('#langs'); if(!el) return;
  el.innerHTML = LANGS.map(l =>
    '<button class="' + (l === CURRENT_LANG ? 'on' : '') + '" onclick="switchLang(\'' + l + '\')">' +
    langLabel(l) + '</button>').join('');
}
function switchLang(l){ setLang(l); render(); }

/* The nav is built once and then updated in place. Rebuilding its markup on
   every render would destroy the selection indicator, and an indicator that
   is recreated cannot be animated. */
let NAV_SIG = '';
function renderNav(show){
  const nav = $('#nav');
  if(!nav) return;
  if(!show){ nav.style.display = 'none'; NAV_SIG = ''; return; }
  nav.style.display = '';

  const active = (VIEW === 'lesson' || VIEW === 'module') ? 'science' : VIEW;
  const sig = CURRENT_LANG + '|' + NAV.map(n => n.id).join(',');
  if(NAV_SIG !== sig || !nav.querySelector('.inner')){
    nav.innerHTML = '<div class="inner"><i class="nav-ind" hidden></i>' + NAV.map(n =>
      '<button data-nav="' + n.id + '" class="" onclick="go(\'' + n.id + '\')" ' +
      'aria-label="' + esc(t('nav.' + n.id)) + '">' +
      '<svg viewBox="0 0 24 24">' + n.icon + '</svg><span>' + esc(t('nav.' + n.id)) + '</span></button>'
    ).join('') + '</div>';
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
  if(activeBtn){
    const axis = (typeof window !== 'undefined' && window.innerWidth >= 1024) ? 'y' : 'x';
    moveIndicator(nav.querySelector('.nav-ind'), activeBtn, axis);
  }
}

function render(){
  const s = getState();
  const onboarding = !s.onboarded;
  const view = onboarding ? 'onb' : VIEW;

  renderLangs();
  renderNav(!onboarding);

  // Accessibility + locale preferences come from the profile, every render.
  try { applyDisplay(s.profile); } catch(e){}
  try { applyLocale(CURRENT_LANG); } catch(e){}

  /* A screen that throws used to take the whole render with it, leaving
     whatever was on the page before — or nothing. It now degrades to a
     designed failure state that says the log is intact and offers a way out. */
  let out;
  try {
    out = onboarding ? Screens.onb()
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

  paintRestHost();
  bindFigure();
  try { bindAnatomyLab(); } catch(e) { /* the flat figure still works */ }
  try { bindModuleView(); } catch(e) { /* static diagram still renders */ }
  try { if(typeof hydrateMotion === 'function') hydrateMotion(body); } catch(e){}
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
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast on' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
}
let toastTimer = null;

/* ------------------------------------------------------------------ DEBUG */
window.ANC = {
  get active(){ return ACTIVE; },
  get view(){ return VIEW; },
  get onbStep(){ return ONB_STEPS[onbIdx]; },
  get bodySel(){ return BODY_SEL; },
  get bodySide(){ return BODY_SIDE; },
  get bodyMode(){ return BODY_MODE; },
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
      idbRecoverIfEmpty(rec => {
        if(rec && rec.onboarded){ VIEW = 'home'; render(); toast(t('you.recovered'), 'ok'); }
      });
    }
  } catch(e){}

  const isSingleFile = !!(document.getElementById('three-runtime') &&
                          document.getElementById('three-runtime').textContent);
  if('serviceWorker' in navigator && !isSingleFile &&
     location && (location.protocol === 'https:' || location.protocol === 'http:')){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
  document.addEventListener('visibilitychange', () => {
    if(!document.hidden && VIEW === 'home') render();
  });
  window.addEventListener('online',  () => render());
  window.addEventListener('offline', () => render());
  window.addEventListener('hashchange', () => handleHashShortcut());
  window.addEventListener('resize',  () => { try { renderNav(!!getState().onboarded); } catch(e){} });
}

document.addEventListener('DOMContentLoaded', boot);
