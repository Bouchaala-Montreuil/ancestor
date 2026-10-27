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
| **B1** | **The identity depends on a font nobody has.** `--f-display` is `Arial Narrow → Helvetica Neue Condensed → Roboto Condensed → system-ui`. Stock Android — the primary target device — has none of them, so it falls to Roboto and the condensed display collapses into ordinary text. The whole "76 px next to 9 px" identity disappears on the phone the app was built for. | The design as specified does not exist on the device it ships to. | 1–2 d |
| **B2** | **Styling lives in JavaScript.** 260 `var(--…)` usages and 358 inline `style="…"` attributes across `screens.js`, `science.js`, `components.js`, `workout.js`, `modules.js`. | Every future theme change, RTL fix or density change means editing JS. The CSS is not the source of truth, so the design cannot be maintained. | 3–4 d |
| **B3** | **The drawings use a hardcoded old palette.** `components.js` bakes `#20211F`, `#46603F`, `#8A5E12`, `#963F28`, `#D66A3A` and **`#8C8A80`** (which isn't even in the token set) directly into SVG fills. | The anatomy figure and the exercise diagrams are visibly off-system. Tokens can't reach them. | 1–2 d |
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

**Sprint 1 — make it real (1 week)**
B1 font delivery · B3 token bridge · B2 first pass (move styling out of `screens.js`
home + session) · B6 screenshots and fixes · the state matrix for the three
designed screens.

**Sprint 2 — the missing screens (1.5 weeks)**
Onboarding (3 d) · Science hub + lesson reader (3.5 d) · session live + complete
(2.5 d).

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
