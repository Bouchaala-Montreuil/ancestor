/* ============================================================================
   ANCESTOR — inclusive profile model (schema v2)

   v2 is ADDITIVE. Every v1 field keeps its meaning, and a v1 record is
   upgraded in place without losing data. No existing key is renamed or
   removed; `goal` (string) is mirrored into `goals` (array) rather than
   replaced, so older code paths keep working.
   ========================================================================== */

const GOALS = [
  { id:'h', label:'goal.h',  desc:'goal.h.d', focus:['hypertrophy'] },
  { id:'s', label:'goal.s',  desc:'goal.s.d', focus:['strength'] },
  { id:'r', label:'goal.r',  desc:'goal.r.d', focus:['hypertrophy','fatloss'] },
  { id:'g', label:'goal.g',  desc:'goal.g.d', focus:['general'] },
  { id:'e', label:'goal.e',  desc:'goal.e.d', focus:['endurance'] },
  { id:'m', label:'goal.m',  desc:'goal.m.d', focus:['mobility'] },
  { id:'b', label:'goal.b',  desc:'goal.b.d', focus:['balance'] },
  { id:'f', label:'goal.f',  desc:'goal.f.d', focus:['functional'] },
  { id:'c', label:'goal.c',  desc:'goal.c.d', focus:['consistency'] }
];

const ENVIRONMENTS = [
  { id:'gym',     label:'env.gym',     desc:'env.gym.d' },
  { id:'home',    label:'env.home',    desc:'env.home.d' },
  { id:'outdoor', label:'env.outdoor', desc:'env.outdoor.d' },
  { id:'limited', label:'env.limited', desc:'env.limited.d' }
];

/* Every need is OPTIONAL and self-reported. None requires a diagnosis.
   `key` maps onto the filter flags consumed by exerciseAllowed(). */
const NEEDS = [
  { id:'seatedOnly',    key:'seatedOnly',    label:'need.seatedOnly',    desc:'need.seatedOnly.d' },
  { id:'wheelchair',    key:'wheelchair',    label:'need.wheelchair',    desc:'need.wheelchair.d' },
  { id:'lowImpactOnly', key:'lowImpactOnly', label:'need.lowImpact',     desc:'need.lowImpact.d' },
  { id:'noStanding',    key:'noStanding',    label:'need.noStanding',    desc:'need.noStanding.d' },
  { id:'noKneeling',    key:'noKneeling',    label:'need.noKneeling',    desc:'need.noKneeling.d' },
  { id:'noFloor',       key:'noFloor',       label:'need.noFloor',       desc:'need.noFloor.d' },
  { id:'noGrip',        key:'noGrip',        label:'need.noGrip',        desc:'need.noGrip.d' },
  { id:'noOverhead',    key:'noOverhead',    label:'need.noOverhead',    desc:'need.noOverhead.d' },
  { id:'noBalance',     key:'noBalance',     label:'need.noBalance',     desc:'need.noBalance.d' }
];

/* Accessibility display preferences — visual, cognitive and motion. */
const DISPLAY_DEFAULTS = {
  textScale: 1,          // 1 | 1.15 | 1.3
  highContrast: false,
  reducedMotion: 'auto', // 'auto' respects the OS setting
  simpleUI: false,
  captions: true         // written instructions always accompany media
};

function defaultV2Profile(){
  return {
    goals: ['h'],
    environment: 'gym',
    positions: [],                       // empty = any position
    needs: {},                           // optional, self-reported
    display: Object.assign({}, DISPLAY_DEFAULTS),
    /* Optional. Only used to report total system load on bodyweight
       movements. Null is a valid, honest answer, not a missing one. */
    bodyweight: null
  };
}

/* ------------------------------------------------------------------------
   `goal` (a single string, v1) and `goals` (an array, v2) both exist.
   `goals` is the source of truth; `goal` is a mirror for older readers.

   Writing `goal` alone used to be a dead end: the onboarding and profile
   screens set it, and every engine decision read `goals` instead, so the
   answer the user gave had no effect on the programme at all.
   ---------------------------------------------------------------------- */
function profileSet(p, key, value){
  if(!p || typeof p !== 'object') return p;
  p[key] = value;
  if(key === 'goal'){
    if(value) p.goals = [value];
  } else if(key === 'goals' && Array.isArray(value) && value.length){
    p.goal = value[0];
  }
  return p;
}

/* ------------------------------------------------------------------------
   Migration: v1 -> v2. Additive and idempotent. Never deletes data.
   ---------------------------------------------------------------------- */
function migrateProfile(p){
  if(!p || typeof p !== 'object') p = {};
  const d = defaultV2Profile();

  // goals: v1 stored a single string in `goal`
  if(!Array.isArray(p.goals) || !p.goals.length){
    p.goals = p.goal ? [p.goal] : d.goals.slice();
  }
  // keep `goal` in sync for any code path that still reads it
  if(!p.goal && p.goals.length) p.goal = p.goals[0];

  if(p.bodyweight === undefined) p.bodyweight = d.bodyweight;
  if(p.bodyweight !== null && (typeof p.bodyweight !== 'number' || !isFinite(p.bodyweight) || p.bodyweight <= 0)) p.bodyweight = null;
  if(typeof p.environment !== 'string') p.environment = d.environment;
  if(!Array.isArray(p.positions)) p.positions = [];
  if(!p.needs || typeof p.needs !== 'object') p.needs = {};
  p.display = Object.assign({}, DISPLAY_DEFAULTS, p.display || {});

  return p;
}

/* ------------------------------------------------------------- helpers */
function activeGoals(profile){ return (profile && Array.isArray(profile.goals) && profile.goals.length)
  ? profile.goals : ['h']; }
function hasGoal(profile, id){ return activeGoals(profile).indexOf(id) >= 0; }
function toggleGoal(profile, id){
  const g = activeGoals(profile);
  const i = g.indexOf(id);
  if(i >= 0){ if(g.length > 1) g.splice(i,1); }        // never leave zero goals
  else g.push(id);
  profile.goals = g;
  profile.goal = g[0];
  return profile;
}
function needOn(profile, id){ return !!(profile && profile.needs && profile.needs[id]); }
function toggleNeed(profile, id){
  if(!profile.needs) profile.needs = {};
  profile.needs[id] = !profile.needs[id];
  return profile;
}
function hasAnyNeed(profile){
  const n = (profile && profile.needs) || {};
  return Object.keys(n).some(k => n[k]);
}

/* Rep range and effort bias driven by the selected goals rather than by a
   single hypertrophy assumption. */
function goalRepBias(profile){
  const g = activeGoals(profile);
  if(g.indexOf('s') >= 0) return {lo:4,  hi:7,  rir:2};
  if(g.indexOf('e') >= 0) return {lo:15, hi:25, rir:1};
  if(g.indexOf('m') >= 0 || g.indexOf('b') >= 0) return {lo:10, hi:20, rir:3};
  if(g.indexOf('f') >= 0) return {lo:8,  hi:15, rir:2};
  if(g.indexOf('h') >= 0) return {lo:8,  hi:12, rir:2};
  return {lo:10, hi:15, rir:2};
}

/* Environment -> permitted equipment types. Extends, never replaces. */
function equipmentFor(profile){
  const env = (profile && profile.environment) || 'gym';
  if(env === 'home')    return ['dumbbell','bodyweight','band'];
  if(env === 'outdoor') return ['bodyweight','band'];
  if(env === 'limited') return ['bodyweight','band'];
  return ['barbell','dumbbell','machine','cable','bodyweight','band'];
}

/* ------------------------------------------------------------------------
   Apply display preferences to the document root. The stylesheet reads
   these as data attributes, so preferences are a single source of truth.
   ---------------------------------------------------------------------- */
function applyDisplay(profile){
  if(typeof document === 'undefined' || !document.documentElement) return;
  const r = document.documentElement;
  const d = Object.assign({}, DISPLAY_DEFAULTS, (profile && profile.display) || {});
  r.dataset.text     = String(d.textScale);
  r.dataset.contrast = d.highContrast ? 'high' : 'normal';
  r.dataset.simple   = d.simpleUI ? 'on' : 'off';
  const motion = d.reducedMotion === 'auto'
    ? (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on' : 'off')
    : (d.reducedMotion === 'on' ? 'on' : 'off');
  r.dataset.motion = motion;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GOALS, ENVIRONMENTS, NEEDS, DISPLAY_DEFAULTS, defaultV2Profile,
                     migrateProfile, profileSet, activeGoals, hasGoal, toggleGoal, needOn, toggleNeed,
                     hasAnyNeed, goalRepBias, equipmentFor, applyDisplay };
}
