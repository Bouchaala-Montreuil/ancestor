/* ============================================================================
   ANCESTOR — motion engine (vanilla)

   This project has no React, so `motion/react` and its <motion.div> API do
   not apply. What the React library provides is a set of behaviours, and
   those behaviours are what matters:

     · enter / exit transitions between views
     · shared animated selection indicators
     · staggered group reveals
     · animated numbers that count from the previous REAL value
     · progress rings that animate to the real value
     · press feedback on every interactive control
     · coordinated backdrop + panel motion for sheets and dialogs

   All of it is implemented here on top of CSS transitions, CSS custom
   properties and the Web Animations API, using transform and opacity only.

   Two hard rules:

     1. Every animation is driven by a real state change or a real user
        action. Nothing animates decoratively or in a loop.
     2. `prefers-reduced-motion` (exposed as html[data-motion="on"]) turns
        every non-essential animation off. Content still arrives; it just
        stops moving.
   ========================================================================== */

/* ------------------------------------------------------------------ tokens
   Mirrors --t-fast / --t / --t-slow and --ease in css/app.css so a duration
   is never written twice in two places. */
const MOTION = {
  instant : 0,
  fast    : 120,   // press feedback, hover
  base    : 180,   // page content enter
  slow    : 280,   // page exit, sheet panel
  stagger : 45,    // per-item delay inside a group
  count   : 620    // number / ring transitions
};

const EASE = {
  /* restrained: quick departure, settled arrival */
  out   : 'cubic-bezier(.22,.61,.36,1)',
  inOut : 'cubic-bezier(.45,.05,.35,1)',
  /* spring-like, for direct manipulation only (press, drag release) */
  spring: 'cubic-bezier(.34,1.42,.64,1)'
};

/* Last seen numeric values keyed by metric slot so updates animate from the
   previous real value rather than sweeping from zero on every render. */
const PREV_NUMBERS = {};
const PREV_RINGS   = {};
const PREV_SUBNAV  = {};
let REVEAL_IO      = null;

function isJsdom(){
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
}

function reducedMotion(){
  return document.documentElement && document.documentElement.dataset.motion === 'on';
}
/* Durations collapse to zero under reduced motion; content still updates. */
function dur(ms){ return reducedMotion() ? 0 : ms; }

/* ----------------------------------------------------- initial app boot
   Branded loading veil in index.html transitions out as soon as boot() has
   rendered the real screen — zero artificial splash delay, never stuck. */
function dismissAppBoot(){
  const el = typeof document !== 'undefined' && document.getElementById('appBoot');
  if(!el || el.dataset.done === '1') return;
  el.dataset.done = '1';
  if(reducedMotion() || isJsdom() || typeof el.animate !== 'function'){
    el.hidden = true;
    if(el.parentNode) el.parentNode.removeChild(el);
    return;
  }
  try{
    const anim = el.animate(
      [{ opacity: 1, transform: 'none' },
       { opacity: 0, transform: 'translate3d(0,-6px,0)' }],
      { duration: MOTION.base, easing: EASE.out, fill: 'forwards' }
    );
    const finish = () => { el.hidden = true; if(el.parentNode) el.parentNode.removeChild(el); };
    anim.onfinish = finish;
    setTimeout(finish, MOTION.slow + 40);
  }catch(e){
    el.hidden = true;
    if(el.parentNode) el.parentNode.removeChild(el);
  }
}

/* --------------------------------------------------------- page transitions
   The DOM is always updated synchronously — tests, screen readers and the
   back stack all depend on that. Only `#screenBody` animates (leaving the
   header and persistent nav rail rock-steady), using transform + opacity over
   MOTION.base (180 ms). */
function transitionView(updateFn){
  updateFn();
  if(reducedMotion()) return false;
  const body = document.getElementById('screenBody');
  if(!body) return false;
  if(typeof body.animate === 'function'){
    try{
      body.animate(
        [{ opacity: 0, transform: 'translate3d(0,8px,0)' },
         { opacity: 1, transform: 'translate3d(0,0,0)' }],
        { duration: dur(MOTION.base), easing: EASE.out, fill: 'both' }
      );
      return true;
    }catch(e){}
  }
  body.classList.remove('view-enter');
  void body.offsetWidth;
  body.classList.add('view-enter');
  return true;
}

/* --------------------------------------------------------- staggered groups
   Animates `[data-stagger]` children (or direct children) of a container,
   once, when they first appear. Uses CSS animation so it costs nothing after
   it has played. */
function staggerIn(container, opts){
  if(!container) return;
  opts = opts || {};
  const step = opts.step === undefined ? MOTION.stagger : opts.step;
  const sel  = opts.selector || '[data-stagger] > *';
  const items = Array.prototype.slice.call(container.querySelectorAll(sel));
  if(!items.length) return;
  if(reducedMotion()){ items.forEach(el => el.style.opacity = ''); return; }
  const max = Math.min(items.length, opts.max || 8);
  items.forEach((el, i) => {
    const delay = Math.min(i, max) * step;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'lab-rise ' + MOTION.base + 'ms ' + EASE.out + ' ' + delay + 'ms both';
  });
}

/* -------------------------------------------------------- animated numbers
   Counts from the value the element is showing to the new value. The start
   value is read off the DOM, so a metric that changes from 12 to 13 animates
   one step, not a full sweep from zero. */
function animateNumber(el, to, opts){
  if(!el) return;
  opts = opts || {};
  const decimals = opts.decimals === undefined ? 0 : opts.decimals;
  const suffix   = opts.suffix || '';
  const prefix   = opts.prefix || '';
  const from = parseFloat(el.getAttribute('data-value') || '');
  const fmt  = v => prefix + (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString()) + suffix;

  if(!isFinite(to)){ el.textContent = opts.empty || '—'; el.setAttribute('data-value',''); return; }
  if(reducedMotion() || !isFinite(from) || from === to){
    el.textContent = fmt(to);
    el.setAttribute('data-value', String(to));
    return;
  }
  const d = dur(opts.duration || MOTION.count);
  if(!d){ el.textContent = fmt(to); el.setAttribute('data-value', String(to)); return; }

  const t0 = performance.now();
  if(el.__ancAnim) cancelAnimationFrame(el.__ancAnim);
  const step = now => {
    const p = Math.min(1, (now - t0) / d);
    const e = 1 - Math.pow(1 - p, 3);             // easeOutCubic
    el.textContent = fmt(from + (to - from) * e);
    if(p < 1) el.__ancAnim = requestAnimationFrame(step);
    else { el.setAttribute('data-value', String(to)); el.__ancAnim = 0; }
  };
  el.__ancAnim = requestAnimationFrame(step);
}

/* ------------------------------------------------------------ progress ring
   Animates an SVG circle's stroke-dashoffset to the real fraction. */
function animateRing(circle, fraction){
  if(!circle) return;
  const r = parseFloat(circle.getAttribute('r')) || 1;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction || 0));
  const target = circumference * (1 - clamped);
  circle.setAttribute('stroke-dasharray', circumference.toFixed(2));
  if(reducedMotion()){ circle.setAttribute('stroke-dashoffset', target.toFixed(2)); return; }
  const key = circle.getAttribute('data-ring-key') || '';
  if(key && PREV_RINGS[key] !== undefined){
    const prevTarget = circumference * (1 - PREV_RINGS[key]);
    circle.setAttribute('stroke-dashoffset', prevTarget.toFixed(2));
  }
  if(key) PREV_RINGS[key] = clamped;
  circle.style.transition = 'stroke-dashoffset ' + MOTION.count + 'ms ' + EASE.out;
  requestAnimationFrame(() => circle.setAttribute('stroke-dashoffset', target.toFixed(2)));
}

/* Hydrate progress rings, tracked numbers, subnav indicators, accordions,
   scroll reveals and stagger groups after a render. */
function hydrateMotion(root){
  if(!root) return;
  const rings = root.querySelectorAll('circle[data-ring]');
  for(let i = 0; i < rings.length; i++){
    const f = parseFloat(rings[i].getAttribute('data-ring'));
    if(isFinite(f)) animateRing(rings[i], f);
  }
  const nums = root.querySelectorAll('[data-num-key]');
  for(let i = 0; i < nums.length; i++){
    const el = nums[i];
    const k  = el.getAttribute('data-num-key');
    const to = parseFloat(el.getAttribute('data-num-to'));
    if(!k || !isFinite(to)) continue;
    const dec = parseInt(el.getAttribute('data-num-dec') || '0', 10) || 0;
    const prev = PREV_NUMBERS[k];
    PREV_NUMBERS[k] = to;
    if(prev !== undefined && prev !== to){
      el.setAttribute('data-value', String(prev));
      animateNumber(el, to, { decimals: dec });
    } else {
      el.setAttribute('data-value', String(to));
    }
  }
  animateSubnavs(root);
  bindAccordions(root);
  observeReveals(root);
  staggerIn(root);
}

/* Shared sliding indicator across secondary .subnav tab bars. Remembers the
   last active button geometry per subnav key so re-renders glide smoothly. */
function animateSubnavs(root){
  const bars = root.querySelectorAll('.subnav');
  for(let i = 0; i < bars.length; i++){
    const bar = bars[i];
    const ind = bar.querySelector('.subnav-ind');
    const act = bar.querySelector('.subnav-btn.on');
    if(!ind || !act) continue;
    const key = bar.getAttribute('data-subnav') || String(i);
    const toX = act.offsetLeft || 0;
    const toW = act.offsetWidth || 0;
    const prev = PREV_SUBNAV[key];
    PREV_SUBNAV[key] = { x: toX, w: toW };
    ind.hidden = false;
    ind.style.width = toW + 'px';
    ind.style.transform = 'translateX(' + toX + 'px)';
    if(!reducedMotion() && !isJsdom() && prev && (prev.x !== toX || prev.w !== toW) && typeof ind.animate === 'function'){
      try{
        ind.animate(
          [{ transform: 'translateX(' + prev.x + 'px)', width: prev.w + 'px' },
           { transform: 'translateX(' + toX + 'px)',   width: toW + 'px' }],
          { duration: MOTION.base, easing: EASE.out }
        );
      }catch(e){}
    }
  }
}

/* Smooth accordion expansion on <details class="acc"> without breaking native
   keyboard / assistive-tech semantics. */
function bindAccordions(root){
  const list = root.querySelectorAll('details.acc');
  for(let i = 0; i < list.length; i++){
    const det = list[i];
    if(det.__ancAcc) continue;
    det.__ancAcc = true;
    const sum = det.querySelector('summary');
    const body = det.querySelector('.acc-body');
    if(!sum || !body) continue;
    sum.addEventListener('click', ev => {
      if(reducedMotion() || isJsdom() || typeof body.animate !== 'function') return;
      ev.preventDefault();
      if(det.open){
        const anim = body.animate(
          [{ opacity: 1, transform: 'translateY(0)' },
           { opacity: 0, transform: 'translateY(-4px)' }],
          { duration: MOTION.fast, easing: EASE.out }
        );
        anim.onfinish = () => { det.open = false; };
      } else {
        det.open = true;
        body.animate(
          [{ opacity: 0, transform: 'translateY(-6px)' },
           { opacity: 1, transform: 'translateY(0)' }],
          { duration: MOTION.base, easing: EASE.out }
        );
      }
    });
  }
}

/* Scroll-triggered reveals for below-the-fold sections. Falls back immediately
   when IntersectionObserver is absent or reduced motion is enabled. */
function observeReveals(root){
  const items = root.querySelectorAll('[data-reveal]');
  if(!items.length) return;
  if(reducedMotion() || isJsdom() || typeof IntersectionObserver !== 'function'){
    for(let i = 0; i < items.length; i++) items[i].classList.add('is-in');
    return;
  }
  if(!REVEAL_IO){
    REVEAL_IO = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if(en.isIntersecting){
          en.target.classList.add('is-in');
          REVEAL_IO.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -32px 0px', threshold: 0.06 });
  }
  for(let i = 0; i < items.length; i++){
    items[i].classList.add('reveal-ready');
    REVEAL_IO.observe(items[i]);
  }
}

/* --------------------------------------------------------------- press feel
   CSS :active handles the 120 ms compression; this adds haptic-adjacent
   feedback on touch devices that support it, and nothing where they don't. */
function pressFeedback(el){
  if(!el || !navigator.vibrate) return;
  if(reducedMotion()) return;
  try{ navigator.vibrate(8); }catch(e){}
}

/* ------------------------------------------------------- shared indicators
   Moves a persistent indicator element to sit under the active tab. The
   element must survive re-renders, which is why the nav updates classes
   in place instead of rebuilding its markup. */
function moveIndicator(indicator, target, axis){
  if(!indicator || !target) return;
  const dimProp = axis === 'y' ? 'height' : 'width';
  if(reducedMotion()) indicator.style.transition = 'none';
  else indicator.style.transition = 'transform ' + MOTION.base + 'ms ' + EASE.out +
                                    ', ' + dimProp + ' ' + MOTION.base + 'ms ' + EASE.out;
  if(axis === 'y'){
    indicator.style.width = '';
    indicator.style.height = target.offsetHeight + 'px';
    indicator.style.transform = 'translateY(' + target.offsetTop + 'px)';
  } else {
    indicator.style.height = '';
    indicator.style.width = target.offsetWidth + 'px';
    indicator.style.transform = 'translateX(' + target.offsetLeft + 'px)';
  }
  indicator.hidden = false;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MOTION, EASE, reducedMotion, dur, dismissAppBoot, transitionView, staggerIn,
                     animateNumber, animateRing, hydrateMotion, animateSubnavs,
                     bindAccordions, observeReveals, pressFeedback,
                     moveIndicator };
}
