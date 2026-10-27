/* ============================================================================
   ANCESTOR — Exercise library
   Every record carries what the engine needs: target muscles with contribution
   weights, equipment, rep range, target effort (RIR), contraindication tags,
   a technique cue, and a substitution chain that preserves training purpose.
   ========================================================================== */

const MUSCLES = ['chest','back','shoulders','biceps','triceps','forearms',
                 'quads','hamstrings','glutes','calves','abs','lowerback'];

/* Which muscle groups show on the front / back of the body map */
const MAP_FRONT = ['chest','shoulders','biceps','forearms','abs','quads','calves'];
const MAP_BACK  = ['back','shoulders','triceps','forearms','lowerback','glutes','hamstrings','calves'];

const EQUIP_SETS = {
  gym:     ['barbell','dumbbell','machine','cable','bodyweight'],
  home:    ['dumbbell','bodyweight'],
  minimal: ['bodyweight']
};

/* Load-increment guidance (kg). Used to keep progression to real plates. */
const INCREMENT = {
  barbell: { upper: 2.5, lower: 5 },
  machine: { upper: 2.5, lower: 5 },
  dumbbell:{ upper: 2,   lower: 2 },
  cable:   { upper: 2.5, lower: 2.5 },
  bodyweight:{ upper: 1.25, lower: 2.5 }   // added external load
};

const EX = [
/* ---------------- horizontal push ---------------- */
{id:'bb-bench', pat:'pushH', equip:'barbell', type:'compound',
 m:[['chest',.75],['triceps',.18],['shoulders',.07]], reps:[6,10], rir:2,
 avoid:['shoulder'], subs:['db-bench','machine-press','pushup']},

{id:'db-bench', pat:'pushH', equip:'dumbbell', type:'compound',
 m:[['chest',.72],['triceps',.18],['shoulders',.10]], reps:[8,12], rir:2,
 avoid:['shoulder'], subs:['bb-bench','machine-press','pushup']},

{id:'machine-press', pat:'pushH', equip:'machine', type:'compound',
 m:[['chest',.74],['triceps',.18],['shoulders',.08]], reps:[8,12], rir:1,
 avoid:['shoulder'], subs:['db-bench','bb-bench','pushup']},

{id:'incline-db', pat:'pushH', equip:'dumbbell', type:'compound',
 m:[['chest',.58],['shoulders',.26],['triceps',.16]], reps:[8,12], rir:2,
 avoid:['shoulder'], subs:['db-bench','machine-press','pushup']},

{id:'db-fly', pat:'pushH', equip:'dumbbell', type:'isolation',
 m:[['chest',.86],['shoulders',.10],['triceps',.04]], reps:[10,15], rir:1,
 avoid:['shoulder'], subs:['cable-fly','machine-press']},

{id:'cable-fly', pat:'pushH', equip:'cable', type:'isolation',
 m:[['chest',.88],['shoulders',.08],['triceps',.04]], reps:[12,15], rir:1,
 avoid:['shoulder'], subs:['db-fly']},

{id:'pushup', pat:'pushH', equip:'bodyweight', type:'compound',
 m:[['chest',.60],['triceps',.24],['shoulders',.16]], reps:[8,20], rir:1,
 avoid:['wrist','shoulder'], subs:['machine-press','db-bench']},

{id:'dip', pat:'pushH', equip:'bodyweight', type:'compound',
 m:[['chest',.52],['triceps',.34],['shoulders',.14]], reps:[6,12], rir:2,
 avoid:['shoulder'], subs:['machine-press','closegrip-bench']},

/* ---------------- vertical push ---------------- */
{id:'ohp', pat:'pushV', equip:'barbell', type:'compound',
 m:[['shoulders',.55],['triceps',.28],['chest',.09],['abs',.08]], reps:[5,8], rir:2,
 avoid:['shoulder','lowerback'], subs:['db-ohp','machine-press']},

{id:'db-ohp', pat:'pushV', equip:'dumbbell', type:'compound',
 m:[['shoulders',.58],['triceps',.26],['chest',.09],['abs',.07]], reps:[8,12], rir:2,
 avoid:['shoulder'], subs:['ohp','lateral-raise']},

{id:'lateral-raise', pat:'pushV', equip:'dumbbell', type:'isolation',
 m:[['shoulders',.92],['triceps',.08]], reps:[12,20], rir:1,
 avoid:['shoulder'], subs:['cable-lateral']},

{id:'cable-lateral', pat:'pushV', equip:'cable', type:'isolation',
 m:[['shoulders',.93],['triceps',.07]], reps:[12,20], rir:1,
 avoid:['shoulder'], subs:['lateral-raise']},

{id:'rear-delt-fly', pat:'pullH', equip:'dumbbell', type:'isolation',
 m:[['shoulders',.80],['back',.20]], reps:[12,20], rir:1,
 avoid:[], subs:['face-pull']},

/* ---------------- vertical pull ---------------- */
{id:'pullup', pat:'pullV', equip:'bodyweight', type:'compound',
 m:[['back',.68],['biceps',.22],['forearms',.10]], reps:[5,12], rir:2,
 avoid:['shoulder'], subs:['lat-pulldown','cg-pulldown']},

{id:'lat-pulldown', pat:'pullV', equip:'cable', type:'compound',
 m:[['back',.66],['biceps',.24],['forearms',.10]], reps:[8,12], rir:2,
 avoid:[], subs:['cg-pulldown','pullup','cable-row']},

{id:'cg-pulldown', pat:'pullV', equip:'cable', type:'compound',
 m:[['back',.64],['biceps',.28],['forearms',.08]], reps:[8,12], rir:2,
 avoid:[], subs:['lat-pulldown','pullup']},

/* ---------------- horizontal pull ---------------- */
{id:'bb-row', pat:'pullH', equip:'barbell', type:'compound',
 m:[['back',.58],['biceps',.20],['lowerback',.14],['shoulders',.08]], reps:[6,10], rir:2,
 avoid:['lowerback'], subs:['db-row','cable-row','chest-supported-row']},

{id:'db-row', pat:'pullH', equip:'dumbbell', type:'compound',
 m:[['back',.62],['biceps',.21],['lowerback',.10],['shoulders',.07]], reps:[8,12], rir:2,
 avoid:['lowerback'], subs:['cable-row','chest-supported-row','bb-row']},

{id:'cable-row', pat:'pullH', equip:'cable', type:'compound',
 m:[['back',.65],['biceps',.23],['lowerback',.06],['shoulders',.06]], reps:[8,12], rir:2,
 avoid:[], subs:['chest-supported-row','db-row']},

{id:'chest-supported-row', pat:'pullH', equip:'machine', type:'compound',
 m:[['back',.70],['biceps',.20],['shoulders',.10]], reps:[8,12], rir:1,
 avoid:[], subs:['cable-row','db-row']},

{id:'face-pull', pat:'pullH', equip:'cable', type:'isolation',
 m:[['shoulders',.55],['back',.35],['triceps',.10]], reps:[12,20], rir:1,
 avoid:[], subs:['rear-delt-fly']},

/* ---------------- squat ---------------- */
{id:'bb-squat', pat:'squat', equip:'barbell', type:'compound',
 m:[['quads',.52],['glutes',.28],['hamstrings',.10],['lowerback',.10]], reps:[5,8], rir:2,
 avoid:['knee','lowerback'], subs:['leg-press','goblet-squat','bulgarian-split']},

{id:'leg-press', pat:'squat', equip:'machine', type:'compound',
 m:[['quads',.55],['glutes',.28],['hamstrings',.17]], reps:[10,15], rir:2,
 avoid:['knee'], subs:['goblet-squat','bb-squat','step-up']},

{id:'goblet-squat', pat:'squat', equip:'dumbbell', type:'compound',
 m:[['quads',.48],['glutes',.30],['hamstrings',.12],['abs',.10]], reps:[10,15], rir:2,
 avoid:['knee'], subs:['leg-press','step-up','bb-squat']},

{id:'bulgarian-split', pat:'squat', equip:'dumbbell', type:'compound',
 m:[['quads',.46],['glutes',.38],['hamstrings',.16]], reps:[8,12], rir:2,
 avoid:['knee'], subs:['lunge','step-up','leg-press']},

{id:'lunge', pat:'squat', equip:'dumbbell', type:'compound',
 m:[['quads',.44],['glutes',.38],['hamstrings',.18]], reps:[10,16], rir:2,
 avoid:['knee'], subs:['step-up','bulgarian-split','goblet-squat']},

{id:'step-up', pat:'squat', equip:'dumbbell', type:'compound',
 m:[['quads',.44],['glutes',.40],['hamstrings',.16]], reps:[10,16], rir:2,
 avoid:['knee'], subs:['lunge','goblet-squat','leg-press']},

{id:'leg-ext', pat:'squat', equip:'machine', type:'isolation',
 m:[['quads',.96],['glutes',.04]], reps:[12,15], rir:1,
 avoid:['knee'], subs:['goblet-squat','leg-press']},

/* ---------------- hinge ---------------- */
{id:'deadlift', pat:'hinge', equip:'barbell', type:'compound',
 m:[['hamstrings',.28],['glutes',.26],['back',.24],['lowerback',.22]], reps:[4,6], rir:3,
 avoid:['lowerback'], subs:['rdl','hip-thrust','bb-row']},

{id:'rdl', pat:'hinge', equip:'barbell', type:'compound',
 m:[['hamstrings',.44],['glutes',.32],['lowerback',.19],['back',.05]], reps:[8,12], rir:2,
 avoid:['lowerback'], subs:['leg-curl','hip-thrust','back-ext']},

{id:'hip-thrust', pat:'hinge', equip:'barbell', type:'compound',
 m:[['glutes',.64],['hamstrings',.26],['quads',.10]], reps:[10,15], rir:2,
 avoid:[], subs:['rdl','leg-curl']},

{id:'leg-curl', pat:'hinge', equip:'machine', type:'isolation',
 m:[['hamstrings',.93],['calves',.07]], reps:[10,15], rir:1,
 avoid:[], subs:['rdl','hip-thrust']},

{id:'back-ext', pat:'hinge', equip:'bodyweight', type:'isolation',
 m:[['lowerback',.55],['glutes',.30],['hamstrings',.15]], reps:[12,20], rir:1,
 avoid:['lowerback'], subs:['rdl','hip-thrust']},

/* ---------------- calves ---------------- */
{id:'standing-calf', pat:'calf', equip:'machine', type:'isolation',
 m:[['calves',.94],['quads',.06]], reps:[12,20], rir:1,
 avoid:[], subs:['seated-calf']},

{id:'seated-calf', pat:'calf', equip:'machine', type:'isolation',
 m:[['calves',.94],['quads',.06]], reps:[15,25], rir:1,
 avoid:[], subs:['standing-calf']},

/* ---------------- elbow flexors ---------------- */
{id:'bb-curl', pat:'curl', equip:'barbell', type:'isolation',
 m:[['biceps',.82],['forearms',.18]], reps:[8,12], rir:1,
 avoid:['elbow','wrist'], subs:['db-curl','cable-curl','hammer-curl']},

{id:'db-curl', pat:'curl', equip:'dumbbell', type:'isolation',
 m:[['biceps',.84],['forearms',.16]], reps:[10,15], rir:1,
 avoid:['elbow'], subs:['cable-curl','bb-curl','hammer-curl']},

{id:'cable-curl', pat:'curl', equip:'cable', type:'isolation',
 m:[['biceps',.85],['forearms',.15]], reps:[10,15], rir:1,
 avoid:['elbow'], subs:['db-curl','bb-curl']},

{id:'hammer-curl', pat:'curl', equip:'dumbbell', type:'isolation',
 m:[['biceps',.58],['forearms',.42]], reps:[10,15], rir:1,
 avoid:['elbow'], subs:['db-curl','cable-curl']},

/* ---------------- elbow extensors ---------------- */
{id:'tri-pushdown', pat:'extend', equip:'cable', type:'isolation',
 m:[['triceps',.91],['forearms',.09]], reps:[10,15], rir:1,
 avoid:['elbow'], subs:['oh-tri-ext','skull-crusher']},

{id:'oh-tri-ext', pat:'extend', equip:'dumbbell', type:'isolation',
 m:[['triceps',.89],['forearms',.11]], reps:[10,15], rir:1,
 avoid:['elbow','shoulder'], subs:['tri-pushdown','skull-crusher']},

{id:'skull-crusher', pat:'extend', equip:'barbell', type:'isolation',
 m:[['triceps',.88],['forearms',.12]], reps:[8,12], rir:2,
 avoid:['elbow'], subs:['tri-pushdown','oh-tri-ext']},

{id:'closegrip-bench', pat:'extend', equip:'barbell', type:'compound',
 m:[['triceps',.54],['chest',.34],['shoulders',.12]], reps:[8,12], rir:2,
 avoid:['shoulder','elbow'], subs:['tri-pushdown','dip']},

/* ---------------- forearms ---------------- */
{id:'wrist-curl', pat:'forearm', equip:'dumbbell', type:'isolation',
 m:[['forearms',.95],['biceps',.05]], reps:[15,25], rir:1,
 avoid:['wrist'], subs:['hammer-curl']},

{id:'reverse-curl', pat:'forearm', equip:'dumbbell', type:'isolation',
 m:[['forearms',.62],['biceps',.38]], reps:[12,20], rir:1,
 avoid:['wrist','elbow'], subs:['hammer-curl','wrist-curl']},

/* ---------------- trunk ---------------- */
{id:'cable-crunch', pat:'core', equip:'cable', type:'isolation',
 m:[['abs',.88],['lowerback',.12]], reps:[10,20], rir:1,
 avoid:[], subs:['hanging-raise','ab-wheel']},

{id:'hanging-raise', pat:'core', equip:'bodyweight', type:'isolation',
 m:[['abs',.76],['forearms',.16],['quads',.08]], reps:[8,15], rir:1,
 avoid:[], subs:['cable-crunch','ab-wheel']},

{id:'ab-wheel', pat:'core', equip:'bodyweight', type:'isolation',
 m:[['abs',.68],['lowerback',.16],['shoulders',.16]], reps:[8,15], rir:1,
 avoid:['lowerback'], subs:['cable-crunch','hanging-raise']},

/* ---------------- dumbbell & bodyweight coverage ----------------
   Added so that a home-gym user and a pure-bodyweight user can still hit
   every muscle group. Without these, eight of twelve groups were
   unreachable without a barbell or a machine.                            */
{id:'db-rdl', pat:'hinge', equip:'dumbbell', type:'compound',
 m:[['hamstrings',.46],['glutes',.30],['lowerback',.19],['back',.05]], reps:[8,12], rir:2,
 avoid:['lowerback'], subs:['rdl','glute-bridge','nordic-curl']},

{id:'db-calf', pat:'calf', equip:'dumbbell', type:'isolation',
 m:[['calves',.94],['quads',.06]], reps:[12,20], rir:1,
 avoid:[], subs:['bw-calf','standing-calf']},

{id:'db-crunch', pat:'core', equip:'dumbbell', type:'isolation',
 m:[['abs',.88],['lowerback',.12]], reps:[12,20], rir:1,
 avoid:[], subs:['cable-crunch','hanging-raise']},

{id:'pike-pushup', pat:'pushV', equip:'bodyweight', type:'compound',
 m:[['shoulders',.55],['triceps',.28],['chest',.17]], reps:[6,15], rir:2,
 avoid:['shoulder','wrist'], subs:['db-ohp','ohp']},

{id:'chinup', pat:'pullV', equip:'bodyweight', type:'compound',
 m:[['back',.46],['biceps',.42],['forearms',.12]], reps:[5,12], rir:2,
 avoid:['shoulder'], subs:['cg-pulldown','lat-pulldown']},

{id:'bench-dip', pat:'extend', equip:'bodyweight', type:'isolation',
 m:[['triceps',.62],['chest',.24],['shoulders',.14]], reps:[10,20], rir:1,
 avoid:['shoulder'], subs:['tri-pushdown','dip']},

{id:'dead-hang', pat:'forearm', equip:'bodyweight', type:'isolation',
 m:[['forearms',.72],['back',.28]], reps:[20,60], rir:1,
 avoid:['shoulder'], subs:['wrist-curl','reverse-curl']},

{id:'bw-squat', pat:'squat', equip:'bodyweight', type:'compound',
 m:[['quads',.48],['glutes',.34],['hamstrings',.18]], reps:[12,25], rir:2,
 avoid:['knee'], subs:['goblet-squat','leg-press','bb-squat']},

{id:'nordic-curl', pat:'hinge', equip:'bodyweight', type:'isolation',
 m:[['hamstrings',.85],['calves',.15]], reps:[5,10], rir:1,
 avoid:['knee'], subs:['leg-curl','db-rdl']},

{id:'glute-bridge', pat:'hinge', equip:'bodyweight', type:'compound',
 m:[['glutes',.62],['hamstrings',.28],['quads',.10]], reps:[15,25], rir:1,
 avoid:[], subs:['hip-thrust','db-rdl']},

{id:'bw-calf', pat:'calf', equip:'bodyweight', type:'isolation',
 m:[['calves',.94],['quads',.06]], reps:[12,25], rir:1,
 avoid:[], subs:['db-calf','standing-calf']},

/* ---------------- timed holds ----------------------------------------
   `hold` is the target range in SECONDS. These movements are measured in
   time, not in repetitions: asking for "20 reps" of a plank is meaningless.
   `reps` is still present so that any legacy reader that expects a range
   gets a number in the right order of magnitude, but every current code
   path goes through exTargetRange().                                      */
{id:'plank', pat:'core', equip:'bodyweight', type:'isolation',
 m:[['abs',.70],['shoulders',.18],['glutes',.12]], hold:[20,60], reps:[20,60], rir:2,
 avoid:['wrist','shoulder'], subs:['side-plank','hollow-hold','dead-bug']},

{id:'side-plank', pat:'core', equip:'bodyweight', type:'isolation',
 m:[['abs',.62],['shoulders',.22],['glutes',.16]], hold:[15,45], reps:[15,45], rir:2,
 avoid:['shoulder','wrist'], subs:['plank','dead-bug']},

{id:'hollow-hold', pat:'core', equip:'bodyweight', type:'isolation',
 m:[['abs',.80],['lowerback',.20]], hold:[15,45], reps:[15,45], rir:2,
 avoid:['lowerback'], subs:['plank','dead-bug']},

{id:'wall-sit', pat:'squat', equip:'bodyweight', type:'isolation',
 m:[['quads',.88],['glutes',.12]], hold:[20,60], reps:[20,60], rir:2,
 avoid:['knee'], subs:['bw-squat','leg-press','chair-stand']},

/* ---------------- assisted -------------------------------------------
   Assistance is weight REMOVED from the body. It is stored in `a` and it is
   never treated as weight lifted. Reducing assistance is the progression.  */
{id:'assisted-pullup', pat:'pullV', equip:'machine', type:'compound',
 m:[['back',.66],['biceps',.24],['forearms',.10]], reps:[5,12], rir:2,
 avoid:['shoulder'], subs:['lat-pulldown','band-row-seated','pullup']},

{id:'assisted-dip', pat:'pushH', equip:'machine', type:'compound',
 m:[['chest',.50],['triceps',.36],['shoulders',.14]], reps:[6,12], rir:2,
 avoid:['shoulder'], subs:['machine-press','bench-dip','dip']},

/* ---------------- weighted bodyweight --------------------------------
   `w` is the load ADDED to the body. Total system load is only ever
   computed when the user has recorded a bodyweight; otherwise the app
   reports repetitions and says why.                                       */
{id:'weighted-pullup', pat:'pullV', equip:'dumbbell', type:'compound',
 m:[['back',.66],['biceps',.24],['forearms',.10]], reps:[4,8], rir:2,
 avoid:['shoulder'], subs:['pullup','lat-pulldown','chinup']},

{id:'weighted-dip', pat:'pushH', equip:'dumbbell', type:'compound',
 m:[['chest',.50],['triceps',.36],['shoulders',.14]], reps:[5,10], rir:2,
 avoid:['shoulder'], subs:['dip','closegrip-bench','machine-press']},

/* ---------------- loaded carry ---------------------------------------
   `dist` is the target range in METRES.                                   */
{id:'farmer-carry', pat:'forearm', equip:'dumbbell', type:'compound',
 m:[['forearms',.55],['abs',.25],['shoulders',.20]], dist:[20,60], reps:[20,60], rir:2,
 avoid:['lowerback'], subs:['dead-hang','wrist-curl']}
];

const EX_BY_ID = {};
EX.forEach(e => { EX_BY_ID[e.id] = e; });

/* Contribution weight of a muscle in an exercise (0 if not listed) */
function muscleWeight(ex, m) {
  for (let i = 0; i < ex.m.length; i++) if (ex.m[i][0] === m) return ex.m[i][1];
  return 0;
}
/* All muscles an exercise touches, heaviest first */
function exMuscles(id) { return (EX_BY_ID[id] ? EX_BY_ID[id].m : []).map(x => x[0]); }
