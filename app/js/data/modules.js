/* ============================================================================
   ANCESTOR — interactive learning modules

   Two guided, visual explanations:

     A. How muscle grows          (five stages)
     B. How energy balance works  (five linked concepts)

   Rules these modules follow:

   · Every claim is either attached to a real evidence record in
     js/data/evidence.js, or explicitly labelled as a model statement that is
     not a research finding. Nothing is cited that does not exist.

   · The same three-way distinction the rest of the app uses is kept here:
       principle   — a general research finding, sourced
       model       — a simplification used to explain, NOT a research finding
       observation — something from the user's own log

   · No rate promises. Muscle growth is described as slow, cumulative and
     highly variable between individuals. Fat loss is never given a rate,
     and the modules state plainly that fat cannot be removed from one
     region by training that region.

   · The energy-balance interactive uses numbers the user chooses. It is
     labelled as a teaching model, never as the user's own data.
   ========================================================================== */

const LEARNING_MODULES = [
  {
    id: 'muscle-growth',
    titleKey: 'modA.title',
    summaryKey: 'modA.summary',
    caveatKey: 'modA.caveat',
    evidence: ['wackerhage-2019-stimuli','damas-2018-hypertrophy','morton-2018-protein',
               'phillips-2011-protein','aragon-2013-timing','acsm-2009-progression',
               'schoenfeld-2017-load','schoenfeld-2016-volume'],
    steps: [
      {
        id: 'stimulus',
        labelKey: 'modA.s1.label',
        titleKey: 'modA.s1.title',
        bodyKey: 'modA.s1.body',
        diagram: 'stimulus',
        claim: { kind: 'principle', evidence: ['wackerhage-2019-stimuli'] }
      },
      {
        id: 'turnover',
        labelKey: 'modA.s2.label',
        titleKey: 'modA.s2.title',
        bodyKey: 'modA.s2.body',
        diagram: 'turnover',
        claim: { kind: 'principle', evidence: ['damas-2018-hypertrophy'] }
      },
      {
        id: 'nutrition',
        labelKey: 'modA.s3.label',
        titleKey: 'modA.s3.title',
        bodyKey: 'modA.s3.body',
        diagram: 'nutrition',
        claim: { kind: 'principle',
                 evidence: ['morton-2018-protein','phillips-2011-protein',
                            'aragon-2013-timing','watson-2015-sleep'] }
      },
      {
        id: 'overload',
        labelKey: 'modA.s4.label',
        titleKey: 'modA.s4.title',
        bodyKey: 'modA.s4.body',
        diagram: 'overload',
        claim: { kind: 'principle', evidence: ['acsm-2009-progression','schoenfeld-2017-load'] }
      },
      {
        id: 'longterm',
        labelKey: 'modA.s5.label',
        titleKey: 'modA.s5.title',
        bodyKey: 'modA.s5.body',
        diagram: 'longterm',
        claim: { kind: 'principle', evidence: ['schoenfeld-2016-volume','damas-2018-hypertrophy'] }
      }
    ]
  },
  {
    id: 'energy-balance',
    titleKey: 'modB.title',
    summaryKey: 'modB.summary',
    caveatKey: 'modB.caveat',
    evidence: ['spot-reduction-statement','morton-2018-protein','garber-2011-quantity'],
    interactive: 'energy',
    steps: [
      {
        id: 'intake',
        labelKey: 'modB.s1.label',
        titleKey: 'modB.s1.title',
        bodyKey: 'modB.s1.body',
        diagram: 'intake',
        claim: { kind: 'model', note: 'mod.modelNote' }
      },
      {
        id: 'expenditure',
        labelKey: 'modB.s2.label',
        titleKey: 'modB.s2.title',
        bodyKey: 'modB.s2.body',
        diagram: 'expenditure',
        claim: { kind: 'model', note: 'mod.modelNote' }
      },
      {
        id: 'stored',
        labelKey: 'modB.s3.label',
        titleKey: 'modB.s3.title',
        bodyKey: 'modB.s3.body',
        diagram: 'stored',
        claim: { kind: 'model', note: 'mod.modelNote' }
      },
      {
        id: 'fluctuation',
        labelKey: 'modB.s4.label',
        titleKey: 'modB.s4.title',
        bodyKey: 'modB.s4.body',
        diagram: 'fluctuation',
        claim: { kind: 'model', note: 'mod.modelNote' }
      },
      {
        id: 'composition',
        labelKey: 'modB.s5.label',
        titleKey: 'modB.s5.title',
        bodyKey: 'modB.s5.body',
        diagram: 'composition',
        claim: { kind: 'principle', evidence: ['spot-reduction-statement','morton-2018-protein'] }
      }
    ]
  },
  {
    id: 'adaptation-recovery',
    titleKey: 'modC.title',
    summaryKey: 'modC.summary',
    caveatKey: 'modC.caveat',
    evidence: ['acsm-2009-progression','schoenfeld-2016-volume','schoenfeld-2017-load',
               'garber-2011-quantity','watson-2015-sleep','suchomel-2016','recovery-model-note'],
    interactive: 'recovery',
    steps: [
      {
        id: 'prog',
        labelKey: 'modC.s1.label',
        titleKey: 'modC.s1.title',
        bodyKey: 'modC.s1.body',
        diagram: 'prog',
        claim: { kind: 'principle', evidence: ['acsm-2009-progression','schoenfeld-2017-load'] }
      },
      {
        id: 'volume',
        labelKey: 'modC.s2.label',
        titleKey: 'modC.s2.title',
        bodyKey: 'modC.s2.body',
        diagram: 'volume',
        claim: { kind: 'principle', evidence: ['schoenfeld-2016-volume','garber-2011-quantity'] }
      },
      {
        id: 'effort',
        labelKey: 'modC.s3.label',
        titleKey: 'modC.s3.title',
        bodyKey: 'modC.s3.body',
        diagram: 'effort',
        claim: { kind: 'principle', evidence: ['schoenfeld-2017-load','suchomel-2016'] }
      },
      {
        id: 'recmodel',
        labelKey: 'modC.s4.label',
        titleKey: 'modC.s4.title',
        bodyKey: 'modC.s4.body',
        diagram: 'recmodel',
        claim: { kind: 'model', note: 'mod.modelNote' }
      },
      {
        id: 'decision',
        labelKey: 'modC.s5.label',
        titleKey: 'modC.s5.title',
        bodyKey: 'modC.s5.body',
        diagram: 'decision',
        claim: { kind: 'principle', evidence: ['watson-2015-sleep','recovery-model-note'] }
      }
    ]
  }
];

function moduleById(id){ return LEARNING_MODULES.filter(m => m.id === id)[0] || null; }
function moduleStep(mod, stepId){
  if(!mod) return null;
  return mod.steps.filter(s => s.id === stepId)[0] || null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEARNING_MODULES, moduleById, moduleStep };
}
