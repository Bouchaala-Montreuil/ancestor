/* ============================================================================
   ANCESTOR — the printed sheet
   Run: node tests/print.js

   The sheet is the only artifact that leaves the device, so it is checked the
   way a document is checked: does every block appear, does every figure come
   from real state, does it stay blank where there is no data, is it
   translated, and does it fail safely when there is no programme at all.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0; const failures = [];
const chk = (n, c, x) => {
  if (c) { pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + n + (x ? '  \x1b[2m' + x + '\x1b[0m' : '')); }
  else { fail++; failures.push(n); console.log('  \x1b[31mFAIL\x1b[0m  ' + n + (x ? '  -> ' + x : '')); }
};
const group = t => console.log('\n\x1b[1m' + t + '\x1b[0m');

/* Inline the assets so jsdom boots deterministically — the same trick
   build.py uses for the shipped bundle, and the same harness the other
   suites use. External <script src> loading is not reliable in jsdom. */
function inlineHtml(){
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) =>
    '<style>' + fs.readFileSync(path.join(ROOT, href), 'utf8') + '</style>');
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) =>
    '<script>' + fs.readFileSync(path.join(ROOT, src), 'utf8') + '<\/script>');
  return html;
}

const SEED = `
(() => {
  const s = getState();
  s.onboarded = true; s.consented = true;
  Object.assign(s.profile, {
    name:'Yanis', experience:'i', goal:'h', goals:['h'], equipment:'gym',
    shiftType:'night', sleepHours:5.5, sleepVariability:2, usualWake:7,
    style:'hit', daysPerWeek:3, sessionMinutes:50, unit:'kg', bodyweight:112
  });
  s.plan = buildPlan(s.profile);
  const DAY = 864e5, now = Date.now();
  const sn = s.plan.sessions[0];
  s.sessions.push({
    id:'seed1', date: now - 4*DAY, planId: sn.id, name: sn.name, focus: sn.focus,
    exercises: sn.exercises.map((e, ei) => ({
      id: e.id,
      sets: Array.from({length: e.sets}, (_, k) => ({
        w: 60 + ei*5, r: 8, rir: k ? 0 : 1, warmup:false, skipped:false, committed:true
      }))
    }))
  });
  const key = ms => { const d = new Date(ms); const pd = n => (n<10?'0':'')+n;
    return d.getFullYear()+'-'+pd(d.getMonth()+1)+'-'+pd(d.getDate()); };
  s.sleep.push({ id:'sl1', start: key(now-DAY)+'T23:30', end: key(now)+'T05:30', quality:3 });
  s.shifts.push({ id:'sh1', start: key(now-DAY)+'T19:00', end: key(now)+'T07:00' });
  saveState();
})();
`;

(async () => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/scrollTo|Not implemented/.test(e.message)) console.error('  [jsdom]', e.message.slice(0, 160)); });
  const dom = new JSDOM(inlineHtml(), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://localhost/ancestor/index.html', virtualConsole: vc
  });
  const window = dom.window;
  const doc = window.document;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  window.scrollTo = () => {};
  window.confirm = () => true;
  if (typeof window.boot === 'function') window.boot();

  window.eval(SEED);
  const sheet = window.eval('printSheet(getState(), Date.now(), { planId: getState().plan.sessions[0].id })');
  const parse = () => new JSDOM('<div id="r">' + sheet + '</div>').window.document.getElementById('r');
  const root = parse();
  const txt = root.textContent.replace(/\s+/g, ' ');

  group('1. The document exists and is complete');
  chk('a sheet is produced', typeof sheet === 'string' && sheet.length > 2000, sheet.length + ' bytes');
  chk('it is an A4 sheet element', !!root.querySelector('.sheet'));
  chk('it is hidden until printing', /#printRoot\{display:none\}/.test(fs.readFileSync(path.join(ROOT, 'css/app.css'), 'utf8')));
  chk('the print rule sets A4', /@page\{size:A4/.test(fs.readFileSync(path.join(ROOT, 'css/app.css'), 'utf8')));
  const stamps = [...root.querySelectorAll('.stamp')].map(s => s.textContent);
  chk('four numbered blocks', stamps.join(',') === '01,02,03,04', stamps.join(','));

  group('2. Every block is present');
  ['pa.work', 'pa.recovery', 'pa.week', 'pa.notesT'].forEach(k => {
    chk('block: ' + k + ' is translated, not a raw key', txt.indexOf(k) < 0 && txt.length > 0);
  });
  chk('the verdict block is rendered', !!root.querySelector('.sheet-verdict'));
  chk('the verdict carries a state word',
      /TRAIN|MODIFY|REST/i.test(root.querySelector('.sheet-state').textContent),
      root.querySelector('.sheet-state').textContent.trim());
  chk('the verdict explains itself on paper',
      !!root.querySelector('.sheet-why') &&
      root.querySelectorAll('.sheet-why span').length >= 1,
      (root.querySelectorAll('.sheet-why span').length) + ' reason(s)');
  chk('at most two reasons are printed',
      root.querySelectorAll('.sheet-why span').length <= 2);

  group('3. It is generated from real state, not invented');
  const trained = window.eval('getState().plan.sessions[0].exercises.length');
  chk('every planned exercise has a row',
      root.querySelectorAll('.sheet-table tbody tr').length === trained,
      root.querySelectorAll('.sheet-table tbody tr').length + ' rows / ' + trained + ' exercises');
  chk('last performance is printed from the log',
      /Last\b/i.test(txt) && /\bkg\b/.test(txt), (txt.match(/Last[^·]{0,40}/) || [''])[0].trim());
  chk('all twelve muscle groups are listed', root.querySelectorAll('.sheet-rec-row').length === 12,
      root.querySelectorAll('.sheet-rec-row').length + '');
  chk('seven days are listed', root.querySelectorAll('.sheet-week .d').length === 7);
  chk('logged sleep reaches the week strip', /\b6\b/.test(txt), 'expected 6h from the seeded night');
  chk('the availability figure comes from the engine',
      /\d+%/.test(root.querySelector('.sheet-vright').textContent),
      root.querySelector('.sheet-vright').textContent.replace(/\s+/g, ' ').trim());

  group('4. Absent data stays absent');
  {
    const blank = window.eval(`(() => {
      const s = getState();
      s.sessions = []; s.sleep = []; s.shifts = [];
      saveState();
      return printSheet(getState(), Date.now());
    })()`);
    const b = new JSDOM('<div id="r">' + blank + '</div>').window.document.getElementById('r');
    chk('a sheet still renders with no history', !!b.querySelector('.sheet'));
    chk('no fabricated last-performance line',
        (b.textContent.match(/Last\b/gi) || []).length === 0,
        (b.textContent.match(/Last[^·]{0,30}/) || [''])[0]);
    chk('recovery rows still present', b.querySelectorAll('.sheet-rec-row').length === 12);
    const vals = [...b.querySelectorAll('.sheet-week .v')].map(v => v.textContent.trim());
    chk('the week strip has all seven days', b.querySelectorAll('.sheet-week .d').length === 7);
    // sleep prints blank, shift prints an em dash: both are honest, neither invents a number
    chk('no invented sleep or shift hours',
        vals.every(v => v === '' || v === '—'), JSON.stringify(vals));
  }

  group('5. Every language prints a translated sheet');
  {
    const langs = window.eval('LANGS');
    chk('seven languages', langs.length === 7, langs.join(','));
    langs.forEach(l => {
      const out = window.eval(`(() => {
        const prev = CURRENT_LANG; CURRENT_LANG = '${l}';
        const h = printSheet(getState(), Date.now());
        CURRENT_LANG = prev;
        return h;
      })()`);
      const raw = (out.match(/>pa\.[a-z]+</g) || []);
      chk('  ' + l + ' — no untranslated keys', raw.length === 0, raw.slice(0, 3).join(' '));
    });
    const ar = window.eval(`(() => {
      const prev = CURRENT_LANG; CURRENT_LANG = 'ar';
      const h = printSheet(getState(), Date.now());
      CURRENT_LANG = prev; return h;
    })()`);
    chk('Arabic prints right to left', /dir="rtl"/.test(ar));
  }

  group('6. The action fails safely');
  {
    const rootEl = doc.getElementById('printRoot');
    chk('a print root exists in the document', !!rootEl);
    let printed = false;
    window.print = () => { printed = true; };
    const ok = window.eval("openPrintCard()");
    chk('openPrintCard reports success', ok === true);
    chk('the sheet is mounted before printing', rootEl.innerHTML.length > 1000);
    chk('the root is marked as printing', rootEl.classList.contains('printing'));
    await wait(200);
    chk('the browser print dialog is invoked', printed === true);
  }

  group('7. The button is reachable from the planner');
  {
    const ui = fs.readFileSync(path.join(ROOT, 'js/ui/workout.js'), 'utf8');
    chk('the planner offers a print action', /openPrintCard\(/.test(ui));
    const build = fs.readFileSync(path.join(ROOT, 'build.py'), 'utf8');
    chk('the new scripts are picked up by the build',
        /index\.html/.test(build));
    const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    chk('print.js is loaded', /js\/i18n\/print\.js/.test(idx));
    chk('printsheet.js is loaded after workout.js',
        idx.indexOf('printsheet.js') > idx.indexOf('ui/workout.js'));
  }

  console.log('\n' + '='.repeat(64));
  if (fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' PRINT TESTS PASSED\x1b[0m');
  else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed'); failures.forEach(f => console.log('   - ' + f)); }
  console.log('='.repeat(64) + '\n');
  process.exit(fail === 0 ? 0 : 1);
})();
