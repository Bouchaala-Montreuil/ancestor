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
6. **No web fonts.** Offline-first: condensed display, neutral text, monospace data,
   with a real fallback at every step.
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
