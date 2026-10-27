/* ============================================================================
   ANCESTOR — Science Hub
   Sections: Lessons · Explorers · Evidence
   Integrated into the primary navigation; reachable from anatomy, session,
   progress and every recommendation via "Why this?".
   ========================================================================== */

let SCI_VIEW  = 'lessons';      // lessons | modules | explorers | evidence
let SCI_CAT   = 'all';
let SCI_QUERY = '';
let LESSON_ID = null;
let QUIZ_STATE = {};            // lessonId -> {answers:[], done:bool}
let EXPLORER  = null;           // muscle | metabolism | mechanics | timeline | sim
let SIM = { sets: 3, freq: 3, muscle: 'chest' };
let MECH_EX = null;

function sciProgress(){
  const s = getState();
  s.science = s.science || { read:[], achievements:[] };
  return s.science;
}
function sciSave(){ saveState(); }

function sciRead(){ return sciProgress().read || []; }
function isRead(id){ return sciRead().indexOf(id) >= 0; }

function sciAchievements(){
  const read = sciRead();
  const out = [];
  if(read.length >= 1) out.push('first-lesson');
  if(read.length >= 5) out.push('five-lessons');
  if(Object.keys(QUIZ_STATE).some(k => QUIZ_STATE[k].done && QUIZ_STATE[k].correct === QUIZ_STATE[k].total)) out.push('quiz-perfect');
  if((sciProgress().explorers || []).length >= 5) out.push('explorer');
  if((sciProgress().evidenceOpened || []).length >= 1) out.push('evidence-reader');
  return out;
}

/* ======================================================================== */
/*  HUB                                                                      */
/* ======================================================================== */
Screens.science = function(){
  const s = getState();
  const read = sciRead();
  const ach = sciAchievements();
  let h = '';

  h += '<div class="masthead"><div>' +
       '<p class="masthead-idx">' + LESSONS.length + ' ' + esc(t('sci.tabLessons').toLowerCase()) +
       ' · ' + LEARNING_MODULES.length + ' ' + esc(t('sci.tabModules').toLowerCase()) + '</p>' +
       '<h2 class="masthead-title">' + esc(t('sci.title')) + '</h2>' +
       '<p class="masthead-sub">' + esc(t('sci.sub')) + '</p></div>' +
       '<div style="display:inline-flex;align-items:center;gap:var(--s2)">' +
       progressRing(LESSONS.length ? read.length / LESSONS.length : 0,
                    { r: 16, stroke: 3.5, ringKey: 'sci.read', label: t('sci.progress') }) +
       '<span class="mono" style="font-size:11px;color:var(--tech-ink)">' +
       read.length + ' / ' + LESSONS.length + ' ' + esc(t('sci.lessonsDone')) + '</span></div></div>';

  /* architectural sub-tabs (keep .chip in classList so automated tab queries match) */
  const TABS = ['lessons','modules','explorers','evidence'];
  h += '<div class="subnav" data-subnav="science" role="tablist"><i class="subnav-ind" hidden></i>' +
       TABS.map(v =>
        '<button type="button" role="tab" aria-selected="' + (SCI_VIEW===v?'true':'false') +
        '" class="subnav-btn chip ' + (SCI_VIEW===v?'on':'') +
        '" style="border-radius:0;background:transparent;box-shadow:none;border-top:0;border-left:0;border-right:0" ' +
        'onclick="setSciView(\'' + v + '\')">' +
        esc(t(v==='lessons' ? 'sci.tabLessons'
             : v==='modules' ? 'sci.tabModules'
             : v==='explorers' ? 'sci.tabExplorers' : 'sci.tabEvidence')) + '</button>').join('') +
       '</div>';

  if(SCI_VIEW === 'lessons')   h += sciLessons();
  if(SCI_VIEW === 'modules')   h += sciModules();
  if(SCI_VIEW === 'explorers') h += sciExplorers();
  if(SCI_VIEW === 'evidence')  h += sciEvidence();

  /* achievements */
  h += '<div class="sect"><h3 class="sub">' + esc(t('sci.achievements')) + '</h3><span class="rule"></span></div>';
  h += '<div class="chips">' + ACHIEVEMENTS.map(a =>
      '<span class="flag ' + (ach.indexOf(a.id) >= 0 ? 'ok' : 'nodata') + '">' + esc(t(a.label)) + '</span>').join('') + '</div>';

  return { html: h };
};

function setSciView(v){ SCI_VIEW = v; EXPLORER = null; render(); }

/* Entry points into the two guided, visual modules. */
function sciModules(){
  let h = '<div class="mod-grid" data-stagger>';
  LEARNING_MODULES.forEach(m => {
    h += '<button class="panel mod-card" onclick="openModule(\'' + m.id + '\')">';
    h += '<p class="eyebrow">' + esc(t('sci.tabModules')) + '</p>';
    h += '<h3 class="sub" style="margin:var(--s2) 0">' + esc(t(m.titleKey)) + '</h3>';
    h += '<p class="body-sm" style="margin-bottom:var(--s3)">' + esc(t(m.summaryKey)) + '</p>';
    h += '<div class="chips">' +
         '<span class="flag plain">' + m.steps.length + ' ' + esc(t('mod.stepsLabel')) + '</span>' +
         '<span class="flag plain">' + (m.evidence || []).length + ' ' + esc(t('ev.count')) + '</span>' +
         (m.interactive ? '<span class="flag accent">' + esc(t('mod.interactive')) + '</span>' : '') +
         '</div></button>';
  });
  h += '</div>';
  return h;
}

function sciLessons(){
  let h = '';
  h += '<div class="field"><label for="sciSearchInput">' + esc(t('sci.search')) + '</label>' +
       '<input id="sciSearchInput" type="text" value="' + esc(SCI_QUERY) + '" oninput="setSciQuery(this.value)" placeholder="' + esc(t('sci.search')) + '"></div>';
  h += '<div class="chips" style="margin-bottom:var(--s4)">' +
       '<button class="chip sm ' + (SCI_CAT==='all'?'on':'') + '" onclick="setSciCat(\'all\')">' + esc(t('sci.all')) + '</button>' +
       SCIENCE_CATEGORIES.map(c => '<button class="chip sm ' + (SCI_CAT===c.id?'on':'') + '" onclick="setSciCat(\'' + c.id + '\')">' +
       esc(t(c.label)) + '</button>').join('') + '</div>';

  const q = SCI_QUERY.trim().toLowerCase();
  const list = LESSONS.filter(l =>
    (SCI_CAT === 'all' || l.cat === SCI_CAT) &&
    (!q || (t(l.titleKey) + ' ' + t(l.summaryKey)).toLowerCase().indexOf(q) >= 0));

  if(!list.length){
    h += emptyState('sci.noResults', 'sci.noResults.body', 'inbox',
      '<button class="btn quiet sm" onclick="setSciCat(\'all\');setSciQuery(\'\')">' + esc(t('sci.all')) + '</button>');
    return h;
  }

  h += '<div class="lesson-grid" data-stagger>';
  list.forEach(l => {
    const done = isRead(l.id);
    const numIdx = String(LESSONS.indexOf(l) + 1).padStart(2, '0');
    h += '<button type="button" class="lesson-card ' + (done ? 'done' : '') + '" onclick="openLesson(\'' + l.id + '\')">' +
      '<div style="width:100%">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">' +
        '<span class="lesson-idx">' + numIdx + '</span>' +
        (done ? '<span class="flag sm ok">' + esc(t('sci.read')) + '</span>'
              : '<span class="flag sm plain">' + l.mins + ' ' + esc(t('sci.minutes')) + '</span>') +
      '</div>' +
      '<div style="font-family:var(--f-display);font-size:17px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--ink);margin-bottom:6px">' +
        esc(t(l.titleKey)) + '</div>' +
      '<div class="body-sm">' + esc(t(l.summaryKey)) + '</div>' +
      '</div>' +
      '<div class="chips" style="margin-top:var(--s2)">' +
        '<span class="flag sm plain">' + esc(t('cat.' + l.cat.replace(/-(\w)/g,(m,c)=>c.toUpperCase()))) + '</span>' +
        (done ? '<span class="flag sm plain">' + l.mins + ' ' + esc(t('sci.minutes')) + '</span>' : '') +
      '</div></button>';
  });
  h += '</div>';
  return h;
}
function setSciCat(c){ SCI_CAT = c; render(); }
function setSciQuery(v){ SCI_QUERY = v; render(); }

/* ======================================================================== */
/*  LESSON                                                                   */
/* ======================================================================== */
Screens.lesson = function(){
  const l = lesson(LESSON_ID);
  if(!l) return { html: emptyState('sci.noLesson','sci.noLesson.body','inbox') };
  const s = getState();
  const evs = evidenceFor(l.evidence || []);
  const q = QUIZ_STATE[l.id] || { answers:[], done:false, correct:0, total:(l.quiz||[]).length };
  let h = '';

  h += '<div style="display:flex;gap:var(--s2);margin-bottom:var(--s3);flex-wrap:wrap">' +
       '<button class="btn quiet sm" onclick="backToScience()">' + esc(t('sci.backToHub')) + '</button>' +
       '<span class="flag plain">' + l.mins + ' ' + esc(t('sci.minutes')) + '</span>' +
       '<span class="flag accent">' + esc(t('cat.' + l.cat.replace(/-(\w)/g,(m,c)=>c.toUpperCase()))) + '</span></div>';

  h += '<h1 class="display" style="font-size:26px;margin-bottom:var(--s2)">' + esc(t(l.titleKey)) + '</h1>';
  h += '<p class="onb-prose">' + esc(t(l.summaryKey)) + '</p>';
  if(l.langs && l.langs.indexOf(CURRENT_LANG) < 0){
    h += '<div class="uncertain" style="margin-bottom:var(--s4)"><b>' + esc(t('sci.notLocalised')) + '</b></div>';
  }

  /* sections */
  l.sections.forEach(sec => {
    // Section text is localised by key; English is the source of last resort.
    h += '<div class="panel"><h3 class="sub" style="margin-bottom:var(--s2)">' + esc(t(sec.h)) + '</h3>' +
         '<p class="body-sm" style="font-size:14.5px;color:var(--ink-2)">' + esc(t(sec.b)) + '</p></div>';
  });

  /* personal data, when the lesson supports it and data exists */
  h += personalBlock(l, s);

  /* takeaways */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('sci.takeaways')) + '</h3></div>' +
       (l.takeaways||[]).map(k => '<div class="factor up"><span class="dot"></span><span class="txt">' + esc(t(k)) + '</span></div>').join('') +
       '</div>';

  /* myths */
  if((l.myths||[]).length){
    h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('sci.myths')) + '</h3></div>';
    l.myths.forEach(m => {
      h += '<div class="factor warn"><span class="dot"></span><span class="txt"><b>' + esc(t(m.claim)) + '</b> — ' +
           esc(t(m.verdict)) + '<br><span style="color:var(--ink-3)">' + esc(t(m.why)) + '</span></span></div>';
    });
    h += '</div>';
  }

  /* quiz */
  if((l.quiz||[]).length){
    h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('sci.quiz')) + '</h3></div>';
    l.quiz.forEach((qq, i) => {
      const picked = q.answers[i];
      h += '<div style="margin-bottom:var(--s4)"><p style="font-size:14px;font-weight:600;margin-bottom:var(--s2)">' +
           esc(t(qq.q)) + '</p><div class="chips">' +
           qq.options.map((o, oi) =>
             '<button class="chip sm ' + (picked === oi ? 'on' : '') +
             (q.done ? (oi === qq.answer ? ' on' : '') : '') +
             '" onclick="answerQuiz(\'' + l.id + '\',' + i + ',' + oi + ')" ' +
             'aria-pressed="' + (picked === oi ? 'true' : 'false') + '">' + esc(t(o)) + '</button>').join('') +
           '</div>';
      if(q.done && picked !== undefined){
        const good = picked === qq.answer;
        h += '<div class="banner ' + (good ? 'ok' : 'warn') + '" style="margin-top:var(--s2)">' +
             '<span class="ic">' + (good ? 'OK' : '!') + '</span><span><b>' +
             esc(t(good ? 'sci.correct' : 'sci.incorrect')) + '</b> ' + esc(t(qq.explain)) + '</span></div>';
      }
      h += '</div>';
    });
    if(!q.done){
      h += '<button class="btn" onclick="finishQuiz(\'' + l.id + '\')" ' +
           (q.answers.filter(a => a !== undefined).length < (l.quiz||[]).length ? 'disabled' : '') + '>' +
           esc(t('sci.check')) + '</button>';
    } else {
      h += '<div class="banner ok"><span class="ic">OK</span><span>' + esc(t('sci.finished')) + ' — ' +
           q.correct + ' / ' + q.total + '</span></div>';
      if(q.correct < q.total) h += '<button class="btn quiet sm" style="margin-top:var(--s2)" onclick="retryQuiz(\'' + l.id + '\')">' +
           esc(t('sci.tryAgain')) + '</button>';
    }
    h += '</div>';
  }

  /* evidence */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('sci.evidence')) + '</h3></div>';
  if(!evs.length){
    h += '<p class="body-sm">' + esc(t('ev.none')) + '</p>';
  } else {
    evs.forEach(e => { h += evidenceCard(e, true); });
  }
  h += '</div>';

  /* links into the app */
  h += '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('sci.features')) + '</h3></div>' +
       '<div class="chips">' + (l.features||[]).map(f =>
         '<button class="chip" onclick="go(\'' + f.view + '\')">' + esc(t(f.label)) + '</button>').join('') +
       '</div></div>';

  if(!isRead(l.id)){
    h += '<button class="btn block" onclick="markRead(\'' + l.id + '\')">' + esc(t('sci.markRead')) + '</button>';
  }
  return { html: h };
};

function openLesson(id){ LESSON_ID = id; go('lesson'); }
function backToScience(){ LESSON_ID = null; go('science'); }
function markRead(id){
  const p = sciProgress();
  p.read = p.read || [];
  if(p.read.indexOf(id) < 0) p.read.push(id);
  sciSave(); toast(t('sci.read'),'ok'); render();
}
function answerQuiz(lessonId, qi, oi){
  const q = QUIZ_STATE[lessonId] || { answers:[], done:false, correct:0, total:(lesson(lessonId).quiz||[]).length };
  q.answers[qi] = oi;
  QUIZ_STATE[lessonId] = q;
  render();
}
function finishQuiz(lessonId){
  const l = lesson(lessonId);
  const q = QUIZ_STATE[lessonId] || { answers:[], total:0 };
  let correct = 0;
  (l.quiz||[]).forEach((qq,i) => { if(q.answers[i] === qq.answer) correct++; });
  q.done = true; q.correct = correct; q.total = (l.quiz||[]).length;
  QUIZ_STATE[lessonId] = q;
  if(correct === q.total && isRead(lessonId) === false){ markRead(lessonId); }
  render();
}
function retryQuiz(lessonId){ QUIZ_STATE[lessonId] = { answers:[], done:false, correct:0, total:(lesson(lessonId).quiz||[]).length }; render(); }

/* ------------------------------------------------- personal-data blocks */
function personalBlock(l, state){
  if(!l.personal) return '';
  let h = '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('sci.personal')) + '</h3>' +
          '<span class="hint">' + esc(t('sci.legendObs')) + '</span></div>';

  if(!state.sessions.length){
    h += '<p class="body-sm">' + esc(t('sci.personal.none')) + '</p></div>';
    return h;
  }

  if(l.personal === 'overload'){
    const exId = (state.sessions[state.sessions.length-1].exercises[0]||{}).id;
    const hist = exerciseHistory(exId).slice(-3);
    h += '<p class="body-sm" style="margin-bottom:var(--s3)">' +
         esc(t('ex.'+exId)) + '</p>' + dataTable(
      [{label:t('progress.date')},{label:t('progress.best')},{label:t('progress.sets'),n:true}],
      hist.map(x => {
        const pex = EX_BY_ID[exId];
        const b = pex ? bestSetScore(workingSets(x.sets), pex, state.profile) : null;
        return [esc(dateLabel(x.date)),
                esc(b ? formatSet(b.set, pex, state.profile) : '—'),
                workingSets(x.sets).length];
      }), t('sci.legendObs'));
  }
  else if(l.personal === 'volume'){
    const vol = volumeByMuscle(state, Date.now() - 7*86400000);
    h += dataTable(
      [{label:t('body.exercises')},{label:t('progress.volume'),n:true}],
      MUSCLES.map(m => [esc(t('mg.'+m)), Math.round(vol[m])]), t('sci.legendObs'));
  }
  else if(l.personal === 'recovery'){
    const ss = sleepStats(state.sleep, Date.now(), 7);
    h += ss.avg !== null
      ? '<p class="body-sm">' + esc(t('why.dec.sleep', { h: Math.round(ss.avg*10)/10, n: ss.n })) + '</p>'
      : '<p class="body-sm">' + esc(t('why.missing.noSleep')) + '</p>';
  }
  else if(l.personal === 'mechanics'){
    const exId = MECH_EX || (state.sessions[state.sessions.length-1].exercises[0]||{}).id;
    const ex = EX_BY_ID[exId];
    if(ex){
      h += '<div class="chips" style="margin-bottom:var(--s3)">' +
        '<span class="flag accent">' + esc(t('lab.primary')) + ': ' + esc(t('mg.'+ex.m[0][0])) + '</span>' +
        ex.m.slice(1).map(([m,w]) => '<span class="flag plain">' + esc(t('mg.'+m)) + ' ' + Math.round(w*100) + '%</span>').join('') +
        '</div><p class="hint">' + esc(t('takeaway.mm.2')) + '</p>';
    }
  }
  h += '</div>';
  return h;
}

/* ======================================================================== */
/*  EXPLORERS                                                                */
/* ======================================================================== */
function sciExplorers(){
  const items = [
    { id:'muscle',     label:'lab.muscleGrowth' },
    { id:'metabolism', label:'lab.metabolism'   },
    { id:'mechanics',  label:'lab.mechanics'    },
    { id:'timeline',   label:'lab.timeline'     },
    { id:'sim',        label:'sim.title'        }
  ];
  let h = '<div class="chips" style="margin-bottom:var(--s4)">' +
    items.map(i => '<button class="chip ' + (EXPLORER===i.id?'on':'') + '" onclick="openExplorer(\'' + i.id + '\')">' +
      esc(t(i.label)) + '</button>').join('') + '</div>';

  if(!EXPLORER){
    h += '<div class="panel"><p class="body-sm">' + esc(t('sci.explorerIntro')) + '</p></div>';
    return h;
  }
  if(EXPLORER === 'muscle')     h += explorerMuscle();
  if(EXPLORER === 'metabolism') h += explorerMetabolism();
  if(EXPLORER === 'mechanics')  h += explorerMechanics();
  if(EXPLORER === 'timeline')   h += explorerTimeline();
  if(EXPLORER === 'sim')        h += explorerSim();
  return h;
}

function openExplorer(id){
  EXPLORER = id;
  const p = sciProgress();
  p.explorers = p.explorers || [];
  if(p.explorers.indexOf(id) < 0){ p.explorers.push(id); sciSave(); }
  render();
}

function explorerMuscle(){
  let h = '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('lab.muscleGrowth')) + '</h3></div>';
  h += '<div class="tiles">';
  ['mge.stimulus','mge.synthesis','mge.recovery','mge.accretion'].forEach((k,i) => {
    h += '<div class="panel inset" style="margin:0 0 var(--s2)">' +
      '<p class="eyebrow" style="margin-bottom:4px">' + esc(t('lab.step')) + ' ' + (i+1) + '</p>' +
      '<p class="body-sm" style="margin:0">' + esc(t(k)) + '</p></div>';
  });
  h += '</div>';
  h += '<div class="uncertain" style="margin-top:var(--s3)"><b>' + esc(t('sci.legendPrin')) + '</b>' +
       esc(t('mge.modelWarning')) + '</div>';
  h += '<div style="margin-top:var(--s3)"><button class="btn quiet sm" onclick="go(\'body\')">' +
       esc(t('feature.body')) + '</button></div>';
  h += '</div>';
  return h;
}

function explorerMetabolism(){
  let h = '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('lab.metabolism')) + '</h3></div>';
  h += dataTable(
    [{label:t('ev.question')},{label:t('ev.findings')}],
    [
      [esc(t('met.q1')), esc(t('met.a1'))],
      [esc(t('met.q2')), esc(t('met.a2'))],
      [esc(t('met.q3')), esc(t('met.a3'))]
    ], t('sci.legendPrin'));
  h += '<div class="uncertain" style="margin-top:var(--s3)"><b>' + esc(t('sim.limits')) + '</b>' +
       esc(t('met.limits')) + '</div>';
  // The claim is common enough to refuse explicitly, not just omit.
  h += '<div class="banner alert" style="margin-top:var(--s2)"><span class="ic">!</span><span>' +
       '<b>' + esc(t('myth.ef.spot')) + '</b> ' + esc(t('myth.ef.spot.v')) + ' — ' +
       esc(t('myth.ef.spot.why')) + '</span></div>';
  h += evidenceCard(evidence('spot-reduction-statement'), true);
  h += '</div>';
  return h;
}

function explorerMechanics(){
  const s = getState();
  const ids = [];
  s.sessions.forEach(x => (x.exercises||[]).forEach(e => { if(EX_BY_ID[e.id] && ids.indexOf(e.id)<0) ids.push(e.id); }));
  if(!ids.length) EX_BY_ID && Object.keys(EX_BY_ID).slice(0,40).forEach(id => ids.push(id));
  const exId = MECH_EX || ids[0];
  const ex = EX_BY_ID[exId];
  let h = '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('lab.mechanics')) + '</h3></div>';
  h += '<div class="field"><label>' + esc(t('lab.chooseEx')) + '</label><div class="chips" style="max-height:150px;overflow:auto">' +
       ids.slice(0,24).map(id => '<button class="chip sm ' + (exId===id?'on':'') +
       '" onclick="setMechEx(\'' + id + '\')">' + esc(t('ex.'+id)) + '</button>').join('') + '</div></div>';
  if(ex){
    if(typeof exerciseVisualSvg === 'function') h += exerciseVisualSvg(ex);
    h += '<div class="chips" style="margin-bottom:var(--s3)">' +
      '<span class="flag accent">' + esc(t('lab.primary')) + ': ' + esc(t('mg.'+ex.m[0][0])) + '</span>' +
      ex.m.slice(1).map(([m,w]) => '<span class="flag plain">' + esc(t('mg.'+m)) + ' ' + Math.round(w*100) + '%</span>').join('') +
      '</div>';
    h += '<p class="body-sm">' + esc(t('cue.'+exId)) + '</p>';
    h += '<p class="hint" style="margin-top:var(--s2)">' + esc(t('takeaway.mm.2')) + '</p>';
    h += '<div style="margin-top:var(--s3)"><button class="btn quiet sm" onclick="selectMuscle(\'' + ex.m[0][0] + '\');go(\'body\')">' +
         esc(t('home.mapCta')) + '</button></div>';
  }
  h += '</div>';
  return h;
}
function setMechEx(id){ MECH_EX = id; render(); }

function explorerTimeline(){
  let h = '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('lab.timeline')) + '</h3></div>';
  const stages = [
    { w:'1–4',  k:'lab.tl.neural' },
    { w:'4–12', k:'lab.tl.morphological' },
    { w:'12+',  k:'lab.tl.plateau' },
    { w:'52+',  k:'lab.tl.longTerm' }
  ];
  stages.forEach(st => {
    h += '<div class="factor"><span class="dot"></span><span class="txt">' +
      '<b>' + esc(t('lab.tl.week')) + ' ' + st.w + '</b> — ' + esc(t(st.k)) + '</span></div>';
  });
  h += '<div class="uncertain" style="margin-top:var(--s3)"><b>' + esc(t('sim.limits')) + '</b>' +
       esc(t('lab.tl.note')) + '</div>';
  h += '</div>';
  return h;
}

function explorerSim(){
  let h = '<div class="panel"><div class="panel-hd"><h3 class="sub">' + esc(t('sim.title')) + '</h3></div>';
  h += '<p class="body-sm" style="margin-bottom:var(--s3)">' + esc(t('sim.note')) + '</p>';
  h += '<div class="field"><label for="simSets">' + esc(t('sim.sets')) + ' — ' + SIM.sets + '</label>' +
       '<input id="simSets" type="range" min="1" max="10" value="' + SIM.sets + '" oninput="setSim(\'sets\',+this.value)"></div>';
  h += '<div class="field"><label for="simFreq">' + esc(t('sim.freq')) + ' — ' + SIM.freq + '</label>' +
       '<input id="simFreq" type="range" min="1" max="6" value="' + SIM.freq + '" oninput="setSim(\'freq\',+this.value)"></div>';
  const weekly = SIM.sets * SIM.freq;
  const band = volumeBandFor(weekly);
  const pct = Math.min(100, Math.round(weekly / 30 * 100));
  h += '<div class="em-bar" style="margin:var(--s2) 0"><i class="in" style="width:' + pct + '%"></i></div>';
  h += '<div class="metrics" style="margin:var(--s3) 0">' +
       metric(t('sim.weeklySets'), weekly, '', t('vol.band.' + band.id)) +
       metric(t('sci.confidence'), t('sim.illustrative')) + '</div>';
  h += '<div class="uncertain"><b>' + esc(t('sim.assumptions')) + '</b>' + esc(t('sim.assume')) + '</div>';
  h += '<div class="uncertain" style="margin-top:var(--s2)"><b>' + esc(t('sim.limits')) + '</b>' + esc(t('sim.limitBody')) + '</div>';
  h += '<div style="margin-top:var(--s3)"><button class="btn quiet sm" onclick="go(\'progress\')">' +
       esc(t('feature.progress')) + '</button></div>';
  h += '</div>';
  return h;
}
function setSim(k,v){ SIM[k] = v; render(); }

/* ======================================================================== */
/*  EVIDENCE                                                                 */
/* ======================================================================== */
function sciEvidence(){
  const stats = libraryStats();
  let h = '';
  h += '<div class="metrics" style="margin-bottom:var(--s4)">' +
       metric(t('ev.count'), stats.total) +
       metric(t('ev.affecting'), stats.affecting) +
       metric(t('ev.reviewed'), esc(stats.lastReviewed)) + '</div>';
  h += '<div class="uncertain" style="margin-bottom:var(--s4)"><b>' + esc(t('ev.libraryNote')) + '</b>' +
       esc(EVIDENCE_LIBRARY_NOTE) + '</div>';

  EVIDENCE.forEach(e => { h += evidenceCard(e, false); });
  return h;
}

function evidenceCard(e, compactMode){
  if(typeof e === 'string'){
    e = (typeof evidence === 'function') ? evidence(e) : (EVIDENCE || []).filter(x => x.id === e)[0];
  }
  if(!e) return '';
  const driving = canAffectRecommendations(e);
  let h = '<div class="panel inset" style="margin:0 0 var(--s3)">';
  h += '<p style="font-size:14px;font-weight:600;margin-bottom:var(--s2)">' + esc(e.title) + '</p>';
  h += '<div class="chips" style="margin-bottom:var(--s2)">' +
    '<span class="flag plain">' + esc(t('ev.type.' + e.type)) + '</span>' +
    '<span class="flag ' + (e.quality === 'high' ? 'ok' : e.quality === 'moderate' ? 'accent' : 'nodata') + '">' +
      esc(t('ev.quality.' + e.quality)) + '</span>' +
    '<span class="flag ' + (e.reviewStatus === 'reviewed' ? 'ok' : 'warn') + '">' + esc(t('ev.status.' + e.reviewStatus)) + '</span>' +
    (driving ? '<span class="flag ok">' + esc(t('sci.affecting')) + '</span>'
             : '<span class="flag nodata">' + esc(t('sci.notDriving')) + '</span>') +
    '</div>';
  h += '<p class="hint">' + esc(e.authors) + (e.year ? ' · ' + e.year : '') + (e.journal ? ' · ' + esc(e.journal) : '') + '</p>';
  if(!compactMode){
    h += '<div style="margin-top:var(--s2)">' +
      '<p class="body-sm"><b>' + esc(t('ev.question')) + ':</b> ' + esc(e.question) + '</p>' +
      '<p class="body-sm"><b>' + esc(t('ev.findings')) + ':</b> ' + esc(e.findings) + '</p>' +
      '<p class="body-sm"><b>' + esc(t('ev.limitations')) + ':</b> ' + esc(e.limitations) + '</p>' +
      '<p class="body-sm"><b>' + esc(t('ev.relevance')) + ':</b> ' + esc(e.relevance) + '</p>' +
      '</div>';
  }
  h += '<div class="chips" style="margin-top:var(--s2)">' +
    (e.doi ? '<span class="flag plain">' + esc(t('ev.doi')) + ': ' + esc(e.doi) + '</span>' : '') +
    '<span class="flag ' + (e.identifierVerified ? 'ok' : 'warn') + '">' +
      esc(t('ev.verification')) + ': ' + (e.identifierVerified ? esc(t('sci.verified')) : esc(t('sci.unverified'))) + '</span>' +
    '<span class="flag plain">' + esc(t('ev.reviewed')) + ': ' + esc(e.lastReviewed) + '</span>' +
    '</div>';
  if(!e.identifierVerified){
    h += '<p class="hint" style="margin-top:var(--s2)">' + esc(t('ev.needsVerification')) + '</p>';
  }
  if(e.url){
    h += '<div style="margin-top:var(--s2)"><a class="btn quiet sm" href="' + esc(e.url) +
         '" target="_blank" rel="noopener">' + esc(t('ev.openSource')) + '</a></div>';
  }
  h += '</div>';
  return h;
}

function openEvidence(id){
  const p = sciProgress();
  p.evidenceOpened = p.evidenceOpened || [];
  if(p.evidenceOpened.indexOf(id) < 0) p.evidenceOpened.push(id);
  sciSave();
}

/* ======================================================================== */
/*  WHY ANCESTOR RECOMMENDS THIS                                             */
/* ======================================================================== */
function openWhy(kind, id){
  const s = getState();
  let ex = null;
  if(kind === 'progression') ex = explainProgression(s, id, Date.now());
  if(kind === 'decision')    ex = explainDecision(s, s.plan ? (nextSession(s, Date.now())||{session:{exercises:[]}}).session.exercises.map(e=>e.id) : [], Date.now());
  if(kind === 'recovery')    ex = explainRecovery(s, id, Date.now());
  if(kind === 'volume')      ex = explainVolume(s, Date.now());
  if(!ex){ toast(t('err.generic'),'err'); return; }
  sheet(t('sci.whyTitle'), whyPanel(ex, kind, id));
}

function whyPanel(ex, kind, id){
  let h = '';
  h += '<div class="panel inset" style="margin:0 0 var(--s3)">' +
       '<p class="eyebrow" style="margin-bottom:4px">' + esc(t('sci.what')) + '</p>' +
       '<p style="font-size:15px;font-weight:600">' + esc(ex.what) + '</p></div>';

  if(ex.rule){
    h += '<div class="panel inset" style="margin:0 0 var(--s3)"><p class="eyebrow" style="margin-bottom:4px">' +
      esc(t('sci.ruleInfo')) + ' — ' + esc(ex.rule.title) + '</p>' +
      '<p class="hint">' + esc(t('sci.ruleVersion')) + ' ' + ex.rule.version + ' · ' +
      esc(t('sci.ruleUpdated')) + ' ' + esc(ex.rule.updated) + ' · ' +
      esc(t('sci.confidence')) + ': ' + esc(t('ev.quality.' + ex.rule.confidence)) + '</p>' +
      '<p class="body-sm" style="margin-top:var(--s2)">' + esc(ex.rule.how) + '</p></div>';
  }

  const block = (titleKey, items) => {
    if(!items || !items.length){
      if(titleKey === 'sci.dataUsed')
        return '<div style="margin-bottom:var(--s3)"><p class="eyebrow" style="margin-bottom:4px">' +
               esc(t(titleKey)) + '</p><p class="hint">' + esc(t('why.noDataUsed')) + '</p></div>';
      return '';
    }
    return '<div style="margin-bottom:var(--s3)"><p class="eyebrow" style="margin-bottom:4px">' + esc(t(titleKey)) + '</p>' +
      items.map(i => '<div class="factor ' + (i.kind === 'observation' ? 'up' : i.kind === 'principle' ? 'warn' : '') + '">' +
        '<span class="dot"></span><span class="txt">' + esc(i.text || i) + '</span></div>').join('') + '</div>';
  };
  h += block('sci.goal', [ex.goal]);
  h += block('sci.history', ex.history);
  h += block('sci.prefs', ex.preferences);
  h += block('sci.dataUsed', ex.dataUsed.map(d => ({kind:'observation', text:d})));
  h += block('sci.reasoning', ex.reasoning);
  h += block('sci.assumptions', ex.assumptions.map(a => ({kind:'algorithm', text:a})));
  h += block('sci.missing', ex.missing.map(m => ({kind:'algorithm', text:m})));

  /* evidence driving the rule */
  const evs = ex.rule ? drivingEvidence(ex.rule.ruleId) : [];
  if(evs.length){
    h += '<div style="margin-bottom:var(--s3)"><p class="eyebrow" style="margin-bottom:4px">' + esc(t('sci.affecting')) + '</p>';
    evs.forEach(e => { h += evidenceCard(e, true); openEvidence(e.id); });
    h += '</div>';
  }

  if(ex.alternatives && ex.alternatives.length){
    /* Framed as the practical next step, because that is what these are:
       things you can actually do with the recommendation in front of you. */
    h += '<div style="margin-bottom:var(--s3)"><p class="eyebrow" style="margin-bottom:4px">' +
         esc(t('sci.nextStep')) + ' · ' + esc(t('sci.alternatives')) + '</p>' +
         '<p class="hint" style="margin-bottom:var(--s2)">' + esc(t('sci.nextStepHint')) + '</p>' +
      '<div class="tiles">' + ex.alternatives.map(a =>
        '<button class="tile" onclick="closeSheet()"><span class="box"></span><span><span class="t">' + esc(a.label) +
        '</span><span class="d">' + esc(a.note) + '</span></span></button>').join('') + '</div></div>';
  }

  if(ex.rule && ex.rule.changelog && ex.rule.changelog.length){
    h += '<div style="margin-bottom:var(--s3)"><p class="eyebrow" style="margin-bottom:4px">' + esc(t('sci.changelog')) + '</p>' +
      ex.rule.changelog.map(c => '<p class="hint">' + esc(c.date) + ' — v' + c.to + ': ' + esc(c.rationale) + '</p>').join('') + '</div>';
  }

  h += '<div class="uncertain"><b>' + esc(t('sci.legendTitle')) + '</b>' +
    (ex.distinguish||[]).map(d => '<div>' + esc(d.text) + '</div>').join('') + '</div>';

  h += '<div style="display:flex;gap:var(--s2);flex-wrap:wrap;margin-top:var(--s4)">' +
    '<button class="btn" onclick="acceptWhy()">' + esc(t('sci.accept')) + '</button>' +
    '<button class="btn quiet" onclick="rejectWhy()">' + esc(t('sci.reject')) + '</button></div>';

  if(ex.lessons && ex.lessons.length){
    h += '<div class="chips" style="margin-top:var(--s3)">' + ex.lessons.map(lid =>
      '<button class="chip sm" onclick="closeSheet();openLesson(\'' + lid + '\')">' + esc(t((lesson(lid)||{titleKey:'sci.title'}).titleKey)) + '</button>').join('') + '</div>';
  }
  return h;
}

function acceptWhy(){ closeSheet(); toast(t('sci.accepted'),'ok'); }
function rejectWhy(){ closeSheet(); toast(t('sci.rejected')); }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { openWhy, whyPanel, evidenceCard, sciAchievements, openExplorer };
}
