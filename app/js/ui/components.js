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

  /* pointerOnly: the figure is still tappable, but it is not a keyboard
     destination. Used on the dashboard, where the map is a picture of your week
     and the accessible action is the link beside it — thirty focus stops for
     thirty body regions sat between the action card and the rest of the page.
     Tapping keeps working because the click handler lives on data-m. */
  const ptr = !!o.pointerOnly;
  let out = '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" ' +
            'role="img" aria-label="' + esc(t('body.title') + '. ' + t('a11y.figureAlt')) +
            (ptr ? '. ' + t('home.mapCta') : '') + '" ' +
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
             (ptr ? '' : 'tabindex="0" role="button" aria-label="' +
                esc(t('mg.' + m)) + ' — ' + esc(t('mst.' + (rec[m] ? rec[m].state : 'fresh'))) + '" ') +
             '><title>' + esc(t('mg.' + m)) + '</title></path>';
    });
  });
  out += '</svg>';
  return out;
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

/* A chart axis must land on numbers a person can read. The old code rounded
   only the top of the domain and then took min = rawMin * 0.85, which is how a
   chart of 42..52.5 kg ended up labelled 36, 52, 68, 84, 100. */
function niceStep(raw){
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * mag;
}
function niceScale(lo, hi, ticks){
  ticks = ticks || 4;
  if(!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1; }
  if(hi - lo < 1e-9){ hi = lo + 1; }
  const step = niceStep((hi - lo) / ticks);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  /* integers only when the data is integers, so 2.5 does not become 2.5000001 */
  const dp = step < 1 ? 1 : 0;
  const labels = [];
  for(let v = min; v <= max + step / 2; v += step) labels.push(Number(v.toFixed(dp)));
  return { min, max, step, labels, dp };
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
  /* Six per cent of headroom, then a scale that lands on round numbers at both
     ends. An axis is a ruler, not a remainder. */
  const pad = Math.max((rawMax - rawMin) * 0.08, Math.abs(rawMax) * 0.01 || 1);
  const sc = niceScale(rawMin - pad, rawMax + pad, 4);
  const max = sc.max, min = sc.min;
  const x = i => PL + (i/(pts.length-1))*(W-PL-PR);
  const y = v => PT + (1 - (v-min)/Math.max(0.0001,(max-min)))*(H-PT-PB);

  let g = '';
  sc.labels.forEach(v => {
    const yy = y(v);
    g += '<line class="dv-grid" x1="' + PL + '" y1="' + yy.toFixed(1) + '" x2="' + (W-PR) +
         '" y2="' + yy.toFixed(1) + '"/>' +
         '<text class="dv-ytick" x="' + (PL-8) + '" y="' + (yy+3.5).toFixed(1) + '" ' +
         'text-anchor="end">' + v + '</text>';
  });
  // x labels: first, middle, last — anchor edge labels inward so they never clip
  [0, Math.floor((pts.length-1)/2), pts.length-1].filter((v,i,a)=>a.indexOf(v)===i).forEach(i => {
    const anchor = i === 0 ? 'start' : (i === pts.length - 1 ? 'end' : 'middle');
    const dx = i === 0 ? -2 : (i === pts.length - 1 ? 2 : 0);
    g += '<text class="dv-xtick" x="' + (x(i)+dx).toFixed(1) + '" y="' + (H-12) + '" ' +
         'text-anchor="' + anchor + '">' + esc(pts[i].label) + '</text>';
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
      (p.best
        ? '<circle class="dv-dot best" style="animation-delay:' +
          Math.round((i/(pts.length-1))*520) + 'ms" cx="' + x(i).toFixed(1) +
          '" cy="' + y(p.v).toFixed(1) + '" r="5.2"/>'
        : '<circle class="dv-dot" style="animation-delay:' +
          Math.round((i/(pts.length-1))*520) + 'ms" cx="' + x(i).toFixed(1) +
          '" cy="' + y(p.v).toFixed(1) + '" r="2.8"/>') +
      '<title>' + esc(fullTip) + '</title></g>';
  }).join('');

  const first = pts[0], last = pts[pts.length-1];
  const latestTip = last.label + ' — ' + (last.text ? last.text : ((Math.round(last.v*10)/10) + (unit ? ' ' + unit : '')));

  return '<div class="chart-hd"><span class="t">' + esc(opts.title) + '</span>' +
    '<span class="p">' + esc(opts.period) + ' · ' + esc(t('chart.unit')) + ': ' + esc(unit) + '</span></div>' +
    '<svg class="chart chart-anim" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title) + '">' +
    g +
    '<path class="chart-path" pathLength="1000" d="' + d + '"/>' +
    '<g role="list">' + dots + '</g>' +
    '<line class="dv-axis" x1="' + PL + '" y1="' + (H-PB) + '" x2="' + (W-PR) + '" y2="' + (H-PB) + '"/>' +
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
  /* PT is generous because the value printed above a bar is part of the mark:
     a tall bar must not push its own number into the top gridline. */
  const W = 640, H = 220, PL = 46, PR = 14, PT = 24, PB = 40;
  const rows = opts.rows || [];
  if(!rows.length) return emptyState('chart.nodata', 'chart.nodata.body');
  const tipId = 'ctip_' + (++CHART_SEQ);
  const sc = niceScale(0, Math.max.apply(null, rows.map(r => r.v)) * 1.04, 4);
  const max = sc.max || 1;
  const bw = (W-PL-PR)/rows.length;
  const u = opts.unit || '';
  let g = '';
  sc.labels.forEach(v => {
    const yy = PT + (1 - v/max)*(H-PT-PB);
    g += '<line class="dv-grid" x1="' + PL + '" y1="' + yy.toFixed(1) + '" x2="' + (W-PR) +
         '" y2="' + yy.toFixed(1) + '"/>' +
         '<text class="dv-ytick" x="' + (PL-8) + '" y="' + (yy+3.5).toFixed(1) + '" ' +
         'text-anchor="end">' + v + '</text>';
  });
  rows.forEach((r,i) => {
    const h = (r.v/max)*(H-PT-PB);
    const bx = PL + i*bw + bw*0.16, bwid = bw*0.68;
    const tipTxt = (r.name || r.short) + ' — ' + Math.round(r.v*10)/10 + (u ? ' ' + u : '');
    const jsTip = tipTxt.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    /* A zero is a zero: a 2 px stub on the axis, never a 1 px sliver that
       pretends to be a very small value. */
    const zero = !(r.v > 0);
    g += '<g class="chart-bar-g" tabindex="0" role="listitem" aria-label="' + esc(tipTxt) + '" ' +
         'onmouseenter="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')" ' +
         'onfocus="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')" ' +
         'onclick="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')">' +
         (zero
           ? '<rect class="chart-bar zero" x="' + bx.toFixed(1) + '" y="' + (H-PB-2) +
             '" width="' + bwid.toFixed(1) + '" height="2"/>'
           : '<rect class="chart-bar" style="animation-delay:' + (i*45) + 'ms" x="' + bx.toFixed(1) +
             '" y="' + (H-PB-h).toFixed(1) + '" width="' + bwid.toFixed(1) +
             '" height="' + h.toFixed(1) + '"/>') +
         '<title>' + esc(tipTxt) + '</title>' +
         (zero ? '' :
           '<text class="dv-value" x="' + (bx+bwid/2).toFixed(1) + '" y="' + Math.max(PT + 8, H-PB-h-7).toFixed(1) +
           '" text-anchor="middle">' + (Math.round(r.v*10)/10) + '</text>') +
         '<text class="dv-xtick" x="' + (bx+bwid/2).toFixed(1) + '" y="' + (H-14) +
         '" text-anchor="middle">' + esc(r.short) + '</text></g>';
  });
  const srList = rows.map(r => (r.name || r.short) + ' ' + Math.round(r.v*10)/10).join(', ');
  return '<div class="chart-hd"><span class="t">' + esc(opts.title) + '</span><span class="p">' +
    esc(opts.period) + ' · ' + esc(t('chart.unit')) + ': ' + esc(u) + '</span></div>' +
    '<svg class="chart chart-anim" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title) + '">' +
    '<g role="list">' + g + '</g>' +
    '<line class="dv-axis" x1="' + PL + '" y1="' + (H-PB) + '" x2="' + (W-PR) + '" y2="' + (H-PB) + '"/></svg>' +
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
    h += '<div class="tlcol"><div class="lab">' + esc(dayLabel(d0, 'narrow')) + '</div>' +
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

/* The one loading primitive. `skel('title row row figure')` emits bars shaped
   like the thing that is coming, so the layout does not jump when it lands.
   There were three loaders before this: a shimmering block, a static grey row,
   and a rotating circle — plus two helper functions nobody called. */
const SKEL_SHAPES = {
  title:  {h: 22, w: 64},
  lede:   {h: 12, w: 84},
  row:    {h: 14, w: 100},
  short:  {h: 14, w: 52},
  figure: {h: 64, w: 100},
  label:  {h: 9,  w: 34}
};
function skel(parts, opts){
  opts = opts || {};
  const list = String(parts || 'row row row').trim().split(/\s+/);
  let h = '<div class="skel' + (opts.cls ? ' ' + opts.cls : '') + '" aria-busy="true" aria-live="polite">' +
          '<span class="sr-only">' + esc(t(opts.labelKey || 'lab.loading')) + '</span>';
  list.forEach((key, i) => {
    const sh = SKEL_SHAPES[key] || SKEL_SHAPES.row;
    h += '<div class="skel-bar skel-' + (SKEL_SHAPES[key] ? key : 'row') + '"' +
         ' style="height:' + sh.h + 'px;width:' + sh.w + '%;animation-delay:' + (i * 90) + 'ms"></div>';
  });
  return h + '</div>';
}

/* A wait inside a fixed frame — the 3D lab — is marked with the tally's four
   strokes and the fifth not yet drawn. Not a spinner: a circle says "wait",
   a tally says "counting", and counting is what this product does. */
function waitMark(){
  return '<span class="wait" aria-hidden="true"><svg viewBox="0 0 24 24">' +
    '<g fill="currentColor">' +
    '<rect class="ws ws1" x="3.2" y="4.2" width="2.4" height="15.6"/>' +
    '<rect class="ws ws2" x="8.267" y="4.2" width="2.4" height="15.6"/>' +
    '<rect class="ws ws3" x="13.333" y="4.2" width="2.4" height="15.6"/>' +
    '<rect class="ws ws4" x="18.4" y="4.2" width="2.4" height="15.6"/>' +
    '</g></svg></span>';
}

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
function emptyState(titleKey, bodyKey, icon, actionHtml, level){
  /* level: the heading level this state sits at. Defaults to h3, because most
     empty states live inside a section that already has an h2. Where one stands
     directly under the screen's h1 it passes 2 — the level is a place in the
     document, not a size, and the type is the same either way. */
  const lv = level === 2 ? 2 : 3;
  return '<div class="empty"><div class="mk">' + TALLY_BLANK + '</div>' +
    '<h' + lv + '>' + esc(t(titleKey)) + '</h' + lv + '>' +
    '<p>' + esc(t(bodyKey)) + '</p>' +
    (actionHtml ? '<div class="act">' + actionHtml + '</div>' : '') + '</div>';
}

function banner(kind, title, body){
  const ic = kind === 'ok' ? 'OK' : kind === 'warn' ? '!' : kind === 'alert' ? '!!' : 'i';
  return '<div class="banner ' + kind + '"><span class="ic">' + ic + '</span><span>' +
    (title ? '<b>' + esc(title) + '</b> ' : '') + esc(body || '') + '</span></div>';
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
      points.map((p,i) => {
        const now = i === points.length - 1;
        return '<circle class="spark-dot' + (now ? ' now' : '') + '" cx="' + x(i).toFixed(2) +
          '" cy="' + y(p.v).toFixed(2) + '" r="' + (now ? 2.2 : 1.2) +
          '"><title>' + esc(p.label + ': ' + (Math.round(p.v*10)/10)) + '</title></circle>';
      }).join('') +
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
      /* The markup carries the finished arc, not an empty one. The motion
         engine animates from zero on first paint; nothing that fails to run
         JS, and no print pass, may show a ring that reads 72% and draws 0%. */
      '<circle class="ring-value" cx="' + (r+sw) + '" cy="' + (r+sw) + '" r="' + r +
        '" stroke-width="' + sw + '" fill="none" stroke-dasharray="' + c.toFixed(2) +
        '" stroke-dashoffset="' + (c * (1 - pct/100)).toFixed(2) +
        '" data-ring="' + (pct/100) + '"' + rk + '/>' +
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
           '" stroke="' + token('ink','#20211F') + '" stroke-width="' + (info.primary ? '1.3' : '0.7') + '"/>';
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

/* Movement patterns, drawn once, in one grammar.
   ---------------------------------------------------------------------
   These eleven diagrams were four different drawing styles: stroke widths from
   1.6 to 3, round caps on some and not others, heads as circles of two sizes,
   and 47 hardcoded hex colours that no theme could reach. They now share one
   rule, and it is the mark's rule:

     body    ink, 3.2, square caps, straight segments only
     joint   a 3.2 solid square
     head    an 11 solid square — mass, never a circle
     load    a bar with two plates
     force   one burnt arrow: the direction the load is driven
     range   a dashed burnt arc and a dot at the joint doing the work
     ground  a hairline, only under a supported body

   Colour comes from classes (.k-i, .k-b, .k-r) defined in the stylesheet, so
   the drawings finally follow the palette like everything else. */
const INK = 'k-i', BURNT = 'k-b', RULE = 'k-r';   /* classes, not hexes */
const seg = (x1, y1, x2, y2) =>
  `<path class="${INK}" d="M${x1} ${y1}L${x2} ${y2}" stroke-width="3.2"/>`;
/* Small, solid, square. Four of these and a head should never be confused:
   the head is 11, a joint is 3.2. */
const joint = (x, y, s) => {
  s = s || 3.2;
  return `<rect class="${INK}" x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s}" height="${s}"/>`;
};
const head = (x, y) =>
  `<rect class="${INK}" x="${x - 5.5}" y="${y - 5.5}" width="11" height="11"/>`;
const ground = (y, x1, x2) =>
  `<path class="${RULE}" d="M${x1 === undefined ? 14 : x1} ${y}L${x2 === undefined ? 126 : x2} ${y}" stroke-width="1.6"/>`;
const force = (x1, y1, x2, y2) => {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 7;
  const p1 = [x2 - L * Math.cos(a - 0.42), y2 - L * Math.sin(a - 0.42)];
  const p2 = [x2 - L * Math.cos(a + 0.42), y2 - L * Math.sin(a + 0.42)];
  return `<path class="${BURNT}" d="M${x1} ${y1}L${x2} ${y2}" stroke-width="2.4"/>` +
         `<path class="${BURNT}" d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${x2} ${y2}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" stroke-width="2.4"/>`;
};
const bar = (x, y, w) =>
  `<path class="${INK}" d="M${x - w / 2} ${y}L${x + w / 2} ${y}" stroke-width="2.4"/>` +
  `<rect class="${INK}" x="${x - w / 2 - 4}" y="${y - 6.5}" width="5" height="13"/>` +
  `<rect class="${INK}" x="${x + w / 2 - 1}" y="${y - 6.5}" width="5" height="13"/>`;
const arc = (cx, cy, r, a0, a1) => {
  const p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const s = p(a0), e = p(a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `<path class="${BURNT}" d="M${s[0].toFixed(1)} ${s[1].toFixed(1)}A${r} ${r} 0 ${large} ${sweep} ${e[0].toFixed(1)} ${e[1].toFixed(1)}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
};
const hot = (x, y) => `<circle class="${BURNT}" cx="${x}" cy="${y}" r="2.6"/>`;

const KIN = {};

/* Horizontal push, lying: a bench, a body on it, the bar above the hands. */
KIN.pushH =
  ground(88, 16, 124) +
  seg(24, 70, 104, 70) +                      /* the bench */
  seg(34, 70, 34, 86) + seg(94, 70, 94, 86) + /* its legs */
  seg(56, 64, 92, 64) +                       /* the torso, lying */
  head(46, 62) +
  joint(56, 64) + joint(92, 64) +
  seg(92, 64, 104, 68) + joint(104, 68) +     /* legs to the floor */
  seg(104, 68, 108, 86) +
  seg(56, 64, 56, 44) + joint(56, 44) +       /* upper arm */
  seg(56, 44, 76, 40) + joint(76, 40) +       /* forearm */
  bar(76, 34, 34) +                           /* the bar */
  force(120, 64, 120, 26) +
  hot(56, 44);

/* Vertical push: standing, pressing overhead. */
KIN.pushV =
  ground(88) +
  head(70, 14) + seg(70, 24, 70, 60) + joint(70, 60) +
  seg(70, 60, 58, 74) + joint(58, 74) + seg(58, 74, 56, 88) +
  seg(70, 60, 82, 74) + joint(82, 74) + seg(82, 74, 84, 88) +
  seg(70, 34, 46, 30) + joint(46, 30) +       /* upper arm, out and up */
  seg(46, 30, 44, 14) + joint(44, 14) +       /* forearm, vertical */
  seg(70, 34, 94, 30) + joint(94, 30) +
  seg(94, 30, 96, 14) + joint(96, 14) +
  bar(70, 8, 48) +
  force(122, 66, 122, 26) +
  hot(44, 14);

/* Horizontal pull: folded over the bar, pulling it to the ribs. */
KIN.pullH =
  ground(88) +
  head(84, 30) +
  seg(84, 42, 52, 56) +                       /* the back, folded */
  joint(84, 42) + joint(52, 56) +
  seg(52, 56, 46, 72) + joint(46, 72) + seg(46, 72, 44, 88) +
  seg(52, 56, 62, 72) + joint(62, 72) + seg(62, 72, 66, 88) +
  seg(84, 42, 78, 58) + joint(78, 58) +       /* arm from the shoulder */
  seg(78, 58, 66, 52) + joint(66, 52) +       /* forearm pulled to the ribs */
  bar(64, 48, 26) +
  force(126, 48, 92, 48) +
  hot(78, 58);

/* Vertical pull: hanging, pulling the bar down to the chest. */
KIN.pullV =
  seg(26, 8, 114, 8) +                        /* the frame */
  bar(70, 14, 44) +
  head(70, 38) +
  seg(70, 48, 70, 62) + joint(70, 62) +       /* torso */
  seg(70, 62, 58, 78) + joint(58, 78) + seg(58, 78, 56, 88) +
  seg(70, 62, 82, 78) + joint(82, 78) + seg(82, 78, 84, 88) +
  seg(70, 46, 50, 26) + joint(50, 26) +       /* arm up and out */
  seg(50, 26, 54, 18) + joint(54, 18) +
  seg(70, 46, 90, 26) + joint(90, 26) +
  seg(90, 26, 86, 18) + joint(86, 18) +
  force(120, 22, 120, 58) +
  hot(50, 26);

/* Squat: the bar across the shoulders, the hips travelling down and back. */
KIN.squat =
  ground(88) +
  head(56, 20) + seg(56, 30, 54, 54) + joint(54, 54) +
  bar(54, 34, 46) +                           /* across the shoulders */
  seg(54, 54, 70, 68) + joint(70, 68) +       /* thigh, down and forward */
  seg(70, 68, 62, 86) +                       /* shin, back to the floor */
  seg(54, 54, 62, 68) + joint(62, 68) +
  seg(62, 68, 54, 86) +
  arc(70, 68, 24, -2.4, -1.0) +
  hot(70, 68) +
  force(116, 66, 116, 30);

/* Hinge: a straight back folding at the hip, the bar hanging from the hands. */
KIN.hinge =
  ground(88) +
  head(92, 34) +
  seg(92, 44, 58, 54) +                       /* a straight back */
  joint(92, 44) + joint(58, 54) +
  seg(58, 54, 52, 70) + joint(52, 70) + seg(52, 70, 48, 88) +
  seg(58, 54, 68, 70) + joint(68, 70) + seg(68, 70, 74, 88) +
  seg(92, 44, 88, 60) + joint(88, 60) +       /* both arms hanging */
  seg(88, 60, 88, 74) +
  bar(88, 78, 30) +
  arc(58, 54, 20, 1.9, 3.3) +
  hot(58, 54);

/* Elbow flexion: the forearm travels up around the elbow. */
KIN.curl =
  ground(88) +
  head(52, 16) + seg(52, 26, 52, 58) + joint(52, 58) +
  seg(52, 58, 44, 72) + joint(44, 72) + seg(44, 72, 42, 88) +
  seg(52, 58, 62, 72) + joint(62, 72) + seg(62, 72, 66, 88) +
  seg(52, 32, 52, 54) + joint(52, 54) +       /* upper arm, at the side */
  seg(52, 54, 74, 64) + joint(74, 64) +       /* forearm, down */
  bar(78, 68, 26) +
  arc(52, 54, 26, 0.35, -0.95) +
  hot(52, 54);

/* Elbow extension: the forearm travelling out. */
KIN.extend =
  ground(84) +
  head(52, 16) + seg(52, 24, 52, 56) + joint(52, 56) +
  seg(52, 56, 44, 80) + seg(52, 56, 60, 80) +
  seg(52, 34, 52, 54) + joint(52, 54) +
  seg(52, 54, 78, 62) + joint(78, 62) +
  seg(78, 62, 96, 50) + joint(96, 50) +       /* forearm extended */
  bar(96, 46, 20) +
  arc(78, 62, 22, -0.9, 0.2) +
  hot(78, 62);

/* Plantar flexion: the heel raised, the whole body on the ball of the foot. */
KIN.calf =
  ground(88) +
  head(64, 14) + seg(64, 24, 64, 56) + joint(64, 56) +
  seg(64, 56, 62, 70) + joint(62, 70) +
  seg(62, 70, 60, 80) + joint(60, 80) +       /* shin to the ankle */
  seg(60, 80, 80, 84) +                       /* the foot, heel high */
  seg(64, 56, 74, 70) + joint(74, 70) +
  seg(74, 70, 72, 80) +
  arc(60, 80, 18, -1.5, -0.2) +
  hot(60, 80);

/* Trunk: the plank, held. */
KIN.core =
  ground(84) +
  head(28, 52) + seg(34, 54, 92, 70) + joint(92, 70) +
  seg(32, 56, 30, 78) + joint(30, 78) +       /* the support arm */
  seg(30, 78, 42, 86) +
  seg(92, 70, 76, 84) +                       /* the leg */
  seg(92, 70, 104, 80) +
  force(62, 44, 62, 62) +
  hot(62, 58);

/* Locomotion: stride, with the direction of travel. */
KIN.cardio =
  ground(84, 20, 122) +
  head(58, 26) + seg(58, 34, 54, 56) + joint(54, 56) +
  seg(54, 56, 34, 78) + joint(34, 78) + seg(34, 78, 30, 84) +
  seg(54, 56, 72, 72) + joint(72, 72) + seg(72, 72, 78, 84) +
  seg(58, 36, 44, 46) + seg(58, 36, 74, 40) +
  force(88, 46, 118, 46) +
  hot(54, 56);

function patternKinematicSvg(ex){
  const pat = (ex && ex.pat) || 'pushH';
  const body = KIN[pat] || KIN.pushH;
  return '<svg viewBox="0 0 140 94" role="img" aria-label="' + esc(t('pat.' + pat)) + '">' +
         body + '</svg>';
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

