# ANCESTOR — design pass, final report

Branch `arena/c263a64a-ancestor`, 45 commits over `62aa6218`, 152 files touched.
The work is in the application, not in a slide deck: `app/` holds the code,
`app/DESIGN.md` holds the design system record this report summarises, and the
site in `site/` is the public write-up.

Everything claimed below was measured in this repository — by ten jsdom suites,
and, for the visual claims, by a headless Chromium driven through
`tests/browser.js`. Nothing is claimed that could not be re-run, and §6 states
exactly what was seen and what a headless browser still cannot tell you.

The visual pass happened last, and it is the most useful thing in this
document: it found eleven rendered defects that every structural suite had
passed. Each pass since has found more, and the most recent ones came from four
places: a capture that covered the whole page instead of the first screen, reusing
a component outside the screen it was written for, a surface nobody had opened at
all, and a test whose scope was wider than the claim it made, and an instrument that
was quietly not measuring what it said it measured.

**How to re-verify**

```
cd app && for t in design premium ui run inclusive personas science logic anatomy print; do node tests/$t.js; done
node tests/browser.js          # 64 real Chromium: WebGL, layouts, keyboard, plan rows, atlas, SW offline
node tools/keyscan.js          # 1,668 keys × 7 languages, 0 leaks
node tools/qa_audit.js         # 1 accepted Medium (documented)
python3 build.py && node tools/smoke_dist.js     # self-contained, BUNDLE OK
python3 site/build.py && python3 site/check.py   # 62 site checks
```

Current: **1,466 checks over ten headless suites**, all green —
design 235, premium 215, ui 314, run 144, inclusive 70, personas 73, science 125,
logic 138, anatomy 64, print 88 — plus **93 real-browser checks** in
`tests/browser.js`, run in headless Chromium with WebGL, all green.

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

**Eleven more were found only when a browser was finally run** — clipped screens
hidden by `overflow-x:hidden`, a loading overlay that never hid, ink-on-ink
buttons in the dark session HUD, an unreadable active tab, three day cards
compressed into slivers, onboarding answers printed over their own radio, and
"1 lifts · 2 sets". They are listed with their causes in §8 and in
`app/DESIGN.md` §3.13, and they are the reason §6 was rewritten: the structural
audit was thorough and still passed a page nobody could read.

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

Eleven steps, one question each, and the first of them is **the language**.
Before this pass the only way to change language was a `langsel` strip of seven
26 px buttons in the masthead — on every screen, in a script the reader might not
know, and it vanished from the header entirely below 400 px. A first launch now
opens on one screen: the seven languages written in their own names and scripts
(Arabic right-to-left inside its own row), a tap applying the language
immediately, and `Continue` recording the answer. The row is a native button with
`lang` and `dir`, so a screen reader switches voice at the row instead of reading
an Arabic name with an English one. The strip in the masthead is gone; changing
language is one row later, under Profile → Accessibility & display.

The next two questions are new, and they are the feature: *which areas do you
want to prioritise* (nine, multi-select, plus a "whole body, balanced" answer),
and *how should the programme lean* (five approaches). Both write into
`profile.emphasis` / `profile.priorities`, and both are **preferences that never
subtract**: the engine changes which movement opens a session and may add at most
two extra movements a week in the favoured pattern. A balanced plan is
byte-identical to the plan this app produced before the feature existed — the
regression is asserted, not assumed. Changing the answer never rewrites the
programme in the drawer: the plan carries its own `emphasis` stamp, the profile
shows a warning when the two disagree, and `Rebuild plan` is the only control
that applies it.

Each step asks one question, with it explained before it is asked,
a visible step count, `Back` on every step, and "optional" that really is
optional (skipping does not block finishing, and the starting point is still a
usable programme). The exercise step is the change that matters: it now shows
what the person already has — 90 controls in the DOM, **14 reachable at once**,
88 of 88 pressable chips carrying `aria-pressed` — because the first question in
a gym app should not be a curriculum.

**The bar is four destinations, not six.** Home / Session / Progress / Profile —
the three places a thumb goes mid-set, plus the record. Body and Science left the
bar; both keep their 24 px marks, both are full-width rows under Profile →
Explore, and Today links to both. The indicator element hides itself when a view
is outside the bar rather than pointing at nothing, and the labels got the 1.5 px
the extra room bought (`8 px → 9.5 px`).

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

**This section was rewritten.** It used to open with "no pixel of this
application was visually inspected". That was true when it was written and it
stopped being true in this pass: a headless Chromium was installed inside this
environment (the `@sparticuz/chromium@148` binary, unpacked from an npm tarball
that the sandbox's registry allowlist already covered, launched through
`puppeteer-core`), and `tests/browser.js` — a 28-check suite that had never been
run against this build — was executed.

**What was actually seen**

| what | how | result |
|---|---|---|
| real WebGL 2.0 rendering of the anatomy atlas | SwiftShader, framebuffer sampled | 218 meshes, real non-empty pixels, front and back genuinely different, burnt-orange highlight on selection, raycast picking on the canvas |
| layout and horizontal overflow | Chromium at 320, 375, 390, 768, 1024, 1440 px, 8 views, LTR **and** RTL = 96 layouts | 96/96 clean **after** a fix; 5 clean failures before it |
| service worker + genuine offline reload | cache populated, network severed, page reloaded | app boots offline with all 218 muscles |
| the shipped single-file bundle | `dist/ancestor.html`, gzip-b64 decompressed in-page, network severed | renders offline, zero console errors |
| accessibility tree | CDP `Accessibility` domain in real Chromium | every interactive control and dialog has a non-empty name |
| the screens themselves | full-page and clipped screenshots at 320, 390, 768, 1024, 1280, 1440 px, English and Arabic | eleven visual defects, listed in §8 and in `app/DESIGN.md` §3.13 |
| a second pass over the screens the first one skipped | exercise sheet, plan editor, lesson, settings fold, progress drill-down, print card, onboarding at 320 px, rest timer | the exercise sheet was rendering as an A4 poster on a phone, with no visible way out (`DESIGN.md` §3.14). The rest held. |
| the on-screen keyboard | 390 × 420, a numeric field focused in a live session | the tab bar was painted over the set's **Log Set** button (`DESIGN.md` §3.15); fixed |
| the workout plan, the last unaudited screen | full-page at 1280 and 390 px, plus a per-row measurement | the exercise column was laid out at **26 px**: every title wrapped one word per line and overflowed its row, with no document-level overflow for the audit to catch (`DESIGN.md` §3.22) |
| rest alerts, with the tab in the background | `Notification` + service worker stubbed in jsdom; real `showNotification` call asserted | opt-in, asked only from its own switch, posted only when the tab is hidden and permitted (`DESIGN.md` §3.20) |
| the new rest-alert switch, on Profile | 1280 px, element capture | the tile component rendered as `High contrastStronger borders…` with a 0 × 0 checkbox **outside onboarding** — a fix that had been written against one screen (`DESIGN.md` §3.21) |
| the exercise atlas, whole page at 1440 px | full-page capture, then measured at five widths | the register was **7 684 px** tall in one column: a doubled wrapper and a `grid-template-columns` rule on a `display:block` element, so its two columns had never existed (`DESIGN.md` §3.23) |
| the capture harness itself | read the code that takes the shots | six of thirteen captures were gated on widths the loop never walked, and the shots it did take were 60 ms into the stagger reveal — an "empty" atlas nobody had ever seen (§3.23) |
| the folded settings on Profile, closed | every summary line read with all four groups shut | the unit in use and the export appeared nowhere on the page until a group was opened (`DESIGN.md` §3.24) |
| a full-page capture of Body, not just the first screen | 1280 and 390 px, whole document | a tap icon with no width rendering as a **547 × 547 px** glyph, 560 px of empty page between the figure and the muscle list (`DESIGN.md` §3.17); plus the raw key `body.selectBody` in all seven languages (§3.19) |

**What the screenshots changed.** Nine of the eleven defects found visually were
invisible to every check that existed: clipped layouts hidden by
`overflow-x:hidden`, a loading overlay that never hid, a hidden error box eating
the canvas's clicks, ink-on-ink buttons inside the dark session HUD, a status
word glued to its sentence, a count glued to a tab label, an unreadable active
tab, three day cards compressed into slivers of 8 px type, the verdict word
printing under the readiness figure, onboarding answers painted on top of their
own radio, and "1 lifts · 2 sets". All of them are fixed and five are now
guarded by static assertions.

**What is still not inspected, and why**

- **Real devices.** Everything above is headless Chromium at a fixed viewport
  and 1× (occasionally 2×) device pixel ratio — no `env(safe-area-inset-*)`
  notch, no iOS Safari address-bar collapse, no Firefox, no Android WebView.
- **Thumb reach and one-handed use at 390 px.** A screenshot shows that a target
  is 44 px; it cannot show that a tired person's thumb lands on it.
- **Motion.** Screenshots are stills. Transitions, the reduced-motion media
  query and the sliding tab indicator were reasoned about and are structurally
  asserted, not watched.
- **Long-language stress.** German compounds and Arabic shaping were rendered and
  checked for overflow, but only in the strings the app ships — a user's own
  units or a longer name are still untested.
- **The JS-disabled path.** `<details>` is native and the app degrades per
  component, but no run has been done with scripting off.
- **The self-checked numbers in §1–3 are still structural.** Word counts and
  control counts are DOM counts. The browser pass tells us the pages look right;
  it does not tell us anybody understood them.

**A measurement error, corrected.** The active session was earlier reported at
205 visible words. That figure came from a walker that did not skip `<svg>`
subtrees: jsdom exposes those element names lower-case, the filter compared
upper-case, and the accessible `<title>` of every muscle region and thumbnail was
counted as prose. The true figure at that commit is **153**.

---

## 7. Accessibility improvements

| check | before | after |
|---|---|---|
| page titles that are `h1` | 1 of 7 | 7 of 7 |
| headings on the active session | 0 | 1 + one per exercise |
| controls exposed on the active session | 159 (99 of them buttons) | 23 |
| nested interactive elements on Today | 30 segments inside a `<button>` | 0 |
| focus stops contributed by the dashboard figure | 31 | 1 |
| focus stops on Body (figure + muscle list) | 34 (14 of them the figure, announcing the same twelve groups as the list) | 19 |
| heading levels on Body / Progress / session plan | `h1,h3` / `h1,h3×6` / `h1,h3` | `h1,h2` / `h1,h2×6` / `h1,h2` |
| screens starting with an `h1` | 6 of 7 | 7 of 7 |
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
| `--accent-on-ink` | 6.12 | ✓ on charcoal — the accent as text on ink |
| `--ok` | 5.88 | ✓ |
| `--warn` | 4.79 | ✓ |
| `--alert` | 5.81 | ✓ |

The two failures are now guarded rather than noted. Both colours are specified
for marks and both have a text-safe sibling; five places had nonetheless set
`color` to them, and on the dark surfaces the text-safe sibling was the wrong
one — the accent as text on ink needed a lighter value, `--accent-on-ink`
(#E08A5A, 6.12:1), because the base orange was only 4.6:1 at 9–12 px small caps.
`tests/design.js` now fails on any `color: var(--tech)` or `color: var(--burnt)`
in the stylesheet or in the five modules that emit inline styles (`DESIGN.md`
§3.18), and the guard was falsified by adding the line back.

**Two defects the browser found that no contrast table could.** The session HUD's
quiet buttons were ink on charcoal (2.6:1 — the button text and the surface were
both `--ink`), and the Science tab bar's active tab was ink on charcoal for the
same reason, because the tab carries `.chip` as well as `.subnav-btn`. Both were
invisible to a token audit: the ink pair is fine on paper, and these two
surfaces put it on the one surface it must never meet. The HUD's buttons are
now ivory on charcoal with the full 44 px target, and a `.chip.on` inside a
`.subnav` no longer takes the chip fill.

**Closed in this pass:** heading levels no longer jump. Body, Progress and the
session plan were `h1 → h3`; the shared `.sub` type now sits on the class rather
than the tag, so every panel directly under a screen's `h1` is an `h2`, a lesson
finally has an `h1`, and the two empty states that stand at the top of a screen
take a level argument instead of hard-coding `h3`. Twelve screen states are
walked by `tests/ui.js` group 27, which fails on a second `h1` or a jump
(`DESIGN.md` §3.16).

---

## 8. Incomplete features and limitations

- **Real devices were not seen.** Headless Chromium at fixed viewports is not an
  iPhone: no notch insets, no collapsing address bar, no iOS Safari, no Firefox.
  Thumb reach, motion and long-language stress are still argued rather than
  observed. §6 lists what was seen and what was not, precisely.
- **A browser pass is now possible in this environment, and that changes the
  standing of every earlier claim.** The pass was not available when the first
  version of this report was written; it is available now, and it found eleven
  rendered defects that the structural suites had passed. Anything in §1–3 that
  is stated as a count is still a DOM count, not a measurement of the page.
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
- ~~One Medium is accepted: `body{overflow-x:hidden}` hides horizontal overflow
  instead of preventing it.~~ **Closed 2026-10-28** — the rule was deleted, 176
  layouts and four overlay surfaces verified clean without it, and the QA suite
  now records zero issues.

---

## 9. Next improvements, ranked by user impact

1. ~~**A rest timer that can reach you when the screen is off.**~~ **Done, as
   far as a page can honestly go.** An opt-in switch posts a service-worker
   notification when rest ends and the tab is in the background; permission is
   asked for from that switch alone; with the screen on the toast stands; and the
   hint states the two cases it cannot cover — a suspended tab and a closed one
   (`DESIGN.md` §3.20). What is left here is the platform's, not the page's: a
   real alarm needs a native shell or a push server, and this app has neither
   backend nor store presence by design.
2. ~~**Body: drop the duplicate muscle list.**~~ **Done — but not by deleting
   the list.** Measured, the figure carried no visible names at all: the
   duplication was fourteen focus stops plus twelve for the same groups, and a
   four-swatch legend repeating the state words the list already prints. The
   figure is now `pointerOnly` (tappable, out of the tab order), the legend is
   gone because each row is its own key, and Body is 34 → 19 focus stops
   (`DESIGN.md` §3.17).
3. ~~**Audit the exercise sheet on its own.**~~ **Done** in the second visual
   pass — it was the worst surface in the product: an A4 document on a phone
   (794 px wide, 4 937 px tall, 200 px of it clipped) with its only Close button
   1 845 px down the page. Now 390 px wide, 1 845 px tall, bottom-anchored, with
   a sticky title row and a 61 × 44 px Close at the top (`DESIGN.md` §3.14).
4. ~~**Audit the plan screen.**~~ **Done, and it was the worst surface left.**
   The row's exercise column was 26 px wide — it was being placed in its own
   index column — so every title wrapped one word per line and ran under the row
   below; the document only got shorter by a third once fixed. Each row also
   stated "first time" twice, and the test meant to catch that was matching the
   inlined dictionary rather than the screen. `DESIGN.md` §3.22; guarded by
   measurements at 390 and 1280 px in `tests/browser.js` group 3c.
5. ~~**Fix the heading levels.**~~ **Done, whole component.** `.sub` moved from
   the `h3` tag to the class, so Body, Progress and the session plan are `h1,h2`;
   a lesson gained the `h1` it never had; `emptyState()` takes its level instead
   of hard-coding `h3`. Twelve screen states are walked by a test that fails on a
   second `h1` or a skipped level (`DESIGN.md` §3.16).
6. ~~**Retire or guard the two failing colour tokens.**~~ **Guarded.** Five
   places set `color` to `--burnt`; they now use `--burnt-text` on paper and a new
   `--accent-on-ink` (6.12:1 on charcoal) on ink. `tests/design.js` fails on
   `color: var(--tech)` or `color: var(--burnt)` anywhere in the stylesheet or the
   five modules that emit inline styles, and the guard was falsified by putting
   the line back (`DESIGN.md` §3.18).
7. **Watch five people onboard.** Everything about the eight-step flow is an
   argument; ten minutes of observation would replace most of it.
8. ~~**Measure discoverability of the folded settings.**~~ **Answered on the page,
   not on people.** With all four groups closed, the summaries named the shift
   pattern and *neither* the unit in use nor the export; both are named now, and a
   check closes every group and fails if they stop being named (`DESIGN.md`
   §3.24). What is still open is the half a test cannot do: five people looking
   for the unit, timed.
9. ~~**A browser pass at 320, 390, 768 and 1440 px.**~~ **Done**, twice — and it
   was worth more than any other item on this list, which is why it now lives in
   the evidence rather than the plan. The second pass went where the first had
   not: an exercise sheet, the plan editor, a lesson, the settings fold, the
   progress drill-down, the print card, onboarding at 320 px, and the rest
   timer. It found the exercise sheet rendering as an A4 poster on a phone with
   no visible way out (`DESIGN.md` §3.14) — a surface this list had described
   only as "unaudited". Everything else held.
10. ~~**The keyboard.**~~ **Done, and it was hiding a real defect.** At
   390 × 420 the tab bar was painted over the Log Set button of the set being
   typed into — the one action a session exists for, under the navigation. The
   bar now steps aside while a field has focus and the set pins its action row;
   five real-browser checks, five behavioural checks and three static ones hold
   it (`DESIGN.md` §3.15). What replaces it: **a real device**, because a
   simulated keyboard height is still a simulation — iOS Safari's viewport
   behaviour on focus is not the same as a short window.
11. ~~**Capture the whole page, not the first screen.**~~ **Done, and it paid
   three times.** The 547 px tap icon on Body (§3.17) and the raw
   `body.selectBody` key (§3.19) were below the fold of every screenshot ever
   taken; the atlas was 7 684 px tall because of a fault no viewport-sized shot
   could show (§3.23). Making it the default exposed the harness itself: six
   captures gated on widths the loop never walked, and every capture taken 60 ms
   into the reveal animation. One helper now takes all thirteen, at full height,
   after the animations settle (`DESIGN.md` §3.23).

Ranked by user impact, then by cost: 7 — five people, ten minutes — is now the
only item on this list that a test cannot substitute for; 10's remainder (a real
device) is the other. Everything else here is done, and what was learned from
doing it is in `app/DESIGN.md` §3.13–§3.24.
