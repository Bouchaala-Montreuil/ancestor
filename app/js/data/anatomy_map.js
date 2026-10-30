/* ============================================================================
   ANCESTOR — anatomy model mapping

   Bridges the real anatomical GLB (assets/anatomy-male-mobile.glb) and
   ANCESTOR's twelve training muscle groups.

   The model ships 218 individually named muscle meshes (109 muscles, left and
   right), each carrying glTF node extras:
     { muscleId, key, label, side, region, group, layer, sourceName }

   This file does three things, and nothing more:

   1. Maps every (region, group) pair in the model onto one of ANCESTOR's
      twelve training groups — but ONLY where the correspondence is genuine.
      Structures ANCESTOR has no group for (hip rotators, neck, adductors,
      lower-leg intrinsics) map to `null` and are rendered as context. They
      are still selectable and still show their real anatomical name and
      function; they simply carry no training data. Guessing a mapping would
      put false numbers in front of the user.

   2. Records the primary anatomical action of each group. These are standard
      anatomical descriptions of joint action, not training claims and not
      measurements.

   3. Declares which groups are visible from the front and from the back, so
      the front/back control moves the camera to a view where the selection
      is actually visible.

   Model provenance and licence: see assets/ANATOMY-ATTRIBUTION.txt.
   ========================================================================== */

/* ANCESTOR's twelve training groups, in the order the rest of the app uses. */
const ANATOMY_TRAINING_GROUPS = ['chest','back','shoulders','biceps','triceps','forearms',
                                 'quads','hamstrings','glutes','calves','abs','lowerback'];

/* (region, group) -> ANCESTOR training group, or null when ANCESTOR has no
   equivalent group. Every row was checked against the muscle list the model
   actually contains. */
const MESH_GROUP_MAP = {
  'chest|Chest':            'chest',
  'chest|Serratus':         'chest',        // serratus anterior — chest wall, scapular protraction

  'back|Lats':              'back',
  'back|Trapezius':         'back',
  'back|Upper back':        'back',
  'back|Spinal extensors':  'lowerback',

  'shoulder|Deltoids':      'shoulders',
  'shoulder|Rotator cuff':  'shoulders',
  'shoulder|Teres major':   'back',         // acts with latissimus dorsi on the humerus; anatomically a back muscle

  'arms|Biceps':            'biceps',
  'arms|Triceps':           'triceps',
  'arms|Upper arms':        'biceps',       // brachialis and coracobrachialis — elbow flexors / shoulder flexors

  'forearms|Forearms':      'forearms',

  'core|Abdominals':        'abs',
  'core|Obliques':          'abs',
  'core|Lower back':        'lowerback',    // quadratus lumborum

  'hips|Glutes':            'glutes',
  'hips|Hip flexors':       null,           // iliacus, psoas major, TFL — no ANCESTOR group
  'hips|Hip rotators':      null,           // piriformis, gemelli, obturators, quadratus femoris

  'thigh|Quadriceps':       'quads',
  'thigh|Hamstrings':       'hamstrings',
  'thigh|Adductors':        null,           // adductor group, gracilis, pectineus
  'thigh|Sartorius':        null,

  'calves|Calves':          'calves',
  'calves|Lower legs':      null,           // peroneals, toe flexors and extensors, tibialis posterior

  'neck|Neck':              null            // sternocleidomastoid, scalenes, splenius
};

/* Primary anatomical action per group. Joint actions, stated plainly.
   These describe what the muscle does, not what a programme should do. */
const MESH_GROUP_ACTION = {
  'chest|Chest':            'Adducts and flexes the arm at the shoulder; the clavicular head also flexes, the sternocostal head also extends from a flexed position.',
  'chest|Serratus':         'Holds the shoulder blade against the rib cage and rotates it upwards, which is what lets the arm lift overhead.',
  'back|Lats':              'Extends, adducts and internally rotates the arm at the shoulder; pulls the trunk towards a fixed arm.',
  'back|Trapezius':         'Upper fibres elevate the shoulder blade, middle fibres retract it, lower fibres depress it. Together they rotate it upwards.',
  'back|Upper back':        'Retracts and stabilises the shoulder blade and helps elevate the ribs during breathing.',
  'back|Spinal extensors':  'Extend the trunk and resist forward bending. They work isometrically to hold the spine under load.',

  'shoulder|Deltoids':      'Anterior fibres flex and internally rotate the arm, lateral fibres abduct it, posterior fibres extend and externally rotate it.',
  'shoulder|Rotator cuff':  'Hold the head of the humerus in the socket and rotate the arm. They stabilise far more than they move.',
  'shoulder|Teres major':   'Adducts, extends and internally rotates the arm at the shoulder, working with latissimus dorsi.',

  'arms|Biceps':            'Flexes the elbow and supinates the forearm. The long head also crosses the shoulder, so it helps flex the arm.',
  'arms|Triceps':           'Extends the elbow. The long head crosses the shoulder and also extends the arm.',
  'arms|Upper arms':        'Brachialis flexes the elbow at any forearm position; coracobrachialis flexes and adducts the arm.',

  'forearms|Forearms':      'Move the wrist, the hand and the fingers, and rotate the forearm. Grip strength lives here.',

  'core|Abdominals':        'Flex the trunk and compress the abdomen, resisting extension of the lower back.',
  'core|Obliques':          'Side-bend and rotate the trunk; resist rotation when braced.',
  'core|Lower back':        'Quadratus lumborum stabilises the lumbar spine and the twelfth rib and side-bends the trunk.',

  'hips|Glutes':            'Gluteus maximus extends the hip and externally rotates it; medius and minimus abduct the hip and keep the pelvis level when standing on one leg.',
  'hips|Hip flexors':       'Iliacus and psoas major flex the hip; tensor fasciae latae abducts and internally rotates it and tenses the iliotibial band.',
  'hips|Hip rotators':      'Externally rotate the hip and help steady the head of the femur in the socket.',

  'thigh|Quadriceps':       'Extend the knee. Rectus femoris crosses the hip too, so it also flexes the hip.',
  'thigh|Hamstrings':       'Flex the knee; the muscles that cross the hip also help extend it.',
  'thigh|Adductors':        'Bring the leg towards the midline and assist hip flexion and extension depending on position.',
  'thigh|Sartorius':        'Flexes, abducts and externally rotates the hip and flexes the knee — the longest muscle in the body.',

  'calves|Calves':          'Gastrocnemius and soleus plantarflex the ankle, pointing the foot down and pushing the body up. Soleus also works when the knee is bent.',
  'calves|Lower legs':      'Peroneals evert the foot; the deep toe flexors and extensors move the toes and support the arch.',

  'neck|Neck':              'Sternocleidomastoid turns and flexes the head; scalenes elevate the upper ribs; splenius extends and rotates the head and neck.'
};

/* Which side of the body each group is best seen from. Used to place the
   camera when a muscle is selected from the list rather than clicked. */
const GROUP_SIDE_PREFERENCE = {
  chest:'front', back:'back', shoulders:'front', biceps:'front', triceps:'back',
  forearms:'front', quads:'front', hamstrings:'back', glutes:'back', calves:'back',
  abs:'front', lowerback:'back'
};

/* Model-space camera azimuths (radians) for the two preset views.
   The model is glTF Y-up with anterior +Z, so front is +Z and back is -Z. */
const VIEW_AZIMUTH = { front: 0, back: Math.PI };

/* Tissues that are not muscle and are never selectable as a training muscle. */
const CONTEXT_MATERIALS = ['FULL_bone.001', 'FULL_connective.001'];

/* ------------------------------------------------------------- lookups */
function anatomyGroupFor(region, group){
  const k = region + '|' + group;
  return Object.prototype.hasOwnProperty.call(MESH_GROUP_MAP, k) ? MESH_GROUP_MAP[k] : null;
}
function anatomyActionFor(region, group){
  return MESH_GROUP_ACTION[region + '|' + group] || null;
}
function isContextMesh(meshName){
  return CONTEXT_MATERIALS.some(m => (meshName || '').indexOf(m) >= 0);
}
/* Every training group the model can actually highlight. Used to disable
   list rows that have no geometry behind them. */
function supportedAnatomyGroups(){
  const out = {};
  Object.keys(MESH_GROUP_MAP).forEach(k => {
    const g = MESH_GROUP_MAP[k];
    if(g) out[g] = true;
  });
  return Object.keys(out);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ANATOMY_TRAINING_GROUPS, MESH_GROUP_MAP, MESH_GROUP_ACTION,
                     GROUP_SIDE_PREFERENCE, VIEW_AZIMUTH, CONTEXT_MATERIALS,
                     anatomyGroupFor, anatomyActionFor, isContextMesh, supportedAnatomyGroups };
}
