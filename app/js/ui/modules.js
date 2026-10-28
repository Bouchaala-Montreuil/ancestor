/* ============================================================================
   ANCESTOR — interactive learning modules (renderer)

   Each module is a stage selector plus a diagram plus a short explanation.
   Selecting a stage reveals that stage's explanation and diagram; nothing
   animates unless the user moved it.

   The diagrams are drawn from the concepts, not from user data. Where a
   figure uses numbers (the energy module) those numbers are chosen by the
   user and labelled as a teaching model.
   ========================================================================== */

let MOD_ID = null;
let MOD_STEP = 0;
/* Illustrative starting values for the energy model. They are not the user's
   intake or expenditure and the UI says so on every render. */
let ENERGY = { intake: 2400, expenditure: 2400 };
let REC_SIM = { sets: 3, rir: 2, sleep: 7.5 };

function openModule(id){
  const m = moduleById(id);
  if(!m) return;
  MOD_ID = id;
  MOD_STEP = 0;
  go('module');
}
function closeModule(){ MOD_ID = null; go('science'); }
function setModStep(i){
  const m = moduleById(MOD_ID);
  if(!m || i < 0 || i >= m.steps.length || i === MOD_STEP) return;
  MOD_STEP = i;
  render();
}
function setEnergy(k, v){
  const n = parseFloat(v);
  if(!isFinite(n)) return;
  ENERGY[k] = Math.max(800, Math.min(6000, Math.round(n / 50) * 50));
  paintEnergyReadout();
}
function setRecSim(k, v){
  const n = parseFloat(v);
  if(!isFinite(n)) return;
  if(k === 'sets')  REC_SIM.sets  = Math.max(1, Math.min(8, Math.round(n)));
  if(k === 'rir')   REC_SIM.rir   = Math.max(0, Math.min(4, Math.round(n)));
  if(k === 'sleep') REC_SIM.sleep = Math.max(4, Math.min(10, Math.round(n * 2) / 2));
  paintRecSimReadout();
}

Screens.module = function(){
  const m = moduleById(MOD_ID);
  if(!m) return { html: emptyState('sci.title', 'sci.sub', 'science', '', 2) };
  const step = m.steps[MOD_STEP] || m.steps[0];

  /* A lesson replaces the screen rather than sitting inside one, so its title
     is the screen's h1 — the science hub's masthead is not on this page. */
  let h = '<div class="sect"><h1 class="title">' + esc(t(m.titleKey)) +
          '</h1><span class="rule"></span>' +
          '<span class="aside"><button class="chip sm" data-act="closeModule">' +
          esc(t('sci.backToHub')) + '</button></span></div>';

  h += '<p class="body-sm mb-5" style="max-width:64ch">' +
       esc(t(m.summaryKey)) + '</p>';

  /* stage selector with a shared animated indicator */
  h += '<div class="modebar mb-5">' +
       '<i class="mode-ind" id="modInd"></i>' +
       m.steps.map((s, i) =>
         '<button class="chip sm ' + (i === MOD_STEP ? 'on' : '') + '" data-step="' + i + '" data-act="setModStep" data-a1="' + i + '" data-t1="l" ' +
         'aria-pressed="' + (i === MOD_STEP ? 'true' : 'false') + '">' +
         esc(String(i+1)) + '. ' + esc(t(s.labelKey)) + '</button>').join('') +
       '</div>';

  h += '<div class="cols mod-body"><div>';

  /* diagram */
  h += '<div class="panel mod-diagram" id="modDiagram">';
  /* The energy module's three quantitative stages share one live model, with
     the row belonging to the current stage emphasised. The other two stages
     use their own diagram. */
  if(m.interactive === 'energy' && ['intake','expenditure','stored'].indexOf(step.id) >= 0){
    h += diagramFor(step.diagram);
    h += energyDiagram(step.id);
  } else if(m.interactive === 'recovery' && step.id === 'recmodel'){
    h += diagramFor(step.diagram);
    h += recoverySimDiagram();
  } else {
    h += diagramFor(step.diagram);
  }
  h += '</div>';

  h += '</div><div>';

  /* explanation */
  h += '<div class="panel">';
  h += '<p class="eyebrow">' + esc(t('mod.stage', { n: MOD_STEP + 1, of: m.steps.length })) + '</p>';
  h += '<h2 class="sub mt-2 mb-3">' + esc(t(step.titleKey)) + '</h2>';
  h += '<p class="body-sm mb-0">' + esc(t(step.bodyKey)) + '</p>';
  h += '</div>';

  /* provenance of the claim */
  h += '<div class="panel mt-3">';
  h += '<p class="eyebrow mb-2">' + esc(t('mod.thisIs')) + '</p>';
  if(step.claim.kind === 'principle'){
    h += '<div class="chips mb-3">' +
         '<span class="flag ok">' + esc(t('sci.principle')) + '</span></div>';
    h += '<p class="hint mb-3">' + esc(t('mod.sourcedTo')) + '</p>';
    (step.claim.evidence || []).forEach(id => { h += evidenceCard(id, true); });
  } else {
    h += '<div class="chips mb-3">' +
         '<span class="flag plain">' + esc(t('mod.model')) + '</span></div>';
    h += '<p class="body-sm mb-0">' + esc(t(step.claim.note)) + '</p>';
  }
  h += '</div>';

  /* navigation between stages */
  h += '<div class="row mt-4">';
  h += '<button class="btn quiet" ' + (MOD_STEP === 0 ? 'disabled' : '') +
       ' data-act="setModStep" data-a1="' + (MOD_STEP - 1) + '" data-t1="l">' + esc(t('btn.back')) + '</button>';
  h += '<button class="btn" ' + (MOD_STEP === m.steps.length - 1 ? 'disabled' : '') +
       ' data-act="setModStep" data-a1="' + (MOD_STEP + 1) + '" data-t1="l">' + esc(t('btn.next')) + '</button>';
  h += '</div>';

  /* Connect the module to the user's own log, without pretending the module
     is about them. */
  h += modulePersonalNote(m);

  h += '<div class="uncertain mt-5"><b>' + esc(t('mod.caveatTitle')) +
       '</b> ' + esc(t(m.caveatKey)) + '</div>';

  h += '</div></div>';
  return { html: h };
};

/* Position the shared indicator once the markup is in the document. */
function bindModuleView(){
  const bar = document.querySelector('.modebar');
  if(!bar) return;
  const active = bar.querySelector('.chip.on') || bar.querySelector('.chip');
  if(active) moveIndicator(bar.querySelector('.mode-ind'), active, 'x');
  staggerIn(document.getElementById('modDiagram'), { selector: '.panel > *' });
}

/* The user's own numbers, shown as an observation and labelled as such.
   Absent data produces an explanation, never a placeholder figure. */
function modulePersonalNote(m){
  const st = getState();
  const week = weeklySetTotals(st, Date.now());
  let h = '<div class="panel inset mt-4">';
  h += '<p class="eyebrow mb-2">' + esc(t('sci.personal')) + '</p>';
  if(m.id === 'muscle-growth'){
    if(!st.sessions.length){
      h += '<p class="body-sm mb-0">' + esc(t('modA.personalNone')) + '</p>';
    } else {
      h += '<p class="body-sm mb-2">' +
           esc(t('modA.personal', { sets: Math.round(week.sets*10)/10,
                                    groups: week.groupsTrained })) + '</p>';
      h += '<div class="chips"><span class="flag plain">' +
           esc(t('modA.personalNote')) + '</span></div>';
    }
  } else if(m.id === 'adaptation-recovery'){
    const ss = sleepStats(st.sleep, Date.now(), 7);
    if(ss.avg !== null){
      h += '<p class="body-sm mb-2">' +
           esc(t('why.dec.sleep', { h: Math.round(ss.avg*10)/10, n: ss.n })) + '</p>';
    } else {
      h += '<p class="body-sm mb-0">' + esc(t('modC.personalNone')) + '</p>';
    }
  } else {
    const bw = st.profile && st.profile.bodyweight;
    if(bw){
      h += '<p class="body-sm mb-2">' +
           esc(t('modB.personalBw', { bw: bw, u: unit() })) + '</p>';
    }
    h += '<p class="body-sm mb-0">' + esc(t('modB.personalNone')) + '</p>';
  }
  h += '</div>';
  return h;
}

/* ------------------------------------------------------------- diagrams */
function diagramFor(kind){
  const W = 320, H = 150;
  const defs = '<defs><marker id="a" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
               '<path d="M0,1 L7,4 L0,7 z" fill="var(--tech-ink)"/></marker></defs>';
  const svg = (inner, extra) =>
    '<svg viewBox="0 0 ' + W + ' ' + H + '" class="mod-svg" role="img" ' +
    'aria-label="' + esc(extra || '') + '">' + defs + inner + '</svg>';

  if(kind === 'stimulus'){
    /* load applied -> signal -> response */
    return svg(
      '<rect x="16" y="58" width="52" height="34" rx="3" class="d-box"/>' +
      '<text x="42" y="79" class="d-t" text-anchor="middle">' + esc(t('modA.s1.a')) + '</text>' +
      '<path d="M74 75h40" class="d-arrow"/>' +
      '<rect x="120" y="58" width="52" height="34" rx="3" class="d-box accent"/>' +
      '<text x="146" y="79" class="d-t" text-anchor="middle">' + esc(t('modA.s1.b')) + '</text>' +
      '<path d="M178 75h40" class="d-arrow"/>' +
      '<rect x="224" y="58" width="68" height="34" rx="3" class="d-box"/>' +
      '<text x="258" y="79" class="d-t" text-anchor="middle">' + esc(t('modA.s1.c')) + '</text>' +
      '<text x="160" y="126" class="d-cap" text-anchor="middle">' + esc(t('modA.s1.cap')) + '</text>',
      t('modA.s1.title'));
  }
  if(kind === 'turnover'){
    /* synthesis vs breakdown bars, net balance */
    const up = 92, down = 78, net = up - down;
    return svg(
      '<text x="20" y="30" class="d-l">' + esc(t('modA.s2.a')) + '</text>' +
      '<rect x="140" y="18" width="' + up*1.5 + '" height="16" rx="2" class="d-bar up"/>' +
      '<text x="20" y="62" class="d-l">' + esc(t('modA.s2.b')) + '</text>' +
      '<rect x="140" y="50" width="' + down*1.5 + '" height="16" rx="2" class="d-bar down"/>' +
      '<line x1="140" y1="86" x2="' + (140+up*1.5) + '" y2="86" class="d-axis"/>' +
      '<text x="20" y="100" class="d-l">' + esc(t('modA.s2.c')) + '</text>' +
      '<rect x="140" y="88" width="' + Math.max(3, net*1.5) + '" height="16" rx="2" class="d-bar net"/>' +
      '<text x="160" y="132" class="d-cap">' + esc(t('modA.s2.cap')) + '</text>',
      t('modA.s2.title'));
  }
  if(kind === 'nutrition'){
    /* daily intake across the day; total matters more than timing */
    let bars = '';
    [0.25,0.3,0.2,0.25].forEach((f, i) => {
      const h = 70 * f * 2.4;
      bars += '<rect x="' + (28 + i*70) + '" y="' + (96 - h) + '" width="42" height="' + h +
              '" rx="2" class="d-bar net"/>';
    });
    return svg(
      bars +
      '<line x1="20" y1="96" x2="300" y2="96" class="d-axis"/>' +
      '<text x="160" y="120" class="d-cap" text-anchor="middle">' + esc(t('modA.s3.cap')) + '</text>' +
      '<text x="160" y="138" class="d-cap" text-anchor="middle">' + esc(t('modA.s3.cap2')) + '</text>',
      t('modA.s3.title'));
  }
  if(kind === 'overload'){
    /* staircase: each block is a stage of earned progress */
    let steps = '';
    for(let i=0;i<4;i++){
      const x = 24 + i*72, y = 106 - i*22;
      steps += '<rect x="' + x + '" y="' + y + '" width="60" height="' + (22*(i+1)) +
               '" rx="2" class="d-step' + (i===3 ? ' accent' : '') + '"/>';
    }
    return svg(
      steps +
      '<path d="M24 116 L300 116" class="d-axis"/>' +
      '<text x="160" y="138" class="d-cap" text-anchor="middle">' + esc(t('modA.s4.cap')) + '</text>',
      t('modA.s4.title'));
  }
  if(kind === 'longterm'){
    /* cumulative curve with a band of individual variation */
    const pts = [];
    for(let i=0;i<=20;i++){
      const x = 24 + i * 13.4;
      const y = 112 - Math.pow(i/20, 0.72) * 78;
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    return svg(
      '<path d="M24 112 L24 ' + (112-78) + '" class="d-axis"/>' +
      '<path d="M24 112 L292 112" class="d-axis"/>' +
      '<path d="M' + pts.join(' L') + '" class="d-line"/>' +
      '<path d="M24 ' + (112-0.55*78) + ' L292 ' + (112-0.95*78) + '" class="d-band"/>' +
      '<path d="M24 ' + (112-0.2*78) + ' L292 ' + (112-0.5*78) + '" class="d-band"/>' +
      '<text x="160" y="132" class="d-cap" text-anchor="middle">' + esc(t('modA.s5.cap')) + '</text>' +
      '<text x="160" y="146" class="d-cap" text-anchor="middle">' + esc(t('modA.s5.cap2')) + '</text>',
      t('modA.s5.title'));
  }
  if(kind === 'fluctuation'){
    /* daily weight noise around a slow trend */
    let pts = [], band = [];
    for(let i=0;i<=26;i++){
      const x = 22 + i * 10.3;
      const trend = 96 - i * 1.5;
      const noise = (i % 3 === 0 ? 7 : i % 3 === 1 ? -5 : 3);
      pts.push(x.toFixed(1) + ',' + (trend + noise).toFixed(1));
      band.push(x.toFixed(1) + ',' + trend.toFixed(1));
    }
    return svg(
      '<path d="M' + band.join(' L') + '" class="d-band-line"/>' +
      '<path d="M' + pts.join(' L') + '" class="d-line thin"/>' +
      '<text x="160" y="132" class="d-cap" text-anchor="middle">' + esc(t('modB.s4.cap')) + '</text>',
      t('modB.s4.title'));
  }
  if(kind === 'prog'){
    /* double progression: build reps in range -> earn smallest load step */
    return svg(
      '<rect x="18" y="48" width="76" height="40" rx="3" class="d-box"/>' +
      '<text x="56" y="72" class="d-t" text-anchor="middle">8 → 9 → 10</text>' +
      '<path d="M98 68 L124 68" class="d-arrow"/>' +
      '<rect x="128" y="48" width="68" height="40" rx="3" class="d-box accent"/>' +
      '<text x="162" y="72" class="d-t" text-anchor="middle">RIR ≤ 2</text>' +
      '<path d="M200 68 L224 68" class="d-arrow"/>' +
      '<rect x="228" y="48" width="74" height="40" rx="3" class="d-box"/>' +
      '<text x="265" y="72" class="d-t" text-anchor="middle">+2.5 kg</text>' +
      '<text x="160" y="128" class="d-cap" text-anchor="middle">' + esc(t('modC.s1.cap')) + '</text>',
      t('modC.s1.title'));
  }
  if(kind === 'volume'){
    /* dose-response curve with diminishing returns + rising recovery cost */
    const gain = [], cost = [];
    for(let i=0;i<=16;i++){
      const x = 28 + i * 16.5;
      const gY = 110 - Math.log(1 + i * 0.55) / Math.log(1 + 16 * 0.55) * 76;
      const cY = 110 - Math.pow(i / 16, 1.65) * 74;
      gain.push(x.toFixed(1) + ',' + gY.toFixed(1));
      cost.push(x.toFixed(1) + ',' + cY.toFixed(1));
    }
    return svg(
      '<line x1="28" y1="110" x2="296" y2="110" class="d-axis"/>' +
      '<line x1="28" y1="30" x2="28" y2="110" class="d-axis"/>' +
      '<path d="M' + gain.join(' L') + '" class="d-line"/>' +
      '<path d="M' + cost.join(' L') + '" class="d-band-line"/>' +
      '<text x="160" y="132" class="d-cap" text-anchor="middle">' + esc(t('modC.s2.cap')) + '</text>',
      t('modC.s2.title'));
  }
  if(kind === 'effort'){
    /* RIR 3..0: stimulus plateaus near failure while fatigue spikes at RIR 0 */
    const cols = [{l:'RIR 4',s:44,f:22},{l:'RIR 2',s:72,f:40},{l:'RIR 1',s:78,f:58},{l:'RIR 0',s:80,f:84}];
    let bars = '';
    cols.forEach((c, i) => {
      const bx = 34 + i * 68;
      bars += '<rect x="' + bx + '" y="' + (104 - c.s) + '" width="20" height="' + c.s + '" rx="2" class="d-bar up"/>' +
              '<rect x="' + (bx+23) + '" y="' + (104 - c.f) + '" width="20" height="' + c.f + '" rx="2" class="d-bar down"/>' +
              '<text x="' + (bx+21) + '" y="118" class="d-cap" text-anchor="middle">' + c.l + '</text>';
    });
    return svg(
      bars + '<line x1="24" y1="104" x2="300" y2="104" class="d-axis"/>' +
      '<text x="160" y="138" class="d-cap" text-anchor="middle">' + esc(t('modC.s3.cap')) + '</text>',
      t('modC.s3.title'));
  }
  if(kind === 'recmodel'){
    return svg(
      '<rect x="12" y="42" width="76" height="44" rx="3" class="d-box"/>' +
      '<text x="50" y="68" class="d-t" text-anchor="middle">' + esc(t('c.sets')) + ' × RIR</text>' +
      '<path d="M90 64 L110 64" class="d-arrow"/>' +
      '<rect x="114" y="42" width="70" height="44" rx="3" class="d-box"/>' +
      '<text x="149" y="68" class="d-t" text-anchor="middle">' + esc(t('tl.sleep')) + '</text>' +
      '<path d="M186 64 L206 64" class="d-arrow"/>' +
      '<rect x="210" y="42" width="98" height="44" rx="3" class="d-box accent"/>' +
      '<text x="259" y="68" class="d-t" style="font-size:8px" text-anchor="middle">' + esc(t('body.recovery')) + '</text>' +
      '<text x="160" y="122" class="d-cap" text-anchor="middle">' + esc(t('modC.s4.cap')) + '</text>',
      t('modC.s4.title'));
  }
  if(kind === 'decision'){
    return svg(
      '<rect x="18" y="48" width="82" height="42" rx="3" class="d-bar up"/>' +
      '<text x="59" y="73" class="d-t" text-anchor="middle">' + esc(t('decision.train')) + '</text>' +
      '<path d="M104 69 L116 69" class="d-arrow"/>' +
      '<rect x="120" y="48" width="80" height="42" rx="3" class="d-box accent"/>' +
      '<text x="160" y="73" class="d-t" text-anchor="middle">' + esc(t('decision.modify')) + '</text>' +
      '<path d="M204 69 L216 69" class="d-arrow"/>' +
      '<rect x="220" y="48" width="82" height="42" rx="3" class="d-bar down"/>' +
      '<text x="261" y="73" class="d-t" text-anchor="middle">' + esc(t('decision.rest')) + '</text>' +
      '<text x="160" y="126" class="d-cap" text-anchor="middle">' + esc(t('modC.s5.cap')) + '</text>',
      t('modC.s5.title'));
  }
  /* intake / expenditure / composition share one node diagram */
  return svg(
    '<rect x="16" y="46" width="84" height="46" rx="3" class="d-box' + (kind === 'intake' ? ' accent' : '') + '"/>' +
    '<text x="58" y="73" class="d-t" text-anchor="middle">' + esc(t('modB.s1.label')) + '</text>' +
    '<rect x="120" y="86" width="80" height="6" rx="3" class="d-box"/>' +
    '<rect x="220" y="46" width="84" height="46" rx="3" class="d-box' + (kind === 'expenditure' ? ' accent' : '') + '"/>' +
    '<text x="262" y="73" class="d-t" text-anchor="middle">' + esc(t('modB.s2.label')) + '</text>' +
    '<path d="M100 69 L212 69" class="d-arrow"/>' +
    '<path d="M212 69 L100 69" class="d-arrow"/>' +
    '<path d="M160 92 L160 112" class="d-arrow"/>' +
    '<rect x="108" y="112" width="104" height="30" rx="3" class="d-box' + (kind === 'stored' ? ' accent' : '') + '"/>' +
    '<text x="160" y="131" class="d-t" text-anchor="middle">' + esc(t('modB.s3.label')) + '</text>' +
    '<text x="160" y="26" class="d-cap" text-anchor="middle">' + esc(t('modB.cap')) + '</text>',
    t('modB.title'));
}

/* -------------------------------------------------------- energy model ---
   Numbers the user chooses. Labelled as a teaching model on every render. */
function energyDiagram(focus){
  const bal = ENERGY.intake - ENERGY.expenditure;
  const pct = Math.max(0, Math.min(100, (ENERGY.intake / 4500) * 100));
  const pctOut = Math.max(0, Math.min(100, (ENERGY.expenditure / 4500) * 100));
  let h = '<div class="energy-model">';
  h += '<div class="em-row' + (focus === 'intake' ? ' focus' : '') + '"><label for="emIn">' + esc(t('modB.s1.label')) + '</label>' +
       '<input id="emIn" type="range" min="1000" max="4500" step="50" value="' + ENERGY.intake +
       '" data-in="setEnergy" data-a1="intake" data-t2="v">' +
       '<output class="num" id="emInV">' + ENERGY.intake + '</output></div>';
  h += '<div class="em-bar"><i class="in" style="width:' + pct.toFixed(1) + '%"></i></div>';
  h += '<div class="em-row' + (focus === 'expenditure' ? ' focus' : '') + '"><label for="emOut">' + esc(t('modB.s2.label')) + '</label>' +
       '<input id="emOut" type="range" min="1000" max="4500" step="50" value="' + ENERGY.expenditure +
       '" data-in="setEnergy" data-a1="expenditure" data-t2="v">' +
       '<output class="num" id="emOutV">' + ENERGY.expenditure + '</output></div>';
  h += '<div class="em-bar"><i class="out" style="width:' + pctOut.toFixed(1) + '%"></i></div>';
  h += '<div class="em-result' + (focus === 'stored' ? ' focus' : '') + '"><span class="k">' + esc(t('modB.balance')) + '</span>' +
       '<span class="v num" id="emBal">' + (bal > 0 ? '+' : '') + bal + '</span>' +
       '<span class="u">' + esc(t('modB.balanceUnit')) + '</span></div>';
  h += '<p class="hint mb-0 mt-3"  id="emNote">' +
       esc(bal > 0 ? t('modB.surplus') : bal < 0 ? t('modB.deficit') : t('modB.maintenance')) + '</p>';
  h += '<div class="uncertain mt-3"><b>' + esc(t('mod.model')) + '</b> ' +
       esc(t('mod.modelNote')) + '</div>';
  h += '</div>';
  return h;
}

/* Update the readout without rebuilding the screen, so dragging a slider
   does not fight with re-rendering. */
function paintEnergyReadout(){
  const bal = ENERGY.intake - ENERGY.expenditure;
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('emInV', ENERGY.intake);
  set('emOutV', ENERGY.expenditure);
  set('emBal', (bal > 0 ? '+' : '') + bal);
  const note = document.getElementById('emNote');
  if(note) note.textContent = t(bal > 0 ? 'modB.surplus' : bal < 0 ? 'modB.deficit' : 'modB.maintenance');
  const bars = document.querySelectorAll('.em-bar i');
  if(bars[0]) bars[0].style.width = ((ENERGY.intake / 4500) * 100).toFixed(1) + '%';
  if(bars[1]) bars[1].style.width = ((ENERGY.expenditure / 4500) * 100).toFixed(1) + '%';
}

/* Illustrative recovery window teaching model for Module C. */
function computeRecSimDays(){
  const stimF = 1 + Math.max(-0.25, Math.min(0.60, ((REC_SIM.sets - 3) / 3) * 0.30));
  const intF  = REC_SIM.rir <= 1 ? 1.12 : (REC_SIM.rir >= 4 ? 0.92 : 1.0);
  const slpF  = REC_SIM.sleep < 5 ? 1.30 : REC_SIM.sleep < 6 ? 1.20 : REC_SIM.sleep < 7 ? 1.08 : REC_SIM.sleep > 9 ? 0.96 : 1.0;
  return Math.round(2.5 * stimF * intF * slpF * 10) / 10;
}

function recoverySimDiagram(){
  const days = computeRecSimDays();
  let h = '<div class="energy-model" id="recSimModel">';
  h += '<div class="em-row"><label for="rsSets">' + esc(t('c.sets')) + '</label>' +
       '<input id="rsSets" type="range" min="1" max="8" step="1" value="' + REC_SIM.sets +
       '" data-in="setRecSim" data-a1="sets" data-t2="v">' +
       '<output class="num" id="rsSetsV">' + REC_SIM.sets + '</output></div>';
  h += '<div class="em-row"><label for="rsRir">RIR</label>' +
       '<input id="rsRir" type="range" min="0" max="4" step="1" value="' + REC_SIM.rir +
       '" data-in="setRecSim" data-a1="rir" data-t2="v">' +
       '<output class="num" id="rsRirV">' + REC_SIM.rir + '</output></div>';
  h += '<div class="em-row"><label for="rsSleep">' + esc(t('tl.sleep')) + ' (h)</label>' +
       '<input id="rsSleep" type="range" min="4" max="10" step="0.5" value="' + REC_SIM.sleep +
       '" data-in="setRecSim" data-a1="sleep" data-t2="v">' +
       '<output class="num" id="rsSleepV">' + REC_SIM.sleep + '</output></div>';
  h += '<div class="em-result focus"><span class="k">' + esc(t('body.recovery')) + '</span>' +
       '<span class="v num" id="rsDays">' + days + '</span>' +
       '<span class="u">d</span></div>';
  h += '<div class="uncertain mt-3"><b>' + esc(t('mod.model')) + '</b> ' +
       esc(t('mod.modelNote')) + '</div>';
  h += '</div>';
  return h;
}

function paintRecSimReadout(){
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('rsSetsV', REC_SIM.sets);
  set('rsRirV', REC_SIM.rir);
  set('rsSleepV', REC_SIM.sleep);
  set('rsDays', computeRecSimDays());
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { openModule, closeModule, setModStep, setEnergy, setRecSim, diagramFor };
}
