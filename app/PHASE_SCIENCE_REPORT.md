# ANCESTOR — Science Hub & Transparent Recommendations

Phase report · 2026-10-26 · Build `dist/ancestor.html` (625 KB, 26 modules, self-contained)

---

## 1. Integration points found in the audit

| Integration | Where |
|---|---|
| Primary navigation | five items → **six**, `Science` added (`js/app.js` NAV) |
| Anatomy | muscle record now links related lessons and a "Why this?" panel |
| Session | every planned exercise exposes "Why this?" for its load |
| Today | decision panel exposes "Why this?" beside detailed analysis |
| Progress | lessons link into it; volume lesson renders the user's own table |
| Storage | `state.science` added additively to schema v2, never destructive |
| Design system | no new palette or type tokens; existing panels, tiles, flags, banners reused |

Nothing was rebuilt. No existing engine, data model or component was replaced.

---

## 2. Science Hub — implemented

**Sixth nav item** with three sections:

**Lessons** — 10 categories, 11 lessons (bodies fully localised in all seven languages):
muscle growth · energy and fat metabolism · strength/power/endurance · movement
mechanics · cardiovascular health · sleep and recovery · nutrition · aging, mobility
and accessibility · training principles · scientific literacy · misconceptions.

Each lesson page contains: introduction, 3–5 sections, **key takeaways**,
**myth vs evidence** with verdict and explanation, a **knowledge check** with
explained answers, **linked evidence records**, links into ANCESTOR features, and a
personal-data block when the lesson supports it.

**Explorers** — five, all working:
1. **Muscle Growth Explorer** — four-step sequence, explicitly labelled as a
   teaching model with a warning that real mechanisms are multiple and unresolved.
2. **Energy and Fat Explorer** — energy balance, the 7,700 kcal rule as a rough
   approximation that drifts, fuel mix vs fat loss, and an **explicit refusal of
   spot reduction**.
3. **Movement Mechanics Lab** — driven by the real exercise library; shows primary
   and secondary muscle involvement and the exercise cue.
4. **Adaptation Timeline** — neural → morphological → plateau → long-term, with a
   statement that no result is promised by any date.
5. **Interactive Simulation** — sets × frequency → weekly count, labelled
   illustrative, with assumptions and limits stated.

**Evidence** — every record rendered with full metadata.

**Achievements** — five, all earned through reading and exploring, never through
workout intensity, appearance or volume.

---

## 3. "Why ANCESTOR recommends this" — implemented

`js/engine/why.js` produces a structured explanation for every recommendation,
exposed through a **"Why this?"** control on Today, on every planned exercise, and
on every muscle record.

Each panel shows:

- The recommendation itself
- Your selected **goal** (multi-goal aware)
- Your recorded **history**
- Preferences and constraints
- **Data actually used** — and a clear statement when nothing was
- The **reasoning** connecting data to recommendation
- The scientific **principle** behind it, with a source
- **Assumptions**
- **Missing information**
- Confidence
- **Alternatives** with notes
- **Accept / Reject**

**Three kinds of statement are never blurred:** observation (recorded in your log),
algorithm (what the app computed), principle (a sourced scientific finding). The
panel states each definition.

### Rule registry and audit trail

13 named, versioned rules: seven progression rules, goal-driven rep ranges, volume
tracking, recovery estimation, sleep band, decision ladder, and the evidence review
gate. Every rule has a **changelog entry** with date, rationale, sources, reviewer
and affected feature. Evidence links back to the rules it supports.

---

## 4. Evidence system — implemented honestly

14 structured records in `js/data/evidence.js` with the full schema the brief asks
for: title, authors, year, journal, type, DOI, URL, population, question, findings,
limitations, relevance, quality, last-reviewed, review status, verification state,
lesson links, rule links.

**The review gate is real and tested:** a record can drive a user-facing rule only
if it is `reviewed` **and** of `high`/`moderate` quality. Recency alone never
qualifies. Drafts and very-low-quality records are excluded automatically.

**Verified, not assumed — see [`EVIDENCE_VERIFICATION.md`](EVIDENCE_VERIFICATION.md):**
identifiers were checked against NCBI PubMed on 2026-10-26. **11 of 12 published
sources confirmed** (DOI + PMID). One DOI was wrong and has been corrected
(`wackerhage-2019-stimuli`), one title was wrong and has been corrected
(`phillips-2011-protein`), and one citation could not be located (`damas-2016`) and was
downgraded to draft so it cannot drive any recommendation. Two records are internal
notes, not published sources, and say so. Remaining caveat: PubMed is not the
publisher — spot-check before public release.

A test asserts these flags exist and are visible rather than hidden.

---

## 4b. Volume accounting: direct vs indirect

`js/engine/program.js` now owns volume (it was previously buried in the UI layer).

- **Weekly sets per muscle group**, weighted by each exercise's contribution.
- **Split into direct and indirect** — the primary muscle of an exercise receives
  the direct share; every other involved muscle receives an indirect share. A test
  asserts direct + indirect equals the total for every muscle.
- **Review bands** (none / low / typical / high / very high). Out-of-band counts
  raise a **prompt to review**, never a target, a prescription or a diagnosis.
- Surfaced in Progress as a table plus banners, and explained via a new
  `volume.reviewBand` rule with its own changelog entry and evidence link.
- Bug fixed en route: `volumeBandFor(0)` fell through to "very high" instead of
  "not trained".

## 5. Files changed

| File | Change |
|---|---|
| `js/data/evidence.js` | **new** — 14 structured evidence records + review gate |
| `js/data/lessons.js` | **new** — 10 categories, 11 lessons, quizzes, myths |
| `js/engine/why.js` | **new** — 13 rules, changelog, three explanation builders |
| `js/ui/science.js` | **new** — hub, lesson view, 5 explorers, why panel |
| `js/i18n/science.js`, `science2.js` | **new** — EN + FR full, 5 languages partial |
| `js/app.js` | Science nav item; lesson highlights Science |
| `js/core/store.js` | `state.science` added additively |
| `js/ui/screens.js` | "Why this?" on Today, Session, Body |
| `css/app.css` | small Science Hub additions |
| `index.html`, `build.py`, `sw.js`, `tests/run.js` | module registration |
| `tests/science.js` | **new** — 108 checks |
| `js/i18n/lesson_bodies_en.js`, `_fr.js`, `_es_de.js`, `_it_nl_ar.js` | **new** — 42 lesson sections × 7 languages (336 strings) |
| all `js/i18n/*.js` | **cleanup** — 144 dead translation keys removed |
| `js/i18n/science2.js` | volume + why-volume strings |

**Data changes:** `state.science` — purely additive, defaults filled on migration,
never destructive.

---

## 6. Tests executed

| Suite | Result |
|---|---|
| `tests/run.js` | **142 passed** |
| `tests/design.js` | **61 passed** |
| `tests/ui.js` | **110 passed** |
| `tests/inclusive.js` | **65 passed** |
| `tests/personas.js` | **66 passed** |
| `tests/science.js` | **121 passed** |
| `tools/qa_audit.js` | **0 issues** |
| `tools/fig_check.py` | geometry valid |
| `tools/smoke_dist.js` | bundle boots, selects, logs, charts, saves |

**565 automated checks, all executed and green.**

Science coverage includes: hub navigation and tabs, lesson rendering, quiz
right/wrong flows, all five explorers, simulation variable changes, evidence schema
validity, the review gate, rule↔evidence linkage both directions, changelog
completeness, all three "Why this?" panels, entry points on three existing screens,
localisation depth declaration, accessibility structure and offline behaviour.

---

## 7. Bugs found and fixed in this pass

1. **`CATEGORIES` collided** between `ex_meta.js` and `lessons.js` — renamed to
   `SCIENCE_CATEGORIES`.
2. **`RULES` collided** between `progression.js` and `why.js` — renamed to
   `RECOMMENDATION_RULES`.
3. **`mg.` namespace collision** — the muscle-growth explorer reused the muscle-group
   prefix (`mg.chest`), so `mg.stimulus` was wrongly counted as a core interface key
   for every language. Renamed to `mge.`.
4. **The metabolism explorer omitted spot reduction** rather than refusing it. Now
   refuses it explicitly with a sourced record.
5. **Three rules had no changelog entry.** The audit trail is now complete for all 13.
6. **The "data used" section disappeared when empty.** It now states that no
   recorded data was available.
7. **The safety regex flagged "anabolic"** as a PED recommendation. It was matching
   legitimate physiology ("anabolic window"). Rewritten to detect *recommendations*
   of drug use rather than the word.
8. **`build.py` reported a false external reference** — it matched a JS template
   string (`href="' + esc(e.url) + '"`). The check now ignores runtime concatenation.
9. Two French strings and an apostrophe-escaping bug.

Bugs found in the second pass (volume + translation):

10. **`t()` ignored `{placeholder}` variables.** Calls like `t('why.prog.what', {load:60})`
    rendered the literal text `{load}` to the user. `t()` now interpolates when a vars
    object is passed, and a regression test asserts no `{placeholder}` ever reaches
    any explanation panel.
11. **`volumeBandFor(0)` returned "very high"** instead of "not trained", so every
    untrained muscle was flagged. Fixed and covered by a test.
12. **`openWhy('volume')` silently did nothing** — the volume branch had been added to
    the wrong file. Now in `js/ui/science.js` where `openWhy` actually lives.

Bugs found in the third pass (dead-code cleanup):

13. **144 dead translation keys** were inflating every language file and dragging the
    Arabic coverage figure down for strings no code path used. Each was verified to
    have zero references before removal. Coverage is now measured against 422 live
    keys instead of 456 stale ones — and all seven languages sit at 100 %.

14. **My first removal regex only caught line-leading keys**, so 30 dead keys declared
    inline alongside others survived the first sweep. Caught on the second pass.

15. **Two tests asserted Arabic was partial.** Correct when written, false after the
    cleanup. Encoding an assumption about *which* language is incomplete is its own
    liability; both tests now assert completeness.

16. **A test replacement swallowed `switchLang('fr')`**, so the French assertions were
    secretly checking Arabic text and passing. A green test on the wrong language is
    worse than no test. Found by reading the rendered output, not by a failing
    assertion.

17. **34 unclosed strings** in the ES/DE body file. Caught by `node --check`, repaired
    by a script that flags odd quote counts, then verified by printing the rendered
    strings to confirm none were truncated.

18. **Three of my own Python edit scripts had syntax errors** (unbalanced parens)
    that would have made them silent no-ops. `node --check` caught every one before
    they could do damage. One patch also targeted `ui.js` for Arabic strings that
    actually live in `ar.js`.

---

## Final status

**Phase complete and tested. The full mission is not complete.**

The Science Hub, the five explorers, the evidence system with its review gate, and
the transparent recommendation explanations are all integrated into the real
application, reachable from the primary navigation and from three existing screens,
and covered by 108 new tests with no regressions across the existing 444.

Classified as **partially verified, with known issues** — for the concrete reasons
in §8 (unverified identifiers, partial lesson translation, and the checks that
cannot be performed without a real device).
