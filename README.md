# ANCESTOR

**A clinical dossier for one body.** A free, offline-first training app: it
decides what to do today from what you actually lifted, then shows you the
working. No account, no cloud, no tracking.

```
app/       the product — five destinations, 88 exercises, 11 lessons, 7 languages
design/    the direction, the system, the artefacts, the roadmap, the case study
site/      the landing page (one file; figures copied from the app)
```

## Open something

| | |
|---|---|
| the app | `app/index.html`, or the built single file `app/release/ancestor.html` (about 3.0 MB, works from `file://`) |
| the landing page | `site/index.html` |
| the direction | `design/CLINIC.md` |
| the case study | `design/CASE_STUDY.md` |
| what is still missing | `design/ROADMAP.md` |
| how the software is put together | `app/ARCHITECTURE.md` |
| the states, audited | `design/STATES.md` |
| this pass, end to end | `design/REPORT.md` |

```bash
cd app && npm run preview                   # the app
python3 -m http.server 8080                # the repo (app, site and design/ documents)
```

## Verify something

```bash
cd app
PUPPETEER_SKIP_DOWNLOAD=1 npm ci            # Node ^22.17.0 or >=24.0.0
npm run verify                              # headless, packaging and site gate
source tools/chromium.sh                    # install the separately locked browser helper
npm run test:browser                        # Chromium journeys, WebGL, layouts and offline
npm run pwa && npm run ax                   # install and accessibility-tree audits
npm run audit:deps                          # networked npm audit of both lockfiles
```

The browser and networked dependency audits are separate from `npm run verify`.
The Chromium keyboard suite covers focus, dialogs, selected states and offline
reloads; it is not a substitute for real screen-reader or physical-device testing.
See `app/README.md` for the individual suites, results and remaining launch work.

The current tab’s log can be exported from Me → Data, but an export **does not
include an active workout**. Check that the download was saved and keep a
separate copy: the local IndexedDB mirror is best effort, not an independent
backup. Close other app tabs before importing or erasing; see the recovery
guidance in `app/README.md`.

## Look at it

```bash
cd app && npm run preview        # http://0.0.0.0:8000, HTTP/1.1 with keep-alive
```

`tools/preview.js` exists instead of `python3 -m http.server` for two reasons
that both showed up as real bugs: Python answers HTTP/1.0 and closes the
connection after every response, which through an HTTPS proxy can leave the
browser waiting on a page it never finishes; and it logs a line per request but
no Host or User-Agent, so when a preview was inert the only evidence was that
`GET /` had arrived once and no sub-resource ever had. The Node server answers
HTTP/1.1 with an exact `Content-Length`, `Cache-Control: no-store`, the right
type for `.webmanifest` and `.glb`, and one log line per request carrying the
host and user agent. If the panel is ever inert again, read that log first: a
document with no sub-resources is a delivery problem, not an app bug.

## The rules it is held to

- **Dark by default, ivory paper on request, one burnt accent.** Burnt is a signal,
  not decoration: primary action, selection, one data series. The palette is
  roles, not hex values; see `app/DESIGN.md` §0.
- **Offline by construction.** No CDN, no remote font, no analytics; the app is
  one file and asks for nothing at runtime.
- **People-free heroes.** Cinematic training textures are paired with original,
  faceless instructional diagrams; the guides are illustrations, not recordings.
- **Free.** No account, no ads, no tiers.

The display face is Barlow Condensed (SIL OFL 1.1), bundled and inlined; the
licence is in `app/fonts/OFL.txt`.
