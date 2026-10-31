# ANCESTOR — Performance Lab

**Train when you're ready. Progress when you've earned it. Recover when you need it.**

A free, offline-first training app for natural trainees, shift workers and
anyone whose life does not run on a Monday-to-Friday clock.

---

## Identity

**Concept: Performance Lab.** Instrument panels, biomechanics, professional
measurement interfaces and high-end technical publishing. The default theme is
charcoal with warm ivory text; the original light paper theme remains available.
Burnt orange is reserved for primary action, selection and meaningful accent. Monospace carries every unit, id and annotation.

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

- front and back views with an animated 2D flip (the separate atlas rotates in 3D)
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
| **Today** | Training decision with reasons, availability estimate and a path to the next session |
| **Train** | Workout plan and live logging, with a local draft and rest timer |
| **Progress** | Charts, records and session log, plus Body and Science |
| **Library** | Searchable exercise atlas and exercise details |
| **Me** | Goals, equipment, preferences, declared sleep, export / import / erase, About |

Only one workout draft can be active. The plan can be viewed without replacing
it; finish or explicitly discard it before starting another. Substitutions keep
entered work on the original exercise. Finishing asks before omitting unfinished
or skipped entries or notes without a saved set. If a draft or final log write
fails, the app warns and offers a retry; an export contains the log, **not** an
active workout. A failed draft write can leave the stored draft older than what
is on screen, so keep the tab open until it is saved.

### Backups and recovery

Me → Data exports the profile and history from the current tab as JSON, including
unsaved changes, **not** the active workout draft. The browser reports that a download was initiated, not that the
file was actually saved: check it, and keep a separate copy. Import validates
basic record structure and schema version, asks before replacement, and writes
the replacement before adopting it. It refuses imports while a workout, an
unreadable record or unresolved unsaved data needs attention. Supported older
records are migrated; unrecognized exercise IDs and exercise fields are retained.

The primary record is in localStorage; an IndexedDB mirror is **best effort**,
on the same browser origin, and can be unavailable, evicted or lost with the
primary data. It is not a substitute for a separately saved export. If the
primary is missing and the mirror cannot be checked, mirror writes pause; retry
archives any older copy locally and attempts a download before mirroring the
current log. Unreadable records and drafts are held without automatic overwrite;
the warning offers a copy. Failed writes and divergent drafts/logs across tabs
are reported rather than knowingly replaced. Keep an unsaved workout tab open
and finish it when possible; exports do not contain it. Cross-tab checks are best-effort, not an
atomic compare-and-swap, synchronization service or automatic merge. Close other
tabs before importing or erasing, and do not depend on simultaneous edits.

Erase asks twice, removes known local records and attempts to clear the mirror.
A marker prevents an old mirror or an unsuccessfully removed draft from being
restored after erase. If a removal fails, a warning (persisted when storage
allows) directs you to close other tabs and clear site data in browser settings.
Downloaded files and other devices are not erased. Browser storage itself can be
cleared, denied, corrupted or evicted; no offline-only storage can guarantee data
durability.

Automatic plans and substitutions use the same equipment, environment,
limitation, position and exercise-selection filters. The full library stays
browseable: adding an exercise outside those choices requires an explicit
confirmation that lists the recorded reasons for the mismatch. If a saved plan or live draft conflicts with later changes, the
app flags the exercises and does not silently replace them or erase entered work.
When nothing matches, it shows an empty state and a route to settings rather than
inserting an arbitrary exercise. A stop recommendation is displayed in the
planner and live session, and new starts require acknowledgement; it is advice,
not a medical assessment or a lock on existing records.

The rest timer is saved with that draft: a running rest catches up to its original
deadline after reopening, while a paused rest keeps its remaining time. Alerts
are optional, enabled from the timer's information button or Me. They can only
fire when the page is running; a suspended or closed tab cannot guarantee an
on-time notification.

### Exercise movement guides

Each of the 88 exercises has its own equipment and position mapping, with
setup, movement, a specific form tip and controlled-return guidance in all seven
languages. Unilateral movements, assisted or weighted variants, seated options,
holds and continuous conditioning have their own treatments. The same guide is
used in exercise details and the Science mechanics explorer.

Original, faceless instructional mannequins show key positions; they are
schematic teaching aids, not recordings, and do not replace individualized
coaching. Repetition and continuous movements have an optional one-cycle
Play/Pause/Resume control. Holds show one position without a fake repetition.
With reduced motion, the static positions and all text remain available without
playback. The muscle illustration and its legend remain in a disclosure. The
training-texture hero photographs remain people-free. All guides work offline.

---

## Honest scope

**This is an installable Android PWA, not a published native Android app.**

There is no Android SDK or Gradle toolchain in this environment, so no signed
APK is produced here. What ships:

- `release/ancestor.html` — one 3.0 MB file, zero external references, works
  offline; rebuilt byte-identically from source by `python3 build.py` (`dist/` is the same file, git-ignored)
- A full PWA (manifest, service worker, icons) that installs from Chrome on
  Android → **Install app**
- `android/` — a ready TWA config plus the exact steps to a Play Store APK in
  about ten minutes via PWABuilder or Bubblewrap

See [`android/README.md`](android/README.md).

---

## Science Hub & transparency

ANCESTOR explains itself. **Science**, within Progress, teaches how the body adapts
and connects every explanation to the user's own records and to sourced evidence.

- **11 lessons** across 10 categories — muscle physiology, energy and fat
  metabolism, strength, biomechanics, cardiovascular health, sleep and recovery,
  nutrition, aging and accessibility, training principles, scientific literacy.
- All **42 lesson sections** have heading and body entries in each of the seven
  language dictionaries. Automated checks verify presence and sample rendering;
  they do not establish translation quality or scientific accuracy.
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
year and authors. Two records are internal notes, not published sources, and say so.
The app never estimates calories, body fat or muscle size. The translated text and
evidence interpretation still need independent language and subject-matter review.

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
- **International** — seven language dictionaries including Arabic RTL,
  locale-aware numbers and dates, metric/imperial conversion of stored loads,
  and measured key coverage. Presence of translations is not a substitute for
  native-speaker review or real-device RTL testing.

See [`PHASE1_REPORT.md`](PHASE1_REPORT.md) for exactly what is implemented, what
is verified, and what is not.

---

## Run it

```bash
# the shipped single file: one 3.0 MB document, zero external requests
xdg-open release/ancestor.html

# or the modular source, with the preview server
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run preview            # → http://0.0.0.0:8000
```

Use Node **22.17+ in the 22.x line, or 24+**. `npm ci` installs the exact
versions and integrity hashes recorded in `package-lock.json`; Puppeteer is a
development tool, not an application runtime dependency. The command above
skips Puppeteer's separate Chrome download. For browser tests, get the pinned
Chromium helper and its own locked dependencies from the npm registry:

```bash
source tools/chromium.sh   # installs into a temporary directory, not the repo
npm run test:browser
```

The pinned helper contains a Linux x86-64 browser. On other platforms, set
`PUPPETEER_EXECUTABLE_PATH` to a compatible locally installed Chromium/Chrome
instead; that browser is outside the locked release gate.

Setting `CR_PKG` deliberately tests another Chromium package; that custom
selection is not covered by the checked-in browser lock or release results.

Everything else is regenerated, never hand-edited:

```bash
python3 build.py                              # rebuild the single file → dist/ and release/
npm run vendor                                # rebuild js/vendor/three-bundle.js (build-time only)
python3 tools/notices.py                      # sync offline licence notices into index.html
node tools/compress_glb.mjs in.glb out.glb    # re-compress the anatomy model
```

One command is the whole gate — it builds, tests, audits and exits non-zero on
any failure:

```bash
npm run verify                             # ~3 minutes
```

Or a la carte, which is how the suites are named when one of them breaks:

```bash
npm test                           # headless suites, in order
npm run test:browser               # the one that needs a real Chrome (source tools/chromium.sh)

node tests/design.js               # 356 design system, states, targets, disclosures
node tests/premium.js              # 217 motion, dashboard, charts, states, boundaries
node tests/ui.js                   # 323 end-to-end DOM tests
node tests/run.js                  # engine / i18n tests
node tests/inclusive.js            #  70 migration / a11y / locale tests
node tests/personas.js             #  73 persona journey checks
node tests/science.js              # Science Hub / evidence / transparency tests
node tests/logic.js                # exercise-aware logging and workout-safety checks
node tests/anatomy.js              #  64 real 3D asset and selection tests
node tests/print.js                #  88 the A4 sheet
node tests/movement.js             # exercise mappings, guidance and localization checks
node tests/exercise_filters.js     # plan, substitution, empty-pool and preference regressions
node tests/release_integrity.js    # locks, offline notices, vendor payload and build budget
node tests/browser.js              # Chromium WebGL 2.0, viewport/RTL & SW offline tests
node tests/journey.js              #  39 navigation and disclosure checks in Chromium
node tests/workout_safety.js       #  60 workout, persistence and failure-path checks in Chromium
node tests/rest_timer.js           #  75 timer, alerts, interruption and layout checks in Chromium
node tests/movement_browser.js     # guide, playback, RTL, theme, layout and offline checks
node tests/exercise_filters_browser.js # preference, override, draft and warning journeys
node tests/release_integrity_browser.js # keyboard, localization and offline notices
node tests/keyboard_a11y_browser.js    # keyboard focus, modal, CSP and CSSOM regressions
node tests/data_durability_browser.js   # imports, failed writes, recovery, erase and cross-tab conflicts
npm run test:hero                  # conservative image-header contrast bound
npm run test:axe                   # automated axe scan; incompletes need human review
ANCESTOR_BROWSER=chromium npm run test:cross-browser # PWA + standalone; engine smoke journey
npm run audit:deps                 # networked audit of both committed lockfiles
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
| R3 | Advance the exercise's training variable when **every** set reaches the top of the range at target effort |
| R4 | Hold the load when an increase has not been earned and build toward the target |
| R5 | Step back when the latest result is below the target range; technique is not assessed |
| R6 | A missed or delayed session never earns an increase; a long gap prompts re-entry |
| R7 | Flag three flat sessions when no higher-priority rule applies; hold the relevant load, duration or distance |
| R8 | Two consecutive performance declines trigger a conservative adjustment |
| R9 | Progress is judged across weeks, not session to session |
| R10 | Every change is explained in the interface |

**Time alone never earns an increase.** The tests compare identical histories
2, 9 and 18 days later; a gap over 21 days instead triggers a re-entry adjustment.

The load-axis heuristic uses ~2.5% upper body / ~5% lower body steps, rounded to
available increments. Consecutive declines use a 10% reduction before rounding;
assisted work instead increases assistance. Three flat sessions can raise a
plateau flag and hold the relevant load, duration or distance when no earlier
rule applies. These rules still need
independent exercise and clinical review.

### Recovery — an estimate that admits it is one

The app **cannot** measure muscle recovery. It does not pretend to.

It computes a per-muscle window from: work performed, effort level, training
style, experience, your logged sleep, what you reported about soreness and
joints, and recent performance trend. Conservative defaults (2.5–3 days, not
the folklore "7 days for chest") adapt cautiously to your own log, bounded to
0.65×–1.50× and requiring evidence before moving.

Only **separately logged** recent sleep enters that calculation. The usual
sleep hours and variability asked during onboarding are saved and displayed but
currently do not affect recovery or the train/rest decision; without recent
sleep logs, sleep is reported as missing. The usual wake time is used to anchor
the training day. This mismatch needs a product decision before launch.

Every estimate breaks down into named factors with their multipliers. Tap any
muscle on the body map to see exactly which inputs produced the number.

### The refusal engine

Severity ladder: `train → light → caution → rest → stop`

- **Illness or severe joint pain → stop recommendation.** The classification is
  never downgraded by other signals. The app advises against training and asks
  before a new session starts; it does not diagnose or lock existing records.
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

- Data stays in browser `localStorage`, with a best-effort local IndexedDB mirror. Nothing is uploaded.
- No account, no email, no analytics, no advertising, no third-party requests
  (there is a test asserting zero external references in the HTML).
- Export saved data to JSON or erase local app data from Me → Data; active workouts are not included in exports. Check downloaded files and remove them separately when needed.
- Onboarding states all of this before collecting anything.

---

## Tests

The 2026-10-30 release gate passed **1,915 headless checks**, a scan of
1,916 translation keys in seven languages and 67 site checks. The complete
Chromium suite passed **359 checks**, including a 176-layout audit. The exercise
selection (54), workout safety (60), rest timer (73) and movement guide (38)
journeys each also passed against both the HTTP PWA and standalone file; the
selection and guide journeys include offline reloads. Separate Chromium
accessibility-tree and install audits passed
75 and 30 checks, respectively. One HTTP timer assertion missed its wall-clock
threshold by 8 ms while four browser suites ran concurrently; it passed 73/73
when rerun in isolation, without changing the test.

These checks cover design, UI, progression, recovery, preferences, drafts,
anatomy, print and offline packaging. They are not substitutes for physical
hardware, Safari, Firefox, assistive-technology or professional exercise review.
Run the commands above for current results.

### Dependency and distribution pass — 2026-10-31

Puppeteer was upgraded to 25.16.0 and the application tooling and Chromium
helper each received an npm lockfile. A fresh `npm ci` and a fresh helper
installation succeeded on Node 22.22.3/Linux x86-64. Both lockfiles returned
zero known npm advisories on that date. This is not a claim about future
advisories, the bundled runtime, the Chromium binary or legal compliance.

The offline app now carries the complete Three.js and meshoptimizer MIT
notices, the complete Barlow OFL and the anatomy attribution. They are readable
under Me → Data → Third-party licences in both distributions. The deterministic
gate checks those notices against their canonical files and regenerates the 3D
bundle to check its licensed source and banner.

For this pass the headless gate ran **1,942 checks**, translation keyscan
covered **1,917 keys in seven languages**, and the site gate passed **67 checks**.
Chromium ran **379 checks**, including 176 layouts and standalone 3D offline;
install and accessibility-tree audits passed **30** and **75** checks. The
notice, exercise-filter, safety, movement and timer journeys also passed against
both an HTTP PWA and the standalone file. These automated results do not replace
the independent reviews below.

### Keyboard and accessibility pass — 2026-10-31

Keyboard focus now follows the relevant control through screen rerenders and
moves to the next heading on keyboard page or onboarding changes. Choice
buttons expose their selected state; the skip target is focusable and the main
landmark is named in each of the seven languages. Sheets and the workout
completion dialog isolate the background, contain Tab and Shift+Tab, and close
with Escape. Opening a fresh sleep or symptom sheet resets its unsaved choices,
so a cancelled value cannot be saved behind a different visible selection.
If a sheet rerenders the background or replaces itself, its original opener is
rebound before focus is returned. Chart focus and hover, and exercise-group
disclosures, now use delegated events compatible with the existing content
security policy.

At that pass, the `npm run verify` gate passed **1,947 headless checks**, **1,918**
translation keys in seven languages and **67** site checks. The complete Chromium
suite passed **451 checks**, including 176 layouts. The **70-check** keyboard
suite also passed separately against the modular file, HTTP PWA and standalone
release; it exercises a saved workout, cancelled and saved choices, modal focus,
Chrome's accessibility tree, both themes, RTL, reduced motion, offline reload
and CSP violations across reloads. A modular run with normal motion also passed.
The separate install and accessibility-tree audits passed **30** and **75**
checks. Workout safety, movement, filtering, notices and the isolated rest timer
also passed against both HTTP and the standalone build. The timer suite checks
that an entering toast never covers its controls, including with normal motion.

The standalone build keeps legal CSS comments but compacts other isolated
comments to stay under its 3 MiB limit. The keyboard suite compares the original
and packaged stylesheets using Chromium's CSS parser. These automated checks do
**not** establish WCAG conformance or replace testing with actual screen readers,
other browsers, physical devices or independent accessibility specialists.

Run the keyboard suite on another local distribution or with normal motion using:

```bash
ANCESTOR_TEST_TARGET=http://127.0.0.1:8000/ node tests/keyboard_a11y_browser.js
ANCESTOR_TEST_TARGET=release/ancestor.html node tests/keyboard_a11y_browser.js
ANCESTOR_TEST_MOTION=normal node tests/keyboard_a11y_browser.js
```

### Data durability and recovery pass — 2026-10-31

The audit reproduced destructive invalid and future-version imports, an archive
failure that overwrote unreadable bytes, a valid-JSON `null` record treated as
empty, and an IndexedDB recovery race over unsaved work. It also reproduced
cross-tab draft replacement, an empty legacy vault that could not mirror later
writes, a false “Saved” message, and an unchecked older mirror being replaced.
The guarded flows and their failure messages are exercised by a real-Chromium
suite, including the actual file picker and replacement/erase confirmations.

The release gate passed **1,947 headless checks**, **1,946 translation keys** in
seven languages and **67 site checks**. The complete Chromium suite passed
**546 checks**, including 176 layouts. The new durability suite passed **95**
checks on the modular and standalone builds and **96** over HTTP, including an
offline recovery check. Workout safety, movement, filtering, licence notices,
keyboard and rest-timer suites also passed on HTTP and standalone; install and
accessibility-tree audits passed **30** and **75** checks. A simulated v44 → v45
service-worker update retained a saved record and its healthy v1 mirror, waited
for the user's reload, and worked offline (**8/8** checks).

The deterministic standalone release is **3,145,123 bytes** (605 bytes below
3 MiB). These are automated Chromium results, not a guarantee against eviction,
concurrent writes or device failure; keep separate backups and see the remaining
independent reviews below.

```bash
npm run test:durability
ANCESTOR_TEST_TARGET=http://127.0.0.1:8000/ npm run test:durability
ANCESTOR_TEST_TARGET=release/ancestor.html npm run test:durability
```

### Automated launch-review pass — 2026-10-31

This pass repaired the 3D toolbar, several contrast and accessible-name defects,
metric-help disclosure, a contradictory symptom warning, the held plateau target
for timed/distance exercises, an inaccurate source summary and two evidence
links. The usual-sleep onboarding answers remain unused by the recovery model;
see the recovery section above and the review handoff before changing them.

The current build passed **1,981 headless checks**, a scan of **1,946
dictionary keys** across seven languages and **67 site checks**. `npm run test:browser`
passed **733 Chromium checks**, including 176 layouts and an axe scan. A separate
Playwright Chromium journey passed **72 checks** on the HTTP PWA and actual
standalone file; a v45 → v46 update/offline probe passed **8/8**. Chromium was
headless Linux, not a physical device. Firefox and WebKit were not available;
`tools/ci/browser-engines.yml` is an **inactive** GitHub Actions template because
the connected GitHub app lacked Workflows permission to install it.

Axe reported zero violations across **144 states** each on HTTP and standalone,
but marked **1,138 / 1,123 contrast-node occurrences** and **112 / 112
label-name occurrences** incomplete in the latest HTTP / standalone runs. They require human review; incomplete is
not a pass. The six header scrims passed a separate conservative mathematical
contrast bound, which does not settle the other incomplete findings. npm audits
returned zero known advisories for both locks on this date; that is not a
security or legal sign-off.

See [LAUNCH_REVIEW.md](LAUNCH_REVIEW.md) for exact coverage, known limitations,
review checklists and the empty sign-off record. No independent professional,
real-device, real screen-reader, Firefox or Safari review has been completed;
**do not treat this as public-launch approval**.

### Launch-readiness audit — remaining work

The October 2026 audit reproduced and fixed preference bypasses in substitute
pickers, manual additions and empty pools, corrected several metadata/instruction
contradictions, and added failed-lift setup guidance for barbell presses and
squats. The filters express recorded preferences; their tags are incomplete and
cannot determine whether any exercise is safe for an individual.

Before a public launch, still arrange:

- A qualified strength coach's review of every guide, prescription, equipment
  setup, alternative and accessibility adaptation; clinical input for the
  limitation and symptom language. This audit is **not** that review.
- Real-device testing on Android and iOS, Safari and Firefox, actual screen
  readers and keyboard/touch workflows, including offline updates and recovery.
- Native-speaker review of all seven languages and RTL, and independent review
  of the science explanations and linked evidence.
- Independent release, security and legal review, including the CC BY-SA
  implications and distribution rights of every asset. On 2026-10-30 a
  temporary npm resolution reported 10 high-severity advisories in Puppeteer's
  development chain. On 2026-10-31 Puppeteer was upgraded and separate locks for
  the application tooling and the Chromium helper were committed; `npm run
  audit:deps` reported **zero known npm advisories** for both locks at that time.
  This is a time-specific registry result, not a security guarantee, and does
  not audit the browser binary, vendored runtime, assets or licensing terms.

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
js/i18n/                    seven-language interface, exercise cues and movement guides
js/data/exercises.js        exercise data: muscle weights, equipment, RIR and contraindications
js/data/ex_meta.js          adaptive, timed and conditioning exercise extensions (88 total)
js/core/time.js             local-time shifts, sleep, biological day
js/core/store.js            versioned persistence, export/import/erase
js/engine/progression.js    double progression          ← no AI
js/engine/recovery.js       per-muscle estimate          ← no AI
js/engine/readiness.js      the refusal engine           ← no AI
js/engine/program.js        plan generation, substitutions
js/ui/components.js         anatomy, charts, tables, states, timeline
js/ui/movement.js           exercise-specific instructional positions and playback
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

## Known limitations

- **The 3D atlas needs WebGL.** Where it cannot mount, the app says so in a
  strip that stays until a model loads and offers a retry, and falls back to the
  flat figure projected from the same mesh — the same data, without the model.
- **Not tested on a physical phone or tablet.** The browser suite is headless
  Chromium at seven widths; expect small fixes on real hardware, and nothing at
  all has been checked on iOS Safari.
- **Movement figures are schematic, not video or individualized form advice.**
  Equipment setup and comfortable range vary between people and machines.
- **The flat figure is derived from a CC BY-SA 4.0 mesh**, so it carries that
  licence. See [LICENSE](../LICENSE).
- No sync between devices; one browser profile only.
- Recovery defaults converge only after several weeks of logged sessions.
- The flat figure's front/back transition is a scale-based 2D flip; only the
  separate 3D atlas rotates a mesh.
- Usual sleep hours and variability from onboarding are stored but not used by
  the recovery estimate; only separately logged sleep is used.

---

## Licence

Proprietary, all rights reserved — see **[../LICENSE](../LICENSE)**: read it and
run it, do not copy, modify, redistribute or reuse it outside this repository
without written permission. Third-party material retains its own terms:
Barlow Condensed (SIL OFL 1.1), the anatomy model and its derived figure
(CC BY-SA 4.0), and Three.js and meshoptimizer (MIT). Their notices are
embedded in the app under **Me → Data → Third-party licences**, including in
the offline standalone file. Source copies and attribution are in `fonts/`
and `assets/`. These notices do not replace legal review.

## Free to use, and it stays that way

Program generation, logging, progression, recovery estimates, scheduling,
history, analytics and the training decision are all free and always will be.
No ads, no paywall, no account. That is a promise about the product, not about
the source code, which is proprietary.
