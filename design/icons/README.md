# The six section marks

Drawn, not borrowed. Every mark is built from the wordmark's numbers:

| | |
|---|---|
| Grid | 24 × 24 |
| Mass (stroke weight, as solid) | 2.4 |
| Margin | 3.2 |
| Vertical span | 4.2 → 19.8 |
| Right edge | 20.8 |

Solid fills, not strokes. A 1.4 px hairline at 19 px on a 3× screen greys out;
2.4 px of mass does not.

| Section | Mark | Why |
|---|---|---|
| Today | a calendar with one day inked | one day, not a week |
| Session | a tally of two | the product counted something |
| Body | the figure as mass | a stick figure is three dashes at 19 px |
| Progress | ascending bars on a baseline | the figure the product is about |
| Profile | the dossier stamp, record knocked out | the device that numbers every section |
| Science | a stack of spines | an index of what is known, not a document |

## Files

- `nav-96.png` — the six at 96 px, for review.
- `nav-19-actual.png` — the same six at their real size (19 px), blown up with
  a nearest-neighbour kernel so the actual pixel pattern is visible. **This is
  the one that matters.** A mark that does not survive at the size it is used
  is not a mark.

## Source of truth

The geometry lives in `app/js/app.js` (`NAV`, with `T_ICON`/`M_ICON`/`Y_ICON`
as named constants) because the tab bar builds its markup from it. The same
numbers are recorded in `design/build-marks.js` for the wordmark and the tally.
