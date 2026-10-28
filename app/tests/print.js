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

  /* The sheet shares its class name with the modal bottom sheet, and for a
     long time that was the whole bug: the modal's position:fixed, its 88 vh
     clamp, its scroll box and its 2 px border applied to the paper too. The
     page printed pinned to the bottom of a paginated document, cut off at 88 %
     of the viewport. A string check is crude, but it is the only one that runs
     without a browser, and it names the four properties that must be undone. */
  group('7. Paper is not a bottom sheet');
  {
    const css = fs.readFileSync(path.join(ROOT, 'css/app.css'), 'utf8');
    const block = (css.match(/#printRoot \.sheet\{[\s\S]*?\n\}/) || [''])[0];
    chk('the print rule overrides the modal rather than inheriting it', block.length > 200, block.length + ' chars');
    ['position:static', 'max-height:none', 'overflow:visible', 'border-top:0', 'inset:auto', 'animation:none']
      .forEach(prop => {
        chk('  #printRoot .sheet sets ' + prop, block.indexOf(prop) >= 0);
      });
    const modalStart = css.indexOf('\n.sheet{');
    const modal = css.slice(modalStart, css.indexOf('}', modalStart));
    chk('the modal still owns its own geometry', /position:fixed/.test(modal) && /max-height:88vh/.test(modal));
    chk('the sheet still names a page size', /#printRoot \.sheet\{[^}]*width:210mm/.test(block) && /min-height:297mm/.test(block));
  }

  /* Eight exercises is the longest day the planner writes (seven patterns for
     a 70-minute session plus the emphasis top-up). Measured in Chromium that
     sheet runs 16 mm past the bottom of the paper at the roomy rhythm, so the
     long days get a tighter one. The class is what decides it; the browser
     suite measures the result. */
  group('8. The longest day still prints on one sheet');
  {
    const css = fs.readFileSync(path.join(ROOT, 'css/app.css'), 'utf8');
    const tight = /#printRoot \.sheet\.sheet-tight \.sheet-table td\{[^}]*padding:1mm/.test(css) &&
                  /#printRoot \.sheet\.sheet-tight \.sheet-block\{/.test(css) &&
                  /#printRoot \.sheet\.sheet-tight \.sheet-notes i\{/.test(css);
    chk('a tight rhythm exists for the long sessions', tight);
    const wide = window.eval(`(() => {
      const s = getState(); const sn = s.plan.sessions[0];
      const n = sn.exercises.length;
      const out = {};
      [6, 7, 8].forEach(count => {
        sn.exercises = sn.exercises.slice();
        const pool = ['leg-press','cable-row','db-ohp','bb-curl','lat-pulldown','plank'];
        while(sn.exercises.length < count) sn.exercises.push({ id: pool[sn.exercises.length % pool.length], sets: 3, reps: [8,12], rir: 2 });
        while(sn.exercises.length > count) sn.exercises.pop();
        const h = printSheet(s, Date.now(), { planId: sn.id });
        out[count] = {
          tight: /class="sheet sheet-tight"/.test(h),
          rows: (h.match(/<tr>/g) || []).length
        };
      });
      return { out, original: n };
    })()`);
    chk('six exercises keep the roomy rhythm',
        wide.out[6].tight === false && wide.out[6].rows === 7,
        'rows=' + wide.out[6].rows + ' (6 + header)');
    chk('seven exercises switch to the tight rhythm',
        wide.out[7].tight === true && wide.out[7].rows === 8);
    chk('eight exercises — the planner maximum — are still one sheet',
        wide.out[8].tight === true && wide.out[8].rows === 9);
    chk('the tight class is on the sheet, not on the app',
        !/class="sheet-tight"/.test(window.eval('printSheet(getState(), Date.now(), {})')));
  }

  group('9. The button is reachable from the planner');
  {
    const ui = fs.readFileSync(path.join(ROOT, 'js/ui/workout.js'), 'utf8');
    chk('the planner offers a print action', /openPrintCard\(/.test(ui));
    const screens = fs.readFileSync(path.join(ROOT, 'js/ui/screens.js'), 'utf8');
    chk('the Today verdict offers a print action', /openPrintCard\(/.test(screens));
    chk('Today prints the session the verdict is about',
        /openPrintCard\(\s*' \+/.test(screens) || /next\.session\.id/.test(screens));
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
