# DESIGN — ANCESTOR

This document is the working design record: the audit that produced it, the
decisions taken, what was actually implemented, and what was not. It is written
to be checked against the code, not admired.

**What this pass is not.** There is no browser or GPU in the environment this was
built in. Every number below comes from a jsdom crawl of the running application
(`node --check`-clean scripts, real stylesheet, seeded state) or from static
inspection of the stylesheet. jsdom has no layout engine: it can prove structure,
names, counts and contrast arithmetic. It cannot prove that a box overflows, that
a figure renders in WebGL, or that a 390 px screen looks right. Where a claim
would need eyes, it is marked **not verified** rather than asserted.

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

### 3.4 Small things that were wrong

- The sub-navigation's count badge ("Exercise library" + "88") is now
  `aria-hidden`, so the control is announced as *Exercise library*. The same for
  the active-session dot.
- A heading was added to the session without changing a single pixel of type:
  `.sess-ex-h{font:inherit;margin:0}`.
- The dashboard's dead `.dash-figlink-t` rule was deleted with its markup, rather
  than left as a style waiting for an element.

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

Contrast, target sizes, focus visibility, reduced-motion parity and the
"no colour-only feedback" rules are unchanged and still enforced by
`tests/design.js` (186 checks) and `tools/qa_audit.js` (1 accepted Medium: the
`overflow-x:hidden` note in `ARCHITECTURE.md` §4).

---

## 7. Per-screen status

| screen | state | what is still weak |
|---|---|---|
| Onboarding | untouched | not re-audited this pass |
| Today | action hierarchy fixed, figure fixed | **nine `h2` sections**, 381 words; the section system is deliberate but flat — a "today / this week / understand" grouping is designed, not built |
| Plan | untouched | not re-audited this pass |
| Active session | headings, disclosures, discard moved, field names | 774 words with every set expanded; no per-exercise collapse; rest timer not visually verified |
| Exercise atlas | untouched | **382 buttons, 1 304 words** in one scroll: the worst surface in the app |
| Progress | untouched | charts and records re-verified for scale in the previous pass; drill-down not re-audited |
| Body / anatomy | figure semantics fixed | 59 controls on one screen; the muscle list duplicates what the figure already shows |
| Science | untouched | 26 controls, evidence disclosures already sound |
| Profile | untouched | **160 controls, 621 words, eleven `h3` sections** — a settings wall that needs an IA pass, not a style pass |

---

## 8. Limits of this pass

- **No visual inspection.** Nothing here was looked at in a browser. Type,
  spacing, rhythm, overflow and the 320/375/390/768/1024/1440 breakpoints are
  inherited from the existing design system and were not re-verified visually.
- **No WebGL verification.** The 3D anatomy path cannot run without a GPU; the
  flat figure was the only anatomy surface exercised.
- **The census counts are structural.** "Words" is text content, not reading
  effort; "controls exposed" ignores visual weight.
- **Two screens were left with walls** (atlas, profile). They are the next
  highest-impact work and were deliberately not half-fixed.
- **No rest-timer, no print-layout and no offline-persistence re-verification**
  in this pass; those suites are green, which is not the same as inspected.

---

## 9. Next, ranked by user impact

1. **Exercise atlas** — 382 buttons and 1 304 words. One searchable list with a
   single filter surface, and detail on demand. This is the screen most likely to
   be abandoned.
2. **Profile** — 160 controls. Split into *Programme · Body · Accessibility ·
   Data*, each a page, with the same disclosure discipline.
3. **Session: 774 words.** One exercise expanded at a time, user-controlled, with
   a visible "next" — plus a rest timer that survives a locked screen.
4. **Today's nine sections.** Group into *today / this week / understand*; the
   content already exists, only the outline changes.
5. **Body screen.** Drop the duplicate muscle list once the figure carries the
   names, or drop the figure's list — not both.
6. **Onboarding and Plan** — the only two surfaces never audited in this phase.
