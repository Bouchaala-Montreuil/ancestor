/* ============================================================================
   ANCESTOR — design system tests
   Run:  node tests/design.js

   The brief sets a mandatory palette, WCAG-legible contrast, and a list of
   things that must NOT appear (decorative gradients, glassmorphism, emoji
   icons, decorative gauges, duplicated card styles). Those are checkable, so
   they are checked — not asserted.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let pass = 0, fail = 0; const failures = [];
const chk = (n,c,x) => {
  if(c){ pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + n + (x ? '  \x1b[2m' + x + '\x1b[0m' : '')); }
  else { fail++; failures.push(n); console.log('  \x1b[31mFAIL\x1b[0m  ' + n + (x ? '  -> ' + x : '')); }
};
const group = t => console.log('\n\x1b[1m' + t + '\x1b[0m');

const css = fs.readFileSync(path.join(ROOT, 'css/app.css'), 'utf8');

/* ------------------------------------------------------------------ tokens */
function token(name){
  const m = new RegExp('--' + name + '\\s*:\\s*([^;]+);').exec(css);
  return m ? m[1].trim() : null;
}
function hex(v){
  if(!v) return null;
  const m = /#([0-9a-f]{6}|[0-9a-f]{3})/i.exec(v);
  if(!m) return null;
  let h = m[1];
  if(h.length === 3) h = h.split('').map(c => c+c).join('');
  return '#' + h.toLowerCase();
}
function rgb(hexStr){
  const h = hexStr.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
/* WCAG relative luminance */
function lum(hexStr){
  const [r,g,b] = rgb(hexStr).map(v => {
    const s = v/255;
    return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
function contrast(a,b){
  const L1 = lum(a), L2 = lum(b);
  return (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
}

/* ================================================================ */
group('1. Mandatory palette is present and exact');
{
  const required = {
    'charcoal':'#20211f', 'ivory':'#f1ebdd', 'burnt':'#d66a3a',
    'tech':'#77796f', 'line':'#c8c0b2'
  };
  Object.keys(required).forEach(k => {
    const v = hex(token(k));
    chk('--' + k + ' = ' + required[k], v === required[k], v);
  });
}

/* ================================================================ */
group('2. Ivory dominates (light mode)');
{
  const paper = hex(token('paper'));
  chk('page background is ivory', paper === '#f1ebdd', paper);
  chk('page background is light', lum(paper) > 0.6, 'luminance ' + lum(paper).toFixed(3));
  const surface = hex(token('surface'));
  chk('panels are lighter than the page', lum(surface) >= lum(paper), surface);
  const ink = hex(token('ink'));
  chk('body text is charcoal', ink === '#20211f', ink);
  chk('text/background contrast is very high', contrast(ink, paper) > 7,
      contrast(ink, paper).toFixed(1) + ':1');
}

/* ================================================================ */
group('3. WCAG contrast on every text pair (AA = 4.5:1)');
{
  const paper = hex(token('paper'));
  const tests = [
    ['ink',        hex(token('ink')),        4.5],
    ['ink-2',      hex(token('ink-2')),      4.5],
    ['ink-3',      hex(token('ink-3')),      4.5],
    ['tech-ink',   hex(token('tech-ink')),   4.5],
    ['burnt-text', hex(token('burnt-text')), 4.5],
    ['ok',         hex(token('ok')),         4.5],
    ['warn',       hex(token('warn')),       4.5],
    ['alert',      hex(token('alert')),      4.5]
  ];
  tests.forEach(([name, col, min]) => {
    const r = contrast(col, paper);
    chk(name + ' on ivory >= ' + min + ':1', r >= min, r.toFixed(2) + ':1');
  });
  // metadata colour is allowed a lower bar but must still be legible
  const nd = contrast(hex(token('nodata')), paper);
  chk('nodata on ivory >= 3:1 (large text / metadata)', nd >= 3, nd.toFixed(2) + ':1');

  // primary button: charcoal on burnt orange
  const btn = contrast(hex(token('charcoal')), hex(token('burnt')));
  chk('primary button label on burnt >= 4.5:1', btn >= 4.5, btn.toFixed(2) + ':1');

  // header: ivory on charcoal
  const hdr = contrast(hex(token('ivory')), hex(token('charcoal')));
  chk('ivory on charcoal >= 4.5:1', hdr >= 4.5, hdr.toFixed(2) + ':1');
  const accent = contrast(hex(token('burnt')), hex(token('charcoal')));
  chk('burnt accent on charcoal >= 4.5:1', accent >= 4.5, accent.toFixed(2) + ':1');
  /* The accent used as *text* on ink is lightened: at 9 px the base orange is
     4.6:1 on charcoal, which passes and still reads as work. */
  const accInk = contrast(hex(token('accent-on-ink')), hex(token('charcoal')));
  chk('accent-on-ink on charcoal >= 4.5:1', accInk >= 4.5, accInk.toFixed(2) + ':1');

  /* --tech (3.72) and --burnt (2.95) are fills and strokes, not text. A test
     rather than a note, because a note is what let them reach body copy in the
     first place: the text-safe pair is --tech-ink / --burnt-text on paper and
     --accent-on-ink on ink. */
  const js = ['js/ui/screens.js','js/ui/workout.js','js/ui/components.js','js/ui/science.js','js/ui/modules.js']
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  const colourProp = /(?<![-\w])color\s*:\s*(?:[^;{}]*?)var\(\s*--(tech|burnt)\s*\)/g;
  const offenders = (css + '\n' + js).match(colourProp) || [];
  chk('the two sub-AA signals are never used as text colour', offenders.length === 0,
      offenders.length ? offenders.join(' , ') : 'no color:var(--tech) or color:var(--burnt)');
}

/* ================================================================ */
group('4. Status is never communicated by colour alone');
{
  const screens = fs.readFileSync(path.join(ROOT, 'js/ui/screens.js'), 'utf8');
  const comps   = fs.readFileSync(path.join(ROOT, 'js/ui/components.js'), 'utf8');
  // every status flag renders a text label from i18n
  chk('flags render a translated label',
      /class="flag [^"]*"[^>]*>\s*'?\s*\+?\s*esc\(t\('/.test(screens) || /flag '\+/.test(screens) || /flag " /.test(screens),
      'flag markup wraps t() labels');
  chk('muscle rows carry a text state, not just a swatch',
      /class="when"/.test(screens) && /mst\.|daysLeft/.test(screens));
  /* The legend used to be its own component under the figure. The muscle list
     now carries swatch, name and state in the same row, so the key and the
     selector are one thing — and there is no unlabelled colour anywhere. */
  chk('every colour on the muscle map is labelled in words beside it',
      /class="sw"[^>]*>.*?class="nm".*?class="when"/s.test(screens),
      'swatch, name and state in one row');
  chk('figure regions carry a <title> for assistive tech',
      /<title>' \+ esc\(t\('mg\.'/.test(comps));
  chk('charts expose aria-label', /role="img" aria-label=/.test(comps));
}

/* ================================================================ */
group('5. Prohibited patterns are absent');
{
  const all = css + fs.readFileSync(path.join(ROOT, 'js/ui/screens.js'), 'utf8')
                  + fs.readFileSync(path.join(ROOT, 'js/ui/components.js'), 'utf8')
                  + fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  chk('no glassmorphism (backdrop-filter)', !/backdrop-filter/.test(css));
  chk('no radial gradients', !/radial-gradient/.test(css));
  // Gradients are allowed only for the technical grid behind the figure and
  // the loading shimmer. Never as decoration on a surface.
  const forbidden = ['body', '.panel', '.btn', '.decision', '.tile', '.chip'];
  const badGradient = forbidden.filter(sel => {
    const re = new RegExp(sel.replace('.', '\\.') + '\\s*(,\\s*[^,{]+)?\\{[^}]*gradient', 's');
    return re.test(css);
  });
  chk('no gradient on any surface component', badGradient.length === 0, badGradient.join(', '));
  const allowed = /\.fig-stage::before\{[^}]*linear-gradient/s.test(css) &&
                  /\.skeleton\{[^}]*linear-gradient/s.test(css);
  chk('the only gradients are the technical grid and the shimmer', allowed);
  chk('no emoji used as illustration',
      !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(all));
  chk('no decorative circular gauge component', !/\.gauge|score-ring|circular-progress/.test(all));
  chk('radius tokens are small and systematic',
      ['--r-xs:2px','--r-sm:3px','--r-md:4px','--r-lg:6px'].every(t => css.indexOf(t) >= 0));
  chk('prefers-reduced-motion is honoured', /prefers-reduced-motion/.test(css));
  chk('focus-visible is defined', /:focus-visible/.test(css));
  chk('touch targets are at least 44 px', /min-height:4[4-9]px|min-height:5[0-9]px|min-height:56px/.test(css));
  chk('no external font or CDN request', !/@import|fonts\.googleapis|cdn\./.test(css));
}

/* ================================================================ */
group('6. Typography hierarchy is technical and consistent');
{
  chk('a condensed display family is declared', /--f-display/.test(css) && /Arial Narrow/.test(css));
  chk('a monospace family is declared for metadata', /--f-mono/.test(css));
  chk('numbers use tabular figures', /font-variant-numeric:\s*tabular-nums/.test(css));
  chk('eyebrow style exists for technical labels', /\.eyebrow\{/.test(css.replace(/\s/g,'')) || /\.eyebrow\s*\{/.test(css));
  chk('display headings are uppercased', /h1\.display\{[^}]*text-transform:uppercase/.test(css.replace(/\n/g,'')));
}

/* ================================================================ */
group('7. Layout: mobile first, adapts upward');
{
  chk('tab bar is fixed at the bottom on mobile', /nav\.tabbar\{[^}]*position:fixed[^}]*bottom:0/s.test(css));
  chk('content is capped (no stretched desktop layout)', /\.shell\{[^}]*max-width:/s.test(css));
  chk('a two-column layout activates at 720 px', /@media\s*\(min-width:720px\)/.test(css));
  chk('navigation becomes a side rail at 1024 px',
      /@media\s*\(min-width:1024px\)/.test(css) && /nav\.tabbar\{[^}]*width:200px/s.test(css));
  chk('at most six primary sections (now four)', (function(){
    const m = /const NAV = \[([\s\S]*?)\];/.exec(fs.readFileSync(path.join(ROOT,'js/app.js'),'utf8'));
    return m ? (m[1].match(/id:'/g) || []).length <= 6 : false;
  })(), (function(){
    const m = /const NAV = \[([\s\S]*?)\];/.exec(fs.readFileSync(path.join(ROOT,'js/app.js'),'utf8'));
    return m ? String((m[1].match(/id:'/g) || []).length) : '?';
  })());
}

/* ================================================================ */
group('8. Anatomy component integrity');
{
  const comps = fs.readFileSync(path.join(ROOT, 'js/ui/components.js'), 'utf8');
  const m = /const FIG = \{([\s\S]*?)\n\};/.exec(comps);
  chk('anatomy geometry is embedded', !!m);
  chk('front and back views are both defined', /front:\s*\{/.test(comps) && /back:\s*\{/.test(comps));
  chk('selection, zoom and reset are wired',
      /function selectMuscle/.test(fs.readFileSync(path.join(ROOT,'js/ui/screens.js'),'utf8')) &&
      /function toggleZoom/.test(fs.readFileSync(path.join(ROOT,'js/ui/screens.js'),'utf8')) &&
      /function resetFig/.test(fs.readFileSync(path.join(ROOT,'js/ui/screens.js'),'utf8')));
  chk('rotation is implemented', /function rotateFig/.test(fs.readFileSync(path.join(ROOT,'js/ui/screens.js'),'utf8')));
  const screensSrc = fs.readFileSync(path.join(ROOT,'js/ui/screens.js'),'utf8');
  const i18nSrc = fs.readFileSync(path.join(ROOT,'js/i18n/screens.js'),'utf8');
  /* This used to build `langsWithDisclosure` with a `|| true` inside the
     filter and then never read it: a check that could not fail, guarding
     nothing. What matters is asserted directly below, per language. */
  chk('the 2D substitution is rendered on the anatomy screen',
      /t\('body\.note2d'\)/.test(screensSrc));
  chk('every language states that it is not a 3D model',
      (i18nSrc.match(/body\.note2d/g) || []).length >= 6,
      (i18nSrc.match(/body\.note2d/g) || []).length + ' translations');
  chk('the disclosure is explicit in English',
      /'body\.note2d':'2D interactive anatomy[^']*Not a 3D model/.test(i18nSrc));
}

/* ================================================================ */
group('8s. The flat figure is the real model, projected');
{
  /* The figure used to be hand-drawn: a stack of rectangles and trapezoids that
     read as a mannequin with a breastplate, because that is what it was. It is
     now the same anatomical model the 3D screen uses, projected to two views
     offline and committed as data. These checks are what stops it drifting back
     into something drawn by hand. */
  const comps = fs.readFileSync(path.join(ROOT, 'js/ui/components.js'), 'utf8');
  const gen   = fs.readFileSync(path.join(ROOT, 'tools/build-figure.js'), 'utf8');
  const data  = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/figure-projected.json'), 'utf8'));
  const block = (/\/\* <figure-geometry> \*\/([\s\S]*?)\/\* <\/figure-geometry> \*\//.exec(comps) || [,''])[1];

  chk('the geometry is a generated block, not paths typed by hand',
      block.length > 5000 && /^const FIG = \{/m.test(block),
      (block.length / 1024).toFixed(1) + ' KB');
  chk('it comes from the projected model, and the two agree',
      (function(){
        try{
          require('child_process').execFileSync(process.execPath,
            [path.join(ROOT, 'tools/build-figure.js'), '--check'], { stdio:'pipe' });
          return true;
        }catch(e){ return false; }
      })(), 'node tools/build-figure.js --check');

  /* One body, one line. A torso stacked on two legs drew a straight cut across
     the pelvis for every leg it added, and a horizontal line there is shorts. */
  const sil = block.slice(block.indexOf('outline: ['), block.indexOf('regions: {'));
  chk('each view is one closed silhouette, not a stack of parts',
      (sil.match(/Z'/g) || []).length === 2 && data.silhouette.front.length === 1 &&
      data.silhouette.back.length === 1,
      (sil.match(/Z'/g) || []).length + ' closed paths');

  /* Every one of the twelve groups is drawn somewhere, and none is invented. */
  const MUS = ['chest','back','shoulders','biceps','triceps','forearms',
               'quads','hamstrings','glutes','calves','abs','lowerback'];
  const drawn = MUS.filter(m => data.groups.front[m].length || data.groups.back[m].length);
  chk('all twelve training groups are drawn from the model',
      drawn.length === 12, drawn.length + ' of 12');
  chk('and the model contributes nothing the app does not have',
      Object.keys(data.groups.front).concat(Object.keys(data.groups.back))
        .every(m => MUS.indexOf(m) >= 0));
  chk('the projection is from the shipped asset, not a second copy',
      /anatom-male-mobile\.glb|anatomy-male-mobile\.glb/.test(
        fs.readFileSync(path.join(ROOT, 'tools/figure-project.html'), 'utf8')) &&
      /depth-of-each-pixel|depthOf/.test(fs.readFileSync(path.join(ROOT, 'tools/figure-project.html'), 'utf8')),
      'tools/figure-project.html');
  chk('every group is drawn with a real surface, not a speck',
      data.tris && MUS.every(m => data.tris[m] > 500),
      MUS.map(m => m + ':' + (data.tris[m] || 0)).join(' '));
  chk('the generator refuses geometry it cannot draw',
      /problems\.length/.test(gen) && /process\.exit\(1\)/.test(gen));

  /* The number on the figure and the number beside the list row are one key. */
  const screens = fs.readFileSync(path.join(ROOT, 'js/ui/screens.js'), 'utf8');
  chk('the list rows are numbered from the same list the figure numbers',
      /MUSCLES\.indexOf\(m\) \+ 1/.test(screens) && /MUSCLES\.indexOf\(m\)/.test(comps),
      'MUSCLES.indexOf(m) + 1');
  chk('a number sits on a lobe, never on the midline',
      (function(){
        const label = (/label: \{([\s\S]*?)\n  \}/.exec(block) || [,''])[1];
        const nums = (label.match(/\[\d+,\d+\]/g) || []);
        const centred = nums.filter(t => {
          const x = +t.slice(1, -1).split(',')[0];
          return x >= 95 && x <= 105;
        });
        return nums.length >= 12 && centred.length <= 2;
      })(), (function(){
        const label = (/label: \{([\s\S]*?)\n  \}/.exec(block) || [,''])[1];
        return ((label.match(/\[\d+,\d+\]/g) || []).length) + ' numbers';
      })());
}

/* ================================================================ */
group('8t. The anatomy licence names what actually ships');
{
  /* CC BY-SA 4.0 attribution is not a mood: it has to name the files that are
     distributed, and the projection is itself Adapted Material. This notice
     used to list four files that exist only in the atlas it was cut from, and
     said nothing at all about the derived figure. */
  const notice = fs.readFileSync(path.join(ROOT, 'assets/ANATOMY-ATTRIBUTION.txt'), 'utf8');
  chk('the notice exists and is not a stub', notice.length > 1200, notice.length + ' chars');
  chk('it gives the licence and a link to it',
      /CC BY-SA 4\.0/.test(notice) && /creativecommons\.org\/licenses\/by-sa\/4\.0/.test(notice));
  chk('it credits both upstream sources the licensors asked for',
      /Z-Anatomy/.test(notice) && /BodyParts3D/.test(notice) &&
      /Gauthier Kervyn/.test(notice) && /Database Center for Life Science/.test(notice));
  /* every path the notice names must exist — a notice pointing at nothing is
     worse than none, because it looks like compliance */
  const named = (notice.match(/(?:^|[\s(])((?:assets|tools|js|release)\/[A-Za-z0-9_/-]+(?:\.[A-Za-z0-9]+)*)/gm) || [])
    .map(x => x.trim());
  const absent = named.filter(f => !fs.existsSync(path.join(ROOT, f)));
  chk('every file the notice names is present', absent.length === 0,
      named.length + ' named, missing: ' + (absent.join(' ') || 'none'));
  chk('the derived projection is declared, not left implicit',
      /figure-projected\.json/.test(notice) && /Adapted Material/.test(notice));
  chk('the generated figure block is declared as derived',
      /figure-geometry/.test(notice));
  chk('the single-file release is declared as a redistribution',
      /release\/ancestor\.html/.test(notice) && /lab3d\.credits/.test(notice));
  /* and the credit has to be on screen in every language, or the notice is a
     claim the product does not honour */
  const modes = fs.readFileSync(path.join(ROOT, 'js/i18n/modes.js'), 'utf8');
  chk('the in-app credit is translated seven times',
      (modes.match(/'lab3d\.credits'/g) || []).length === 7);
}

/* ================================================================ */
group('8u. One owner per global — the boundaries are checked, not hoped for');
{
  /* S13 in ARCHITECTURE.md says "no module boundaries, 589 globals". ES modules
     are not an option: index.html has to open from the file system, and
     file:// blocks them. What is checkable is ownership — every top-level name
     declared once, every file loaded, and a per-file count that cannot grow
     without the manifest being updated in the same commit. Before this, two
     names were owned twice and the loser was dead code that looked alive. */
  const { execFileSync } = require('child_process');
  const files = [];
  (function walk(dir){
    for(const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })){
      const rel = dir + '/' + e.name;
      if(e.isDirectory()){ if(e.name !== 'vendor') walk(rel); }
      else if(e.name.endsWith('.js')) files.push(rel);
    }
  })('js');
  const appFiles = files.filter(f => f !== 'js/sw.js');
  const DECL = /^(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/;
  const owners = new Map(), counts = new Map();
  appFiles.forEach(f => {
    const names = new Set();
    fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach(l => {
      const d = DECL.exec(l); if(d) names.add(d[1]);
    });
    counts.set(f, names.size);
    names.forEach(n => owners.set(n, (owners.get(n) || []).concat(f)));
  });
  const clashes = [...owners].filter(([, fs2]) => fs2.length > 1);
  chk('every top-level name has exactly one owner',
      clashes.length === 0,
      clashes.map(([n, fs2]) => n + ' in ' + fs2.join('+')).join(', ') || owners.size + ' names');
  chk('the two historical collisions are gone, not renamed',
      !/^function round1/m.test(fs.readFileSync(path.join(ROOT,'js/engine/readiness.js'),'utf8')) &&
      !/^function langLabel/m.test(fs.readFileSync(path.join(ROOT,'js/i18n/core.js'),'utf8')));

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const loaded = (html.match(/<script src="(js\/[^"]+\.js)"><\/script>/g) || [])
    .map(t => t.replace(/.*src="|"><\/script>/g, ''));
  chk('every file in js/ is loaded by index.html',
      appFiles.every(f => loaded.includes(f)),
      appFiles.filter(f => !loaded.includes(f)).join(', ') || appFiles.length + ' files');
  chk('nothing is loaded that is not on disk',
      loaded.every(f => fs.existsSync(path.join(ROOT, f))));

  /* the ratchet: the manifest records the counts, and the tool fails on drift
     in either direction — a global added or removed has to be an edit here */
  const manifest = fs.readFileSync(path.join(ROOT, 'js/MODULES.md'), 'utf8');
  chk('the manifest records a count for every file',
      appFiles.every(f => new RegExp('\\| \\d+ \\| `' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '` \\| (\\d+) \\|').test(manifest)),
      appFiles.length + ' rows');
  const stale = appFiles.filter(f => {
    const row = new RegExp('`' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '` \\| (\\d+) \\|').exec(manifest);
    return !row || Number(row[1]) !== counts.get(f);
  });
  chk('the recorded counts still match the code', stale.length === 0, stale.join(', ') || 'no drift');
  let checkRan = true, checkOut = '';
  try { checkOut = execFileSync(process.execPath, [path.join(ROOT,'tools/modules.js'), '--check'], { encoding:'utf8' }); }
  catch(e){ checkRan = false; checkOut = (e.stdout || '') + (e.stderr || ''); }
  chk('the manifest regenerates to itself', checkRan, checkOut.trim().split('\n').pop());
}

/* ================================================================ */
group('8v. A control says which one it is, not just what it does');
{
  /* Two defects found by the accessibility-tree audit (tools/ax_audit.js):
     six "Détails de l'exercice" buttons on the session screen, all identical
     in a screen reader's button list, and "Tout"/"Dos" appearing in two filter
     groups on the anatomy screen with nothing to tell them apart. A control
     whose own text is generic now carries the name of what it acts on; one
     whose text already names the exercise does not need a second label. */
  const workout = fs.readFileSync(path.join(ROOT, 'js/ui/workout.js'), 'utf8');
  const screens = fs.readFileSync(path.join(ROOT, 'js/ui/screens.js'), 'utf8');
  const modes = fs.readFileSync(path.join(ROOT, 'js/i18n/modes.js'), 'utf8');

  /* every openExerciseDetail button either shows the exercise name as its
     text, or names it in aria-label */
  const buttons = workout.split('data-act="openExerciseDetail"').slice(1);
  const generic = buttons.filter(chunk => /esc\(t\('exd\.open'\)\)/.test(chunk.slice(0, 400)));
  const labelled = generic.filter(chunk => /aria-label=/.test(chunk.slice(0, 400)));
  chk('no exercise-detail button shows only the generic label',
      generic.length === labelled.length,
      generic.length + ' generic, ' + labelled.length + ' labelled');
  chk('the ones that were generic now name their exercise',
      generic.every(chunk => /t\('exd\.open'\) \+ ' — ' \+ t\('ex\./.test(chunk.slice(0, 400))),
      generic.length + ' checked');
  chk('the progress header names its exercise too',
      /t\('exd\.open'\) \+ ' — ' \+ t\('ex\.' \+ PROG_EX\)/.test(screens));

  /* filter chips: the group name appears twice per collection — once on the
     container, once in each chip's label */
  const count = (src, key) => (src.split("t('" + key + "')").length - 1);
  chk('the side chips say which group they belong to', count(screens, 'lab3d.filterSide') >= 3,
      count(screens, 'lab3d.filterSide') + ' mentions');
  chk('the layer chips do the same', count(screens, 'lab3d.filterLayer') >= 2,
      count(screens, 'lab3d.filterLayer') + ' mentions');
  chk('the region chips do the same', count(screens, 'lab3d.filterRegion') >= 2,
      count(screens, 'lab3d.filterRegion') + ' mentions');
  chk('and the group label exists in all seven languages',
      (modes.match(/'lab3d\.filterSide'/g) || []).length === 7);
  chk('the audit that found them ships with the repo',
      fs.existsSync(path.join(ROOT, 'tools/ax_audit.js')));
}

/* ================================================================ */
group('8b. Preference hooks are real, not aspirational');
{
  const cssText = css;
  const profile = fs.readFileSync(path.join(ROOT, 'js/core/profile.js'), 'utf8');
  // what applyDisplay() actually writes onto <html>
  const set = [...profile.matchAll(/r\.dataset\.(\w+)\s*=/g)].map(m => m[1]);
  chk('applyDisplay sets the display attributes', set.length >= 3, set.join(','));
  const used = [...cssText.matchAll(/html\[data-(\w+)/g)].map(m => m[1]);
  const unique = [...new Set(used)];
  const orphan = unique.filter(a => ['text','contrast','simple','motion'].indexOf(a) < 0);
  chk('every html[data-*] rule matches an attribute the app sets',
      orphan.length === 0, orphan.join(',') || 'none orphaned');
  chk('text scaling is keyed on data-text',
      /html\[data-text="1\.15"\]/.test(cssText));
  chk('simple UI is keyed on data-simple="on"',
      /html\[data-simple="on"\]/.test(cssText));
  chk('high contrast is keyed on data-contrast',
      /html\[data-contrast="high"\]/.test(cssText));
  chk('reduced motion is keyed on data-motion',
      /html\[data-motion="on"\]/.test(cssText));
}

/* ================================================================ */
group('8c. Type and colour are not re-declared in JavaScript');
{
  const comps = fs.readFileSync(path.join(ROOT, 'js/ui/components.js'), 'utf8');
  const tokens = new Set(
    [...css.matchAll(/--(?:ink|charcoal|burnt|tech|ok|warn|alert|nodata|ivory|line|paper)\s*:\s*(#[0-9A-Fa-f]{6})/g)]
      .map(m => m[1].toLowerCase()));
  // literals are allowed only as documented fallbacks next to a token() read
  const bare = [...comps.matchAll(/(?<!token\('[a-z]+',\s*)'(#[0-9A-Fa-f]{6})'/g)]
    .map(m => m[1].toLowerCase())
    .filter(h => tokens.has(h) === false ? false : true);
  const notInSystem = [...comps.matchAll(/'(#[0-9A-Fa-f]{6})'/g)]
    .map(m => m[1].toLowerCase())
    .filter(h => !tokens.has(h));
  chk('no colour in the drawings is outside the token set',
      notInSystem.length === 0, notInSystem.join(',') || 'none');
  chk('state colours are read from the stylesheet, not hardcoded',
      /function token\(name, fallback\)/.test(comps) && /getPropertyValue\('--'/.test(comps));
  chk('the display face is shipped, not borrowed',
      /@font-face\{[^}]*Barlow Condensed/.test(css) && /url\("data:font\/woff2;base64,/.test(css));
  chk('the webfont is embedded, so it works offline',
      (css.match(/data:font\/woff2;base64,/g) || []).length >= 2);
  chk('the system stack remains as the fallback',
      /--f-display:"Barlow Condensed","Arial Narrow"/.test(css));
}

/* ================================================================ */
group('8d. Onboarding is designed, not inherited');
{
  const scr = fs.readFileSync(path.join(ROOT, 'js/ui/screens.js'), 'utf8');
  chk('the step index is a number, not a sentence',
      /class="onb-idx"/.test(scr) && /pad2\(onbIdx \+ 1\)/.test(scr));
  /* Eleven steps, one footer component — the language question is step zero and
     uses the same bar, so the count is the step count, not a coincidence. */
  chk('every step footer uses the same action bar',
      (scr.match(/class="onb-actions"/g) || []).length === 11,
      (scr.match(/class="onb-actions"/g) || []).length + ' of 11');
  chk('the action bar is pinned so Continue is always reachable',
      /\.onb-actions\{[^}]*position:fixed/s.test(css));
  chk('answers are full-width rows, not a tile grid',
      /\.onb-frame \.tiles\{[^}]*flex-direction:column/s.test(css));
  chk('answer rows clear a thumb, not a fingertip',
      /\.onb-frame \.tile\{[^}]*min-height:6\dpx/s.test(css));
  chk('the question is the largest thing on the screen',
      /\.onb-frame h1[^{]*\{[^}]*font-size:clamp\(38px/s.test(css));
  chk('the completed part of the bar is inked, the present one burnt',
      /\.onb-bar i\.on\{background:var\(--ink\)\}/.test(css) &&
      /\.onb-bar i\.on:last-of-type\{background:var\(--burnt\)\}/.test(css));
  chk('range inputs are styled at last',
      /input\[type=range\]::-webkit-slider-thumb/.test(css));
  chk('the progress bar stops animating under reduced motion',
      /html\[data-motion="on"\] \.onb-bar i\{transition:none\}/.test(css));
}

/* ================================================================ */
/* ================================================================ */
group('8e. Layout lives in the stylesheet, not in the screens');
{
  const files = fs.readdirSync(path.join(ROOT, 'js/ui')).filter(f => f.endsWith('.js'));
  const src = files.map(f => fs.readFileSync(path.join(ROOT, 'js/ui', f), 'utf8')).join('\n');
  const inline = re => (src.match(re) || []).length;

  chk('no screen carries its own margins',
      inline(/style="[^"]*margin[^"]*"/g) === 0, inline(/style="[^"]*margin[^"]*"/g) + ' left');
  chk('no screen carries its own text alignment',
      inline(/style="[^"]*text-align[^"]*"/g) === 0);
  chk('no screen declares its own flex layout',
      inline(/style="[^"]*display:flex[^"]*"/g) === 0);
  chk('no screen carries a hardcoded colour outside a token fallback',
      inline(/style="[^"]*(?:background|color):#[0-9a-fA-F]{3,6}[^"]*"/g) === 0);

  /* The utility scale is closed: what the screens ask for must exist. */
  const used = new Set();
  for(const m of src.matchAll(/class="([^"]*)"/g))
    for(const c of m[1].split(/\s+/))
      if(/^(?:m[btxy]?-\d|row-\d|nowrap|between|stack|grow|push|tuck|shrink|tap|pre|end|meta|td-empty|sp-\d|heavy|scroll|bare|seamless|sw|num-lg|num-xl|ex-title)$/.test(c)) used.add(c);
  const missing = [...used].filter(c => !new RegExp('\\.' + c.replace(/-/g,'\\-') + '(?![\\w-])').test(css));
  chk('every utility the screens use is defined once in the stylesheet',
      missing.length === 0, missing.join(', '));

  /* .row is the app's own primitive. Defining it again lower down would have
     silently re-gapped every row in the product. */
  const rowDefs = (css.match(/(?:^|\n)\.row[,{]/g) || []).length;
  chk('.row is defined once, so nothing shadows the app primitive', rowDefs === 1, rowDefs + ' definitions');

  chk('spacing steps are the scale, not new numbers',
      !/\.(?:m[btxy]?-\d)\{[^}]*:\s*\d+px/.test(css));

  const print = fs.readFileSync(path.join(ROOT, 'js/ui/printsheet.js'), 'utf8');
  chk('the printed block number is inked, not left as plain text',
      /class="stamp"/.test(print) && /\.sheet-bh \.stamp\{[^}]*background:#000/.test(css));
}

/* ================================================================ */
group('8f. Arabic is a design, not a mirror');
{
  const dirProps = (css.match(/(?:margin|padding|border)-(?:left|right)[:-]/g) || []).length;
  chk('no physical left/right box properties remain', dirProps === 0, dirProps + ' found');
  const align = (css.match(/text-align:\s*(?:left|right)\b/g) || []).length;
  chk('no physical text alignment remains', align === 0, align + ' found');
  const bad = (css.match(/(?:margin|padding|border)-(?:start|end)[:-]/g) || []).length;
  chk('no invalid shorthand crept in — logical sides are spelled out', bad === 0, bad + ' found');

  const rtlPatches = (css.match(/\[dir="rtl"\]/g) || []).length;
  chk('mirroring is structural — one exception, not a patch list', rtlPatches === 1,
      rtlPatches + ' rtl rules');

  const ar = /html\[lang="ar"\]\{([^}]*)\}/.exec(css);
  chk('Arabic gets its own type settings', !!ar);
  chk('the display face falls through to a real Arabic face by name',
      !!ar && /(?:SF Arabic|Geeza Pro|Noto Naskh Arabic)/.test(ar[1]));
  chk('Arabic body leading is opened up for deeper descenders',
      !!ar && /--lh-body:\s*1\.[7-9]/.test(ar[1]));

  const arAll = /html\[lang="ar"\] \*\{([^}]*)\}/.exec(css);
  chk('tracking is switched off — it severs Arabic joins',
      !!arAll && /letter-spacing:\s*0/.test(arAll[1]));
  chk('uppercase is switched off — it does not exist in Arabic',
      !!arAll && /text-transform:\s*none/.test(arAll[1]));

  const locale = fs.readFileSync(path.join(ROOT, 'js/i18n/locale.js'), 'utf8');
  chk('the document direction is actually set from the language',
      /r\.dir = isRTL\(lang\) \? 'rtl' : 'ltr'/.test(locale));
  chk('the two inline display styles became classes Arabic can reach',
      !/style="[^"]*letter-spacing/.test(fs.readFileSync(path.join(ROOT, 'js/ui/workout.js'), 'utf8') +
        fs.readFileSync(path.join(ROOT, 'js/ui/science.js'), 'utf8')));
}

/* ================================================================ */
group('8g. Science has a hierarchy now');
{
  const sci = fs.readFileSync(path.join(ROOT, 'js/ui/science.js'), 'utf8');

  chk('the factor row is a component, not two locals',
      /(?:^|\n)\.factor\{/.test(css));
  chk('every dossier section is numbered, none uses an h3',
      !/<div class="sect"><h3/.test(sci));

  chk('eleven categories are one rail, not five rows of buttons',
      /\.chips\.rail\{[^}]*flex-wrap:nowrap/.test(css));

  chk('the lesson list is a register of rows',
      /\.lesson-card\{[^}]*grid-template-columns:26px minmax\(0,1fr\) auto/.test(css));
  chk('each entry is a number, a title and a time',
      /<span class="lesson-idx">/.test(sci) && /<span class="lesson-title">/.test(sci) &&
      /<span class="lesson-meta">/.test(sci));
  chk('the summary is clamped to one line',
      /\.lesson-sum\{[^}]*-webkit-line-clamp:1/.test(css));
  chk('read is a tally stroke, not a green pill',
      /\.lesson-card\.done \.lesson-idx::after\{[^}]*background:var\(--burnt\)/.test(css));

  chk('an evidence abstract is collapsed until asked for',
      /<details class="ev-more">/.test(sci) && /\.ev-more summary/.test(css));
  chk('the disclosure sign is drawn, not a glyph the face lacks',
      /\.ev-more summary::after\{[^}]*content:"\+"/.test(css));

  chk('achievements are rows that fill when earned',
      /class="factor' \+ \(got \? ' up' : ' locked'\)/.test(sci));
  chk('a locked achievement is hollow, not grey-filled',
      /\.factor\.locked \.dot\{[^}]*background:transparent/.test(css));
}

/* ================================================================ */
group('8h. One loading language');
{
  const comp = fs.readFileSync(path.join(ROOT, 'js/ui/components.js'), 'utf8');
  const mot  = fs.readFileSync(path.join(ROOT, 'js/ui/motion.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  chk('there is exactly one skeleton primitive',
      /function skel\(/.test(comp) && !/function skeletonBlock/.test(comp) && !/function skeleton\(/.test(mot));
  chk('it is shaped like the content, not a generic bar',
      /SKEL_SHAPES/.test(comp) && /figure:\s*\{h:/.test(comp) && /title:\s*\{h:/.test(comp));
  chk('no spinner survives anywhere',
      !/@keyframes spin/.test(css) && !/lab-spinner/.test(css) &&
      !/lab-spinner/.test(fs.readFileSync(path.join(ROOT, 'js/ui/anatomy3d.js'), 'utf8')));
  chk('a wait is marked with the tally that has not closed yet',
      /function waitMark/.test(comp) && /\.wait \.ws1\{[^}]*animation/.test(css));
  chk('a busy button is the same mark, masked so it takes the button colour',
      /\.btn\.loading::after\{[^}]*mask:url\("data:image\/svg\+xml/.test(css));
  chk('the boot veil draws the full mark',
      (html.match(/class="bs bs\d"/g) || []).length === 5);
  chk('the closing stroke is the burnt one',
      /\.app-boot-mark \.bs5\{[^}]*fill:var\(--burnt\)/.test(css));
  chk('every loading animation stops under reduced motion',
      /html\[data-motion="on"\] \.skel-bar/.test(css) &&
      /html\[data-motion="on"\] \.wait \.ws/.test(css) &&
      /html\[data-motion="on"\] \.app-boot-mark \.bs/.test(css));
  chk('the veil is localised at boot, not hardcoded',
      /function bootCopy\(\)/.test(fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8')));
}

/* ================================================================ */
group('8i. The navigation marks are drawn, not borrowed');
{
  const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const nav = /const NAV = \[([\s\S]*?)\n\];/.exec(app);
  const body = nav ? nav[1] : '';

  chk('four marks, one per destination', (body.match(/id:'/g) || []).length === 4);
  chk('the two that left the bar kept their marks', (function(){
    const mk = /const NAV_MARK = \{([\s\S]*?)\n\};/.exec(app);
    return !!mk && /body:/.test(mk[1]) && /science:/.test(mk[1]);
  })());
  chk('and they are still reachable from the profile', (function(){
    const scr = fs.readFileSync(path.join(ROOT,'js/ui/screens.js'), 'utf8');
    /* The source names the action instead of writing a handler, so the check
       reads the same markup the browser does. */
    const link = id => 'data-act="go" data-a1="' + id + '"';
    return /NAV_MARK\.body/.test(scr) && /NAV_MARK\.science/.test(scr) &&
           scr.indexOf(link('body')) >= 0 && scr.indexOf(link('science')) >= 0;
  })());
  chk('every mark is built from the wordmark numbers',
      /T_ICON = 2\.4/.test(app) && /M_ICON = 3\.2/.test(app) && /Y_ICON = 4\.2/.test(app));
  /* A 1.4 px hairline disappears on a 3x phone screen; 2.4 px of mass does not. */
  chk('the marks are solid, so they survive at 19 px', /\.tabbar svg\{[^}]*fill:currentColor/.test(css) &&
      /\.tabbar svg\{[^}]*stroke:none/.test(css));
  chk('no stock 24-px stroke icon survives in the nav',
      !/stroke-width:1\.4/.test(/\.tabbar svg\{[^}]*\}/.exec(css)[0]));
  chk('the tally is in the nav — the product counted something',
      /rotate\(-16 12 12\)/.test(body));
  chk('no two marks share a silhouette',
      (body.match(/_frame\(/g) || []).length === 1,
      (body.match(/_frame\(/g) || []).length + ' framed marks');
}

/* ================================================================ */
group('8j. The exercise drawings obey one rule');
{
  const comp = fs.readFileSync(path.join(ROOT, 'js/ui/components.js'), 'utf8');
  const i0 = comp.indexOf('Movement patterns, drawn once');
  const i1 = comp.indexOf('function exerciseVisualSvg');
  const kin = comp.slice(i0, i1);

  chk('all eleven movement patterns are drawn', (kin.match(/^\s*KIN\.\w+ =/gm) || []).length >= 11,
      (kin.match(/^\s*KIN\.\w+ =/gm) || []).length + ' patterns');

  /* 47 hardcoded hexes were baked into these strings; no theme could reach them. */
  chk('the drawings carry no colour of their own', !/#[0-9a-fA-F]{3,6}/.test(kin));
  chk('colour comes from classes the stylesheet defines',
      /\.k-i\{fill:var\(--ink\)/.test(css) && /\.k-b\{fill:var\(--burnt\)/.test(css) &&
      /\.k-r\{stroke:var\(--line\)/.test(css));

  chk('one body weight, not four', /seg[\s\S]{0,80}stroke-width="3\.2"/.test(kin) &&
      !/stroke-width="1\.8"/.test(kin) && !/stroke-width="2\.6"/.test(kin));
  chk('a head is mass, not a circle', !/<circle[^>]*head/.test(kin) &&
      /const head = \(x, y\) =>/.test(kin) && /width="11" height="11"/.test(kin));
  chk('a joint is a 3.2 square, so it cannot be read as a head',
      /s = s \|\| 3\.2/.test(kin));
  chk('the arrowhead is drawn, not a <marker> with a baked fill',
      !/<marker/.test(kin) && !/marker-end/.test(kin));
  chk('square caps everywhere, so nothing reads as a pen stroke',
      /stroke-linecap:square/.test(css));

  /* Still true from the token pass, now for the drawings too. */
  chk('no literal stroke colour survives anywhere in components.js',
      !/stroke="#[0-9a-fA-F]{3,6}"/.test(comp));
}

group('8k. Charts are drawn to one scale');
{
  const comp = fs.readFileSync(path.join(ROOT, 'js/ui/components.js'), 'utf8');
  const i0 = comp.indexOf('function niceStep');
  const i1 = comp.indexOf('let CHART_SEQ');
  const charts = comp.slice(comp.indexOf('/* --------------------------------------------------------------- CHARTS */'),
                            comp.indexOf('/* ------------------------------------------------------------- PRINT CARD */'));

  /* Execute the scale rather than describe it: a chart axis is a claim about
     numbers, and it is only true if the numbers come out round. */
  let niceScale = null;
  try { niceScale = new Function(comp.slice(i0, i1) + '; return niceScale;')(); }
  catch(e){ niceScale = null; }
  chk('the scale function runs on its own', typeof niceScale === 'function');

  if(typeof niceScale === 'function'){
    const sc = niceScale(41.16, 53.34, 4);                       // 42..52.5 kg + pad
    chk('a bodyweight series lands on 40/45/50/55, not 36/52/68/84/100',
        sc.labels.join(' ') === '40 45 50 55', sc.labels.join(' '));
    const sets = niceScale(0, 15.4, 4);
    chk('a set count never grows a fraction', sets.labels.every(v => v % 1 === 0) &&
        sets.max === 20 && sets.min === 0, sets.labels.join(' '));
    const ratio = niceScale(0.4, 0.9, 4);
    chk('a ratio keeps one decimal and still rounds both ends',
        ratio.labels.join(' ') === '0.4 0.6 0.8 1', ratio.labels.join(' '));
    const labels = niceScale(3.2, 97.4, 4);
    chk('every label is a multiple of the step and the domain holds the data',
        labels.labels.every(v => Math.abs(v / labels.step - Math.round(v / labels.step)) < 1e-9) &&
        labels.min <= 3.2 && labels.max >= 97.4 && labels.labels.length >= 3 && labels.labels.length <= 7,
        labels.labels.join(' '));
    chk('a flat series still gets a domain instead of dividing by zero',
        niceScale(50, 50, 4).max > 50);
  }

  /* Comments are allowed to describe the old defect; code is not allowed to keep it. */
  const code = charts.replace(/\/\*[\s\S]*?\*\//g, '');
  chk('the old "round the top only" hack is gone', !/rawMin\s*\*\s*0?\.85/.test(code));

  chk('no bar is painted at a meaningless opacity',
      !/fill-opacity/.test(code));
  chk('no chart carries a colour of its own', !/#[0-9a-fA-F]{3,6}/.test(code));
  chk('no colour is smuggled through a presentation attribute',
      !/fill="var\(/.test(comp));

  const needed = ['dv-axis', 'dv-grid', 'dv-ytick', 'dv-xtick', 'dv-dot', 'dv-value'];
  const missing = needed.filter(c => css.indexOf('.' + c) < 0);
  chk('every data-viz class the charts use exists in the stylesheet',
      missing.length === 0, missing.join(', '));
  chk('the axis is ink and the grid is a hairline',
      /\.dv-axis\{stroke:var\(--ink\)/.test(css) && /\.dv-grid\{stroke:var\(--line-soft\)/.test(css));
  chk('the series and the ring are the accent, not the ink',
      /\.chart-path\{[^}]*stroke:var\(--burnt\)/.test(css) &&
      /\.ring-value\{[^}]*stroke:var\(--burnt\)/.test(css));
  chk('a bar chart starts at zero', /niceScale\(0,/.test(charts));

  /* An entrance must never be the only way to see the data. */
  chk('the un-animated chart is the finished chart, not a hidden one',
      !/\.chart-path\{[^}]*stroke-dashoffset/.test(css) &&
      /@keyframes chart-draw\{from\{stroke-dashoffset:1000\}/.test(css));
  chk('the ring ships its arc in the markup', !/stroke-dashoffset="' \+ c\.toFixed\(2\)/.test(comp));
  chk('the scale is used, not reimplemented, by both charts',
      (code.match(/niceScale\(/g) || []).length >= 2);

  /* A bar with a width and no paint is not a chart. The atlas contribution bars
     carried three <i> elements with percentage widths and no height or colour,
     so every card showed an empty 0px row where a distribution should be. */
  chk('every bar this app draws is given a height and a colour',
      /\.ex-mbar i\{[^}]*height:100%[^}]*background:/.test(css.replace(/\n/g,'')) &&
      /\.ex-mbar\{[^}]*height:3px/.test(css.replace(/\n/g,'')),
      'ex-mbar: a 3px track, a painted fill');
}

group('8l. Every state has a producer and a way out');
{
  const comp = fs.readFileSync(path.join(ROOT, 'js/ui/components.js'), 'utf8');
  const screens = fs.readFileSync(path.join(ROOT, 'js/ui/screens.js'), 'utf8');
  const workout = fs.readFileSync(path.join(ROOT, 'js/ui/workout.js'), 'utf8');
  const science = fs.readFileSync(path.join(ROOT, 'js/ui/science.js'), 'utf8');
  const store = fs.readFileSync(path.join(ROOT, 'js/core/store.js'), 'utf8');
  const all = screens + workout + science;

  /* A style with no producer is the mirror of a rule with no element: it looks
     designed and never appears. `.btn.loading` sat in the stylesheet for three
     passes before anything set it. */
  chk('the busy button is produced, not just styled',
      /\.btn\.loading/.test(css) && /setBtnBusy/.test(screens) &&
      /classList\.toggle\('loading'/.test(screens));

  /* One failure state, one empty state, one loader — not one per screen. */
  chk('there is a single failure state and it is the only one',
      (comp.match(/function failureState/g) || []).length === 1 &&
      (all.match(/class="fail"/g) || []).length === 0);

  chk('the failure state keeps the stack trace behind a disclosure',
      /fail-more/.test(comp) && /<details/.test(comp));

  /* The policy in index.html has no 'unsafe-inline', which means a single
     forgotten onclick attribute is a control that silently does nothing. The
     source is the place to forbid it: a rendered-DOM check only sees the
     screens a test happened to open. */
  const sources = ['index.html'].concat(
      fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f)).map(f => 'js/' + f),
      fs.readdirSync(path.join(ROOT, 'js/ui')).map(f => 'js/ui/' + f),
      fs.readdirSync(path.join(ROOT, 'js/core')).map(f => 'js/core/' + f));
  const offenders = sources.filter(f => {
    const body = fs.readFileSync(path.join(ROOT, f), 'utf8');
    return /\son(click|input|change|submit|keydown|pointerdown)\s*=/.test(body);
  });
  chk('no source file carries an inline event handler', offenders.length === 0,
      offenders.join(', ') || sources.length + ' files clean');
  chk('index.html ships the policy, and it is the strict one',
      (function(){
        const doc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
        const m = /Content-Security-Policy" content="([^"]+)"/.exec(doc);
        if(!m) return false;
        const script = m[1].split(';').map(x => x.trim()).filter(x => x.indexOf('script-src') === 0)[0] || '';
        const tokens = script.split(/\s+/);
        return tokens.indexOf("'self'") >= 0 && tokens.indexOf("'unsafe-inline'") < 0 &&
               tokens.indexOf("'unsafe-eval'") < 0;
      })());

  /* The route back is an action now, not a handler string: the markup names
     where it goes and the element carries the destination. */
  chk('the failure state always offers retry and a route back',
      /app\.fail\.retry/.test(comp) &&
      /data-act="go" data-a1="home"/.test(comp));

  /* Every empty state names its situation and its consequence. */
  const calls = all.match(/emptyState\([^)]*\)/g) || [];
  const thin = calls.filter(c => (c.match(/'[^']*'/g) || []).length < 2);
  chk('every empty state carries a title and a body, not a shrug',
      thin.length === 0, calls.length + ' calls' + (thin.length ? ', thin: ' + thin[0] : ''));

  /* Unknown records are a data-integrity boundary, not an exception. */
  chk('an exercise id this build does not know cannot have a history',
      /if\(!ex\) return \[\]/.test(store));
  chk('…and Progress has something to say when every record is unknown',
      /progress\.unknownEx/.test(screens));

  /* Offline is a capability, not an error. */
  chk('offline is one header flag, worded as a capability',
      /netFlag/.test(fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8')) &&
      /offlineOk/.test(fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8')));

  /* A swallowed write is a state too: styled, produced, ended. */
  chk('a refused write has a strip of its own and it is styled',
      /\.store-flag/.test(css) && /id="storeFlag"/.test(fs.readFileSync(path.join(ROOT,'index.html'),'utf8')));
  chk('…produced by the save path itself, not by a screen',
      /STORAGE_FAILED\s*=\s*!ok/.test(store) && /paintStoreFlag/.test(fs.readFileSync(path.join(ROOT,'js/app.js'), 'utf8')));
  const i18n = fs.readdirSync(path.join(ROOT, 'js/i18n'))
    .map(f => fs.readFileSync(path.join(ROOT, 'js/i18n', f), 'utf8')).join('\n');
  chk('…with copy in every language the app ships',
      (i18n.match(/"app\.store\.title"/g) || []).length === 7 &&
      (i18n.match(/"app\.store\.body"/g) || []).length === 7);

  /* A record that will not open must not be replaced by an empty one. */
  chk('an unreadable record is held, not overwritten',
      /LOAD_FAILED/.test(store) && /RAW_RECORD\s*=\s*raw/.test(store) &&
      /if\(LOAD_FAILED\)/.test(store) && /archiveDamagedRecord/.test(store));
  chk('…and it is explained in every language the app ships',
      ['app.load.title','app.load.body','app.load.get','app.load.kept'].every(k =>
        (i18n.match(new RegExp('"' + k.replace(/\./g, '\\.') + '"', 'g')) || []).length === 7));

  /* A confirmation is a claim about a write, so it goes through one guard. */
  const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const ui = ['screens.js','workout.js','science.js']
    .map(f => fs.readFileSync(path.join(ROOT, 'js/ui', f), 'utf8')).join('\n');

  /* Three boundaries that are not about a screen: another tab, a newer build,
     and a throw from outside render(). */
  chk('a write from another tab is adopted instead of overwritten',
      /function reloadState/.test(store) && /addEventListener\('storage'/.test(app));
  chk('a record from a newer build is refused, not downgraded',
      /SCHEMA_VERSION/.test(store) && /LOAD_NEWER/.test(store) &&
      /parsed\.version > SCHEMA_VERSION/.test(store));
  chk('…and it is explained in every language the app ships',
      (i18n.match(/"app\.load\.newer"/g) || []).length === 7);
  chk('a throw outside render() still reaches the designed failure state',
      /function reportUncaught/.test(app) && /addEventListener\('unhandledrejection'/.test(app) &&
      /body\.innerHTML = failureState/.test(app));


  /* A toast kind with no rule is a message that looks like no message. */
  const toastSrc = (ui + fs.readFileSync(path.join(ROOT,'js/app.js'), 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const kinds = [...new Set(toastSrc.match(/toast\([^;]*?,\s*'(ok|err|alert|warn|info)'\s*\)/g) || [])]
    .map(m => /'(ok|err|alert|warn|info)'\s*\)/.exec(m)[1]);
  const unstyled = kinds.filter(k => css.indexOf('.toast.' + k) < 0);
  chk('every toast kind has a rule — six errors used to look like six messages',
      unstyled.length === 0, kinds.join(', ') + (unstyled.length ? ' | no rule: ' + unstyled.join(', ') : ''));

  chk('success is confirmed by a guard that reads the write, not by eight toasts',
      /function savedToast/.test(app) && /STORAGE_FAILED/.test(app) &&
      (ui.match(/savedToast\(/g) || []).length === 8 &&
      !/toast\(t\('[a-z]+\.saved'\)/.test(ui));

  /* A strip is a report; a retry is a recovery. Both, or the user is told about a
     failure the app has given up on. */
  chk('a refused write is retried, not just reported',
      /function retryStore/.test(app) && /function scheduleStoreRetry/.test(app) &&
      /function cancelStoreRetry/.test(app) &&
      /visibilitychange[\s\S]{0,120}retryStore\(\)/.test(app) &&
      /addEventListener\('focus'[\s\S]{0,60}retryStore\(\)/.test(app));

  /* The five states are the five the roadmap audits: nothing else shipped. */
  /* Comments are allowed to say "spinner"; code is not allowed to be one. */
  const codeOnly = (css + comp).replace(/\/\*[\s\S]*?\*\//g, '');
  chk('no fourth spinner crept in',
      !/spinner|loader-circle|is-loading/.test(codeOnly) &&
      !/@keyframes\s+spin\b/.test(codeOnly));
}

group('8o. Disclosures are one component, not four improvisations');
{
  /* Every screen that had grown a wall of controls now uses the same native
     <details>. These checks keep that convergence from drifting apart again. */
  const uiFiles = fs.readdirSync(path.join(ROOT, 'js/ui')).filter(f => f.endsWith('.js'));
  const src = uiFiles.map(f => fs.readFileSync(path.join(ROOT, 'js/ui', f), 'utf8')).join('\n');
  const flat = css.replace(/\n/g,'');

  chk('the disclosure is styled once', /\.dis\{/.test(flat) && /\.dis summary\{/.test(flat));
  chk('a disclosure summary is a real focus stop',
      /\.dis summary:focus-visible\{[^}]*outline/.test(flat));
  chk('it is big enough to hit on a phone',
      /\.dis summary\{[^}]*min-height:32px/.test(flat) && coarseHasDis(),
      '32px summary + a ' + '--hit expander under a coarse pointer');
  chk('the open state says "open" without an icon font',
      /\.dis\[open\] summary::after\{content:/.test(flat));
  chk('the dashboard panel is no longer a button',
      !/button class="panel dash-figlink"/.test(src) &&
      !/\.dash-figlink-t\{/.test(flat));
  chk('a heading was added without changing its size',
      /\.sess-ex-h\{[^}]*font:inherit/.test(flat));
  /* The profile's four groups are the same idea at page scale: a record that
     states its own value, one tap from the form underneath. */
  chk('a profile group is a focus stop a thumb can hit',
      /\.prof-group > summary:focus-visible\{[^}]*outline/.test(flat) &&
      /\.prof-group > summary\{[^}]*min-height:var\(--hit\)/.test(flat));
  chk('the value line is a component, not an inline style',
      /\.prof-val\{[^}]*font-family/.test(flat) &&
      !/style="[^"]*prof-val/.test(src));
  chk('the group says open and closed without an icon font',
      /\.prof-group\[open\] > summary::after\{content:/.test(flat));
  /* The session's exercise blocks are the same disclosure at work: the summary
     is the whole target, the current lift is marked by more than colour, and a
     folded block still states its progress. */
  chk('a session block summary is a focus stop and a full-height target',
      /\.ex-block > \.ex-block-sum:focus-visible\{[^}]*outline/.test(flat) &&
      /\.ex-block > \.ex-block-sum\{[^}]*min-height:var\(--hit\)/.test(flat));
  chk('the current lift is marked by a border, not only by colour',
      /\.ex-block\.is-current\{[^}]*border-color/.test(flat));
  chk('rest is styled as a bar with a track and a painted fill',
      /\.restbar\b/.test(flat));
  /* One accordion, not two. The older .acc pattern was left in the stylesheet
     and the motion module after its last caller moved to .dis. */
  chk('the superseded accordion is gone from both the stylesheet and the code',
      !/\.acc\{/.test(flat) && !/\.acc-body\{/.test(flat) &&
      !/bindAccordions/.test(src));
  /* The verdict card's own disclosure sits on an ink ground, so it needs its own
     focus ring and its own touch expander. */
  chk('the verdict\u2019s "more lifts" line is focusable and hit-sized',
      /\.next-ex-more > summary:focus-visible\{[^}]*outline/.test(flat) &&
      /\.next-ex-more > summary\{[^}]*min-height:/.test(flat));
  chk('and it carries the coarse-pointer expander like every other summary',
      /\.next-ex-more > summary::before/.test(css));
  chk('the session uses the screen heading it was missing',
      /<h1 class="sess-h">/.test(src) || /'<h1 class="sess-h">'/.test(src));
  function coarseHasDis(){
    const i = css.indexOf('@media (pointer: coarse)');
    if(i < 0) return false;
    const j = css.indexOf('\n}', i);
    const block = css.slice(i, j);
    return /\.dis summary/.test(block);
  }
}

group('8m. Text on a wash is measured, not assumed');
{
  /* Contrast against paper is not the whole story: half the state vocabulary is a
     word on a tint. Compositing the wash first is the only way to know. */
  const tint = name => {
    const v = token(name) || '';
    const m = /rgba?\(([^)]+)\)/.exec(v);
    if(!m) return null;
    const p = m[1].split(',').map(x => parseFloat(x));
    return { hex:'#' + p.slice(0,3).map(n => Math.round(n).toString(16).padStart(2,'0')).join(''),
             a: p.length > 3 ? p[3] : 1 };
  };
  const over = (t, base) => {
    const f = rgb(t.hex), b = rgb(base);
    return '#' + f.map((c,i) => Math.round(c*t.a + b[i]*(1-t.a))
      .toString(16).padStart(2,'0')).join('');
  };
  const paper = hex(token('paper'));
  const wash = n => over(tint(n), paper);

  const pairs = [
    ['a warn flag',        hex(token('ink')),   wash('warn-tint')],
    ['a new flag',         hex(token('ink')),   wash('burnt-tint')],
    ['an ok flag',         hex(token('ink')),   wash('ok-tint')],
    ['an alert flag',      hex(token('ink')),   wash('alert-tint')],
    ['a banner sentence',  hex(token('ink-2')), wash('alert-tint')],
    ['the strip sentence', hex(token('ink-2')), wash('alert-tint')],
    ['the strip title',    hex(token('alert')), wash('alert-tint')],
    ['the strip mark',     hex(token('ivory')), hex(token('alert'))],
    ['a saved toast',      hex(token('ivory')), hex(token('ok'))],
    ['a failed toast',     hex(token('ivory')), hex(token('alert'))]
  ];
  const bad = pairs.filter(([,f,b]) => contrast(f,b) < 4.5);
  chk('every state label clears AA on the wash it actually sits on',
      bad.length === 0,
      bad.map(([n,f,b]) => n + ' ' + contrast(f,b).toFixed(2)).join(', ') ||
      pairs.map(([,f,b]) => contrast(f,b).toFixed(1)).join(' '));

  /* The wash is decoration; the word is ink. So no state flag may colour its own
     text, which is how two of them came to sit at 4.00:1 and 3.98:1. */
  const flagRules = (css.match(/\.flag\.(?:ok|warn|alert|new)[^{]*\{[^}]*\}/g) || []);
  const tinted = flagRules.filter(r => /(?:^|;)\s*color\s*:/.test(r));
  chk('no state flag paints its own label — the dot carries the state',
      tinted.length === 0, flagRules.length + ' rules, ' + tinted.length + ' tinted');

  /* A token nothing uses is a colour somebody will re-invent. SVG drawn from JS
     reads tokens through token('name'), so both readers are counted. */
  const js = ['app.js','ui/components.js','ui/screens.js','ui/workout.js','ui/science.js',
              'ui/modules.js','ui/anatomy3d.js','ui/motion.js']
    .map(f => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).join('\n');
  const declared = (css.match(/--[a-z0-9-]+\s*:/g) || [])
    .map(x => x.replace(/\s*:$/, ''))
    .filter(n => !/^--(f|fs|s|r|t|hair|lh|w)-?/.test(n));
  const unused = [...new Set(declared)].filter(n => {
    const name = n.replace(/^--/, '');
    const inCss = (css.match(new RegExp('var\\(' + n + '\\)', 'g')) || []).length;
    const inJs = (js.match(new RegExp("token\\(\\s*'" + name + "'", 'g')) || []).length;
    return inCss + inJs === 0;
  });
  chk('no declared token is dead — in the stylesheet or in the drawings',
      unused.length === 0, unused.join(', '));
}

group('8n. Every target is big enough for a thumb in a gym');
{
  /* Split the stylesheet into rules, so "how tall is that control" is answered by
     the file rather than by memory. */
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = (text, start) => {
    const out = []; let i = start || 0;
    while(i < text.length){
      const j = text.indexOf('{', i); if(j < 0) break;
      const sel = text.slice(i, j).trim(); let d = 1, k = j + 1;
      while(k < text.length && d){ const c = text[k]; if(c === '{') d++; else if(c === '}') d--; k++; }
      out.push([sel, text.slice(j + 1, k - 1), i]); i = k;
    }
    return out;
  };
  const flat = [];
  const walk = t => blocks(t).forEach(([sel, body]) => sel.startsWith('@media') ? walk(body) : flat.push([sel, body]));
  walk(bare);

  const single = {};
  flat.forEach(([sel, body]) => {
    if(!/[ ,]/.test(sel) && /^[.#][\w.\- ]+$/.test(sel)){
      const m = /(?:^|;)\s*min-height\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
      if(m) single[sel] = parseFloat(m[1]);
    }
  });
  /* Only rules that are themselves clickable count. A variant such as
     `.flag.ok` inherits the size of `.flag`; it is not a second control. */
  const smallClickable = [];
  flat.forEach(([sel, body]) => {
    if(!/cursor\s*:\s*pointer/.test(body)) return;
    let h = null;
    const own = /(?:^|;)\s*min-height\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
    if(own) h = parseFloat(own[1]);
    else {
      const hs = (sel.match(/\.[\w-]+/g) || []).map(c => single[c]).filter(v => v !== undefined);
      if(hs.length) h = Math.min.apply(null, hs);
    }
    if(h !== null && h < 44 && smallClickable.indexOf(sel) < 0) smallClickable.push(sel.trim());
  });

  /* The controls that stay small, and why. Anything new below 44px that is not
     on this list fails the check below, which is the point. */
  const exempt = {
    '.chip': 'chips sit shoulder to shoulder in a row: a 44px invisible area would steal its neighbour'
  };
  const coarse = blocks(bare).filter(([sel]) => /@media\s*\(pointer:\s*coarse\)/.test(sel))
    .map(([, body]) => body).join('\n');

  /* Two things have to be true, and only one of them is visible in a diff: the
     invisible area must exist, and the control must be the thing it is positioned
     against. Drop the position and the overlay escapes to the nearest ancestor —
     still in the file, no longer a target. */
  const esc = sel => sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const handled = sel => {
    const anchored = new RegExp('(^|[,{\\s])' + esc(sel) + '[^{]*\\{[^}]*position:\\s*relative').test(coarse);
    const area = new RegExp(esc(sel) + '::(?:after|before)').test(coarse);
    return anchored && area;
  };
  const unhandled = smallClickable.filter(sel => !exempt[sel] && !handled(sel));
  chk('no control is left under 44px without an invisible target',
      unhandled.length === 0,
      smallClickable.length + ' small controls; unhandled: ' + unhandled.join(', '));

  chk('the expansion only exists on a coarse pointer',
      /@media\s*\(pointer:\s*coarse\)[\s\S]*?\.link-btn/.test(bare) &&
      bare.split('@media (pointer: coarse)').length === 2);

  const hit = token('hit');
  chk('the target size is one number, and it is at least 44px',
      hit && parseFloat(hit) >= 44 && /var\(--hit\)/.test(coarse), hit);
}

group('9. Reusable component vocabulary');
{
  const needed = ['panel','btn','tile','chip','flag','metric','empty','banner','toast',
                  'sheet','skeleton','setcard','factor','fig-stage','metrics'];
  const missing = needed.filter(c => css.indexOf('.' + c) < 0);
  chk('all named component classes exist in the stylesheet', missing.length === 0, missing.join(', '));

  // every component should declare the states the brief asked for where relevant
  chk('buttons declare hover, active and disabled',
      /\.btn:hover/.test(css) && /\.btn:active/.test(css) && /\.btn:disabled/.test(css));
  chk('buttons declare a loading state', /\.btn\.loading/.test(css));
  chk('inputs declare focus', /input:focus/.test(css));
  chk('tiles declare selected state', /\.tile\.on/.test(css));
  /* The onboarding tile is a grid row: `<box><span>` are its only children, so
     one of them has to be placed or the whole answer column auto-flows into the
     20 px slot and renders on top of the radio. The caption inside it is
     `display:block` for the same reason — a plain <span> has no line of its own
     and the title runs into its description. */
  chk('the onboarding tile places both of its children', /\.onb-frame \.tile > span\{[^}]*grid-column/s.test(css));
  chk('a tile caption is its own line, not a run-on',
      /\.onb-frame \.tile > span \.d\{[^}]*display:block/s.test(css) ||
      /\.onb-frame \.tile \.d\{[^}]*display:block/s.test(css));
  chk('empty, error and success feedback exist',
      /\.empty\{/.test(css) && /\.banner\.alert/.test(css) && /\.banner\.ok/.test(css));

  /* ---- the things a browser pass found that jsdom could not --------------
     Each of these was a real, rendered defect: a loading overlay that stayed
     painted over the 3D canvas, ink-on-ink buttons inside the dark HUD, a
     status word glued to its sentence, and a count glued to a tab label.
     They are asserted here so the stylesheet cannot quietly lose them. */
  chk('the hidden attribute outranks a component display rule',
      /\[hidden\]\{[^}]*display:none!important/.test(css));
  chk('a quiet button on a dark surface is styled for that surface',
      /\.live-hud \.btn\.quiet\{[^}]*color:var\(--ivory\)/s.test(css) &&
      /\.live-hud \.btn\.quiet\{[^}]*min-height:var\(--hit\)/s.test(css));
  chk('the banner status word has a rule of its own',
      /\.banner \.ic\{/.test(css) && /\.banner\{display:flex/.test(css));
  chk('the tab count is separated from the tab label',
      /\.subnav-cnt\{[^}]*margin-inline-start/s.test(css) &&
      /\.subnav-cnt::before\{content:"·"/.test(css));
  /* Paper is paper: the print document's A4 geometry must not leak into the
     modal overlay that shares its class name. A bare `.sheet{width:210mm}` is
     what turned every bottom sheet into a poster. */
  chk('the print sheet geometry is scoped to the print root',
      /#printRoot \.sheet\{/.test(css) && !/\n\.sheet\{[^}]*210mm/s.test(css));
  chk('the sheet is anchored to the bottom, not the top',
      /\.sheet\{[^}]*top:auto/s.test(css) && /\.sheet\{[^}]*bottom:0/s.test(css));
  /* A phone keyboard covers the bottom half of the screen, which is where the
     tab bar is and where the set's Log button lands. The bar steps aside and
     the set keeps its action in reach — but only below the rail breakpoint,
     and not at all under reduced motion. */
  chk('the tab bar steps aside while a field has the keyboard',
      /@media \(max-width:1023px\)\{\s*body\.typing nav\.tabbar\{[^}]*translateY/s.test(css));
  chk('the set being typed into keeps its action in reach',
      /\.setcard:focus-within \.set-actions\{[^}]*sticky/s.test(css));
  chk('the motion it uses is switched off under reduced motion',
      /prefers-reduced-motion:reduce\)\{\s*nav\.tabbar\{transition:none\}/s.test(css));

  chk('the sheet carries its own way out, in the title row',
      /\.sheet-hd\{/.test(css) && /\.sheet-x\{/.test(css));
  /* An inline <svg viewBox="0 0 24 24"> with no width is a 547 px square in a
     547 px column. The tap hint on Body took 560 px of page until a full-page
     screenshot found it. */
  /* Rest alerts: the permission is asked for from the switch and nowhere else,
     the notification only goes out when the tab cannot be seen, and a click on
     it brings the app forward instead of leading nowhere. */
  const screens = fs.readFileSync(path.join(ROOT, 'js/ui/screens.js'), 'utf8');
  const bootjs  = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const sw      = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  chk('the rest alert is opt-in and never asked for on load',
      /profile\.restNotify !== true\) return false/.test(screens) &&
      /function setRestNotify\(/.test(screens) &&
      !/requestPermission/.test(bootjs),
      'setRestNotify is the only caller of requestPermission');
  chk('the notification is only posted when the tab is in the background',
      /if\(!document\.hidden\) return false;/.test(screens));
  chk('the service worker handles the click and focuses the window',
      /addEventListener\('notificationclick'/.test(sw) && /clients\.matchAll/.test(sw));

  /* A component's parts belong to the component, not to the one screen that was
     being looked at when they were written. The tile's caption and checkbox were
     styled under .onb-frame only, so every tile outside onboarding rendered
     "High contrastStronger borders..." with a 0 x 0 box. Each base rule must
     exist at the start of a line, which an .onb-frame-prefixed copy does not. */
  const baseRule = sel => {
    const m = new RegExp('(^|\\n)\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}').exec(css);
    return m ? m[2] : '';
  };
  chk("the tile's caption and checkbox are styled where every tile can reach them",
      /display:block/.test(baseRule('.tile .t')) &&
      /display:block/.test(baseRule('.tile .d')) &&
      /width:18px/.test(baseRule('.tile .box')),
      'title, description and box are their own lines at every width');

  chk('inline icons are given a size, not the width of the column',
      /\.fig-hint svg\{[^}]*width:\s*\d+px[^}]*height:\s*\d+px/s.test(css));

  chk('the exercise figures sit side by side, not stacked',
      /\.ex-vis-figs\{display:grid;grid-template-columns:1fr 1fr/.test(css) &&
      /\.ex-vis-figs svg\{[^}]*max-height/s.test(css));

  chk('the set row is a grid of fields, not a flex row of fragments',
      /\.setcard \.row\.nowrap\{[^}]*display:grid/s.test(css) &&
      /\.setcard \.fld\{[^}]*grid-template-columns/s.test(css));
}

group('8p. Every evidence capture runs to the full document');
{
  /* The two findings that no screenshot had ever caught — a 547 px tap icon and
     a raw i18n key — were both below the fold of a first-screen shot. A capture
     that stops at the viewport is a claim about the top of the page wearing the
     title of a claim about the page. */
  const br = fs.readFileSync(path.join(ROOT, 'tests/browser.js'), 'utf8');
  chk('no capture stops at the viewport height', !/fullPage:\s*false/.test(br));
  const direct = (br.match(/page\.screenshot\(/g) || []).length;
  chk('every capture goes through the one helper that sets fullPage',
      direct === 1 && /fullPage:\s*true/.test(br), direct + ' direct page.screenshot calls');
  const named = (br.match(/await shot\(page, '[^']+'/g) || []).length;
  chk('and the thirteen named captures are all taken through it', named >= 13, named + ' named captures');

  /* A capture gated on a width the loop never visits is a file in a directory
     listing that no run ever wrote: six of these sat at 360 and 1280 while the
     loop walked 320, 375, 390, 768, 1024 and 1440. */
  const wid = /const widths = \[([^\]]+)\]/.exec(br);
  const walked = wid ? wid[1].split(',').map(x => parseInt(x, 10)).filter(Boolean) : [];
  const gates = (br.match(/vw === (\d+)/g) || []).map(x => parseInt(x.replace(/\D/g, ''), 10));
  chk('every capture gate names a width the loop actually walks',
      gates.length > 0 && gates.every(g => walked.indexOf(g) >= 0),
      'gates ' + JSON.stringify(gates) + ' vs widths ' + JSON.stringify(walked));
}

group('8q. The exercise register is a grid it actually uses');
{
  /* `.ex-grid` was display:block while a >=560 px rule set
     grid-template-columns on it — a declaration with no effect, which is how 88
     rows stayed one 1,440 px-wide column, 7 684 px tall, at every width. */
  const base = /\.ex-grid\{([^}]*)\}/.exec(css);
  chk('.ex-grid is a grid, not a block', !!base && /display:\s*grid/.test(base[1]),
      base ? base[1].trim().slice(0, 60) : 'rule missing');
  chk('it declares one column of its own before any breakpoint',
      !!base && /grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(base[1]));
  /* Two columns of 300 px each need a 720 px page, not 560: at 560 the columns
     came out 244 px wide and 85 of 88 cards clipped their own text. */
  /* Brace-matched, because a lazy regex reads past the end of one media block
     and finds the rule in the next one. */
  const blocks = (opening) => {
    const out = [];
    let i = css.indexOf(opening);
    while(i >= 0){
      let j = css.indexOf('{', i), depth = 0, k = j;
      for(; k < css.length; k++){
        if(css[k] === '{') depth++;
        else if(css[k] === '}' && --depth === 0) break;
      }
      out.push(css.slice(j + 1, k));
      i = css.indexOf(opening, k);
    }
    return out;
  };
  const at720 = blocks('@media (min-width:720px){');
  const at560 = blocks('@media (min-width:560px){');
  chk('the two-column rule lives at 720 px, where two columns fit',
      at720.some(b => /\.ex-grid\{grid-template-columns:repeat\(2/.test(b)),
      at720.length + ' blocks at 720 px');
  chk('and nothing asks for two columns at 560 px',
      at560.length > 0 && !at560.some(b => /\.ex-grid\{grid-template-columns:repeat\(2/.test(b)),
      at560.length + ' blocks at 560 px');
}

/* ================================================================ */
group('8r. The masthead asks nothing; the first screen asks one thing');
{
  /* A language you answer once is not furniture. The masthead is the mark, the
     wordmark and — when something is wrong — the offline flag. Nothing else may
     live there, and the way to hold that is to assert the *whole* strip rather
     than the selector of a menu someone already deleted. */
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const hdr  = (/<header>[\s\S]*?<\/header>/.exec(html) || [''])[0];
  const right = (/<div class="hd-right">[\s\S]*?<\/div>/.exec(hdr) || [''])[0];

  /* The row that is always on screen — mark, wordmark, tagline, right slot —
     holds no control at all. The two strips below it are the exception the app
     earns: a record that will not open, and a deploy that replaced the files
     under a running tab. Both start hidden, so neither is furniture. */
  const strip = hdr.indexOf('<div class="store-flag"');
  const top  = strip > 0 ? hdr.slice(0, strip) : hdr;
  const acts = hdr.match(/data-act="[^"]+"/g) || [];
  chk('the always-visible masthead row carries no control',
      top.length > 0 && !/data-act=/.test(top) && !/<button|<a\s|<select/.test(top),
      top.replace(/\s+/g, ' ').slice(0, 70));
  chk('the only buttons the header owns are the two recovery offers, both hidden',
      acts.length === 2 && acts.indexOf('data-act="doExport"') >= 0 &&
      acts.indexOf('data-act="reloadApp"') >= 0 &&
      /id="storeFlag"[^>]*hidden/.test(hdr) && /id="updateFlag"[^>]*hidden/.test(hdr),
      acts.join(' ') || 'none');
  chk('its right slot holds one thing: the offline flag, and it starts hidden',
      /id="netFlag"/.test(right) && /id="netFlag"[^>]*hidden/.test(right) &&
      !/data-act=/.test(right),
      right.replace(/\s+/g, ' ').slice(0, 70));
  chk('the header declares no language of its own, only rows and prints do',
      !/lang=/.test(hdr));

  /* "Language right after the loading animation" is an ordering claim, so it is
     asserted as ordering: the gate is chosen before the step frame is, and the
     language is not one of the eleven steps. */
  const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const scr = fs.readFileSync(path.join(ROOT, 'js/ui/screens.js'), 'utf8');
  chk('the language question is a gate before onboarding, not a step in it',
      /askingLang\s*=\s*onboarding\s*&&\s*!s\.langChosen/.test(app) &&
      /askingLang \? \(Screens\.lang \? Screens\.lang\(\) : Screens\.onb\(\)\)/.test(app) &&
      !/const ONB_STEPS = \[[^\]]*'lang'/.test(scr),
      'gate ' + (/askingLang\s*=/.test(app) ? 'present' : 'missing'));
  chk('the way back to it is one row in the settings, and it is generated once',
      (scr.match(/data-act="switchLang"/g) || []).length === 1 &&
      /LANGS\.map\(l => '<button class="tile radio /.test(scr),
      (scr.match(/data-act="switchLang"/g) || []).length + ' generators');
}

/* ================================================================ */
console.log('\n' + '='.repeat(64));
if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' DESIGN TESTS PASSED\x1b[0m');
else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed'); failures.forEach(f => console.log('   - ' + f)); }
console.log('='.repeat(64) + '\n');
process.exit(fail === 0 ? 0 : 1);
