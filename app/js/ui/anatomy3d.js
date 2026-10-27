/* ============================================================================
   ANCESTOR — Anatomy Lab 3D viewer

   A real anatomical model, not a stylised figure.

   Asset:  assets/anatomy-male-mobile.glb
           218 individually named skeletal-muscle meshes (109 muscles, left
           and right) plus skeleton and connective-tissue context meshes.
           128,917 triangles, meshopt-compressed, no textures.
           Adapted from Z-Anatomy / BodyParts3D. CC BY-SA 4.0.
           Provenance, credits and licence: assets/ANATOMY-ATTRIBUTION.txt.

   Design constraints this file respects:

   · LAZY. Neither the 3D runtime nor the model is parsed until the user
     actually opens the lab. In the shipped single-file bundle both live in
     `text/plain` script blocks, which browsers do not execute, so the cost
     is a download and nothing else until the lab opens.

   · ON DEMAND RENDERING. Nothing redraws while the scene is idle. Frames are
     requested on interaction and during camera animation only.

   · PERSISTENT ACROSS UI RE-RENDERS. Selecting a muscle or toggling a filter
     updates the surrounding UI without detaching or recreating the WebGL
     context (`labDetachStage` / `labReattach`).

   · DISPOSED. Every geometry, material, texture, the renderer and its WebGL
     context are released when the viewer leaves the screen.

   · FALLS BACK HONESTLY. No WebGL, a failed download or a runtime error all
     fall back to the existing 2D figure. The fallback is reported to the user
     with the reason. It never pretends the 3D view loaded.

   · ACCESSIBLE. Every 3D-only interaction has a keyboard equivalent in the
     muscle list, which is the same list the 2D figure uses.

   This is vanilla JavaScript. There is no React in this project; @react-three
   and Motion for React do not apply.
   ========================================================================== */

const LAB_RUNTIME_SRC = 'js/vendor/three-bundle.js';
const LAB_MODEL_SRC   = 'assets/anatomy-male-mobile.glb';

let LAB = null;                 // the live viewer, or null
let LAB_MOUNTING = false;       // true while initial runtime+model load is in flight
let LAB_DETACHED_STAGE = null;  // temporarily held across render() on Body screen
let LAB_RUNTIME_PROMISE = null; // one shared load, however many times requested
let LAB_MODEL_BYTES = null;     // decoded once, reused

/* ------------------------------------------------------------ capability */
function labWebGLAvailable(){
  try{
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')));
  }catch(e){ return false; }
}

/* -------------------------------------------------------- lazy runtime ----
   The runtime and the model are shipped inside <script type="text/plain">
   blocks in the single-file build so they are never parsed on page load.
   Blocks carrying data-enc="gzip-b64" are decompressed via DecompressionStream
   to cut >1.1 MB from the offline HTML file without losing any geometry. */
function labInlineText(id){
  const el = document.getElementById(id);
  return el ? el.textContent : null;
}
function labInlineEnc(id){
  const el = document.getElementById(id);
  return el ? (el.getAttribute('data-enc') || '') : '';
}
function b64ToBytes(b64){
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;
}
function decompressGzipBytes(bytes){
  if(typeof DecompressionStream !== 'function'){
    return Promise.reject(new Error('DecompressionStream unavailable'));
  }
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Response(stream).arrayBuffer().then(ab => new Uint8Array(ab));
}
function labLoadScript(src){
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = res;
    s.onerror = () => rej(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}
function evalRuntimeSource(code){
  const s = document.createElement('script');
  s.textContent = code;
  document.head.appendChild(s);
  document.head.removeChild(s);      // definitions remain on window
}
function labLoadRuntime(){
  if(window.THREE && window.THREE.GLTFLoader) return Promise.resolve(window.THREE);
  if(LAB_RUNTIME_PROMISE) return LAB_RUNTIME_PROMISE;
  LAB_RUNTIME_PROMISE = new Promise((res, rej) => {
    const inline = labInlineText('three-runtime');
    const finish = () => (window.THREE && window.THREE.GLTFLoader)
      ? res(window.THREE) : rej(new Error('runtime did not expose THREE'));
    if(inline && inline.trim()){
      const enc = labInlineEnc('three-runtime');
      if(enc === 'gzip-b64'){
        decompressGzipBytes(b64ToBytes(inline.trim()))
          .then(u8 => { evalRuntimeSource(new TextDecoder('utf-8').decode(u8)); finish(); })
          .catch(rej);
        return;
      }
      try{ evalRuntimeSource(inline); finish(); }catch(e){ rej(e); }
      return;
    }
    labLoadScript(LAB_RUNTIME_SRC).then(finish, rej);
  }).catch(e => { LAB_RUNTIME_PROMISE = null; throw e; });
  return LAB_RUNTIME_PROMISE;
}

function labLoadModelBytes(){
  if(LAB_MODEL_BYTES) return Promise.resolve(LAB_MODEL_BYTES);
  const inline = labInlineText('anatomy-glb');
  if(inline && inline.trim()){
    const enc = labInlineEnc('anatomy-glb');
    if(enc === 'gzip-b64'){
      return decompressGzipBytes(b64ToBytes(inline.trim())).then(u8 => {
        LAB_MODEL_BYTES = u8;
        return LAB_MODEL_BYTES;
      });
    }
    try{
      LAB_MODEL_BYTES = b64ToBytes(inline.trim());
      return Promise.resolve(LAB_MODEL_BYTES);
    }catch(e){ return Promise.reject(new Error('model payload is not valid base64')); }
  }
  return fetch(LAB_MODEL_SRC).then(r => {
    if(!r.ok) throw new Error('model HTTP ' + r.status);
    return r.arrayBuffer();
  }).then(b => { LAB_MODEL_BYTES = new Uint8Array(b); return LAB_MODEL_BYTES; });
}

/* --------------------------------------------------------- the viewer ---- */
function mountAnatomyLab(host, opts){
  opts = opts || {};
  const onSelect   = opts.onSelect   || function(){};
  const onReady    = opts.onReady    || function(){};
  const onFail     = opts.onFail     || function(){};
  const onHover    = opts.onHover    || function(){};
  destroyAnatomyLab();

  if(!host){ onFail('no-host'); return; }
  if(!labWebGLAvailable()){ onFail('no-webgl'); return; }

  /* Loading state is shown immediately, before the runtime is even fetched. */
  host.innerHTML =
    '<div class="lab-stage" id="labStage">' +
      '<div class="lab-canvas-wrap" id="labCanvasWrap"></div>' +
      '<div class="lab-hover" id="labHover" hidden aria-hidden="true"></div>' +
      '<div class="lab-loading" id="labLoading">' +
        (typeof waitMark === 'function' ? waitMark() : '') +
        '<p class="lab-loading-t">' + esc(t('lab3d.loading')) + '</p>' +
        '<p class="lab-loading-d">' + esc(t('lab3d.loadingBody')) + '</p>' +
        /* A genuine wait, and a real progress signal: the 700 KB model is
           fetched in one go, so the only honest thing to show is the shape of
           what is coming, then the mark completing. */
        '<div class="lab-wait-skel">' +
          (typeof skel === 'function' ? skel('label row short row', {labelKey:'lab.loading'}) : '') +
        '</div>' +
      '</div>' +
      '<div class="lab-error" id="labError" hidden role="alert"></div>' +
      labControlsHtml() +
    '</div>';

  const stage = document.getElementById('labStage');
  const wrap  = document.getElementById('labCanvasWrap');
  const loading = document.getElementById('labLoading');
  const errBox  = document.getElementById('labError');
  const hoverEl = document.getElementById('labHover');

  const handleHover = label => {
    if(hoverEl){
      if(label){ hoverEl.textContent = label; hoverEl.hidden = false; }
      else     { hoverEl.hidden = true; hoverEl.textContent = ''; }
    }
    onHover(label);
  };

  const fail = (reason, detail) => {
    LAB_MOUNTING = false;
    if(loading) loading.hidden = true;
    if(errBox){
      errBox.hidden = false;
      errBox.innerHTML = '<b>' + esc(t('lab3d.error.' + reason)) + '</b>' +
        '<p>' + esc(t('lab3d.errorBody')) + '</p>' +
        (detail ? '<p class="hint">' + esc(String(detail).slice(0,200)) + '</p>' : '');
    }
    onFail(reason, detail);
  };

  LAB_MOUNTING = true;
  Promise.all([labLoadRuntime(), labLoadModelBytes()]).then(([THREE, bytes]) => {
    if(!LAB_MOUNTING) return;
    try{
      const viewer = createViewer(THREE, { host:wrap, stage:stage, bytes:bytes,
                                           onSelect:onSelect, onHover:handleHover });
      LAB = viewer;
      viewer.ready.then(() => {
        LAB_MOUNTING = false;
        if(LAB !== viewer) return;
        if(loading) loading.hidden = true;
        onReady(viewer);
      }, err => {
        if(LAB === viewer) destroyAnatomyLab();
        fail('render', err && err.message);
      });
    }catch(e){ fail('render', e && e.message); }
  }, e => fail(e && /webgl|runtime/i.test(e.message) ? 'runtime' : 'download', e && e.message));

  return { destroy: destroyAnatomyLab };
}

function labControlsHtml(){
  const btn = (id, key, fn, pressed) =>
    '<button type="button" class="fig-btn lab-btn" id="' + id + '" title="' + esc(t(key)) +
    '" aria-label="' + esc(t(key)) + '"' + (pressed !== undefined ? ' aria-pressed="' + pressed + '"' : '') +
    ' onclick="' + fn + '">' + LAB_ICONS[key] + '</button>';
  return '<div class="lab-controls">' +
    '<div class="lab-controls-row">' +
      btn('labFront','lab3d.front','labSetView(\'front\')') +
      btn('labBack','lab3d.back','labSetView(\'back\')') +
      btn('labReset','body.reset','labResetView()') +
    '</div>' +
    '<div class="lab-controls-row">' +
      btn('labZoomIn','body.zoom','labZoom(0.82)') +
      btn('labZoomOut','lab3d.zoomOut','labZoom(1.22)') +
      btn('labIso','lab3d.isolate','labToggleIsolate()', 'false') +
    '</div>' +
    '<div class="lab-controls-row">' +
      btn('labBone','lab3d.showBone','labToggleContext(\'bone\')', 'true') +
      btn('labShell','lab3d.showShell','labToggleContext(\'shell\')', 'false') +
    '</div>' +
  '</div>';
}

/* The fascia shell surrounds the whole body, so it is off by default: on, it
   hides every muscle underneath it. */
const LAB_ICONS = {
  'lab3d.showBone':'<svg viewBox="0 0 24 24"><path d="M7 17l10-10"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="15.5" r="2"/><circle cx="17.5" cy="8.5" r="2"/></svg>',
  'lab3d.showShell':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  'lab3d.front':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M9 7h6M9 17h6"/></svg>',
  'lab3d.back':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M15 8l-3 4-3-4M15 16l-3-4-3 4"/></svg>',
  'body.reset':'<svg viewBox="0 0 24 24"><path d="M4 4v6h6M20 20v-6h-6"/><path d="M4 10a8 8 0 0 1 13-3M20 14a8 8 0 0 1-13 3"/></svg>',
  'body.zoom':'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6M11 8v6"/></svg>',
  'lab3d.zoomOut':'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/></svg>',
  'lab3d.isolate':'<svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M5 8l7-5 7 5M5 16l7 5 7-5"/></svg>'
};

/* ------------------------------------------------------------- internals */
function createViewer(THREE, cfg){
  const wrap = cfg.host;
  const stage = cfg.stage;

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  wrap.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');   // the list is the accessible control

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 50);

  /* Lighting: sculpted studio setup — warm key from front-left, cool fill
     from right, rim from behind, plus hemisphere fill so muscle striations
     and bellies read cleanly on neutral anatomical stone. */
  const hemi = new THREE.HemisphereLight(0xf7f2e7, 0x5c584e, 0.92);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff7ea, 1.65); key.position.set(1.5, 2.0, 2.5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdce4ee, 0.68); fill.position.set(-2.2, 0.6, 1.4); scene.add(fill);
  const backKey = new THREE.DirectionalLight(0xfff3e2, 1.25); backKey.position.set(-1.1, 1.6, -2.5); scene.add(backKey);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.enablePan = false;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 1.15;
  controls.maxDistance = 5.2;
  controls.minPolarAngle = 0.22;
  controls.maxPolarAngle = Math.PI - 0.22;
  controls.target.set(0, 0.84, 0);

  /* Neutral anatomical materials with restrained burnt-orange selection.
     Preserves underlying surface normal shading while making the selected
     structure unmistakable against neutral musculature. */
  const muscleMat  = new THREE.MeshStandardMaterial({ color:0x9B9284, roughness:0.58, metalness:0.04 });
  const boneMat    = new THREE.MeshStandardMaterial({ color:0xD9D2C2, roughness:0.72, metalness:0.0,
                                                      transparent:true, opacity:0.52, depthWrite:false });
  const shellMat   = new THREE.MeshStandardMaterial({ color:0xD8D0BF, roughness:0.85, metalness:0.0,
                                                      transparent:true, opacity:0.26, depthWrite:false });
  const contextMeshes = { bone: [], shell: [] };
  const selMatBase = { color:0xD66A3A, roughness:0.42, metalness:0.02 };
  const hoverMat   = new THREE.MeshStandardMaterial({ color:0xC87E55, roughness:0.48, metalness:0.02,
                                                      emissive:0x1f0a02, emissiveIntensity:0.22 });
  const dimMat     = new THREE.MeshStandardMaterial({ color:0x8E8878, roughness:0.85, metalness:0.0,
                                                      transparent:true, opacity:0.14, depthWrite:false });

  const state = {
    muscles: [],                 // { mesh, extras, group, baseMaterial, selMaterial }
    selected: null,              // entry or { isGroup:true, group, members }
    hovered: null,               // entry currently under pointer
    isolated: false,
    layerFilter: 'all',          // all | superficial | deep
    regionFilter: 'all',
    frame: 0,
    loaded: false,
    disposed: false
  };

  /* -------- sizing -------- */
  function resize(){
    if(state.disposed) return;
    const w = wrap.clientWidth || 320, h = wrap.clientHeight || 400;
    if(!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  }

  /* -------- on-demand rendering: nothing draws while idle -------- */
  function invalidate(){
    if(state.disposed || state.frame) return;
    state.frame = requestAnimationFrame(tick);
  }
  function tick(){
    state.frame = 0;
    if(state.disposed) return;
    controls.update();
    if(cameraTween.active){
      stepTween();
      state.frame = requestAnimationFrame(tick);   // keep drawing until the tween ends
      renderer.render(scene, camera);
      return;
    }
    renderer.render(scene, camera);
    if(controls.enableDamping && needsAnother()) invalidate();
  }
  let lastPos = null;
  function needsAnother(){
    const p = camera.position;
    const k = p.x.toFixed(4) + ',' + p.y.toFixed(4) + ',' + p.z.toFixed(4);
    if(k === lastPos) return false;
    lastPos = k; return true;
  }
  controls.addEventListener('change', invalidate);

  /* -------- camera tween -------- */
  const cameraTween = { active:false, t:0, dur: 0.48,
                        fromR:0, toR:0, fromTheta:0, toTheta:0, fromPhi:0, toPhi:0 };
  const sph = new THREE.Spherical();
  function isReduced(){ return document.documentElement && document.documentElement.dataset.motion === 'on'; }
  function currentSpherical(){
    const v = new THREE.Vector3().subVectors(camera.position, controls.target);
    return new THREE.Spherical().setFromVector3(v);
  }
  function tweenTo(theta, phi, radius){
    const s = currentSpherical();
    let toTheta = theta === null || theta === undefined ? s.theta : theta;
    const toPhi = (phi === null || phi === undefined) ? s.phi : phi;
    const toR   = (radius === null || radius === undefined) ? s.radius : radius;
    while(toTheta - s.theta >  Math.PI) toTheta -= 2*Math.PI;
    while(toTheta - s.theta < -Math.PI) toTheta += 2*Math.PI;
    if(isReduced()){
      sph.radius = toR; sph.theta = toTheta; sph.phi = toPhi;
      sph.makeSafe();
      camera.position.setFromSpherical(sph).add(controls.target);
      camera.lookAt(controls.target);
      cameraTween.active = false;
      renderer.render(scene, camera);
      return;
    }
    cameraTween.fromTheta = s.theta; cameraTween.toTheta = toTheta;
    cameraTween.fromPhi = s.phi;     cameraTween.toPhi = toPhi;
    cameraTween.fromR = s.radius;    cameraTween.toR = toR;
    cameraTween.t = 0; cameraTween.active = true;
    invalidate();
  }
  function stepTween(){
    cameraTween.t = Math.min(1, cameraTween.t + 1 / Math.max(1, (cameraTween.dur * 60)));
    const e = easeInOut(cameraTween.t);
    sph.radius = cameraTween.fromR + (cameraTween.toR - cameraTween.fromR) * e;
    sph.theta  = cameraTween.fromTheta + (cameraTween.toTheta - cameraTween.fromTheta) * e;
    sph.phi    = cameraTween.fromPhi + (cameraTween.toPhi - cameraTween.fromPhi) * e;
    sph.makeSafe();
    camera.position.setFromSpherical(sph).add(controls.target);
    camera.lookAt(controls.target);
    if(cameraTween.t >= 1) cameraTween.active = false;
  }
  function easeInOut(t){ return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

  function setView(side){
    tweenTo(VIEW_AZIMUTH[side] === undefined ? 0 : VIEW_AZIMUTH[side], Math.PI/2, null);
  }
  function resetView(silent){
    tweenTo(0, Math.PI/2, 2.85);
    state.selected = null; state.hovered = null; state.isolated = false;
    state.layerFilter = 'all'; state.regionFilter = 'all';
    const isoBtn = document.getElementById('labIso');
    if(isoBtn) isoBtn.setAttribute('aria-pressed', 'false');
    applyFilters();
    if(!silent) cfg.onSelect(null);
  }
  function zoomBy(f){
    const s = currentSpherical();
    const r = Math.max(controls.minDistance, Math.min(controls.maxDistance, s.radius * f));
    tweenTo(s.theta, s.phi, r);
  }

  /* -------- selection -------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null, moved = 0;

  function pickAt(clientX, clientY){
    const r = renderer.domElement.getBoundingClientRect();
    if(!r.width || !r.height) return null;
    pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
    return pickNdc(pointer.x, pointer.y);
  }
  function pickNdc(nx, ny){
    pointer.set(nx, ny);
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const vis = state.muscles.filter(m => m.mesh.visible).map(m => m.mesh);
    const hits = raycaster.intersectObjects(vis, false);
    if(!hits.length) return null;
    return state.muscles.filter(m => m.mesh === hits[0].object)[0] || null;
  }

  const el = renderer.domElement;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { down = { x:e.clientX, y:e.clientY }; moved = 0; });
  el.addEventListener('pointermove', e => {
    if(down){
      moved = Math.max(moved, Math.abs(e.clientX-down.x) + Math.abs(e.clientY-down.y));
      return;
    }
    if(!state.isolated && state.loaded){
      const hit = pickAt(e.clientX, e.clientY);
      if(hit !== state.hovered){
        state.hovered = hit;
        el.style.cursor = hit ? 'pointer' : 'grab';
        paint();
        invalidate();
      }
      cfg.onHover(hit ? hit.extras.label : null);
    }
  });
  el.addEventListener('pointerleave', () => {
    if(state.hovered){ state.hovered = null; paint(); invalidate(); }
    cfg.onHover(null);
  });
  el.addEventListener('pointerup', e => {
    const wasDrag = moved > 8;                 // a drag orbits, it does not select
    down = null;
    if(wasDrag) return;
    const hit = pickAt(e.clientX, e.clientY);
    if(hit) selectEntry(hit);
  });
  el.addEventListener('pointercancel', () => { down = null; });

  function selectEntry(entry, skipCallback){
    state.selected = entry || null;
    paint();
    if(!skipCallback){
      cfg.onSelect(entry ? {
        label: entry.extras.label,
        sourceName: entry.extras.sourceName,
        side: entry.extras.side,
        layer: entry.extras.layer,
        region: entry.extras.region,
        group: entry.extras.group,
        action: anatomyActionFor(entry.extras.region, entry.extras.group),
        trainingGroup: entry.group,
        muscleId: entry.extras.muscleId
      } : null);
    }
    invalidate();
  }

  /* Selecting by training group (from the muscle list) highlights every mesh
     that belongs to it, and turns the camera to whichever side shows it. */
  function selectGroup(trainingGroup){
    if(!trainingGroup){ resetView(true); return; }
    const members = state.muscles.filter(m => m.group === trainingGroup);
    if(!members.length) return;
    state.selected = { isGroup:true, group:trainingGroup, members:members };
    paint();
    const pref = GROUP_SIDE_PREFERENCE[trainingGroup] || 'front';
    tweenTo(VIEW_AZIMUTH[pref] === undefined ? 0 : VIEW_AZIMUTH[pref], Math.PI/2, null);
    invalidate();
  }

  /* -------- filters -------- */
  function applyFilters(){
    state.muscles.forEach(m => {
      const layerOk  = state.layerFilter === 'all' || m.extras.layer === state.layerFilter;
      const regionOk = state.regionFilter === 'all' || m.extras.region === state.regionFilter;
      m.mesh.visible = layerOk && regionOk;
    });
    if(state.isolated && state.selected){
      const keep = state.selected.isGroup ? state.selected.members : [state.selected];
      state.muscles.forEach(m => { m.mesh.visible = keep.indexOf(m) >= 0; });
    }
    paint();
    invalidate();
  }
  function setLayerFilter(v){ state.layerFilter = v || 'all'; applyFilters(); }
  function setContext(kind, on){
    const list = kind === 'shell' ? contextMeshes.shell : contextMeshes.bone;
    list.forEach(o => { o.visible = !!on; });
    invalidate();
  }
  function contextVisible(kind){
    const list = kind === 'shell' ? contextMeshes.shell : contextMeshes.bone;
    return list.length ? list[0].visible : false;
  }
  function setRegionFilter(v){ state.regionFilter = v || 'all'; applyFilters(); }
  function toggleIsolate(){
    state.isolated = !state.isolated;
    applyFilters();
    const b = document.getElementById('labIso');
    if(b) b.setAttribute('aria-pressed', state.isolated ? 'true' : 'false');
    return state.isolated;
  }

  /* -------- material paint --------
     One material instance per mesh, so highlighting one structure never
     touches the colour of another. The underlying shape is untouched. */
  function paint(){
    const sel = state.selected;
    const keep = sel ? (sel.isGroup ? sel.members : [sel]) : [];
    state.muscles.forEach(m => {
      const on = keep.indexOf(m) >= 0;
      if(state.isolated && keep.length && !on){ m.mesh.material = dimMat; return; }
      if(on) m.mesh.material = m.selMaterial;
      else if(state.hovered === m) m.mesh.material = hoverMat;
      else m.mesh.material = m.baseMaterial;
    });
  }

  /* -------- load -------- */
  const loader = new THREE.GLTFLoader();
  if(THREE.MeshoptDecoder) loader.setMeshoptDecoder(THREE.MeshoptDecoder);

  const ready = new Promise((resolveReady, rejectReady) => {
    const slice = cfg.bytes.buffer.slice(cfg.bytes.byteOffset, cfg.bytes.byteOffset + cfg.bytes.byteLength);
    const waitDecoder = (THREE.MeshoptDecoder && THREE.MeshoptDecoder.ready)
      ? THREE.MeshoptDecoder.ready : Promise.resolve();

    waitDecoder.then(() => {
      if(state.disposed) return;
      loader.parse(slice, '', gltf => {
        if(state.disposed) return;
        const root = gltf.scene;
        root.traverse(o => {
          if(!o.isMesh) return;
          const extras = (o.userData && o.userData.muscleId) ? o.userData : null;
          const name = o.material && o.material.name ? o.material.name : '';
          if(!extras){
            /* Context: the skeleton, the superficial fascia shell, and the
               head/hand/foot muscles the atlas includes for orientation.

               These are never pickable. The fascia shell in particular wraps the
               entire body, so if it were left in the picking set every ray would
               stop on it and no muscle could ever be selected. */
            o.raycast = function(){};
            o.castShadow = o.receiveShadow = false;
            if(name === 'FULL_connective.001'){
              contextMeshes.shell.push(o);
              o.material = shellMat;
              o.visible = false;                 // it would hide every muscle
            } else {
              contextMeshes.bone.push(o);
              o.material = boneMat;
            }
            return;
          }
          const group = anatomyGroupFor(extras.region, extras.group);
          const base = muscleMat.clone();
          const sel  = new THREE.MeshStandardMaterial(Object.assign({}, selMatBase, {
            emissive: 0x351204, emissiveIntensity: 0.42
          }));
          o.material = base;
          state.muscles.push({ mesh:o, extras:extras, group:group, baseMaterial:base, selMaterial:sel });
        });

        /* Centre and scale to a predictable size regardless of source units. */
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3(); box.getSize(size);
        const centre = new THREE.Vector3(); box.getCenter(centre);
        const scale = 1.62 / Math.max(0.001, size.y);
        root.scale.setScalar(scale);
        root.position.set(-centre.x * scale, -box.min.y * scale, -centre.z * scale);
        scene.add(root);

        controls.target.set(0, 0.84, 0);
        camera.position.set(0, 0.88, 2.85);
        controls.update();
        state.loaded = true;
        resize();
        renderer.render(scene, camera);
        resolveReady();
      }, err => rejectReady(new Error('gltf parse failed: ' + (err && err.message))));
    }, rejectReady);
  });

  const ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
  if(ro) ro.observe(wrap); else window.addEventListener('resize', resize);
  resize();

  /* Synchronous render + pixel sampler for automated verification without
     requiring preserveDrawingBuffer across normal frames. */
  function samplePixels(){
    if(state.disposed || !state.loaded) return { nonEmpty: 0, orange: 0, total: 0, hash: '' };
    if(cameraTween.active){
      cameraTween.t = 1;
      stepTween();
    }
    controls.update();
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    if(!w || !h) return { nonEmpty: 0, orange: 0, total: 0, hash: '' };
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let nonEmpty = 0, orange = 0, acc = 2166136261 >>> 0;
    const step = 4 * 7;                          // dense deterministic sample
    for(let i = 0; i < buf.length; i += step){
      const r = buf[i], g = buf[i+1], b = buf[i+2], a = buf[i+3];
      if(a > 10){
        nonEmpty++;
        if(r > 165 && g > 55 && g < 145 && b < 90 && (r - b) > 90) orange++;
        acc = Math.imul(acc ^ ((r << 16) | (g << 8) | b), 16777619) >>> 0;
      }
    }
    return { width: w, height: h, nonEmpty: nonEmpty, orange: orange,
             total: Math.floor(buf.length / step), hash: acc.toString(16) };
  }

  function pickScreen(nx, ny){
    const entry = pickNdc(nx, ny);
    selectEntry(entry);
    return entry ? entry.extras.label : null;
  }

  function dispose(){
    if(state.disposed) return;
    state.disposed = true;
    if(state.frame) cancelAnimationFrame(state.frame);
    if(ro) ro.disconnect(); else window.removeEventListener('resize', resize);
    try{ controls.dispose(); }catch(e){}
    scene.traverse(o => {
      if(o.isMesh){
        if(o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { if(m) m.dispose(); });
      }
    });
    muscleMat.dispose(); boneMat.dispose(); shellMat.dispose(); hoverMat.dispose(); dimMat.dispose();
    state.muscles.forEach(m => { m.baseMaterial.dispose(); m.selMaterial.dispose(); });
    state.muscles.length = 0;
    renderer.dispose();
    if(renderer.domElement && renderer.domElement.parentNode)
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    if(renderer.forceContextLoss) renderer.forceContextLoss();
  }

  return {
    ready:ready, stage:stage,
    setView:setView, resetView:resetView, zoomBy:zoomBy,
    selectGroup:selectGroup, clearSelection:() => selectEntry(null, true),
    setLayerFilter:setLayerFilter, setRegionFilter:setRegionFilter,
    getLayerFilter:() => state.layerFilter, getRegionFilter:() => state.regionFilter,
    toggleIsolate:toggleIsolate, isIsolated:() => state.isolated,
    setContext:setContext, contextVisible:contextVisible,
    samplePixels:samplePixels, pickScreen:pickScreen,
    resize:resize, dispose:dispose,
    isLoaded:() => state.loaded,
    count:() => state.muscles.length,
    groups:() => { const s = {}; state.muscles.forEach(m => { if(m.group) s[m.group] = true; }); return Object.keys(s); }
  };
}

/* ------------------------------------------------------- module-level API */
/* Preserve the live #labStage across innerHTML re-renders of the Body screen
   so selecting a muscle or toggling a filter never destroys WebGL. */
function labDetachStage(){
  if(LAB && LAB.stage && LAB.stage.parentNode){
    LAB_DETACHED_STAGE = LAB.stage;
    LAB.stage.parentNode.removeChild(LAB.stage);
  }
}
function labReattach(host){
  const stage = (LAB && LAB.stage) || LAB_DETACHED_STAGE;
  LAB_DETACHED_STAGE = null;
  if(!LAB || !stage || !host) return false;
  if(stage.parentNode !== host){
    host.innerHTML = '';
    host.appendChild(stage);
  }
  LAB.resize();
  return true;
}

function labSetView(side){ if(LAB) LAB.setView(side); }
function labResetView(){ if(LAB) LAB.resetView(false); }
function labZoom(f){ if(LAB) LAB.zoomBy(f); }
function labToggleIsolate(){
  if(!LAB) return;
  const on = LAB.toggleIsolate();
  toast(t(on ? 'lab3d.isolateOn' : 'lab3d.isolateOff'));
}
function labToggleContext(kind){
  if(!LAB) return;
  const on = !LAB.contextVisible(kind);
  LAB.setContext(kind, on);
  const id = kind === 'shell' ? 'labShell' : 'labBone';
  const b = document.getElementById(id);
  if(b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
  toast(t(on ? 'lab3d.contextOn' : 'lab3d.contextOff',
          { what: t(kind === 'shell' ? 'lab3d.showShell' : 'lab3d.showBone') }));
}
function labIsMounted(){ return !!LAB; }
function labIsLoaded(){ return !!(LAB && LAB.isLoaded && LAB.isLoaded()); }
function labSelectGroup(g){ if(LAB) LAB.selectGroup(g); }
function labClearSelection(){ if(LAB) LAB.clearSelection(); }
function labLayerFilter(v){ if(LAB) LAB.setLayerFilter(v); }
function labRegionFilter(v){ if(LAB) LAB.setRegionFilter(v); }
function labCurrentLayer(){ return (LAB && LAB.getLayerFilter) ? LAB.getLayerFilter() : 'all'; }
function labCurrentRegion(){ return (LAB && LAB.getRegionFilter) ? LAB.getRegionFilter() : 'all'; }
function labMuscleCount(){ return LAB ? LAB.count() : 0; }
function labGroups(){ return LAB ? LAB.groups() : []; }
function labSamplePixels(){ return (LAB && LAB.samplePixels) ? LAB.samplePixels() : null; }
function labPickScreen(nx, ny){ return (LAB && LAB.pickScreen) ? LAB.pickScreen(nx, ny) : null; }

function destroyAnatomyLab(){
  LAB_MOUNTING = false;
  LAB_DETACHED_STAGE = null;
  if(!LAB) return;
  try{ LAB.dispose(); }catch(e){}
  LAB = null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { anatomyGroupFor, supportedAnatomyGroups, MESH_GROUP_MAP };
}
