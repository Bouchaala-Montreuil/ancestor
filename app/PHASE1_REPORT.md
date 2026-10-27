# ANCESTOR — Universal Platform Transformation, Phase 1

Date: 2026-10-26 · Build: `dist/ancestor.html` (474 KB, 20 modules, zero external references)

---

## 1. What was inspected

Architecture: no framework, no runtime dependencies. Plain ES5/ES2015 + CSS custom
properties, one `localStorage` key, service-worker caching, a single-file build.

Baseline before this pass: 302 tests green (131 engine · 61 design · 110 UI), 0 QA
issues, 59 exercises, 6 languages at 100 % coverage, schema v1.

What did **not** exist: any accessibility metadata on exercises, any Arabic/RTL
support, any multi-goal model, any environment model, any accessibility
preferences, keyboard operation of the anatomy, dialog focus management,
locale-aware formatting.

---

## 2. Existing features preserved (nothing removed)

- All four engines untouched: progression, recovery, refusal, programme generation
  (extended, not rewritten).
- All 59 original exercises kept their muscle weights, rep ranges, RIR and
  substitution chains.
- Interactive 2D anatomy with the validated geometry, hit layer, zoom, rotation.
- Performance Lab, session persistence and draft recovery, export/erase.
- Performance Lab identity: ivory-dominant palette, burnt-orange accent, technical
  typography, mobile-first layout.
- All 302 pre-existing tests still pass.

---

## 3. New features actually implemented

### Profile model — schema v2 (additive)
`js/core/profile.js`, migration in `js/core/store.js`

- **Multi-goal** selection (hypertrophy, strength, recomp, general, endurance,
  mobility, balance, functional, consistency) — several at once.
- **Training environment**: gym / home / outdoors / minimal kit.
- **Training needs** — nine optional, self-reported flags: seated-only,
  wheelchair-compatible, low-impact, cannot stand, cannot kneel, cannot get on the
  floor, limited grip, limited overhead reach, limited balance. **No diagnosis
  required**, all optional, all revisable.
- **Display preferences**: text size (100 / 115 / 130 %), high contrast, reduced
  motion (auto / on), simplified interface.

Migration is additive and idempotent: v1 `goal` is mirrored into `goals[]` rather
than replaced, so old code paths keep working. Verified with a genuine v1 payload —
sessions, sleep, shifts, feelings and learned adaptation all survive.

### Exercise accessibility model
`js/data/ex_meta.js`

Every one of the now **75** exercises carries `pos` (positions), `req` (movement
capabilities assumed), `cat` (non-exclusive categories) and `acc` (adaptation
flags). 16 new exercises added to the **same** library, not a separate one — so
filters, progression and the anatomy treat them identically:

seated band row · seated band chest press · wall push-up · sit-to-stand · seated
leg extension · seated marching · band pull-apart · band curl · band pressdown ·
dead bug · bird dog · cat-cow · heel slide · overhead reach · single-leg balance ·
seated torso rotation

**Safety framing:** an `acc` flag never means "safe for every disabled person".
The disclaimer is present in all seven languages and shown on the settings screen.

### Adaptive training engine
`js/engine/program.js`

- Candidate pool filtered by equipment **and** environment **and** accessibility
  needs.
- Goal-driven rep ranges, with a documented priority:
  strength > endurance > mobility/balance, otherwise the exercise's own range is
  respected.
- Selection scored by goal and adaptation fit (a preference, never an exclusion).
- If accessibility filtering empties the pool, the plan reports it (`a11y.poolEmpty`)
  instead of silently ignoring the user's needs.
- Exclusions are explainable — `exclusionReason()` returns a translatable reason
  for every filtered exercise.

### Internationalisation
`js/i18n/ar.js`, `js/i18n/v2.js`, `js/i18n/locale.js`

- **Arabic added with full RTL support** (`dir`, `data-rtl`, CSS mirroring).
- Locale-aware numbers and dates via `Intl` (`1.234,5` vs `1,234.5`), BCP-47 tags.
- Pluralisation delegated to `Intl.PluralRules` — Arabic's six forms are not guessed.
- Unit conversion: switching kg ↔ lb **converts stored loads** so numbers stay
  truthful rather than merely relabelled.
- **Coverage is measured, not assumed.** `coverage()` counts real translated core
  keys; `langStatus()` returns `full` or `partial`. Arabic is **93 %** and is
  reported as **partial** in-product. A test asserts no language ever leaks a raw
  key into the interface (455 core keys × 7 languages).

### Accessibility
`index.html`, `css/app.css`, `js/app.js`, `js/ui/screens.js`, `js/ui/components.js`

- Skip link, `role="main"`, labelled navigation, `aria-live` status region.
- Anatomy regions are focusable buttons with name + state; **Enter/Space** works
  (the handler no longer depends on `SVGElement.click()`, which is not portable).
- Dialogs: `role="dialog"`, `aria-modal`, focus trap, Escape to close, focus
  restored on close.
- Figure has a text alternative; charts are always accompanied by data tables.
- Touch targets raised: chips 38→44 px, chips.sm 30→40, btn.sm 34→44, fig-btn 34→44.
- `overflow-x:hidden` removed (it masked overflow) and replaced with
  `overflow-wrap` + `min-width:0` guards.
- Full settings UI for every display preference.

---

## 4. Files changed

| File | Change |
|---|---|
| `js/core/profile.js` | **new** — v2 schema, migration, goals/environment/needs/display helpers |
| `js/data/ex_meta.js` | **new** — accessibility metadata + 16 new exercises |
| `js/i18n/ar.js` | **new** — Arabic, 93 % core coverage |
| `js/i18n/acc.js` | **new** — names/cues for new exercises × 7 languages |
| `js/i18n/v2.js` | **new** — v2 UI strings × 7 languages |
| `js/i18n/locale.js` | **new** — RTL, Intl formatting, pluralisation, coverage |
| `js/core/store.js` | schema v1→v2, additive migration |
| `js/engine/program.js` | adaptive pool, goal bias, goal rep ranges, adaptation note |
| `js/ui/screens.js` | dialog a11y, goals/environment/needs/display settings |
| `js/ui/components.js` | focusable anatomy regions, figure text alternative |
| `js/app.js` | preferences applied each render, keyboard activation |
| `css/app.css` | text scale, contrast, reduced motion, simplified mode, RTL, skip link |
| `index.html` | skip link, landmarks, live region, new modules |
| `tests/run.js`, `tests/ui.js` | updated for band equipment + 7 languages |
| `tests/inclusive.js`, `tests/personas.js` | **new** — 131 checks |
| `build.py`, `sw.js` | new modules registered |

**Database changes:** schema v1 → v2, purely additive. No field renamed, removed
or retyped. Migration is idempotent and tested against a real v1 payload.

---

## 5. Tests executed — real results

| Suite | Result |
|---|---|
| `node tests/run.js` | **134 passed** |
| `node tests/design.js` | **61 passed** |
| `node tests/ui.js` | **110 passed** |
| `node tests/inclusive.js` | **65 passed** |
| `node tests/personas.js` | **66 passed** |
| `node tools/qa_audit.js` | **0 issues** |
| `python3 tools/fig_check.py` | geometry valid |
| `node tools/smoke_dist.js` | bundle boots, selects, logs, charts, saves |

**Total: 436 automated checks, all green.**

### Ten persona journeys — all implemented as tests

1. Beginner at home, minimal equipment — no bars/machines prescribed, RIR ≥ 2 ✅
2. Experienced lifter, hypertrophy — compounds + HIT low volume ✅
3. **Wheelchair user** — every prescribed exercise wheelchair-compatible ✅
4. **Older adult, functional strength** — low-impact only, no kneeling/floor ✅
5. **Limited mobility** — no standing, no kneeling, low effort ✅
6. **Night-shift worker** — daytime sleep accepted (6 h), midnight shift handled ✅
7. **Screen-reader user** — landmarks, focusable regions, Enter selects, modal semantics ✅
8. **Arabic / RTL** — `dir=rtl`, Arabic renders, selection works, coverage reported ✅
9. **Offline** — logging, persistence, restart, no duplicates ✅
10. **Legacy user** — v1 data intact, progression still works off old history ✅

Translation coverage (measured): en/fr/es/de/it/nl **100 %** · ar **93 % (partial)**.

---

## 6. Bugs found and fixed in this pass

1. **`equipmentFor('home')` allowed machines**, contradicting long-standing tested
   behaviour. Corrected to dumbbells / bodyweight / bands.
2. **Arabic was missing `nav.home`** — the key the router actually uses (I had
   translated `nav.today`, which nothing calls). The Home tab stayed English.
3. **`SVGElement.click()` is not portable** — keyboard activation of anatomy relied
   on it and silently failed. Refactored to call the handler directly.
4. Two persona expectations were wrong (they asserted hypertrophy ranges while
   selecting a strength goal; they asserted no kneeling when the user had not
   declared that need). Both corrected.
5. Three engine tests hard-coded equipment lists predating the `band` type.

---

## 7. Known limitations and unresolved work

**Not verified here (recorded in test output, not silently passed):**

- **Real screen-reader behaviour** — NVDA / VoiceOver / TalkBack. Structure only.
- **Visual RTL layout** — mirroring, clipping, chart direction. jsdom has no layout engine.
- **Visual rendering of the anatomy figure** — geometry is validated numerically;
  proportions and aesthetics are unconfirmed.
- **Touch accuracy on a physical device** — especially deltoids and forearms.
- **Service worker / true offline** — does not run under jsdom.

**Not implemented (needs infrastructure that does not exist):**

- **Cloud sync.** There is no backend. Everything works offline *because* it is
  local — the UI must never claim data is backed up to a cloud.
- **Wearable / device integration** (Health Connect, Apple Health). No authorised
  data source.
- **Video, animation, captions, audio guidance.** No media assets exist. Written
  instructions and captions preference are in place; media is not.
- **AI assistant.** The brief says *if* one exists. None does. The recommendation
  engine is deterministic and explains itself; no redundant subsystem was added.
- **Authentication / multi-user.** Single local profile by design.
- **Clinical review of adaptations.** Flags are self-reported and adapting; the app
  states that specialist judgement is required where relevant.

**Deliberately partial:**

- **Arabic at 93 %** — reported as partial in-product. Reaching 100 % requires
  translating the remaining 34 core keys plus exercise instructions for the
  original 59 exercises (currently English-fallback for those).

---

## 8. Next highest-priority tasks

1. **Manual verification on a real device** — the six checks in `tools/BUG_REPORT.md` §6
   plus RTL mirroring. Nothing here substitutes for that.
2. **Close the Arabic gap** to 100 % (34 core keys + 59 exercise name/cue pairs).
3. **Weekly volume by muscle with direct/indirect split** — `volumeByMuscle()` exists;
   it needs to distinguish direct from indirect contribution and surface
   gap/excess flags for review (as the brief asks, flagged, not asserted).
4. **Simplified interface pass** — the toggle works; content density still needs a
   review pass per screen.
5. **Deload planning UI** — the engine detects stagnation; there is no user-facing
   deload planner yet.
6. **Session structures** — supersets and warm-up/working-set separation are not yet
   first-class in the session UI.

---

## Final status

**Phase 1 complete and tested. The overall transformation is NOT complete.**

Priorities 1–3 of the brief (protect the foundation, build shared foundations,
implement adaptive functionality) are done and covered by 436 automated tests.
Priority 4 (integrate the existing experience) is largely done — the anatomy,
Performance Lab and workout tracking all work with the new model.
Priority 5 (accessibility and international quality) is **partially done**: the
structure, controls and Arabic/RTL plumbing are built and tested, but real
screen-reader, visual-RTL and device verification cannot be performed here.

Classified as **partially verified, with known issues** — for the reasons in §7,
not out of caution theatre.
