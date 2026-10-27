# ANCESTOR — design pass, final report

Branch `arena/c263a64a-ancestor`, 43 commits over `62aa6218`, 152 files touched.
The work is in the application, not in a slide deck: `app/` holds the code,
`app/DESIGN.md` holds the design system record this report summarises, and the
site in `site/` is the public write-up.

Everything claimed below was measured in this repository. Nothing was claimed
that could not be re-run, and §6 states exactly what could not be inspected.

**How to re-verify**

```
cd app && for t in design premium ui run inclusive personas science logic anatomy print; do node tests/$t.js; done
node tools/keyscan.js          # 1,650 keys × 7 languages, 0 leaks
node tools/qa_audit.js         # 1 accepted Medium (documented)
python3 build.py && node tools/smoke_dist.js     # self-contained, BUNDLE OK
python3 site/build.py && python3 site/check.py   # 62 site checks
```

Current: **1,248 checks over ten headless suites**, all green —
design 196, premium 213, ui 217, run 142, inclusive 65, personas 66, science 124,
logic 117, anatomy 64, print 44.

---

## 1. Problems identified

### The census, before anything changed

Nine surfaces crawled with a seeded profile (onboarding complete, six sessions of
three exercises, bodyweight recorded), English, default viewport.

| surface | words | controls in DOM | buttons |
|---|---|---|---|
| Today | 377 | 17 | 17 |
| Active session | 534 | 159 | **99** |
| Body / anatomy | 245 | 59 | 59 |
| Progress | 342 | 35 | 35 |
| Science | 214 | 27 | 26 |
| Profile | 621 | 164 | **160** |
| Exercise atlas | **1 304** | **383** | **382** |

### The three defects that were not cosmetic

1. **The active session had no headings at all.** Zero `h1`, zero `h2`, zero `h3`
   on the one screen a tired person uses one-handed. A screen reader could not
   jump between exercises; a sighted user got one unbroken column of eighteen
   set cards.
2. **Every exercise repeated eight controls** — log, warm-up, remove ×3, add set,
   skip set, skip exercise, substitute, details — six times over. Ninety-nine
   visually equal buttons for one decision: *log this set*.
3. **The dashboard figure was a `<button>` containing fourteen `role="button"`
   SVG segments.** Nested interactive content, and an accessible name that read
   the entire body aloud: *"Shoulders — ReadyShoulders — ReadyChest…"*.

### The rest, in short

- Nine `h2` sections on Today, no hierarchy between them — a wall, not a screen.
- Six "3×5–12 reps" pills plus a fourteen-word definition, in the one card that
  has to be read at a glance.
- Profile: 621 words and 160 buttons of settings, most of them not settings.
- Atlas: 1,304 words across 383 controls — every exercise row duplicating the
  same eight actions.
- Onboarding asked a first-time user to *confirm* ninety exercise chips.
- The sub-navigation's accessible name was "Exercise library88" (a bare count
  glued onto the label; `textContent` is not what is announced).
- One focus region on Today added 31 tab stops for a decorative figure.
- The rest timer was a thin visual bar with no progress semantics and no
  announcement.
- In the running code, not only the design: a save could delete a record it
  failed to parse; a failure strip reported errors and did nothing; several
  marks were below the 44 px target; some uncaught errors were swallowed.

Two "findings" were artefacts of the audit tool itself and are recorded because
they shaped the method: an input's own attributes say nothing about its
accessible name when a `<label for>` exists, and `textContent` is not what is
announced. Both were re-checked by hand before anything was changed. A third
artefact was found late and is corrected in §6.

---

## 2. Product and UX decisions

**One dominant action per moment.** Every screen answers one question and offers
one obvious move. Today: *start the session*. Session: *log this set*. Atlas:
*open this exercise*. Everything else is secondary weight or it is a disclosure.

**The decision stays visible; the case for it moves one tap down.** This is the
rule the whole pass turned on. Caveats are not decoration to be deleted — they
are the honest part of a product that estimates recovery from a log — so they
were moved, not removed: the availability definition, the "this is not a
diagnosis" paragraph and the coverage method note all still exist in the DOM
inside a disclosure. Today went 377 → 311 → **222** visible words with the
caveats intact. A test asserts each caveat string is still present, and another
fails if a caveat is reachable only on hover.

**Native disclosure, not a private accordion.** `<details>/<summary>` replaced
four bespoke patterns. It opens without JavaScript, it is keyboard-correct by
construction, and it cannot desynchronise from its own state (an earlier
`ontoggle` handler froze the current-exercise marker — that bug is gone because
the pattern is gone). Its open state is deliberately **not** persisted: a
session opened tomorrow must not start with yesterday's options expanded.

**A register, not cards.** The exercise library is a scanned list — name, muscle,
equipment — with one control per row, because someone looking for "the row
machine" is scanning, not reading.

**Records, not panels.** Profile shows four numbers that name their own value
(weight, sessions, streak, units) and then folds everything else. A setting is
only there if it changes something that actually happens.

**Remove, don't confirm.** Onboarding's exercise step asks the user to take away
what they do not have, instead of ticking ninety boxes to agree with a list.

**No invented anything.** Readiness is labelled an estimate wherever it appears.
The science screen separates evidence strength from uncertainty and cites no
study it does not have. No placeholder controls were added; where a thing cannot
work (a timer waking a sleeping phone) the interface says so instead of promising.

**Preserve working logic.** No screen function was rewritten for taste. Controls
were relocated into disclosures with their handlers intact; the router, storage,
i18n and calculation modules were not restructured.

### Rejected on purpose

- A custom animated accordion (frame cost, and it needs reduced-motion special
  cases that the native element does not).
- Persisting which disclosures are open (a tomorrow-morning session should feel
  new).
- A dark theme for the whole app — dark surfaces stay confined to immersive
  training and anatomy, as the brief requires.
- Hover as a path to anything. Hover is a hint; every control is reachable and
  legible by tap and by keyboard.
- Deleting caveats to shorten screens. See above.

---

## 3. Screens and journeys redesigned

### Journey A — first run

Eight steps, one question each, with the question explained before it is asked,
a visible step count, `Back` on every step, and "optional" that really is
optional (skipping does not block finishing, and the starting point is still a
usable programme). The exercise step is the change that matters: it now shows
what the person already has — 90 controls in the DOM, **14 reachable at once**,
88 of 88 pressable chips carrying `aria-pressed` — because the first question in
a gym app should not be a curriculum.

### Journey B — returning home

Today became three bands instead of nine sections: *what today is*, *what it
costs*, *what it's worth knowing*. One dominant action. The verdict card no
longer reprints the programme — it states the cost (`6 lifts · 18 sets · ~73 min`),
shows the first two lifts, and puts the rest behind **+4 more**. Readiness keeps
its meter but the definition moved into a disclosure under it. **377 → 222
visible words, six lifts → two, zero caveats deleted.**

### Journey C — the active session

The screen is now a document with headings: one exercise block open, the others
folded to a single line that still shows the lift name and its scheme. Previous
performance sits under the weight and rep fields; the current set is marked with
a rule, not only a colour. The rest timer is a real `progressbar` (`0…120`,
`0 of 135` after `+15 s`), announces through `#restSay`, and resets to 90 s.
Pause and finish both confirm before discarding work. **534 → 153 visible words
(127 on a two-lift plan), 99 → 23 exposed controls, one block open of six.**

### Journey D — progress

Not re-audited in this pass. Charts and records were verified for real units and
no invented measurements in an earlier pass; drill-down was not re-inspected.
Stated plainly because it is the weakest claim in this document.

### Journey E — understand

*Atlas:* 1,304 → 591 words, 383 → 119 controls; one control per row; filters
behind a disclosure; the sheet is now the single action surface (and is next on
the audit list precisely because of that).
*Figure:* semantics fixed — the dashboard figure is no longer a button, it keeps
its pointer affordance, leaves the tab order, and announces itself and its next
step; focus stops contributed on Today fell 31 → 1.
*Science:* evidence strength and uncertainty stay separated, citations are real
or absent, and the evidence detail uses the same disclosure as everything else.

### Screen by screen

| screen | what changed | measurement |
|---|---|---|
| Today | three bands, cost line, two lifts + *+4 more*, definitions folded | 377 → 222 words |
| Plan | not touched this pass | — |
| Active session | headings, one open block, rest timer, folded controls | 534 → 153 words, 99 → 23 controls |
| Atlas | register rows, one control each, filters folded | 1,304 → 591 words, 383 → 119 controls |
| Exercise sheet | reached from the register, not from a duplicated button stack | audited next |
| Progress | untouched this pass | 342 words, 47 controls |
| Body | figure semantics; muscle list still duplicates the figure | 245 → 104 words, 34 controls |
| Science | unchanged structure, shared disclosure | 214 before; 284 today with the lesson sub-nav in the DOM |
| Profile | four records, one accordion for the pool, restore-all with undo | 621 → 266 words, 164 → 42 exposed controls |
| Onboarding | eight explained steps, remove-not-confirm exercise step | 90 in DOM, 14 reachable |

The word counts above are seeded, structural censuses — text content, not reading
effort — and they move with the seeded data. They are useful for comparison, not
as absolutes.

---

## 4. Tokens and components created or updated

Tokens were not re-invented: one canvas, one surface, one ink pair, one accent
for action and attention only, dark surfaces confined to training and anatomy,
`--s1…--s8` on a 4 px scale, `--hit:44px`, radii, easing and durations as
variables. The stylesheet carries **57 custom properties**, three type families
(Barlow Condensed for display and numerals, a system body face, a mono for
labels), and seven type steps from `--fs-mega` to `--fs-meta`.

Added or changed in this pass:

| token / component | what it is | why |
|---|---|---|
| `.dis` / `.dis-t` | one native disclosure: 32 px summary row, `--hit` expander under a coarse pointer, `+`/`–` from CSS, `:focus-visible` ring | replaced four bespoke accordions and a stuck `ontoggle` |
| `.next-ex-more` | the *+N more* summary on the verdict card | keeps the decision visible, the programme behind it |
| `.readiness-def`, `.dash-insight-why` | definition and caveat styles inside a disclosure | same rule, at the level of a sentence |
| `.sess-ex-h` | an exercise heading that does not look like one | a document that is not a wall |
| `.tac` | one text utility, declared once | a screen had it inline |
| `.panel-hd`, band headings | section rhythm above the fold | three bands, not nine sections |
| `.restbar` + `role="progressbar"` | timer with real semantics and an announcement node | a bar you must watch is not accessible |
| register row | atlas row, one control each | scanning instead of reading |
| `anatomyFigure(…, {pointerOnly})` | figure stays tappable, leaves the tab order, announces itself | removed nested interactive content |

Removed: `.dash-figlink-t` (a style with no element) and the button that wrapped
the dashboard figure. The static suite fails if a disclosure is restyled outside
`.dis`. `sw.js` is at **v20**; `app/release/ancestor.html` is rebuilt from source
and checked self-contained with zero external references.

---

## 5. Interactions implemented

Every control below has initial, trigger, response, transition, persistence and
failure behaviour defined in `app/DESIGN.md` §5 and covered where it can be by a
headless check.

| control | initial | trigger | response | persistence | failure |
|---|---|---|---|---|---|
| disclosure | closed, one-line mono label, `+` trailing | tap the row, `Enter`/`Space`; invisible 44 px expander on coarse pointers | browser toggles `open`, `+`→`–`, content appears below with no shift | deliberately not persisted | `<details>` still opens with no script |
| exercise block | current lift open, rest folded to a line | tap the block heading | that block opens, previous closes, current marker redrawn | open state resets per session | reveal is CSS-only |
| set logging | fields prefilled from last performance | numeric entry or stepper | value saved on commit; set marked done by rule **and** label | written to the session record | toast names the field, set not marked done |
| rest timer | 90 s, `progressbar` `0…120` | start / `+15 s` / reset | bar and numerals advance; `#restSay` announces the phase | survives re-render, computed from an absolute end time | with the tab asleep nothing fires — the screen says so |
| pause / finish | armed | tap | confirmation before discarding an unfinished set | session state retained | cancel returns to the session unchanged |
| pool restore | folded accordion | "Restore all" | restores the removed exercises; an undo appears | written to preferences | toast reports, undo stays available |
| onboarding back | step 1 has none | Back | returns with answers intact | answers persist per step | last step always finishes |
| atlas row | row, one control | tap | sheet opens with details and history | sheet is not persisted | sheet falls back to a plain panel |
| chart drill-down | summary mark | tap | the record behind the point opens | — | empty state instead of an invented value |
| language switch | current language marked | tap | whole app re-renders in seven languages | stored | falls back to English |

Motion is tokenised (`--t-instant` … `--t-count`, `--t-stagger`) with
reduced-motion parity: the media query removes the indicator glide, the counter
animation and the reveal, and nothing depends on an animation completing.
Feedback is never colour alone — a rule, a label or a word accompanies every
state change. Hover is never the only path to anything.

---

## 6. Viewports and screens actually inspected

**No pixel of this application was visually inspected.** There is no browser and
no GPU in this environment: no screenshots, no rendered layout, no devtools
inspection, no WebGL. Concretely:

- **320 / 375 / 390 / 768 / 1024 / 1440 were not visually verified.** The layout
  is mobile-first with breakpoints at 400, 560, 720, 1024 and 1280 px, and
  `tests/design.js` asserts the structural facts it can assert statically (the
  tab bar becomes a 200 px side rail at 1024, the media queries exist, the
  400 px wordmark rule is present). That is a source-code assertion, not an
  observation of how anything looks.
- **jsdom has no layout engine.** `getComputedStyle` in the test environment
  returns declared values without a used-value layout, so paddings, wrapping,
  overflow and long translated strings (German compounds, Arabic shaping) are
  unverified at every width.
- **The 3D anatomy path was never executed.** The flat figure was the only
  anatomy surface exercised; the WebGL route cannot run without a GPU.
- **No interaction was performed by hand.** Every interaction in §5 was driven
  through the DOM in jsdom, which proves wiring and state, not feel, latency or
  thumb reach.

What *was* done instead, and what the numbers in this document actually mean:

- a DOM census of every screen and sub-screen (Today, session plan, active
  session, Body, atlas, exercise sheet, Progress, Science, Science lesson,
  Profile, eight onboarding steps) counting visible text, controls in the DOM,
  controls reachable without opening a disclosure, disclosures and their
  open state, and heading sequence;
- contrast computed from the token hex values against the surfaces they are
  actually painted on (§7);
- tab-order and focus-region counts taken from the same DOM;
- static stylesheet assertions for the things a stylesheet can be asked about;
- falsification: every new assertion was broken on purpose to watch it fail, and
  two numbers that did not survive re-measurement were corrected rather than
  kept (see below).

**A measurement error, corrected.** The active session was earlier reported at
205 visible words. That figure came from a walker that did not skip `<svg>`
subtrees: jsdom exposes those element names lower-case, the filter compared
upper-case, and the accessible `<title>` of every muscle region and thumbnail was
counted as prose. The true figure at that commit is **153**. `app/DESIGN.md`
§3.8 and §7 now say 153, and the correction is written into the record. Any older
probe number computed with that walker should be treated as suspect.

**What a browser pass would need to look at first:** the 320 px Today card (cost
line + two lifts + *+4 more* in one column), the exercise block at 390 px with
the keyboard covering the rep field, the atlas row height and its 72 px density,
the sheet hand-off at 768 px, the 1024 px rail switch, and 1440 px whitespace in
the two-column bento.

---

## 7. Accessibility improvements

| check | before | after |
|---|---|---|
| page titles that are `h1` | 1 of 7 | 7 of 7 |
| headings on the active session | 0 | 1 + one per exercise |
| controls exposed on the active session | 159 (99 of them buttons) | 23 |
| nested interactive elements on Today | 30 segments inside a `<button>` | 0 |
| focus stops contributed by the dashboard figure | 31 | 1 |
| sub-navigation accessible name | "Exercise library88" | "Exercise library" |
| set fields naming their set | 0 of 54 | 54 of 54 |
| controls exposed on Profile | 160 | 42 |
| controls on the exercise atlas | 382 | 119 |
| words on the exercise atlas | 1 304 | 591 |
| top-level sections on Today | 9 | 3 |
| visible words on Today | 377 | 222 |

Also: `aria-pressed` on 88 of 88 onboarding chips; the rest timer exposes
`role="progressbar"` with `aria-valuenow`/`aria-valuemax` and announces phase
changes through a live region; every disclosure summary is in the natural tab
order with a visible `:focus-visible` ring; interactive targets are held at
`--hit:44px`, including an invisible expander for coarse pointers on summary
rows; decorative SVG is `aria-hidden` and textually silent; the language switch
marks the active language, not only colours it.

Contrast, measured against the surface each token is painted on (AA body text
needs 4.5:1):

| token | ratio | verdict |
|---|---|---|
| `--ink` | 13.6 | ✓ |
| `--ink-2` | 8.72 | ✓ |
| `--ink-3` | 5.63 | ✓ |
| `--tech` | **3.72** | ✗ as text — used for marks only; text uses `--tech-ink` 5.00 |
| `--burnt` | **2.95** | ✗ as text — used for rules and marks; text uses `--burnt-text` 4.96 |
| `--ok` | 5.88 | ✓ |
| `--warn` | 4.79 | ✓ |
| `--alert` | 5.81 | ✓ |

The two failures are honest open leads, not oversights: both colours are
specified for marks, and both have a text-safe sibling in the token set. They
remain on the list in §9 because a token that fails AA will eventually be used as
text by someone.

**Still open:** heading levels jump (`h1 → h3`) on Body, Progress and the session
plan — measured at the end of this pass as `h1,h3` (Body), `h1,h3×6` (Progress),
`h1,h3` (session plan); Science is now `h1,h2`. The panels share one `h3`
component and were left alone rather than half-converted.

---

## 8. Incomplete features and limitations

- **Nothing was seen.** No visual inspection, no viewport rendering, no WebGL —
  stated in full in §6. This is the first line of the report because it is the
  first thing a reviewer should weigh.
- **The rest timer cannot reach a sleeping phone.** It is computed from an
  absolute end time, so it is correct the moment the tab resumes, but nothing
  fires while the screen is off. There is no OS notification. "Survives a locked
  screen" means the arithmetic survives, not that it can interrupt you.
- **The Body screen repeats itself.** The muscle list duplicates what the figure
  already shows; both were left because dropping the wrong one loses a path.
- **The exercise sheet has never been audited on its own.** It is now the only
  action surface the atlas has, which makes that gap more expensive than it was.
- **The plan screen was never audited** in this phase.
- **Progress was not re-audited**; drill-down and records were not re-inspected.
- **Discoverability is a bet.** Folding a settings page assumes the summary line
  is enough to make someone open it. Nobody has watched a user look for "units".
- **Onboarding has never met a first-run user.** Eight steps measured
  structurally, none tested with a person who has never seen the app.
- **No user testing, no analytics, no session recordings** — every claim about
  effort, comprehension or willingness to read is a design argument, not evidence.
- **The five experiences do not have five homes.** Recover lives inside Today's
  verdict and the sleep/shift sheets rather than a destination of its own; that is
  a defensible product choice, but the brief asked for five experiences and the
  app has six destinations.
- **Print layout and offline persistence were not re-verified** in this pass.
  Those suites are green, which is not the same as inspected.
- One Medium is accepted and documented in `tools/qa_audit.js`:
  `body{overflow-x:hidden}` hides horizontal overflow instead of preventing it.

---

## 9. Next improvements, ranked by user impact

1. **A rest timer that can reach you when the screen is off** — a service-worker
   notification, or an honest "keep this tab open" note. This is the one place
   where the product currently under-delivers on a promise the session screen
   makes.
2. **Body: drop the duplicate muscle list** — either the figure carries the
   names or the list does. Both is 100 words of repetition on a screen whose job
   is a glance.
3. **Audit the exercise sheet on its own** — it inherited every action the atlas
   rows used to duplicate, and it has never been measured or seen.
4. **Audit the plan screen** — the only surface untouched by this phase.
5. **Fix the heading levels** on Body, Progress and the session plan (`h3` panels
   should be `h2`), and take the whole component rather than half of it.
6. **Retire or guard the two failing colour tokens** — `--tech` and `--burnt` as
   text. A lint or test that fails when either is used for `color` closes the
   lead permanently.
7. **Watch five people onboard.** Everything about the eight-step flow is an
   argument; ten minutes of observation would replace most of it.
8. **Measure discoverability of the folded settings** — instrument or test
   whether anyone finds units, shift pattern and export after the fold.
9. **A browser pass at 320, 390, 768 and 1440 px** — the one item this
   environment could not do, and the one that decides whether the rest of the
   layout work holds.

Ranked by user impact, then by cost: 1 and 2 are small changes with daily
consequences; 3, 4 and 5 are audits and mechanical fixes; 6 and 8 are cheap
guards; 7 and 9 are the investments that would make every other claim in this
document checkable.
