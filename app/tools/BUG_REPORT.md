# ANCESTOR — QA audit & bug report

Audit date: 2026-10-22 · Build: `dist/ancestor.html` (373 KB)
Method: scripted user journeys in jsdom (`tools/qa_audit.js`) + targeted repro scripts
+ static analysis of the stylesheet. Every issue below was reproduced before
being fixed, and re-tested after.

---

## 1. Summary

**Inspected:** all five sections (Today, Session, Body, Progress, Profile), the
onboarding flow, every anatomy region on both views, the workout flow, charts
and tables, schedule/sleep entry, navigation, persistence and the stylesheet.

**Journeys executed:** 13 groups — onboarding, dashboard, anatomy (15 regions ×
2 views), muscle record, workout end-to-end including restart mid-session,
progress and analytics, schedule and declared sleep, navigation and settings,
export and erase, empty states, language switching, anatomy regressions,
responsive/accessibility static analysis.

**Most important finding:** the anatomy was *technically* wired, but
**selection was a toggle**. Tapping a region that was already selected cleared
it instead of opening its record. On small touch regions users tap again when
the first tap seems not to register — which closed the record. That is the
behaviour reported as "clicking body parts does not reliably open the
corresponding detailed view".

---

## 2. Confirmed bugs

### Critical

**QA-001 — Tapping a region can clear the selection instead of opening the record**
| | |
|---|---|
| Screen | Today → Body |
| Repro | Body → select `chest` → go to Today → tap `chest` on the figure |
| Expected | Body opens with the chest record visible |
| Actual | `BODY_SEL` became `null`; the panel showed "Select a muscle group" |
| Root cause | `selectMuscle()` was `BODY_SEL = (BODY_SEL === m) ? null : m`. The binder called it before navigating, so an already-selected muscle was deselected on arrival |
| Fix | Selection is now always additive. `selectMuscle(m)` sets the value; `clearMuscle()` is a separate explicit action. Binder selects first, then navigates |
| Verified | `tools/_repro.js` case 1 → `BODY_SEL = chest`, panel "Chest"; locked in by `tests/ui.js` group 12 |

**QA-002 — Re-tapping the same region closed the record**
| | |
|---|---|
| Screen | Body |
| Repro | Body → tap `quads` → tap `quads` again |
| Expected | Record stays open |
| Actual | Record closed |
| Root cause | Same toggle |
| Fix | Always-select (QA-001) |
| Verified | `quads → quads`; regression test passes |

### High

**QA-003 — Overlays could intercept taps meant for the body**
| | |
|---|---|
| Repro | Static analysis: `.fig-controls` and `.fig-note` are absolutely positioned above the figure with `z-index:2` and no `pointer-events:none` |
| Expected | Only the buttons themselves capture taps |
| Actual | Their boxes sit over the upper-right (shoulder / lat / right arm) and lower-left (legs) of the figure |
| Root cause | Container elements did not opt out of hit testing |
| Fix | `.fig-controls{pointer-events:none}` + `.fig-btn{pointer-events:auto}`; `.fig-note{pointer-events:none; max-width:calc(100% - 60px)}` |

**QA-004 — Small regions were below a realistic touch size**
| | |
|---|---|
| Repro | Deltoid caps and forearms are ~18×44 units in a 200×470 viewBox — roughly 13×33 px on a phone |
| Expected | Reliable selection of every region |
| Actual | Hit area was the exact artwork path |
| Root cause | No enlarged hit target |
| Fix | A transparent `.seg-hit` layer is drawn above the artwork with a 14-unit stroke; the visible `.seg` paths are `pointer-events:none`. A `<title>` on each hit path names the muscle for assistive tech |

**QA-005 — Selecting a muscle absent from the current view gave no feedback**
| | |
|---|---|
| Repro | Body → Front → select `hamstrings` (back-only) from the list |
| Expected | The view switches so the muscle is visible |
| Actual | No region highlighted; zoom did nothing |
| Root cause | `Screens.body` rendered the current side regardless of the selection |
| Fix | `selectMuscle()` switches `BODY_SIDE` when the group is not on the current side; `rotateFig()` clears a selection that does not exist on the new side |

### Medium

**QA-006 — The front/back chip used the wrong state for its selected style**
`Back` was highlighted with `BODY_SEL === null` instead of `BODY_SIDE === 'back'`.
Fixed to `BODY_SIDE === 'back'`.

**QA-007 — Horizontal overflow was hidden, not fixed**
`body{overflow-x:hidden}` clipped content so any real overflow would be
invisible during testing. Removed; replaced with `overflow-wrap:break-word` and
`min-width:0` on flex/grid children (`.panel`, `.metric`, `.decision`,
`.factor`, `.mrow`, `.setcard`, `.exblock`).

**QA-008 — Touch targets below guidance**
| Control | Before | After |
|---|---|---|
| `.chip` | 38 px | **44 px** |
| `.chip.sm` | 30 px | **40 px** |
| `.btn.sm` | 34 px | **44 px** |
| `.fig-btn` | 34 px | **44 px** |

**QA-009 — The muscle record had no close action and no next step**
Added a `Close` button in the record header and three actions at the foot:
`Log a session`, `Zoom to this muscle`, `Full body view`.

### Low

**QA-010 — The selection ring could intercept a tap.** Added `pointer-events="none"`.

**QA-011 — The "Contribution" column was unexplained.** Added a table caption:
"Share of that exercise's work falling on this muscle group."

**QA-012 — No note when a muscle has no recorded work.** Added an explicit
missing-data note instead of empty tables.

**QA-013 — Header language chips were ~19 px tall** — too small to be the only
control. Added a full-size language selector (6 rows) in Profile; the header
chips remain as a shortcut.

**QA-014 — No affordance that the figure is tappable.** Added
"Tap a muscle group to open its record" beneath both figures.

---

## 3. Checked and found working (no action)

- No dead buttons: 15 `onclick` handlers across the five sections all resolve.
- No external links.
- Session draft survives a simulated restart with the corrected value intact.
- Editing a typed entry updates the model before validation.
- Rest timer starts on validation; the set is marked committed.
- Progress: empty state explains the situation; the fictional example is
  labelled and **removed once real data exists**.
- Declared sleep: daytime sleep for night workers accepted (6 h computed).
- A night shift alone does **not** force REST; reported illness **does**
  escalate the recommendation.
- Missing sleep is declared as missing, not guessed.
- Muscle record lists only exercises that actually target the selected muscle.
- Dates in the record all come from the workout log.
- Profile edits, limitations and exercise deselection persist and are honoured
  by the generator.
- Export, erase and restart all behave.

---

## 4. Changes implemented

| File | Change |
|---|---|
| `js/ui/screens.js` | Always-additive selection + `clearMuscle()`; auto side-switch; close button and record actions; contribution caption; no-data note; tap hint; front/back chip fix; accessible language selector in Profile |
| `js/ui/components.js` | Transparent `.seg-hit` hit layer with `<title>`; selection ring made inert |
| `js/app.js` | Binder targets the hit layer; selects then navigates |
| `css/app.css` | `.seg` inert / `.seg-hit` interactive; overlays non-blocking; touch targets raised; overflow fixed rather than masked; `min-width:0` guards; `.fig-hint` style; `.decision .top` wraps |

No engine file was modified. No data model changed.

---

## 5. Verification

| Suite | Result |
|---|---|
| `node tests/run.js` | **131 passed** (engine) |
| `node tests/design.js` | **61 passed** (design system) |
| `node tests/ui.js` | **110 passed** (was 98; +12 anatomy regressions) |
| `node tools/qa_audit.js` | **0 issues** (was 7) |
| `python3 tools/fig_check.py` | geometry valid — all regions inside silhouette, symmetric, no overlap |
| `node tools/smoke_dist.js` | shipped bundle boots, selects, logs, charts, saves |

New regression tests (`tests/ui.js` group 12) lock in: hit layer present and
complete, tap selects, re-tap keeps the record open, dashboard tap navigates
**and** selects, heading matches the tapped region, back-only muscle switches
view, rotating away clears, record offers close and "log a session", profile
exposes 6 language rows.

---

## 6. Browser verification update (2026-10-26) & remaining physical-device checks

### Now verified automatically in real Chromium + WebGL 2.0 (`node tests/browser.js`, 25 checks)

- **True horizontal overflow at 320 / 360 / 768 / 1280 px across LTR & Arabic RTL**:
  executed across 7 views × 4 widths × 2 directions (**56 layouts**). Found and fixed
  header `#langs` overflow (`457 px > 320 px`) and `.sect .aside` overflow (`717 px > 320 px`).
  All **56/56 layouts** now pass `documentElement.scrollWidth <= window.innerWidth`.
- **Visual & pixel verification of the 3D Anatomy Lab**:
  verified in real WebGL 2.0 (`gl.readPixels` + inspected screenshots): all 218 muscle
  meshes render non-empty pixels, Front vs Back produce distinct pixel hashes,
  selecting Chest paints burnt-orange pixels on the 3D mesh, hardware pointer click on
  the canvas selects the underlying anatomical structure (`Sternocostal pectoralis major`),
  unmapped structures (`Sternocleidomastoid`) open their anatomical card without fake
  group metrics, and leaving the Body screen disposes the WebGL context.
- **Service Worker & genuine offline reload**:
  verified `sw.js` pre-caches all 46 files and reloads 100% offline (`setOfflineMode(true)`)
  with all 218 3D muscles rendering; also verified standalone `dist/ancestor.html` /
  `release/ancestor.html` (1,938 KB, gzip-b64 payloads) offline with WebGL.
- **Chart legibility & tooltips**:
  verified at 320 px and 1280 px with interactive data-point tooltips and `.sr-only` summaries.

### Still genuinely requiring physical hardware

1. **Real assistive screen-reader output** (VoiceOver on iOS, TalkBack on Android, NVDA on Windows).
2. **Physical finger tap ergonomics & 60/120 Hz GPU thermal/frame feel** on a real smartphone screen (automated WebGL ran on SwiftShader software rasteriser).

---

## 7. Final status

**Verified across 901 automated checks (including real Chromium, WebGL 2.0, RTL viewports, and Service Worker offline), with only physical screen-reader audio and physical touch ergonomics remaining.**
