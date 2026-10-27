/* ============================================================================
   ANCESTOR — Components
   Hand-built SVG. No chart library, no icon font, no stock illustration.

   ANATOMY NOTE: this is a high-fidelity 2D interactive figure, not a 3D mesh.
   Geometry is validated by tools/fig_check.py — every region sits inside the
   body silhouette, left/right pairs are mirror-symmetric, and no two regions
   overlap beyond tolerance.
   ========================================================================== */

/* --------------------------------------------------------- STATE COLOURS */
const STATE_VAR = {
  ready:   'var(--ok)',
  caution: 'var(--warn)',
  rest:    'var(--alert)',
  fresh:   'var(--nodata)'
};
/* ------------------------------------------------------------------ TOKENS
   State colours are declared once, in the stylesheet, and read back here.
   They used to be written twice — once as CSS custom properties and once as
   literals in this file — which is how the anatomy figure ended up painting
   #8C8A80, a grey that exists nowhere in the design system.

   Read once and memoised: this runs for every path of every figure, and a
   getComputedStyle call per path would be a per-frame cost for no reason. */
const STATE_TOKEN = { ready:'ok', caution:'warn', rest:'alert', fresh:'nodata' };
const STATE_FALLBACK = { ready:'#46603F', caution:'#8A5E12', rest:'#963F28', fresh:'#7F7D73' };
const _tokenCache = {};

function token(name, fallback){
  if (_tokenCache[name] !== undefined) return _tokenCache[name] || fallback;
  let v = '';
  try {
    v = getComputedStyle(document.documentElement)
          .getPropertyValue('--' + name).trim();
  } catch (e) { v = ''; }
  _tokenCache[name] = v;
  return v || fallback;
}

/* Redraw after a theme or contrast change. */
function tokenReset(){ Object.keys(_tokenCache).forEach(k => delete _tokenCache[k]); }

const STATE_HEX = {
  get ready()    { return token('ok',     STATE_FALLBACK.ready); },
  get caution()  { return token('warn',   STATE_FALLBACK.caution); },
  get rest()     { return token('alert',  STATE_FALLBACK.rest); },
  get fresh()    { return token('nodata', STATE_FALLBACK.fresh); }
};

/* ------------------------------------------------------ ANATOMY GEOMETRY */
/* Validated: 100% inside silhouette, symmetric, no overlap. */
const FIG = {
  view: '0 0 200 470',
  outline: [
    'M64,86 L136,86 L148,122 L132,186 L130,228 L100,256 L70,228 L68,186 L52,122 Z',
    'M58,88 C48,94 44,112 46,130 L41,200 L37,280 L50,286 L55,204 L60,150 L68,106 Z',
    'M142,88 C152,94 156,112 154,130 L159,200 L163,280 L150,286 L145,204 L140,150 L132,106 Z',
    'M70,224 L99,252 L95,352 L89,438 L75,440 L73,352 L67,290 Z',
    'M130,224 L101,252 L105,352 L111,438 L125,440 L127,352 L133,290 Z',
    'M87,52 L113,52 L116,80 L84,80 Z'
  ],
  head: { cx:100, cy:34, rx:20, ry:25 },
  regions: {
    front: {
      shoulders: ['M58,88 C48,94 43,112 46,132 L64,126 C61,112 60,100 60,88 Z',
                  'M142,88 C152,94 157,112 154,132 L136,126 C139,112 140,100 140,88 Z'],
      chest:     ['M62,94 L99,94 L99,146 C86,152 70,146 63,136 Z',
                  'M138,94 L101,94 L101,146 C114,152 130,146 137,136 Z'],
      biceps:    ['M48,134 L62,130 L55,194 L45,196 Z',
                  'M152,134 L138,130 L145,194 L155,196 Z'],
      forearms:  ['M43,208 L53,206 L49,276 L41,278 Z',
                  'M157,208 L147,206 L151,276 L159,278 Z'],
      abs:       ['M84,152 L116,152 L118,208 L82,208 Z',
                  'M68,146 L82,152 L82,204 L70,196 Z',
                  'M132,146 L118,152 L118,204 L130,196 Z'],
      quads:     ['M70,256 L96,256 L93,350 L71,348 Z',
                  'M130,256 L104,256 L107,350 L129,348 Z'],
      calves:    ['M74,362 L92,362 L89,432 L78,434 Z',
                  'M126,362 L108,362 L111,432 L122,434 Z']
    },
    back: {
      shoulders: ['M58,88 C48,94 43,112 46,132 L64,126 C61,112 60,100 60,88 Z',
                  'M142,88 C152,94 157,112 154,132 L136,126 C139,112 140,100 140,88 Z'],
      back:      ['M88,90 L112,90 L138,98 L116,128 L84,128 L62,98 Z',
                  'M66,124 L98,124 L96,172 C86,182 74,174 67,160 Z',
                  'M134,124 L102,124 L104,172 C114,182 126,174 133,160 Z'],
      lowerback: ['M84,176 L116,176 L118,214 L82,214 Z'],
      triceps:   ['M48,134 L62,130 L55,194 L45,196 Z',
                  'M152,134 L138,130 L145,194 L155,196 Z'],
      forearms:  ['M43,208 L53,206 L49,276 L41,278 Z',
                  'M157,208 L147,206 L151,276 L159,278 Z'],
      glutes:    ['M70,216 L130,216 L128,252 C112,260 88,260 72,252 Z'],
      hamstrings:['M72,264 L96,264 L93,350 L71,348 Z',
                  'M128,264 L104,264 L107,350 L129,348 Z'],
      calves:    ['M73,362 L93,362 L87,436 L75,436 Z',
                  'M127,362 L107,362 L113,436 L125,436 Z']
    }
  }
};

/* Muscle groups visible on each side, in a sensible reading order */
const SIDE_MUSCLES = {
  front: ['shoulders','chest','biceps','forearms','abs','quads','calves'],
  back:  ['shoulders','back','lowerback','triceps','forearms','glutes','hamstrings','calves']
};

function bboxOf(paths){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  paths.forEach(p => {
    const nums = p.match(/-?\d+(\.\d+)?/g) || [];
    for(let i=0;i+1<nums.length;i+=2){
      const x=+nums[i], y=+nums[i+1];
      if(x<x0)x0=x; if(x>x1)x1=x;
      if(y<y0)y0=y; if(y>y1)y1=y;
    }
  });
  if(x0>x1) return null;
  return {x0,y0,x1,y1};
}
FIG.bbox = {};
['front','back'].forEach(side => {
  FIG.bbox[side] = {};
  Object.keys(FIG.regions[side]).forEach(m => { FIG.bbox[side][m] = bboxOf(FIG.regions[side][m]); });
});

function viewFor(side, selected){
  if(!selected || !FIG.bbox[side][selected]) return FIG.view;
  const b = FIG.bbox[side][selected];
  const pad = 14;
  const w = Math.max(60, (b.x1-b.x0) + pad*2);
  const h = Math.max(60, (b.y1-b.y0) + pad*2);
  // keep the figure's aspect ratio so zoom never distorts
  const cx = (b.x0+b.x1)/2, cy = (b.y0+b.y1)/2;
  const scale = Math.max(w/200, h/470) * 1.6;
  const vw = 200*scale, vh = 470*scale;
  return [cx-vw/2, cy-vh/2, vw, vh].map(v => Math.round(v*10)/10).join(' ');
}

/* -------------------------------------------------------- ANATOMY FIGURE */
function anatomyFigure(state, opts){
  const o = opts || {};
  const side = o.side || 'front';
  const sel  = o.selected || null;
  const now  = o.now || Date.now();
  const rec  = allRecovery(state, now);
  const vb   = viewFor(side, sel);

  let out = '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" role="img" ' +
            'aria-label="' + esc(t('body.title') + '. ' + t('a11y.figureAlt')) + '" ' +
            'style="transition:all var(--t-slow) var(--ease)">';

  FIG.outline.forEach(d => { out += '<path class="fig-outline" d="' + d + '"/>'; });
  out += '<ellipse class="fig-outline" cx="' + FIG.head.cx + '" cy="' + FIG.head.cy +
         '" rx="' + FIG.head.rx + '" ry="' + FIG.head.ry + '"/>';

  SIDE_MUSCLES[side].forEach(m => {
    const paths = FIG.regions[side][m];
    if(!paths) return;
    const r = rec[m];
    const st = r ? r.state : 'fresh';
    const hasData = r && r.since !== null;
    const fill = STATE_HEX[st] || STATE_HEX.fresh;
    const opacity = hasData ? (0.28 + 0.5*Math.min(1, r.ratio)).toFixed(2) : 0.16;
    const isSel = (m === sel);
    paths.forEach(d => {
      out += '<path class="seg' + (isSel ? ' sel' : '') + '" data-m="' + m + '" d="' + d + '" ' +
             'fill="' + fill + '" fill-opacity="' + (isSel ? Math.min(1, +opacity + 0.3).toFixed(2) : opacity) + '" ' +
             'stroke="' + (isSel ? token('ink','#20211F') : fill) + '" stroke-width="' + (isSel ? 1.6 : 0.6) + '" ' +
             'stroke-opacity="' + (isSel ? 1 : 0.75) + '">' +
             '<title>' + esc(t('mg.' + m)) + ' — ' + esc(t('mst.' + st)) + '</title></path>';
    });
    if(isSel){
      // selection ring around the focused region
      const b = FIG.bbox[side][m];
      if(b) out += '<rect x="' + (b.x0-5) + '" y="' + (b.y0-5) + '" width="' + (b.x1-b.x0+10) +
                   '" height="' + (b.y1-b.y0+10) + '" fill="none" stroke="' + token('ink','#20211F') + '" ' +
                   'stroke-width="1" stroke-dasharray="4 3" opacity=".65" pointer-events="none"/>';
    }
  });
  /* Transparent hit layer drawn on top. The visible artwork is pointer-events:none,
     so this layer is the single, predictable tap target. A wide transparent
     stroke enlarges small regions (deltoids, forearms) to a realistic touch
     size without changing how anything looks. */
  SIDE_MUSCLES[side].forEach(m => {
    (FIG.regions[side][m] || []).forEach(d => {
      out += '<path class="seg-hit" data-m="' + m + '" d="' + d + '" ' +
             'fill="transparent" stroke="transparent" stroke-width="14" ' +
             'stroke-linejoin="round" stroke-linecap="round" ' +
             'tabindex="0" role="button" ' +
             'aria-label="' + esc(t('mg.' + m)) + ' — ' + esc(t('mst.' + (rec[m] ? rec[m].state : 'fresh'))) + '">' +
             '<title>' + esc(t('mg.' + m)) + '</title></path>';
    });
  });
  out += '</svg>';
  return out;
}

function anatomyLegend(){
  return '<div class="legend">' +
    ['ready','caution','rest','fresh'].map(s =>
      '<div><i style="background:' + STATE_HEX[s] + ';opacity:' + (s==='fresh'?'.35':'1') + '"></i>' +
      esc(t('mst.' + s)) + '</div>').join('') +
    '</div>';
}

/* ------------------------------------------------------- READINESS METER */
/* Score definition (explicit and testable):
   readiness = 100 x min over the muscles involved in the next session of
               (days since last recorded exposure / estimated recovery days)
   It is an estimate of whether enough time has passed, not a measurement
   of biological recovery. Rounded to the nearest 5% — no false precision. */
function readinessMeter(value, stateKey, opts){
  const o = opts || {};
  if(value === null || value === undefined){
    return '<div class="readiness"><div class="v" style="font-size:15px">' + esc(t('home.insufficient')) +
           '</div><div class="bar"><i style="width:0%"></i></div><div class="cap">' +
           esc(t('readiness.noscore')) + '</div></div>';
  }
  const rounded = Math.round(value*100/5)*5;
  const pct = Math.max(0, value < 1 ? Math.min(95, rounded) : Math.min(100, rounded));
  return '<div class="readiness">' +
    '<div class="v">' + pct + '<small>%</small></div>' +
    '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
    '<div class="cap">' + esc(t('readiness.label')) + '</div>' +
    (o.showDef ? '<div class="cap mt-1" style="max-width:150px;line-height:1.4">' +
      esc(t('readiness.definition')) + '</div>' : '') +
    '</div>';
}

/* ------------------------------------------------------------- METRICS */
/* A metric can carry an explanation. The explanation is reachable by pointer,
   by keyboard focus and by assistive technology — not hover alone.
   When `numKey` is given and `value` is numeric, hydrateMotion() animates
   from the previous real value to the new real value. */
function metric(key, value, unit, delta, tip, numKey, decimals){
  const isNum = numKey && typeof value === 'number' && isFinite(value);
  const vAttrs = isNum
    ? ' class="v num" data-num-key="' + esc(numKey) + '" data-num-to="' + value +
      '" data-num-dec="' + (decimals || 0) + '"'
    : ' class="v"';
  return '<div class="metric">' +
    '<div class="k">' + esc(key) +
      (tip ? '<button type="button" class="tip" aria-label="' + esc(tip) + '" ' +
             'data-tip="' + esc(tip) + '">?</button>' : '') +
    '</div>' +
    '<div' + vAttrs + '>' + esc(value) + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</div>' +
    (delta ? '<div class="d">' + esc(delta) + '</div>' : '') + '</div>';
}
function metricsBlock(items){
  return '<div class="metrics">' +
    items.map(i => metric(i.k, i.v, i.u, i.d, i.tip, i.numKey, i.dec)).join('') + '</div>';
}

/* --------------------------------------------------------------- TABLE */
function dataTable(cols, rows, caption){
  let h = '<div class="table-wrap"><table class="data">';
  if(caption) h += '<caption>' + esc(caption) + '</caption>';
  h += '<thead><tr>' + cols.map(c => '<th class="end"' + (c.n ? ' ' : '') + '>' +
       esc(c.label) + (c.unit ? ' <span class="meta">(' + esc(c.unit) + ')</span>' : '') +
       '</th>').join('') + '</tr></thead><tbody>';
  if(!rows.length){
    h += '<tr><td colspan="' + cols.length + '" class="td-empty">' +
         esc(t('state.none')) + '</td></tr>';
  }
  rows.forEach(r => {
    h += '<tr>' + r.map((c,i) => '<td' + (cols[i] && cols[i].n ? ' class="n"' : '') + '>' +
         (c === null || c === undefined ? '—' : c) + '</td>').join('') + '</tr>';
  });
  h += '</tbody></table></div>';
  return h;
}

/* --------------------------------------------------------------- CHARTS */
function niceCeil(v){
  if(v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v/mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step*mag;
}

let CHART_SEQ = 0;
function showChartTip(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text || '';
}

/* Line chart: load per session. Title, units, axes and period are mandatory. */
function lineChart(opts){
  const W = 640, H = 240, PL = 46, PR = 26, PT = 16, PB = 34;
  const pts = opts.points || [];
  const unit = opts.unit || '';
  const label = opts.label || '';

  if(pts.length === 0) return emptyState('chart.nodata', 'chart.nodata.body');
  if(pts.length === 1){
    // one point cannot show a trend — say so instead of drawing a fake line
    return '<div class="chart-hd"><span class="t">' + esc(opts.title) + '</span></div>' +
      banner('info', t('chart.onepoint.title'), t('chart.onepoint.body'));
  }

  const tipId = 'ctip_' + (++CHART_SEQ);
  const vals = pts.map(p => p.v);
  const rawMax = Math.max.apply(null, vals);
  const rawMin = Math.min.apply(null, vals);
  const max = niceCeil(rawMax * 1.08);
  const min = Math.max(0, rawMin * 0.85);
  const x = i => PL + (i/(pts.length-1))*(W-PL-PR);
  const y = v => PT + (1 - (v-min)/Math.max(0.0001,(max-min)))*(H-PT-PB);

  let g = '';
  for(let k=0;k<=4;k++){
    const v = min + (max-min)*k/4, yy = y(v);
    g += '<line x1="' + PL + '" y1="' + yy.toFixed(1) + '" x2="' + (W-PR) + '" y2="' + yy.toFixed(1) +
         '" stroke="var(--recess-2)" stroke-width="1"/>' +
         '<text x="' + (PL-8) + '" y="' + (yy+3.5).toFixed(1) + '" fill="var(--tech-ink)" ' +
         'font-size="10" text-anchor="end" font-family="var(--f-mono)">' + Math.round(v) + '</text>';
  }
  // x labels: first, middle, last — anchor edge labels inward so they never clip
  [0, Math.floor((pts.length-1)/2), pts.length-1].filter((v,i,a)=>a.indexOf(v)===i).forEach(i => {
    const anchor = i === 0 ? 'start' : (i === pts.length - 1 ? 'end' : 'middle');
    const dx = i === 0 ? -2 : (i === pts.length - 1 ? 2 : 0);
    g += '<text x="' + (x(i)+dx).toFixed(1) + '" y="' + (H-12) + '" fill="var(--tech-ink)" font-size="9.5" ' +
         'text-anchor="' + anchor + '" font-family="var(--f-mono)">' + esc(pts[i].label) + '</text>';
  });

  const d = pts.map((p,i) => (i?'L':'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
  const dots = pts.map((p,i) => {
    const valTxt = p.text ? p.text : ((Math.round(p.v*10)/10) + (unit ? ' ' + unit : ''));
    const fullTip = p.label + ' — ' + valTxt + (p.best ? ' (' + t('chart.pr') + ')' : '');
    const jsTip = fullTip.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<g class="chart-pt" tabindex="0" role="listitem" aria-label="' + esc(fullTip) + '" ' +
      'onmouseenter="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')" ' +
      'onfocus="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')" ' +
      'onclick="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')">' +
      '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="11" fill="transparent"/>' +
      '<circle class="pt-dot" cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) +
      '" r="' + (p.best?4.2:3) + '" fill="' + (p.best?'var(--burnt)':'var(--surface)') +
      '" stroke="var(--burnt)" stroke-width="' + (p.best?2:1.6) + '"/>' +
      '<title>' + esc(fullTip) + '</title></g>';
  }).join('');

  const first = pts[0], last = pts[pts.length-1];
  const latestTip = last.label + ' — ' + (last.text ? last.text : ((Math.round(last.v*10)/10) + (unit ? ' ' + unit : '')));

  return '<div class="chart-hd"><span class="t">' + esc(opts.title) + '</span>' +
    '<span class="p">' + esc(opts.period) + ' · ' + esc(t('chart.unit')) + ': ' + esc(unit) + '</span></div>' +
    '<svg class="chart chart-anim" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title) + '">' +
    g +
    '<path class="chart-path" pathLength="1000" d="' + d + '" fill="none" stroke="var(--burnt)" stroke-width="2" stroke-linejoin="round"/>' +
    '<g role="list">' + dots + '</g>' +
    '<line x1="' + PL + '" y1="' + (H-PB) + '" x2="' + (W-PR) + '" y2="' + (H-PB) +
      '" stroke="var(--ink)" stroke-width="1"/>' +
    '</svg>' +
    '<div class="chart-legend"><div><i class="sw direct"></i>' + esc(label) +
    '</div><div><i class="sw dot"></i>' +
    esc(t('chart.pr')) + '</div>' +
    '<span class="chart-tip-readout mono" id="' + tipId + '" aria-live="polite">' + esc(latestTip) + '</span></div>' +
    '<p class="sr-only">' + esc(t('chart.summarySpark', {
      first: first.label + ' ' + (Math.round(first.v*10)/10) + (unit ? ' ' + unit : ''),
      last:  last.label  + ' ' + (Math.round(last.v*10)/10)  + (unit ? ' ' + unit : ''),
      min:   Math.round(rawMin*10)/10,
      max:   Math.round(rawMax*10)/10
    })) + '</p>';
}

/* Bar chart: volume by muscle group. */
function barChart(opts){
  const W = 640, H = 220, PL = 46, PR = 14, PT = 14, PB = 40;
  const rows = opts.rows || [];
  if(!rows.length) return emptyState('chart.nodata', 'chart.nodata.body');
  const tipId = 'ctip_' + (++CHART_SEQ);
  const max = niceCeil(Math.max.apply(null, rows.map(r => r.v)) * 1.1) || 1;
  const bw = (W-PL-PR)/rows.length;
  const u = opts.unit || '';
  let g = '';
  for(let k=0;k<=4;k++){
    const v = max*k/4, yy = PT + (1 - k/4)*(H-PT-PB);
    g += '<line x1="' + PL + '" y1="' + yy.toFixed(1) + '" x2="' + (W-PR) + '" y2="' + yy.toFixed(1) +
         '" stroke="var(--recess-2)" stroke-width="1"/>' +
         '<text x="' + (PL-8) + '" y="' + (yy+3.5).toFixed(1) + '" fill="var(--tech-ink)" font-size="10" ' +
         'text-anchor="end" font-family="var(--f-mono)">' + Math.round(v) + '</text>';
  }
  rows.forEach((r,i) => {
    const h = (r.v/max)*(H-PT-PB);
    const bx = PL + i*bw + bw*0.16, bwid = bw*0.68;
    const tipTxt = (r.name || r.short) + ' — ' + Math.round(r.v*10)/10 + (u ? ' ' + u : '');
    const jsTip = tipTxt.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    g += '<g class="chart-bar-g" tabindex="0" role="listitem" aria-label="' + esc(tipTxt) + '" ' +
         'onmouseenter="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')" ' +
         'onfocus="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')" ' +
         'onclick="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')">' +
         '<rect class="chart-bar" style="animation-delay:' + (i*28) + 'ms" x="' + bx.toFixed(1) + '" y="' + (H-PB-h).toFixed(1) + '" width="' + bwid.toFixed(1) +
         '" height="' + Math.max(1,h).toFixed(1) + '" fill="' + (r.col||'var(--burnt)') +
         '" fill-opacity="' + (r.v>0?'.85':'.25') + '"><title>' + esc(tipTxt) + '</title></rect>' +
         '<text x="' + (bx+bwid/2).toFixed(1) + '" y="' + (H-24) + '" fill="var(--tech-ink)" ' +
         'font-size="9" text-anchor="middle" font-family="var(--f-mono)">' + esc(r.short) + '</text>' +
         '<text x="' + (bx+bwid/2).toFixed(1) + '" y="' + (H-12) + '" fill="var(--ink-3)" ' +
         'font-size="9" text-anchor="middle" font-family="var(--f-mono)">' + Math.round(r.v) + '</text></g>';
  });
  const srList = rows.map(r => (r.name || r.short) + ' ' + Math.round(r.v*10)/10).join(', ');
  return '<div class="chart-hd"><span class="t">' + esc(opts.title) + '</span><span class="p">' +
    esc(opts.period) + ' · ' + esc(t('chart.unit')) + ': ' + esc(u) + '</span></div>' +
    '<svg class="chart chart-anim" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title) + '">' +
    '<g role="list">' + g + '</g>' +
    '<line x1="' + PL + '" y1="' + (H-PB) + '" x2="' + (W-PR) + '" y2="' + (H-PB) +
    '" stroke="var(--ink)" stroke-width="1"/></svg>' +
    '<div class="chart-legend"><span class="chart-tip-readout mono" id="' + tipId + '" aria-live="polite">' +
    esc(rows[0] ? ((rows[0].name || rows[0].short) + ' — ' + Math.round(rows[0].v*10)/10 + (u ? ' ' + u : '')) : '') +
    '</span></div>' +
    '<p class="sr-only">' + esc(opts.title + ': ' + srList) + '</p>';
}

/* -------------------------------------------------------------- TIMELINE */
function timelineStrip(state, now){
  const p = state.profile || {};
  const anchor = p.usualWake != null ? p.usualWake : 4;
  let h = '<div class="tl">';
  for(let i=0;i<7;i++){
    const d0 = bioDayStart(now + i*86400000, anchor), d1 = d0 + 86400000;
    let blocks = '';
    (state.sleep||[]).forEach(r => {
      const s = sleepRange(r); if(!s) return;
      if(s.end > d0 && s.start < d1){
        const a = Math.max(0,(s.start-d0)/86400000), b = Math.min(1,(s.end-d0)/86400000);
        blocks += '<div class="sleep" style="top:' + (a*100).toFixed(1) + '%;height:' + ((b-a)*100).toFixed(1) + '%"></div>';
      }
    });
    shiftsOverlapping(state.shifts, d0, d1).forEach(s => {
      const a = Math.max(0,(s.range.start-d0)/86400000), b = Math.min(1,(s.range.end-d0)/86400000);
      blocks += '<div class="shift" style="top:' + (a*100).toFixed(1) + '%;height:' + ((b-a)*100).toFixed(1) + '%"></div>';
    });
    const isNow = now >= d0 && now < d1;
    if(isNow) blocks += '<div class="now" style="top:' + (((now-d0)/86400000)*100).toFixed(1) + '%"></div>';
    h += '<div class="tlcol"><div class="lab">' + esc(dayLabel(d0)) + '</div>' +
         '<div class="track">' + blocks + '</div>' +
         '<div class="mk">' + new Date(d0).getDate() + '</div></div>';
  }
  h += '</div><div class="legend">' +
    '<div><i class="sw sleep"></i>' + esc(t('tl.sleep')) + '</div>' +
    '<div><i class="sw shift"></i>' + esc(t('tl.shift')) + '</div>' +
    '<div><i class="sw now"></i>' + esc(t('tl.now')) + '</div>' +
    '</div>';
  return h;
}

/* -------------------------------------------------------- FEEDBACK STATES */
/* The mark for a state with no content in it: a blank tally form. Four
   strokes, uninked, waiting to be counted. It replaces six stock line icons —
   an inbox, a chart, a clock, a body, a plan, a crossed-out circle — which said
   nothing the wordmark had not already said, and which nobody had drawn on
   this system's logic. */
const TALLY_BLANK =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor" opacity=".32">' +
  '<rect x="3.2" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="8.267" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="13.333" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="18.4" y="4.2" width="2.4" height="15.6"/>' +
  '</g></svg>';

/* The failure state. Four strokes drawn, and the fifth — the one that closes
   the set — in the alert colour, because that is exactly what happened: the
   screen could not be completed. */
const TALLY_BROKEN =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<g fill="currentColor"><g opacity=".3">' +
  '<rect x="3.2" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="8.267" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="13.333" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="18.4" y="4.2" width="2.4" height="15.6"/>' +
  '</g><rect x="2.30" y="10.8" width="19.4" height="2.4" transform="rotate(-16 12 12)"/></g></svg>';

/* A screen that failed is not a crash dialogue. It says what happened, says the
   log is intact, offers one way out, and puts the stack one tap away. */
function failureState(err){
  const detail = err && (err.stack || err.message) ? String(err.stack || err.message) : '';
  return '<div class="fail">' +
    '<div class="mk">' + TALLY_BROKEN + '</div>' +
    '<h3>' + esc(t('app.fail.title')) + '</h3>' +
    '<p>' + esc(t('app.fail.body')) + '</p>' +
    '<div class="act">' +
      '<button class="btn" onclick="render()">' + esc(t('app.fail.retry')) + '</button>' +
      '<button class="btn quiet" onclick="go(\'home\')">' + esc(t('nav.today')) + '</button>' +
    '</div>' +
    (detail ? '<details class="fail-more"><summary>' + esc(t('app.fail.detail')) + '</summary>' +
      '<pre>' + esc(detail) + '</pre></details>' : '') +
    '</div>';
}

/* The third argument used to pick an icon. It is accepted and ignored, so no
   call site had to change and no call site can pick a different mark again. */
function emptyState(titleKey, bodyKey, icon, actionHtml){
  return '<div class="empty"><div class="mk">' + TALLY_BLANK + '</div>' +
    '<h3>' + esc(t(titleKey)) + '</h3>' +
    '<p>' + esc(t(bodyKey)) + '</p>' +
    (actionHtml ? '<div class="act">' + actionHtml + '</div>' : '') + '</div>';
}

function banner(kind, title, body){
  const ic = kind === 'ok' ? 'OK' : kind === 'warn' ? '!' : kind === 'alert' ? '!!' : 'i';
  return '<div class="banner ' + kind + '"><span class="ic">' + ic + '</span><span>' +
    (title ? '<b>' + esc(title) + '</b> ' : '') + esc(body || '') + '</span></div>';
}

function skeletonBlock(rows){
  let h = '';
  for(let i=0;i<(rows||3);i++){
    h += '<div class="row nowrap mb-3" style="gap:12px">' +
      '<div class="skeleton" style="width:34%;height:16px"></div>' +
      '<div class="skeleton grow" style="height:16px"></div></div>';
  }
  return h;
}

/* ------------------------------------------------------------- PRINT CARD */
/* ============================================================================
   Sparkline — a compact trend line for real session data.
   Includes an accessible table-free summary so the information is not locked
   behind the ability to see the shape.
   ========================================================================== */
function sparkline(points, opts){
  opts = opts || {};
  if(!points || points.length < 2) return '';
  const w = 100, h = 34, pad = 2;
  const max = points.reduce((a,p) => Math.max(a, p.v), 0);
  const min = points.reduce((a,p) => Math.min(a, p.v), Infinity);
  const flat = Math.abs(max - min) < 1e-9;
  const span = flat ? 1 : (max - min);
  const x = i => pad + (i / (points.length - 1)) * (w - pad*2);
  const y = v => flat ? (h / 2) : (h - pad - ((v - min) / span) * (h - pad*2));

  let d = '';
  points.forEach((p, i) => { d += (i ? ' L' : 'M') + x(i).toFixed(2) + ' ' + y(p.v).toFixed(2); });
  const area = d + ' L' + x(points.length-1).toFixed(2) + ' ' + (h-pad) + ' L' + x(0).toFixed(2) + ' ' + (h-pad) + ' Z';

  const first = points[0], lastP = points[points.length-1];
  const delta = lastP.v - first.v;
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  return '<div class="spark' + (opts.compact ? ' compact' : '') + '">' +
    '<div class="spark-hd"><span class="eyebrow">' + esc(opts.label || '') + '</span>' +
    '<span class="spark-delta ' + dir + '">' + (delta > 0 ? '+' : '') + (Math.round(delta*10)/10) +
    ' ' + esc(opts.unit || '') + '</span></div>' +
    '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<path class="spark-area" d="' + area + '"/>' +
      '<path class="spark-line" d="' + d + '"/>' +
      points.map((p,i) => '<circle cx="' + x(i).toFixed(2) + '" cy="' + y(p.v).toFixed(2) +
        '" r="1.4"><title>' + esc(p.label + ': ' + (Math.round(p.v*10)/10)) + '</title></circle>').join('') +
    '</svg>' +
    '<div class="spark-foot"><span>' + esc(first.label) + '</span><span>' + esc(lastP.label) + '</span></div>' +
    '<p class="sr-only">' + esc(t('chart.summarySpark',
      { first: points[0].label + ' ' + points[0].v, last: lastP.label + ' ' + lastP.v,
        min: Math.round(min*10)/10, max: Math.round(max*10)/10 })) + '</p>' +
    '</div>';
}

/* Progress ring for a single real fraction. */
function progressRing(fraction, opts){
  opts = opts || {};
  const pct = Math.max(0, Math.min(100, Math.round((fraction || 0) * 100)));
  const r = opts.r || 26, sw = opts.stroke || 5;
  const c = 2 * Math.PI * r;
  const rk = opts.ringKey ? ' data-ring-key="' + esc(opts.ringKey) + '"' : '';
  return '<div class="ring" style="width:' + ((r+sw)*2) + 'px;height:' + ((r+sw)*2) + 'px">' +
    '<svg viewBox="0 0 ' + ((r+sw)*2) + ' ' + ((r+sw)*2) + '" aria-hidden="true">' +
      '<circle class="ring-track" cx="' + (r+sw) + '" cy="' + (r+sw) + '" r="' + r +
        '" stroke-width="' + sw + '" fill="none"/>' +
      '<circle class="ring-value" cx="' + (r+sw) + '" cy="' + (r+sw) + '" r="' + r +
        '" stroke-width="' + sw + '" fill="none" stroke-dasharray="' + c.toFixed(2) +
        '" stroke-dashoffset="' + c.toFixed(2) + '" data-ring="' + (pct/100) + '"' + rk + '/>' +
    '</svg>' +
    '<span class="ring-t num">' + pct + '<small>%</small></span>' +
    '<span class="sr-only">' + esc((opts.label || '') + ': ' + pct + '%') + '</span>' +
    '</div>';
}

/* ============================================================================
   Exercise Anatomical & Kinematic Vector Media
   100% offline, deterministic SVG driven by each exercise's real muscle
   contributions (ex.m) and movement pattern (ex.pat).
   ========================================================================== */
function exerciseFigureSideSvg(ex, side){
  if(!ex) return '';
  const weights = {};
  (ex.m || []).forEach(([m, w], idx) => { weights[m] = { w: w, primary: idx === 0 }; });
  let s = '<svg viewBox="' + FIG.view + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">';
  FIG.outline.forEach(d => { s += '<path class="fig-outline" d="' + d + '"/>'; });
  s += '<ellipse class="fig-outline" cx="' + FIG.head.cx + '" cy="' + FIG.head.cy +
       '" rx="' + FIG.head.rx + '" ry="' + FIG.head.ry + '"/>';
  (SIDE_MUSCLES[side] || []).forEach(m => {
    const info = weights[m];
    if(!info) return;
    const col = info.primary ? token('burnt','#D66A3A') : token('warn','#8A5E12');
    const op  = info.primary ? '0.88' : Math.min(0.65, 0.28 + info.w).toFixed(2);
    (FIG.regions[side][m] || []).forEach(d => {
      s += '<path d="' + d + '" fill="' + col + '" fill-opacity="' + op +
           '" stroke="#20211F" stroke-width="' + (info.primary ? '1.3' : '0.7') + '"/>';
    });
  });
  s += '</svg>';
  return s;
}

function exerciseThumbSvg(ex){
  if(!ex || !ex.m || !ex.m.length) return '';
  const prime = ex.m[0][0];
  const side = FIG.regions.front[prime] ? 'front' : 'back';
  return '<span class="ex-thumb" aria-hidden="true">' + exerciseFigureSideSvg(ex, side) + '</span>';
}

function patternKinematicSvg(ex){
  const pat = (ex && ex.pat) || 'pushH';
  const mk = '<defs><marker id="kv" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
             '<path d="M0,1 L7,4 L0,7 z" fill="#D66A3A"/></marker></defs>';
  /* Schematic joint-segment + force-vector diagrams per movement pattern */
  const DIAGRAMS = {
    pushH: '<line x1="22" y1="68" x2="118" y2="68" stroke="#77796F" stroke-width="2"/>' +
           '<circle cx="42" cy="58" r="7" fill="none" stroke="#20211F" stroke-width="1.8"/>' +
           '<path d="M52,58 L98,58" stroke="#20211F" stroke-width="3" stroke-linecap="round"/>' +
           '<path d="M62,58 L54,40 L68,26" fill="none" stroke="#20211F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
           '<line x1="88" y1="54" x2="88" y2="20" stroke="#D66A3A" stroke-width="2.2" marker-end="url(#kv)"/>',
    pushV: '<circle cx="70" cy="34" r="7" fill="none" stroke="#20211F" stroke-width="1.8"/>' +
           '<line x1="70" y1="42" x2="70" y2="82" stroke="#20211F" stroke-width="3" stroke-linecap="round"/>' +
           '<path d="M70,48 L50,36 L54,16 M70,48 L90,36 L86,16" fill="none" stroke="#20211F" stroke-width="2.2" stroke-linecap="round"/>' +
           '<line x1="108" y1="58" x2="108" y2="16" stroke="#D66A3A" stroke-width="2.2" marker-end="url(#kv)"/>',
    pullH: '<circle cx="46" cy="30" r="7" fill="none" stroke="#20211F" stroke-width="1.8"/>' +
           '<line x1="48" y1="38" x2="58" y2="76" stroke="#20211F" stroke-width="3" stroke-linecap="round"/>' +
           '<path d="M52,48 L88,48" fill="none" stroke="#20211F" stroke-width="2.2" stroke-linecap="round"/>' +
           '<line x1="112" y1="48" x2="74" y2="48" stroke="#D66A3A" stroke-width="2.2" marker-end="url(#kv)"/>',
    pullV: '<line x1="36" y1="14" x2="104" y2="14" stroke="#77796F" stroke-width="2.2"/>' +
           '<circle cx="70" cy="40" r="7" fill="none" stroke="#20211F" stroke-width="1.8"/>' +
           '<path d="M52,14 L58,34 L70,48 L82,34 L88,14" fill="none" stroke="#20211F" stroke-width="2.2" stroke-linejoin="round"/>' +
           '<line x1="70" y1="48" x2="70" y2="82" stroke="#20211F" stroke-width="3" stroke-linecap="round"/>' +
           '<line x1="108" y1="22" x2="108" y2="64" stroke="#D66A3A" stroke-width="2.2" marker-end="url(#kv)"/>',
    squat: '<circle cx="64" cy="22" r="6.5" fill="none" stroke="#20211F" stroke-width="1.8"/>' +
           '<path d="M64,30 L52,54 L78,60 L66,84" fill="none" stroke="#20211F" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>' +
           '<line x1="50" y1="84" x2="88" y2="84" stroke="#77796F" stroke-width="1.6"/>' +
           '<line x1="104" y1="74" x2="104" y2="24" stroke="#D66A3A" stroke-width="2.2" marker-end="url(#kv)"/>',
    hinge: '<circle cx="84" cy="28" r="6.5" fill="none" stroke="#20211F" stroke-width="1.8"/>' +
           '<path d="M78,34 L48,54 L58,84" fill="none" stroke="#20211F" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>' +
           '<path d="M40,54 A16,16 0 0,1 58,38" fill="none" stroke="#D66A3A" stroke-width="2" marker-end="url(#kv)"/>' +
           '<line x1="82" y1="40" x2="82" y2="76" stroke="#77796F" stroke-width="1.6" stroke-dasharray="3 2"/>',
    curl:  '<circle cx="58" cy="24" r="6.5" fill="none" stroke="#20211F" stroke-width="1.8"/>' +
           '<line x1="58" y1="32" x2="58" y2="78" stroke="#20211F" stroke-width="3" stroke-linecap="round"/>' +
           '<path d="M58,38 L62,58 L86,42" fill="none" stroke="#20211F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
           '<path d="M90,66 A24,24 0 0,0 84,32" fill="none" stroke="#D66A3A" stroke-width="2.2" marker-end="url(#kv)"/>',
    extend:'<circle cx="58" cy="24" r="6.5" fill="none" stroke="#20211F" stroke-width="1.8"/>' +
           '<line x1="58" y1="32" x2="58" y2="78" stroke="#20211F" stroke-width="3" stroke-linecap="round"/>' +
           '<path d="M58,38 L74,50 L92,68" fill="none" stroke="#20211F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
           '<path d="M80,34 A26,26 0 0,1 96,64" fill="none" stroke="#D66A3A" stroke-width="2.2" marker-end="url(#kv)"/>',
    calf:  '<line x1="64" y1="18" x2="64" y2="62" stroke="#20211F" stroke-width="3" stroke-linecap="round"/>' +
           '<path d="M64,62 L52,78 L80,82" fill="none" stroke="#20211F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
           '<line x1="40" y1="84" x2="96" y2="84" stroke="#77796F" stroke-width="1.6"/>' +
           '<line x1="98" y1="76" x2="98" y2="34" stroke="#D66A3A" stroke-width="2.2" marker-end="url(#kv)"/>',
    core:  '<line x1="20" y1="74" x2="120" y2="74" stroke="#77796F" stroke-width="1.6"/>' +
           '<circle cx="34" cy="48" r="6" fill="none" stroke="#20211F" stroke-width="1.8"/>' +
           '<path d="M42,50 L106,64 M46,52 L42,74" fill="none" stroke="#20211F" stroke-width="2.8" stroke-linecap="round"/>' +
           '<line x1="74" y1="36" x2="74" y2="54" stroke="#D66A3A" stroke-width="2" marker-end="url(#kv)"/>',
    cardio:'<line x1="18" y1="74" x2="122" y2="74" stroke="#77796F" stroke-width="1.6" stroke-dasharray="4 3"/>' +
           '<circle cx="52" cy="26" r="6" fill="none" stroke="#20211F" stroke-width="1.8"/>' +
           '<path d="M52,33 L46,54 L32,72 M46,54 L66,60 L62,74 M50,40 L68,46" fill="none" stroke="#20211F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
           '<line x1="74" y1="46" x2="116" y2="46" stroke="#D66A3A" stroke-width="2.2" marker-end="url(#kv)"/>'
  };
  const body = DIAGRAMS[pat] || DIAGRAMS.pushH;
  return '<svg viewBox="0 0 140 94" role="img" aria-label="' + esc(t('pat.' + pat)) + '">' + mk + body + '</svg>';
}

function exerciseVisualSvg(ex){
  if(!ex) return '';
  return '<div class="ex-vis">' +
    '<div class="ex-vis-figs">' +
      '<div>' + exerciseFigureSideSvg(ex, 'front') + '<span class="dash-fig-cap">' + esc(t('body.front')) + '</span></div>' +
      '<div>' + exerciseFigureSideSvg(ex, 'back')  + '<span class="dash-fig-cap">' + esc(t('body.back'))  + '</span></div>' +
    '</div>' +
    '<div class="ex-vis-kin">' +
      '<p class="eyebrow mb-1">' + esc(t('pat.' + ex.pat)) + '</p>' +
      patternKinematicSvg(ex) +
      '<div class="legend mt-1" style="gap:8px">' +
        '<div><i class="sw direct"></i>' + esc(t('lab.primary')) + '</div>' +
        '<div><i class="sw indirect"></i>' + esc(t('vol.indirect')) + '</div>' +
      '</div>' +
      '<p class="hint mt-1" style="font-size:11px">' + esc(t('exd.diagramNote')) + '</p>' +
    '</div>' +
  '</div>';
}

