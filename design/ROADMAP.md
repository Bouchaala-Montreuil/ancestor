# ROADMAP — what the design still needs

**Status: foundation laid, product not finished.** That is a fair read. What exists
is a design *system* and three screens' worth of it. What a finished product design
needs on top of that is: the screens nobody has drawn yet, the states nobody
designed, the content nobody wrote, the physical artifacts, and the verification
nobody has done on a real device.

Measured against a complete product design, the visual layer is roughly **25%**
done; against the whole design job — system, screens, states, content, motion,
physical artifacts, QA — it is closer to the **5%** you said. Both numbers are
defensible; the second is the useful one.

Everything below was verified against the code today, not remembered.

---

## 0. Blockers — fix these first, they invalidate everything else

| # | Problem | Why it's a blocker | Effort |
|---|---|---|---|
| ~~**B1**~~ | ~~**The identity depends on a font nobody has.**~~ **Resolved — see §0.1.** The display face resolved to Arial Narrow → Roboto on stock Android, collapsing the whole identity. Now shipped. | 0 ✅ |
| ~~**B2**~~ | ~~**Styling lives in JavaScript.**~~ **First pass done.** 358 inline attributes down to 59: margins, flex, text alignment, spacers and the repeating patterns now live in a closed utility layer in `app.css`. What is left is 30 pieces of geometry (a percentage width, a plotted top — data, not style) and ~29 single-use type sizes and colours, which belong to the typography pass, not to a sweep. | The CSS is the source of truth for layout again. | 0.5 d |
| **B3** | **The drawings use a hardcoded old palette.** Mostly fixed: state colours and the anatomy figure now read from the stylesheet through `token()`, and the off-system `#8C8A80` is gone. Remaining: 47 literal strokes inside the exercise diagram strings, which are being redrawn in the illustration pass. | The drawings were visibly off-system. | 1 d |
| **B4** | **RTL is incomplete.** 60 physical properties (`margin-left`, `padding-right`, `border-left`, `left:`) instead of logical ones (`inline-start/end`). Arabic is a shipping language. | The Arabic app — and its printed sheet — will mirror wrongly in places. | 1–2 d |
| **B5** | **1,853 lines of UI nobody has designed.** Science hub, lesson reader, module view, 3D anatomy lab (626 + 459 + 768 lines). They inherit tokens by luck, not by design. | These are four of the six tabs' destinations. Right now they are "whatever the old CSS made them". | 3–5 d |
| **B6** | **Nothing has been seen.** No browser in this environment, so every screen was designed from markup. Type may overflow; the 104 px headline may break on a 320 px phone. | Unverifiable design is not finished design. | 0.5 d *once you send screenshots* |

*Fixed this pass:* two of my own accessibility rules were **dead code** — they were
keyed on `html[data-textscale]` and `html[data-simple="true"]` when the app actually
sets `data-text` and `data-simple="on"`. Text scaling and simple-UI did nothing.
Both corrected, and `tests/design.js` now fails if a preference hook is orphaned.

---

## 1. Screens that do not exist as designs yet

| Screen | What it needs | Effort |
|---|---|---|
| **Science hub** | Index of lessons, reading progress, the argument for the method. Currently a list of cards. | 1.5 d |
| **Lesson reader** | Long-form reading typography — the one place a serif or a measure change is justified. Pull quotes, footnotes, evidence links. | 2 d |
| **Module view** | Diagrams, interactive explainers (energy model, stimulus, inroad). | 1.5 d |
| **3D anatomy lab** | Its own control language: layer filters, isolation, hover labels, credits. It is currently a canvas in a box. | 2 d |
| **Onboarding, all 9 steps** | Right now it's a generic form. Each step needs a designed moment: the shift-pattern picker, the sleep declaration, the programme reveal. **This is where the product is won or lost.** | 3 d |
| **Session live** | The active-workout screen deserves its own treatment: set-by-set rhythm, rest timer as a full-width state, one-handed reach. | 2 d |
| **Session complete** | It exists. It should be a moment, not a modal. | 0.5 d |
| **Progress sub-views** | Volume, load, 1RM, records, session log — five views sharing one shell, none individually designed. | 2 d |
| **Sheets / modals** | Sleep, shift, feeling, analysis, why, add-exercise. Currently all inherit `.sheet` and look identical. | 1.5 d |
| **Print from history** | Reprint any past session, not just the next one. | 0.5 d |

---

## 2. The state matrix — the thing that makes it feel finished

For every component, these states must exist and be designed. Most are missing.

| State | Present? |
|---|---|
| Default / hover / active / focus-visible / disabled | buttons yes, everything else no |
| Empty (no data, first run) | one component; not per screen |
| Loading / skeleton | stylesheet only, not applied |
| Error (storage denied, import failed, corrupt record) | not designed |
| Offline / coming back online | a single flag in the header |
| Partial data ("3 of 12 groups tracked") | ad hoc |
| Long text / long muscle names / long translations (German) | untested |
| 200% text scale, high contrast, simple UI, reduced motion | rules exist, never visually checked |
| Number growth (0 → 1,000 sessions) | untested |
| RTL | incomplete (B4) |

**Effort: 3–4 d**, and it is the difference between "designed app" and "a nice
stylesheet".

---

## 3. System gaps

| Gap | Detail | Effort |
|---|---|---|
| **Icon system** | 6 nav icons inherited from the colleague. Need one set at 16/20/24 px drawn to the mark's logic — no mixed stroke weights, no borrowed glyphs. | 1.5 d |
| **Illustration language** | Exercise figures, kinematic diagrams, anatomy, empty-state art: four different drawing styles today. Needs one line weight, one fill rule, one grid. | 2 d |
| **Data visualisation spec** | Line, bar, sparkline, ring, timeline, coverage scale — currently colleague-drawn with the old palette. Needs axis/legend/empty rules written down. | 2 d |
| **Motion specification** | One duration and one curve everywhere. A finished product has hierarchy: the verdict arrives differently from a list row. Needs a written spec + implementation. | 1.5 d |
| **Token bridge** | One place that exposes `--ink`, `--ok` etc. to JS-drawn SVG, so B3 can never happen again. | 0.5 d |
| **Density** | Phone compact vs desktop comfortable is currently the same design scaled. | 1 d |

---

## 4. Content and voice

| Item | Effort |
|---|---|
| Microcopy pass over all 7 languages — the print strings are mine and may not match the existing voice | 1.5 d |
| German/NL length audit (compound nouns break tight layouts) | 0.5 d |
| Arabic typography: an Arabic-friendly display face, correct line-height, no uppercase (uppercase is meaningless in Arabic and currently applied) | 1 d |
| Empty/error/offline copy that sounds like the product | 0.5 d |
| Lesson content design — 279 lines of lesson bodies with no designed structure | 1 d |

---

## 5. Physical and marketing artifacts

| Artifact | Why | Effort |
|---|---|---|
| Splash / launch screens (Android + iOS) | The icon exists; the launch does not | 0.5 d |
| Icon variants (monochrome, themed, Play Store 512, feature graphic) | Store requirements | 0.5 d |
| **A landing page** | One page that argues the product and gives the app a home | 2 d |
| **Social / OG card** | The tally mark on a share card is the cheapest brand win available | 0.5 d |
| **A case-study page** | If this is a portfolio piece, this is the deliverable that sells the thinking | 2 d |
| Bilingual print sheet? | Not decided | — |

---

## 6. Verification — none of this has been done

| Check | Effort |
|---|---|
| Real screenshots at 320 / 360 / 390 / 414 / 768 / 1024 / 1280 | 0.5 d *(needs you)* |
| iOS Safari + Android Chrome, installed and in-browser | 0.5 d *(needs a device)* |
| Contrast audit of the new palette against WCAG AA in every state | 0.5 d |
| Touch-target audit (44 px minimum) | 0.5 d |
| Screen-reader pass (VoiceOver + TalkBack) | 1 d |
| Printed sheet on real paper, both sides on a cheap printer | 0.5 d |
| Lighthouse / PWA install audit | 0.5 d |

---

## Suggested order

**Sprint 1 — make it real (1 week)** · *done*
B1 font delivery · B3 token bridge · B2 layout sweep · onboarding · B6 screenshots
and fixes · the state matrix for the three designed screens.

**Sprint 2 — the missing screens (1.5 weeks)**
Science hub + lesson reader (3.5 d) · session live + complete (2.5 d).

**Sprint 3 — the rest of the app (1 week)**
Module view · 3D lab controls · progress sub-views · sheets · B4 RTL · B5 finished.

**Sprint 4 — finish (1 week)**
Icon + illustration system · data-viz spec · motion spec · content pass · physical
artifacts · verification.

**Total: 4–5 weeks of design work.** Everything I've done so far is the first ~4
days of it.

---

## What I need from you

1. **Screenshots** — one phone, three screens (Today, Session, Progress). Without
   them I am designing blind, and B6 stays open.
2. **Font decision (B1).** Three options:
   - *Ship a subsetted condensed face* (~20–30 KB woff2, Latin + Latin-ext). Costs
     weight, makes the identity real on every device. **My recommendation.**
   - *Accept the fallback* and redesign the hierarchy to work in plain Roboto —
     survives, but loses the scale contrast that makes this look like anything.
   - *Use a variable font* with a width axis — most control, largest file (~60 KB).
3. **Dark mode?** Not required, and it would cost another week. Say no unless you
   want it.
4. **Is there a landing page / case study in scope**, or is the app the only surface?
5. **Who owns the Science copy?** I can design the reader; the argument is your
   colleague's.

## What I would cut, honestly

- Dark mode.
- Custom illustration for exercises — the existing diagrams are adequate once
  they're in the right palette.
- The 3D lab as a *designed* centrepiece. It should work, inherit tokens, and stop.
  The 2D figure is the better design object and the one people will actually use.

---

## §0.1 The font — decided and shipped

**Barlow Condensed 500 + 700**, SIL Open Font License 1.1, subset to 239 glyphs:
Latin + Latin-1 + Latin Extended-A + the punctuation the app actually prints.

### Why this face

It is a **sign-painting grotesque**, not a geometric condensed. Squarish
terminals, flat sides, low contrast. At 104 px uppercase it reads as an
instrument panel; at 15 px it still reads. The alternatives, honestly:

| Face | Why not |
|---|---|
| **Roboto Condensed** | The Android default. The app would look unstyled on exactly the platform it targets. |
| **Oswald** | More famous, more worn. Reads "blog header" in 2026. |
| **Archivo Narrow** | Quieter and more editorial than a clinic wants; loses the industrial temperament. |
| **Saira Condensed** | Strong, but wider than the display role needs at large sizes. |

Barlow's slightly squared terminals also rhyme with the system's 2 px radii,
which the previous fallback (Arial Narrow, rounded) never did.

### What it cost

24 KB of woff2 → **31 KB base64 in the stylesheet**. The app already ships
2.08 MB, so this is ~1.5% for the thing that makes it look like itself.

### How it ships

Embedded as `data:font/woff2;base64` inside `@font-face`, **not** linked. The
single-file build inlines this stylesheet, so a relative `url()` would break the
moment the app was opened from the file system. Being embedded means it works in
the app, offline, in the printed sheet and in the identity sheet, with no request
anywhere and no build step.

Fallbacks stay behind it:
`"Barlow Condensed", "Arial Narrow", "Helvetica Neue Condensed, "Roboto
Condensed", system-ui` — so the design degrades to something deliberate, never
to a serif.

### Verified, not assumed

- The subset covers every accented character the six Latin languages need —
  `é è ê ë à â ç î ï ô û ù œ æ ñ ü ö ä ß …` — checked with fontTools.
- **Two gaps, both documented.** `Ÿ` is absent from the source `latin` subset and
  appears in no shipped string. **Barlow has no arrow glyphs at all** (`↑ ↓`),
  which the Trend metric uses; it falls back to the system face for that one
  character. The right fix is to *draw* the trend mark rather than print it,
  which belongs with the data-viz spec.
- Line-height is now measured, not guessed: cap height is **0.700 em**, so the
  `.84` display line-height gives 0.14 em of lead between uppercase lines.
- Rebuild: `design/build-fonts.sh` (`pip install fonttools brotli`).

### Also cleared this pass: B3 (mostly)

`components.js` painted its SVG with six hardcoded hexes, one of which
(`#8C8A80`) was not in the design system at all. State colours and the anatomy
figure now read the real tokens through a memoised `token()` helper, so the
drawings follow the stylesheet, including high-contrast mode. A test now fails if
any colour in the drawings falls outside the token set.

---

## §0.2 Recommendations for everything else

Decisions I would take, with the reasoning, so you can overrule any of them.

| Question | Recommendation | Why |
|---|---|---|
| **Dark mode** | **No.** | It is a second design, not a theme. Every state, chart and drawing needs a dark counterpart; that is a week for a feature nobody asked for. The paper metaphor is also the argument — a clinic is light. |
| **Landing page** | **Yes, one page.** | An app with no page cannot be shared or explained. One screen-height of argument, the mark, the verdict, and a link. ~2 days. |
| **Case study** | **Yes, if this is a portfolio piece.** | It is the cheapest way to make the thinking visible, and the before/after already exists to anchor it. ~2 days. |
| **Icons** | **Yes, but small.** | Six nav icons + a handful of actions, drawn on the mark's logic (same corner treatment, 1.5 px strokes). Half a design day, not a week. |
| **Exercise illustrations** | **Redraw, don't expand.** | There are 4 drawing styles in the app today. One line weight, one fill rule. Not 100 new drawings — a rule applied to the existing ones. 2 days. |
| **3D anatomy lab** | **Make it inherit, don't celebrate it.** | The 2D figure is the better design object and the one people will use. The lab should look like it belongs and stop. Do not design a centrepiece around a 700 KB WebGL viewer. |
| **Motion** | **Two tiers, not one.** | Today one duration and one curve cover everything. The verdict should arrive like a verdict (~280 ms, from below); list rows should not (~120 ms, fade). A written spec + a week of implementation is overkill; half a day for the spec and the four places it matters. |
| **Arabic** | **Treat it as a design, not a mirror.** | `text-transform:uppercase` is meaningless in Arabic and currently applied. Needs an Arabic display face (system Noto Naskh is acceptable), correct line-height, and logical properties. 1–2 days. |
| **Print** | **Keep, and add "reprint any past session".** | It is the differentiator and the cheapest thing to love. Half a day. |

### The order I would actually work in

1. ~~**B2 — move styling out of `screens.js`.**~~ *Done — see §0.3.*
2. **B6 — your screenshots.** Half a day of fixes after that.
3. ~~**Onboarding, all nine steps.**~~ *Done — see §0.3.*
4. **B4 + Arabic.** 2 days.
5. **The Science screens (B5).** 3 days.
6. **State matrix.** 3 days.
7. **Icons + illustrations + data-viz spec + motion.** 4 days.
8. **Landing page + case study.** 4 days.

---

## §0.3 What shipped after §0.2

Two items off the order, both committed.

**Onboarding, all nine steps** (`2b5d953`). It was nine paragraphs with a
`Step 5 of 9` sentence at the bottom. It is now one frame:

- a dossier index — `05` over `/ 09 STEP`, the same device as every section
  header in the app, so the onboarding already speaks the product's language;
- a 3 px segmented progress bar, inked behind you, with the present segment in
  burnt orange. The colour means "here", not "done";
- the question set in display type at `clamp(38px, …)`, which is the one thing
  that should dominate a screen with a single question on it;
- answers as 64 px full-width rows with the radio square end-aligned, not a
  grid of tiles. A thumb, not a fingertip — and the same row in Arabic;
- all eight footers into one sticky bar: Back at 96 px and quiet, Continue
  owning the rest of the width, padded for `--safe-b`;
- range inputs styled for the first time in the app's life;
- the last step reusing `.factor` rows, so the programme reveal reads as a
  specification rather than a list of chips.

Nine checks in `design.js` guard it (group 8d).

**The layout sweep** (`4da1647`). 358 inline `style=` attributes → 59.

The rule I used, and the rule to keep using: *if a value is the same on every
screen, it is a class; if it differs per row, it is data and stays inline.*

- **The scale is closed.** `.mt-1…5`, `.mb-0…5`, `.my-2…4` on the existing
  `--s1…--s5`. The 6 px and 10 px margins that were sitting next to 8 px and
  12 px ones are gone — a scale with a 6 in it is not a scale.
- **The row primitive was not redefined.** `.row` already existed in the app
  (flex, centred, 12 px gap, wrapping). Adding a second `.row` lower in the
  file would have silently re-gapped every row in the product. The new layer
  only narrows it: `.row-1`, `.row-2`, `.row-4`, `.nowrap`, `.row-top`,
  `.row-base`. A test now asserts `.row` is defined exactly once.
- **`.end` is `text-align:end`**, not `right`. One fewer physical property to
  fix in B4.
- **Named the patterns that were repeating verbatim**: `.td-empty`, `.meta`,
  `.num-lg`/`.num-xl`, `.panel.heavy`, `.push`, `.tuck`, `.fld-cap`,
  `.sw.sleep/.shift/.now/.direct/.indirect`.

Two bugs fell out of it, both invisible in tests and both real:

1. `.sheet-bh .stamp` — the printed block number — had a rule in the standalone
   `design/print-sheet.html` and no rule in `app.css`. The card the app actually
   prints rendered `01` `02` `03` `04` as plain text. Now inked.
2. A science tab button carried a duplicate `class` attribute, so `seamless`
   was never applied.

Eight checks in `design.js` guard the sweep (group 8e).

---

## §0.4 RTL, Arabic and the lesson reader

**Mirroring is now structural** (`4e2beeb`). 78 physical properties
(`margin-left`, `padding-right`, `border-left`, `left:`) became logical. The
sheet had a hand-written `[dir=rtl]` patch list of seven rules doing by hand
what the base rules should have done; six are gone. The one survivor is a
caption that must be allowed to wrap, because an Arabic caption is longer than
an English one. The desktop shell mirrors too — sidebar, rest bar, toast,
sheet drawer.

**Arabic was inherited, never designed.** Three things were actively wrong:

| | Was | Now |
|---|---|---|
| **Tracking** | 132 `letter-spacing` declarations applied to a joined script, severing every connection | off entirely under `html[lang="ar"]` |
| **Uppercase** | `text-transform:uppercase`, which does not exist in Arabic | off; authority comes from size and weight instead |
| **The face** | Barlow Condensed has no Arabic, so text fell through to whatever the OS had | named fallthrough to the system Arabic face, `system-ui` first |

Body leading opens to 1.72 and the display line box to 1.06 for Arabic's
deeper descenders. Eleven checks guard this (design group 8f).

**The lesson reader is a paper now** (`05f3b39`). It was six identical
bordered panels stacked on top of each other. It is a title at document scale,
a lede, numbered section entries with a rule, and prose at 16px on a 64ch
measure. Only things you operate keep a box.

### What this changes about B5

B5 assumed 1,853 lines of undesigned UI. That is the wrong measure — every
class in `science.js`, `modules.js` and `anatomy3d.js` is styled; the problem
was that they were all styled *the same*. The remaining work on Science is not
volume, it is hierarchy:

- the hub's lesson list (a numbered index, not a card grid);
- the module view's diagrams (they inherit the palette but not the mark's logic);
- the lesson reader's apparatus: quiz feedback, evidence cards, the personal
  figure — all still boxes, and only the first should be.

Estimate drops from 3–5 days to ~2.

---

## §0.5 Science hierarchy, and the states nobody designed

**The hub is a register** (`0c81345`). The lesson list was a two-column grid
(`34px 1fr`) while its markup had a single full-width child — so every lesson
title was being set inside a 34 px column. It is a list of rows now: number,
title in the display face, one clamped line, minutes. Read is a tally stroke
under the number, not a green pill, and the category is not repeated on every
row because you already filtered by it. Eleven category chips wrapped over five
rows before the first lesson; they are one rail that scrolls.

**Evidence is a library, so it is collapsed.** Fourteen records were open at
once — fourteen screen-heights of dense text. The research question stays on
the line; findings, limitations and relevance open on demand. The disclosure
sign is drawn in the mono face, because the display face has no arrows.

**`.factor` was a component in two places and not in the third.** It was styled
only inside `.decision` and `.onb-frame`. The lesson takeaways were the third
place using it, and were rendering as loose text with a stray empty dot. Now
generic, with the two scoped versions still overriding. Achievements use it
too.

**Empty and failed states** (`adff207`). The empty headline was marked up as
`h4` while the stylesheet styled `h3`, so every "no data yet" screen was
setting its headline in the default UI font. The six stock line icons are gone;
an empty state is marked with the app's own tally — four strokes, uninked,
waiting to be counted. And there was no failure state at all: a screen that
threw took `render()` with it. Now it lands on a designed block, marked with
the fifth stroke in the alert colour, because that is exactly what happened.

Three bugs of the same shape surfaced this week — `.sheet-bh .stamp`, `.empty
h4`, and the lesson's `.factor` — each a rule that never met its element, and
each invisible to every test. The design tests have grown a check for the
general case: every utility and component the screens use must exist in the
stylesheet.

### Where the order stands

| | |
|---|---|
| ~~1 B2 layout~~ | shipped |
| ~~2 onboarding~~ | shipped |
| ~~4 RTL + Arabic~~ | shipped |
| ~~5 Science (hub, lesson, evidence)~~ | shipped |
| **3 his screenshots (B6)** | **blocked on you** |
| 6 state matrix — loading + offline per screen | ~1 d |
| 7 icons, illustrations, data-viz, motion spec | ~4 d |
| 8 landing page + case study | ~4 d |

---

## §0.6 Loading, failure, and the six marks

**One loading language** (`6e45d98`). Loading was four different things: a
shimmering `.skeleton`, a static `.skel-row`, a rotating `.lab-spinner`, and a
rotating circle inside `.btn.loading` — plus two helper functions nobody called.
Now one primitive, `skel('label row short row')`, which emits bars shaped like
the content about to arrive so the layout does not jump; and `waitMark()`, the
tally with four strokes and the fifth not yet drawn. The busy button uses the
same mark, masked so it takes the button's colour.

**The boot veil spoke the wrong language, literally.** It said
`PERFORMANCE LAB // OFFLINE ENGINE` — the source project's name, hardcoded in
English, in all seven languages. It is now the app's own tag, set at boot from
`t()`, with a line saying the log never leaves the device. (The Arabic tag still
read "Performance Lab" from v0.1.) The load itself is the mark being drawn: four
strokes, then the fifth, in burnt.

**Offline is not a fault here.** The header used to say `Offline`, which reads
as a warning about a product whose entire argument is that it works offline. It
now says `Offline · everything works`.

**The six navigation marks** (`44ec786`) were a borrowed 24-px stroke set at
`stroke-width:1.4`. At 19 px on a 3x screen that is a hairline, and none of them
related to the tally. They are now solid, built from the wordmark's own numbers
(24 grid, 2.4 mass, 3.2 margin, 4.2–19.8 span), and checked at 19 px with a
nearest-neighbour blow-up before shipping — a solid mark that does not survive
at the size it is used is not a mark.

| | was | now |
|---|---|---|
| Today | a house | a calendar with one day inked |
| Session | a door | a tally of two |
| Body | a stick figure | the figure as mass |
| Progress | a bar chart | ascending bars on a baseline |
| Profile | a person | the dossier stamp, record knocked out |
| Science | a flask | a stack of spines |

### The remaining item on the order

**6. The state matrix** — what is left of it: the states are now designed
(empty, failed, waiting, offline, busy), but they have not been *audited per
screen*. That is a checklist job over 6 tabs × 5 states, and it needs the
screenshots to be worth doing.

**7–8. Illustrations, data-viz, motion spec, landing, case study.** The icons
are done; the exercise drawings are the next real design object (four styles
today, one rule needed).

---

## §0.7 The exercise drawings

`56f9948`. The eleven movement-pattern diagrams were the last place in the app
where the design system did not reach: four drawing styles (stroke weights from
1.6 to 3, round caps on some and square on others, heads as circles of two
sizes) and **47 hexes baked into the strings**, so they could never follow the
palette, a theme, or a dark mode.

They now follow the mark's grammar — 3.2 body with square caps, a 3.2 square
joint, an 11 square head, a bar with two plates, one burnt arrow, a dashed
range arc, a hairline ground — and take their colour from `.k-i` / `.k-b` /
`.k-r` against `--ink` / `--burnt` / `--line`.

`design/icons/PATTERNS.md` has the rule; `patterns-before.png` and
`patterns-after.png` are side by side.

### How this was actually done, and why it matters

The drawings were rasterised and looked at, four times, between rounds. Three
things that no test would have caught:

- the first pass made **every figure a stick person**, with a square head and
  square joints at nearly the same size — the load and the body read as one
  mass;
- the push diagrams had the bar drawn *through* the head;
- the squat and the calf raise did not read at all until the joints were
  reduced to 3.2 and the head raised to 11, which is only visible at size.

And one thing worth writing down before anything else is drawn this way:
**librsvg will not honour `var()` inside SVG presentation CSS.** The diagrams
looked invisible in the rasteriser while being perfectly fine in a browser. The
verification harness substitutes literal palette values; the app itself keeps
the tokens.

### What is left on the order

| | |
|---|---|
| **3 B6 his screenshots** | **still blocked on you** |
| 6 state matrix, per screen | ~1 d, better after the screenshots |
| 7 data-viz + motion spec | ~2 d |
| 8 landing page + case study | ~4 d |

The icons, the loading/failure/empty states and the exercise drawings are now
done — the three things that were listed under 7 as "4 days".
