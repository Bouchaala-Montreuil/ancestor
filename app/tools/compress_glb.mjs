/* Compress the anatomy GLB for web delivery. Build-time only.
   Run: node tools/compress_glb.mjs <in.glb> <out.glb> */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, quantize, draco, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import fs from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('usage: node tools/compress_glb.mjs in.glb out.glb'); process.exit(1); }

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  });

const before = fs.statSync(inPath).size;
const doc = await io.read(inPath);
const meshCount = doc.getRoot().listMeshes().length;
let tris = 0;
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? 0) / 3;

await doc.transform(
  dedup(),
  prune({ keepExtras: true }),           // keep per-muscle node extras — they drive selection
  weld(),
  quantize({ pattern: /^(POSITION|NORMAL|TEXCOORD)/, quantizePosition: 14, quantizeNormal: 10 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' })
);

const bytes = await io.writeBinary(doc);
fs.writeFileSync(outPath, bytes);
const after = fs.statSync(outPath).size;
console.log(`in   ${(before / 1048576).toFixed(2)} MB  (${meshCount} meshes, ${tris | 0} tris)`);
console.log(`out  ${(after / 1048576).toFixed(2)} MB  ->  ${(100 * after / before).toFixed(1)}% of original`);
console.log(`base64 payload would be ${(after * 4 / 3 / 1048576).toFixed(2)} MB`);
