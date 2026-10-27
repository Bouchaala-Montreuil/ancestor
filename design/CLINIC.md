# THE CLINIC

**Design direction for ANCESTOR — v1**
The app is in `app/`. Everything visual now comes from one file: `app/css/app.css`
(1,560 lines, full replacement of the old stylesheet). No markup was rewritten, so the
engine, the tests and the six languages are untouched.

---

## 1. What was wrong before

Not taste — **structure**. Five things, in order of damage:

1. **Everything was a panel.** Header + body + label, repeated. The page had no
   silence, so it had no emphasis. When everything is framed, nothing is framed.
2. **Nothing was quiet.** 10 px mono labels, hairlines, chips, bars and badges all
   shouted at the same volume. Annotation had replaced hierarchy.
3. **The most important thing was not the biggest thing.** The product's entire
   promise is one sentence — *"come back in three days"* — and it was set at the
   same size as a section title.
4. **The identity was a skin, not a voice.** "Lab / instrument" is a good instinct
   but it was applied flat: no scale contrast, no texture, no custom mark, no
   typographic risk. The wordmark was letterspaced Arial Narrow.
5. **The product's soul was missing.** This app is an authority that tells you *not*
   to train. That is a clinical judgement, not a warning toast. It needed to feel
   like a verdict.

---

## 2. The idea

> **A clinical dossier for one body.**

Ivory paper, ink, one signal. The app stops being a dashboard of widgets and
becomes a **document**: numbered sections, a verdict at the top, figures in ruled
columns, a ledger of what your muscles have done.

Why this and not "dark gym app":
- The product is about **restraint and reading your own data**, not intensity.
  A dark neon interface sells adrenaline. This sells judgement.
- Paper survives daylight and a cracked phone screen at 3 a.m. It is also the only
  look in the category that nobody owns.
- It lets the one loud element — the verdict — actually land.

---

## 3. The seven rules the stylesheet obeys

1. **Paper is the surface.** A block of content is separated from the next by a
   hairline and by space. Boxes are reserved for things you can *act on*.
2. **One loud thing per screen.** `.decision` is the only solid ink block. There is
   never a second dark block competing with it.
3. **Burnt orange is a signal, not decoration.** Primary action, current position,
   and a state that needs attention. Three appearances per screen is too many.
4. **Scale is the hierarchy.** 64 px next to 9 px does the work that borders and
   shadows were doing badly.
5. **Numbers are always tabular.** A column of figures that jitters is a column
   nobody trusts.
6. **No remote fonts.** Offline-first: condensed display, neutral text, monospace
   data, with a real fallback at every step. The display face was later shipped as
   a bundled 24 KB woff2 (Barlow Condensed 500/700, OFL 1.1) inlined into the
   single-file build — self-hosted, so it is not a web font in the sense that
   matters: nothing is fetched and the identity survives a font-less fallback.
7. **Nothing bounces.** Motion is 120–280 ms and only ever communicates.

---

## 4. The type system

| Role | Face | Use |
|---|---|---|
| **Display** | Arial Narrow → Helvetica Neue Condensed → Roboto Condensed → system | the word that carries the screen. Uppercase, `.92` line-height, no tracking |
| **Text** | system-ui | sentences. 16 px, 1.6, max 46–62 ch |
| **Data** | ui-monospace | every unit, id, date, label, figure. 8–10 px, `.12em` tracking, uppercase |

The identity comes from the **gap between them**: a 76 px condensed headline sitting
directly above a 9 px monospace annotation. That contrast is the brand, and it costs
zero kilobytes.

---

## 5. What changed, screen by screen

**Today** — the opening statement. Date/name as a 9 px field line with a 7 px orange
square. `LEGS IS READY` at 44–88 px. Then the verdict as a solid ink block: the state
word at 74 px, availability as a ruled meter, the reasons as a hairline list, the
next session as bracketed mono pills, and the actions inverted to ivory. Everything
below it is paper and rules: this week, coverage ledger, observation, seven days.

**Session** — the live HUD is the second and last dark block (only during a session).
Set cards get a real input: 52 px tall, 26 px condensed figures, orange underline on
focus, green left edge when logged.

**Body** — the figure sits on a millimetre grid with a soft mask, no frame. Muscle
rows became a ledger: swatch, name, time remaining, hairline.

**Progress** — charts lose their boxes and sit directly on paper like a printed
report: 1.5 px ink stroke, no fills except a 7 % area, axis labels in 8 px mono.

**Profile** — a form, not a settings list: full-width ruled inputs, options as rows
with a square checkbox, no pills.

**Navigation** — flat paper bar, 2 px orange indicator that slides. Above 1024 px it
becomes a 200 px left rail with a vertical orange edge on the active item.

**Global** — 3 % film grain over the whole page (an SVG turbulence texture, not a
gradient) so the ivory stops reading as a default browser background.

---

## 6. Deliberate decisions you may want to argue with

- **Dark verdict block.** Strongest move in the design. It makes the answer
  unmissable. Cost: the page has one heavy element, so nothing else can be heavy.
- **Orange is nearly absent.** If you want it to feel warmer and more "Ancestor",
  this is the dial to turn — but turn it once, or the restraint collapses.
- **Boxes removed from most panels.** Gains calm, loses "app-ness". The exercise
  cards and set cards keep real borders because you touch them.
- **Text stays neutral, not condensed.** Condensed body copy at 13 px on a phone in
  a gym is a legibility tax I refused to pay. Display is condensed; reading is not.
- **Radius 2 px everywhere.** No 14 px rounded cards. Softness reads as consumer;
  square reads as instrument.

---

## 7. Verification

The colleague's design contract is intact — all **61** design tests pass, plus
`run` 142, `ui` 110, `inclusive` 65, `personas` 66, `science` 121, `logic` 117,
`anatomy` 64, `premium` 170. `dist/ancestor.html` rebuilds at 2.0 MB, self-contained.

Every class the JavaScript emits (**272**) is styled — checked against an extracted
inventory, not by eye.

---

## 8. Open questions for you

1. **How far do we push the verdict block?** It could go further: full-bleed to the
   screen edges, or a 2 px orange rule at the top of the page instead of the left edge.
2. **Do you want photography?** A single grainy portrait or a hand-on-iron detail on
   the Today screen would move this from "very good product design" to "editorial and
   memorable". I designed without images so nothing depends on them.
3. **The wordmark is still type.** A real mark — three strokes, a hatch, a stamped
   square — would finish the identity. Do you want me to draw options?
4. **Print.** The app has a print card. A genuine A4 training sheet in this language
   would be the most shareable thing in the product. Worth a screen?

---

## 9. The identity — the tally

Being told the direction wasn't distinct enough was correct: the first pass had a
strong system but no owned object. That has been fixed.

**The mark is a tally: four strokes for the work, one slash for the set that closes
it.** It is the oldest counting gesture there is — and this app is a counting
machine: sets, reps, days since, days left. It carries the name: what you do now,
your grandfather did with a stick on a wall. It is also, structurally, a training
log.

It is deliberately not a flame, a bolt, a swoosh, a shield, a mountain or a sword.
Those are the flags of the category.

### Where it lives

| Surface | Use |
|---|---|
| Header | 22 px mark beside the wordmark, at cap height |
| Boot screen | 44 px, above `ANCESTOR` |
| App icon | ink field, ivory mark at 66 % — survives the maskable safe circle |
| Print sheet | ivory mark in the footer |
| — | nowhere else. Restraint is what makes it a signature. |

Everything is generated from six numbers (`design/build-marks.js`), so the 16 px
favicon and the 176 px cover are the same drawing, not two that agree roughly.
The SVG is embedded in the stylesheet as a percent-encoded data URI — no request,
and it still works when the app is opened straight off the file system.

### The second signature: the stamp

Every section on every screen is now numbered in a **solid ink stamp** — `01`, `02`,
`03` — set in 8.5 px mono on charcoal. That is the dossier motif, repeated dozens of
times per session, and it replaces iconography entirely. No screen needs a
decorative glyph when it can be numbered. If you remember one thing about this
product's interface six months from now, it will be the little black square with a
number in it.

### Files

```
design/
  identity.html      the identity sheet — open it in the preview
  build-marks.js     geometry → every SVG and PNG the product uses
  marks/             mark, lockups, icons at every size, contact sheet
app/img/             the same icons, wired into manifest, favicon and apple-touch
```

### Verification

Identity work touched the build, so the whole suite was re-run: design 61, premium
170, all green, bundle self-contained at 2.06 MB with zero external references
(`build.py` now inlines any local image reference automatically, and the bundle's
manifest had been carrying the old v0.1 dark palette — fixed to paper/ink).

---

## 10. Going further (second pass on the screens)

The first pass was coherent but polite. Four moves, all in CSS:

1. **The verdict now runs full-bleed below 1024 px.** It touches both screen edges.
   A judgement is not a card sitting inside a margin — it is the page speaking.
   Nothing else in the product is allowed to do this, which is what makes it an
   event rather than a component.
2. **The masthead went up a full step** — `clamp(52px, 15.5vw, 104px)`, line-height
   `.84`, tracking `-.01em`, capped at 13 characters. `LEGS IS READY` now fills the
   width of a phone.
3. **Rules got heavier.** Header and section entries are 2 px ink instead of
   hairlines. On a page this quiet, a 2 px line is a shout.
4. **Figures got louder** — the weekly set count and the spec-sheet metrics both
   stepped up. Where a number is the argument, it is now the biggest thing in its
   block.

## 11. The sheet

`design/print-sheet.html` — one A4, generated by `design/build-sheet.py`.

**Why it matters:** this is where the tally stops being a logo and becomes the
mechanism. The footer of the sheet is printed with two completed marks and five
empty ones; you count your working sets by hand, one stroke each, and the fifth
stroke closes the set. The same mark is at the top of the page. That loop — app
icon, screen, sheet, icon — is what "identity" actually means.

What's on it:

| Block | Contents |
|---|---|
| Header | mark, record title, print date, unit |
| Fill-in | date · start · end · bodyweight · feel, ruled for a pen |
| Verdict | the state at 24 pt, on ink, with availability and duration |
| **01 The work** | five exercises, target, tempo, and empty boxes for load, reps, RIR, notes |
| **02 Recovery ledger** | all twelve muscle groups with days left — the "do not train" list |
| **03 Week** | seven columns for sleep hours and shift type |
| **04 Notes** | ruled lines, because the reason you missed a rep is rarely in the app |
| Footer | the tally, and the instruction to use it |

**Paper rules it obeys:** black on white only, so it photocopies and costs nothing.
Handwriting boxes are 6 mm, which is what a pen actually needs. The footer is in
the layout flow with `margin-top:auto`, so it pins to the bottom of the page and
can never collide with the content — an absolutely-positioned footer was the first
version and it was a bug waiting to happen.

Print it from the preview with the button at the bottom of the page, or `⌘P`.

---

## 12. The sheet is now a feature

The sheet stopped being a design artifact and became part of the product.
**Print card** sits in the Session planner and prints the day you have selected,
filled from your own log.

| It prints | From |
|---|---|
| The verdict, the availability figure, the duration | the same `decide()` the Today screen uses |
| **Why** — two reasons, translated | `decide().reasons`, the engine's own sentences |
| Every exercise, with target and tempo | the selected plan day |
| `LAST 23 OCT · 60 KG × 8` under each exercise | the most recent logged set for that movement |
| All twelve muscle groups with days left | `allRecovery()` |
| Sleep hours and shift length per day | your sleep and shift log, last seven days |
| Blank where there is no data | never a guess: no history means no line |

Implementation notes that matter:

- **`printSheet(state, now, opts)` is pure.** Same log in, same sheet out. That is
  what makes it testable, and it is why the live sheet below can be generated
  from a seeded log with confidence.
- **The tally is drawn from the same six numbers** as the app icon, in
  `js/ui/printsheet.js`. One geometry, three languages: CSS, SVG files, print.
- **Translated into all seven languages** (`js/i18n/print.js`, ~42 keys each),
  including a mirrored RTL layout for Arabic. A sheet that prints in English
  because a key was missing is worse than no sheet.
- **Fails safe.** If there is no programme, it prints a single honest line instead
  of throwing; the root is emptied again after printing, and on a timer as a
  fallback for browsers that never fire `afterprint`.
- **`build.py` no longer keeps a hand-written list of scripts.** It derives them
  from `index.html`. The previous list meant a new script could ship in the app
  and be silently missing from the single-file build — which is exactly what
  happened to the two new files before this was fixed.

### See the real thing

```bash
node design/build-live-sheet.js     # renders the app's own output
open design/print-sheet-live.html
```

`print-sheet-live.html` is not a mock-up: it boots the app in jsdom, seeds four
weeks of training and a night-shift week, and calls the same `printSheet()` the
button calls. `print-sheet.html` remains the static specimen.

### Verified

`tests/print.js` — **42 checks**: the document exists and is A4, every block is
present and numbered, figures come from real state, absent data stays absent,
all seven languages print without an untranslated key, Arabic mirrors, the
action fails safely, and the button is reachable from the planner. Added to
`npm test`.

---

## 13. Before / after — and the print action on Today

Two additions this pass.

### Print, one tap from the answer

The verdict on Today now carries **Print card**, and it prints the session the
verdict is *about* rather than whichever day happens to be selected in the
planner. That distinction matters: on a REST day the planner might be showing a
different day, and printing that would contradict the thing you just read.

### `design/compare.html`

The comparison that a redesign should have to survive:

> **Same engine. Same markup. Same data. Different design.**

The left frame runs the **original stylesheet** against the **current** markup
and engine. The right frame runs the rebuild. Nothing else differs — not a line
of JavaScript, not a string, not a row of data.

That is the honest way to show this work. A redesign shown only in its finished
state is a claim. A redesign shown next to its own starting point, running on
identical inputs, is evidence. If the improvement survives being measured
against everything except the design, then it was the design.

`design/before/` is the original `app.css` plus a copy of `index.html` wired to
the current scripts, so both frames are genuinely alive: you can tap through,
switch screens (the toggle drives both), and scroll.

### Kept on purpose
The palette. Condensed display type and monospace for every unit. Near-square
corners. Every disclosure the engine makes — estimates still called estimates.

### Removed on purpose
Borders and shadows on content blocks. Pills where a rule would do. Equal weight
given to labels and to figures. Anything orange that was not a signal.
