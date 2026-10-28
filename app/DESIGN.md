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

### 3.14 The second browser pass: the screens the first one did not visit

The first pass photographed Today, Session, Body, Progress, Science and the
atlas. It never opened a sheet, the plan editor, a lesson or the print card.
The second pass did, and the exercise sheet — the surface §9 had just named as
*the one that has never been audited alone* — was being rendered as an A4
poster on a phone.

| what a screenshot showed | the cause |
|---|---|
| the exercise sheet twice the width of the screen, its content 4 900 px down, only its heading visible | the print document's own rule was a bare `.sheet{width:210mm;min-height:297mm;…}`, and the modal overlay is also called `.sheet`. Every bottom sheet in the app was wearing A4 paper. |
| the sheet hung from the top with a gap at the bottom, the atlas visible through it | the overlay is its own backdrop (`class="sheet sheet-backdrop"`), and `.sheet-backdrop{inset:0}` pins `top:0`; `max-height:88vh` then left 12% of the screen showing the list behind |
| the sheet opened on two full-body anatomy figures, ~760 px tall each, and put the exercise's record 1 600 px below them | `.ex-vis-figs` had no rule of its own: two stacked full-width figures |
| there was no way out except by scrolling 1 845 px to a Close button at the bottom | the only Close was the last child of the panel; tap-outside and Escape worked and nothing said so |

Four fixes, all in the stylesheet except the last, which is markup: the print
geometry is scoped to `#printRoot .sheet`; the overlay sets `top:auto`; the two
figures are a capped pair side by side; and the sheet's title row is sticky and
carries the Close control — one Close, not two, so a screen reader is not given
the same name twice.

**Everything else in that pass held.** The plan editor, the settings accordion,
a science lesson, the progress drill-down and the print card all rendered
correctly at 390 px, and the live session's set row now reads as three captioned
fields with one baseline:

```
LOAD        REPS        RIR
62   kg     9   6–10   —   optional
```

### 3.15 The keyboard: the one control the session exists for, covered

The third browser pass photographed the live session at **390 × 420** — a 390 px
phone with the numeric keyboard up, which is the screen a person actually uses
while standing over a bench.

| | before focus | while typing |
|---|---|---|
| the reps field | y 582–624, below a 420 px viewport | scrolled to y 189–231, visible |
| the set's **Log Set** button | — | y 368–404 |
| the tab bar | — | painted from y 355 down, **over the button** |

Chrome scrolls a focused field into view, so the field was fine. The button that
commits it was not: `nav.tabbar` is `position:fixed;bottom:0`, and with the
keyboard up it sat exactly on the row the session exists to produce. A thumb
would have hit *Progress*.

Three changes, one rule — **while a field has the keyboard, the thing the screen
exists for stays reachable**:

- a `focusin`/`focusout` pair on `document` sets `body.typing` (deferred by a
  tick, so moving between two fields does not flash the bar in and out);
- below 1024 px the tab bar translates off the screen while that class is
  present — it is behind the keyboard in reality anyway — and returns when the
  field is left. The side rail at ≥1024 px is untouched: no keyboard sits on it;
- the set being edited pins its action row to the bottom of the card
  (`.setcard:focus-within .set-actions{position:sticky}`), so the button is in
  reach without scrolling, and sits above a running rest timer rather than
  under it.

Measured after: Log button y 377–413, tab bar top 427 (off screen), the field
visible, the button still the top element at its own centre
(`elementFromPoint` returns `logbtn_0_0`), and the bar back at 355 the moment
focus is released. With a rest timer running the action row sits at 368–421 and
the strip at 272–356: no overlap.

Guarded by five real-browser checks (group 3b in `tests/browser.js`), five
behavioural checks in `tests/ui.js` group 26, and three static assertions in
`tests/design.js`. Falsified: disabling the one CSS rule that hides the bar
turns two of the browser checks red, and one of them names the overlap:
`log 377..413 of 420, hit=`.

### 3.16 Structure: one h1, and no heading level missing

The report's §7 has carried this as an open item since the first pass: *heading
levels jump on Body, Progress and the session plan*, `h1` straight to `h3`. It
was left alone because the panels share one `h3.sub` component and converting
half of it would have been worse than leaving it.

The component is `.sub`, not `h3`. Styling now stands on the class:

```css
h1.title, h2.title, h2.sub, h3.sub { … }   /* one type, four places */
```

and every heading that sits directly under a screen's `h1` is an `h2`:

| screen | before | after |
|---|---|---|
| Body | `h1, h3` | `h1, h2` |
| Body, a muscle open | `h1, h3, h3, h3, h3` | `h1, h2, h2, h3, h2` |
| Progress | `h1, h3 × 6` | `h1, h2 × 6` |
| Session plan | `h1, h3` | `h1, h2` |
| A lesson | `h2, h3` (no `h1` at all) | `h1, h2, h3` |
| Exercise library | `h1` | `h1` (unchanged) |

Two things were not simple renames. `emptyState()` hard-coded its `h3`, which is
right inside a section and wrong directly under a screen's `h1` — it now takes
the level as an argument, defaulting to 3. And a lesson replaces the screen
rather than sitting in it, so its title was the only screen title in the product
without an `h1`.

`tests/ui.js` group 27 walks twelve screen states — including the unselected
Body, a live session, the plan tab, a sheet and a lesson — and fails on a second
`h1` or a level that jumps by more than one. The level sequence is printed for
each, so the next regression is readable rather than a count.

### 3.17 Body: the list is the key, and an icon that ate the page

The report asked for the duplicate muscle list to be dropped — "either the
figure carries the names or the list does". Measured, the duplication was not
where the wording suggested:

| | before |
|---|---|
| visible names on the figure | **none** — the twelve regions carry `<title>` tooltips, not labels |
| focus stops on Body | **34** |
| of those, figure hit paths | **14**, announcing `Chest — no data`, `Abdominals — no data`… |
| of those, list rows | **12**, announcing the same groups and the same states |
| a separate four-swatch legend under the figure | `READY · CAUTION · REST · NO DATA` |

So the words were not duplicated on screen — the *tab stops* were, fourteen plus
twelve for the same twelve things — and the legend duplicated the state words
already sitting in each list row. Deleting the list would have deleted the only
keyboard path to the map; deleting nothing would have left the double control.

What changed instead:

- the figure is `pointerOnly` on this screen, exactly as on the dashboard: still
  tappable, out of the tab order, with its `role="img"` text alternative intact.
  Body is now **19** focus stops, and the twelve that remain are the list;
- the legend is gone. Each list row already carries a swatch, the group name and
  the state in words — the key and the selector became one thing;
- each row states itself: `aria-label="Chest, No data"`, `aria-pressed` for the
  current selection.

**And the defect the full-page screenshot found.** Below the figure sat a hint
row reading *tap a muscle group to open its record* with a tap icon. The icon was
an inline `<svg viewBox="0 0 24 24">` with no width, so in a 547 px column it
rendered as a **547 × 547 px** black glyph and the hint row was 564 px tall. The
muscle list began 560 px further down the page than it needed to. At 1280 px:
hint row 564 → 13 px, list top 1602 → 1051, document 2163 → 1612. Nothing else on
the screen had moved, which is why every earlier screenshot — all of them
viewport-clipped above that point — missed it.

### 3.18 The two colours that were never text colours

`--tech` (3.72:1) and `--burnt` (2.95:1) fail AA as text on paper. Both have
text-safe siblings (`--tech-ink` 5.00, `--burnt-text` 4.96) and both were already
being used correctly for most of their life — but five places set `color` to a
failing token, and "we know" is not a mechanism.

- The `+`/`–` disclosure glyph in three components was `--burnt` on paper →
  `--burnt-text`.
- On ink, the accent used as *text* (the rest strip's label, the live session's
  status line, two dark-surface disclosure glyphs) is now `--accent-on-ink`
  `#E08A5A` — 6.12:1 on charcoal, where the base orange was 4.6:1 at 9–12 px.
- `--tech` and `--burnt` remain, for fills, strokes and borders, where a 3:1
  non-text bar applies and they pass.

`tests/design.js` now fails on any `color: var(--tech)` or `color: var(--burnt)`
in the stylesheet or in the five UI modules that emit inline styles. Falsified by
adding one line and watching it go red: `-> color:var(--burnt)`.

### 3.19 A key that no language had

The empty state on Body rendered the literal string **`body.selectBody`** in all
seven languages. The key had never been written; `t()` returns its argument when
it finds nothing, which is the correct behaviour and also a silent one.

`tools/keyscan.js` renders six screens × seven languages and fails when any i18n
key reaches the screen verbatim — but it called `selectMuscle('chest')` before
scanning Body, and the empty state only exists when nothing is selected. The one
screen state that could show the bug was the one state the scan never visited.

Three changes: the key exists in all seven languages; Body is scanned **before**
and after a muscle is chosen; and a static pass now reads every `t('literal')`
in `js/ui/` and `js/app.js` and fails if no dictionary defines it. Falsified by
deleting the English entry and watching the scan report
`untranslatable keys: en:body.selectBody` and `rendered verbatim: en :: body.selectBody`.

### 3.20 Rest can reach you, or it says it cannot

The first item on the report's list was the one place the product under-delivers
on a promise the session screen makes: *rest 120 s* starts a countdown, and then
the person puts the phone down and looks at something else. A toast they will
never see is not an alert.

What a page can honestly do about that, in order of what it can promise:

| what | promised? |
|---|---|
| a toast and a strip while the screen is on | yes, and it worked |
| a system notification when the tab is backgrounded, if the person opted in and granted permission | yes — the service worker posts it |
| a notification when the phone has suspended the tab | **no** — the timer is a page timer; it fires when the page runs again |
| a notification when the tab is closed | **no** |
| waking the phone | **no**, and nothing claims to |

So: an **opt-in switch in Profile** (`restNotify`, off by default), permission
requested from that switch and nowhere else — never on boot — and
`notifyRestDone()` posting through the service worker **only** when
`document.hidden && Notification.permission === 'granted'`. With the screen on,
the toast is enough and no notification is posted; with the tab suspended,
nothing is claimed. The hint under the switch says exactly that in all seven
languages, including the two rows marked *no* above. Clicking the notification
focuses the window or opens the app (`sw.js` `notificationclick`), because an
alert that leads nowhere is a dead end with a sound.

`tests/ui.js` group 28 stubs `Notification`, `navigator.serviceWorker` and
`document.hidden`, and checks: nothing is requested on boot; off is silent; on +
granted + hidden posts exactly one notification with the translated title and
`tag: ancestor-rest`; on + granted + **visible** posts nothing; denied posts
nothing; unsupported degrades quietly; turning it on asks once and records the
answer; turning it off does not ask again; and a rest that runs to zero posts by
itself. `tests/design.js` holds the three static facts (opt-in check, hidden
check, click handler) so a refactor cannot quietly remove them.

### 3.21 The tile that only existed in onboarding

The rest alert needed a switch, and the product already has one: `.tile`, used by
onboarding and by Profile's three accessibility toggles. Screenshotting the new
one showed:

> **High contrast**Stronger borders and text for easier reading

— a title running into its description, with a **0 × 0 checkbox** beside it. The
new switch was not the defect: `.tile .t`, `.tile .d` and `.tile .box` were
styled **only** under `.onb-frame`, and the comment sitting above those rules
describes this exact bug:

> *"the captions are spans, so they also need to be told they are lines: without
> that the title ran straight into its description ("Standard volumeThe most
> widely supported approach")."*

The fix had been written against the screen being looked at, not the component.
It is now base-level — caption block, description block, 18 px box, filled when
chosen — and onboarding keeps only its larger type as an override. The
regression guard asserts that the three base rules exist at the start of a line
(an `.onb-frame`-prefixed copy does not count) and that the caption and
description are `display:block`; falsified by deleting one `display:block`.

This is the same failure as §3.17 and §3.19 in a different costume: the thing was
never seen because the screen it lives on was never captured whole.

### 3.22 The plan screen: a row laid out at 26 px

The plan screen was the last surface in this phase nobody had looked at, which is
also the reason it was the worst. At 1280 px:

| | before | after |
|---|---|---|
| width given to the exercise column | **26 px** | 946 px |
| an exercise title | one word per line, overflowing into the row below | 17 px display, one line |
| document height, 1280 px | 3 200 px | 2 198 px |
| document height, 390 px | 3 417 px | 2 720 px |

The row was always a 26 px index column and then the exercise —
`grid-template-columns:26px 1fr auto` — but the markup wraps the index *and* the
exercise in `.plan-ex-top`, and that wrapper was being placed in the first
column. The title, the prescription chips, everything, was laid out inside 26 px.
`display:contents` on the wrapper puts the two back where the grid expects them,
and every other child of the row is content in the second column.

**The duplicate nobody had noticed.** Each row then said the same thing twice:
*"Previous · First time with this exercise"*, and immediately below it
*"First time — establish a baseline"*. Six rows, twelve statements, one fact. The
recommendation banner carries it now, once, because the banner is the line that
also says what to do; the "previous" slot is reserved for an actual previous.

**And the test that could not fail.** The check that noticed this duplication was
passing for the wrong reason: `logic.js` asserted
`d.body.textContent.indexOf(t('log.noPrev')) >= 0`, and in this harness the i18n
dictionaries are **inlined into the document**, so `d.body.textContent` contains
the key's own definition and the assertion is true whatever the screen says. Three
such checks existed; they read `#screenBody` now. This is the same class of
mistake as §3.19 — a check whose scope was wider than the thing it claimed to
check — and it is why the guard for this screen is a *measurement*:

`tests/browser.js` group 3c loads the plan at 390 and 1280 px and asserts that the
main column gets at least (row width − 60) px, that the index column is 20–34 px,
and that no row holds content wider than itself. Falsified by setting the wrapper
back to `display:flex`: the exercise column collapses to 26 px and two checks go
red, one naming it (`{"mainW":26,"idxW":12,"squeezed":1}`).

### 3.23 The exercise atlas: a grid declaration with nothing behind it

The whole-page capture (§3.21's method, applied to every screen) turned up the
tallest page in the product: the Exercise Atlas, **7 684 px** at 1 440 px, one
column of 88 rows, each row 1 000 px wide with 400 px of content in it. Three
faults stacked on each other:

1. **The wrapper was doubled.** `h += '<div class="ex-grid" data-stagger>'` was
   written twice in a row and closed once. The browser nested the register inside
   itself, and the outer grid spent one of its two columns on the inner wrapper —
   so every card was laid out at **268 px** inside a 560 px column while 560 px of
   the page sat empty beside it.
2. **The two-column rule was inert.** `.ex-grid` was `display:block`, while a
   `@media (min-width:560px)` rule set `grid-template-columns` on it. A block
   element ignores that property. The intent had been on the page since the atlas
   was written and had never once taken effect.
3. **And 560 px is the wrong breakpoint anyway.** With the grid switched on, the
   columns at 560 px came out 244 px wide and **85 of 88 cards clipped their own
   text**. Two rows of exercise need 300 px each: a 56 px drawing, a title, a
   chevron. The rule moved to 720 px.

| | before | after |
|---|---|---|
| document height, 1 440 px | 7 684 px | **4 118 px** |
| width of an exercise card at 1 440 px | 268 px, in a 560 px column | 560 px, in a 1 144 px register |
| columns at ≥720 px | 1 (a block that wanted to be a grid) | 2 |
| cards clipping their text at 560 px | 85 of 88 | 0 |

A fourth, smaller fault came with them: the search field was the only child of
the toolbar that could shrink, so beside a row of muscle chips it collapsed to
**215 px** and cut its own placeholder mid-word — *"Search by movement, m"*. It
now asks for 280 px, caps at 520 and takes a line of its own rather than a stump.

Guarded at three levels: a jsdom check walks seven screens and fails if any
`[data-stagger]` contains another one (or is empty); `tests/browser.js` group 3d
measures the register at 1440, 1024, 720, 560 and 390 px and asserts the column
count, that a card owns its column, that the search field is never narrower than
280 px, and that nothing is clipped; and
`tests/design.js` 8q reads the stylesheet and fails if `.ex-grid` is not
`display:grid` or if the two-column rule is back at 560 px. Each was falsified
once by restoring the fault.

**The instrument had to be fixed first.** Applying the whole-page capture to
every screen meant looking at the capture code, and it was lying in two ways. Six
of its thirteen shots were gated on widths the loop never walked (`vw === 360`
and `vw === 1280` inside a loop over `[320, 375, 390, 768, 1024, 1440]`), so they
had never been taken — evidence in a directory listing, not on disk. And the
shots it did take were made 60 ms after a screen rendered, while the stagger
reveal was still running: the atlas was photographed with three rows in, a fourth
fading, and eighty-five waiting, which is a page of pure margin that nobody has
ever seen. Every capture now goes through one helper that runs to the full
document height and waits for `document.getAnimations()` (raced against a 1 200 ms
cap, so a spinner cannot hold the camera). `tests/design.js` 8p fails if any
capture sets `fullPage:false`, if a capture bypasses the helper, or if a capture
gate names a width the loop does not walk. Both were falsified by putting the
fault back.

### 3.24 A fold has to name what it holds

The profile is four `<details>` records that state their own value (§3.11). A
person who has forgotten where the unit lives reads four summary lines, and until
now those lines said *"Standard volume · 3d · 50 minutes · Full gym"*,
*"Night shifts · 7 hours per night"*, *"100% · English"*, *"0 Sessions"*. The
kilogram setting was inside the one group that opens by default and named
nowhere; export was inside the Data fold with no word for it anywhere on the page.

Watching five people would answer the question properly, and that is still open.
What can be done without them is to make the page answer the question it creates:
the Programme summary now ends with the unit in use (**kg**), and the Data
summary always states the last export (*"Last JSON backup 12 Oct 2026"*, or
*"—"* when there has never been one). Both are the values themselves, not
advertisements for a button — the fold still reads as a record.

`tests/ui.js` group 17 closes all four groups and fails if the summaries stop
naming the unit, the shift pattern or the backup. Falsified by removing `unit()`
from the summary: one check fails, naming the summary text it read.

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
`tests/design.js` (227 checks), the 63 real-browser checks in `tests/browser.js`
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
3. ~~**The exercise sheet** — the atlas's only action surface, never audited on
   its own.~~ **Done** (§3.14): it was rendering as an A4 poster on a phone, with
   two stacked anatomy figures and no visible way out. It is now a bottom sheet
   with a sticky title row, a paired figure block and a Close control in reach.
4. **The plan screen** — the only surface never audited in this phase.
