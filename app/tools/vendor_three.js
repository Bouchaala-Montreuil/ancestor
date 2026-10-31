/* ============================================================================
   ANCESTOR — vendor bundler for the Anatomy Lab's 3D runtime.

   Builds js/vendor/three-bundle.js as ONE classic script exposing window.THREE.
   Exports ONLY the classes actually used by js/ui/anatomy3d.js, GLTFLoader,
   OrbitControls and MeshoptDecoder so esbuild can tree-shake unused Three.js
   subsystems (WebXR, Audio, Animation, SkinnedMesh, ShadowMaps, DRACOLoader).

   This is a BUILD-TIME step only. The shipped application has zero runtime
   dependencies: the bundle produced here is committed and inlined by
   build.py like every other source file.

   Run: node tools/vendor_three.js
   ========================================================================== */
const { build } = require('esbuild');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'js', 'vendor', 'three-bundle.js');
const CHECK = process.argv.includes('--check');
/* Both licences require their copyright and permission notices to travel with
   copies of the code. Keep the complete notices in the vendored file even
   though esbuild removes its upstream comments. They also appear in the app's
   offline notices, including the single-file distribution. */
const licenseText = ['assets/THREE-LICENSE.txt', 'assets/MESHOPT-LICENSE.txt']
  .map(file => fs.readFileSync(path.join(ROOT, file), 'utf8').trim()).join('\n\n');
if (licenseText.includes('*/')) throw new Error('Licence text cannot contain a comment terminator');
const licenseBanner = '/*!\n' + licenseText + '\n*/';

const entry = `
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  MeshStandardMaterial,
  Raycaster,
  Vector2,
  Vector3,
  Box3,
  Spherical,
  Color,
  SRGBColorSpace,
  ACESFilmicToneMapping
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

globalThis.THREE = {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  MeshStandardMaterial,
  Raycaster,
  Vector2,
  Vector3,
  Box3,
  Spherical,
  Color,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  GLTFLoader,
  OrbitControls,
  MeshoptDecoder
};
`;

build({
  stdin: { contents: entry, resolveDir: ROOT, loader: 'js' },
  bundle: true,
  format: 'iife',
  minify: true,
  treeShaking: true,
  legalComments: 'none',
  banner: { js: licenseBanner },
  target: 'es2020',
  outfile: OUT,
  write: !CHECK,
  logLevel: 'info'
}).then(result => {
  if (CHECK) {
    if (!fs.existsSync(OUT) || !Buffer.from(result.outputFiles[0].contents).equals(fs.readFileSync(OUT))) {
      console.error('Vendor bundle is stale. Run npm run vendor.');
      process.exitCode = 1;
      return;
    }
    console.log('Vendor bundle matches the locked sources and licence notices.');
  } else {
    const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
    console.log('Wrote ' + path.relative(ROOT, OUT) + '  (' + kb + ' KB)');
  }
}).catch(error => { console.error(error.message || error); process.exitCode = 1; });
