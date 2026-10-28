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

  /* The other half of the sheet: a session that is already in the log. It is
     the same document with the ink on it, and the things it may never do are
     claim a recommendation after the fact, grade the person against a plan
     that was rebuilt since, or dress a partial session as a complete one. */
  group('9. A session in the log prints as a record, not as a form');
  {
    /* A session that came from a plan day and carried its own prescription,
       with one exercise cut short and one set skipped. */
    const recId = window.eval(`(() => {
      const s = getState();
      const sn = s.plan.sessions[0];
      const DAY = 864e5, now = Date.now();
      const rec = { id:'rec-t1', date: now - 2*DAY, startedAt: now - 2*DAY - 3600e3,
        durationMs: 62*60000, planId: sn.id, name: sn.name, exercises: [] };
      sn.exercises.forEach((e, ei) => {
        const entry = { id: e.id, plan: { sets: e.sets, reps: e.reps.slice(), rir: e.rir }, sets: [] };
        for (let k = 0; k < e.sets; k++) entry.sets.push({ w: 60 + ei*5, r: 8, rir: k ? 0 : 1,
          warmup:false, skipped:false, committed:true });
        /* The seeded profile is HIT — one set per exercise — so "cut short" is
           a skipped set and a second one that never happened. */
        if (ei === 0) { entry.sets[0].skipped = true; }
        if (ei === 1) entry.sets.push({ w:null, r:null, warmup:false, skipped:true });
        entry.sets.push({ w: 40, r: 5, warmup: true });  /* a warm-up is not a working set */
        if (ei === 0) entry.note = 'left shoulder felt fine';
        rec.exercises.push(entry);
      });
      s.sessions.push(rec);
      saveState();
      return rec.id;
    })()`);
    const rec = window.eval(`printSheet(getState(), Date.now(), { sessionId: '${recId}' })`);
    const rroot = new JSDOM('<div id="r">' + rec + '</div>').window.document.getElementById('r');
    const formHtml = window.eval('printSheet(getState(), Date.now(), {})');

    chk('it is the same sheet: four numbered blocks',
        [...rroot.querySelectorAll('.stamp')].map(x => x.textContent).join(',') === '01,02,03,04');
    chk('the header says this is a record, not a blank form',
        /Session record/i.test(rroot.querySelector('.sheet-cap').textContent) &&
        !/one sheet per session/i.test(rroot.textContent));
    chk('the fill-in row is answered by the log, not left blank',
        /\d\d:\d\d/.test(rroot.querySelector('.sheet-fill').textContent),
        rroot.querySelector('.sheet-fill').textContent.replace(/\s+/g, ' ').trim().slice(0, 70));
    chk('…and "feel" stays empty, because no one logged it',
        rroot.querySelectorAll('.sheet-fill i')[4].textContent.trim() === '');
    chk('the verdict is the outcome, not a recommendation',
        /Outcome/i.test(rroot.querySelector('.sheet-lab').textContent) &&
        !/Recommendation/i.test(rroot.textContent));
    chk('a session missing sets reads Partial, not Done',
        /Partial/i.test(rroot.querySelector('.sheet-state').textContent),
        rroot.querySelector('.sheet-state').textContent.trim());
    chk('and it says by how much', /\d+ of \d+ sets/i.test(rroot.querySelector('.sheet-why').textContent),
        rroot.querySelector('.sheet-why').textContent.replace(/\s+/g, ' ').trim());
    chk('the percentage is the sets done over the sets asked for, in fives',
        (() => {
          const pctTxt = rroot.querySelector('.sheet-vright b').textContent;
          const m = /(\d+) of (\d+)/.exec(rroot.querySelector('.sheet-why').textContent);
          if (!m) return false;
          const want = Math.round((+m[1] / +m[2]) * 100 / 5) * 5;
          return pctTxt === want + '%';
        })(), rroot.querySelector('.sheet-vright b').textContent);
    chk('one row per exercise', rroot.querySelectorAll('.sheet-record-table tbody tr').length ===
        window.eval(`getState().sessions.filter(x=>x.id==='${recId}')[0].exercises.length`));
    const expectedLines = window.eval(`(() => {
      const r = getState().sessions.filter(x => x.id === '${recId}')[0];
      let w = 0, k = 0;
      r.exercises.forEach(e => { w += workingSets(e.sets).length; k += e.sets.filter(x => x.skipped).length; });
      return { work: w, skipped: k };
    })()`);
    chk('every working set is a printed line, and a warm-up is not one',
        rroot.querySelectorAll('.sheet-record-table .c-sets .ln:not(.sheet-none)').length === expectedLines.work,
        rroot.querySelectorAll('.sheet-record-table .c-sets .ln:not(.sheet-none)').length +
        ' lines / ' + expectedLines.work + ' working sets');
    chk('a skipped set is named, not silently dropped',
        /skipped/i.test(rroot.querySelector('.sheet-record-table').textContent));
    const storedPlan = window.eval(`(() => {
      const r = getState().sessions.filter(x => x.id === '${recId}')[0];
      return r.exercises[0].plan;
    })()`);
    chk('the target is the prescription stored on the session, not today’s plan',
        rroot.querySelector('.sheet-record-table tbody .c-mono').textContent
          .indexOf(storedPlan.sets + ' × ' + storedPlan.reps[0] + '–' + storedPlan.reps[1]) === 0,
        rroot.querySelector('.sheet-record-table tbody .c-mono').textContent);
    chk('the volume column is a real sum, and the rows add up to the session',
        (() => {
          const cells = [...rroot.querySelectorAll('.sheet-record-table tbody .c-vol')]
            .map(td => td.textContent.replace(/[^\d]/g, ''))
            .filter(t => t.length);
          const printed = cells.reduce((a, t) => a + (+t), 0);
          const real = window.eval(`Math.round(sessionTotalVolume(getState().sessions.filter(x => x.id === '${recId}')[0], getState()))`);
          return cells.length >= 1 && Math.abs(printed - real) <= cells.length;
        })(),
        [...rroot.querySelectorAll('.sheet-record-table tbody .c-vol')].map(t => t.textContent.trim()).join(' | '));
    chk('a note is printed once, with its exercise',
        (rec.match(/left shoulder felt fine/g) || []).length === 1,
        (rec.match(/left shoulder felt fine/g) || []).length + ' occurrences');
    chk('the tally is the count, not an invitation',
        rroot.querySelectorAll('.sheet-tallies .sheet-mark').length >= 1 &&
        /Working sets · \d+/.test(rroot.querySelector('.sheet-tally-wrap').textContent),
        rroot.querySelector('.sheet-tally-wrap').textContent.replace(/\s+/g, ' ').trim().slice(0, 40));
    chk('the record does not inherit the form’s empty boxes',
        rroot.querySelectorAll('.sheet-record-table .box').length === 0);

    /* Same session, same paper. A record is a pure function of the log. */
    const again = window.eval(`printSheet(getState(), Date.now(), { sessionId: '${recId}' })`);
    chk('reprinting the same session prints the same sheet', again === rec);
    chk('and it is a different document from the form', rec !== formHtml);

    /* Grading a person against a plan they were never given would be a lie, so
       a session with no plan day behind it still prints its own targets. */
    const orphan = window.eval(`(() => {
      const s = getState();
      s.sessions.push({ id:'rec-t2', date: Date.now() - 864e5, planId:'gone', name:'Deleted split',
        exercises:[{ id:'bb-bench', sets:[{ w:50, r:10, rir:2, warmup:false, skipped:false, committed:true }] }] });
      saveState();
      return printSheet(getState(), Date.now(), { sessionId:'rec-t2' });
    })()`);
    chk('a session whose plan no longer exists still prints',
        /Deleted split/.test(orphan) && /sheet-record-table/.test(orphan));
    chk('…and its target falls back to the exercise’s own range, not to today’s plan',
        !/3 × 6–10/.test(orphan));

    const lost = window.eval("printSheet(getState(), Date.now(), { sessionId:'nope' })");
    chk('an id that is not in the log prints an empty state, not a crash',
        /sheet-empty/.test(lost) && lost.length < 400);

    const langs = window.eval('LANGS');
    const leaks = [];
    langs.forEach(l => {
      const out = window.eval(`(() => {
        const prev = CURRENT_LANG; CURRENT_LANG = '${l}';
        const h = printSheet(getState(), Date.now(), { sessionId: '${recId}' });
        CURRENT_LANG = prev; return h;
      })()`);
      const raw = out.match(/>pa\.[a-z]+</g) || [];
      if (raw.length) leaks.push(l + ':' + raw.join(','));
    });
    chk('the record is translated in all seven languages', leaks.length === 0, leaks.join('; ') || '7/7');
    const arRec = window.eval(`(() => {
      const prev = CURRENT_LANG; CURRENT_LANG = 'ar';
      const h = printSheet(getState(), Date.now(), { sessionId: '${recId}' });
      CURRENT_LANG = prev; return h;
    })()`);
    chk('the Arabic record prints right to left', /class="sheet[^"]*" dir="rtl"/.test(arRec));
  }

  group('10. The record is reachable from both places a session ends up');
  {
    const workout = fs.readFileSync(path.join(ROOT, 'js/ui/workout.js'), 'utf8');
    chk('the completion card offers the record of the session it just saved',
        /openPrintRecord\(/.test(workout) && /sum\.sessionId/.test(workout));
    chk('and the summary carries the id it needs', /sessionId: rec\.id/.test(workout));
    const screens = fs.readFileSync(path.join(ROOT, 'js/ui/screens.js'), 'utf8');
    chk('the history table offers it per session',
        /openPrintRecord\(/.test(screens) && /sess\.id/.test(screens));
    chk('the button names the session it prints, for a screen reader',
        /aria-label="' \+ esc\(t\('pa\.printRecord'\)\)/.test(screens));

    const rootEl = doc.getElementById('printRoot');
    let printed = 0;
    window.print = () => { printed++; };
    rootEl.innerHTML = '';
    const okRec = window.eval("openPrintRecord('rec-t1')");
    chk('openPrintRecord mounts the record and reports success', okRec === true && rootEl.innerHTML.length > 1000);
    await wait(200);
    chk('and asks the browser to print it', printed >= 1, printed + ' print call(s)');
    chk('a bad id mounts the empty state rather than throwing', (() => {
      rootEl.innerHTML = '';
      let threw = false;
      try { window.eval("openPrintRecord('nope')"); } catch (e) { threw = true; }
      return !threw && /sheet-empty/.test(rootEl.innerHTML);
    })());
  }

  group('11. The button is reachable from the planner');
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
