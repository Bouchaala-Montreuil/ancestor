/* ============================================================================
   ANCESTOR — The Refusal Engine

   Most apps tell you when to train. This one is allowed to say no.

   It is not a rigid rule like "you worked, so you cannot lift". A shift is not
   automatically a prohibition; poor sleep is not proof that a muscle is
   unrecovered. It weighs evidence, escalates cautiously, states its reasons,
   and says plainly when the information is not there to make a confident call.

   Severity ladder (low -> high):
     0 train   1 light   2 caution   3 rest   4 stop
   ========================================================================== */

const SEVERITY = ['train','light','caution','rest','stop'];
const SEV_INDEX = { train:0, light:1, caution:2, rest:3, stop:4 };

function decide(state, exerciseIds, now){
  const p = state.profile || {};
  const reasons = [];
  const uncertainties = [];
  let sev = 0;

  const rec = allRecovery(state, now);

  /* ---------- which muscles does this session touch, and how hard? ------- */
  const involved = {};
  (exerciseIds||[]).forEach(id => {
    const ex = EX_BY_ID[id]; if(!ex) return;
    ex.m.forEach(([m,w]) => { involved[m] = Math.max(involved[m]||0, w); });
  });
  const muscles = Object.keys(involved);

  let minRatio = 1, limiting = null;
  muscles.forEach(m => {
    const r = rec[m];
    if(!r) return;
    const eff = r.ratio;
    if(eff < minRatio){ minRatio = eff; limiting = m; }
  });
  if(!muscles.length){ minRatio = 1; }

  /* ---------- base severity from recovery ------------------------------- */
  if(minRatio >= 1.0)      sev = 0;
  else if(minRatio >= 0.85) sev = 1;
  else if(minRatio >= 0.70) sev = 2;
  else                      sev = 3;

  if(!limiting && muscles.length){
    // Nothing on record for these muscles. Say so rather than showing a
    // confident-looking recommendation backed by nothing.
    reasons.push({ tone:'up', k:'fresh', text: t('rsn.fresh') });
  }
  if(limiting){
    const r = rec[limiting];
    if(r.since === null){
      reasons.push({ tone:'up', k:'fresh', text: t('rsn.fresh') });
      uncertainties.push(t('unc.fewSessions'));
    } else if(r.state === 'ready'){
      reasons.push({ tone:'up', k:'rec',
        text: t('mg.'+limiting) + ' — ' + t('rsn.recovered') + ' (' + r.since + ' d since last exposure)' });
    } else {
      const remTxt = r.daysLeft > 0
        ? (r.daysLeft + ' d remaining')
        : (Math.max(1, Math.round(r.hoursLeft || 1)) + ' h remaining');
      reasons.push({ tone: r.state === 'caution' ? 'warn' : 'down', k:'rec',
        text: t('mg.'+limiting) + ' — ' + t('rsn.' + (r.state === 'caution' ? 'partial' : 'recovering')) +
              ' · ' + remTxt });
    }
  }

  /* ---------- sleep ------------------------------------------------------ */
  const ss = sleepStats(state.sleep, now, 7);
  if(ss.avg === null){
    uncertainties.push(t('unc.noSleep'));
  } else {
    if(ss.avg < 5){
      sev = Math.max(sev, Math.min(4, sev + 2));
      reasons.push({ tone:'down', k:'sleep', text: t('rsn.sleepLow') + ' — ' + round1(ss.avg) + ' h average' });
    } else if(ss.avg < 6){
      sev = Math.max(sev, Math.min(4, sev + 1));
      reasons.push({ tone:'warn', k:'sleep', text: t('rsn.sleepLow') + ' — ' + round1(ss.avg) + ' h average' });
    } else if(ss.avg < 7){
      reasons.push({ tone:'warn', k:'sleep', text: t('rsn.sleepLow') + ' — ' + round1(ss.avg) + ' h average' });
    } else {
      reasons.push({ tone:'up', k:'sleep', text: t('rsn.sleepGood') + ' — ' + round1(ss.avg) + ' h average' });
    }
    const varH = sleepStartVariability(state.sleep, now, 7);
    if(varH !== null && varH > 4 && ss.avg < 7){
      sev = Math.max(sev, Math.min(4, sev + 1));
      reasons.push({ tone:'warn', k:'sleepvar', text: t('rsn.sleepVar') + ' — ~' + round1(varH) + ' h spread' });
    }
  }

  /* ---------- shifts ------------------------------------------------------ */
  const recent = workedWithin(state.shifts, 12, now);
  if(recent.length){
    const last = recent[recent.length-1];
    const sinceEnd = (now - last.range.end)/3600000;
    if(sinceEnd < 0){
      // You are on shift right now. Not a ban — but it is the single most
      // relevant fact about whether you can train in the next hour.
      sev = Math.max(sev, 2);
      reasons.push({ tone:'warn', k:'shift',
        text: t('rsn.shiftRecent') + ' — currently on shift, ends ' + hhmm(last.range.end) });
    } else if(sinceEnd < 8){
      sev = Math.max(sev, Math.min(4, sev + 1));
      reasons.push({ tone:'warn', k:'shift',
        text: t('rsn.shiftRecent') + ' — ended ' + round1(sinceEnd) + ' h ago' });
    }
  }
  const upcoming = nextShift(state.shifts, now, 6);
  if(upcoming){
    reasons.push({ tone:'warn', k:'shiftNext',
      text: t('rsn.shiftImminent') + ' — ' + hhmm(upcoming.range.start) });
  }
  const win = typicalSleepWindow(state.sleep, p);
  const mins = p.sessionMinutes || 45;
  if(win && intrudesOnSleep(win, now, mins, 1.5)){
    sev = Math.max(sev, Math.min(4, sev + 1));
    reasons.push({ tone:'warn', k:'sleepwin', text: t('rsn.sleepWindow') });
  }
  if((p.shiftType === 'night' || p.shiftType === 'rotating') && !state.shifts.length){
    uncertainties.push(t('unc.noShift'));
  }

  /* ---------- what the user reported -------------------------------------- */
  const feel = latestFeeling();
  if(feel && (now - feel.date) < 36*3600000){
    const s = +feel.soreness||0, j = +feel.joint||0, f = +feel.fatigue||0, i = +feel.illness||0;
    if(i >= 1){
      sev = 4;
      reasons.push({ tone:'down', k:'illness', text: t('rsn.illness') });
    }
    if(j >= 3){
      sev = 4;
      reasons.push({ tone:'down', k:'joint', text: t('rsn.pain') });
    } else if(j === 2){
      sev = Math.max(sev, Math.min(4, sev + 1));
      reasons.push({ tone:'warn', k:'joint', text: t('rsn.pain') });
    }
    if(s >= 3){ sev = Math.max(sev, Math.min(4, sev + 2)); reasons.push({ tone:'down', k:'sore', text: t('rsn.soreness') }); }
    else if(s === 2){ sev = Math.max(sev, Math.min(4, sev + 1)); reasons.push({ tone:'warn', k:'sore', text: t('rsn.soreness') }); }
    if(f >= 3){ sev = Math.max(sev, Math.min(4, sev + 2)); reasons.push({ tone:'down', k:'fat', text: 'Fatigue reported as severe' }); }
    else if(f === 2){ sev = Math.max(sev, Math.min(4, sev + 1)); reasons.push({ tone:'warn', k:'fat', text: 'Fatigue reported as moderate' }); }
  }

  /* ---------- performance ------------------------------------------------- */
  const tr = overallTrend(state, 21, now);
  if(tr === 'down' && minRatio < 1){
    sev = Math.max(sev, Math.min(4, sev + 1));
    reasons.push({ tone:'warn', k:'perf', text: t('rsn.perfDown') });
  } else if(tr === 'up'){
    reasons.push({ tone:'up', k:'perf', text: t('rsn.perfUp') });
  } else if(tr === 'flat' && state.sessions.length >= 4){
    reasons.push({ tone:'warn', k:'perf', text: t('rsn.perfFlat') });
  }

  /* ---------- uncertainty -------------------------------------------------- */
  if(state.sessions.length < 3) uncertainties.push(t('unc.fewSessions'));
  if(limiting){
    const obs = rec[limiting] ? rec[limiting].observations : 0;
    if(obs < 3 && state.sessions.length >= 1) uncertainties.push(t('unc.estimate'));
  }

  /* ---------- cap and package ---------------------------------------------- */
  sev = Math.max(0, Math.min(4, sev));
  let key = SEVERITY[sev];
  // A muscle under 0.70 readiness can never be "train"
  if(minRatio < 0.70 && sev < 3) { sev = 3; key = 'rest'; }

  const out = {
    state: key,
    severity: sev,
    ratio: minRatio < 1 ? Math.min(0.99, round2(minRatio)) : round2(minRatio),
    limitingMuscle: limiting,
    muscles: muscles,
    recovery: rec,
    reasons: reasons,
    uncertainties: dedupe(uncertainties),
    action: actionFor(key)
  };
  return out;
}

function actionFor(key){
  if(key === 'train')   return { kind:'start',   label: t('btn.start') };
  if(key === 'light')   return { kind:'start',   label: t('btn.start') };
  if(key === 'caution') return { kind:'review',  label: t('home.correct') };
  if(key === 'rest')    return { kind:'rest',    label: t('home.logsleep') };
  return                       { kind:'stop',    label: t('state.stop') };
}

function stateTitle(key){
  return t('state.' + (key === 'train' ? 'ready' : key === 'light' ? 'light' : key === 'caution' ? 'caution' : key === 'rest' ? 'rest' : 'stop'));
}
function stateBody(key){
  return t('state.' + (key === 'train' ? 'ready' : key === 'light' ? 'light' : key === 'caution' ? 'caution' : key === 'rest' ? 'rest' : 'stop') + '.d');
}
function stateClass(key){
  return key === 'train' ? 's-ready' : key === 'light' ? 's-light' : key === 'caution' ? 's-caution' : key === 'rest' ? 's-rest' : 's-rest';
}

function dedupe(arr){ const s = {}; const o = []; arr.forEach(x => { if(!s[x]){ s[x]=1; o.push(x); } }); return o; }
/* round1 lives in recovery.js, which loads first: it is the engine layer's
   numeric helper, and a second copy here was silently shadowing it. */
function round2(v){ return Math.round(v*100)/100; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { decide, SEVERITY, actionFor };
}
