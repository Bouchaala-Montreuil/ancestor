# site/

The landing page. One file, no build step needed to view it, no requests.

```
index.html      built — open it directly, or serve it
template.html   the page, with @TOKENS@ where the art and the fonts go
build.py        template + figures + fonts  ->  index.html
check.py        the checks that can be made without a browser
figures/        the app's own drawings, copied out of the running DOM
```

```bash
python3 site/build.py            # writes site/index.html  (~88 KB)
python3 site/check.py            # 61 checks: no network, structure, colour, type,
                                 # motion, inline styles, and the numbers in the copy
python3 site/measure_type.py     # real advance widths vs the column at 11 widths
                                 # (needs: pip install fonttools brotli)
```

## Why there is a template

The page must be one file that works from `file://`: the two woff2 weights and
every figure are inlined as data URIs. Hand-pasting 60 KB of base64 into HTML is
how a page rots, so the art and the fonts live as real files and `build.py`
assembles them. `index.html` is a build product and is committed, because the
page is the deliverable.

## Where the figures come from

Nothing on this page is invented decoration. `figures/*.svg` are pulled out of
the *running app* — `patternKinematicSvg`, `exerciseFigureSideSvg`, `lineChart`,
`barChart` and the mark — with `jsdom` loading `app/index.html` through
`app/css/app.css`. The same classes (`.k-i`, `.k-b`, `.dv-axis`, `.chart-path`)
are then defined in this page's stylesheet, so a figure is literally the app's
drawing rather than a redraw of it.

To regenerate them after changing the app, in `app/`:

```js
// with jsdom + the app's index.html loaded as in app/tools/smoke_dist.js
w.eval("patternKinematicSvg({pat:'squat'})")        // -> figures/squat.svg
w.eval("lineChart({...})")                          // -> figures/line.svg
```

Then run `python3 site/build.py`.

## What is not verified

**Nobody has looked at this page in a browser.** There is no browser and no
network in the environment it was built in, so the layout was reasoned from the
stylesheet and checked structurally — no external reference, unique ids, heading
order, every link resolving, every colour inside the palette, every text/background
pair at AA, no font below 9 px, motion only behind `prefers-reduced-motion`,
nothing animating in a loop, and the un-animated chart still drawn. The numbers in the copy are read back out
of the app's data files — 68 exercises, 11 lessons, 14 evidence records, 7
languages, the size of the single file — so the page cannot claim something the
code stopped being true.

The figures *were* looked at: they are rendered to PNG through `librsvg` and
judged at size, which is how the drawings in `design/icons/` were fixed.

If something sits wrong when you open it, it will be spacing or a breakpoint, not
a missing rule — every value in the page comes from the same scale the app uses.
