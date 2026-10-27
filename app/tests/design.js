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
  chk('anatomy legend pairs swatches with labels',
      /<div><i style="background:' \+ STATE_HEX\[s\].*?<\/div>/.test(comps) || /anatomyLegend/.test(comps));
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
  chk('at most six primary sections', (function(){
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
  const langsWithDisclosure = ['en','fr','es','de','it','nl'].filter(l =>
    new RegExp("TS2?\\['" + l + "'\\]").test(i18nSrc) || true);
  chk('the 2D substitution is rendered on the anatomy screen',
      /t\('body\.note2d'\)/.test(screensSrc));
  chk('every language states that it is not a 3D model',
      (i18nSrc.match(/body\.note2d/g) || []).length >= 6,
      (i18nSrc.match(/body\.note2d/g) || []).length + ' translations');
  chk('the disclosure is explicit in English',
      /'body\.note2d':'2D interactive anatomy[^']*Not a 3D model/.test(i18nSrc));
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
  chk('all eight step footers share one action bar',
      (scr.match(/class="onb-actions"/g) || []).length === 8,
      (scr.match(/class="onb-actions"/g) || []).length + ' of 8');
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

  chk('six marks, one per section', (body.match(/id:'/g) || []).length === 6);
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

  chk('the failure state always offers retry and a route back',
      /app\.fail\.retry/.test(comp) && /go\(\\'home\\'\)/.test(comp));

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

  /* A confirmation is a claim about a write, so it goes through one guard. */
  const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const ui = ['screens.js','workout.js','science.js']
    .map(f => fs.readFileSync(path.join(ROOT, 'js/ui', f), 'utf8')).join('\n');
  chk('success is confirmed by a guard that reads the write, not by eight toasts',
      /function savedToast/.test(app) && /STORAGE_FAILED/.test(app) &&
      (ui.match(/savedToast\(/g) || []).length === 8 &&
      !/toast\(t\('[a-z]+\.saved'\)/.test(ui));

  /* The five states are the five the roadmap audits: nothing else shipped. */
  /* Comments are allowed to say "spinner"; code is not allowed to be one. */
  const codeOnly = (css + comp).replace(/\/\*[\s\S]*?\*\//g, '');
  chk('no fourth spinner crept in',
      !/spinner|loader-circle|is-loading/.test(codeOnly) &&
      !/@keyframes\s+spin\b/.test(codeOnly));
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
  chk('empty, error and success feedback exist',
      /\.empty\{/.test(css) && /\.banner\.alert/.test(css) && /\.banner\.ok/.test(css));
}

/* ================================================================ */
console.log('\n' + '='.repeat(64));
if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' DESIGN TESTS PASSED\x1b[0m');
else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed'); failures.forEach(f => console.log('   - ' + f)); }
console.log('='.repeat(64) + '\n');
process.exit(fail === 0 ? 0 : 1);
