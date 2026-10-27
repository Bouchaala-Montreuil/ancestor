# Data-viz

Everything in this app that is drawn *from numbers* — the load trend on Progress,
volume by muscle, the sparkline on Today, the progress ring — obeys one grammar,
the same way the exercise drawings do. The grammar is not a chart library; it is
about fifteen lines of SVG and a scale function that produces round numbers.

`dataviz-before.png` and `dataviz-after.png` are rasterised from the live DOM
through the real stylesheet, at the size the charts actually ship.

## What was wrong

Five defects, all of them visible in `dataviz-before.png`:

| | before | why it mattered |
|---|---|---|
| axis | `36 · 52 · 68 · 84 · 100` over a 42–52.5 kg series | `min = rawMin * 0.85` invents a floor and only the top of the range is rounded. The labels are not a ruler, and a reader cannot estimate a value from them. |
| range | the series occupied the top 5 % of the plot | the shape of the trend — the only thing a line chart is for — was flattened into a nearly straight line. |
| points | hollow rings (`fill:paper`, `stroke:ink` 1.5) | the hole makes every point read as unfilled, and the stroke doubles the apparent size so the noise looks like signal. |
| labels | `CH` and `12` stacked in two rows under every bar | the value was printed twice over — once above the axis, once below it — and the second row pushed the axis label up into the bar. |
| colour | bars at `fill-opacity:.85`, line in ink, every bar charcoal | one series was rendered in a state ("85 % of a colour") that means nothing, and the tracked quantity had no colour of its own. |

Two of these were *bugs*, not taste:

1. **`var()` does not work in an SVG presentation attribute.** `barChart` received
   `col:'var(--burnt)'` per row and wrote it into `fill="…"`, which no browser
   resolves. The bars only had a colour because a stylesheet rule
   (`.chart-bar{fill:var(--ink)}`) overrode the attribute — in charcoal. The
   colour channel was decorative, broken, and the same for every bar. It is gone:
   one series, one colour, declared in CSS.
2. **A hollow dot was an inheritance accident.** `.chart-pt` is the focusable
   `<g>` around a point and it carried `fill:paper; stroke:ink`. Every circle
   inside it inherited that, so a "solid" dot rendered as a ring. Paint now
   belongs to the mark (`.dv-dot`), and `.chart-pt` is only a hit area.

## The grammar

```
domain    niceScale(lo, hi, 4) — a step-based scale, rounded at BOTH ends
grid      1 px  --line-soft, one line per tick, never above the data
axis      the baseline only: 2 px --ink. No box, no frame, no arrows.
          (the y-axis is the labels; the x-axis is the baseline)
tick      mono 9.5 px --tech-ink, tabular figures, 8 px clear of the plot
series    --burnt, 2 px, miter joins, butt caps — a measured line, not a stroke
point     2.8 px solid --ink; the best point 5.2 px --burnt with a 2 px paper halo
bar       --burnt, square, from the baseline; a zero is a 2 px --line stub
value     mono 9 px --ink-2, above the bar it belongs to, clamped inside the plot
readout   one line of live text under the chart — the value channel for
          pointer, focus and screen reader alike
```

Why these numbers: at the shipping width (roughly 640 units wide) 1 px is the
finest line a printer and a 1× screen both hold; 2 px is the only weight heavy
enough to read as a rule without becoming a border. Mono for every number, because
columns of figures only line up in a mono face and a chart axis *is* a column.

### The scale

```js
niceStep(raw)   // 1, 2, 2.5, 5, 10 × 10^n
niceScale(lo, hi, ticks)
  step = niceStep((hi - lo) / ticks)
  min  = floor(lo / step) * step
  max  = ceil (hi / step) * step
```

It returns `{min, max, step, labels, dp}`. Both ends round outward, so the data is
always inside the domain and every label is a multiple of the step:

| data | ticks | labels |
|---|---|---|
| 42 – 52.5 kg (+8 % pad) | 4 | `40 45 50 55` |
| 0 – 15.4 sets | 4 | `0 5 10 15 20` |
| 0.4 – 0.9 ratio | 4 | `0.4 0.6 0.8 1.0` |

A bar chart starts at zero because a bar's length *is* its value; a line chart
starts at the nice floor, because a line's value is its height, not its length.

## States

A chart that has nothing to say says so, and draws nothing:

- **no points** → `emptyState` with the blank tally. No axes, no placeholder line.
- **one point** → a banner: *a single session is a point, not a trend*, plus that
  point's value in the text. A one-point "line" is a lie about a trend.
- **zero in a bar series** → a 2 px stub on the baseline. `1 px` reads as a
  rendering artefact; a taller minimum reads as a small value.
- **unknown / sleeping days** → the `.chart .sleep` band stays a 10 % ink tint,
  behind the data, never a colour of its own.

## Motion

Motion here has one job: to say which way to read. There is one entrance per
screen, and it does not loop, bounce, or re-run on scroll.

| element | entrance | duration | easing |
|---|---|---|---|
| series path | `chart-draw` — `stroke-dashoffset 1000 → 0` (path is `pathLength="1000"`) | 620 ms (`--t-count`) | `--ease` |
| points | `dot-in` — `scale(.2) → 1`, opacity 0 → 1, staggered across the draw | 180 ms (`--t`) | `--ease` |
| bars | `bar-rise` — `scaleY(0) → 1` from the baseline, 45 ms apart (`--t-stagger`) | 280 ms (`--t-slow`) | `--ease` |
| ring | `animateRing` — dash offset from the previous real value (or empty) to the real one | 620 ms | `--ease` |

**The un-animated state is the finished chart.** The dash offset and the zero
scale live in the keyframes, with `both` fill, so the stylesheet's default state
is a fully drawn series. A print pass, a browser that drops the animation, or a
page rendered without JS all show the data. The ring's markup carries its
finished arc for the same reason: a ring that prints *72 %* next to an empty
track is worse than a ring that does not animate.

`prefers-reduced-motion: reduce` — and the app's own `html[data-motion="on"]`
switch — collapse all of it to 1 ms with a global rule at the end of `app.css`.
Content still arrives; nothing moves. Nothing in the charts is load-bearing for
motion: the entrance is decoration over a complete drawing.

## Interaction

Every mark is reachable and answerable:

- the `<g>` around a point or bar is `tabindex="0"`, `role="listitem"`, carries
  an `aria-label` with the full reading ("12 Aug — 42 kg"), and has a `<title>`;
- pointer enter, focus and click all write the same string into the readout,
  which is `aria-live="polite"`, so keyboard and screen reader get the value
  without hunting;
- focus draws a 2 px burnt outline on the mark itself (`:focus-visible`), never
  a box around the plot.

## Guards

`tests/design.js` group **8k** holds the grammar in place: the scale is executed
and its labels checked, no chart may carry a hex or a `fill-opacity`, the `dv-*`
classes must exist in the stylesheet, and no `stroke-dashoffset` may be set
outside a keyframe (which would make the static chart invisible).
