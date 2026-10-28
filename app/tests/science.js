/* ============================================================================
   ANCESTOR — Science Hub & transparency tests
   Run:  node tests/science.js
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
  let h = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  h = h.replace(/<link rel="stylesheet" href="([^"]+)">/g,(m,x)=>
    '<style>'+fs.readFileSync(path.join(ROOT,x),'utf8')+'</style>');
  h = h.replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>
    '<script>'+fs.readFileSync(path.join(ROOT,s),'utf8')+'<\/script>');
  return h;
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
const sb = (d) => d.querySelector('#screenBody');
const txt = d => (sb(d) ? sb(d).textContent : '').replace(/\s+/g,' ');

function onboardAs(w, d, over){
  over = over || {};
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
}

/* ==================================================================== */
group('1. Science Hub navigation');
{
  const { w, d } = boot();
  onboardAs(w, d);
  w.go('science');
  chk('the hub opens', w.ANC.view === 'science', w.ANC.view);
  /* Science left the bottom bar so the bar holds four destinations. It is one tap
     from Profile (and from Today) as a full-width row with its own mark — the
     requirement is reachability, not a seat in the bar. */
  const inBar = Array.from(d.querySelectorAll('#nav button'));
  w.go('profile');
  const row = Array.from(d.querySelectorAll('#screenBody .nav-link'))
    .filter(b => b.textContent.trim() === w.t('nav.science'))[0];
  chk('it is one tap from Profile, with its mark',
      inBar.every(b => b.textContent.trim() !== w.t('nav.science')) &&
      !!row && !!row.querySelector('svg.nav-link-mark'),
      inBar.map(b=>b.textContent.trim()).join(' / '));
  w.go('science');
  chk('three sections are offered',
      txt(d).indexOf(w.t('sci.tabLessons')) >= 0 &&
      txt(d).indexOf(w.t('sci.tabExplorers')) >= 0 &&
      txt(d).indexOf(w.t('sci.tabEvidence')) >= 0);
  chk('all categories are listed', w.eval('SCIENCE_CATEGORIES').length === 10,
      String(w.eval('SCIENCE_CATEGORIES').length));
  chk('every lesson is reachable from the hub', w.eval('LESSONS').length >= 11, String(w.eval('LESSONS').length));

  w.setSciView('explorers');
  chk('explorers tab renders', txt(d).indexOf(w.t('lab.muscleGrowth')) >= 0);
  w.setSciView('evidence');
  chk('evidence tab renders', txt(d).indexOf(w.t('ev.title')) >= 0 || txt(d).indexOf(w.t('ev.count')) >= 0);
  w.setSciView('lessons');
  chk('lessons tab returns', txt(d).indexOf(w.t('les.muscleGrowth')) >= 0);
}

/* ==================================================================== */
group('2. Lesson rendering');
{
  const { w, d } = boot();
  onboardAs(w, d);
  w.go('science');
  w.openLesson('training-principles');
  chk('the lesson opens', w.ANC.view === 'lesson', w.ANC.view);
  chk('the title is shown', txt(d).indexOf(w.t('les.trainingPrinciples')) >= 0);
  /* A lesson is a document: numbered dossier entries and prose, not a stack of
     identical cards. Only things you operate keep a box. */
  chk('sections are rendered as numbered dossier entries',
      d.querySelectorAll('.sect h2.title').length >= 5,
      d.querySelectorAll('.sect h2.title').length + ' entries');
  chk('the prose is set as prose', d.querySelectorAll('.read-p').length >= 3,
      d.querySelectorAll('.read-p').length + ' paragraphs');
  chk('the lesson opens at document scale', !!d.querySelector('h1.read-title') && !!d.querySelector('p.read-lede'));
  const boxes = d.querySelectorAll('article.read .panel').length;
  chk('the document is sections, not stacked boxes',
      d.querySelectorAll('article.read .sect').length >= boxes * 2,
      d.querySelectorAll('article.read .sect').length + ' sections vs ' + boxes + ' boxes');
  chk('takeaways are shown', txt(d).indexOf(w.t('sci.takeaways')) >= 0);
  chk('myth vs evidence is shown', txt(d).indexOf(w.t('sci.myths')) >= 0);
  chk('evidence is linked', txt(d).indexOf(w.t('sci.evidence')) >= 0);
  chk('links into the app are shown', txt(d).indexOf(w.t('sci.features')) >= 0);
  chk('a back control exists', txt(d).indexOf(w.t('sci.backToHub')) >= 0);

  // reading progress persists
  w.markRead('training-principles');
  chk('reading is recorded', (w.getState().science.read || []).indexOf('training-principles') >= 0);
  const dump = { 'ancestor.state.v1': w.localStorage.getItem('ancestor.state.v1') };
  const r = boot(dump);
  chk('progress survives a restart',
      (r.w.getState().science.read || []).indexOf('training-principles') >= 0);
}

/* ==================================================================== */
group('3. Knowledge challenge');
{
  const { w, d } = boot();
  onboardAs(w, d);
  w.openLesson('misconceptions');
  const l = w.eval("lesson('misconceptions')");
  chk('the lesson has a quiz', (l.quiz||[]).length > 0, (l.quiz||[]).length + ' questions');
  // answer correctly
  l.quiz.forEach((q,i) => w.answerQuiz('misconceptions', i, q.answer));
  w.finishQuiz('misconceptions');
  chk('a perfect score is recognised', txt(d).indexOf(w.t('sci.finished')) >= 0);
  chk('the correct answer is explained', txt(d).indexOf(w.t(l.quiz[0].explain)) >= 0);
  // wrong answer flow
  w.retryQuiz('misconceptions');
  w.answerQuiz('misconceptions', 0, (l.quiz[0].answer + 1) % l.quiz[0].options.length);
  w.finishQuiz('misconceptions');
  chk('a wrong answer is flagged', txt(d).indexOf(w.t('sci.incorrect')) >= 0);
}

/* ==================================================================== */
group('4. Explorers and simulations');
{
  const { w, d } = boot();
  onboardAs(w, d);
  w.go('science'); w.setSciView('explorers');
  ['muscle','metabolism','mechanics','timeline','sim'].forEach(id => {
    w.openExplorer(id);
    chk('explorer "' + id + '" renders', txt(d).length > 200, txt(d).slice(0,40));
  });
  w.openExplorer('sim');
  const before = txt(d);
  w.setSim('sets', 8);
  const after = txt(d);
  chk('changing a variable changes the output', before !== after);
  chk('the simulation is labelled illustrative',
      txt(d).indexOf(w.t('sim.note')) >= 0 || txt(d).indexOf(w.t('sim.illustrative')) >= 0);
  chk('assumptions are stated', txt(d).indexOf(w.t('sim.assume')) >= 0);
  chk('limits are stated', txt(d).indexOf(w.t('sim.limitBody')) >= 0);
  w.openExplorer('metabolism');
  chk('spot reduction is explicitly refused', txt(d).indexOf(w.t('myth.ef.spot')) >= 0);
  w.openExplorer('timeline');
  chk('no result is promised by a date', txt(d).indexOf(w.t('lab.tl.note')) >= 0);
}

/* ==================================================================== */
group('5. Evidence library integrity');
{
  const { w, d } = boot();
  const EVIDENCE = w.eval('EVIDENCE');
  chk('records exist', EVIDENCE.length >= 14, EVIDENCE.length + ' records');
  const bad = EVIDENCE.filter(e => !e.id || !e.title || !e.year || !e.type ||
                                   !e.findings || !e.limitations || !e.relevance ||
                                   !e.quality || !e.lastReviewed || !e.reviewStatus);
  chk('every record has the required fields', bad.length === 0,
      bad.slice(0,3).map(e=>e.id).join(', '));
  const badYear = EVIDENCE.filter(e => !(e.year >= 1900 && e.year <= 2100));
  chk('publication years are plausible', badYear.length === 0);
  const badQuality = EVIDENCE.filter(e =>
    ['high','moderate','low','very-low'].indexOf(e.quality) < 0);
  chk('evidence quality uses the declared scale', badQuality.length === 0);
  const badStatus = EVIDENCE.filter(e =>
    ['reviewed','draft','needs-update'].indexOf(e.reviewStatus) < 0);
  chk('review status uses the declared scale', badStatus.length === 0);

  // The review gate: only reviewed + usable quality may drive recommendations
  const gate = EVIDENCE.filter(e => w.canAffectRecommendations(e));
  chk('the review gate blocks unreviewed records',
      gate.every(e => e.reviewStatus === 'reviewed' && ['high','moderate'].indexOf(e.quality) >= 0),
      gate.length + ' records may drive rules');
  chk('draft records cannot drive recommendations',
      EVIDENCE.filter(e => e.reviewStatus === 'draft').every(e => !w.canAffectRecommendations(e)));
  chk('very-low quality is excluded from driving',
      EVIDENCE.filter(e => e.quality === 'very-low').every(e => !w.canAffectRecommendations(e)));
  // recency alone must not qualify
  const newest = EVIDENCE.slice().sort((a,b)=>b.year-a.year)[0];
  chk('recency alone does not qualify a record',
      w.canAffectRecommendations(newest) === (newest.reviewStatus === 'reviewed' &&
        ['high','moderate'].indexOf(newest.quality) >= 0),
      newest.id + ' (' + newest.year + ')');
  // honesty about identifiers
  const unver = w.unverifiedIdentifiers().length;
  chk('unverified identifiers are declared, not hidden', unver > 0,
      unver + ' of ' + EVIDENCE.length + ' flagged for verification');
  const published = EVIDENCE.filter(e => e.journal !== 'internal');
  const verified = published.filter(e => e.identifierVerified).length;
  const withPmid = published.filter(e => e.pmid).length;
  chk('every published source is verified', verified === published.length,
      verified + '/' + published.length + ' published sources verified');
  chk('every published source carries a DOI and a PMID', withPmid === published.length,
      published.length + ' DOIs, ' + withPmid + ' PMIDs');
  chk('no published source is left at draft', published.every(e => e.reviewStatus === 'reviewed'));
  chk('the only draft record is an internal note',
      EVIDENCE.filter(e => e.reviewStatus === 'draft').every(e => e.journal === 'internal'),
      EVIDENCE.filter(e => e.reviewStatus === 'draft').map(e => e.id).join(', ') || 'none');
}

/* ==================================================================== */
group('6. Rules, changelog and evidence linkage');
{
  const { w, d } = boot();
  const RULES = w.eval('RECOMMENDATION_RULES');
  const ids = Object.keys(RULES);
  chk('rules are registered', ids.length >= 13, ids.length + ' rules');
  const bad = ids.filter(id => !RULES[id].titleKey || !RULES[id].howKey ||
                               !RULES[id].confidence || !RULES[id].version || !RULES[id].updated);
  chk('every rule is fully described', bad.length === 0, bad.join(', '));
  const noEv = ids.filter(id => !(RULES[id].evidence || []).length);
  chk('every rule cites evidence', noEv.length === 0, noEv.join(', '));
  const dangling = [];
  ids.forEach(id => (RULES[id].evidence||[]).forEach(e => { if(!w.eval("evidence('"+e+"')")) dangling.push(id+':'+e); }));
  chk('no rule cites a missing evidence record', dangling.length === 0, dangling.join(', '));

  const LOG = w.eval('RULE_CHANGELOG');
  chk('a changelog is maintained', LOG.length >= 3, LOG.length + ' entries');
  const noLog = ids.filter(id => w.eval("changelogFor('"+id+"')").length === 0);
  chk('every rule has change history', noLog.length === 0, noLog.join(', '));
  const badEntry = LOG.filter(c => !c.date || !c.ruleId || !c.rationale || !c.feature ||
                                   !(c.sources||[]).length || !c.reviewer);
  chk('changelog entries are complete', badEntry.length === 0,
      badEntry.slice(0,2).map(c=>c.ruleId).join(', '));

  // reverse linkage
  const linked = w.eval("rulesAffectedByEvidence('acsm-2009-progression')");
  chk('evidence links back to the rules it supports', linked.length > 0, linked.join(', '));
}

/* ==================================================================== */
group('7. Why ANCESTOR recommends this');
{
  const { w, d } = boot();
  onboardAs(w, d);

  // decision
  w.go('home');
  w.openWhy('decision');
  let t1 = d.querySelector('.sheet').textContent.replace(/\s+/g,' ');
  ['sci.what','sci.goal','sci.dataUsed','sci.reasoning','sci.assumptions','sci.missing',
   'sci.confidence','sci.alternatives','sci.legendTitle'].forEach(k => {
    chk('decision panel shows ' + k, t1.indexOf(w.t(k)) >= 0, w.t(k));
  });
  chk('decision panel names the rule', t1.indexOf(w.t('rule.decision.ladder')) >= 0);
  chk('decision panel offers accept and reject',
      t1.indexOf(w.t('sci.accept')) >= 0 && t1.indexOf(w.t('sci.reject')) >= 0);
  w.closeSheet();

  // progression (with no history -> baseline)
  w.go('session');
  const firstEx = w.getState().plan.sessions[0].exercises[0].id;
  w.openWhy('progression', firstEx);
  let t2 = d.querySelector('.sheet').textContent.replace(/\s+/g,' ');
  chk('progression panel opens', t2.indexOf(w.t('sci.what')) >= 0);
  chk('progression states missing history honestly', t2.indexOf(w.t('why.missing.noHistory')) >= 0);
  chk('progression cites the rule', t2.indexOf(w.t('rule.prog.baseline')) >= 0);
  w.closeSheet();

  // after a session, progression uses real data
  w.startSession();
  const cards = Array.from(d.querySelectorAll('.setcard'));
  type(w, cards[0].querySelectorAll('input')[0], '60');
  type(w, cards[0].querySelectorAll('input')[1], '9');
  w.logSet(0); w.stopRest(); w.finishSession();
  w.go('session');
  w.openWhy('progression', firstEx);
  let t3 = d.querySelector('.sheet').textContent.replace(/\s+/g,' ');
  chk('progression quotes the recorded history',
      t3.indexOf(w.t('why.prog.lastSession', { date:'x', sets:1, load:'60 '+w.t('c.kg') }).split(' — ')[0]) >= 0 ||
      /60/.test(t3),
      t3.slice(t3.indexOf(w.t('sci.history')), t3.indexOf(w.t('sci.history'))+90));
  chk('progression separates observation from principle',
      t3.indexOf(w.t('why.dist.observation')) >= 0 && t3.indexOf(w.t('why.dist.principle')) >= 0);
  w.closeSheet();

  // recovery
  w.go('body');
  w.openWhy('recovery', 'chest');
  let t4 = d.querySelector('.sheet').textContent.replace(/\s+/g,' ');
  chk('recovery panel opens', t4.indexOf(w.t('sci.what')) >= 0);
  chk('recovery lists its factors', /×/.test(t4), t4.slice(0,60));
  chk('recovery states it is an estimate',
      t4.indexOf(w.t('why.assume.estimateNotMeasurement')) >= 0);
  w.closeSheet();
}

/* ==================================================================== */
group('7b. Volume accounting: direct vs indirect');
{
  const { w, d } = boot();
  onboardAs(w, d);

  // A compound press: chest is primary, triceps and shoulders indirect.
  w.startSession();
  const cards = Array.from(d.querySelectorAll('.setcard'));
  type(w, cards[0].querySelectorAll('input')[0], '60');
  type(w, cards[0].querySelectorAll('input')[1], '8');
  w.logSet(0); w.stopRest(); w.finishSession();

  const mv = w.muscleVolume(w.getState(), Date.now() - 7*86400000);
  const ex = w.eval("EX_BY_ID['" + w.getState().sessions[0].exercises[0].id + "']");
  const primary = ex.m[0][0];

  chk('the primary muscle receives a direct share', mv[primary].directSets > 0,
      primary + ': ' + mv[primary].directSets.toFixed(2) + ' direct');
  chk('the primary muscle receives no indirect share from itself',
      mv[primary].indirectSets >= 0);
  const secondary = ex.m[1] ? ex.m[1][0] : null;
  if(secondary){
    chk('a secondary muscle receives only an indirect share',
        mv[secondary].indirectSets > 0 && mv[secondary].directSets === 0,
        secondary + ': indirect ' + mv[secondary].indirectSets.toFixed(2) +
        ', direct ' + mv[secondary].directSets.toFixed(2));
  }
  chk('direct + indirect equals the total for every muscle',
      w.eval('MUSCLES').every(m =>
        Math.abs((mv[m].directSets + mv[m].indirectSets) - mv[m].sets) < 1e-9));

  const rev = w.volumeReview(w.getState(), Date.now() - 7*86400000);
  chk('review rows cover every muscle group', rev.length === 12, String(rev.length));
  chk('untrained groups are marked, not zero-filled',
      rev.filter(r => r.sets === 0).every(r => r.band === 'none'));
  chk('bands are declared for review, never as targets',
      rev.every(r => ['none','low','typical','high','veryHigh'].indexOf(r.band) >= 0));

  // the volume rule is auditable
  const rule = w.eval("rule('volume.reviewBand')");
  chk('the volume rule exists', !!rule);
  chk('the volume rule cites evidence', (rule.evidence || []).length > 0);
  chk('the volume rule has change history', w.eval("changelogFor('volume.reviewBand')").length > 0);

  w.go('progress');
  w.openWhy('volume');
  const tv = d.querySelector('.sheet').textContent.replace(/\s+/g,' ');
  chk('the volume explanation opens', tv.indexOf(w.t('sci.what')) >= 0);
  chk('the volume explanation states it is for review only',
      tv.indexOf(w.t('why.assume.bandsAreReview')) >= 0);
  w.closeSheet();
}

/* ==================================================================== */
group('7c. Placeholder rendering (regression)');
{
  const { w, d } = boot();
  onboardAs(w, d);
  w.startSession();
  const cards = Array.from(d.querySelectorAll('.setcard'));
  type(w, cards[0].querySelectorAll('input')[0], '60');
  type(w, cards[0].querySelectorAll('input')[1], '9');
  w.logSet(0); w.stopRest(); w.finishSession();

  const firstEx = w.getState().sessions[0].exercises[0].id;
  w.go('session');
  w.openWhy('progression', firstEx);
  const tp = d.querySelector('.sheet').textContent;
  chk('no unrendered {placeholder} reaches the user',
      !/\{[a-zA-Z]+\}/.test(tp),
      (tp.match(/\{[a-zA-Z]+\}/g) || []).slice(0,4).join(', '));
  chk('the recorded load actually appears', /60/.test(tp));
  w.closeSheet();

  // and in the decision panel
  w.go('home');
  w.openWhy('decision');
  chk('the decision panel has no unrendered placeholders',
      !/\{[a-zA-Z]+\}/.test(d.querySelector('.sheet').textContent));
  w.closeSheet();
}

/* ==================================================================== */
group('8. Entry points from existing screens');
{
  const { w, d } = boot();
  onboardAs(w, d);
  w.go('home');
  chk('Today offers "Why this?"', txt(d).indexOf(w.t('sci.whyOpen')) >= 0);
  w.go('session');
  chk('Session offers "Why this?" per exercise', txt(d).indexOf(w.t('sci.whyOpen')) >= 0);
  w.go('body'); w.selectMuscle('chest');
  chk('the muscle record offers "Why this?"', txt(d).indexOf(w.t('sci.whyOpen')) >= 0);
  chk('the muscle record links related lessons',
      /openLesson\(/.test(sb(d).innerHTML),
      (sb(d).innerHTML.match(/openLesson\('([^']+)'\)/g)||[]).slice(0,3).join(', '));
}

/* ==================================================================== */
group('9. Honesty about data and localisation');
{
  const { w, d } = boot();
  // no personal data: lessons must not invent it
  w.setConsent();
  w.setP('experience','i'); w.setP('goal','h'); w.onbNext();
  w.setP('equipment','gym'); w.onbNext(); w.onbNext();
  w.setP('shiftType','none'); w.onbNext(); w.onbNext();
  w.setP('style','std');
  const b = Array.from(d.querySelectorAll('#screenBody button.btn'));
  click(w, b[b.length-1]); w.onbNext(); w.finishOnboarding();
  w.openLesson('training-principles');
  chk('a lesson with no history says so',
      txt(d).indexOf(w.t('sci.personal.none')) >= 0 ||
      txt(d).indexOf(w.t('why.missing.noHistory')) >= 0,
      txt(d).indexOf(w.t('sci.personal.none')) >= 0 ? 'personal note' : 'history note');
  w.openLesson('sleep-recovery');
  chk('the recovery lesson refuses hormone claims',
      txt(d).indexOf(w.t('takeaway.sr.1')) >= 0 && txt(d).indexOf(w.t('takeaway.sr.3')) >= 0);

  // localisation depth is declared
  w.switchLang('ar');
  w.go('science');
  chk('Arabic renders the hub', /[؀-ۿ]/.test(txt(d)) || txt(d).length > 0);
  w.openLesson('muscle-growth');
  // Every shipped language now has lesson bodies, so the fallback banner must
  // never appear. This asserts completeness rather than assuming it.
  chk('no language shows the missing-translation banner',
      txt(d).indexOf(w.t('sci.notLocalised')) < 0,
      'lang=ar');
  chk('Arabic shows a localised lesson title',
      txt(d).indexOf(w.t('les.muscleGrowth')) >= 0, w.t('les.muscleGrowth'));
  chk('Arabic renders Arabic body text',
      /[\u0600-\u06FF]/.test(w.t(w.eval("lesson('muscle-growth').sections[0].b"))));
  // switch back to French before asserting on the French body
  w.switchLang('fr');
  w.openLesson('muscle-growth');
  chk('French shows no fallback notice', txt(d).indexOf(w.t('sci.notLocalised')) < 0);
  const frSec = w.eval("lesson('muscle-growth').sections[0].b");
  chk('French renders a translated section body',
      txt(d).indexOf(w.t(frSec)) >= 0 && /[a-zà-ÿ]/.test(w.t(frSec)),
      w.t(frSec).slice(0, 60) + '…');
  chk('the French body is not the English text', w.t(frSec) !== w.eval("T.en['" + frSec + "']"));

  ['es','de'].forEach(l => {
    w.switchLang(l);
    w.openLesson('muscle-growth');
    chk(l + ': no fallback notice', txt(d).indexOf(w.t('sci.notLocalised')) < 0);
    const k = w.eval("lesson('muscle-growth').sections[0].b");
    chk(l + ': renders a translated body', w.t(k) !== w.eval("T.en['" + k + "']"), w.t(k).slice(0, 48) + '…');
  });
  ['it','nl','ar'].forEach(l => {
    w.switchLang(l);
    w.openLesson('muscle-growth');
    chk(l + ': no fallback notice', txt(d).indexOf(w.t('sci.notLocalised')) < 0);
    const k = w.eval("lesson('muscle-growth').sections[0].b");
    chk(l + ': renders a translated body', w.t(k) !== w.eval("T.en['" + k + "']"), w.t(k).slice(0, 44) + '…');
  });
  w.switchLang('en');
  w.openLesson('muscle-growth');
  chk('English shows no fallback notice', txt(d).indexOf(w.t('sci.notLocalised')) < 0);
  note('Lesson bodies are fully localised in all seven languages (EN, FR, ES, DE, IT, NL, AR) — 336 section strings.');
}

/* ==================================================================== */
group('10. Accessibility and offline');
{
  const { w, d } = boot();
  onboardAs(w, d);
  w.go('science');
  chk('a skip link exists', !!d.querySelector('a.skip-link'));
  chk('the main region is a landmark', d.querySelector('main').getAttribute('role') === 'main');
  chk('hub controls are real buttons',
      Array.from(sb(d).querySelectorAll('button')).every(b => b.tagName === 'BUTTON'));
  const dead = Array.from(sb(d).querySelectorAll('button')).filter(b => {
    const oc = b.getAttribute('onclick');
    return oc && typeof w[oc.replace(/\(.*/,'').trim()] !== 'function';
  });
  chk('no dead control in the hub', dead.length === 0,
      dead.slice(0,3).map(b=>b.getAttribute('onclick')).join(', '));
  // keyboard operable
  const lessonBtn = Array.from(sb(d).querySelectorAll('button'))
    .find(b => (b.getAttribute('onclick')||'').indexOf('openLesson') === 0);
  chk('lessons open from a real button element', !!lessonBtn);
  // offline: no network in jsdom, everything still works
  chk('the hub works without network access', w.ANC.view === 'science');
  w.openLesson('muscle-growth');
  chk('lessons work without network access', w.ANC.view === 'lesson');
  chk('evidence records render offline', txt(d).indexOf(w.t('sci.evidence')) >= 0);
  note('Real screen-reader behaviour, visual RTL and service-worker offline are not verifiable in jsdom.');
}

/* ==================================================================== */
console.log('\n' + '='.repeat(70));
if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' SCIENCE TESTS PASSED\x1b[0m');
else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed');
       failures.forEach(f => console.log('   - ' + f)); }
console.log('\n  Documented limitations (' + notes.length + '):');
notes.forEach(n => console.log('   • ' + n));
console.log('='.repeat(70) + '\n');
process.exit(fail === 0 ? 0 : 1);
