# ANCESTOR — a case study

**A training record for one body, drawn as a clinical dossier.**
Free, offline-first, no account, seven languages, one accent colour.
Built and verified in an environment with no browser and no network.

---

## 1. The brief

Design a training app that a serious natural trainee would actually keep, with
four constraints that decide most of the work:

1. **Premium craft, free product.** Nothing may look like a template.
2. **Offline by construction.** No CDN, no remote font, no analytics, no account.
3. **No photography, no image dependency.** Every visual is drawing, type or rule.
4. **Restyle the entire app** — not two screens and a system document. Six tabs,
   every state, the printed sheet, the onboarding, the Arabic build.

And one standing instruction that overrode politeness: *not distinct enough —
increase distinctiveness.* The first direction was competent and forgettable. The
answer was not more decoration; it was a change of genre.

---

## 2. What was wrong with the first attempt

Not taste — **structure**. Five failures, in order of damage:

| | Problem |
|---|---|
| 1 | **Everything was a panel.** Header, body, label, repeated. When everything is framed, nothing is framed. |
| 2 | **Nothing was quiet.** Ten-pixel mono labels, hairlines, chips and badges all at the same volume; annotation had replaced hierarchy. |
| 3 | **The most important thing was not the biggest thing.** The product's whole promise — *come back in three days* — was set at section-title size. |
| 4 | **The identity was a skin, not a voice.** "Lab instrument" is the right instinct applied flat: no scale contrast, no custom mark, no typographic risk. The wordmark was letterspaced Arial Narrow. |
| 5 | **The soul was missing.** This app is an authority that tells you *not* to train. That is a clinical judgement, not a warning toast. It had to read like a verdict. |

---

## 3. The idea

> **A clinical dossier for one body.**

Ivory paper, ink, one signal. The app stops being a dashboard of widgets and
becomes a **document**: numbered sections, a verdict at the top, figures in ruled
columns, a ledger of what each muscle has done.

Why this and not the dark gym app everyone ships:

- The product is about **restraint and reading your own data**, not intensity.
  A dark neon interface sells adrenaline; this sells judgement.
- Paper survives daylight and a cracked screen at 3 a.m., and it is the only look
  in the category that nobody owns.
- It lets the one loud element — the verdict — actually land.

Seven rules came out of that, and the stylesheet is held to them:

1. Paper is the surface. Blocks are separated by a hairline and by space; boxes are
   reserved for things you can act on.
2. One loud thing per screen. There is never a second solid ink block.
3. Burnt orange is a signal, not decoration: primary action, current position, one
   data series. Three appearances per screen is too many.
4. Scale is the hierarchy. 64 px next to 9 px does what borders and shadows were
   doing badly.
5. Numbers are always tabular. A column that jitters is a column nobody trusts.
6. No remote fonts. The one bundled face is inlined; nothing is fetched.
7. Nothing bounces. Motion is 120–620 ms and only ever communicates.

---

## 4. The system

### Type

Barlow Condensed 500/700 — 24 KB of woff2, OFL, **inlined into the single-file
build**. It replaced a display stack that resolved to Arial Narrow on a Mac, Roboto
on stock Android and Liberation Sans Narrow on Linux, which meant the identity was
different on every device. Cap height 0.700 em is why display type sets at 0.84
line-height and still breathes.

Body is the system face, deliberately: no second download, and no fallback cliff.
Every number, unit, id and annotation is monospace, because a chart axis and a
column of sets are both columns of figures.

### Colour

Five values and their named variants. No gradients (the suite fails on the word),
no glass, no shadows except on overlays, no third-party accent.

| | | |
|---|---|---|
| Charcoal `#20211F` | structure, ink, the verdict | 13.6:1 on ivory |
| Ivory `#F1EBDD` | the page | the product's whole surface |
| Burnt `#D66A3A` | action, selection, one series | never small text at 2.95:1 |
| Technical `#77796F` | annotation | `#636559` when it must be text |
| Line `#C8C0B2` | hairline | the only divider |

The burnt-as-text problem is worth naming: `#D66A3A` on ivory is 2.95:1, so every
accent *word* in the app is `#A8461F` (4.96:1), and the loud orange is kept for
marks, rules and figures. That distinction exists in the tokens, not in a
designer's memory.

Contrast against the page is only half the audit, though. Half the state
vocabulary is a word on a *tint*, and a tint is measured after it is composited,
not before: `#A8461F` on paper is 4.96:1, but on the burnt wash it was 3.98:1, and
the warn label was 4.00:1 on its own. Both passed every test that compared a
colour to the page. State flags now keep their word in ink and carry the state in
the dot, the rule and the wash — ink on the same washes is 10.9:1 — and the suite
composites every tint before it computes anything.

### The mark

A tally: four strokes of recorded work, and the fifth that closes the set. Six
numbers on a 24 grid — margin 3.2, stroke 2.4, gap 2.667, verticals 4.2→19.8,
slash 19.4 at −16° — generate every size from a 16 px favicon to the 512 px icon,
plus the loading, empty, broken and busy states. It is embedded in the stylesheet
as a percent-encoded data URI, so the app carries it with no request and no build
step.

The six section marks were drawn the same way: calendar with one day inked, tally
of two, head plus narrowing mass, four bars on a baseline, dossier stamp with
records knocked out, five stacked spines. Solid mass never thinner than 2.2 px,
never a hairline, never a curve that leaves the grid.

### Drawings

Eleven movement patterns, one grammar: body 3.2 with square caps and straight
segments only, head an 11 px square, joint a 3.2 px square, the load as a bar with
two plates, one burnt force arrow with a drawn head, one dashed range arc, and a
hairline ground only when the movement is supported. Curves appear in the range
arc and nowhere else.

This replaced four drawing styles with stroke weights from 1.6 to 3 and **47 hex
colours baked into the strings** — diagrams that could never follow the palette.

### Charts

A scale rounded at *both* ends. The old line chart labelled a 42–52.5 kg series
`36 52 68 84 100`, because it took `min = rawMin × 0.85` and rounded only the top:
an axis rounded at one end is not a scale, it is a remainder. `niceScale` picks a
step (1, 2, 2.5, 5, 10 × 10ⁿ) from the range, then floors the bottom and ceils the
top to it: `40 45 50 55`. Bar charts start at zero because a bar's length is its
value; line charts start at the nice floor because a line's value is its height.

---

## 5. The part that is usually skipped

Six defects in this project were not taste, and each one is more useful than a
screenshot.

### 5.1 Three rules that never met their element

`.sheet-bh .stamp`, `.empty h4`, a lesson's `.factor`: three CSS rules written
against selectors that matched nothing in the DOM. They *looked* like design. The
design suite now fails on any component class the stylesheet claims and the markup
never uses, and that guard caught two more before they shipped.

### 5.2 `var()` does not work in an SVG presentation attribute

`barChart` received `col:'var(--burnt)'` for every row and wrote it into
`fill="…"`. No browser resolves that. The bars only had a colour because a
stylesheet rule overrode the attribute — and that rule said `ink`. So the code
asked for burnt, the stylesheet painted charcoal, and the colour channel was
decorative and identical for every bar. One series is one colour now, declared in
CSS.

### 5.3 A hollow dot was an inheritance accident

Each chart point is wrapped in a focusable `<g>` for keyboard access. That group
carried `fill:paper; stroke:ink` — so every "solid" circle inside it inherited a
paper fill and an ink stroke and rendered as a **ring**. The markup said solid;
the pixels said hollow. Paint belongs to the mark now, and the group is only a hit
area.

### 5.4 Preference hooks that did nothing

Two accessibility features were dead code: the text-size and simple-UI rules were
keyed on `html[data-textscale]` and `html[data-simple="true"]`, while the app sets
`data-text` and `data-simple="on"`. The features existed, the CSS existed, and
neither did anything. A suite check now fails if a preference hook is orphaned.

### 5.5 The write nobody read

The worst one was not visual. `saveState()` wrapped `localStorage` in a try/catch,
set `ok = false` when the write failed — and returned it to callers that ignored
the return value. Logging a set into a browser that refuses storage (a full quota,
private mode, an in-app webview with storage disabled) drew the set, charted it,
updated the volume, and then lost all of it at the next reload, with the interface
looking perfectly healthy for the entire session.

Auditing the state matrix is what surfaced it, because "storage denied" is a row
in that matrix and there was nothing to point at. It is now a header strip that
says the write was refused, offers the export while the data is still in memory,
and clears itself on the next successful write.

The strip then exposed a second lie on the same screen: eight call sites wrote
`saveState(); toast(t('…saved'), 'ok')` — the write and the claim, side by side,
with the claim never checking the write. Those eight now go through one guard,
`savedToast()`, so the app cannot congratulate a user for a save that did not
happen.

### 5.6 The log that deleted itself

The worst defect in the project is four lines long:

```js
try{
  const raw = localStorage.getItem(STORE_KEY);
  if(raw){ STATE = migrate(JSON.parse(raw)); return STATE; }
}catch(e){ /* corrupted or unavailable — fall through to a clean state */ }
STATE = defaultState();
```

That reads as defensive code, and it was written as defensive code. But it puts
"there is no record yet" and "there is a record and it will not open" on the same
line, and the second one is followed by a save. A log truncated by a crash
mid-write, a browser killed by the OS, an import that half-applied: the next tap
anywhere in the app wrote an empty state over it. The user's entire training
history, gone, with no message, on a screen that looked like a first run.

The fix keeps the bytes instead of the shape: an unreadable record sets a flag,
`saveState()` refuses — the mirror image of the retry added the same week, which
exists to save — and the header strip offers the only safe action, which hands the
original back as a file, writes it to its own key as a second copy, and only then
lets the log start again.

The same hour turned up a smaller one of the same shape: six error paths passed
`'err'` to `toast()`, and the stylesheet only knew `.toast.ok` and `.toast.alert`.
Every error the app has ever shown looked exactly like a message.

The pattern in all six: **a claim that no one had rendered.** Which is why the
process changed.

---

## 6. Verification without a browser

There is no browser and no network in this environment. That is a hard limit, not
a preference, so the verification had to be invented:

- **Ten test suites, 1,068 checks.** `design` executes the chart scale as a
  function rather than describing it; `ui`, `run`, `premium`, `inclusive`,
  `personas`, `science`, `logic`, `anatomy`, `print` cover behaviour, RTL, contrast,
  the printed sheet and the bundle.
- **Rasterised out of the live DOM.** `jsdom` builds the real page through the real
  stylesheet, the SVG is lifted out, and `librsvg` draws it to PNG. Every drawing
  in this project was looked at this way, at rendered size, repeatedly — the first
  eleven pattern drawings were *stick figures* with heads and joints the same size,
  which no assertion would ever have caught.
- **The bundle is smoked, not assumed.** `build.py` produces a single 2.1 MB file
  from 41 scripts; `tools/smoke_dist.js` boots it, runs a session, saves it and
  reads the charts back, and fails on any external reference.
- **The rules are checked, not remembered.** No gradients, no hex outside the
  palette, no `fill-opacity` that means nothing, no colour in a presentation
  attribute, no motion that hides content, no selector that matches nothing.

Two limits are stated rather than hidden: nobody has photographed the app on a
device, and the layout was designed from markup. Type at 320 px is checked
arithmetically, not seen.

---

## 7. Outcomes

| | |
|---|---|
| Bundle | 2.1 MB, one file, 41 scripts, zero requests |
| Checks | 1,068 across 10 suites, all green |
| Content | 68 exercises, 11 movement patterns, 11 lessons, 14 evidence records |
| Languages | 7, including Arabic RTL and the printed sheet |
| Artefacts | the app, the A4 training record, the identity sheet, the pattern sheet, the chart grammar, this page |

Design deliverables that did not exist before this pass: the shipped display face,
the mark and its six section marks, the eleven movement drawings, the chart and
motion grammar, the loading/failure/empty states, the science reader, the Arabic
build, the onboarding, the landing page.

---

## 8. What I would do next

1. **Photograph it.** The next pass is a device: 320 px, 390 px, a cracked screen,
   a gym basement, one hand. Everything else is arithmetic until then — including
   the states, which are audited (`design/STATES.md`) but never seen.
2. **Buffer a failed write.** The storage strip reports and offers an export; it
   does not queue. A user who ignores it and keeps logging loses the lot.
3. **Dark.** The tokens are one block; the palette is five values with contrast
   ratios recorded. A dark frame is a token swap plus a re-check, not a redesign —
   and it should be tried, because the current answer ("ivory only") is a position,
   not a law.

---

## 9. Reading the rest

| | |
|---|---|
| `design/CLINIC.md` | the direction, the rules, and what changed |
| `design/ROADMAP.md` | what is still missing, with effort and blockers |
| `design/icons/PATTERNS.md` | the drawing grammar, 140 × 94 |
| `design/DATAVIZ.md` | the chart grammar, the scale, the motion spec |
| `design/STATES.md` | the six states, the 6 × 5 matrix, what is still unproven |
| `site/index.html` | the landing page (one file, figures from the app) |
| `app/README.md` | the product, the honest scope notes |
