# The eleven movement patterns

Redrawn from one grammar. Before this they were four drawing styles: stroke
weights from 1.6 to 3, round caps on some and square on others, heads as
circles of two sizes, and **47 hardcoded hex colours** baked into the strings —
so the drawings never followed the palette and no theme could reach them.

## The rule

| element | spec |
|---|---|
| frame | 140 × 94, no border |
| body | ink, 3.2, square caps, straight segments only |
| joint | a 3.2 solid square |
| head | an 11 solid square — mass, never a circle |
| load | a bar with two plates |
| force | one burnt arrow: the direction the load is driven |
| range | a dashed burnt arc, plus a 3 px dot at the joint doing the work |
| ground | a hairline, only under a supported body |

Curves appear in exactly one place — the range arc. Colour comes from
`.k-i` / `.k-b` / `.k-r`, defined in `app.css` against `--ink`, `--burnt` and
`--line`. The arrowhead is a drawn path: it used to be an SVG `<marker>` with
its fill hardcoded.

Why the head is a square: the Body icon uses the same shape, and a circle head
at diagram scale reads as a joint. Once the head is mass and the joints are
3.2 squares, every figure is legible at 120 px in a panel.

## Files

- `patterns-before.png` — the eleven as they were.
- `patterns-after.png` — the eleven now, rendered **out of the live DOM with
  the real stylesheet**, which is how the classes were verified to resolve.
- `nav-19-actual.png` — the six section marks at their real size.

## Where it lives

Geometry: `app/js/ui/components.js`, the `KIN` block, built from `seg()`,
`joint()`, `head()`, `bar()`, `force()`, `arc()`, `ground()`. Colours:
`app.css`, the KINEMATIC block. Tests: `tests/design.js` group 8j.
