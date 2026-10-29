# ANCESTOR — Performance Lab

**Train when you're ready. Progress when you've earned it. Recover when you need it.**

A free, offline-first training app for natural trainees, shift workers and
anyone whose life does not run on a Monday-to-Friday clock.

---

## Identity

**Concept: Performance Lab.** Instrument panels, biomechanics, professional
measurement interfaces, high-end technical publishing. Ivory dominates; charcoal
structures; burnt orange is reserved for primary action, selection and
meaningful accent. Monospace carries every unit, id and annotation.

| Token | Value |
|---|---|
| Charcoal | `#20211F` |
| Ivory (page) | `#F1EBDD` |
| Burnt orange | `#D66A3A` |
| Technical grey | `#77796F` |
| Separator | `#C8C0B2` |

Typography: condensed display headings, large tabular performance numerals,
monospace metadata. No web fonts, no icon font, no emoji.

### Anatomy — a real mesh, and a flat figure projected from it

The brief asked for interactive 3D anatomy, and **this build ships it**: a real
muscle atlas (221 meshes, 218 named muscles, 904 KB meshopt-compressed GLB,
CC BY-SA 4.0) rendered by a tree-shaken three.js bundle, offline, in the
single file. `BODY_MODE` defaults to `model`.

The earlier revision of this README said a suitably licensed mesh was
unavailable and that the build shipped 2D instead. That was true when it was
written; the licence research in `ANATOMY_MODEL_RESEARCH.md` found Z-Anatomy /
BodyParts3D, and the mesh has shipped since. Corrected 2026-10-29.

The flat figure is **not drawn** — it is projected out of that same mesh.
`tools/figure-project.html` renders each of the 26 muscle groups to its own
depth buffer from front and back, traces the occlusion boundary with marching
squares, simplifies it with Douglas-Peucker, and writes
`tools/figure-projected.json`; `tools/build-figure.js` compiles that into the
`/* <figure-geometry> */` block in `js/ui/components.js`. `npm run figure`
regenerates it, and `--check` fails the build if the two drift apart. Both the
projection and the block are Adapted Material and carry the same CC BY-SA 4.0
terms — see `assets/ANATOMY-ATTRIBUTION.txt`.

What the figure mode gives you, all genuinely interactive:

- front and back views with a real rotation transition
- tap-to-select on 15 muscle regions
- zoom-to-selection (animated `viewBox`)
- reset to full view
- per-muscle record: last recorded work, contributing exercises, recent sets,
  trend, recovery estimate **with every factor and multiplier listed**, and an
  explicit statement of what is missing

The figure geometry is validated numerically by `tools/fig_check.py`: every
region sits inside the body silhouette, left/right pairs are mirror-symmetric,
and no two regions overlap beyond tolerance.

---

## Five sections

| Section | Contents |
|---|---|
| **Today** | Training decision (TRAIN / MODIFY / REST) with reasons, availability estimate, anatomy, performance metrics, 7-day timeline |
| **Session** | Fast live logging: one action per set, large touch targets, rest timer, draft survives interruption |
| **Body** | Interactive anatomy and the per-muscle record |
| **Progress** | Overview metrics, load and estimated-1RM charts, volume by muscle group, session log, personal records |
| **Profile** | Goal, equipment, limitations, style, units, planning, declared sleep, export / import / erase, About |

---

## Honest scope

**This is an installable Android PWA, not a published native Android app.**

There is no Android SDK or Gradle toolchain in this environment, so no signed
APK is produced here. What ships:

- `release/ancestor.html` — one 2.55 MB file, zero external references, works
  offline; rebuilt byte-identically from source by `python3 build.py` (`dist/` is the same file, git-ignored)
- A full PWA (manifest, service worker, icons) that installs from Chrome on
  Android → **Install app**
- `android/` — a ready TWA config plus the exact steps to a Play Store APK in
  about ten minutes via PWABuilder or Bubblewrap

See [`android/README.md`](android/README.md).

---

## Science Hub & transparency

ANCESTOR explains itself. A sixth section, **Science**, teaches how the body adapts
and connects every explanation to the user's own records and to sourced evidence.

- **11 lessons** across 10 categories — muscle physiology, energy and fat
  metabolism, strength, biomechanics, cardiovascular health, sleep and recovery,
  nutrition, aging and accessibility, training principles, scientific literacy.
- **Lesson bodies fully localised in English and French**; the other five languages
  get titles, summaries, takeaways, myths and quizzes with bodies falling back to
  English, and the page says so.
- **Weekly volume split into direct and indirect** muscle involvement, with
  out-of-range counts raised as *review prompts* — never as targets or diagnoses.
- **Five interactive explorers** — muscle growth, energy/fat metabolism, movement
  mechanics (from the real exercise library), adaptation timeline, and a labelled
  illustrative simulation.
- **"Why this?"** on every recommendation — the recommendation, your goal, your
  history, the data actually used, the reasoning, the sourced principle, assumptions,
  missing information, confidence, alternatives, and accept / reject.
- **Three kinds of statement never blurred** — observation (logged), algorithm
  (computed), principle (sourced).
- **Structured evidence library** with a real review gate: only reviewed records of
  usable quality may affect a user-facing rule, and recency alone never qualifies.
- **13 versioned rules** with a complete changelog, linked both ways to evidence.

Honest limits are part of the product, and they are measured rather than asserted:
**All 12 published sources verified against two independent registries** — NCBI PubMed
and Crossref — on 2026-10-26, with DOI and PMID matching in both. The process caught
three citation errors: a wrong DOI, a wrong title, and a record with the wrong journal,
year and authors. Two records are internal notes, not published sources, and say so. Lesson bodies are English-only, Arabic is 93 % and labelled
partial, and the app never estimates calories, body fat or muscle size.

See [`PHASE_SCIENCE_REPORT.md`](PHASE_SCIENCE_REPORT.md) and
[`EVIDENCE_VERIFICATION.md`](EVIDENCE_VERIFICATION.md).

---

## Inclusive, adaptive, international

ANCESTOR adapts to the person rather than forcing one training model on everyone.

- **Multi-goal** — hypertrophy, strength, recomp, general fitness, endurance,
  mobility, balance, functional strength, consistency. Several at once.
- **Environment-aware** — gym, home, outdoors, minimal kit.
- **Optional training needs** — seated-only, wheelchair-compatible, low-impact,
  cannot stand / kneel / get on the floor, limited grip, limited overhead reach,
  limited balance. Self-reported, no diagnosis required, revisable at any time.
  An accessibility flag never means "safe for every disabled person" — the app
  states this explicitly in every language.
- **Accessibility built in** — adjustable text size, high contrast, reduced motion,
  simplified interface, keyboard-operable anatomy, focus-managed dialogs, skip
  link, landmarks, `aria-live` status, ≥40 px touch targets, charts with tables.
- **International** — 7 languages including **Arabic with full RTL**, locale-aware
  numbers and dates, metric/imperial with real conversion of stored loads, and a
  **measured** translation-coverage system. Arabic is 93 % and is reported as
  *partial* in-product rather than claimed as complete.

See [`PHASE1_REPORT.md`](PHASE1_REPORT.md) for exactly what is implemented, what
is verified, and what is not.

---

## Run it

```bash
# the shipped single file: one 2.55 MB document, zero external requests
xdg-open release/ancestor.html

# or the modular source, with the preview server
npm install
npm run preview            # → http://0.0.0.0:8000
```

`npm install` pulls a Chrome for the browser suite, which fails on a network that
blocks Google's CDN. If that is your network:

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install
source tools/chromium.sh   # Chromium from the npm registry instead
```

Everything else is regenerated, never hand-edited:

```bash
python3 build.py                              # rebuild the single file → dist/ and release/
node tools/vendor_three.js                    # rebuild js/vendor/three-bundle.js (build-time only)
node tools/compress_glb.mjs in.glb out.glb    # re-compress the anatomy model
```

One command is the whole gate — it builds, tests, audits and exits non-zero on
any failure:

```bash
npm run verify                             # ~3 minutes
```

Or a la carte, which is how the suites are named when one of them breaks:

```bash
npm test                           # the ten headless suites, in order
npm run test:browser               # the one that needs a real Chrome (source tools/chromium.sh)

node tests/design.js               # 279 design system, states, targets, disclosures
node tests/premium.js              # 217 motion, dashboard, charts, states, boundaries
node tests/ui.js                   # 322 end-to-end DOM tests
node tests/run.js                  # 146 engine / i18n tests
node tests/inclusive.js            #  70 migration / a11y / locale tests
node tests/personas.js             #  73 persona journey checks
node tests/science.js              # 130 Science Hub / evidence / transparency tests
node tests/logic.js                # 138 exercise-aware logging regression tests
node tests/anatomy.js              #  64 real 3D asset and selection tests
node tests/print.js                #  88 the A4 sheet
node tests/browser.js              #  93 real Chromium WebGL 2.0, viewport/RTL & SW offline tests
node tools/pwa_audit.js            #  30 manifest, icons, installability, shortcuts
node tools/ax_audit.js             #  75 Chrome's accessibility tree
node tools/qa_audit.js             # scripted user-journey audit
node tools/smoke_dist.js           # shipped-bundle smoke test
node tools/keyscan.js              # no i18n key ever reaches the screen verbatim
node tools/gallery.js ../design/current   # photograph every screen for a designer
```

Three documents worth reading before changing anything:
**[ARCHITECTURE.md](ARCHITECTURE.md)** — how the software is put together and every
risk that was found (S1–S24); **[LOGIC_AUDIT.md](LOGIC_AUDIT.md)** — what was
illogical in the earlier build and why; and **[../HANDOFF.md](../HANDOFF.md)** —
the design state, what is missing, and what the tests will defend.

The Anatomy Lab renders a **real anatomical model**: 218 named muscle meshes,
128,917 triangles, CC BY-SA 4.0. Candidates, licences and the reasons for the
selection are in **[ANATOMY_MODEL_RESEARCH.md](ANATOMY_MODEL_RESEARCH.md)**.

---

## The engine

### Progression — ten explicit, testable rules

| # | Rule |
|---|---|
| R1 | Establish a baseline on first exposure |
| R2 | Build repetitions within the target range |
| R3 | Increase load only when **every** set reaches the top of the range at target effort |
| R4 | Hold the load when the increase has not been earned |
| R5 | Reduce when performance or technique deteriorates |
| R6 | A missed or delayed session never triggers an increase |
| R7 | Repeated stagnation is flagged, not punished with more weight |
| R8 | A deload is recommended only after stagnation **plus** fatigue evidence |
| R9 | Progress is judged across weeks, not session to session |
| R10 | Every change is explained in the interface |

**Time is never an input to the load.** Three states with identical history 2,
9 and 18 days later produce byte-identical recommendations — this is an
automated test, not a claim.

Increase sizes: ~2.5 % upper body, ~5 % lower body, rounded to real plates
(2.5 kg / 2 kg dumbbell / 5 lb). Two consecutive declines trigger a 10 %
deload. Three flat sessions raise a plateau flag and hold the load.

### Recovery — an estimate that admits it is one

The app **cannot** measure muscle recovery. It does not pretend to.

It computes a per-muscle window from: work performed, effort level, training
style, experience, your logged sleep, what you reported about soreness and
joints, and recent performance trend. Conservative defaults (2.5–3 days, not
the folklore "7 days for chest") adapt cautiously to your own log, bounded to
0.65×–1.50× and requiring evidence before moving.

Every estimate breaks down into named factors with their multipliers. Tap any
muscle on the body map to see exactly which inputs produced the number.

### The refusal engine

Severity ladder: `train → light → caution → rest → stop`

- **Illness or severe joint pain → stop.** Hard, non-negotiable, with referral language.
- A muscle under 0.70 readiness can never be reported as "train".
- **A shift is not an automatic ban.** Finishing a shift 3 hours ago downgrades
  the recommendation; it does not forbid training. Being mid-shift is surfaced
  as the most relevant fact, not hidden.
- Poor sleep prompts caution, never a claim that a muscle is unrecovered.
- Missing information is declared as uncertainty rather than guessed.

---

## Shift & sleep handling

- Shifts crossing midnight are first-class (`19:00 → 07:00` = 12.0 h, tested)
- Local wall-clock parsing throughout — never `toISOString` for display or input
- **The biological day is not the calendar day.** Anchored on your wake time:
  at 02:00 you are living the previous day.
- Sleep-start variability is tracked separately from duration
- Sleep-window intrusion is detected whether you are approaching the window or
  already inside it

The app never claims to know cortisol, growth hormone or testosterone. There is
a test asserting those words do not appear in the engine source.

---

## Training modes

Four styles — **low volume / high intensity** (Heavy Duty inspired),
**standard**, **minimum effective**, and **higher frequency** — plus automatic
adjustment for experience and goal.

The low-volume mode is offered, never imposed. The onboarding says plainly that
no style is universally optimal, and the About screen states that users should
not compare their expected progress with physiques or volume claims that may
involve unknown genetics, circumstances or drug use.

Beginners are never taken near failure (RIR ≥ 2) and get fewer sets. Heavy
compounds keep 2 reps in reserve in every style. No anabolic steroids,
hormones or PEDs are recommended anywhere — also asserted by a test.

---

## Privacy

- Everything stored in `localStorage` on the device. Nothing uploaded.
- No account, no email, no analytics, no advertising, no third-party requests
  (there is a test asserting zero external references in the HTML).
- Full **export to JSON** and **erase everything**, both from You → Your data.
- Onboarding states all of this before collecting anything.

---

## Tests

```
node tests/design.js   →  210 passed   palette, contrast on washes, states, 44px targets, disclosures
node tests/premium.js  →  213 passed   motion, dashboard, charts, the state matrix, boundaries
node tests/ui.js       →  230 passed   onboarding, logging, anatomy, charts, restart, disclosure
node tests/run.js      →  142 passed   progression, recovery, shifts, persistence, honesty, i18n
node tests/inclusive.js→   65 passed   v1→v3 migration, a11y model, filtering, units, locale
node tests/personas.js →   66 passed   the ten inclusive user journeys
node tests/science.js  →  124 passed   Science Hub, evidence gate, why-panel
node tests/logic.js    →  117 passed   exercise-aware logging, planned vs actual, records
node tests/anatomy.js  →   64 passed   real glTF asset, mapping, raycast picking
node tests/print.js    →   44 passed   the A4 sheet, measured
node tests/browser.js  →   25 passed   real Chromium WebGL 2.0 pixels, 64 LTR/RTL viewports, SW offline
```

**919 automated checks, all executed and green** (plus 0 issues from
`tools/qa_audit.js`, 0 translation leaks across 1,503 keys × 7 languages from
`tools/keyscan.js`, and a 1,981 KB self-contained offline bundle in
`dist/ancestor.html` and `release/ancestor.html`).

All were actually executed.

| Area | Tests |
|---|---|
| Progression (ten rules, plate rounding, calendar-independence) | 30 |
| Recovery (modifiers, bounds, adaptation, honesty) | 12 |
| Shifts, sleep, timezones, biological day | 18 |
| Program generation (equipment, limitations, style, substitutions) | 24 |
| Refusal engine (rest, stop, no blanket shift ban, uncertainty) | 14 |
| Persistence, export, import, migration, erase | 12 |
| Safety & scientific-honesty guards | 7 |
| i18n completeness (7 languages × 755 core keys + 84 exercises) | 14 |
| **Design system** (palette exactness, WCAG AA contrast, no glass/emoji/gradients, responsive rail, component states) | **61** |
| **End-to-end DOM** (12 journey groups) | **98** |

### Bugs the tests caught in this redesign

1. **"Validate set" validated the next empty set**, so pressing it after typing did nothing. Sets are now explicitly committed.
2. **`--tech-ink` and `--nodata` failed WCAG AA** on ivory (4.46:1 and 2.94:1). Both darkened; now 5.0:1 and 3.5:1.
3. **The `Screens` registry was missing**, so the app threw `Screens is not defined` on boot.
4. **The progress screen showed a labelled example without first stating that there was no data.** The empty state now comes first.

### Bugs caught in the earlier build

5. The lower-back limitation silently did nothing (key mismatch).
6. Bodyweight-only users could not train 8 of 12 muscle groups (11 exercises added).
7. Sleep-window detection missed the "already asleep" case.
8. Being mid-shift was invisible to the decision engine.
9. The beginner RIR guard ran before the goal adjustment.
10. The decision screen showed zero evidence on a fresh install.

---

## Design system

`css/app.css` is a token-first system: colours, type, spacing, radii, motion,
then components. Every component declares the states the brief asked for —
normal, hover, active, selected, disabled, loading, error — where relevant.

Prohibited patterns are tested against, not merely avoided: no
`backdrop-filter`, no radial gradients, gradients only for the technical grid
and the loading shimmer, no emoji illustration, no decorative gauges, sharp
radii (2/3/4/6 px), `prefers-reduced-motion` honoured, `:focus-visible`
defined, touch targets ≥ 44 px.

Contrast is verified programmatically for every text pair:

| Pair | Ratio |
|---|---|
| Charcoal on ivory | 14.6:1 |
| Technical metadata on ivory | 5.0:1 |
| Burnt-orange text on ivory | 4.9:1 |
| Charcoal label on burnt orange button | 4.6:1 |
| Ivory on charcoal | 13.6:1 |

**Colour is never the only signal.** Every status flag carries a translated
label, every muscle row shows its state as text, the legend pairs swatches with
words, and figure regions carry `<title>` for assistive technology.

---

## Architecture

```
index.html
css/app.css                 design system (tokens → components)
js/i18n/                    core · ui (470 keys × 6) · exercises (59 × 6) · screens
js/data/exercises.js        59 exercises: muscle weights, equipment, RIR, contraindications, cues
js/core/time.js             local-time shifts, sleep, biological day
js/core/store.js            versioned persistence, export/import/erase
js/engine/progression.js    double progression          ← no AI
js/engine/recovery.js       per-muscle estimate          ← no AI
js/engine/readiness.js      the refusal engine           ← no AI
js/engine/program.js        plan generation, substitutions
js/ui/components.js         anatomy, charts, tables, states, timeline
js/ui/screens.js            today · session · body · progress · profile · onboarding
js/app.js                   router, boot, debug surface (window.ANC)
tools/fig_check.py          numeric validation of the anatomy geometry
tests/                      run.js · design.js · ui.js
android/                    TWA config + packaging guide
build.py                    → dist/ancestor.html
```

**Rule: no generative model ever performs arithmetic.** Every number in the
interface comes from deterministic, tested code.

---

## Recovery, shifts and honesty

- Shifts crossing midnight are first-class (`19:00 → 07:00` = 12.0 h, tested)
- Local wall-clock parsing throughout — never `toISOString` for display or input
- **The biological day is not the calendar day**, anchored on your wake time
- Sleep-start variability is tracked separately from duration
- Daytime sleep for night workers is supported and tested

The app never claims to know cortisol, growth hormone or testosterone — there
is a test asserting those words do not appear in the engine source. Recovery
windows are labelled estimates throughout; when data is missing the screen says
"Insufficient data" rather than inventing a number.

---

## Privacy

Everything lives in `localStorage` on the device. No account, no email, no
analytics, no advertising, no third-party requests — a test asserts zero
external references in the shipped HTML. Full JSON export and complete erasure
are both in Profile → Your data, and both are tested.

---

## Known limitations

- **Anatomy is 2D**, not 3D. Disclosed in-app. See above for the reasoning.
- **Not tested on real Android hardware** — jsdom only. Expect small layout
  fixes on a physical phone.
- No sync between devices; one browser profile only.
- Recovery defaults converge only after several weeks of logged sessions.
- Timed holds (planks, hangs) are approximated in seconds rather than modelled
  as a separate type.
- The rotation transition is a scale-based 2D flip, not a true mesh rotation.

---

## Free, and it stays free

Program generation, logging, progression, recovery estimates, scheduling,
history, analytics and the training decision are all free and always will be.
No ads, no paywall, no account.
