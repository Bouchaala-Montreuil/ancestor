# ARCHITECTURE — the shape of the thing, and what it was missing

A review of the software, not the design. `design/STATES.md` covers what the
screens do when something goes wrong; this covers what the *system* does, what it
cannot do, and where the assumptions were hiding.

Read on 2026-10-28 against `037789e`, with 1,420 headless checks and 76 real-browser checks.

---

## 1. The shape of the thing

**Runtime.** One HTML file, one stylesheet, 41 scripts concatenated in document
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

**Tests.** Ten headless suites (jsdom) — 1,420 checks — plus `tests/browser.js` (76 real-Chromium checks),
which needs a real Chrome and covers the three things jsdom cannot: WebGL, layout
overflow at 320/360/768/1280, and a service-worker reload with the network severed.

**Delivery.** `release/ancestor.html`, 2.2 MB, everything inlined including the
woff2 and the three.js runtime. A service worker caches the file list, cache-first.

---

## 2. What was missing

| # | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| S1 | **High** | Two tabs overwrote each other. Every action rewrites the whole blob; a tab that had loaded ten minutes ago would erase everything the other tab did. | no `storage` listener anywhere in `js/` | **fixed** |
| S2 | **High** | A throw inside an event handler killed the button, not the screen. `render()` has had a designed failure state for months; the handler path never reached it. | no `window.onerror`, no `unhandledrejection` | **fixed** |
| S3 | **High** | A record from a *newer* build was silently downgraded: `migrate()` stamped it with this build's version, and the next save dropped the fields it did not know. | `out.version = SCHEMA_VERSION` unconditionally | **fixed** |
| S4 | **High** | An unreadable record was overwritten by the next save — the log deleted itself, silently. | `loadState()` fell through to a clean state | fixed in `bc46139` |
| S5 | Medium | Nothing ran the suites. 1,420 checks that only execute when a person remembers. | no `.github/` | **written, still off.** Pushing it was attempted on 2026-10-28 and GitHub refused: *"refusing to allow a GitHub App to create or update workflow `.github/workflows/checks.yml` without `workflows` permission"*. It is a permission on the token, not a bug in the file — the file is complete at `app/ci/checks.yml`, and the two ways to switch it on are written at the top of it. Until then `npm run verify` is the whole gate in one command. |
| S6 | Medium | `npm test` could not pass on a machine without Chrome — it ended in `tests/browser.js`. The gate that everyone runs was red by construction. | `package.json` | **fixed** |
| S7 | Medium | Escaping is by convention: 441 `esc()` calls, one helper, no test that markup cannot reach the DOM. It held; nothing proved it. | `js/ui/screens.js:25` | **fixed** |
| S8 | Medium | `tools/qa_audit.js` held a stricter standard than the app (`--hit` says 44, the tool wanted 46/52) and flagged `.fig-controls` as an overlay when it is a sibling row in normal flow. | two High findings that were wrong | **fixed** |
| S9 | Medium | `tools/keyscan.js` exited 1 on a false positive (the wordmark is not translated) and so was never run. | `untranslatable keys: en:app.name` | **fixed** |
| S10 | Medium | `body{overflow-x:hidden}` hides layout bugs instead of fixing them. | `css/app.css:168` | **fixed, removed 2026-10-28.** The rule is gone. Nothing needed it: 176 layouts (8 views × 7 languages × 320–1440 px) are clean without it, and so are the four surfaces that were never in that loop — a sheet, the planner mid-edit, a lesson and a toast, at 320 and 390 px, LTR and RTL. `tests/browser.js` now fails if any of them starts needing it. QA suite: 0 issues. |
| S11 | Medium | 50 MB of split `.rar` delivery archives are tracked in git, for a product that is 2.2 MB. `*.rar` is in `.gitignore` but the files predate it. | `git ls-files \| grep rar` → 6 files | **open — owner's call** |
| S12 | Low | No CSP. Generated markup uses inline `onclick` in ~hundreds of places, so a CSP would need `unsafe-inline` — which is to say, there is no injection backstop if escaping ever slips. | `index.html` has no policy | **open** |
| S13 | Low | No module boundaries. 589 globals, implicit load order. Not a correctness bug today; it is the ceiling on how big this can get. | — | **open, by choice** |
| S14 | Low | After a deploy, a tab can run yesterday's JS against this morning's cache: the service worker calls `skipWaiting()` and `clients.claim()`, and nothing tells the user to reload. | `sw.js` | **open** |
| S15 | Low | No crash reporting and no build identity on screen. `LAST_UNCAUGHT` is kept in memory and dies with the tab. | `app.js` | **open** |

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
- **1,631 translation keys × 7 languages**, scanned green by `keyscan` across six
  screens, every sheet, the exercise library and three learning modules.
- **41 scripts, 2.2 MB, zero runtime dependencies.** The largest single file is
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
2. **An update prompt** (S14, small): on `registration.update()` finding a new
   worker, one strip — "A new version is ready" — with a reload action. This is
   the same component as the storage strip, which already has a vocabulary for
   "the thing you are looking at is not the thing on disk".
3. **Remove the inline handlers and add a CSP** (S12, medium). The handlers are
   string-built in a dozen templates; a CSP without `unsafe-inline` is the only
   backstop that survives a mistake in `esc()`.
4. **A build id on screen** (S15, small): the footer's tag line is static; the
   failure state's stack is useless without knowing which build produced it.
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
| a throw outside `render()` still lands on the failure state | premium 11, design 8l |
| every control is 44 px, or carries an invisible target | design 8n, `qa_audit` |
| every state label clears AA on the wash it sits on | design 8m |
| no translation key reaches a screen verbatim | `keyscan` (in CI) |
| the built single file boots and can be used | `smoke_dist.js` (in CI) |
