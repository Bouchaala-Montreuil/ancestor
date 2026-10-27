# States

Six tabs × five states, audited rather than remembered. The matrix below is
what each screen actually renders when there is no data, when something breaks,
when the radio is off, and when work is genuinely in flight.

Two more states are not per-screen at all, so they get their own place at the
end: the device refusing to save, and the record it cannot open. Both outlive
navigation, both live in the header, and both are about the one thing the app
cannot rebuild — the log.

Four things came out of writing it down.

**Most of the matrix is empty, and that is the design.** The app is synchronous:
nothing on Today, Session, Body or Progress waits for a network. So "waiting" is
not a per-screen state at all — it exists in exactly three places (below), and
every screen inherits them. A matrix that pretends otherwise would be a
spreadsheet of ways to draw spinners.

**One cell was broken.** A record naming an exercise this build does not have —
an import from an older version, a renamed exercise — crashed Progress, and the
crash reached the screen as a stack trace. It is now a state: the record is
kept, named, and exported unchanged.

**One state did not exist at all.** `saveState()` caught every write error and
returned `false`, and not one caller looked. A full or locked-down quota,
Safari private mode, an in-app browser with storage switched off: the session
was logged, drawn, charted — and gone at the next reload, with the app looking
perfectly healthy. A failure nobody reads is not a failure state; it is a
silence. There is now a header strip, and it is the only thing in the app that
says the word *saved*.

Then the strip found a second lie underneath the first. Eight call sites wrote
`saveState(); toast(t('…saved'), 'ok')` — the write and the claim, side
by side, with the claim never looking at the write. A refused save would have
produced a green *Saved* toast directly above a red *Not saved* strip, on the
same screen, at the same moment. Confirmations now go through `savedToast()`,
which reads the last write before it congratulates anyone.

**And its mirror was worse.** The same audit, one layer down: `loadState()` caught
every read error and started clean — and then the next save wrote the clean state
over the damaged one. A truncated record (a crash mid-write, a bad import, a
browser that died) became a *deleted* log, silently, on the next keystroke. There
was no error message in the product for that, because there was no error: the app
looked like a first run.

---

## The states, one primitive each

| state | what it means | the one component | where it lives |
|---|---|---|---|
| **empty** | there is nothing to show, and that is legitimate | `.empty` — blank tally, title, body, and an action when there is one | per screen |
| **waiting** | something is genuinely in flight | `.skel` (bars shaped like the thing coming) · `.wait` (the fifth stroke arriving) · `.btn.loading` (masked tally in the button) | three places only |
| **failed** | the render itself threw | `.fail` — broken tally, one sentence, retry, a route to Today, stack behind a disclosure | global |
| **offline** | the device has no network, which changes nothing | `#netFlag` in the header — "Offline · everything works" | global |
| **busy** | a control is working and cannot be pressed twice | `.btn.loading[aria-busy]` | import |
| **refused** | the device declined the write; the data exists only in memory | `.store-flag` — alert rule, `!` mark, one sentence, and the export button | header, every screen |
| **unreadable** | there is a record, and this build cannot open it | the same strip, a different sentence, and one action that keeps a copy before the log restarts | header, every screen |

## The matrix

| | **empty** | **waiting** | **failed** | **offline** | **busy** |
|---|---|---|---|---|---|
| **Today** | "Start where you are" instead of a verdict; coverage panel says it has nothing to cover; no sparkline, no fake trend | — | whole screen → `.fail` | header flag only | — |
| **Session** | no plan → `.empty` with the action that builds one; plan but no history → a *first time, establish a baseline* banner | — | whole screen → `.fail` | header flag only | — |
| **Body** | nothing selected → `.empty` "Select a muscle group"; a selected muscle with no recorded work → `.empty` inside the record | the 3D lab draws `.skel` while its model loads; the flat figure is already usable underneath | 3D lab fails → falls back to the flat figure; a thrown screen → `.fail` | header flag only | — |
| **Progress** | no sessions → `.empty` with the action that starts one; one session → *a single point cannot show a trend* banner, no line drawn; unknown exercise ids → a note that the records are kept | — | whole screen → `.fail` | header flag only | — |
| **Science** | search with no matches → `.empty` with a way to clear the filters; a lesson body not in the current language → the English text under an explicit note | module model load → `.skel` | whole screen → `.fail` | header flag only | — |
| **Profile** | the defaults, and a warn banner once five sessions exist without a recent export | file read → the import button's `.loading` + `aria-busy` | bad file → error toast, nothing lost; thrown screen → `.fail` | header flag only | import |

The sixth state is deliberately absent from the matrix: it is produced by
`saveState()`, not by a screen, and it does not replace whatever the screen was
showing. A user who logs a set into a full quota stays on Session, with their set
visible and the header saying it is not saved — which is the correct behaviour and
the reason a column would have been a lie.

## The rules

1. **A state never invents data.** No sample chart, no placeholder row, no
   "example" session. If there is nothing, the screen says so.
2. **An empty state carries a title and a body**, and an action when the user can
   actually do something about it. Eleven call sites, all checked.
3. **One failure state.** Every tab degrades to the same component, which offers
   retry and a route to Today, and keeps the stack trace behind
   `<details>`. A user never sees a stack trace by default.
4. **Offline is a capability, said once.** One header flag, worded as reassurance
   ("everything works"), never an error banner. The product has no server to be
   offline from.
5. **Waiting is never a spinner.** There is one waiting mark — the tally with its
   fifth stroke arriving — and it appears in a skeleton, a boot veil and a button.
6. **Data that cannot be drawn is kept, named and exported.** An unknown exercise
   id yields no history, a note on Progress, and an unchanged export.
7. **A state is a promise until something can end it.** The storage strip appears
   when a write fails and disappears when one succeeds — it is derived from the
   last write, not set once. And it retries by itself: a timer, a focus, a tab
   coming back from suspension. Reporting a failure is not the same as accepting
   one. Same for offline, same for the failure state's retry.
8. **A confirmation is a claim about a write, so it checks the write.** No screen
   says *saved* on the strength of having called the function that saves.
   And a kind with no rule is not a kind: six error toasts passed `'err'` for
   eleven passes while the stylesheet only knew `.toast.ok` and `.toast.alert`, so
   every error looked exactly like a message.
9. **A wash is light, so the word on it is ink.** The state colour lives in the
   dot, the rule and the tint. Two flags had been painting a 9px label in its own
   state colour on its own tint — 4.00:1 and 3.98:1, under AA, on the two states
   that mean *caution* and *new*. Measured after compositing, not assumed.

## What is verified

`tests/premium.js` group **10** (35 checks) drives the matrix in jsdom: all six
tabs on an empty record, Body with no selection, Progress with no sessions and
with one, a log made only of unknown exercise ids (no crash, a note, and the set
still in the export), a screen forced to throw, the offline flag, the busy
control's mark-and-clear, and — with `localStorage.setItem` redefined to throw —
the strip rising, naming the failure in words rather than a raw key, offering the
export, still carrying the unsaved session, staying silent about success while the
write is failing, clearing on the next good write with the confirmation returning
only then, and coming back to life on its own: the retry armed while the write is
refused, fired by the app regaining focus, landing the session that failed, and
stopping itself once it has. And, with a truncated record seeded into storage
before boot: the strip rises with a different sentence, `saveState()` refuses, a
logged session does not replace the bytes, the action archives the original under
its own key, and writes resume only after that.

`tests/design.js` group **8l** (17 checks) holds the structural side: the busy
style has a producer, there is one failure state, the stack is disclosed not
printed, every empty state is titled and bodied, unknown ids cannot have a
history, the storage strip is styled *and* produced by the save path in seven
languages, the eight confirmations all pass through one guard, the retry has a
producer and a cancel, an unreadable record is held rather than overwritten and is
explained in all seven languages, every toast kind has a rule, and no fourth
spinner has crept in.

`tests/design.js` group **8m** (3 checks) measures the other half: every tint
composited over the page before the contrast is computed, no state flag allowed
to paint its own label, and no token declared without a reader — which is how
`--ease-spring`, `--line-hair`, `--nodata-tint` and `--burnt-deep` were found
dead in a file that had been through five audits.

The whole suite is 1,315 checks over ten files; `python3 build.py` plus
`tools/smoke_dist.js` boots the built single file and repeats the walk there.

## What is not verified, and what this matrix cannot say

- **Nothing has been seen on a device.** These states were rendered in jsdom and
  read as markup; how a skeleton *feels* while a phone is on a bad connection is
  not in here.
- **The storage strip was tested by simulation.** Writes were made to throw in
  jsdom; a genuinely full quota on a real device, Safari's private mode, and an
  embedded browser with storage disabled have not been reproduced. Neither has the
  case where the write fails while the strip is already on screen at boot.
- **The damaged-record path was tested by seeding a truncated string.** A real
  half-written record from a real crash — a phone dying mid-save, a browser killed
  by the OS — has not been reproduced. Neither has the case where the *archived*
  copy itself cannot be written because the disk is full.
- **The retry is not a queue.** It re-saves the whole state from memory every
  fifteen seconds, on focus, and on a visibility change — so a quota that frees up
  is recovered without the user doing anything. What it cannot survive is the app
  being closed while the write is still refused: the memory goes with the tab, and
  the strip's export is the only way out. There is no replay log, and a phone that
  is asleep for the whole window retries once on wake, not continuously.
- **The strip is one line of English-shaped layout.** It wraps, it is logical-
  property correct, and it has not been looked at in German (long compound) or in
  Arabic (RTL) at 320 px.
- **A partial import.** If some records in a file are unreadable, the import is
  all-or-nothing at the JSON level and says nothing about what it dropped. The
  unknown-exercise note covers the case that can be named; a per-record report is
  not built.
- **RTL.** Arabic is a shipping language and the states above are laid out with
  logical properties, but no one has looked at the failure state in Arabic.
