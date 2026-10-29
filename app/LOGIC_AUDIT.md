# ANCESTOR — global logic audit & repair

Date: 2026-10-26 · Schema v3 · 84 exercises · 7 languages · 682 automated checks

Every defect below was **reproduced in the running app first** (`tools/audit_logic.js`),
then fixed, then pinned with a regression test. Nothing here is a proposal.

---

## 1. What was actually broken

### A. The logging model assumed every exercise is `load × reps`

`js/ui/screens.js` rendered one hard-coded pair of inputs (Load, Reps) for every
set of every exercise, and `logSet()` refused to commit a set unless
`w !== ''`.

Consequences, measured:

| Symptom | Measured before |
|---|---|
| A push-up could not be saved | filling 14 reps and pressing Validate produced `committed:false`, toast *"Enter a load and a rep count for at least one set."*, and **0 sessions saved** |
| A dead hang was programmed for 20–60 **repetitions** | `EX_BY_ID['dead-hang'].reps = [20,60]` |
| A single-leg balance hold was programmed for 4–10 **repetitions** | `reps = [4,10]` |
| Bodyweight volume was 0 kg | `sessionTotalVolume()` → `0`, `muscleVolume().chest.load` → `0`, `lastTrainedByMuscle().chest.contrib` → `0` |
| Bodyweight progress was invisible | `sessionSeries()` filtered on `+best.w > 0` → **0 chart points** after any number of sessions |
| Bodyweight personal bests were meaningless | `personalBest('pushup').score = 0`, table showed `0 kg × 12` |
| There was no duration input anywhere | 0 of 84 exercises declared a time, distance or assistance metric |

**Cause.** No data model for "what a set of this exercise consists of". The
screen decided, and the screen only knew one shape.

### B. Assistance and added load were indistinguishable

There was no assisted or weighted-bodyweight exercise in the library, and both
would have been stored in the same `w` field. An assisted pull-up with 20 kg of
counterweight would have been recorded as *lifting* 20 kg.

### C. The first-ever session was reported as a personal record

`isPersonalBest()` returned `true` when the exercise had no previous history, so
finishing a first session listed **every** exercise under "New records".

Measured: `isPersonalBest('bb-bench', [{w:40,r:8}])` → `true` on the first log.

**Cause.** "Nothing to beat" was treated as "beat everything".

### D. A load reduction could land back on the load it was reducing from

`reduce` and `deload` multiplied by 0.925 / 0.90 and then rounded to **nearest**
real increment. At small loads that rounds straight back up.

Measured: `ohp` at 2.5 kg with 3 reps (below the 5-rep floor) →
`{kind:'reduce', load:2.5}` — the app told a struggling user to repeat exactly
the weight that was too heavy. There was no exit from that state.

### E. The trend metric compared a bench press against a squat

`overallTrend()` took each session's single best e1RM across **every** exercise
in it. With a push/pull/legs split that alternates by construction, so the
"trend" oscillated with the rotation.

Also: bodyweight-only training produced `overallTrend() === 'unknown'` forever,
because the score required `best > 0`.

### F. The onboarding goal question was stored and then ignored

`profile.goal` (a v1 string) and `profile.goals` (a v2 array) both exist. The
onboarding and profile screens wrote `goal`; every engine decision
(`activeGoals`, `setsFor`, `goalRepBias`) reads `goals`.

Measured: onboarding with `goal:'s'` → `goals:['h']` → hypertrophy plan
(6–10 reps) instead of a strength plan. **The answer had no effect on anything.**
The profile screen's 4-chip goal selector also rendered raw keys
(`goal.h`, `goal.s`, …) because those keys were never defined.

### G. Internal keys were shown as user-facing labels

- Exercise group headings rendered `esc(pat)` → the user saw `pushH`, `pullV`, `core`…
- Equipment chips rendered `esc(ex.equip)` → `barbell`, `cable`…
- The 4-chip goal selector rendered `goal.h`…
- Profile chip mappings were wrong for 3 of 11 options: `onb.shift.none` /
  `onb.shift.rotating` (real keys `onb.shift.no` / `onb.shift.rot`),
  `onb.equip.minimal` (real key `onb.equip.min`),
  `onb.limits.lowerback` (real key `onb.limits.lowback`).
- `you.profile` and `you.units` had no translation outside Arabic.
- The multi-goal panel used `goal.h…goal.c`, which only existed in Arabic.

### H. Planned values could be saved as results

`startSession()` created empty set rows, so a user who opened a session, did
nothing and pressed Finish would have had nothing recorded — but conversely the
app had **no notion of "planned" vs "actual"** at all: there was no previous
result on the row, no target prefill, and no state label. Progress had to be
reconstructed from memory or by opening another screen.

### I. Two other calculation errors

- `estimatedMinutes()` did `reps[1] * 8` seconds per set. With `dead-hang` at
  `[20,60]` that is 480 s for one "set" of hanging.
- The print card hard-coded **three** set columns regardless of the programme.

---

## 2. What was changed

### New: `js/data/ex_logging.js` — the exercise-aware logging model

One definition of "what a set of this exercise is". Six modes:

| Mode | Measured in | Required | Optional | Progression axis |
|---|---|---|---|---|
| `load` | external load + reps | load, reps | RIR | load |
| `weighted` | bodyweight + **added** load | reps | added load, RIR | load |
| `bodyweight` | reps | reps | added load, RIR | reps, then added load |
| `assisted` | reps at **reduced** bodyweight | reps | assistance, RIR | assistance (less is progress) |
| `timed` | seconds | duration | added load, RIR | time, then load |
| `distance` | metres (+ time) | distance | time, RIR | distance |

Three kinds of load, never conflated:

- **external** — the weight on the bar. Volume = load × reps.
- **added** — weight *added* to the body. `"+10 kg"` means +10 kg.
- **assist** — weight *removed* from the body. Stored in `a`, never in `w`,
  never added to any volume, PR or load figure.

`setMetrics()` returns `null` — not `0` — when a quantity does not exist, and
carries a `basis` field (`e1rm | reps | assist | time | timeLoad | distance`)
that the UI displays so the number is never ambiguous.

**Total system load is only computed when the user has actually recorded a
bodyweight.** Otherwise the app reports repetitions and says why. It never
guesses a bodyweight and never silently adds one.

### New exercises that the old model could not express

`plank`, `side-plank`, `hollow-hold`, `wall-sit` (timed) ·
`assisted-pullup`, `assisted-dip` (assisted) ·
`weighted-pullup`, `weighted-dip` (weighted bodyweight) ·
`farmer-carry` (distance).
`dead-hang` and `balance-stand` were re-typed from reps to timed holds.

Library: 75 → **84 exercises**.

### Schema v3 (`js/core/store.js`)

A v2 set `{w, r, rir}` is migrated additively to
`{w, r, t, d, a, rir, skipped, committed, warmup}`, with missing metric fields
written as `null` — the same shape new records use. `startedAt` is backfilled on
old sessions. Existing numbers are never rewritten.

### Rebuilt session screen (`js/ui/screens.js`)

Each set row now shows:

- **Set n / m**, and an explicit state flag: `Planned` · `Logged` · `Warm-up` · `Skipped`
- **Previous**: the last comparable result for that exercise (`60 kg · 8 reps — 22 Oct`),
  or *"First time with this exercise"*. Never a placeholder number.
- **Only the fields the exercise has** — Load / Added load / Assistance / Reps /
  Duration / Distance, with optional fields marked *optional*.
- The **target in the exercise's own unit**: `6–10 reps`, `Hold 20–60 s`, `Carry 20–60 m`.
- **Per-row actions**: Log set (or **Correct** on a logged row), Warm-up toggle,
  Remove, plus Add a set / Skip set / Substitute at exercise level.
- A live `n of m logged` progress bar before Finish.

Rules enforced by code, not by hiding fields:

- A row is only saved if it is **complete for its mode** *and* the user has
  touched or confirmed it. An untouched planned row is never written as a result.
- Editing a logged value reopens it (`committed = false`) — the correction is
  explicit and visible, not silent.
- Warm-up sets are logged for reference and excluded from working sets, volume,
  records and progression.
- `finishSession()` refuses a duplicate: it stamps `startedAt`, clears the draft
  before navigating, and rejects a session with an identical start time.

### Mode-aware progression (`js/engine/progression.js`)

- `recommend()` branches on the exercise's axis. A plank progresses by seconds,
  an assisted pull-up by *reducing* assistance, a carry by distance, a press by
  load. The double-progression rule (R3) now applies to the axis that exists.
- Reduction **floors** to the next real plate (`roundLoadDown`) and guarantees
  movement by at least one increment. 2.5 kg → 0 kg rather than 2.5 kg → 2.5 kg.
- `recordKind()` returns `baseline | pr | none`. A first exposure is a baseline.
  The PR table only lists exercises with at least two exposures.
- Warm-ups never count towards the "every set reached the top of the range" test.

### Honest trend (`js/engine/recovery.js`)

`overallTrend()` now computes a trend **per exercise** (`exerciseTrend()`) and
combines the results. Cross-exercise comparison is gone. Exercises with fewer
than two data points contribute nothing instead of contributing noise.

### Mode-aware accounting (`js/engine/program.js`, `js/core/store.js`)

- `muscleVolume()` counts **weighted sets** and reports load volume only where a
  real load exists, exposing `counted` / `uncounted` so the UI can say
  "holds and carries have no load volume" rather than printing a smaller number.
- `lastTrainedByMuscle()` uses a weighted set count instead of a load-volume
  proxy — bodyweight work now registers as training.
- `estimatedMinutes()` uses the mode's own duration model.
- Goal rep bias is only applied where the range is measured in repetitions; the
  effort (RIR) part of the bias still applies to every unit.

### New: history editor (`openSessionEditor`)

Any recorded set can be corrected or deleted from the Progress screen. Every
change goes through `updateSet()` / `deleteSet()` / `pruneEmptySessions()`,
which save once and leave no cached figure behind — volume, records, trends and
progression all recompute on the next read.

### Questions removed or repaired

- The inert 4-chip goal selector on the Profile screen is **gone** (one goal
  control remains, and it works).
- `setP('goal', …)` now mirrors into `goals` (`profileSet()`); `goal` is a
  mirror, never the source of truth. The onboarding answer now reaches the plan.
- Raw internal keys replaced with translated labels: `pat.*` (11), `equip.*` (6),
  plus the corrected chip mappings listed in §1G.
- Optional **bodyweight** field added to the profile. It is only ever used to
  report total system load on bodyweight movements; leaving it empty is a valid,
  supported answer and the app says what it is doing instead.

---

## 3. Files changed

| File | Change |
|---|---|
| `js/data/ex_logging.js` | **new** — modes, field specs, `setMetrics`, `isSetComplete`, `missingFields`, `recordKind`, `previousPerformance`, `exTargetRange`, units |
| `js/i18n/modes.js` | **new** — 7-language strings for the logging model, patterns, equipment, goals |
| `js/i18n/ex_modes.js` | **new** — names and cues for the 9 new exercises × 7 languages |
| `js/data/exercises.js` | 9 new exercises; `hold` / `dist` target ranges; `dead-hang` and `balance-stand` re-typed |
| `js/data/ex_meta.js` | metadata for the new exercises; `balance-stand` re-typed |
| `js/core/store.js` | schema v3, `migrateSet`/`migrateSession`, `updateSet`, `deleteSet`, `pruneEmptySessions`, mode-aware `exerciseHistory` and `lastTrainedByMuscle` |
| `js/core/profile.js` | `profileSet()` (goal ⇄ goals mirror), optional `bodyweight` |
| `js/engine/progression.js` | mode-aware `recommend`, `advance`/`reduceBy`/`holdAndBuild`, `roundLoadDown`, `recordKindFor`, warm-up exclusion |
| `js/engine/recovery.js` | `exerciseTrend`, per-exercise `overallTrend`, `workingSets`, mode-aware `sessionScore` |
| `js/engine/program.js` | `muscleVolume` (counted/uncounted), `volumePartiallyUnknown`, `setSecondsEstimate`, bias only on rep ranges, single source of truth for goals |
| `js/engine/why.js` | target and history phrased in the exercise's own unit |
| `js/ui/screens.js` | rebuilt session screen, history editor, mode-aware progress/home/body tables and charts, corrected key mappings |
| `js/ui/components.js` | print card: dynamic set columns, targets in the exercise's unit |
| `js/ui/science.js` | personal history block in the exercise's own unit |
| `js/i18n/locale.js` | `log.`, `hist.`, `pat.`, `equip.` added to the measured core prefixes |
| `js/i18n/ui.js`, `ar.js`, `science.js` | corrected/removed dead keys, added `why.prog.whatGeneric`, `why.data.rangeOther` |
| `css/app.css` | set-row header, actions, previous line, session progress, editor rows |
| `index.html`, `sw.js`, `build.py` | two new modules registered; SW cache bumped to v3 |

---

## 4. Tests

### New suite: `tests/logic.js` — 117 checks

1. A barbell exercise displays weight and repetitions.
2. An unweighted bodyweight exercise does not require external load.
3. A weighted bodyweight exercise distinguishes added load from assistance.
4. A timed exercise accepts duration without requiring repetitions.
5. An exercise with no history does not show fabricated previous results.
6. An incomplete set is not counted as completed.
7. Editing a historical set recalculates affected statistics correctly.
8. Missing values do not become zero silently.
9. A recommendation does not overwrite actual performance.
10. A completed workout cannot accidentally be duplicated.
11. Switching exercises updates the fields and the validation.
12. Existing user data remain intact after the change.

Plus: **13** full journey (open a planned session → log barbell, hold and
bodyweight sets → correct a value → add/remove a set → finish → review →
edit history), **14** progression rules across every mode, **15** questions
asked once are not asked again and they work.

### New tool: `tools/keyscan.js`

Renders 6 screens × 7 languages with real data and fails if any i18n key
reaches the screen verbatim. **1271 keys, 0 leaks.**

### Results

| Suite | Checks | Result |
|---|---:|---|
| `tests/run.js` | 142 | ✅ |
| `tests/design.js` | 61 | ✅ |
| `tests/ui.js` | 110 | ✅ |
| `tests/inclusive.js` | 65 | ✅ |
| `tests/personas.js` | 66 | ✅ |
| `tests/science.js` | 121 | ✅ |
| `tests/logic.js` | 117 | ✅ |
| **total** | **682** | **all green** |
| `tools/qa_audit.js` | 13 journeys | 0 issues |
| `tools/smoke_dist.js` | bundle | BUNDLE OK |
| `tools/keyscan.js` | 1271 keys × 7 langs | 0 leaks |
| `tools/fig_check.py` | anatomy geometry | no overlap, no symmetry warnings |
| `python3 build.py` | `dist/ancestor.html` | 837 KB, 33 scripts, self-contained |

Language coverage: **506 core keys, 7/7 languages at 100%** (was 425 keys).

---

## 5. Remaining limitations — stated, not hidden

1. **No device testing.** Screen readers (NVDA/VoiceOver/TalkBack), visual RTL
   layout, real touch accuracy and service-worker offline behaviour cannot be
   verified in jsdom. The six manual checks in `tools/BUG_REPORT.md` §6 remain
   open.
2. **Distance work is one exercise.** `farmer-carry` is the only
   distance-measured movement. Cardio (running, cycling, rowing) is not modelled;
   pace is derived from distance ÷ time and is not prescribed.
3. **No bar weight.** A barbell's empty-bar mass is not modelled, so "0 kg" on a
   barbell exercise is reported literally.
4. **RIR remains self-reported and optional.** When absent, effort is inferred
   from repetitions and the app says so in the "why" panel.
5. **Evidence library unchanged.** No citation was added or altered by this
   audit; the 12 verified records still need a publisher check before formal
   citation.
6. **Unilateral logging is one number per set.** `per side` is displayed, but
   the app does not store separate left/right values.
7. **Bodyweight is a single current value**, not a history, so historical total
   system load uses the bodyweight recorded *now*. It is labelled as an
   approximation for that reason.
