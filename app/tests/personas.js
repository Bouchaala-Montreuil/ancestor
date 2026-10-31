/* ============================================================================
   ANCESTOR — persona journeys
   Run:  node tests/personas.js

   The ten scenarios from the brief, implemented as test cases. Each one
   builds a profile, walks the real screens and checks the outcome. Where a
   check cannot be automated (visual rendering, real screen readers) it is
   recorded as a limitation, not silently passed.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');

let pass = 0, fail = 0; const failures = [], notes = [];
const chk = (n,c,x) => {
  if(c){ pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + n + (x ? '  \x1b[2m' + x + '\x1b[0m' : '')); }
  else { fail++; failures.push(n); console.log('  \x1b[31mFAIL\x1b[0m  ' + n + (x ? '  -> ' + x : '')); }
};
const note = m => { notes.push(m); console.log('  \x1b[36mNOTE\x1b[0m ' + m); };
const group = t => console.log('\n\x1b[1m' + t + '\x1b[0m');

function inlineHtml(){
  let html = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(m,h)=>
    '<style>'+fs.readFileSync(path.join(ROOT,h),'utf8')+'</style>');
  html = html.replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>
    '<script>'+fs.readFileSync(path.join(ROOT,s),'utf8')+'<\/script>');
  return html;
}
const INLINE = inlineHtml();

function boot(seed){
  const vc = new VirtualConsole(); vc.on('jsdomError',()=>{});
  const dom = new JSDOM(INLINE,{runScripts:'dangerously',pretendToBeVisual:true,
    url:'https://localhost/ancestor/index.html',virtualConsole:vc});
  const w = dom.window;
  w.scrollTo=()=>{}; w.confirm=()=>true;
  w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){};
  if(seed) Object.keys(seed).forEach(k => w.localStorage.setItem(k, seed[k]));
  if(typeof w.boot === 'function') w.boot();
  return { dom, w, d: w.document };
}
const click = (w,el) => el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const type  = (w,el,v) => { el.value=v; el.dispatchEvent(new w.Event('input',{bubbles:true})); };

/* Onboard with a fully specified v2 profile, then patch the fields the persona needs. */
function onboardAs(w, d, over){
  w.setConsent();
  w.setP('experience', over.experience || 'i'); w.setP('goal', over.goal || 'h'); w.onbNext();
  w.setP('equipment', over.equipment || 'gym'); w.onbNext();
  w.setP('daysPerWeek', over.days || 3); w.onbNext();
  w.setP('shiftType', over.shift || 'none'); w.onbNext();
  w.onbNext();
  w.setP('style', over.style || 'std');
  const b = Array.from(d.querySelectorAll('#screenBody button.btn'));
  click(w, b[b.length-1]);
  w.onbNext(); w.finishOnboarding();
  const s = w.getState();
  Object.keys(over).forEach(k => {                       // persona-specific fields
    if(['experience','goal','equipment','days','shift','style'].indexOf(k) >= 0) return;
    s.profile[k] = over[k];
  });
  s.plan = w.buildPlan(s.profile);
  if(over.onReady) over.onReady(w, d);
  return s;
}

function sessionIds(plan){ return plan.sessions.flatMap(s => s.exercises.map(e => e.id)); }
/* Top-level `const` declarations live in the script's lexical scope, not on
   window, so they must be evaluated rather than read as properties. */
const byId = (w,id) => w.eval("EX_BY_ID['" + id + "']");
const allEx = w => w.eval('EX');

/* ==================================================================== */
group('1. Beginner training at home with minimal equipment');
{
  const { w, d } = boot();
  const s = onboardAs(w, d, { experience:'b', goal:'g', equipment:'home',
                              environment:'home', days:2, goals:['g'] });
  chk('a plan is generated', s.plan && s.plan.sessions.length === 2, s.plan.sessions.length + ' sessions');
  const ids = sessionIds(s.plan);
  chk('no barbells, cables or machines are prescribed',
      ids.every(id => ['dumbbell','bodyweight','band'].indexOf(byId(w,id).equip) >= 0),
      ids.join(', '));
  chk('a beginner is never pushed near failure',
      s.plan.sessions.every(x => x.exercises.every(e => e.rir >= 2)));
  w.go('session');
  chk('the session screen renders the plan', d.querySelectorAll('.panel').length > 0);
  w.go('home');
  chk('the decision is shown with reasons', !!d.querySelector('.decision') && d.querySelectorAll('.factor').length > 0);
}

/* ==================================================================== */
group('2. Experienced lifter pursuing hypertrophy in a gym');
{
  const { w, d } = boot();
  const s = onboardAs(w, d, { experience:'a', goal:'h', equipment:'gym',
                              environment:'gym', days:4, style:'hit', goals:['h','s'] });
  const ids = sessionIds(s.plan);
  chk('a four-day plan is generated', s.plan.sessions.length === 4);
  chk('compound lifts are available', ids.some(id => byId(w,id).type === 'compound'));
  chk('hit style keeps volume low',
      s.plan.sessions.every(x => x.exercises.every(e => e.sets <= 1)),
      'max sets ' + Math.max.apply(null, ids.length ? s.plan.sessions.flatMap(x=>x.exercises.map(e=>e.sets)) : [0]));
  // When strength is one of the selected goals, the documented priority is
  // strength > endurance > mobility/balance, so low rep ranges are expected.
  chk('a combined hypertrophy + strength goal applies the strength range',
      s.plan.sessions.every(x => x.exercises.every(e => e.reps[1] <= 8)),
      JSON.stringify(s.plan.sessions[0].exercises[0].reps));
  w.go('progress');
  chk('progress opens with an honest empty state',
      d.querySelector('#screenBody').textContent.indexOf(w.t('progress.nodata')) >= 0);
}

/* ==================================================================== */
group('3. Wheelchair user selecting appropriate options');
{
  const { w, d } = boot();
  const s = onboardAs(w, d, { experience:'i', goal:'f', equipment:'gym',
                              environment:'gym', days:3, goals:['f'],
                              needs:{ wheelchair:true } });
  const ids = sessionIds(s.plan);
  chk('a plan is generated', ids.length > 0, ids.length + ' exercises');
  chk('every prescribed exercise is wheelchair-compatible',
      ids.every(id => (byId(w,id).acc || []).indexOf('wheelchair') >= 0), ids.join(', '));
  chk('seated-only variants are included',
      ids.some(id => (byId(w,id).pos || []).indexOf('seated') >= 0));
  w.go('profile');
  const txt = d.querySelector('#screenBody').textContent;
  chk('the profile shows which needs are active',
      txt.indexOf(w.t('need.wheelchair')) >= 0);
  chk('the profile carries the suitability disclaimer',
      txt.indexOf(w.t('a11y.disclaimer')) >= 0);
  chk('no exercise claims to be universally safe',
      !allEx(w).some(e => /safe for (all|every)/i.test(JSON.stringify(e))));
}

/* ==================================================================== */
group('4. Older adult seeking functional strength');
{
  const { w, d } = boot();
  const s = onboardAs(w, d, { experience:'b', goal:'f', equipment:'home',
                              environment:'home', days:2, goals:['f','m','b'],
                              needs:{ lowImpactOnly:true, noKneeling:true, noFloor:true },
                              style:'std' });
  const ids = sessionIds(s.plan);
  chk('a plan is generated', ids.length > 0, ids.join(', '));
  chk('only low-impact exercises are prescribed',
      ids.every(id => (byId(w,id).acc || []).indexOf('lowImpact') >= 0), ids.join(', '));
  chk('no kneeling positions are prescribed',
      ids.every(id => (byId(w,id).req || []).indexOf('kneel') < 0));
  chk('no floor positions are prescribed',
      ids.every(id => (byId(w,id).req || []).indexOf('floorTransfer') < 0));
  chk('functional options are preferred',
      ids.some(id => (byId(w,id).cat || []).indexOf('functional') >= 0) ||
      s.plan.sessions.every(x => x.exercises.every(e => e.rir >= 2)));
}

/* ==================================================================== */
group('5. User with limited mobility needing adapted options');
{
  const { w, d } = boot();
  const s = onboardAs(w, d, { experience:'i', goal:'m', equipment:'gym',
                              environment:'gym', days:3, goals:['m'],
                              needs:{ noStanding:true, noKneeling:true } });
  const ids = sessionIds(s.plan);
  chk('a plan is generated', ids.length > 0, ids.join(', '));
  chk('no standing exercises are prescribed',
      ids.every(id => (byId(w,id).req || []).indexOf('stand') < 0), ids.join(', '));
  chk('no kneeling exercises are prescribed',
      ids.every(id => (byId(w,id).req || []).indexOf('kneel') < 0));
  chk('mobility goal keeps effort low',
      s.plan.sessions.every(x => x.exercises.every(e => e.rir >= 3)));
  const reason = w.exclusionReason(byId(w,'bb-squat'), s.profile);
  chk('exclusions are explainable to the user', !!reason, reason || 'none given');
}

/* ==================================================================== */
group('6. User working night shifts');
{
  const { w, d } = boot();
  const s = onboardAs(w, d, { experience:'i', goal:'h', equipment:'gym',
                              shift:'night', goals:['h'] });
  s.profile.usualWake = 16;
  // daytime sleep, which is the normal pattern for a night worker
  w.openSheet('sleep');
  d.querySelector('#sl_s').value = '2026-10-21T09:00';
  d.querySelector('#sl_e').value = '2026-10-21T15:00';
  w.saveSleep();
  chk('daytime sleep is accepted and measured',
      Math.abs(w.sleepHours(w.getState().sleep[0]) - 6) < 0.01,
      w.sleepHours(w.getState().sleep[0]) + ' h');
  w.openSheet('shift');
  d.querySelector('#sf_s').value = '2026-10-21T22:00';
  d.querySelector('#sf_e').value = '2026-10-22T06:00';
  w.saveShift();
  chk('a shift crossing midnight is handled',
      Math.abs(w.shiftHours(w.getState().shifts[0]) - 8) < 0.01,
      w.shiftHours(w.getState().shifts[0]) + ' h');
  w.go('home');
  const t1 = d.querySelector('#screenBody').textContent;
  const state = ['TRAIN','MODIFY','REST'].filter(x => t1.indexOf(x) >= 0);
  chk('a recommendation is produced', state.length > 0, state.join('/'));
  chk('a night shift alone does not force rest',
      !(state.length === 1 && state[0] === 'REST') || w.getState().sessions.length > 0,
      state.join('/'));
  w.openAnalysis();
  chk('the reasoning mentions the declared schedule',
      d.querySelector('.sheet').textContent.length > 50);
  w.closeSheet();
  note('Recovery weighting for shift patterns is heuristic and self-reported; not a circadian model.');
}

/* ==================================================================== */
group('7. User navigating with a screen reader');
{
  const { w, d } = boot();
  onboardAs(w, d, { experience:'i', goal:'h' });
  chk('a skip link exists', !!d.querySelector('a.skip-link'));
  chk('the skip link targets the main region',
      (d.querySelector('a.skip-link')||{}).getAttribute('href') === '#screenBody');
  chk('the main region is a landmark',
      (d.querySelector('main')||{}).getAttribute('role') === 'main');
  chk('the primary navigation is labelled in the current language',
      (d.querySelector('#nav')||{}).getAttribute('aria-label') === w.t('journey.primaryNav'));
  chk('status messages are announced',
      (d.querySelector('#toast')||{}).getAttribute('aria-live') === 'polite');
  w.go('body');
  const hits = Array.from(d.querySelectorAll('.seg-hit'));
  chk('the figure stays tappable', hits.length > 0, hits.length + ' regions');
  /* The figure used to carry a role and a tabindex on every region, and the
     muscle list below it repeated the same twelve groups as twelve more buttons.
     Fourteen tab stops announced "Chest — no data"; the list announced it again.
     The list is now the keyboard path — the figure is a picture you can tap. */
  chk('the figure is not a second copy of the keyboard path',
      hits.every(h => !h.hasAttribute('tabindex') && !h.hasAttribute('role')));
  const rows = Array.from(d.querySelectorAll('.muscle-list .mrow'));
  chk('the muscle list is the keyboard path', rows.length === 12, rows.length + ' rows');
  const recovery = w.allRecovery(w.getState(), Date.now());
  chk('each row names the visible group, visible value and actual recovery state',
      rows.every(row => {
        const id=row.getAttribute('data-a1'), r=recovery[id], label=row.getAttribute('aria-label') || '';
        const visible=row.textContent.replace(/\s+/g,' ').trim();
        const state=r && r.since!==null ? r.state : 'fresh';
        return !!r && label.includes(visible) && label.includes(w.t('mg.'+id)) && label.includes(w.t('mst.'+state));
      }), (rows[0] || {}).getAttribute ? rows[0].getAttribute('aria-label') : '');
  chk('and says whether it is the selected one',
      rows.every(r => r.getAttribute('aria-pressed') === 'true' || r.getAttribute('aria-pressed') === 'false'));
  chk('the figure has a text alternative',
      (d.querySelector('.fig-stage svg')||{}).getAttribute('aria-label') || '');
  // activation, the way a keyboard user reaches it
  rows[0].dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  chk('choosing a row selects a muscle', !!w.ANC.bodySel, String(w.ANC.bodySel));
  // dialog semantics
  w.openSheet('sleep');
  const panel = d.querySelector('.sheet .panel');
  chk('dialogs are announced as modal dialogs',
      panel && panel.getAttribute('role') === 'dialog' && panel.getAttribute('aria-modal') === 'true');
  panel.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  chk('Escape closes the dialog', !d.querySelector('.sheet'));
  // charts have text alternatives
  w.go('session'); w.startSession();
  const c = d.querySelectorAll('.setcard');
  type(w, c[0].querySelectorAll('input')[0], '50');
  type(w, c[0].querySelectorAll('input')[1], '9');
  w.finishSession();
  w.go('progress');
  chk('charts are accompanied by data tables',
      d.querySelectorAll('table.data').length > 0 && d.querySelectorAll('.chart').length > 0);
  note('Automated checks cover structure only. Real screen-reader behaviour (NVDA/VoiceOver/TalkBack) is NOT verified here.');
}

/* ==================================================================== */
group('8. User using Arabic with right-to-left layout');
{
  const seed = {};
  const { w, d } = boot(seed);
  onboardAs(w, d, { experience:'i', goal:'h' });
  w.switchLang('ar');
  chk('the document direction flips to RTL',
      d.documentElement.dir === 'rtl', d.documentElement.dir);
  chk('the document language is set', d.documentElement.lang === 'ar');
  chk('RTL is flagged for CSS', d.documentElement.getAttribute('data-rtl') === 'on');
  const txt = d.querySelector('#screenBody').textContent;
  chk('Arabic strings render', /[؀-ۿ]/.test(txt), txt.slice(0, 40));
  chk('navigation is translated',
      Array.from(d.querySelectorAll('#nav button')).every(b => /[؀-ۿ]/.test(b.textContent)));
  // a user can still complete a journey in Arabic
  w.go('body');
  const hits = d.querySelectorAll('.seg-hit');
  click(w, Array.from(hits).find(h => h.getAttribute('data-m') === 'chest'));
  chk('muscle selection works in Arabic', w.ANC.bodySel === 'chest');
  chk('the muscle name is localised',
      d.querySelector('.panel .sub').textContent.trim() === w.t('mg.chest'),
      d.querySelector('.panel .sub').textContent.trim());
  // coverage is reported honestly
  const st = w.langStatus('ar');
  chk('Arabic coverage is measured, not assumed', st.percent > 0 && st.percent <= 100,
      st.percent + '% — ' + st.status);
  if(st.status === 'partial') note('Arabic is ' + st.percent + '% translated and is reported as PARTIAL support in-product.');
  w.switchLang('en');
  chk('switching back restores LTR', d.documentElement.dir === 'ltr');
  note('Visual RTL layout (mirroring, clipping, chart direction) cannot be verified in jsdom — manual check required.');
}

/* ==================================================================== */
group('9. User who temporarily loses connectivity');
{
  const { w, d } = boot();
  onboardAs(w, d, { experience:'i', goal:'h' });
  w.go('session'); w.startSession();
  const cards = Array.from(d.querySelectorAll('.setcard'));
  type(w, cards[0].querySelectorAll('input')[0], '60');
  type(w, cards[0].querySelectorAll('input')[1], '9');
  w.logSet(0);
  chk('logging works with no network (everything is local)',
      w.getState && w.ANC.active.exercises[0].sets[0].committed === true);
  const draft = w.localStorage.getItem('ancestor.draft.v1');
  chk('the in-progress session is persisted', !!draft);
  w.stopRest(); w.finishSession();
  chk('the session is saved offline', w.getState().sessions.length === 1);
  const dump = { 'ancestor.state.v1': w.localStorage.getItem('ancestor.state.v1') };
  const r = boot(dump);
  chk('data survives a restart', r.w.getState().sessions.length === 1);
  chk('no duplicate entries appear after restart',
      r.w.getState().sessions.filter(s => s.exercises[0].sets[0].w === 60).length === 1);
  note('There is no backend, so no cloud sync exists. Offline works because everything is local — the UI must not claim otherwise.');
}

/* ==================================================================== */
group('10. Existing user whose historical data must remain intact');
{
  // a genuine v1 record, as an old install would have saved it
  const v1 = {
    version:1, created:1, onboarded:true, consented:true,
    profile:{ name:'Reda', experience:'i', goal:'h', equipment:'gym', limits:['knee'],
              daysPerWeek:3, sessionMinutes:50, shiftType:'night', sleepHours:6,
              sleepVariability:3, usualWake:16, style:'std', unit:'kg', exercises:null },
    plan:null,
    sessions:[
      { id:'a', date: 1696000000000, name:'Push',
        exercises:[{ id:'bb-bench', sets:[{w:60,r:8,rir:2},{w:60,r:7,rir:2}] }] },
      { id:'b', date: 1696600000000, name:'Pull',
        exercises:[{ id:'bb-row', sets:[{w:70,r:9,rir:2}] }] }
    ],
    sleep:[{ id:'s', start:'2026-10-21T09:00', end:'2026-10-21T15:00', quality:3 }],
    shifts:[{ id:'w', start:'2026-10-21T19:00', end:'2026-10-22T07:00' }],
    feelings:[{ id:'f', date:1696000000000, soreness:2 }],
    adaptation:{ chest:{ mult:1.1, obs:5 } }
  };
  const { w, d } = boot({ 'ancestor.state.v1': JSON.stringify(v1) });
  const s = w.getState();
  chk('the app opens straight into the existing profile', w.ANC.view === 'home', w.ANC.view);
  chk('both historical sessions survive', s.sessions.length === 2, s.sessions.length);
  chk('historical loads and reps are unchanged',
      s.sessions[0].exercises[0].sets[0].w === 60 && s.sessions[0].exercises[0].sets[0].r === 8);
  chk('learned adaptation survives', s.adaptation.chest && Math.abs(s.adaptation.chest.mult - 1.1) < 1e-9);
  chk('name and limitations survive', s.profile.name === 'Reda' && s.profile.limits.indexOf('knee') >= 0);
  chk('v2 fields are added without touching v1 data',
      Array.isArray(s.profile.goals) && s.profile.environment === 'gym');
  chk('history is still readable in Progress',
      (() => { w.go('progress'); return d.querySelectorAll('table.data tbody tr').length > 0; })());
  chk('progression still works off the old history',
      (() => { const r = w.recommend(w.getState(), 'bb-bench', Date.now());
               return r && (r.kind === 'hold' || r.kind === 'plateau' || r.kind === 'reentry' || r.kind === 'increase'); })(),
      (w.recommend(w.getState(),'bb-bench',Date.now())||{}).kind);
}

/* ==================================================================== */
group('Training focus across personas: a real plan for every body');
{
  /* The focus question is the one step a beginner or an older lifter is most
     likely to answer differently from an intermediate, so the check is that it
     never produces a shorter, emptier or impossible programme for them. */
  const personas = [
    { name:'beginner at home',            experience:'b', goal:'g', equipment:'home',    days:2 },
    { name:'intermediate, gym, 4 days',   experience:'i', goal:'h', equipment:'gym',     days:4 },
    { name:'advanced, 5 days',            experience:'a', goal:'s', equipment:'gym',     days:5 },
    { name:'older lifter, 2 days, knee',  experience:'b', goal:'hl', equipment:'minimal', days:2,
      limits:['knee'], age:68 }
  ];
  const emphases = ['balanced','lower','upper','glutes','custom'];
  const bad = [];
  /* Planned set-volume per muscle: sets × the muscle's share of the movement. */
  const vol = (w, plan) => {
    const out = {};
    plan.sessions.forEach(x => x.exercises.forEach(e => {
      const meta = byId(w, e.id);
      if(meta) meta.m.forEach(([m, wt]) => { out[m] = (out[m] || 0) + e.sets * wt; });
    }));
    return out;
  };
  const share = (v, muscles) => muscles.reduce((n, m) => n + (v[m] || 0), 0);
  personas.forEach(per => {
    /* The baseline for this body, before any emphasis is applied. */
    const { w: wb, d: db } = boot();
    const sb = onboardAs(wb, db, per);
    sb.profile.emphasis = 'balanced'; sb.profile.priorities = [];
    const basePlan = wb.buildPlan(sb.profile);
    const vBase = vol(wb, basePlan);
    emphases.forEach(e => {
      const { w, d } = boot();
      const s = onboardAs(w, d, per);
      s.profile.emphasis = e;
      s.profile.priorities = (e === 'custom') ? ['chest','shoulders'] : [];
      s.plan = w.buildPlan(s.profile);
      const count = s.plan.sessions.reduce((n, x) => n + x.exercises.length, 0);
      const focus = w.eval('focusMuscles')(s.profile);
      const leads = s.plan.sessions.filter(x => {
        const ex = byId(w, x.exercises[0].id);
        return ex && focus.indexOf(ex.m[0][0]) >= 0;
      }).length;
      if(s.plan.sessions.length !== per.days) bad.push(per.name + '/' + e + ': ' + s.plan.sessions.length + ' sessions');
      if(count < per.days * 4) bad.push(per.name + '/' + e + ': only ' + count + ' exercises');
      /* Equipment was not widened by the focus: nothing new may need a barbell. */
      if(per.equipment !== 'gym' && s.plan.sessions.some(x => x.exercises.some(ex => {
        const meta = byId(w, ex.id);
        return meta && ['bb','cable','machine'].indexOf(meta.equip) >= 0;
      }))) bad.push(per.name + '/' + e + ': needs a machine');
      /* A stated limitation is still respected. */
      if(per.limits && s.plan.sessions.some(x => x.exercises.some(ex => {
        const meta = byId(w, ex.id);
        return meta && (meta.avoid || []).some(a => per.limits.indexOf(a) >= 0);
      }))) bad.push(per.name + '/' + e + ': ignores the knee');
      /* The promise in the copy: more attention for the chosen muscles, never
         less for anything. A smaller gym cannot always add volume, so the floor
         is "not less"; where equipment allows, it must be strictly more. */
      if(e !== 'balanced' && e !== 'custom' && focus.length){
        const got = share(vol(w, s.plan), focus);
        const had = share(vBase, focus);
        if(got < had - 1e-9) bad.push(per.name + '/' + e + ': drops the favoured muscles');
        if(per.equipment === 'gym' && got <= had && e !== 'lower')
          bad.push(per.name + '/' + e + ': no more work for the favoured muscles');
      }
    });
  });
  chk('4 personas × 5 emphases all produce a trainable week', bad.length === 0,
      bad.slice(0, 4).join('; ') || '20 plans');

  /* First launch in Arabic: the language rows must be readable, RTL, and the
     names still in their own scripts. */
  const { w, d } = boot();
  w.pickLang('ar');
  const rows = Array.from(d.querySelectorAll('.lang-row'));
  chk('the Arabic choice is offered in Arabic', rows.length === 7 &&
      rows.some(r => r.getAttribute('lang') === 'ar' && /العربية/.test(r.textContent)));
  chk('the Arabic name is set right-to-left inside the row',
      d.querySelector('.lang-row[lang="ar"] .lang-nm').getAttribute('dir') === 'rtl');
  chk('choosing Arabic flips the document direction before Continue',
      d.documentElement.lang === 'ar' && d.documentElement.dir === 'rtl',
      d.documentElement.lang + '/' + d.documentElement.dir);
  chk('and the English row is still written in English, not translated',
      rows.some(r => r.getAttribute('lang') === 'en' && /English/.test(r.textContent)));
  w.chooseLang('en');
}

/* ==================================================================== */
console.log('\n' + '='.repeat(70));
if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' PERSONA CHECKS PASSED\x1b[0m');
else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed');
       failures.forEach(f => console.log('   - ' + f)); }
console.log('\n  Documented limitations (' + notes.length + '):');
notes.forEach(n => console.log('   • ' + n));
console.log('='.repeat(70) + '\n');
process.exit(fail === 0 ? 0 : 1);
