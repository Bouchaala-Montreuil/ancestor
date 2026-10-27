# DESIGN — ANCESTOR

This document is the working design record: the audit that produced it, the
decisions taken, what was actually implemented, and what was not. It is written
to be checked against the code, not admired.

**What this pass is, and what it is not.** Most numbers below come from a jsdom
crawl of the running application (`node --check`-clean scripts, real stylesheet,
seeded state) or from static inspection of the stylesheet. jsdom has no layout
engine: it can prove structure, names, counts and contrast arithmetic, and it
cannot prove that a box overflows or that a 390 px screen looks right.

**That gap was closed late, not never.** A headless Chromium was installed in
this environment at the end of the pass and `tests/browser.js` was run for the
first time against this build — 28 checks, WebGL included, all green in the end.
It found eleven rendered defects that the structural audit had passed. They are
listed in §3.13, and every claim in this document that used to be marked *not
verified* has been re-read against what the browser showed. What is still
argued rather than observed: real devices (no iOS Safari, no Firefox, no notch),
motion, and thumb reach. §8 states it precisely.

---

## 1. What the audit found

Nine surfaces were crawled with a seeded profile (onboarding complete, six
sessions of three exercises, bodyweight recorded), English, default viewport.

| surface | words | controls in DOM | controls exposed | buttons exposed |
|---|---|---|---|---|
| Today (home) | 377 | 17 | 17 | 17 |
| Active session | 534 | 159 | 159 | **99** |
| Body / anatomy | 245 | 59 | 59 | 59 |
| Progress | 342 | 35 | 35 | 35 |
| Science | 214 | 27 | 27 | 26 |
| Profile | 621 | 164 | 164 | **160** |
| Exercise atlas | **1 304** | **383** | 383 | **382** |

The three defects that mattered were not cosmetic.

1. **The active session had no headings at all.** Zero `h1`, zero `h2`, zero
   `h3` on the screen a tired person uses one-handed in a gym. A screen reader
   could not jump between exercises; a sighted user had one unbroken column of
   eighteen set cards.
2. **Every exercise repeated eight controls.** Log set, Warm-up, Remove × three
   sets, then Add a set, Skip set, Skip exercise, Substitute, Exercise details —
   six times over. Ninety-nine buttons, all visually equal, for one decision
   ("log this set").
3. **The dashboard figure was a `<button>` containing fourteen `role="button"`
   SVG segments.** Nested interactive content, and an accessible name that read
   as the entire body: *"Shoulders — ReadyShoulders — ReadyChest…"*.

Two further findings were measurement artefacts of the probe itself and are
recorded because they shaped the method: an input's *own* attributes say nothing
about its accessible name when a `<label for>` exists, and `textContent` is not
what a screen reader announces (`aria-hidden` children were still glued onto the
sub-navigation's name: "Exercise library88"). Both were re-checked by hand
before anything was changed.

---

## 2. The five experiences, and where they live

| experience | screens | the question it answers |
|---|---|---|
| **Train** | Today, Plan, Active session | what do I do now, and how much? |
| **Progress** | Progress | is this working? |
| **Understand** | Body/anatomy, Science | why is it working, and how sure are we? |
| **Recover** | Today's verdict, sleep/shift/feel sheets | should I train at all today? |
| **Personalize** | Profile, onboarding | is this programme mine? |

Core loop: *understand state → know what to do → understand why → act → measure
progress.* The loop is only closed if each screen hands off to the next. Today
hands to Session; Session hands to the completion summary; the summary hands to
Progress; Progress and Body both answer "why", which returns to Today.

---

## 3. What was implemented in this pass

### 3.1 One dominant action (Journey B — returning home)

The verdict card carried seven buttons of equal weight: start, plan, analysis,
print card, why, log sleep, correct. All seven are still reachable; the card now
shows **two** — the action and the plan — and the rest wait behind one
disclosure. Measured: two actions at full weight, exactly one primary.

Rationale: the screen's job is to answer "what now". Seven equal buttons is the
same as no instruction. Nothing was deleted, so no capability was lost.

### 3.2 The session is a document, not a wall (Journey C)

- `h1` = the session name; `h2` per exercise. The outline now reads
  *Pull → Pull-Up → Barbell Row → Barbell Curl → Dumbbell Row → Lat Pulldown →
  Seated Cable Row*. Measured: 1 × `h1`, 6 × `h2` for 6 exercises.
- The five per-exercise controls are one *Exercise options* disclosure; warm-up
  and remove are one *Set options* disclosure per set. Measured: **33 of 99
  buttons exposed** (66 % behind disclosure), and every set card keeps its
  primary *Log set*.
- **Discard moved** from the top bar to below *Finish session*, in text weight,
  still behind a confirmation. Destructive actions do not belong where a thumb
  rests while scrolling a phone.
- Each field now names its set for assistive technology
  ("Load, Set 2 / 3"), so a screen reader stops announcing "Reps" eighteen times
  without context. Measured: 54 of 54 field labels carry the number.

**Why disclosures and not an accordion with one exercise at a time.** Collapsing
a finished exercise automatically would move content under the user's finger the
moment they log the last set — the exact moment they are looking at what they
just entered. A disclosure the user opens is stable; a collapsed state the app
imposes is not. It also keeps every set in the DOM, so nothing is lost when a
screen is printed or read by a script.

### 3.3 The dashboard figure (Body / Journey E)

The figure is now a panel. It is still tappable per region — that shortcut is
tested behaviour and was preserved — but its thirty regions are **not** in the
tab order, and the only keyboard destination is the visible link *Open the
anatomy lab*. The map is still an `img` with a name, not thirty tab stops
between the action card and everything printed after it. On the Body screen the segments
remain real `role="button"` targets, because there the map *is* the interface.

### 3.4 The atlas is a register, not a wall (Journey E — Understand)

Eighty-eight exercises each rendered as an unboxed stack: a heading, four flags,
a contribution bar, a sentence listing three muscle percentages, and four
controls. **382 buttons and 1 304 words** in one scroll — a library you scroll
past rather than one you search.

It is now a ruled register: one row per exercise, each row a single control that
opens the sheet already holding every action (add to plan, add to session, open
the body map, "why"). Equipment and mode — the two axes almost nobody changes —
wait behind one disclosure, and the closed row *names* an active filter so a
short list never lies about why it is short.

| | before | after |
|---|---|---|
| words | 1 304 | **591** |
| controls | 382 | **119** |
| controls per exercise | 4 | **1** |
| filter chips visible | 27 | 13 |

Two defects were behind the word count. The contribution bar was three `<i>`
elements with percentage widths and **no height and no paint**, so a data visual
rendered as an empty 0 px row in all 88 cards; it is now a 3 px track with a
painted fill, and a design check fails if a bar ever ships without both. And the
subtle one: the row's four buttons were the only way to reach add-to-plan, which
the sheet also offered — the duplication was invisible until the controls were
counted.

### 3.5 Profile: four records, not eleven panels

160 controls and 621 words in one scroll: programme, goals, style, environment,
an 84-exercise pool, schedule, sleep, adaptations, display, language, data and
about — every setting visible at once, and therefore none of them found.

It is now four records under one `h1`, each **naming its own value while
closed**:

> **Programme** — Standard volume · 3d · 50 minutes · Full gym
> **Body & recovery** — Night shifts · 7 hours per night
> **Accessibility & display** — 100% · English
> **Data & about** — 0 sessions

| | before | after |
|---|---|---|
| controls exposed on load | 160 | **59** |
| page heading levels | h2, then h3 (no h1) | **h1 → 4 × h2 → h3** |
| settings in the document | 160 | **164** (nothing deleted) |

Nothing was removed to make the page short — that is the difference between this
and the atlas, which really had four controls per exercise doing one job. Here
every control still exists; the page simply stops answering questions nobody
asked. Programme opens, because a programme is the reason the screen exists.

The same pass fixed a structural fault that ran through five screens: every page
title was an `h2`, so each screen's outline began at level 2 and then jumped to
`h3` inside its first panel. Today, Session, Progress, Body, Science, Profile and
the plan/library mastheads are all `h1` now.

### 3.6 Onboarding: the step that asks you to remove, not to select

The last step before a programme is built asked *"Which of these can you perform
comfortably?"* and answered it for you: **88 chips, every one already switched
on**, in twelve unlabelled rows. The task is really subtraction — almost nobody
removes twenty exercises — but the screen asked for confirmation ninety times.

It is now twelve collapsed groups, each stating how many it still holds
(`Horizontal push 12 / 12`), with one line above them saying everything your
equipment allows is already included. A group you have changed opens itself and
stays open across the re-render a tap causes, so your removals stay visible.

| | before | after |
|---|---|---|
| controls in the document | 90 | 90 (the pool is unchanged) |
| controls reachable at once | 90 | **14** (12 groups + back/continue) |
| toggles that state their state to a screen reader | 0 of 88 | **88 of 88** |

The chips also gained `aria-pressed`. Until this pass a selected exercise was
communicated by colour alone — the one thing the design rules forbid and the one
thing nobody had checked, in the same control, on the same screen.

### 3.7 Today answers three questions, not nine

The dashboard opened with a verdict and then nine numbered sections in the order
the data happened to exist: Recent work, Muscle-group coverage, This week, Worth
knowing, Your next seven days, Muscle map, Learn. Each was labelled like a
chapter of equal weight, including the ones a returning lifter never reads.

Three bands now, and the sections inside them are evidence rather than peers:

> **Today** — the verdict, the next session, one action
> **This week** — the ring, recent work, muscle-group coverage, your next seven days
> **Understand** — worth knowing, the muscle map, the next lesson

| | before | after |
|---|---|---|
| `h2` sections competing at the top level | 9 | **3** |
| heading outline | h1 → nine h2 → h3 | **h1 → 3 h2 → 7 h3** |
| the weekly ring's duplicate heading | "This week" under nothing | band carries it; the ring is the band's lead panel |

Nothing was cut: same words (381 before, 381 after), same seventeen controls,
same one primary action. The page was re-pitched as three answers instead of a
ledger — which is the only kind of change that can make a dashboard of the same
content feel smaller.

### 3.8 The session shows the work, not the whole programme

The active session rendered every exercise in full: six headers, six set blocks
and eighteen live rows of inputs at once — **826 words, 152 controls in the
document, 99 buttons** on the screen you use one-handed, tired, between sets.

One exercise is open now — the one you are actually on — and the rest fold to a
single line each that answers "where am I?" without being opened:

> **02 · Overhead Press**  ·  1 of 3 logged

| | before | after |
|---|---|---|
| visible words | 826 | **153** |
| controls reachable at once | 152 | **21** |
| exercises rendered in full | 6 | **1** |
| set cards in the document | 18 | 18 (nothing deleted) |

Three rules make it safe rather than merely short:

1. **Nothing leaves the document.** Every set, input and note is still rendered;
   the folded blocks are native `<details>`, so print, tests and assistive
   technology still see the whole session.
2. **The current exercise always presents itself.** When the session moves on,
   the new current block opens even if it had been closed earlier — a stale
   "closed" on the lift you are now supposed to do would hide the work. A block
   you opened to look ahead stays open across the re-render every keystroke
   causes.
3. **The state is recorded from the click, not from `toggle`.** A `toggle` event
   also fires for the element the page has just created, which froze "current"
   into "always open" on the first re-render. The static suite now fails if the
   block is driven by `ontoggle`.

The exercise name used to open the exercise-detail sheet; it now expands the
block. Details are still one tap away — *Exercise details* is the first item in
the block's options — and the trade is deliberate: the name is the biggest target
on the row, and expanding what you are looking at is the more frequent intent.

### 3.9 The rest timer can be read without watching it

Rest was a visual countdown. A screen reader user got nothing when it started,
nothing while it ran, and one toast when it ended — the timer was usable only if
you could see it.

- the bar is a **labelled region**;
- the countdown is a **`progressbar`** with `aria-valuemin/max/now` and a
  `aria-valuetext` of the clock, so the remaining time can be queried at any
  moment;
- the ticking `<span>` is `aria-hidden`: announcing a countdown four times a
  second is an interruption, not information;
- one polite `role="status"` line speaks **only when the state changes** —
  started, paused, resumed, +15 s, and the existing toast when it ends.

A real defect surfaced while testing this: **adding 15 s pushed the elapsed value
past its own maximum** (`-15 of 120`). Extra time is now tracked separately from
the rest you programmed, so the bar's maximum grows with it while *Reset* still
returns to the rest you actually set.

### 3.10 One accordion, and a way back

The exercise pool inside Programme was the last chip-wall: 84 chips in twelve
disclosures of an *older* accordion pattern — `.acc` with its own animation
binding — with the first two groups forced open for no stated reason. It is the
same job as the onboarding step beside it, so it now uses the same component and
the same rule: closed, each group stating what it holds, and a group you changed
opens itself.

| | before | after |
|---|---|---|
| disclosures on the profile | two patterns (`.acc` + `.dis`) | **one** |
| groups forced open | 2 | **0** |
| controls reachable at rest | 59 | **41** |
| ways to undo a removal | none | **one** ("Restore all") |

That last row is the real addition. Removing an exercise was reversible only by
remembering which group you had opened and finding the chip again — the kind of
"undo" that exists in the data model but not in the interface. The pool now
states *"Exercises removed from your pool: 3 — Restore all"* and disappears when
nothing is removed.

Deleting the old pattern also deleted its animation binding (`bindAccordions`)
and its two CSS rules: dead code that still carried a `prefers-reduced-motion`
branch. A design check now fails if the superseded accordion comes back.

A plural bug surfaced in the new line — *"1 exercises removed"* — and was fixed by
phrasing that has no plural to get wrong, in all seven languages, rather than by
adding a pluralisation engine nobody asked for.

### 3.11 Today: the decision, not the whole case for it

The outline was fixed last pass; the prose wasn't. Measured as **visible words**
(text a person can read without opening anything), Today carried:

| block | before | what was in it |
|---|---|---|
| the verdict card | 72 | a 14-word definition of the estimate, plus six pills of "3×5–12 reps" |
| Worth knowing | 56 | a 38-word caveat about not diagnosing anything |
| muscle coverage | 52 | a 20-word method note under twelve data rows |
| **whole screen** | **311** | |

Three moves, one rule: **the finding stays visible, the case for it moves one tap
down.** The availability definition, the "this is not a diagnosis" paragraph and
the coverage method note are all still on the page — inside the same disclosure
as everything else — and the verdict's glance now states what the session costs
(*6 lifts · 18 sets · ~73 min*) instead of reprinting the programme, with the
first two lifts and *"+4 more"* for the rest.

| | before | after |
|---|---|---|
| visible words on Today | 311 | **222** |
| lifts shown before opening anything | 6 | **2** |
| caveats deleted | — | **0** |

That last row is the point. This pass could have made the screen shorter by
deleting the hedges — and the hedges are the honest part of a product that
estimates recovery from a log. They moved; they did not go. A DOM check asserts
each caveat string is still present, and another fails if a caveat is reachable
only by hover.

**A measurement error, corrected.** The earlier figure for the active session was
205 visible words; it was computed with a walker that did not skip `<svg>`
subtrees, so it counted the accessible `<title>` of every muscle region and every
exercise thumbnail. The true figure at that commit was **153**. The table in
§3.8 has been corrected rather than left flattering.

### 3.12 Small things that were wrong

- The sub-navigation's count badge ("Exercise library" + "88") is now
  `aria-hidden`, so the control is announced as *Exercise library*. The same for
  the active-session dot.
- A heading was added to the session without changing a single pixel of type:
  `.sess-ex-h{font:inherit;margin:0}`.
- The dashboard's dead `.dash-figlink-t` rule was deleted with its markup, rather
  than left as a style waiting for an element.

### 3.13 A real browser was finally run, and it disagreed with the page

Everything above was measured through jsdom: structure, wording, contrast
arithmetic, focus order. None of it could see the page. A headless Chromium was
made to run inside this environment (`@sparticuz/chromium@148` unpacked from an
npm tarball, launched through `puppeteer-core`), and `tests/browser.js` — 28
checks that already existed for exactly this — ran for the first time against
this build. It failed two, and reading the failures turned up five more.

What it saw, in the order it was found:

| what a screenshot showed | what the code said | why nothing caught it |
|---|---|---|
| every screen clipped by 200 px at 1024 px | `.shell{width:100%;margin-inline-start:200px}` — an over-constrained block; Chrome kept the margin and made the end margin −200 px, so the document measured 1224 px | `body{overflow-x:hidden}` hid the scrollbar; jsdom has no layout engine, so `scrollWidth` does not exist to compare |
| the anatomy viewer showed "Loading…" for ever | `.lab-loading,.lab-error{display:flex}` outranked the browser's `[hidden]{display:none}` | the element was correctly marked `hidden`; only a rendered page shows that hidden lost |
| the 3D canvas would not respond to a click | the hidden error overlay, empty and `position:absolute;inset:0`, sat on top of it | jsdom's hit-testing is not a paint order |
| Pause / Rest / Add exercise were three empty boxes | `.btn.quiet` is ink-on-paper; inside the charcoal HUD that is ink on ink | contrast was computed per token pair, and this pair (ink on ink) was never in the token table |
| "OKSession saved" | `.banner .ic` had no rule at all | the text was present and the words were right |
| "Exercise library 88" | `.subnav-cnt` had no space of its own | a bare number in the DOM reads identically to a bare number in a screenshot |
| the science tab bar's active tab was unreadable | `.chip.on` filled it charcoal while `.subnav-btn.on` set the label ink | the tab is a `.chip` for a test selector's sake; no rule said "not inside a tab bar" |
| the plan's three day cards were three slivers of 8 px type | the day switcher reuses `.day-grid` — the SVG week strip's `repeat(7,1fr)` — and had no rule of its own | the class *was* in the stylesheet, so "all named component classes exist" passed |
| the verdict word "TRAIN" ran under "100%" | the readiness meter shared the verdict's flex row with a 104 px floor, and its definition was a third child of that row | the elements existed and were in a sensible order; they simply did not fit |
| onboarding answers printed on top of their own radio box | the tile is a two-column grid and only the box was placed; the answer span auto-flowed into the 20 px slot, and its captions were `<span>`s with no line of their own | the markup was "correct" — a grid child needs a column |
| "1 lifts · 2 sets · ~8 min" | one template, `{n} lifts`, with a number dropped in | the string existed in seven languages and read fine at n>1 |

Two of these were also found by the existing suite the moment the browser ran
(the overflow and the canvas click). The other nine needed the screenshots.

**The fixes, and what now guards them.** The overflow is `width:auto`;
`[hidden]` is `display:none!important` (stated once, since component display
rules will keep out-ranking the UA sheet); the HUD's quiet buttons are styled
for the surface they are on and given `--hit`; the banner's status word is a
stamped tag; the tab count has a margin and a drawn middot; a `.chip.on` inside
a `.subnav` loses its fill; the day switcher has its own `plan-days` class and a
card; the readiness figure is a clamped column and the definition is its own
line under the row; onboarding tiles place both children and force their
captions onto their own lines; the cost line is three translated nouns joined,
with a singular form per language.

Five of them are now static assertions in `tests/design.js` (the stylesheet
cannot quietly lose `[hidden]`, the HUD's button colours, the banner tag, the
tab count spacing, the set-row grid, the tile's grid placement) and one is a
behavioural check in `tests/ui.js` (`sessionCostLine(1,1,8)` is singular in all
seven languages). The rest are covered by the browser suite itself, which is
the only place they *can* be covered.

**A measurement correction, from the same pass.** The set row was reported in
§3.8 as "fields naming their set, 54 of 54" — true, and yet those fields were
unreadable as a row: label, input and unit shared one flex baseline per field,
so the rep range (`6–10`) landed inside the RIR label and the RIR unit printed
a second "RIR" after a field already labelled RIR. It is a grid now — caption
above, number in the middle, unit after it, one baseline across the three.

**One thing the browser pass changed my mind about.** §6 of this document used
to say the visual pass was impossible here. It was not impossible, it was
unattempted: a Chromium binary is a 60 MB tarball on a registry that was
reachable the whole time. The report's §6 has been rewritten to say what was
actually seen, and the screenshots it took are described there.

---

## 4. Tokens and components

Tokens already existed and were not re-invented: one canvas (`--paper`), one
surface, one ink pair, one accent used for action and attention only, dark
surfaces confined to the immersive training and anatomy views, `--s1…--s8` on a
4 px scale, `--hit:44px`, radii and timings as variables.

Added in this pass:

| token / component | definition | where |
|---|---|---|
| `.dis` | one disclosure: native `<details>/<summary>`, 32 px summary, `--hit` expander under a coarse pointer, `+`/`–` glyph from CSS, `:focus-visible` ring | `css/app.css` |
| `.dis-t` | the summary's compact label (mono, 10 px, 0.1 em, uppercase) | `css/app.css` |
| `.sess-ex-h` | an exercise heading that does not look like one | `css/app.css` |
| `.tac` | the one text utility, declared once instead of inline in a screen | `css/app.css` |
| `anatomyFigure(…, {pointerOnly})` | figure stays tappable, leaves the tab order, announces itself and its next step | `js/ui/components.js` |

Removed: `.dash-figlink-t` (style with no element), `<button class="panel
dash-figlink">` (nested interactive content).

The science screen already used the same native disclosure for evidence
(`.ev-more`); the workout now uses the shared one instead of a fourth private
pattern. The static suite fails if a disclosure is restyled outside `.dis`.

---

## 5. Interaction spec for the new components

| state | behaviour |
|---|---|
| initial | closed; summary is one line, sentence-case label in mono caps, `+` at the trailing edge |
| trigger | tap or click anywhere on the summary row; `Enter` or `Space` when focused; a 44 px invisible expander answers coarse pointers |
| response | the browser toggles `open`; `+` becomes `–`; content appears directly below with no layout shift above it |
| transition | none. A disclosure that animates its height costs a frame budget on a mid-range phone and buys nothing; prefers-reduced-motion therefore needs no special case |
| persistence | open/closed is deliberately **not** persisted: a session opened tomorrow should not start with yesterday's options expanded |
| keyboard | summary is in the natural tab order, focus ring visible (`2px solid --burnt`, 3 px offset), `Tab` enters the revealed controls in DOM order |
| success | the revealed action runs exactly as before — no control was rewritten, only relocated |
| failure | if the revealed action fails, the existing toast/failure state reports it; the disclosure stays open so the user can retry |
| no script | `<details>` still opens without JavaScript; only the actions inside need it |

---

## 6. Accessibility, measured

| check | before | after |
|---|---|---|
| headings on the active session | 0 | 1 + one per exercise |
| buttons exposed on the active session | 99 | 33 |
| nested interactive elements on Today | 30 segments inside a `<button>` | 0 |
| focus stops contributed by the dashboard map | 31 | 1 |
| sub-navigation accessible name | "Exercise library88" | "Exercise library" |
| set fields naming their set | 0 of 54 | 54 of 54 |
| controls on the exercise atlas | 382 | 119 |
| words on the exercise atlas | 1 304 | 591 |
| controls exposed on Profile | 160 | 41 |
| page titles that are `h1` | 1 of 7 | 7 of 7 |
| top-level sections on Today | 9 | 3 |
| visible words on Today | 311 | 222 |
| horizontal overflow at the 1024 px rail | 200 px of every screen, clipped | 0 across 96 layouts |
| visible words in an active session | 826 | 153 |
| controls reachable at once in a session | 152 | 21 |

Contrast, target sizes, focus visibility, reduced-motion parity and the
"no colour-only feedback" rules are unchanged and still enforced by
`tests/design.js` (203 checks), the 28 real-browser checks in `tests/browser.js`
and `tools/qa_audit.js` (1 accepted Medium: the
`overflow-x:hidden` note in `ARCHITECTURE.md` §4).

---

## 7. Per-screen status

| screen | state | what is still weak |
|---|---|---|
| Onboarding | exercise step regrouped; eight steps, one question each | the middle steps are still one long column of chips; the step order has never been tested with a real first-run user |
| Today | action hierarchy, three bands, prose behind one tap | 222 visible words; whether that is still too many in a gym car park has not been watched |
| Plan | untouched | not re-audited this pass |
| Active session | one exercise open, the rest folded; rest timer readable without sight | the block is the only focus surface; whether 153 words is still too many has not been tested with a tired user |
| Exercise atlas | register rows, one control each, filters behind a disclosure | the sheet is now the only action surface — everything a row used to duplicate has to be there, and that is worth auditing next |
| Progress | untouched | charts and records re-verified for scale in the previous pass; drill-down not re-audited |
| Body / anatomy | figure semantics fixed | 59 controls on one screen; the muscle list duplicates what the figure already shows |
| Science | untouched | 26 controls, evidence disclosures already sound |
| Profile | four records; the pool is one accordion with an undo | every setting is now one tap deeper, and nothing measures whether people find it |

---

## 8. Limits of this pass

- **Visual inspection happened late, and only in headless Chromium.** A browser
  was made to run in this environment at the end of the pass
  (§3.13) and it found eleven defects the structural audit had passed. It is
  still not a device: no iOS Safari, no Firefox, no notch insets, no collapsing
  address bar, and motion was never watched.
- ~~**No WebGL verification.**~~ **Verified.** SwiftShader rendered the atlas in
  headless Chromium: 218 meshes, real framebuffer pixels, front ≠ back, the
  burnt highlight appears on selection, and raycast picking returns a named
  muscle.
- **The census counts are structural.** "Words" is text content, not reading
  effort; "controls exposed" ignores visual weight.
- **Onboarding has been rendered, not used.** Eight steps were photographed at
  390 px — which is how the tile that printed its own answers over its radio box
  was caught — but none of them has been walked by a person who has never seen
  the app.
- **Discoverability was not tested.** Collapsing a settings page is a bet that
  the summary line is enough to make someone open it. Nobody has watched a real
  user look for "units".
- **The rest timer stops when the device sleeps.** It is computed from an
  absolute end time, so it is correct the moment the tab resumes — but nothing
  fires while the screen is off, and there is no OS notification. "Survives a
  locked screen" means the arithmetic survives, not that it can interrupt you.
- **The atlas and the profile were measured, not seen.** Row density, the 72 px
  row height, the sheet hand-off and four stacked records are structural claims;
  nobody has looked at them on a 390 px screen.
- **Heading levels still jump on Body, Progress and the session plan** (h1 → h3
  inside the first panel; measured at the end of this pass: Body `h1,h3`,
  Progress `h1,h3×6`, session plan `h1,h3` — Science is now `h1,h2`). The
  panels share one `h3` component and were left alone rather than half-converted.
- **Offline persistence is now verified for real** (service worker populated,
  network severed, page reloaded: the app boots with all 218 muscles), and the
  shipped single-file bundle renders offline too. The rest timer and the print
  layout were still not re-verified in this pass; their suites are green, which
  is not the same as inspected.

---

## 9. Next, ranked by user impact

1. **A rest timer that can reach you when the screen is off** — a service-worker
   notification, or an honest "keep this tab open" note.
2. **Body screen.** Drop the duplicate muscle list once the figure carries the
   names, or drop the figure's list — not both.
3. **The exercise sheet** — now the atlas's only action surface; it has never been
   audited on its own.
4. **The plan screen** — the only surface never audited in this phase.
