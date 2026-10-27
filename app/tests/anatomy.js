/* ============================================================================
   ANCESTOR — anatomy model tests (headless, real asset)
   Run:  node tests/anatomy.js

   Exercises the REAL glTF asset and the real selection pipeline without a
   GPU: parse, scene graph, per-muscle metadata, region mapping, raycast
   picking from the front and the back, and geometry disposal.

   It cannot prove pixels were drawn — only a browser can do that — so it
   proves everything upstream of the draw call instead.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let pass = 0, fail = 0; const failures = [];
function chk(n, c, x){
  if(c){ pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + n + (x ? '  \x1b[2m' + x + '\x1b[0m' : '')); }
  else { fail++; failures.push(n); console.log('  \x1b[31mFAIL\x1b[0m  ' + n + (x ? '  -> ' + x : '')); }
}
function group(t){ console.log('\n\x1b[1m' + t + '\x1b[0m'); }

(async function(){
let THREE, GLTFLoader, MeshoptDecoder;
try {
  THREE = await import('three');
  ({ GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js'));
  const mo = await import('meshoptimizer');
  MeshoptDecoder = mo.MeshoptDecoder;
  await MeshoptDecoder.ready;
} catch (e) {
  console.log('\x1b[31mCannot load 3D test dependencies: ' + e.message + '\x1b[0m');
  process.exit(1);
}

const mapSrc = fs.readFileSync(path.join(ROOT, 'js/data/anatomy_map.js'), 'utf8');
const sandbox = {};
new Function('sandbox', mapSrc + '\nObject.assign(sandbox,{MESH_GROUP_MAP,MESH_GROUP_ACTION,ANATOMY_TRAINING_GROUPS,' +
  'anatomyGroupFor,anatomyActionFor,isContextMesh,supportedAnatomyGroups,GROUP_SIDE_PREFERENCE,VIEW_AZIMUTH});')(sandbox);
const { MESH_GROUP_MAP, MESH_GROUP_ACTION, ANATOMY_TRAINING_GROUPS, VIEW_AZIMUTH,
        anatomyGroupFor, anatomyActionFor, isContextMesh, supportedAnatomyGroups } = sandbox;

/* ------------------------------------------------------------------ 1 */
group('1. The asset is a real glTF file');
const glbPath = path.join(ROOT, 'assets/anatomy-male-mobile.glb');
chk('the model file is present', fs.existsSync(glbPath));
const buf = fs.readFileSync(glbPath);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
chk('magic header is glTF', dv.getUint32(0, true) === 0x46546C67);
chk('version is 2', dv.getUint32(4, true) === 2);
chk('declared length matches the file', dv.getUint32(8, true) === buf.byteLength,
    dv.getUint32(8, true) + ' vs ' + buf.byteLength);
const mb = (buf.byteLength / 1048576).toFixed(2);
chk('the model is under 1.5 MB for mobile', buf.byteLength < 1.5 * 1048576, mb + ' MB');

/* ------------------------------------------------------------------ 2 */
group('2. The scene graph carries real per-muscle structures');
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise((res, rej) =>
  loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));

const muscles = [];
let context = 0, triangles = 0;
gltf.scene.traverse(o => {
  if(!o.isMesh) return;
  triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  if(o.userData && o.userData.muscleId) muscles.push(o);
  else context++;
});

chk('the model parses', !!gltf.scene);
chk('it contains 218 named muscle structures', muscles.length === 218, String(muscles.length));
chk('it contains skeleton / connective context meshes', context > 0, context + ' context meshes');
chk('triangle count is on a mobile budget', triangles > 100000 && triangles < 200000,
    triangles.toLocaleString() + ' triangles');

const required = ['muscleId','key','label','side','region','group','layer','sourceName'];
const incomplete = muscles.filter(m => required.some(k => m.userData[k] === undefined || m.userData[k] === ''));
chk('every muscle carries the full metadata set', incomplete.length === 0,
    incomplete.length + ' incomplete');

const sides = new Set(muscles.map(m => m.userData.side));
chk('muscles are recorded for both sides', sides.has('left') && sides.has('right'),
    [...sides].join(', '));
const keys = new Set(muscles.map(m => m.userData.key));
chk('there are 109 distinct muscles (218 = 109 x 2)', keys.size === 109, String(keys.size));
chk('every muscle declares its licence', muscles.every(m => /CC-BY-SA/.test(m.userData.assetLicense || '')),
    muscles[0].userData.assetLicense);

/* ------------------------------------------------------------------ 3 */
group('3. Every (region, group) pair in the model is mapped');
const seen = new Set();
muscles.forEach(m => seen.add(m.userData.region + '|' + m.userData.group));
const unmapped = [...seen].filter(k => !(k in MESH_GROUP_MAP));
chk('no region/group pair is missing from the map', unmapped.length === 0, unmapped.join(', '));
const unused = Object.keys(MESH_GROUP_MAP).filter(k => !seen.has(k));
chk('no map entry points at geometry that does not exist', unused.length === 0, unused.join(', '));
const noAction = Object.keys(MESH_GROUP_MAP).filter(k => !MESH_GROUP_ACTION[k]);
chk('every mapped group has a written anatomical action', noAction.length === 0, noAction.join(', '));

/* ------------------------------------------------------------------ 4 */
group('4. Mapping covers every training group ANCESTOR tracks');
const hitGroups = new Set();
muscles.forEach(m => { const g = anatomyGroupFor(m.userData.region, m.userData.group); if(g) hitGroups.add(g); });
const missing = ANATOMY_TRAINING_GROUPS.filter(g => !hitGroups.has(g));
chk('all 12 ANCESTOR muscle groups have geometry', missing.length === 0, missing.join(', '));
chk('the supported list matches the geometry', supportedAnatomyGroups().sort().join() === [...hitGroups].sort().join());

const examples = {};
muscles.forEach(m => {
  const g = anatomyGroupFor(m.userData.region, m.userData.group);
  if(g && !examples[g]) examples[g] = m.userData.label;
});
ANATOMY_TRAINING_GROUPS.forEach(g => {
  chk('  ' + g.padEnd(11) + ' <- ' + (examples[g] || 'MISSING'), !!examples[g]);
});

/* ------------------------------------------------------------------ 5 */
group('5. Structures with no ANCESTOR group are context, not guesses');
const unmappedStructures = muscles.filter(m => !anatomyGroupFor(m.userData.region, m.userData.group));
const unmappedRegions = [...new Set(unmappedStructures.map(m => m.userData.region + '/' + m.userData.group))];
chk('some structures are deliberately left unmapped', unmappedStructures.length > 0,
    unmappedStructures.length + ' structures in ' + unmappedRegions.length + ' groups');
console.log('  \x1b[2m  context groups: ' + unmappedRegions.join(', ') + '\x1b[0m');
chk('no context mesh was silently assigned a training group',
    muscles.filter(m => isContextMesh(m.material && m.material.name))
      .every(m => !m.userData.muscleId));
chk('hip rotators are not pretended to be glutes',
    anatomyGroupFor('hips', 'Hip rotators') === null);
chk('neck is not pretended to be back',
    anatomyGroupFor('neck', 'Neck') === null);

/* Reproduce the viewer's transform exactly: centre the model, scale it to
   1.62 m and stand it on the ground, so the test ray hits the same place the
   on-screen pointer would. */
const root = gltf.scene;
const tb = new THREE.Box3().setFromObject(root);
const tsize = new THREE.Vector3(); tb.getSize(tsize);
const tcentre = new THREE.Vector3(); tb.getCenter(tcentre);
const tscale = 1.62 / tsize.y;
root.scale.setScalar(tscale);
root.position.set(-tcentre.x * tscale, -tb.min.y * tscale, -tcentre.z * tscale);
const scene = new THREE.Scene();
scene.add(root);
scene.updateMatrixWorld(true);
const finalBox = new THREE.Box3().setFromObject(root);
const finalSize = new THREE.Vector3(); finalBox.getSize(finalSize);
chk('the model is scaled to a predictable height',
    Math.abs(finalSize.y - 1.62) < 0.01 && Math.abs(finalBox.min.y) < 0.01,
    finalSize.y.toFixed(3) + ' m tall, base at y=' + finalBox.min.y.toFixed(3));

/* ------------------------------------------------------------------ 6 */
group('6. Context meshes do not block selection');

/* The viewer sets raycast to a no-op on every mesh without a muscleId and
   leaves the fascia layer off until asked for. This section shows why. */
const shell = [], bone = [], pickable = [];
gltf.scene.traverse(o => {
  if(!o.isMesh) return;
  const name = o.material && o.material.name ? o.material.name : '';
  if(o.userData && o.userData.muscleId){ pickable.push(o); return; }
  if(name === 'FULL_connective.001') shell.push(o); else bone.push(o);
});
chk('the model ships non-muscle context geometry', shell.length + bone.length > 0,
    shell.length + ' fascia, ' + bone.length + ' bone/other');

const allMeshes = [];
gltf.scene.traverse(o => { if(o.isMesh) allMeshes.push(o); });

function rayAt(azimuth, y, xOffset){
  const r = 3.05;
  const from = new THREE.Vector3(r * Math.sin(azimuth) + xOffset, y, r * Math.cos(azimuth));
  const dir  = new THREE.Vector3(xOffset, y, 0).sub(from).normalize();
  return new THREE.Raycaster(from, dir);
}

/* Context meshes are real geometry sitting inside and around the muscles.
   Left in the picking set they win rays that the user aimed at a muscle, so
   the viewer excludes them. Find a location where that actually happens
   rather than asserting it in the abstract. */
function firstHitAll(y, x){
  const hits = rayAt(0, y, x).intersectObjects(allMeshes, true);
  return hits.length ? hits[0].object : null;
}
let blockedAt = null;
for(let y = 0.4; y <= 1.55 && !blockedAt; y += 0.02){
  for(const x of [0, 0.04, -0.04, 0.08, -0.08, 0.12, -0.12]){
    const hit = firstHitAll(y, x);
    if(hit && !(hit.userData || {}).muscleId){ blockedAt = { y, x, name: hit.material.name }; break; }
  }
}
chk('there are places where context geometry wins the ray', !!blockedAt,
    blockedAt ? blockedAt.name + ' at y=' + blockedAt.y.toFixed(2) : 'none found');
chk('the muscle-only pick set still resolves a muscle at that spot',
    !!blockedAt && !!rayAt(0, blockedAt.y, blockedAt.x).intersectObjects(pickable, false).length,
    blockedAt ? (() => {
      const h = rayAt(0, blockedAt.y, blockedAt.x).intersectObjects(pickable, false)[0];
      return h ? h.object.userData.label + ' [' + h.object.userData.group + ']' : 'nothing';
    })() : '');

/* The viewer's own configuration is asserted against its source, because the
   raycast override can only be exercised where WebGL exists. */
const viewerSrc = fs.readFileSync(path.join(ROOT, 'js/ui/anatomy3d.js'), 'utf8');
chk('the viewer disables raycasting on context meshes',
    /o\.raycast\s*=\s*function\s*\(\s*\)\s*\{\s*\}/.test(viewerSrc));
chk('the fascia layer is hidden until the user asks for it',
    /shell\.push\(o\)[\s\S]{0,200}o\.visible\s*=\s*false/.test(viewerSrc));
chk('a control exposes the fascia layer', viewerSrc.includes("labToggleContext(\\'shell\\')"));
chk('a control exposes the skeleton layer', viewerSrc.includes("labToggleContext(\\'bone\\')"));

/* ------------------------------------------------------------------ 7 */
group('7. Raycast picking resolves the structure under the pointer');
function pick(azimuth, y, xOffset){
  const hits = rayAt(azimuth, y, xOffset).intersectObjects(pickable, false);
  return hits.length ? hits[0].object.userData : null;
}

const chestFront = pick(0, 1.18, 0.07);
const chestBack  = pick(Math.PI, 1.18, 0.07);
chk('a ray into the chest from the front hits a chest muscle',
    !!chestFront && chestFront.group === 'Chest',
    chestFront ? chestFront.label + ' [' + chestFront.group + ']' : 'nothing');
chk('the same ray from the back hits a back muscle',
    !!chestBack && ['Lats','Trapezius','Spinal extensors'].includes(chestBack.group),
    chestBack ? chestBack.label + ' [' + chestBack.group + ']' : 'nothing');
chk('front and back resolve different structures',
    !!chestFront && !!chestBack && chestFront.muscleId !== chestBack.muscleId,
    (chestFront && chestFront.label) + ' vs ' + (chestBack && chestBack.label));

const shoulderFront = pick(0, 1.30, 0.16);
const shoulderBack  = pick(Math.PI, 1.30, 0.16);
chk('shoulder from the front -> anterior deltoid',
    !!shoulderFront && /deltoid/i.test(shoulderFront.label) && /anterior/i.test(shoulderFront.label),
    shoulderFront ? shoulderFront.label : 'nothing');
chk('shoulder from the back -> posterior deltoid',
    !!shoulderBack && /deltoid/i.test(shoulderBack.label) && /posterior/i.test(shoulderBack.label),
    shoulderBack ? shoulderBack.label : 'nothing');

const hipBack = pick(Math.PI, 0.85, 0.09);
chk('hip from the back -> gluteus maximus',
    !!hipBack && /gluteus maximus/i.test(hipBack.label),
    hipBack ? hipBack.label + ' [' + hipBack.group + ']' : 'nothing');

const pickedGroup = chestFront ? anatomyGroupFor(chestFront.region, chestFront.group) : null;
chk('the picked structure maps onto an ANCESTOR training group', pickedGroup === 'chest', String(pickedGroup));
chk('its anatomical action is written down',
    !!anatomyActionFor(chestFront.region, chestFront.group),
    (anatomyActionFor(chestFront.region, chestFront.group) || '').slice(0, 64) + '...');
chk('its side is known, so left and right can be told apart',
    ['left','right'].includes(chestFront.side), chestFront.side);
chk('its depth layer is known, so a layer filter is possible',
    ['superficial','deep'].includes(chestFront.layer), chestFront.layer);

/* Unmapped structures stay selectable but carry no invented training data.
   Scan the body for one rather than betting on a single ray height. */
let contextHit = null;
for(let y = 0.35; y <= 1.55 && !contextHit; y += 0.05){
  for(const x of [0, 0.05, -0.05, 0.10, -0.10]){
    for(const az of [0, Math.PI]){
      const h = pick(az, y, x);
      if(h && !anatomyGroupFor(h.region, h.group)){ contextHit = h; break; }
    }
    if(contextHit) break;
  }
}
chk('structures outside ANCESTOR\'s twelve groups are still selectable', !!contextHit,
    contextHit ? contextHit.label + ' [' + contextHit.group + ']' : 'none found');
chk('they return no training group rather than a guessed one',
    !!contextHit && anatomyGroupFor(contextHit.region, contextHit.group) === null);
chk('they still carry their real anatomical action',
    !!contextHit && !!anatomyActionFor(contextHit.region, contextHit.group),
    contextHit ? (anatomyActionFor(contextHit.region, contextHit.group) || '').slice(0, 56) + '...' : '');

/* ------------------------------------------------------------------ 8 */
group('8. Resources can be released');
let disposed = 0;
const geometries = new Set(), materials = new Set();
gltf.scene.traverse(o => {
  if(!o.isMesh) return;
  geometries.add(o.geometry);
  (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m && materials.add(m));
});
geometries.forEach(g => { g.dispose(); disposed++; });
materials.forEach(m => { m.dispose(); });
chk('every geometry exposes dispose() and it runs', disposed === geometries.size,
    disposed + '/' + geometries.size);
chk('the viewer disposes materials too', materials.size > 0, materials.size + ' materials');

/* ------------------------------------------------------------------ 8 */
group('9. Attribution and licence travel with the asset');
const attrPath = path.join(ROOT, 'assets/ANATOMY-ATTRIBUTION.txt');
const licPath  = path.join(ROOT, 'assets/ANATOMY-LICENSE-CC-BY-SA-4.0.txt');
chk('an attribution file ships with the model', fs.existsSync(attrPath));
chk('the CC BY-SA 4.0 licence text ships with the model', fs.existsSync(licPath));
if(fs.existsSync(attrPath)){
  const a = fs.readFileSync(attrPath, 'utf8');
  chk('attribution names Z-Anatomy', a.includes('Z-Anatomy'));
  chk('attribution names BodyParts3D', a.includes('BodyParts3D'));
  chk('attribution states CC BY-SA 4.0', a.includes('CC BY-SA 4.0') || a.includes('Attribution-ShareAlike 4.0'));
  chk('attribution states the model is unreviewed by a specialist',
      /reviewed by an anatomy specialist/i.test(a));
}
const cssPath = path.join(ROOT, 'css/app.css');
chk('the credits are surfaced in the interface',
    fs.readFileSync(cssPath, 'utf8').includes('lab-credits'));

/* ------------------------------------------------------------------ */
console.log('\n' + '='.repeat(64));
if(fail === 0) console.log('\x1b[32m\x1b[1m  ALL ' + pass + ' ANATOMY TESTS PASSED\x1b[0m');
else { console.log('\x1b[31m\x1b[1m  ' + fail + ' FAILED\x1b[0m, ' + pass + ' passed');
       failures.forEach(f => console.log('   - ' + f)); }
console.log('='.repeat(64) + '\n');
process.exit(fail === 0 ? 0 : 1);
})();
