# ANCESTOR — Launch-Day Product Rescue & Studio Overhaul Report

Date: 2026-10-27 · Version: 4.3.0 (Schema v3) · Build: `dist/ancestor.html` & `release/ancestor.html` (2,082 KB, 39 scripts + CSS + 3D GLB self-contained)

---

## 1. Most Important Product & Design Problems Discovered (Visual + Functional Audit)

Inspecting every screen rendered in real Chromium (1280 px desktop & 320–360 px mobile, LTR & RTL) exposed why the application previously felt unfinished despite passing unit tests:

1. **No Workout Split Browser or Plan Editor**: `Screens.session` only showed the single `nextSession` and offered zero ability to inspect the other days of a split (`Day 1 Push`, `Day 2 Pull`, `Day 3 Legs`), adjust prescribed sets or rest, reorder/remove/add exercises, or launch an ad-hoc custom workout.
2. **No Exercise Library**: All 84 exercises were only reachable as an unsearchable wall of tiny toggle chips buried at the bottom of Profile Settings, with no search, muscle filter, equipment filter, or logging-mode filter.
3. **No Mid-Workout Exercise Addition or Live HUD**: Active sessions had 240 px-tall stacked set boxes with excessive vertical scrolling, no sticky workout clock/progress HUD, and no way to append an exercise during training.
4. **Onboarding Step 2 Premature Advance Bug**: Clicking an experience tile (`setP('experience','b');onbNext()`) immediately skipped Step 2 before a human user could choose their primary goal below it; Steps 3, 4, and 9 lacked `Back` buttons; Step 8 (`ex`) rendered raw internal keys (`pushH`, `pullV`, `hinge`).
5. **Visual Contradictions & Template Repetition**:
   - Rounded `100px` stadium `.chip` pills clashed with `3px` architectural `.panel` / `.btn` geometry across every screen.
   - `Screens.session` printed `"First time — establish a baseline"` twice on consecutive lines for every unlogged exercise.
   - `Screens.body` displayed `"2D INTERACTIVE ANATOMY... NOT A 3D MODEL"` right above the real 218-muscle 3D WebGL model.
   - `Screens.profile` rendered `"PROFILE"` twice at the top of a single 1,000 px-wide 9-panel form column, displayed an uncollapsed 84-chip black brick wall, and left a stale `"NOT A 3D MODEL"` footer without crediting the 3D atlas.
   - `Screens.science` placed empty `☐` form checkboxes next to reading lessons, lacked `<marker>` arrowheads on Module A/B SVG flow diagrams, and offered only 2 interactive modules.
   - `Screens.home` rounded unrecovered ratios (`0.98–0.996`) UP to `100%` alongside `MODIFY` + `0 d remaining` + `"{name} IS READY"`, broke `MODIFY` mid-word (`MODI / FY`) on 375 px phones, and cropped the Dashboard Muscle Map below the collarbones.
   - `formatSet()` printed `+0 kg · 10 reps` on unweighted bodyweight pull-ups, `lineChart()` clipped right-edge X-axis labels (`25 Oct`), and `openExerciseDetail()` had zero visual anatomy/movement illustrations.

---

## 2. Design System & Screen-by-Screen Studio Overhaul

- **Performance Lab v4 Visual Architecture (`css/app.css`)**:
  - Replaced `100px` stadium pills with crisp `3px` Swiss Lab selector blocks (`border-radius: var(--r-sm)`), reserving solid burnt orange (`#D66A3A`) for primary CTAs, progress rings/bars, and 3D muscle selection, while active filters/selectors use high-contrast charcoal (`#20211F`, 14.5:1 AAA ivory text) with a `3px` burnt-orange index bar.
  - Introduced numbered domain mastheads (`01 // TODAY` through `06 // EVIDENCE & PHYSIOLOGY`) and underlined architectural sub-navigation bars (`.subnav`).
- **Dashboard (`Screens.home`)**: Rebuilt into an asymmetric **2-Column Studio Bento Dossier** (`1.35fr / 1fr` on desktop) pairing the Readiness Verdict + **embedded Next Session Blueprint** + Progress Sparkline + Muscle Coverage Matrix on the left with the Weekly Progress Ring + 7-Day Adherence Track + Contextual Lab Insight + Bio-Timeline + Anatomy/Science Launchpad on the right.
- **Session Planner, Active Workout & Exercise Atlas (`js/ui/workout.js`)**:
  - **Workout Plan**: Split-day cards (`Day 1..N`) with muscle recovery %, exercise count, duration, `"Recommended"` badge, inline **Edit Workout** mode (`−/+` sets stepper, `↑/↓` reorder, swap, remove, rest-preset selector, `+ Add exercise`), and **Custom Session** launcher.
  - **Active Workout**: Sticky charcoal **Live Session HUD** (`MM:SS` live clock, sets progress bar, live tonnage, `+ Add Exercise` mid-workout, `Discard`) + compact tabular `setcard-grid` rows.
  - **84-Exercise Atlas Library**: Dedicated searchable explorer filtering all 84 movements by Muscle Group (12), Equipment (6), and Logging Mode (`Load, Bodyweight, Weighted, Assisted, Timed, Distance`), displaying proportional muscle-contribution bars, PR badges, pool toggles, and 1-tap add to Plan or Active Session.
- **3D Anatomy Lab (`Screens.body`, `js/ui/anatomy3d.js`)**: Truthful 3D Atlas masthead in WebGL mode, unified `3D/2D + Front/Back` toolbar above the stage, structured `Layer + Region` filter deck, neutral sculpted limestone musculature (`#9B9284`) with burnt-orange selection (`#D66A3A`) and hover readout, persistent WebGL canvas across `render()`, and 1-click link into the Exercise Atlas pre-filtered by muscle.
- **Science Hub (`Screens.science`)**: Numbered `01..11` Lesson Dossier grid (removing `☐` checkboxes), animated lesson-completion ring, interactive Muscle Growth & Energy Balance modules, and verified citation cards.
- **Profile (`Screens.profile`) & Onboarding (`Screens.onb`)**: 2-column studio configuration layout unifying `environment` and `equipment`; centered `680px` Onboarding Calibration Frame with fixed Step 2 selection, `Back` buttons on every step, and translated movement-pattern headings.

---

## 3. Files Created & Modified

- **New**: `js/ui/workout.js` (Split Planner, Plan Editor, Live HUD, 84-Exercise Atlas), `tests/browser.js` (real Chromium + WebGL 2.0 + SW offline + 64-viewport LTR/RTL suite), `LAUNCH_REPORT.md`.
- **Modified**: `css/app.css`, `js/ui/screens.js`, `js/ui/components.js`, `js/ui/motion.js`, `js/ui/anatomy3d.js`, `js/ui/science.js`, `js/ui/modules.js`, `js/data/modules.js`, `js/app.js`, `js/i18n/modes.js`, `js/i18n/locale.js`, `tools/vendor_three.js`, `tools/keyscan.js`, `build.py`, `sw.js`, `index.html`, `package.json`, `tests/premium.js`, `README.md`, `tools/BUG_REPORT.md`.

---

## 4. Verification & Executed Test Results

Every suite below was executed in this workspace:

| Suite / Tool | Checks | Result |
|---|---:|---|
| `node tests/run.js` | 142 | PASS |
| `node tests/design.js` | 61 | PASS |
| `node tests/ui.js` | 110 | PASS |
| `node tests/inclusive.js` | 65 | PASS |
| `node tests/personas.js` | 66 | PASS |
| `node tests/science.js` | 121 | PASS |
| `node tests/logic.js` | 117 | PASS |
| `node tests/premium.js` | 170 | PASS |
| `node tests/anatomy.js` | 64 | PASS |
| `node tests/browser.js` (Chromium + WebGL 2.0 + 96 Viewports + AXTree + IDB + SW Offline) | 28 | PASS |
| **Total Automated Checks** | **944** | **944 / 944 PASS** |
| `node tools/keyscan.js` (1,574 keys × 7 langs, 820/820 core = 100%) | — | 0 leaks |
| `node tools/qa_audit.js` | 13 journeys | 0 issues |
| `node tools/smoke_dist.js` | offline bundle | BUNDLE OK |
| `python3 tools/fig_check.py` | 2D geometry | 0 warnings |

---

## 5. Remaining Limitations & Honest Launch-Readiness Assessment

1. **Physical Assistive Tech & Smartphone Hardware**: Layout (`320–1280 px`, LTR & RTL), Chromium Accessibility Tree (`Accessibility.getFullAXTree`: 0 nameless interactive controls), WebGL 2.0 rendering, raycast picking, IndexedDB automatic fail-safe recovery, and Service Worker offline reload are verified in real Chromium (`tests/browser.js`), while spoken prosody on physical VoiceOver (iOS) / TalkBack (Android) and 60/120 Hz thermal/touch feel on phone glass still warrant a brief physical handset smoke check.
2. **Scope Boundaries Kept Intentional**: ANCESTOR remains 100% local-first (`localStorage` + `navigator.storage.persist()` + automatic `IndexedDB` mirror + JSON export/import with 30-day backup reminder) with zero cloud account/sync, tracks optional dated bodyweight weigh-in trends (`state.bodyweights[]`) without calorie-diary food logging, ships 5 distance/conditioning exercises (`farmer-carry`, `sled-push`, `row-erg`, `bike-erg`, `run-interval`) without GPS route tracking, supports optional Left/Right (`L / R`) unilateral set logging, and uses a male-derived Z-Anatomy/BodyParts3D mesh (CC BY-SA 4.0, unreviewed for clinical use — explicitly disclosed in UI).

**Launch Readiness Verdict**: **Ready for v1 public launch as a free, local-first, offline-capable PWA** (`index.html` + `sw.js` or standalone `release/ancestor.html` at `2,082 KB`), subject only to a 10-minute physical phone smoke check of VoiceOver/TalkBack and thumb comfort.
