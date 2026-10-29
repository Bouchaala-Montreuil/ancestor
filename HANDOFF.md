# HANDOFF — read this first

A recovery-aware training app for natural trainees and shift workers: French is
the reference user, seven languages including Arabic (RTL), offline by
construction, no account, no CDN, no analytics.

It is finished as software and unfinished as design. That distinction is the
whole of this document: what a designer can touch, what will push back, and
what is honestly still missing.

---

## 1. Run it, in about a minute

```bash
cd app
npm install          # needs Node 22+; see the caveat below
npm run preview      # → http://localhost:8000
```

`npm install` downloads Chrome for the browser suite. **On a network that
blocks Google's CDN this fails outright and leaves `node_modules` empty** — it
is the first thing that will bite you. Use instead:

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install
source tools/chromium.sh        # fetches a Chromium from the npm registry instead
```

Three ways to look at the app, in order of convenience:

| | |
|---|---|
| `npm run preview` | the modular source, live-reloadable by hand, port 8000 |
| `open ../app/release/ancestor.html` | the shipped single file, 2.8 MB, zero requests |
| `xdg-open dist/ancestor.html` | the same file after `python3 build.py`; `dist/` is **not** in git |

There is no build step for development and no bundler in the loop: `index.html`
loads 43 plain scripts in order. Edit a file, reload the page.

---

## 2. Verify it before and after your changes

```bash
npm run verify       # ~3 minutes, exits non-zero on any failure
```

| Gate | Command | Now |
|---|---|---|
| Ten headless suites (jsdom) | `npm test` | **1,539** |
| Real Chromium: WebGL, overflow at 7 widths, offline reload, failure strips in German and Arabic | `node tests/browser.js` | **93/93** |
| Install audit: manifest, icons, installability, shortcuts, 2 negative controls | `node tools/pwa_audit.js` | **30/30** |
| Accessibility tree: six screens, ambiguous names, dialog focus, Arabic | `node tools/ax_audit.js` | **75/75** |
| Landing page and case study, read back out of the app | `python3 site/check.py` | **66/66** |
| No untranslated key reaches a screen | `node tools/keyscan.js` | **1,776 × 7** |
| One owner per global | `node tools/modules.js --check` | 762 names |
| The shipped single file boots | `node tools/smoke_dist.js` | `BUNDLE OK` |

The browser suites need the `source tools/chromium.sh` line first. All of the
above is green as of this handoff, on a clean `npm install`.

---

## 3. Where the design lives

| Path | What it is |
|---|---|
| `app/css/app.css` | the entire stylesheet, 3,084 lines, 72 custom properties at the top |
| `app/DESIGN.md` | the design spec: tokens, components, interaction, per-screen status, limits |
| `design/CLINIC.md` | the direction and the rules behind it |
| `design/DATAVIZ.md` | the chart grammar: scale, colour, axes, the motion spec |
| `design/STATES.md` | the six states, the 6 × 5 matrix, contrast measurements |
| `design/identity.html` | the identity sheet: mark, lockups, colour, type, the verdict |
| `design/compare.html` | before/after, both frames live on the same data |
| `design/current/` | **every screen, photographed — start here** |
| `design/ROADMAP.md` | what is left, with effort estimates |

`design/current/` is the fastest way to see what exists: 15 frames at 390×844
(French unless named otherwise) — the language gate, onboarding, Today, a live
session, Progress, Body, the 3D lab, Science, the lesson reader, Profile, the A4
sheet in print media, three Arabic screens, and Today at 320 px. Regenerate with
`source tools/chromium.sh && node tools/gallery.js ../design/current`.

**Tokens first.** 72 custom properties (`--ink`, `--paper`, `--burnt`,
`--line`, `--f-*`, `--s*` spacing, `--t-*` timing) are the palette and the
rhythm. A colour written as a hex outside that block is a bug the next pass has
to find — with one honest exception today: `.btn:hover` sets `#0C0D0B` twice
instead of a token, and the print block deliberately defines its own ink palette
because paper does not have a theme.

---

## 4. What the tests will defend while you work

These are not style opinions; each one is enforced, and "fixing" them by
weakening the test will be visible in review.

- **No inline handlers.** CSP has no `unsafe-inline`. Every control is a
  `data-act="name"` delegated through `js/core/acts.js` (232 of them). An
  `onclick=` attribute silently does nothing.
- **No layout in JavaScript.** Inline styles are allowed only for data — a chart
  delay, a plotted top, a swatch colour.
- **Logical properties only.** `margin-inline`, `padding-inline`,
  `text-align:start/end`. Zero physical `left/right` in layout, so RTL is not a
  second stylesheet.
- **Exactly one `[dir="rtl"]` rule is allowed** (design test 8f). Spend it
  deliberately or not at all.
- **Touch targets ≥ 44 px**, nothing set below 9 px, contrast ≥ 4.5:1 for text
  and ≥ 3:1 for graphics, measured rather than assumed.
- **Seven languages, 1,776 keys each.** A new string is seven strings or the key
  scan fails. Arabic is set as Arabic: no upper-casing, no borrowed Latin
  spacing, numbers isolated so `%44` cannot happen.
- **Motion is opt-in** behind `prefers-reduced-motion`, nothing loops, and the
  un-animated version of every chart is still drawn.
- **Every new feature gets a test.** That is the standing rule of this repo, not
  a suggestion — the suites are how a design change stays made.

---

## 5. What is done

The journey end to end: the language gate (first, immediately after the loading
veil), designed onboarding, Today as a decision rather than a dashboard, a live
session with one action per set and a rest timer, progress charts on one scale,
the Body screen with 218 named muscles from a real GLB and a flat figure
projected from that same mesh, a 3D lab with its own filter language and a
failure state that persists, Science as a register with a lesson reader you can
print, a profile that is four records, the A4 training sheet generated from your
own log, six designed states, and the identity at every size.

---

## 6. What is genuinely not done

Ordered by what a designer would notice first. Effort is from `ROADMAP.md` and
is honest, not optimistic.

| | Effort | Note |
|---|---|---|
| The money band and the three "under-designed" surfaces (Science, Body, lab) need direction, not repair | 2–3 d | The defects in them have been found and fixed; what is left is taste |
| The per-screen state matrix — every component in empty / loading / error / partial / long-text | ~1 d | Primitives exist and are used unevenly |
| Splash and launch screens (Android, iOS) | 0.5 d | Icons exist, the launch does not |
| Store and social art: Play Store 512 feature graphic, monochrome and themed icons, OG card | 0.5 d | Nothing exists |
| Dark mode | ~1 week | Deliberately not started; say no unless you mean it |
| Arabic display face, and a microcopy pass over all seven languages | 2.5 d | German and Dutch length audit included |
| iOS: no project, no config | — | Nothing has been done at all |
| Signed Android package | ~10 min | `app/android/` holds the TWA config and exact steps; no SDK here |

---

## 7. What only a person can check

None of this has been claimed anywhere, and none of it can be done from a
sandbox:

- A real iPhone in Safari and a real Android in Chrome, installed and in-browser.
- A screen reader, with ears. The accessibility **tree** is audited (75 checks);
  whether a name makes sense spoken in French at speed is not.
- The sheet on real paper, both sides, on a cheap printer.
- 200 % text scale, high contrast, simple UI — the rules exist and have never
  been looked at.
- Whether it looks right. Overflow at seven widths is automated; the judgement
  is not.

---

## 8. Licences and ownership

- **Barlow Condensed**, SIL OFL 1.1 — bundled and subsetted, licence at
  `app/fonts/OFL.txt`.
- **Anatomy mesh**, CC BY-SA 4.0 — attribution and licence travel with the work
  at `app/assets/ANATOMY-ATTRIBUTION.txt` and `…-LICENSE-CC-BY-SA-4.0.txt`, and
  the app credits it in all seven languages. **Share-alike:** a derivative of the
  mesh (including the projected flat figure) has to be licensed alike.
- **The work itself is proprietary.** `LICENSE` at the root is all rights
  reserved: read it and run it, do not copy, modify, redistribute or reuse it
  outside this repository without written permission. Working on it as a named
  collaborator is covered. Note the consequence for a designer: work you do here
  on these terms belongs to this work, so agree anything else in writing first.
- **Two third-party pieces keep their own licences** and cannot be overridden by
  the above: the font (OFL 1.1) and the anatomy mesh (CC BY-SA 4.0, share-alike,
  including the figure projected from it).

---

## 9. Regenerate anything

```bash
python3 app/build.py                 # the single file → dist/ and release/
node design/build-marks.js           # mark + every icon → design/marks/
python3 design/build-sheet.py        # the A4 specimen
node design/build-live-sheet.js      # the A4 sheet as the app prints it
python3 site/build.py && python3 site/check.py   # the landing page
node app/tools/gallery.js design/current         # the screen gallery
bash design/build-fonts.sh           # font subset — needs `pip install fonttools brotli`
```

After regenerating icons, copy them into `app/img/`; `site/check.py` will tell
you if the landing page and the app have drifted apart.

---

## 10. Docs that are stale, and where the truth is

Written down so nobody trusts the wrong page:

- `app/README.md` lists per-suite check counts that were true three passes ago
  (design 210 when it is 279, browser 25 when it is 93) and a bundle size of
  366 KB when it is 2.55 MB. The totals in §2 of this document are the current
  ones.
- `design/ROADMAP.md`: §1–§3 are the **original** audit, written before any of
  this existed. Its own §0.3–§0.12 record what shipped afterwards. Read the
  §0.x sections, then the tables.
- `app/PHASE1_REPORT.md`, `PHASE_SCIENCE_REPORT.md`, `LAUNCH_REPORT.md`,
  `LOGIC_AUDIT.md` are dated records of passes, not descriptions of the current
  app. They are worth keeping as history; they are not documentation.
- The authoritative descriptions are `app/ARCHITECTURE.md` (how it is built and
  every risk that was found, S1–S24), `app/DESIGN.md` (the design spec) and the
  numbers in §2 above, which are produced by running the gate rather than by
  memory.
