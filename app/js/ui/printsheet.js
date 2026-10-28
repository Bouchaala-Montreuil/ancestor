/* ============================================================================
   ANCESTOR — the printed sheet

   A real A4 page, generated from the same state the screens read: the selected
   day's programme, the recovery estimate per muscle, the sleep and shift log.
   It is the paper arm of the product — the place where the tally mark stops
   being a logo and becomes the mechanism you actually count with.

   Design rules it inherits from the app:
     · black on white only, so it photocopies and costs nothing
     · the verdict is the only inverted block
     · every block is numbered with a stamp, like a dossier
     · nothing is invented: where there is no data, the sheet stays blank and
       the field is there for a pen

   Everything here is a pure function of (state, now) so the same log always
   prints the same sheet.
   ========================================================================== */

/* ------------------------------------------------------------ THE MARK
   Same six numbers as design/build-marks.js. One drawing, two languages. */
const PRINT_MARK = { margin: 3.2, stroke: 2.4, y0: 4.2, y1: 19.8, angle: -16, len: 19.4 };

function printTallyPaths(){
  const g = PRINT_MARK;
  const span = 24 - g.margin * 2;
  const gap = (span - g.stroke * 4) / 3;
  let s = '';
  for (let i = 0; i < 4; i++) {
    const x = g.margin + i * (g.stroke + gap);
    s += '<rect x="' + x.toFixed(2) + '" y="' + g.y0 + '" width="' + g.stroke +
         '" height="' + (g.y1 - g.y0).toFixed(1) + '"/>';
  }
  s += '<rect x="' + (12 - g.len / 2).toFixed(2) + '" y="' + (12 - g.stroke / 2).toFixed(2) +
       '" width="' + g.len + '" height="' + g.stroke +
       '" transform="rotate(' + g.angle + ' 12 12)"/>';
  return s;
}

function printTally(size, cls){
  return '<svg class="' + (cls || 'sheet-mark') + '" viewBox="0 0 24 24" width="' + size +
         '" height="' + size + '" aria-hidden="true"><g fill="currentColor">' +
         printTallyPaths() + '</g></svg>';
}

/* An empty stroke group: the outline you count into with a pen. */
function printTallyEmpty(size){
  const g = PRINT_MARK;
  const span = 24 - g.margin * 2;
  const gap = (span - g.stroke * 4) / 3;
  let s = '';
  for (let i = 0; i < 4; i++) {
    const x = g.margin + i * (g.stroke + gap);
    s += '<rect x="' + x.toFixed(2) + '" y="' + g.y0 + '" width="' + g.stroke +
         '" height="' + (g.y1 - g.y0).toFixed(1) +
         '" fill="none" stroke="currentColor" stroke-width="0.55"/>';
  }
  return '<svg class="sheet-tally-empty" viewBox="0 0 24 24" width="' + size + '" height="' +
         size + '" aria-hidden="true"><g>' + s + '</g></svg>';
}

/* --------------------------------------------------------------- HELPERS */

/* The last time this exercise was performed, and what it looked like.
   Returns null when there is no history — the sheet then leaves the row alone
   rather than printing a guess. */
function printLastDone(state, exId){
  const sessions = (state.sessions || []).slice().sort((a, b) => (b.date || 0) - (a.date || 0));
  for (let i = 0; i < sessions.length; i++) {
    const ex = (sessions[i].exercises || []).filter(e => e.id === exId)[0];
    if (!ex) continue;
    const set = (ex.sets || []).filter(s => !s.skipped && !s.warmup)[0];
    if (!set) continue;
    return { date: sessions[i].date, text: formatSet(set, EX_BY_ID[exId], state.profile) };
  }
  return null;
}

/* Sleep that ended on this bio-day, in hours. Null when nothing was logged. */
function printSleepFor(state, dayStart, dayEnd){
  let total = null;
  (state.sleep || []).forEach(r => {
    const rng = sleepRange(r);
    if (!rng) return;
    if (rng.end >= dayStart && rng.end < dayEnd) total = (total || 0) + rng.hours;
  });
  return total === null ? null : Math.round(total * 10) / 10;
}

/* The shift that started on this bio-day, as a short label, or null. */
function printShiftFor(state, dayStart, dayEnd){
  let found = null;
  (state.shifts || []).forEach(r => {
    const rng = shiftRange(r);
    if (!rng) return;
    if (rng.start >= dayStart && rng.start < dayEnd) {
      const h = (rng.end - rng.start) / 3600000;
      found = { hours: Math.round(h * 10) / 10 };
    }
  });
  return found;
}

/* ---------------------------------------------------------------- THE SHEET
   opts.planId  which split day to print (defaults to the recommended one)
   opts.now     clock, injectable for tests
   ------------------------------------------------------------------------ */
function printSheet(state, now, opts){
  const o = opts || {};
  now = now || Date.now();
  const p = state.profile || {};
  const plan = state.plan;
  if (!plan || !plan.sessions || !plan.sessions.length) {
    return '<div class="sheet sheet-empty"><p class="sheet-cap">' + esc(t('pa.noPlan')) + '</p></div>';
  }

  const recommended = nextSession(state, now);
  const sessions = plan.sessions;
  let day = sessions.filter(x => x.id === o.planId)[0] || (recommended && recommended.session) || sessions[0];
  const dayIndex = sessions.indexOf(day);

  const exIds = (day.exercises || []).map(e => e.id);
  const d = decide(state, exIds, now);
  const shown = displayState(d.state);
  const pct = Math.max(0, Math.min(100, Math.round((d.ratio || 0) * 100 / 5) * 5));
  const minutes = estimatedMinutes(day, plan.restSec);
  const rec = allRecovery(state, now);

  const rtl = (typeof RTL_LANGS !== 'undefined') && RTL_LANGS.indexOf(CURRENT_LANG) >= 0;
  const wakeAnchor = (p.usualWake != null) ? p.usualWake : 4;
  const todayStart = bioDayStart(now, wakeAnchor);

  /* A session can hold eight exercises: seven patterns for a 70-minute day
     plus the emphasis top-up. At the roomy rhythm that runs 16 mm past the
     bottom of the A4 page — a second sheet with only the footer on it. The
     longest days print at a tighter rhythm instead of spilling. */
  const tight = (day.exercises || []).length >= 7;

  let h = '';
  h += '<div class="sheet' + (tight ? ' sheet-tight' : '') +
       '" dir="' + (rtl ? 'rtl' : 'ltr') + '">';

  /* ------------------------------------------------------------- header */
  h += '<div class="sheet-rule"></div>';
  h += '<div class="sheet-head">' +
       '<div class="sheet-brand">' + printTally(26) +
         '<div><b class="sheet-word">' + esc(t('app.name')) + '</b>' +
         '<span class="sheet-cap">' + esc(t('pa.record')) + '</span></div>' +
       '</div>' +
       '<div class="sheet-meta">' + esc(t('pa.printed')) + '<br>' +
         esc(dateLabel(now)) + '<br>' + esc(t('pa.unit')) + ' ' + esc(p.unit || 'kg') +
       '</div></div>';
  h += '<div class="sheet-rule thin"></div>';

  /* ------------------------------------------------------------ fill in */
  h += '<div class="sheet-fill">' +
       ['pa.date', 'pa.start', 'pa.end', 'pa.bw', 'pa.feel'].map(k =>
         '<div><span>' + esc(t(k)) + '</span><i></i></div>').join('') +
       '</div>';

  /* -------------------------------------------------------------- title */
  h += '<div class="sheet-title">' +
       '<h1>' + esc(day.name) + '</h1>' +
       '<div class="sheet-meta">' +
         esc(t('pa.session')) + ' ' + (dayIndex + 1) + ' ' + esc(t('pa.of')) + ' ' + sessions.length + '<br>' +
         esc(t('onb.style.' + (p.style || 'std'))) + ' · ' + esc(t('pa.rest')) + ' ' +
         (plan.restSec || 120) + 's<br>' +
         (recommended && recommended.session && recommended.session.id === day.id
            ? esc(t('plan.recommended')) : esc(t('session.planned'))) +
       '</div></div>';

  /* ------------------------------------------------------------ verdict */
  /* The reasons matter more on paper than on screen: a sheet that says
     MODIFY with no explanation is a sheet you ignore. Two lines, no more. */
  let why = '';
  if (d.reasons && d.reasons.length) {
    why = '<div class="sheet-why">' + d.reasons.slice(0, 2).map(r =>
      '<span>' + esc(r.text) + '</span>').join('') + '</div>';
  }
  h += '<div class="sheet-verdict s-' + shown + '">' +
       '<div><span class="sheet-lab">' + esc(t('decision.label')) + '</span>' +
       '<div class="sheet-state">' + esc(t('decision.' + shown)) + '</div>' +
       why + '</div>' +
       '<div class="sheet-vright"><b>' + pct + '%</b>' +
       esc(t('readiness.label')) + '<br>~' + minutes + ' min<br>RIR ' +
       esc(String((day.exercises[0] && day.exercises[0].rir) || 0)) +
       '</div></div>';

  /* ---------------------------------------------------------- 01 the work */
  const maxSets = (day.exercises || []).reduce((a, e) => Math.max(a, e.sets || 0), 0);
  h += '<div class="sheet-block">';
  h += '<div class="sheet-bh"><span class="stamp">01</span><h2>' + esc(t('pa.work')) + '</h2>' +
       '<span class="rule"></span><span class="sheet-cap">' + esc(t('pa.workNote')) + '</span></div>';
  h += '<table class="sheet-table"><thead><tr>' +
       '<th class="c-idx">#</th><th>' + esc(t('pa.exercise')) + '</th>' +
       '<th>' + esc(t('pa.target')) + '</th><th>' + esc(t('pa.tempo')) + '</th>' +
       '<th>' + esc(t('pa.load')) + '</th><th>' + esc(t('pa.reps')) + '</th>' +
       '<th class="c-rir">' + esc(t('pa.rir')) + '</th><th>' + esc(t('pa.notes')) + '</th>' +
       '</tr></thead><tbody>';

  (day.exercises || []).forEach((e, i) => {
    const ex = EX_BY_ID[e.id];
    const last = printLastDone(state, e.id);
    const range = ex ? targetRangeText(ex) : (e.reps ? e.reps[0] + '–' + e.reps[1] : '');
    const unit = ex ? exTargetRange(ex).unit : 'reps';
    /* A hold or a carry is not prescribed a lifting cadence: printing
       "4 · 0 · 4" next to a 40-second plank would be inventing instruction. */
    const tempo = (unit === 'time' || unit === 'distance') ? '—' : '4 · 0 · 4';
    h += '<tr>' +
         '<td class="c-idx">' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</td>' +
         '<td class="c-name">' + esc(t('ex.' + e.id)) +
           '<small>' + (last
              ? esc(t('pa.last')) + ' ' + esc(dateLabel(last.date)) + ' · ' + esc(last.text)
              : esc(t('pa.rest')) + ' ' + (plan.restSec || 120) + 's') + '</small></td>' +
         '<td class="c-mono">' + esc(e.sets + ' × ' + range) + '</td>' +
         '<td class="c-mono">' + esc(tempo) + '</td>' +
         '<td><span class="box"></span></td>' +
         '<td><span class="box"></span></td>' +
         '<td class="c-rir"><span class="box rir"></span></td>' +
         '<td><span class="box"></span></td>' +
         '</tr>';
  });
  if (!(day.exercises || []).length) {
    h += '<tr><td colspan="8" class="c-mono">' + esc(t('pa.noPlan')) + '</td></tr>';
  }
  h += '</tbody></table>';
  h += '<div class="sheet-legend"><span>' + esc(t('pa.legendLoad')) + '</span>' +
       '<span>' + esc(t('pa.legendRir')) + '</span>' +
       '<span>' + esc(t('pa.legendTempo')) + '</span></div>';
  h += '</div>';

  /* ------------------------------------------------------ 02 recovery ledger */
  h += '<div class="sheet-block">';
  h += '<div class="sheet-bh"><span class="stamp">02</span><h2>' + esc(t('pa.recovery')) + '</h2>' +
       '<span class="rule"></span><span class="sheet-cap">' + esc(t('pa.recNote')) + '</span></div>';
  h += '<div class="sheet-rec">';
  MUSCLES.forEach(m => {
    const r = rec[m];
    const left = (r && r.since !== null) ? r.daysLeft : 0;
    const ready = !(left >= 1);
    const frac = r && r.since !== null ? Math.max(0, Math.min(1, 1 - (r.daysLeft / (r.days || 1)))) : 1;
    h += '<div class="sheet-rec-row' + (ready ? '' : ' rest') + '">' +
         '<span class="n">' + esc(t('mg.' + m)) + '</span>' +
         '<span class="scale"><i style="width:' + Math.round(frac * 100) + '%"></i></span>' +
         '<span class="d">' + (ready ? esc(t('pa.ready'))
                                     : esc(t('pa.daysLeft', { n: Math.round(left) }))) +
         '</span></div>';
  });
  h += '</div></div>';

  /* ------------------------------------------------------------ 03 week */
  h += '<div class="sheet-block">';
  h += '<div class="sheet-bh"><span class="stamp">03</span><h2>' + esc(t('pa.week')) + '</h2>' +
       '<span class="rule"></span><span class="sheet-cap">' + esc(t('pa.hrs')) + ' · ' +
       esc(t('pa.shift')) + '</span></div>';
  h += '<div class="sheet-week">';
  for (let i = 6; i >= 0; i--) {
    const dStart = todayStart - i * 86400000;
    const dEnd = dStart + 86400000;
    const hours = printSleepFor(state, dStart, dEnd);
    const shift = printShiftFor(state, dStart, dEnd);
    h += '<div class="d"><b>' + esc(dayLabel(dStart)) + '</b>' +
         '<span class="k">' + esc(t('pa.hrs')) + '</span>' +
         '<span class="v">' + (hours === null ? '&nbsp;' : hours + 'h') + '</span>' +
         '<span class="k">' + esc(t('pa.shift')) + '</span>' +
         '<span class="v">' + (shift ? shift.hours + 'h' : '—') + '</span></div>';
  }
  h += '</div></div>';

  /* ----------------------------------------------------------- 04 notes */
  h += '<div class="sheet-block">';
  h += '<div class="sheet-bh"><span class="stamp">04</span><h2>' + esc(t('pa.notesT')) + '</h2>' +
       '<span class="rule"></span><span class="sheet-cap">' + esc(t('pa.notesNote')) + '</span></div>';
  h += '<div class="sheet-notes"><i></i><i></i><i></i></div>';
  h += '</div>';

  /* ------------------------------------------------------------ footer */
  h += '<div class="sheet-foot">';
  h += '<div class="sheet-foot-top">' +
       '<div class="sheet-tally-wrap"><span class="sheet-cap">' + esc(t('pa.tally')) + '</span>' +
       '<div class="sheet-tallies">' +
         printTally(22) + printTally(22) +
         printTallyEmpty(22) + printTallyEmpty(22) + printTallyEmpty(22) +
       '</div>' +
       '<span class="sheet-note">' + esc(t('pa.tallyNote')) + '</span></div>' +
       '<div class="sheet-sign"><div><i></i><span>' + esc(t('pa.bw')) + '</span></div>' +
       '<div><i></i><span>' + esc(t('pa.sign')) + '</span></div></div>' +
       '</div>';
  h += '<div class="sheet-fine">' + esc(t('app.name')) + ' · ' + esc(t('pa.estimate')) + '</div>';
  h += '</div>';

  h += '</div>';
  return h;
}

/* ------------------------------------------------------------- THE ACTION
   Fill #printRoot, print, then empty it again. Printing is synchronous in most
   browsers but not all, so the cleanup is deferred to afterprint with a timer
   as a fallback. If the sheet fails for any reason the app must not be left
   with a hidden print root holding stale markup. */
function openPrintCard(planId){
  const root = document.getElementById('printRoot');
  if (!root) return false;
  let html = '';
  try {
    html = printSheet(getState(), Date.now(), { planId: planId });
  } catch (e) {
    html = '<div class="sheet sheet-empty"><p class="sheet-cap">' +
           esc(t('pa.noPlan')) + '</p></div>';
  }
  root.innerHTML = html;

  let cleared = false;
  const clear = () => {
    if (cleared) return;
    cleared = true;
    root.innerHTML = '';
    root.classList.remove('printing');
    window.removeEventListener('afterprint', clear);
  };
  root.classList.add('printing');
  window.addEventListener('afterprint', clear);
  setTimeout(() => {
    try {
      if (typeof window.print === 'function') window.print();
    } catch (e) {}
    // Give the print dialog the document before clearing the fallback.
    setTimeout(clear, 30000);
  }, 60);
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { printSheet, openPrintCard, printTally, printTallyEmpty,
                     printLastDone, printSleepFor, printShiftFor };
}
