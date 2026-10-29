# ARCHITECTURE — the shape of the thing, and what it was missing

A review of the software, not the design. `design/STATES.md` covers what the
screens do when something goes wrong; this covers what the *system* does, what it
cannot do, and where the assumptions were hiding.

Read on 2026-10-28 against `037789e`, and re-measured the same day at 1,516 headless checks and
93 real-browser checks.

---

## 1. The shape of the thing

**Runtime.** One HTML file, one stylesheet, 43 scripts concatenated in document
order. No bundler, no modules, no framework, zero runtime dependencies. `build.py`
derives the script list from `index.html` itself, so the two manifests cannot
drift — that used to be a hand-kept list and is now a single source.

**Namespace.** 589 top-level functions and constants on `window`. The dependency
graph is the order of the `<script>` tags, and the only thing enforcing it is
`index.html`. That is unusual and it works; it is also why a `const` declared in
`store.js` can be read from `app.js` at runtime and in the temporal dead zone at
parse time — a trap this codebase has now fallen into twice (once in
`Screens.progress`, once in my own test file).

**Data.** One JSON blob under `localStorage['ancestor.state.v1']`, schema v3.
`migrate()` is additive: unknown keys survive, missing keys are filled. An
IndexedDB mirror is written on every save and read only when `localStorage` is
empty. Export/import is the only backup the user controls, and the app treats "five
sessions without a recent export" as a thing to say out loud.

**Tests.** Ten headless suites (jsdom) — 1,516 checks — plus `tests/browser.js` (93 real-Chromium checks),
which needs a real Chrome and covers what jsdom cannot: WebGL, layout overflow at
320/360/768/1280, a service-worker reload with the network severed, and the two
failure strips — a refused write and a damaged record — on a 320 px phone in
German and in Arabic, where they are longest and read right to left.

**Getting a browser for that second suite.** The obvious route,
`npx puppeteer browsers install chrome`, pulls from Google's CDN, which is not
reachable from every environment this project has been worked in — and the
Chromium used for the first green run lived outside the repository, so it did not
survive a fresh checkout. `tools/chromium.sh` fixes both: it fetches
`@sparticuz/chromium` from the npm registry (which is reachable), decompresses the
browser and the Amazon Linux libraries it links against, and exports
`PUPPETEER_EXECUTABLE_PATH` and `LD_LIBRARY_PATH`:

```
source tools/chromium.sh && node tests/browser.js
```

Verified cold, from an empty `/tmp`, on 2026-10-29: **93/93**. The suite runs
headless with SwiftShader, so the WebGL checks mean what they claim without a
GPU.

**The accessibility tree, read rather than guessed at.** `tools/ax_audit.js`
(`npm run ax`, 75 checks) reads Chrome's own accessibility tree through CDP —
the same tree a screen reader consumes — rather than pattern-matching markup.
Seven checks are demonstrated on a page built to fail them before any of them is
trusted on the app. It found two real defects: six "Détails de l'exercice"
buttons on the session screen, identical in a screen reader's button list, now
naming their exercise; and "Tout" / "Dos" appearing in two filter groups on the
anatomy screen with nothing to tell them apart, now carrying their group in the
accessible name. Three more failures it reported were its own fault and are
recorded here because that is the pattern: a card caught mid-stagger is
genuinely invisible, `el.click()` does not move focus, and a `position:fixed`
sheet has no `offsetParent`. The audit measures settled screens and asks the
browser about focus.

**And the install audit, which needed the same browser.** `tools/pwa_audit.js`
(`npm run pwa`, 30 checks) serves the app over HTTP so a service worker may
install, then asks the questions §6 of the roadmap had been postponing: is the
manifest the one Chrome is given, are the icons the size they claim, does the
maskable icon survive being cropped to a circle, does a cold start work with the
network gone, does any of six screens overflow at any of seven widths, and do the
two home-screen shortcuts open what they name. Two of those checks are controls:
the install criteria are run against a deliberately broken manifest and must
refuse it, and the maskable measurement is run against an icon drawn to break it.
Without them every green tick above would be indistinguishable from a check that
cannot fail — which is what happened first: `Page.getInstallabilityErrors`
returns an empty list for a manifest with no icons at all in this build, so the
original "installable" verdict was worth nothing and was replaced.

**Delivery.** `release/ancestor.html`, 2.5 MB, everything inlined including the
woff2 and the three.js runtime. A service worker caches the file list, cache-first.

---

## 2. What was missing

| # | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| S1 | **High** | Two tabs overwrote each other. Every action rewrites the whole blob; a tab that had loaded ten minutes ago would erase everything the other tab did. | no `storage` listener anywhere in `js/` | **fixed** |
| S2 | **High** | A throw inside an event handler killed the button, not the screen. `render()` has had a designed failure state for months; the handler path never reached it. | no `window.onerror`, no `unhandledrejection` | **fixed** |
| S3 | **High** | A record from a *newer* build was silently downgraded: `migrate()` stamped it with this build's version, and the next save dropped the fields it did not know. | `out.version = SCHEMA_VERSION` unconditionally | **fixed** |
| S4 | **High** | An unreadable record was overwritten by the next save — the log deleted itself, silently. | `loadState()` fell through to a clean state | fixed in `bc46139` |
| S5 | Medium | Nothing ran the suites. 1,516 checks that only execute when a person remembers. | no `.github/` | **written, still off.** Pushing it was attempted on 2026-10-28 and GitHub refused: *"refusing to allow a GitHub App to create or update workflow `.github/workflows/checks.yml` without `workflows` permission"*. It is a permission on the token, not a bug in the file — the file is complete at `app/ci/checks.yml`, and the two ways to switch it on are written at the top of it. Until then `npm run verify` is the whole gate in one command. |
| S6 | Medium | `npm test` could not pass on a machine without Chrome — it ended in `tests/browser.js`. The gate that everyone runs was red by construction. | `package.json` | **fixed** |
| S7 | Medium | Escaping is by convention: 441 `esc()` calls, one helper, no test that markup cannot reach the DOM. It held; nothing proved it. | `js/ui/screens.js:25` | **fixed** |
| S8 | Medium | `tools/qa_audit.js` held a stricter standard than the app (`--hit` says 44, the tool wanted 46/52) and flagged `.fig-controls` as an overlay when it is a sibling row in normal flow. | two High findings that were wrong | **fixed** |
| S9 | Medium | `tools/keyscan.js` exited 1 on a false positive (the wordmark is not translated) and so was never run. | `untranslatable keys: en:app.name` | **fixed** |
| S10 | Medium | `body{overflow-x:hidden}` hides layout bugs instead of fixing them. | `css/app.css:168` | **fixed, removed 2026-10-28.** The rule is gone. Nothing needed it: 176 layouts (8 views × 7 languages × 320–1440 px) are clean without it, and so are the four surfaces that were never in that loop — a sheet, the planner mid-edit, a lesson and a toast, at 320 and 390 px, LTR and RTL. `tests/browser.js` now fails if any of them starts needing it. QA suite: 0 issues. |
| S11 | Medium | 50 MB of split `.rar` delivery archives were tracked in git, for a product that is 2.5 MB. `*.rar` is in `.gitignore` but the files predate it. | `git ls-files \| grep rar` → 6 files | **fixed** — `git rm --cached` on all six; they stay on disk and ignored, and the index no longer carries them. The history still does: rewriting 52 MB of history to reclaim space is an owner decision, not a code one. |
| S12 | Low | No CSP. Generated markup uses inline `onclick` in ~hundreds of places, so a CSP would need `unsafe-inline` — which is to say, there is no injection backstop if escaping ever slips. | `index.html` had no policy; 259 inline handlers | **fixed 2026-10-28.** The handlers are gone: markup names an action (`data-act="openSheet" data-a1="sleep"`) and one delegated listener per event kind calls it, through a table of 135 actions in `js/core/acts.js`. Nothing is parsed as code any more, so `index.html` can ship `script-src 'self' 'wasm-unsafe-eval'` with no `'unsafe-inline'` — and the bundle, which inlines its forty-three blocks, adds a `sha256` for each one plus one for the three.js runtime it materialises lazily. `'wasm-unsafe-eval'` is the narrow permission: it lets three.js build its decoders and still forbids `eval`. Tests: an injected `<script>` does not run, an injected `on*` attribute does not run, no source file carries a handler attribute, every action named in the markup is registered, and no registered action is dead. |
| S13 | Low | No module boundaries. 759 top-level names, implicit load order. Not a correctness bug today; it is the ceiling on how far this codebase can be changed safely. | 43 scripts, one scope | **bounded 2026-10-29.** ES modules are not available — `index.html` must open from `file://`, and modules are blocked by CORS there — so the boundary is a contract instead of a syntax: `tools/modules.js` generates `js/MODULES.md` and `--check` fails on any name owned twice, any file not loaded, any loaded file missing, or any drift between the manifest and the code. It immediately found two names owned twice (`round1` in two engine files, `langLabel` in two i18n files); both were silent shadowing and both are now single-owner. To add a global you must now regenerate the manifest in the same commit. **Still open, by choice:** the 759 names themselves. Turning them into namespaces is a mechanical rewrite of every call site, it buys nothing the manifest does not already give, and it would have to be done without a test that can see the difference. |
| S14 | Low | After a deploy, a tab can run yesterday's JS against this morning's cache: the service worker calls `skipWaiting()` and `clients.claim()`, and nothing tells the user to reload. | `sw.js` | **fixed 2026-10-28.** A `controllerchange` listener raises a strip in the header offering one action, Reload. A first install is not an update and is not announced; nothing reloads by itself, because a tab can be mid-session. The tab also asks `registration.update()` when it becomes visible again, which is the case that matters — a phone left open overnight. |
| S15 | Low | No crash reporting and no build identity on screen. `LAST_UNCAUGHT` is kept in memory and dies with the tab. | `app.js` | **fixed 2026-10-28.** `APP_BUILD` is a visible constant, shown in Profile, and `sw.js` carries the same number inside its cache name — a test fails if the two disagree, so a deploy cannot half-happen. The last uncaught error is written to `ancestor.lastcrash.v1` with its build and time, shown in Profile behind a disclosure, and clearable. Still not sent anywhere: there is no server, and a crash report that phones home would be the one feature this product refuses. |
| S16 | **High** | The recovery model handed the screen its factor labels as English sentences (`label:'Work performed'`), so the per-muscle estimate showed an English list inside French, Spanish, German, Italian, Dutch and Arabic. The interface was 7/7 translated; the number the user is asked to trust was not. | `js/engine/recovery.js` × 8 pushes | **fixed** — the engine emits `labelKey`/`noteKey` only (`rec.*`), and `screens.js` and `why.js` resolve them through `t()`. 16 new keys × 7 languages; `tests/run.js` fails if a part ever ships a sentence again or a key is missing a language, `tests/ui.js` renders the record in French and demands the English be gone. |
| S17 | Medium | Four assertions could not fail. `x \|\| true` appeared three times (`design.js` built a variable with it and never read it; `premium.js` compared the live element with itself; `ui.js` OR'd the whole condition) and `qa_audit.js` contained a bare statement whose value was discarded. A green suite that contains checks which cannot go red is worse than a smaller suite. | `grep -n "\|\| true" tests/ tools/` | **fixed** — all four rewritten to assert something real. The nav-indicator check had also hidden a second fact: `go('body')` correctly hides the indicator, because Body owns no tab. Now asserted as intent, separately. |
| S18 | Medium | The public landing page said "a suitably licensed human mesh costs more megabytes than the whole app" and never named the licence — while the app ships a 904 KB licensed mesh and embeds it in the single file. The attribution notice in `assets/` named four files that exist only in the upstream atlas and said nothing about the projection derived from the mesh, which ShareAlike also covers. | `site/template.html`, `assets/ANATOMY-ATTRIBUTION.txt` | **fixed** — the page's limitation is now "a training atlas, not a clinical model", the footer credits Z-Anatomy / BodyParts3D CC BY-SA 4.0, and `site/check.py` (4 new checks) fails if the credit disappears. The notice names what this repository actually ships and declares `figure-projected.json` and the generated figure block as Adapted Material; design group **8t** fails if any path it names is missing. |
| S19 | Medium | A failure state that expired. When the 3D model could not mount, the app fell back to the flat figure correctly and then said why in a toast: four seconds later the user was in a representation they had not chosen, with no explanation and no way back that they would find. | `js/ui/screens.js` `onFail` | **fixed** — the reason is a state (`BODY_FALLBACK`), the strip sits above the figure it explains, and `retryLab` survives until a model actually mounts. Covered in `tests/ui.js` (jsdom has no WebGL, so the real failure path is the default one there) and photographed at 390 px in French. |
| S20 | Medium | Two smaller things the screenshots caught. The Science search field set the same string as its `<label>` and as its `placeholder` — two labels, no instruction. And the filter rail announced that it scrolls only by slicing a chip in half at the viewport edge, which reads as a layout fault. | `js/ui/science.js`, `css/app.css` | **fixed** — `sci.searchHint` in seven languages for the placeholder, and a 14 px `mask-image` at both ends of the rail so what continues fades instead of breaking. The mask is direction-neutral on purpose: 8f allows exactly one `[dir="rtl"]` rule and this is not worth spending it on. `tests/science.js` group 7d holds both. |
| S21 | Low | The roadmap's own tables were stale in one direction that mattered: §1 listed "Print from history" as a screen that does not exist, and it has shipped for weeks (`openPrintRecord`, reachable from the history list and from the completion sheet). §6 listed the install audit as never done, which was true only because no browser was reachable. | `design/ROADMAP.md` §1, §6 | **fixed** — §6's two rows are done and dated (`tools/pwa_audit.js`, 30 checks); the print row is checked against the code before being trusted again. |
| S22 | **High** | Six controls with the same accessible name and six different jobs: every row on the session screen ended in a button reading "Détails de l'exercice". On screen the row supplies the context; in a screen reader's button list, a rotor, or voice control ("click Détails de l'exercice" — which one?) it does not exist. Two filter groups on the anatomy screen had the same shape: "Tout" appeared as both the layer filter and the region filter, "Dos" as both the side toggle and a region. | found by `tools/ax_audit.js` | **fixed** — the generic controls carry the name of what they act on (`exd.open — Développé couché`), and the anatomy chips carry their group (`Vue — Dos`), via a new `lab3d.filterSide` key in all seven languages. Design group 8v holds it without needing a browser. |
| S23 | Medium | The audit's own blind spots, worth recording because three of its first four failures were its fault: a card mid-stagger is at opacity 0 and genuinely focusable, `el.click()` does not move focus so "focus restoration" was tested against `<body>`, a `position:fixed` sheet has no `offsetParent` so a working sheet looked broken, and the key handler lives on the panel — a synthetic keydown on `document` never reached it. | `tools/ax_audit.js` | **fixed** — it waits for animations, asks the browser whether an element can take focus instead of reading `tabIndex`, focuses the opener before clicking it, and dispatches keys to the focused element. Seven checks are demonstrated on a deliberately broken page before any runs against the app. |

---

## 3. What changed in this pass

**S1 — adopt, do not clobber.** `store.js` gains `reloadState()`, `app.js` listens
for `storage` and re-renders from the disk. Two tabs now converge instead of one
silently winning. Tested by writing another tab's record straight into storage and
dispatching the event: the tab must end up holding *both* sessions, and it did —
`["Mine","Theirs"]`. Remove the listener and the test reports `["Mine"]`.

**S2 — one net under the handlers.** `reportUncaught()` paints the same `.fail`
block the render path paints, with the same retry, and refuses to paint a second
one over the first. Wired to `error` and `unhandledrejection`.

**S3 — a newer record is not a corrupt one, but it is the same danger.** It is
refused on the same mechanism as an unreadable one: `LOAD_NEWER`, writes blocked,
strip up, and a sentence that names the actual cause in all seven languages
(`app.load.newer`). "Update the app, or keep a copy and start again."

**S5/S6 — the gate.** `app/ci/checks.yml` runs the ten suites, `keyscan`,
`qa_audit`, the build, the smoke test and the landing-page verifier on every push,
and fails on any High QA finding. It is committed one directory away from
`.github/workflows/` because the token that pushed this branch is refused
permission to create workflow files — copy it into place and it is live. `npm test`
is now the ten headless suites; `npm run test:browser` is the one that needs
Chrome, and `test:all` is both.

**S7 — the hostile record.** Premium suite 11 seeds an imported record whose every
string field is `<img onerror>` and `<script>`, walks every destination, and asserts no
`img`, no `script`, and no execution. The escaping discipline is now an invariant
rather than a habit.

**Language is asked once, where the answer can be read.** The seven 26 px
language buttons that sat in the masthead are gone (`6f46f50`): at 390 px they
took the right half of the strip, and a question answered once is not furniture.
It is now the first screen of a first launch — the boot veil lifts onto it, before
the eleven onboarding steps, and the eleven are not where it lives. Continuing
records it in `state.lang` and in `localStorage['ancestor.lang']`, which
`js/i18n/core.js` reads before any screen exists, so the next launch paints in the
right language rather than repainting into it. The only way back is one panel in
Profile. Three guards hold all of that: `design 8r` asserts the always-visible
header row owns no control and that `Screens.lang` is a gate rather than
`ONB_STEPS[0]`, `ui 1` walks all four destinations for a language affordance in
the masthead, and `browser 0` measures it on the pixels at 390 px, where the
control would actually be. The old guard asserted `!#langs` — the selector of the
menu that had been deleted — which would have passed for any replacement.

**S12 — and if the escaping does slip.** Premium 11 proves the strings are
escaped; the policy is what covers the day one is not. An injected
`<script>` and an injected `on*=` attribute are both refused by the browser in
suite 6b, and the source carries no handler attribute at all for an injected one
to hide behind. What is *not* covered: `style-src` still allows
`'unsafe-inline'`, because thirty-nine generated `style="…"` attributes would
otherwise stop rendering — that is a styling hole, not a script one, and it is
written down rather than forgotten.

**S8/S9 — the tools stopped lying.** `qa_audit` reads `--hit` from the stylesheet
instead of carrying its own opinion, accepts an invisible expander as a valid
target, exempts chips with the same reason the design tests use, and checks
`position` before claiming an overlay. Its two High findings were both wrong; it
now has one standing Medium, which is real. `keyscan` allows the wordmark and is
now in CI.

---

## 4. Numbers, so they stop being assumptions

- **One session is 327 bytes.** The 5 MB `localStorage` ceiling is ~16,000
  sessions — a century at three a week. Quota exhaustion is not the risk it looks
  like; the real cost is that every action re-serialises the whole blob (≈0.5 MB
  at 1,600 sessions), which is fine on a tap and would not be inside a loop.
- **1,776 translation keys × 7 languages**, scanned green by `keyscan` across six
  screens, every sheet, the exercise library and three learning modules.
- **542 content keys, complete in all seven.** Measured, not claimed: the
  interface and the lessons are counted separately, and every language now
  reports 542/542 on both. The last block — 306 keys of science prose that only
  English and French had — is translated in `js/i18n/science.js`, in the
  `TSP` layer at the end of the file.
- **43 scripts, 2.5 MB, zero runtime dependencies.** The largest single file is
  the vendored three.js (4,220 lines) — lazily loaded, never on the critical path.
- **The masking rule is gone.** `overflow-x:hidden` on `body` was carried as an
  accepted risk for a long time, and it earned the label twice. At 1024 px the
  `.shell` was an over-constrained block — `width:100%` plus the rail's 200 px
  inline-start margin — so Chrome kept the margin, computed a *negative*
  inline-end margin, and the document measured 1224 px wide; every screen at the
  rail breakpoint was clipped by 200 px and the rule hid the evidence. Then the
  printed sheet printed 900 px wide on a 390 px phone, same rule, same silence.
  It was removed on 2026-10-28 with the browser suite as the evidence: 176
  layouts and four overlay surfaces, all clean, nothing to hide. This is the
  one place in the codebase where *deleting a declaration* was the fix — a
  rule that hides a class of bug hides the bug from the person who would have
  fixed it.

---

## 5. What I would do next, in order

1. ~~**Run `tests/browser.js` once.**~~ **Done.** 28/28 green: the 3D atlas
   renders (218 meshes, real pixels, picking works), no screen overflows across
   96 layouts (8 views × 6 widths × LTR/RTL), the app reloads with the network
   cut, and the shipped bundle boots offline. It found seven things jsdom
   structurally could not — see `DESIGN.md` §3.13. Keep it green.
2. ~~**An update prompt** (S14).~~ **Done** — `controllerchange` raises a strip
   with one action, a first install stays quiet, and nothing reloads itself.
3. ~~**A build id on screen** (S15).~~ **Done** — `APP_BUILD`, shown in Profile,
   tied to the cache name by a test, with the last uncaught error beside it.
4. ~~**Remove the inline handlers and add a CSP** (S12).~~ **Done** — 259 inline
   handlers became 135 named actions behind two delegated listeners, and the
   policy that follows has no `'unsafe-inline'` in it. The bundle's forty-three
   inlined blocks are hashed into the same tag, so the policy cannot drift from
   what the build wrote.
5. **Module boundaries** (S13, large): `js/` is already correctly partitioned —
   `core`, `engine`, `data`, `ui`, `i18n` — and the scripts are ES5-ish globals
   because they are inlined. If the app is ever to be worked on by more than one
   person at once, that is the change; today it is a preference, not a defect.
6. **Decide about the archives** (S11): they are the original delivery, and they
   belong in a release, not in history. Removing them from the working tree is a
   one-line `git rm --cached`; removing them from history is a rewrite I would not
   do to a shared branch without being asked.

---

## 6. The invariants that are now tests

| Invariant | Where |
|---|---|
| a write from another tab is adopted, not overwritten | premium 11 |
| a record from a newer build is refused, not downgraded | premium 11, design 8l |
| an unreadable record is held, not overwritten | premium 10, design 8l |
| a refused write is retried, and the retry stops itself | premium 10, design 8l |
| no confirmation claims a write that did not happen | premium 10, design 8l |
| a hostile record cannot put markup into any screen | premium 11 |
| an injected script or handler attribute cannot run | browser 6b |
| every action in the markup is one the app registered | ui 31 |
| the flat figure is the shipped model, projected, not paths typed by hand | design 8s |
| the masthead carries no language control, on any destination | design 8r, ui 1, browser 0 |
| a first launch asks the language before any onboarding step | design 8r, ui 1, browser 0 |
| a throw outside `render()` still lands on the failure state | premium 11, design 8l |
| every control is 44 px, or carries an invisible target | design 8n, `qa_audit` |
| every state label clears AA on the wash it sits on | design 8m |
| no translation key reaches a screen verbatim | `keyscan` (in CI) |
| the built single file boots and can be used | `smoke_dist.js` (in CI) |
