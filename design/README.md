# design/

Everything visual that is not the app itself.

```
ROADMAP.md           what the design still needs, prioritised, with effort
CLINIC.md            the design direction, the rules, and what changed
identity.html        the identity sheet — mark, lockups, colour, type, verdict
compare.html         before / after, both frames live, same data
before/              the original stylesheet + a page wired to the current app
print-sheet.html     the A4 training record — static specimen
print-sheet-live.html the same sheet rendered from the app's own engine
build-live-sheet.js  regenerates print-sheet-live.html from a seeded log
build-marks.js       the mark's six numbers → every SVG and PNG the product uses
build-sheet.py       generates print-sheet.html
marks/               mark + icons at every size, plus a contact sheet
```

## Regenerate

```bash
node design/build-marks.js      # marks + icons (writes design/marks/)
python3 design/build-sheet.py   # the A4 specimen
node design/build-live-sheet.js # the A4 sheet as the app actually prints it
python3 app/build.py            # the single-file app
```

After regenerating icons, copy them into the app:

```bash
cp design/marks/icon-*.png design/marks/apple-touch-icon.png \
   design/marks/favicon-32.png design/marks/*.svg app/img/
```

## The mark

A tally: four strokes of recorded work, and the fifth that closes the set.
Six numbers define it (`margin 3.2 · stroke 2.4 · y 4.2–19.8 · slash 19.4 at −16°`
on a 24 grid); everything from the 16 px favicon to the 176 px cover is generated
from those. It is embedded in the stylesheet as a percent-encoded data URI, so the
app carries it with no extra request and no build step.

Minimum size 16 px. Below that, use the icon or drop the mark.
