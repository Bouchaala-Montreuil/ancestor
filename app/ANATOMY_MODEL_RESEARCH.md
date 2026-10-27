# ANCESTOR — anatomical 3D model: candidate research and selection

Date: 2026-10-26

## Requirement

A real anatomical model, not a flat illustration, not primitives, not a
generic figure. Separate muscle meshes or reliable selectable regions,
GLB/glTF, commercial redistribution rights, documented attribution, front and
rear anatomy, and a mobile budget.

---

## Candidate 1 — SELECTED: "Fit Mit With" mobile muscle atlas

| | |
|---|---|
| **Asset** | `full-body-male-mobile.glb` |
| **Repository** | https://github.com/slfresh/fitmitwith-anatomy-atlas |
| **Direct download** | `raw.githubusercontent.com/slfresh/fitmitwith-anatomy-atlas/master/models/full-body-male-mobile.glb` |
| **Licence** | **CC BY-SA 4.0** — commercial use permitted, attribution and share-alike required *on the model files* |
| **Upstream** | Z-Anatomy (CC BY-SA 4.0, Gauthier Kervyn) ← BodyParts3D (© Database Center for Life Science, CC BY-SA 2.1 JP / CC BY 4.0) |
| **Size as shipped** | 2,545,068 bytes → **923,728 bytes** after meshopt + quantisation |
| **Geometry** | 221 meshes, **128,917 triangles** |
| **Muscle structures** | **218** (109 distinct muscles × left/right) |
| **Context meshes** | 1 skeleton, 1 superficial-fascia shell, 1 head/hand/foot context mesh |
| **Textures** | none (materials only) — removes all texture licensing risk |
| **Named regions** | 11 regions, 25 anatomical groups |
| **Height / orientation** | 1.701 m; glTF Y-up, anterior +Z, anatomical left +X |

### Verified by inspection, not by reading the README

The file was downloaded and parsed with `GLTFLoader` before any decision:

- `glTF` magic, version 2, declared length matches file length.
- 221 nodes / 221 meshes / 3 materials / 0 images.
- **218 nodes carry glTF extras**: `muscleId`, `key`, `label`, `side`, `region`,
  `group`, `layer`, `sourceName`, `assetLicense`.
- 109 distinct muscle keys → 218 = 109 × 2 sides.
- Every muscle declares `assetLicense: "CC-BY-SA-4.0"`.
- Raycast picking resolves anatomically correct structures
  (front shoulder → anterior deltoid; back shoulder → posterior deltoid;
  back hip → gluteus maximus). See `tests/anatomy.js` §7.

### Why it won

It is the only candidate that is **already a GLB**, **already at a mobile
triangle budget**, **already carries per-muscle naming metadata**, and
**has no texture licensing entanglement**. Every other candidate needs a
conversion step or carries a licence term that blocks redistribution.

---

## Candidate 2 — Z-Anatomy (upstream original)

| | |
|---|---|
| **Source** | https://github.com/Z-Anatomy/Models-of-human-anatomy |
| **Licence** | CC BY-SA 4.0 (`License.txt`); GitHub API reports `NOASSERTION` |
| **Upstream** | BodyParts3D, © DBCLS, CC BY-SA 2.1 Japan |
| **Formats** | `.blend` (Z-Anatomy.zip), FBX, Sketchfab viewer |
| **Scale** | 7,000+ anatomical structures across all systems |

**Rejected — format and contamination risk.**

- No GLB is published. Shipping it would require a Blender conversion, which
  cannot be reproduced or verified in this environment.
- The bundle mixes licences. Reported by downstream consumers: the inner-ear
  model is **CC BY-NC-SA** and the kidney **CC BY-NC**. Any derivative that
  includes them becomes non-commercial. Separating them is a curated, manual
  step that cannot be automated safely here.
- The project association was dissolved; the repository is described by its
  own author as "inactive".

It remains the upstream source of the selected asset and is credited as such.

---

## Candidate 3 — AnatomyTOOL "Open 3D Model"

| | |
|---|---|
| **Source** | https://anatomytool.org/open3dmodel |
| **Licence** | Geometry **CC BY-SA 4.0**; **textures CC BY-NC-SA**; the project
frames itself as "Non-commercial, University based" |
| **Coverage** | Partial and staged: skeleton (Jul 2025), upper limb (Jul 2025),
lower limb (Jul 2025), pelvis (Dec 2025), thorax/abdomen/back muscles (Mar 2026) |
| **Formats** | `.blend`, `.obj`, `.glb` per body region |

**Rejected — incomplete and licence-ambiguous.**

- No complete muscular system until March 2026, and even then only
  thorax/abdomen/back. A training app needs the whole body.
- The **NC clause on the textures** contaminates any build that keeps them.
  Downstream projects report stripping textures to stay compliant, which
  would cost this candidate its main visual advantage.
- The live licence page could not be read directly in this environment
  (JS-rendered); the terms above are taken from the project's own about page
  and from downstream attribution files. That ambiguity is itself a reason
  not to ship it.

---

## Also evaluated and discarded

- **organui/muscles-3d** — 177 muscles, 5.6 MB, CC BY-SA 2.1 Japan.
  Two and a half times the size for fewer structures, and the older
  jurisdiction-specific licence. Functionally a worse version of candidate 1.
- **Human Reference Atlas (HuBMAP/NIH)** — CC BY 4.0, but female trunk only.
  No limb, back or abdominal-wall muscles in the versions that matter here.
- **NIH 3D Print Exchange** — download requires account creation; out of scope.
- **Meshy / Tripo / generic CC0 "anatomy" galleries** — AI-generated,
  artist-authored or decimated meshes with no anatomical naming, no
  per-muscle structure and no verifiable provenance. Not anatomy.

---

## Licence position for ANCESTOR

1. **Only the model files are CC BY-SA 4.0.** The notice shipped with the
   asset states this explicitly: *"Only these model files are CC BY-SA; the
   rest of the app is licensed separately."* ANCESTOR's application code is
   not derived from the model and is not placed under CC BY-SA.
2. **Attribution travels with the asset.** `assets/ANATOMY-ATTRIBUTION.txt`
   carries the licensors' requested wording verbatim, the upstream source
   archive, and the full list of changes.
3. **The licence text ships too.** `assets/ANATOMY-LICENSE-CC-BY-SA-4.0.txt`.
4. **Attribution is visible in the interface**, not buried in a file: the Body
   screen renders a credits line naming Z-Anatomy / BodyParts3D and CC BY-SA 4.0.
5. **Share-alike is satisfied** by publishing the adapted model (compressed,
   unmodified geometry and metadata) under the same licence, alongside the
   attribution and change list.
6. **The atlas has not been reviewed by an anatomy specialist.** The upstream
   notice says so, and ANCESTOR repeats it in the interface rather than
   hiding it. Training colours in the viewer are estimates, not measured
   muscle activation.

## Modifications made to the model

- Re-compressed with `@gltf-transform`: `dedup`, `prune({keepExtras:true})`,
  `weld`, `quantize`, `meshopt` level `high`.
  **2,545,068 → 923,728 bytes (36.3 % of original).**
- Triangle count unchanged at **128,917** — no decimation, so no anatomical
  detail was thrown away.
- `prune({keepExtras:true})` was used deliberately: the per-muscle node extras
  are what drives selection, so they were preserved.
- Geometry and metadata are otherwise **unmodified**.

## Two findings from inspection that changed the implementation

1. **The superficial-fascia mesh wraps the whole body.** Left pickable it
   wins rays aimed at muscles, and rendered opaque it hides every muscle.
   It is therefore **non-pickable and hidden by default**, with an explicit
   toggle. `tests/anatomy.js` §6 asserts this.
2. **The skeleton is context, and is also non-pickable.** Otherwise a click on
   a thin muscle over the ribcage selects "Skeleton". `tests/anatomy.js` §6
   proves the case exists.

Both are handled in `js/ui/anatomy3d.js`; 62 muscle structures in 6 groups
(hip rotators, hip flexors, adductors, sartorius, lower-leg intrinsics, neck)
have **no** ANCESTOR training group and are deliberately rendered as context
rather than mapped to a neighbouring group. `tests/anatomy.js` §5 asserts
that no guess was made.
