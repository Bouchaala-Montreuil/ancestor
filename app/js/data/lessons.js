/* ============================================================================
   ANCESTOR — Science Hub lesson content

   Scope note: lesson TITLES, SUMMARIES and TAKEAWAYS are localised.
   Section bodies are currently English only; `langs` declares this and the UI
   states it rather than silently showing English under another language name.

   Every scientific claim in a lesson is linked to an evidence record by id.
   Model simplifications are labelled, and no lesson claims to measure a user's
   physiology.
   ========================================================================== */

const SCIENCE_CATEGORIES = [
  { id:'muscle-physiology',  label:'cat.musclePhysiology',  desc:'cat.musclePhysiology.d'  },
  { id:'metabolism',         label:'cat.metabolism',        desc:'cat.metabolism.d'        },
  { id:'strength',           label:'cat.strength',          desc:'cat.strength.d'          },
  { id:'biomechanics',       label:'cat.biomechanics',      desc:'cat.biomechanics.d'      },
  { id:'cardio-health',      label:'cat.cardioHealth',      desc:'cat.cardioHealth.d'      },
  { id:'sleep-recovery',     label:'cat.sleepRecovery',     desc:'cat.sleepRecovery.d'     },
  { id:'nutrition',          label:'cat.nutrition',         desc:'cat.nutrition.d'         },
  { id:'aging-mobility',     label:'cat.agingMobility',     desc:'cat.agingMobility.d'     },
  { id:'training-principles',label:'cat.trainingPrinciples',desc:'cat.trainingPrinciples.d'},
  { id:'literacy',           label:'cat.literacy',          desc:'cat.literacy.d'          }
];

const LESSONS = [
/* ------------------------------------------------------------------ 1 */
{
  id:'muscle-growth', cat:'muscle-physiology', titleKey:'les.muscleGrowth', summaryKey:'les.muscleGrowth.s', mins:6, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.muscle-growth.1.h', b:'sec.muscle-growth.1.b'},
    {h:'sec.muscle-growth.2.h', b:'sec.muscle-growth.2.b'},
    {h:'sec.muscle-growth.3.h', b:'sec.muscle-growth.3.b'},
    {h:'sec.muscle-growth.4.h', b:'sec.muscle-growth.4.b'},
    {h:'sec.muscle-growth.5.h', b:'sec.muscle-growth.5.b'}
  ],
  takeaways:['takeaway.mg.1','takeaway.mg.2','takeaway.mg.3'],
  evidence:['damas-2016-hypertrophy','wackerhage-2019-stimuli','schoenfeld-2016-volume'],
  myths:[
    {claim:'myth.mg.pump', verdict:'myth.mg.pump.v', why:'myth.mg.pump.why'},
    {claim:'myth.mg.damage', verdict:'myth.mg.damage.v', why:'myth.mg.damage.why'}
  ],
  quiz:[
    {q:'quiz.mg.q1', options:['quiz.mg.q1.a','quiz.mg.q1.b','quiz.mg.q1.c'], answer:1, explain:'quiz.mg.q1.e'},
    {q:'quiz.mg.q2', options:['quiz.mg.q2.a','quiz.mg.q2.b'], answer:1, explain:'quiz.mg.q2.e'}
  ],
  features:[{view:'progress',label:'feature.progress'},{view:'body',label:'feature.body'}],
  personal:'overload'
},
/* ------------------------------------------------------------------ 2 */
{
  id:'energy-fat', cat:'metabolism', titleKey:'les.energyFat', summaryKey:'les.energyFat.s', mins:6, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.energy-fat.1.h', b:'sec.energy-fat.1.b'},
    {h:'sec.energy-fat.2.h', b:'sec.energy-fat.2.b'},
    {h:'sec.energy-fat.3.h', b:'sec.energy-fat.3.b'},
    {h:'sec.energy-fat.4.h', b:'sec.energy-fat.4.b'},
    {h:'sec.energy-fat.5.h', b:'sec.energy-fat.5.b'}
  ],
  takeaways:['takeaway.ef.1','takeaway.ef.2','takeaway.ef.3'],
  evidence:['spot-reduction-statement'],
  myths:[
    {claim:'myth.ef.spot', verdict:'myth.ef.spot.v', why:'myth.ef.spot.why'},
    {claim:'myth.ef.fasted', verdict:'myth.ef.fasted.v', why:'myth.ef.fasted.why'}
  ],
  quiz:[
    {q:'quiz.ef.q1', options:['quiz.ef.q1.a','quiz.ef.q1.b'], answer:1, explain:'quiz.ef.q1.e'}
  ],
  features:[{view:'progress',label:'feature.progress'}],
  personal:null
},
/* ------------------------------------------------------------------ 3 */
{
  id:'strength-power', cat:'strength', titleKey:'les.strengthPower', summaryKey:'les.strengthPower.s', mins:5, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.strength-power.1.h', b:'sec.strength-power.1.b'},
    {h:'sec.strength-power.2.h', b:'sec.strength-power.2.b'},
    {h:'sec.strength-power.3.h', b:'sec.strength-power.3.b'},
    {h:'sec.strength-power.4.h', b:'sec.strength-power.4.b'}
  ],
  takeaways:['takeaway.sp.1','takeaway.sp.2'],
  evidence:['schoenfeld-2017-load','suchomel-2016','acsm-2009-progression'],
  myths:[
    {claim:'myth.sp.heavy', verdict:'myth.sp.heavy.v', why:'myth.sp.heavy.why'}
  ],
  quiz:[
    {q:'quiz.sp.q1', options:['quiz.sp.q1.a','quiz.sp.q1.b'], answer:0, explain:'quiz.sp.q1.e'}
  ],
  features:[{view:'progress',label:'feature.progress'}],
  personal:'overload'
},
/* ------------------------------------------------------------------ 4 */
{
  id:'movement-mechanics', cat:'biomechanics', titleKey:'les.movementMechanics', summaryKey:'les.movementMechanics.s', mins:5, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.movement-mechanics.1.h', b:'sec.movement-mechanics.1.b'},
    {h:'sec.movement-mechanics.2.h', b:'sec.movement-mechanics.2.b'},
    {h:'sec.movement-mechanics.3.h', b:'sec.movement-mechanics.3.b'},
    {h:'sec.movement-mechanics.4.h', b:'sec.movement-mechanics.4.b'}
  ],
  takeaways:['takeaway.mm.1','takeaway.mm.2'],
  evidence:['acsm-2009-progression'],
  myths:[
    {claim:'myth.mm.perfect', verdict:'myth.mm.perfect.v', why:'myth.mm.perfect.why'}
  ],
  quiz:[
    {q:'quiz.mm.q1', options:['quiz.mm.q1.a','quiz.mm.q1.b'], answer:1, explain:'quiz.mm.q1.e'}
  ],
  features:[{view:'body',label:'feature.body'},{view:'session',label:'feature.session'}],
  personal:'mechanics'
},
/* ------------------------------------------------------------------ 5 */
{
  id:'cardio-health', cat:'cardio-health', titleKey:'les.cardioHealth', summaryKey:'les.cardioHealth.s', mins:4, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.cardio-health.1.h', b:'sec.cardio-health.1.b'},
    {h:'sec.cardio-health.2.h', b:'sec.cardio-health.2.b'},
    {h:'sec.cardio-health.3.h', b:'sec.cardio-health.3.b'}
  ],
  takeaways:['takeaway.ch.1','takeaway.ch.2'],
  evidence:['garber-2011-quantity'],
  myths:[
    {claim:'myth.ch.cardio', verdict:'myth.ch.cardio.v', why:'myth.ch.cardio.why'}
  ],
  quiz:[
    {q:'quiz.ch.q1', options:['quiz.ch.q1.a','quiz.ch.q1.b'], answer:1, explain:'quiz.ch.q1.e'}
  ],
  features:[{view:'home',label:'feature.home'}],
  personal:null
},
/* ------------------------------------------------------------------ 6 */
{
  id:'sleep-recovery', cat:'sleep-recovery', titleKey:'les.sleepRecovery', summaryKey:'les.sleepRecovery.s', mins:5, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.sleep-recovery.1.h', b:'sec.sleep-recovery.1.b'},
    {h:'sec.sleep-recovery.2.h', b:'sec.sleep-recovery.2.b'},
    {h:'sec.sleep-recovery.3.h', b:'sec.sleep-recovery.3.b'},
    {h:'sec.sleep-recovery.4.h', b:'sec.sleep-recovery.4.b'}
  ],
  takeaways:['takeaway.sr.1','takeaway.sr.2','takeaway.sr.3'],
  evidence:['watson-2015-sleep','recovery-model-note'],
  myths:[
    {claim:'myth.sr.seven', verdict:'myth.sr.seven.v', why:'myth.sr.seven.why'}
  ],
  quiz:[
    {q:'quiz.sr.q1', options:['quiz.sr.q1.a','quiz.sr.q1.b'], answer:1, explain:'quiz.sr.q1.e'}
  ],
  features:[{view:'home',label:'feature.home'},{view:'body',label:'feature.body'}],
  personal:'recovery'
},
/* ------------------------------------------------------------------ 7 */
{
  id:'nutrition', cat:'nutrition', titleKey:'les.nutrition', summaryKey:'les.nutrition.s', mins:4, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.nutrition.1.h', b:'sec.nutrition.1.b'},
    {h:'sec.nutrition.2.h', b:'sec.nutrition.2.b'},
    {h:'sec.nutrition.3.h', b:'sec.nutrition.3.b'}
  ],
  takeaways:['takeaway.nu.1','takeaway.nu.2'],
  evidence:['morton-2018-protein','phillips-2011-protein','aragon-2013-timing'],
  myths:[
    {claim:'myth.nu.window', verdict:'myth.nu.window.v', why:'myth.nu.window.why'}
  ],
  quiz:[
    {q:'quiz.nu.q1', options:['quiz.nu.q1.a','quiz.nu.q1.b'], answer:1, explain:'quiz.nu.q1.e'}
  ],
  features:[{view:'profile',label:'feature.profile'}],
  personal:null
},
/* ------------------------------------------------------------------ 8 */
{
  id:'aging-mobility', cat:'aging-mobility', titleKey:'les.agingMobility', summaryKey:'les.agingMobility.s', mins:5, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.aging-mobility.1.h', b:'sec.aging-mobility.1.b'},
    {h:'sec.aging-mobility.2.h', b:'sec.aging-mobility.2.b'},
    {h:'sec.aging-mobility.3.h', b:'sec.aging-mobility.3.b'}
  ],
  takeaways:['takeaway.am.1','takeaway.am.2'],
  evidence:['garber-2011-quantity'],
  myths:[
    {claim:'myth.am.tooOld', verdict:'myth.am.tooOld.v', why:'myth.am.tooOld.why'}
  ],
  quiz:[
    {q:'quiz.am.q1', options:['quiz.am.q1.a','quiz.am.q1.b'], answer:1, explain:'quiz.am.q1.e'}
  ],
  features:[{view:'profile',label:'feature.profile'}],
  personal:null
},
/* ------------------------------------------------------------------ 9 */
{
  id:'training-principles', cat:'training-principles', titleKey:'les.trainingPrinciples', summaryKey:'les.trainingPrinciples.s', mins:5, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.training-principles.1.h', b:'sec.training-principles.1.b'},
    {h:'sec.training-principles.2.h', b:'sec.training-principles.2.b'},
    {h:'sec.training-principles.3.h', b:'sec.training-principles.3.b'},
    {h:'sec.training-principles.4.h', b:'sec.training-principles.4.b'}
  ],
  takeaways:['takeaway.tp.1','takeaway.tp.2','takeaway.tp.3'],
  evidence:['acsm-2009-progression','schoenfeld-2016-volume'],
  myths:[
    {claim:'myth.tp.calendar', verdict:'myth.tp.calendar.v', why:'myth.tp.calendar.why'}
  ],
  quiz:[
    {q:'quiz.tp.q1', options:['quiz.tp.q1.a','quiz.tp.q1.b','quiz.tp.q1.c'], answer:2, explain:'quiz.tp.q1.e'}
  ],
  features:[{view:'session',label:'feature.session'},{view:'progress',label:'feature.progress'}],
  personal:'overload'
},
/* ----------------------------------------------------------------- 10 */
{
  id:'scientific-literacy', cat:'literacy', titleKey:'les.literacy', summaryKey:'les.literacy.s', mins:5, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.scientific-literacy.1.h', b:'sec.scientific-literacy.1.b'},
    {h:'sec.scientific-literacy.2.h', b:'sec.scientific-literacy.2.b'},
    {h:'sec.scientific-literacy.3.h', b:'sec.scientific-literacy.3.b'},
    {h:'sec.scientific-literacy.4.h', b:'sec.scientific-literacy.4.b'}
  ],
  takeaways:['takeaway.sl.1','takeaway.sl.2'],
  evidence:['ioannidis-2005','recovery-model-note'],
  myths:[
    {claim:'myth.sl.newest', verdict:'myth.sl.newest.v', why:'myth.sl.newest.why'}
  ],
  quiz:[
    {q:'quiz.sl.q1', options:['quiz.sl.q1.a','quiz.sl.q1.b'], answer:1, explain:'quiz.sl.q1.e'}
  ],
  features:[{view:'science',label:'feature.science'}],
  personal:null
},
/* ----------------------------------------------------------------- 11 */
{
  id:'misconceptions', cat:'literacy', titleKey:'les.misconceptions', summaryKey:'les.misconceptions.s', mins:4, level:'intro', langs:['en','fr','es','de','it','nl','ar'],
  sections:[
    {h:'sec.misconceptions.1.h', b:'sec.misconceptions.1.b'},
    {h:'sec.misconceptions.2.h', b:'sec.misconceptions.2.b'},
    {h:'sec.misconceptions.3.h', b:'sec.misconceptions.3.b'}
  ],
  takeaways:['takeaway.mc.1','takeaway.mc.2'],
  evidence:['ioannidis-2005','spot-reduction-statement','aragon-2013-timing'],
  myths:[
    {claim:'myth.mc.soreness', verdict:'myth.mc.soreness.v', why:'myth.mc.soreness.why'},
    {claim:'myth.mc.tone', verdict:'myth.mc.tone.v', why:'myth.mc.tone.why'}
  ],
  quiz:[
    {q:'quiz.mc.q1', options:['quiz.mc.q1.a','quiz.mc.q1.b'], answer:0, explain:'quiz.mc.q1.e'}
  ],
  features:[{view:'science',label:'feature.science'}],
  personal:null
}
];

const LESSON_BY_ID = {};
LESSONS.forEach(l => { LESSON_BY_ID[l.id] = l; });

function lesson(id){ return LESSON_BY_ID[id] || null; }
function lessonsInCat(cat){ return LESSONS.filter(l => l.cat === cat); }
function lessonsForMuscle(m){
  // muscles map onto the lessons most likely to matter for them
  const map = {
    muscle:['muscle-growth','movement-mechanics']
  };
  return ['muscle-growth','movement-mechanics','sleep-recovery'];
}
function lessonsForExercise(exId){
  return ['movement-mechanics','training-principles'];
}

/* --------------------------------------------------- learning progress */
const ACHIEVEMENTS = [
  { id:'first-lesson',  label:'ach.firstLesson'  },
  { id:'five-lessons',  label:'ach.fiveLessons'  },
  { id:'quiz-perfect',  label:'ach.quizPerfect'  },
  { id:'explorer',      label:'ach.explorer'     },
  { id:'evidence-reader',label:'ach.evidenceReader' }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCIENCE_CATEGORIES:SCIENCE_CATEGORIES, CATEGORIES:SCIENCE_CATEGORIES, LESSONS, LESSON_BY_ID, lesson, lessonsInCat,
                     lessonsForMuscle, lessonsForExercise, ACHIEVEMENTS };
}
