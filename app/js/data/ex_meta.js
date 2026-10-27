/* ============================================================================
   ANCESTOR — exercise accessibility & category metadata

   This EXTENDS the existing library rather than replacing it. The 59 original
   records keep their muscle weights, rep ranges and substitution chains; this
   file layers on:

     pos   positions the exercise can be performed in
     req   movement capabilities the exercise assumes
     cat   non-exclusive categories
     acc   adaptation flags
     cautions / adaptation notes (via i18n keys)

   Position and requirement data drive filtering for wheelchair users, seated
   training, limited grip, limited mobility and low-impact preferences.

   IMPORTANT: an `acc` flag never means "safe for every disabled person".
   Suitability depends on the individual. The UI states this explicitly.
   ========================================================================== */

/* --------------------------------------------------------- vocabularies */
const POSITIONS = ['standing','seated','floor','bench','wall'];
const REQUIREMENTS = ['grip','stand','kneel','overhead','balance','floorTransfer','load'];
const CATEGORIES = ['resistance','bodyweight','band','machine','freeWeight','seated',
                    'wheelchair','lowImpact','mobility','balance','functional'];

/* Metadata for the existing 59 exercises. Keyed by id. */
const EX_META = {
  /* horizontal push */
  'bb-bench':      {pos:['bench'],req:['grip','load'],cat:['resistance','freeWeight']},
  'db-bench':      {pos:['bench'],req:['grip','load'],cat:['resistance','freeWeight']},
  'machine-press': {pos:['seated'],req:['grip'],cat:['resistance','machine']},
  'incline-db':    {pos:['bench'],req:['grip','load','overhead'],cat:['resistance','freeWeight']},
  'db-fly':        {pos:['bench'],req:['grip','load'],cat:['resistance','freeWeight']},
  'cable-fly':     {pos:['standing'],req:['grip'],cat:['resistance','machine']},
  'pushup':        {pos:['floor','standing'],req:['floorTransfer'],cat:['bodyweight']},
  'dip':           {pos:['standing'],req:['grip','overhead'],cat:['bodyweight']},

  /* vertical push */
  'ohp':           {pos:['standing'],req:['grip','load','overhead','stand'],cat:['resistance','freeWeight']},
  'db-ohp':        {pos:['standing','seated'],req:['grip','load','overhead'],cat:['resistance','freeWeight']},
  'lateral-raise': {pos:['standing','seated'],req:['grip','load'],cat:['resistance','freeWeight']},
  'cable-lateral': {pos:['standing','seated'],req:['grip'],cat:['resistance','machine']},
  'rear-delt-fly': {pos:['standing','seated'],req:['grip','load'],cat:['resistance','freeWeight']},

  /* pulls */
  'pullup':        {pos:['standing'],req:['grip','overhead'],cat:['bodyweight']},
  'lat-pulldown':  {pos:['seated'],req:['grip','overhead'],cat:['resistance','machine']},
  'cg-pulldown':   {pos:['seated'],req:['grip','overhead'],cat:['resistance','machine']},
  'chinup':        {pos:['standing'],req:['grip','overhead'],cat:['bodyweight']},
  'bb-row':        {pos:['standing'],req:['grip','load','stand'],cat:['resistance','freeWeight']},
  'db-row':        {pos:['standing','seated'],req:['grip','load'],cat:['resistance','freeWeight']},
  'cable-row':     {pos:['seated'],req:['grip'],cat:['resistance','machine']},
  'chest-supported-row':{pos:['bench'],req:['grip'],cat:['resistance','machine']},
  'face-pull':     {pos:['standing','seated'],req:['grip'],cat:['resistance','machine']},

  /* squat */
  'bb-squat':      {pos:['standing'],req:['grip','load','stand'],cat:['resistance','freeWeight']},
  'leg-press':     {pos:['seated'],req:[],cat:['resistance','machine']},
  'goblet-squat':  {pos:['standing'],req:['grip','load','stand'],cat:['resistance','freeWeight','functional']},
  'bulgarian-split':{pos:['standing'],req:['grip','load','balance','stand'],cat:['resistance','freeWeight']},
  'lunge':         {pos:['standing'],req:['stand','balance'],cat:['bodyweight','functional']},
  'step-up':       {pos:['standing'],req:['stand','balance'],cat:['bodyweight','functional']},
  'leg-ext':       {pos:['seated'],req:[],cat:['resistance','machine']},
  'bw-squat':      {pos:['standing'],req:['stand','balance'],cat:['bodyweight','functional']},

  /* hinge */
  'deadlift':      {pos:['standing'],req:['grip','load','stand'],cat:['resistance','freeWeight']},
  'rdl':           {pos:['standing'],req:['grip','load','stand'],cat:['resistance','freeWeight']},
  'db-rdl':        {pos:['standing'],req:['grip','load','stand'],cat:['resistance','freeWeight']},
  'hip-thrust':    {pos:['floor'],req:['load','floorTransfer'],cat:['resistance','freeWeight']},
  'leg-curl':      {pos:['seated'],req:[],cat:['resistance','machine']},
  'back-ext':      {pos:['floor'],req:['floorTransfer'],cat:['bodyweight']},
  'nordic-curl':   {pos:['floor'],req:['kneel','floorTransfer'],cat:['bodyweight']},
  'glute-bridge':  {pos:['floor'],req:['floorTransfer'],cat:['bodyweight','lowImpact']},

  /* calves */
  'standing-calf': {pos:['standing'],req:['stand','balance'],cat:['resistance','machine']},
  'seated-calf':   {pos:['seated'],req:[],cat:['resistance','machine']},
  'db-calf':       {pos:['standing','seated'],req:['grip','load'],cat:['resistance','freeWeight']},
  'bw-calf':       {pos:['standing','seated'],req:['stand','balance'],cat:['bodyweight']},

  /* arms */
  'bb-curl':       {pos:['standing'],req:['grip','load'],cat:['resistance','freeWeight']},
  'db-curl':       {pos:['standing','seated'],req:['grip','load'],cat:['resistance','freeWeight']},
  'cable-curl':    {pos:['standing','seated'],req:['grip'],cat:['resistance','machine']},
  'hammer-curl':   {pos:['standing','seated'],req:['grip','load'],cat:['resistance','freeWeight']},
  'tri-pushdown':  {pos:['standing','seated'],req:['grip'],cat:['resistance','machine']},
  'oh-tri-ext':    {pos:['standing','seated'],req:['grip','load','overhead'],cat:['resistance','freeWeight']},
  'skull-crusher': {pos:['bench','floor'],req:['grip','load','floorTransfer'],cat:['resistance','freeWeight']},
  'closegrip-bench':{pos:['bench'],req:['grip','load'],cat:['resistance','freeWeight']},
  'bench-dip':     {pos:['seated','bench'],req:[],cat:['bodyweight']},
  'wrist-curl':    {pos:['seated'],req:['grip','load'],cat:['resistance','freeWeight']},
  'reverse-curl':  {pos:['standing','seated'],req:['grip','load'],cat:['resistance','freeWeight']},

  /* trunk */
  'cable-crunch':  {pos:['standing','seated'],req:['grip'],cat:['resistance','machine']},
  'hanging-raise': {pos:['standing'],req:['grip','overhead'],cat:['bodyweight']},
  'ab-wheel':      {pos:['floor'],req:['grip','floorTransfer'],cat:['bodyweight']},
  'db-crunch':     {pos:['floor','seated'],req:['load'],cat:['resistance','freeWeight']},
  'dead-hang':     {pos:['standing'],req:['grip','overhead'],cat:['bodyweight']},

  /* timed holds — measured in seconds, no external load required */
  'plank':         {pos:['floor'],req:['floorTransfer'],cat:['bodyweight','mobility'],acc:['lowImpact']},
  'side-plank':    {pos:['floor'],req:['floorTransfer'],cat:['bodyweight','mobility'],acc:['lowImpact']},
  'hollow-hold':   {pos:['floor'],req:['floorTransfer'],cat:['bodyweight'],acc:['lowImpact']},
  'wall-sit':      {pos:['standing'],req:['stand'],cat:['bodyweight','lowImpact'],acc:['lowImpact']},
  /* assisted / weighted bodyweight */
  'assisted-pullup':{pos:['standing'],req:['grip','overhead'],cat:['resistance','machine','bodyweight']},
  'assisted-dip':  {pos:['standing'],req:['grip','overhead'],cat:['resistance','machine','bodyweight']},
  'weighted-pullup':{pos:['standing'],req:['grip','overhead','load'],cat:['resistance','freeWeight','bodyweight']},
  'weighted-dip':  {pos:['standing'],req:['grip','overhead','load'],cat:['resistance','freeWeight','bodyweight']},
  /* loaded carry — measured in distance */
  'farmer-carry':  {pos:['standing'],req:['grip','stand','load'],cat:['resistance','freeWeight','functional']}
};

/* ------------------------------------------------------------------------
   New exercises: seated, wheelchair-compatible, band, low-impact, mobility
   and balance options. Added to the SAME library so every screen, filter
   and the progression engine treat them exactly like the originals.
   ---------------------------------------------------------------------- */
const EX_ACCESSIBLE = [
  {id:'band-row-seated', pat:'pullH', equip:'band', type:'compound',
   m:[['back',.62],['biceps',.22],['shoulders',.16]], reps:[10,15], rir:2,
   avoid:[], subs:['cable-row','db-row'],
   pos:['seated'], req:['grip'], cat:['band','seated','wheelchair','lowImpact'],
   acc:['seated','wheelchair','lowImpact']},

  {id:'band-press-seated', pat:'pushH', equip:'band', type:'compound',
   m:[['chest',.66],['triceps',.22],['shoulders',.12]], reps:[10,15], rir:2,
   avoid:[], subs:['machine-press','db-bench'],
   pos:['seated'], req:['grip'], cat:['band','seated','wheelchair','lowImpact'],
   acc:['seated','wheelchair','lowImpact']},

  {id:'wall-pushup', pat:'pushH', equip:'bodyweight', type:'compound',
   m:[['chest',.56],['triceps',.24],['shoulders',.20]], reps:[10,20], rir:2,
   avoid:[], subs:['pushup','machine-press'],
   pos:['standing'], req:['stand'], cat:['bodyweight','lowImpact'],
   acc:['lowImpact']},

  {id:'chair-stand', pat:'squat', equip:'bodyweight', type:'compound',
   m:[['quads',.48],['glutes',.34],['hamstrings',.18]], reps:[8,15], rir:2,
   avoid:[], subs:['bw-squat','goblet-squat','leg-press'],
   pos:['seated'], req:[], cat:['bodyweight','functional','lowImpact'],
   acc:['seated','lowImpact','functional']},

  {id:'seated-leg-ext', pat:'squat', equip:'bodyweight', type:'isolation',
   m:[['quads',.92],['glutes',.08]], reps:[10,20], rir:2,
   avoid:[], subs:['leg-ext','chair-stand'],
   pos:['seated'], req:[], cat:['seated','wheelchair','lowImpact'],
   acc:['seated','wheelchair','lowImpact']},

  {id:'seated-march', pat:'core', equip:'bodyweight', type:'isolation',
   m:[['abs',.72],['quads',.18],['glutes',.10]], reps:[16,30], rir:2,
   avoid:[], subs:['dead-bug','cable-crunch'],
   pos:['seated'], req:[], cat:['seated','wheelchair','lowImpact','functional'],
   acc:['seated','wheelchair','lowImpact']},

  {id:'band-pull-apart', pat:'pullH', equip:'band', type:'isolation',
   m:[['shoulders',.46],['back',.44],['triceps',.10]], reps:[12,20], rir:1,
   avoid:[], subs:['face-pull','rear-delt-fly'],
   pos:['standing','seated'], req:['grip'], cat:['band','lowImpact','mobility'],
   acc:['seated','lowImpact']},

  {id:'band-curl', pat:'curl', equip:'band', type:'isolation',
   m:[['biceps',.84],['forearms',.16]], reps:[12,20], rir:1,
   avoid:[], subs:['db-curl','cable-curl'],
   pos:['standing','seated'], req:['grip'], cat:['band','lowImpact'],
   acc:['seated','lowImpact']},

  {id:'band-pressdown', pat:'extend', equip:'band', type:'isolation',
   m:[['triceps',.88],['forearms',.12]], reps:[12,20], rir:1,
   avoid:[], subs:['tri-pushdown'],
   pos:['standing','seated'], req:['grip'], cat:['band','lowImpact'],
   acc:['seated','lowImpact']},

  {id:'dead-bug', pat:'core', equip:'bodyweight', type:'isolation',
   m:[['abs',.78],['lowerback',.22]], reps:[8,16], rir:2,
   avoid:[], subs:['seated-march','glute-bridge'],
   pos:['floor'], req:['floorTransfer'], cat:['bodyweight','lowImpact','mobility'],
   acc:['lowImpact']},

  {id:'bird-dog', pat:'hinge', equip:'bodyweight', type:'isolation',
   m:[['lowerback',.40],['glutes',.36],['abs',.24]], reps:[8,16], rir:2,
   avoid:[], subs:['glute-bridge','back-ext'],
   pos:['floor'], req:['kneel','floorTransfer','balance'], cat:['bodyweight','lowImpact','mobility','balance'],
   acc:['lowImpact']},

  {id:'cat-cow', pat:'core', equip:'bodyweight', type:'isolation',
   m:[['lowerback',.58],['abs',.42]], reps:[10,20], rir:3,
   avoid:[], subs:['bird-dog','dead-bug'],
   pos:['floor','seated'], req:['kneel'], cat:['mobility','lowImpact'],
   acc:['lowImpact','mobility']},

  {id:'heel-slide', pat:'hinge', equip:'bodyweight', type:'isolation',
   m:[['hamstrings',.84],['glutes',.16]], reps:[10,20], rir:3,
   avoid:[], subs:['leg-curl','glute-bridge'],
   pos:['floor'], req:['floorTransfer'], cat:['mobility','lowImpact'],
   acc:['lowImpact','mobility']},

  {id:'overhead-reach', pat:'pushV', equip:'bodyweight', type:'isolation',
   m:[['shoulders',.72],['back',.28]], reps:[10,20], rir:3,
   avoid:[], subs:['band-pull-apart'],
   pos:['standing','seated'], req:[], cat:['mobility','lowImpact'],
   acc:['seated','lowImpact','mobility']},

  {id:'balance-stand', pat:'squat', equip:'bodyweight', type:'isolation',
   m:[['glutes',.34],['quads',.30],['calves',.22],['abs',.14]], hold:[20,60], reps:[20,60], rir:3,
   avoid:[], subs:['bw-calf','glute-bridge'],
   pos:['standing'], req:['stand','balance'], cat:['balance','functional','lowImpact'],
   acc:['lowImpact']},

  {id:'seated-twist', pat:'core', equip:'bodyweight', type:'isolation',
   m:[['abs',.70],['lowerback',.30]], reps:[12,24], rir:2,
   avoid:[], subs:['seated-march','cable-crunch'],
   pos:['seated'], req:[], cat:['seated','wheelchair','mobility','lowImpact'],
   acc:['seated','wheelchair','lowImpact']},

  /* ---------------- conditioning & distance ---------------- */
  {id:'sled-push', pat:'cardio', equip:'machine', type:'compound',
   m:[['quads',.55],['glutes',.30],['calves',.15]], dist:[15,40], reps:[15,40], rir:2,
   avoid:['knee'], subs:['farmer-carry','bike-erg'],
   pos:['standing'], req:['stand'], cat:['functional','lowImpact'],
   acc:['lowImpact']},

  {id:'row-erg', pat:'cardio', equip:'machine', type:'compound',
   m:[['back',.45],['quads',.35],['hamstrings',.20]], dist:[250,1000], reps:[250,1000], rir:2,
   avoid:['lowerback'], subs:['bike-erg','run-interval'],
   pos:['seated'], req:['grip'], cat:['seated','lowImpact','functional'],
   acc:['seated','lowImpact']},

  {id:'bike-erg', pat:'cardio', equip:'machine', type:'compound',
   m:[['quads',.65],['glutes',.20],['calves',.15]], dist:[500,2000], reps:[500,2000], rir:2,
   avoid:[], subs:['row-erg','run-interval'],
   pos:['seated'], req:[], cat:['seated','lowImpact','functional'],
   acc:['seated','lowImpact']},

  {id:'run-interval', pat:'cardio', equip:'bodyweight', type:'compound',
   m:[['hamstrings',.40],['calves',.35],['glutes',.25]], dist:[200,1000], reps:[200,1000], rir:2,
   avoid:['knee'], subs:['bike-erg','row-erg'],
   pos:['standing'], req:['stand'], cat:['functional'],
   acc:[]}
];

/* ------------------------------------------------------------- wiring */
(function augment(){
  // 1. layer metadata onto the existing records (never overwrite core fields)
  EX.forEach(e => {
    const meta = EX_META[e.id] || {};
    e.pos = meta.pos || ['standing'];
    e.req = meta.req || [];
    e.cat = meta.cat || ['resistance'];
    e.acc = [];
    if(e.pos.indexOf('seated') >= 0) e.acc.push('seated');
    if(e.cat.indexOf('lowImpact') >= 0) e.acc.push('lowImpact');
    if(e.cat.indexOf('mobility') >= 0) e.acc.push('mobility');
  });
  // 2. append the new accessible exercises
  EX_ACCESSIBLE.forEach(e => {
    if(!EX_META[e.id]) EX_META[e.id] = {pos:e.pos,req:e.req,cat:e.cat,acc:e.acc};
    EX.push(e);
    EX_BY_ID[e.id] = e;
  });
})();

/* Bands are cheap, portable and central to accessible training. */
EQUIP_SETS.gym.push('band');
EQUIP_SETS.home.push('band');
EQUIP_SETS.minimal.push('band');           // a band is still "minimal" equipment
EQUIP_SETS.band = ['band','bodyweight'];

const EX_CATEGORIES = CATEGORIES;

/* ------------------------------------------------------- filtering ---
   Returns true when an exercise is compatible with the user's context.
   `profile.needs` is optional throughout — nothing here is mandatory.   */
function exerciseAllowed(ex, profile){
  const ctx = profile || {};
  const needs = ctx.needs || {};
  const allowPos = ctx.positions && ctx.positions.length ? ctx.positions : null;

  // seated-only / wheelchair
  if(needs.seatedOnly && !(ex.pos || []).includes('seated')) return false;
  if(needs.wheelchair  && !(ex.acc || []).includes('wheelchair')) return false;

  // user-specified preferred positions act as a filter, not a ban
  if(allowPos && !(ex.pos || []).some(p => allowPos.indexOf(p) >= 0)) return false;

  // capability requirements the user has told us they cannot meet
  const req = ex.req || [];
  if(needs.noGrip      && req.includes('grip'))      return false;
  if(needs.noKneeling  && req.includes('kneel'))     return false;
  if(needs.noFloor     && req.includes('floorTransfer')) return false;
  if(needs.noOverhead  && req.includes('overhead'))  return false;
  if(needs.noStanding  && req.includes('stand'))     return false;
  if(needs.noBalance   && req.includes('balance'))   return false;
  if(needs.lowImpactOnly && !(ex.acc || []).includes('lowImpact')) return false;
  return true;
}

/* Human-readable reason an exercise was filtered out — shown in the UI so the
   filtering is transparent rather than silent. */
function exclusionReason(ex, profile){
  const needs = (profile && profile.needs) || {};
  const req = ex.req || [];
  if(needs.seatedOnly && !(ex.pos||[]).includes('seated')) return 'a11y.needSeated';
  if(needs.wheelchair && !(ex.acc||[]).includes('wheelchair')) return 'a11y.needWheelchair';
  if(needs.lowImpactOnly && !(ex.acc||[]).includes('lowImpact')) return 'a11y.needLowImpact';
  if(needs.noGrip && req.includes('grip')) return 'a11y.needGrip';
  if(needs.noKneeling && req.includes('kneel')) return 'a11y.needKneel';
  if(needs.noFloor && req.includes('floorTransfer')) return 'a11y.needFloor';
  if(needs.noOverhead && req.includes('overhead')) return 'a11y.needOverhead';
  if(needs.noStanding && req.includes('stand')) return 'a11y.needStand';
  if(needs.noBalance && req.includes('balance')) return 'a11y.needBalance';
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EX_META, EX_ACCESSIBLE, POSITIONS, REQUIREMENTS, CATEGORIES,
                     exerciseAllowed, exclusionReason };
}
