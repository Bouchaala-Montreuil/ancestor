#!/usr/bin/env node
/* ============================================================ build-figure
   Writes the 2D anatomy geometry in `js/ui/components.js` from
   `tools/figure-projected.json`.

   Where the data comes from: the app already ships a real anatomical model
   (`assets/anatomy-male-mobile.glb`, Z-Anatomy / BodyParts3D, CC BY-SA 4.0)
   for the 3D screen. The flat figure used to be hand-drawn — a stack of
   rectangles and trapezoids that read as a mannequin with a breastplate — and
   no amount of re-tuning got past that. So the flat figure is now that same
   model, projected to two silhouettes offline:

     tools/figure-project.html   opens the GLB in Chromium, rasterises every
                                 triangle with a depth buffer per view, keeps
                                 the front-most surface, and traces the result
                                 into closed polygons
     tools/figure-projected.json the output of that page — the committed data
     this script                  emits it into components.js between markers

   Regenerating needs a browser with WebGL (the model is meshopt-compressed),
   which is why the projected JSON is committed rather than built on every run:

     npm run figure        # re-run the projection, rewrite the JSON
     node tools/build-figure.js           # JSON → components.js
     node tools/build-figure.js --check   # fail if the two disagree

   The twelve groups are the app's own `MUSCLES`, in its own order, so the
   numbers on the figure and the rows under it are one key.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'js/ui/components.js');
const DATA = path.join(__dirname, 'figure-projected.json');
const BEGIN = '/* <figure-geometry> */';
const END = '/* </figure-geometry> */';

/* The app's muscle list, in its order. Duplicated here on purpose: this script
   must fail loudly if the data and the app disagree, and a test asserts the
   two lists match. */
const MUSCLES = ['chest','back','shoulders','biceps','triceps','forearms',
                 'quads','hamstrings','glutes','calves','abs','lowerback'];

/* Which groups each view draws, in reading order. Chest is not on the back and
   the lower back is not on the front: this is what the projection found, not a
   preference. */
const VIEWS = {
  front: ['shoulders','chest','biceps','forearms','abs','quads','calves'],
  back:  ['shoulders','back','lowerback','triceps','forearms','glutes','hamstrings','calves']
};

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

/* Where each group's number sits: the centre of its largest ring. Computed
   from the geometry, so a shape that moves takes its number with it. */
function bboxOf(d){
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for(let i = 0; i + 1 < nums.length; i += 2){
    const x = nums[i], y = nums[i + 1];
    if(x < x0) x0 = x;
    if(x > x1) x1 = x;
    if(y < y0) y0 = y;
    if(y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, area: (x1 - x0) * (y1 - y0) };
}
/* The centroid of the largest ring on ONE side of the midline. The centre of a
   group's bounding box lands on the sternum for anything with two lobes — the
   pects, the abs, the quads — and a number sitting on the midline points at
   nothing. A body is symmetric, so either lobe answers the same question. */
function centroidOf(d){
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  let a = 0, cx = 0, cy = 0;
  for(let i = 0; i + 1 < nums.length; i += 2){
    const x1 = nums[i], y1 = nums[i + 1];
    const j = (i + 2) % nums.length;
    const x2 = nums[j], y2 = nums[j + 1];
    const cross = x1 * y2 - x2 * y1;
    a += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  a /= 2;
  if(Math.abs(a) < 1e-9) return null;
  return { x: cx / (6 * a), y: cy / (6 * a), area: Math.abs(a) };
}
function centreOf(paths){
  const lobes = paths.map(centroidOf).filter(Boolean);
  if(!lobes.length) return null;
  /* Fragments — a sliver of a boundary, the strap of a hand — are not where a
     muscle is. Keep the lobes that are a real share of the group, then take the
     highest: the lower back's number belongs on the lumbar spine, not on the
     bit of it that shows between the glutes. */
  const maxArea = Math.max.apply(null, lobes.map(p => p.area));
  const real = lobes.filter(p => p.area >= maxArea * 0.3);
  const leftFirst = p => (p.x <= 100 ? 0 : 1);
  real.sort((a, b) => (leftFirst(a) - leftFirst(b)) || (a.y - b.y));
  const pick = real[0] || lobes[0];
  return [Math.round(pick.x), Math.round(pick.y)];
}

function block(){
  const q = s => "'" + s + "'";
  const L = [];
  L.push(BEGIN);
  L.push('const FIG = {');
  L.push("  view: '0 0 200 470',");
  L.push('  outline: [');
  const sil = data.silhouette.front.concat(data.silhouette.back);
  sil.forEach((d, i) => L.push('    ' + q(d) + (i < sil.length - 1 ? ',' : '')));
  L.push('  ],');
  L.push('  regions: {');
  ['front', 'back'].forEach(side => {
    L.push('    ' + side + ': {');
    const keys = VIEWS[side];
    keys.forEach((m, gi) => {
      const paths = (data.groups[side] && data.groups[side][m]) || [];
      L.push('      ' + m + ': [');
      paths.forEach((d, i) => L.push('        ' + q(d) + (i < paths.length - 1 ? ',' : '')));
      L.push('      ]' + (gi < keys.length - 1 ? ',' : ''));
    });
    L.push('    }' + (side === 'front' ? ',' : ''));
  });
  L.push('  },');
  L.push('  /* Where each group\'s number sits, in the figure\'s own coordinates: the');
  L.push('     centre of its largest ring, so a shape that moves takes its number too. */');
  L.push('  label: {');
  ['front', 'back'].forEach(side => {
    const keys = VIEWS[side];
    L.push('    ' + side + ': {');
    keys.forEach((m, i) => {
      const c = centreOf((data.groups[side] && data.groups[side][m]) || []) || [0, 0];
      L.push('      ' + m + ': [' + c[0] + ',' + c[1] + ']' + (i < keys.length - 1 ? ',' : ''));
    });
    L.push('    }' + (side === 'front' ? ',' : ''));
  });
  L.push('  }');
  L.push('};');
  L.push(END);
  return L.join('\n');
}

/* The two silhouette paths are one body seen from two sides; if the projection
   ever produces something that is not a body, say so here rather than shipping
   a strange shape. */
function sanity(){
  const problems = [];
  if(!data.silhouette || !data.silhouette.front || !data.silhouette.front.length)
    problems.push('no front silhouette');
  if(!data.silhouette || !data.silhouette.back || !data.silhouette.back.length)
    problems.push('no back silhouette');
  MUSCLES.forEach(m => {
    const front = (data.groups.front && data.groups.front[m]) || [];
    const back = (data.groups.back && data.groups.back[m]) || [];
    if(!front.length && !back.length) problems.push(m + ' appears on neither view');
  });
  ['front', 'back'].forEach(side => Object.keys(data.groups[side] || {}).forEach(m => {
    if(MUSCLES.indexOf(m) < 0) problems.push(side + ' has an unknown group: ' + m);
  }));
  /* A muscle that wraps round the body is visible from the other side too — the
     hamstrings show along the edge of the thigh from the front. The projection
     keeps everything it can see; the figure draws only the groups its own view
     owns, because SIDE_MUSCLES is what can be tapped there. */
  return problems;
}

const problems = sanity();
if(problems.length){
  console.error('figure data does not make sense:\n  ' + problems.join('\n  '));
  process.exit(1);
}

const src = fs.readFileSync(TARGET, 'utf8');
const b = src.indexOf(BEGIN), e = src.indexOf(END);
if(b < 0 || e < 0){
  console.error('markers ' + BEGIN + ' / ' + END + ' not found in ' + TARGET);
  process.exit(1);
}
const want = block();
const have = src.slice(b, e + END.length);

if(process.argv.includes('--check')){
  if(have !== want){
    console.error('figure geometry in components.js does not match tools/figure-projected.json');
    process.exit(1);
  }
  console.log('figure geometry is current: ' + data.silhouette.front.length + ' outline paths, ' +
    VIEWS.front.length + ' front groups, ' + VIEWS.back.length + ' back groups');
  process.exit(0);
}
fs.writeFileSync(TARGET, src.slice(0, b) + want + src.slice(e + END.length));
console.log('wrote figure geometry: ' + VIEWS.front.length + ' front groups, ' +
  VIEWS.back.length + ' back groups, ' + (want.length / 1024).toFixed(1) + ' KB');
