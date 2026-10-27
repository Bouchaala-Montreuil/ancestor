#!/usr/bin/env python3
"""
ANCESTOR — A4 training sheet generator.

Builds design/print-sheet.html: a real sheet you print, fold and carry. It is
deliberately paper-first — black on white, no colour needed, photocopy safe —
and it is where the tally mark stops being a logo and becomes the mechanism:
you count your sets with it, by hand, in the margins.

Every mark on the sheet is generated from the same six numbers as the app icon.

    python3 design/build-sheet.py
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# --- the mark's geometry, identical to build-marks.js -----------------------
MARGIN, STROKE, Y0, Y1, ANGLE, SLEN = 3.2, 2.4, 4.2, 19.8, -16, 19.4
SPAN = 24 - MARGIN * 2
GAP = (SPAN - STROKE * 4) / 3
XS = [MARGIN + i * (STROKE + GAP) for i in range(4)]


def tally(color="currentColor", size=24):
    body = "".join(
        f'<rect x="{x:.2f}" y="{Y0}" width="{STROKE}" height="{Y1 - Y0:.1f}"/>' for x in XS
    )
    body += (f'<rect x="{12 - SLEN / 2:.2f}" y="{12 - STROKE / 2:.2f}" width="{SLEN}" '
             f'height="{STROKE}" transform="rotate({ANGLE} 12 12)"/>')
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" aria-hidden="true" '
            f'style="color:{color}"><g fill="currentColor">{body}</g></svg>')


def empty_tally(size=24):
    """The stroke that has not been counted yet: an outline, ready for a pen."""
    body = "".join(
        f'<rect x="{x:.2f}" y="{Y0}" width="{STROKE}" height="{Y1 - Y0:.1f}" '
        f'fill="none" stroke="currentColor" stroke-width=".5"/>' for x in XS
    )
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" aria-hidden="true" '
            f'style="color:currentColor"><g>{body}</g></svg>')


# --- content -----------------------------------------------------------------
EXERCISES = [
    ("01", "Back Squat", "1 × 5–8", "1", "4.0 · 0 · 4.0"),
    ("02", "Deadlift", "1 × 4–6", "1", "4.0 · 0 · 4.0"),
    ("03", "Standing Calf Raise", "1 × 12–20", "0", "2.0 · 2 · 4.0"),
    ("04", "Leg Press", "1 × 10–15", "0", "4.0 · 0 · 4.0"),
    ("05", "Cable Crunch", "1 × 10–20", "0", "3.0 · 0 · 3.0"),
]

RECOVERY = [
    ("Chest", 0, 4), ("Back", 2, 4), ("Shoulders", 0, 3), ("Biceps", 1, 3),
    ("Triceps", 1, 3), ("Forearms", 0, 2), ("Abdominals", 0, 2), ("Quadriceps", 4, 4),
    ("Hamstrings", 3, 4), ("Glutes", 2, 3), ("Calves", 4, 4), ("Lower back", 3, 4),
]

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

CSS = """
:root{
  --ink:#20211F; --paper:#FFFFFF; --line:#B9B3A6; --line-2:#E3DFD5; --burnt:#D66A3A;
  --f-display:"Arial Narrow","Helvetica Neue Condensed","Roboto Condensed",
              "Liberation Sans Narrow",system-ui,sans-serif;
  --f-body:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  --f-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#6E6B63;font-family:var(--f-body);color:var(--ink)}
body{padding:24px 12px 64px}
.page{
  width:210mm;min-height:297mm;margin:0 auto;background:var(--paper);
  padding:13mm 14mm 11mm;
  display:flex;flex-direction:column;
  box-shadow:0 24px 70px rgba(0,0,0,.4);
}
.mono{font-family:var(--f-mono);font-size:7pt;letter-spacing:.14em;text-transform:uppercase}
.num{font-variant-numeric:tabular-nums}

/* ---- head ---- */
.rule{height:2px;background:var(--ink)}
.rule.thin{height:1px}
.head{display:flex;align-items:flex-start;justify-content:space-between;gap:8mm;padding:3mm 0 2.5mm}
.brand{display:flex;align-items:center;gap:2.6mm}
.brand .t{font-family:var(--f-display);font-size:15pt;letter-spacing:.16em;text-transform:uppercase;line-height:1}
.brand .sub{display:block;font-family:var(--f-mono);font-size:5.6pt;letter-spacing:.16em;
  text-transform:uppercase;color:#6B6A63;margin-top:1mm}
.fillin{display:flex;gap:7mm;padding:0 0 3.4mm;border-bottom:1px solid var(--line);margin-bottom:0}
.fillin div{flex:1;display:flex;align-items:flex-end;gap:2mm;
  font-family:var(--f-mono);font-size:5.2pt;letter-spacing:.12em;text-transform:uppercase;color:#6B6A63}
.fillin span{flex:1;border-bottom:1px solid var(--line);height:4.6mm}
.headmeta{text-align:right;font-family:var(--f-mono);font-size:6.4pt;letter-spacing:.12em;
  text-transform:uppercase;line-height:1.9;color:#4A4C45}

/* ---- title ---- */
.title{display:flex;align-items:flex-end;justify-content:space-between;gap:8mm;padding:2.6mm 0 3mm}
.title h1{font-family:var(--f-display);font-size:38pt;line-height:.82;letter-spacing:-.01em;
  text-transform:uppercase;margin:0;font-weight:700}
.title .cycle{font-family:var(--f-mono);font-size:6.4pt;letter-spacing:.14em;
  text-transform:uppercase;line-height:1.9;text-align:right;color:#4A4C45}

/* ---- verdict ---- */
.verdict{background:var(--ink);color:#fff;padding:4mm 5mm 4mm 6mm;position:relative;
  display:flex;align-items:flex-start;justify-content:space-between;gap:8mm}
.verdict .b{position:absolute;left:0;top:0;bottom:0;width:3px;background:#fff}
.verdict .lab{font-family:var(--f-mono);font-size:6pt;letter-spacing:.2em;text-transform:uppercase;
  opacity:.65;display:flex;align-items:center;gap:1.6mm}
.verdict .lab::before{content:"";width:1.6mm;height:1.6mm;background:#fff}
.verdict .state{font-family:var(--f-display);font-size:24pt;line-height:.85;text-transform:uppercase;
  margin-top:1.4mm;letter-spacing:.01em}
.verdict .right{text-align:right;font-family:var(--f-mono);font-size:6pt;letter-spacing:.12em;
  text-transform:uppercase;line-height:1.8;opacity:.9}
.verdict .right b{font-family:var(--f-display);font-size:14pt;letter-spacing:.02em;
  display:block;line-height:1;margin-bottom:1mm}

/* ---- generic block ---- */
.block{padding:4.4mm 0 0}
.bh{display:flex;align-items:center;gap:2mm;border-top:1px solid var(--ink);padding-top:1.6mm;
  margin-bottom:3mm}
.stamp{display:inline-flex;align-items:center;justify-content:center;min-width:6.4mm;height:4.4mm;
  padding:0 1.2mm;background:var(--ink);color:#fff;font-family:var(--f-mono);font-size:6pt;
  font-weight:600;letter-spacing:.04em;flex:none}
.bh h2{font-family:var(--f-display);font-size:8.4pt;letter-spacing:.12em;text-transform:uppercase;
  margin:0;font-weight:700}
.bh .r{flex:1;height:1px;background:var(--line)}
.bh .aside{font-family:var(--f-mono);font-size:5.6pt;letter-spacing:.12em;text-transform:uppercase;
  color:#6B6A63;white-space:nowrap}

/* ---- exercise table ---- */
table{width:100%;border-collapse:collapse}
th{font-family:var(--f-mono);font-size:5.4pt;letter-spacing:.12em;text-transform:uppercase;
  color:#4A4C45;text-align:left;font-weight:600;padding:0 1.6mm 1.4mm 0;
  border-bottom:1px solid var(--ink);white-space:nowrap}
th.c,td.c{text-align:center}
td{border-bottom:1px solid var(--line-2);padding:2mm 1.6mm 2mm 0;vertical-align:middle;height:9.2mm}
tr:last-child td{border-bottom:1px solid var(--line)}
td.idx{font-family:var(--f-mono);font-size:5.6pt;color:#6B6A63;width:7mm}
td.name{font-family:var(--f-display);font-size:9.4pt;text-transform:uppercase;letter-spacing:.03em;
  line-height:1.1}
td.name small{display:block;font-family:var(--f-mono);font-size:5.2pt;letter-spacing:.1em;
  color:#6B6A63;margin-top:.8mm;text-transform:uppercase}
td.rx,td.tempo{font-family:var(--f-mono);font-size:6.4pt;letter-spacing:.06em;white-space:nowrap}
.box{display:inline-block;width:100%;height:6mm;border:1px solid var(--line);background:#fff}
.box.w{width:15mm}
.box.rir{width:9mm}
.sets{display:flex;gap:1.6mm}
.sets .box{flex:1}

/* ---- recovery ledger ---- */
.rec{display:grid;grid-template-columns:1fr 1fr;gap:0 10mm}
.rec-row{display:grid;grid-template-columns:22mm 1fr 9mm;align-items:center;gap:2.6mm;
  padding:1.15mm 0;border-bottom:1px solid var(--line-2)}
.rec-row .n{font-family:var(--f-mono);font-size:5.8pt;letter-spacing:.1em;text-transform:uppercase}
.scale{position:relative;height:2.2mm;display:flex;align-items:center}
.scale::before{content:"";position:absolute;inset:0;border-top:1px solid var(--line);
  border-bottom:1px solid var(--line)}
.scale i{display:block;height:100%;background:var(--ink)}
.rec-row .d{font-family:var(--f-mono);font-size:6pt;text-align:right;letter-spacing:.04em}
.rec-row.rest .d{color:#6B6A63}
.legend{display:flex;gap:5mm;font-family:var(--f-mono);font-size:5.2pt;letter-spacing:.1em;
  text-transform:uppercase;color:#6B6A63;margin-top:2.4mm}

/* ---- week strip ---- */
.week{display:grid;grid-template-columns:repeat(7,1fr);border:1px solid var(--ink)}
.week .d{border-right:1px solid var(--line);padding:1.6mm}
.week .d:last-child{border-right:0}
.week .d b{display:block;font-family:var(--f-mono);font-size:5.4pt;letter-spacing:.12em;
  text-transform:uppercase;font-weight:600;margin-bottom:1.6mm}
.week .d span{display:block;font-family:var(--f-mono);font-size:5pt;color:#6B6A63;
  letter-spacing:.08em;text-transform:uppercase;margin-bottom:.8mm}
.week .d .box{height:5.2mm;margin-bottom:1.6mm}

/* ---- notes ---- */
.notes{margin-top:2mm}
.line{border-bottom:1px solid var(--line);height:7mm}
.line:last-child{border-bottom:1px solid var(--ink)}

/* ---- footer: the tally ---- */
.foot{margin-top:auto;padding-top:6mm}
.foot .top{display:flex;align-items:flex-end;justify-content:space-between;gap:8mm;
  border-top:2px solid var(--ink);padding-top:2mm}
.marks{display:flex;gap:3mm;align-items:center}
.marks .grp{display:flex;gap:.6mm}
.foot .lbl{font-family:var(--f-mono);font-size:5.4pt;letter-spacing:.14em;text-transform:uppercase;
  color:#6B6A63;line-height:1.8;max-width:62mm}
.foot .lbl b{color:var(--ink)}
.sig{display:flex;gap:6mm;align-items:flex-end}
.sig div{font-family:var(--f-mono);font-size:5pt;letter-spacing:.1em;text-transform:uppercase;
  color:#6B6A63}
.sig .ln{width:34mm;border-bottom:1px solid var(--ink);height:6mm}

/* ---- print ---- */
@media print{
  @page{size:A4;margin:0}
  html,body{background:#fff}
  body{padding:0}
  .page{width:210mm;min-height:297mm;box-shadow:none;margin:0;padding:13mm 14mm 11mm;
        display:flex;flex-direction:column}
  .foot{page-break-inside:avoid;break-inside:avoid}
  .no-print{display:none!important}
  .box{border-color:#8C877B}
}
/* ---------- screen toolbar ---------- */
.tools{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:8px;
  background:#20211F;padding:8px;border-radius:4px;box-shadow:0 8px 30px rgba(0,0,0,.4);z-index:9}
.tools button{font-family:var(--f-mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  background:transparent;color:#F1EBDD;border:1px solid rgba(241,235,221,.35);
  padding:10px 16px;cursor:pointer;border-radius:2px}
.tools button:hover{background:rgba(241,235,221,.12);border-color:#F1EBDD}
@media print{.tools{display:none}}
@media (max-width:840px){
  .page{width:100%;min-height:0;padding:20px 16px 28px}
  .foot{margin-top:8mm;padding-top:0}
  .title h1{font-size:32pt}
  .rec{grid-template-columns:1fr}
}
"""


# --- precomputed blocks (python 3.11 cannot nest f-strings) ------------------
EX_ROWS = ""
for _i, _name, _rx, _rir, _tempo in EXERCISES:
    EX_ROWS += (
        f'<tr><td class="idx">{_i}</td>'
        f'<td class="name">{_name}<small>{_rx} · rest 3–4 min</small></td>'
        f'<td class="rx">{_rx}</td>'
        f'<td class="tempo">{_tempo}</td>'
        '<td><span class="box"></span></td>'
        '<td><span class="box"></span></td>'
        '<td class="c"><span class="box rir"></span></td>'
        '<td><span class="box"></span></td></tr>'
    )

REC_ROWS = ""
for _m, _left, _total in RECOVERY:
    _w = int((1 - _left / _total) * 100) if _total else 0
    _d = "ready" if _left < 1 else f"{_left} d"
    REC_ROWS += (
        f'<div class="rec-row{" rest" if _left < 1 else ""}">'
        f'<span class="n">{_m}</span>'
        f'<span class="scale"><i style="width:{_w}%"></i></span>'
        f'<span class="d">{_d}</span></div>'
    )

WEEK_CELLS = "".join(
    f'<div class="d"><b>{_d}</b><span>hrs</span><span class="box"></span>'
    f'<span>shift</span><span class="box"></span></div>' for _d in DAYS
)

TALLY_GROUPS = (
    "".join('<div class="grp">' + tally(size=22) + '</div>' for _ in range(2))
    + "".join('<div class="grp">' + empty_tally(size=22) + '</div>' for _ in range(5))
)

BODY = f"""
<div class="page">

  <!-- ============================================================ HEAD -->
  <div class="rule"></div>
  <div class="head">
    <div class="brand">
      {tally(size=30)}
      <div>
        <span class="t">Ancestor</span>
        <span class="sub">Training record · one sheet per session</span>
      </div>
    </div>
    <div class="headmeta">
      Printed<br>
      27 Oct 2026 · 09:12<br>
      Unit kg
    </div>
  </div>
  <div class="rule thin"></div>

  <!-- =========================================================== TITLE -->
  <div class="title">
    <h1>Legs</h1>
    <div class="cycle">
      Cycle 03 · session 2 of 3<br>
      Shift pattern: rotating<br>
      Last session: 26 Oct · Push
    </div>
  </div>

  <!-- ========================================================= FILL IN -->
  <div class="fillin">
    <div>Date <span></span></div>
    <div>Start <span></span></div>
    <div>End <span></span></div>
    <div>Bodyweight <span></span></div>
    <div>Feel <span></span></div>
  </div>

  <!-- ========================================================= VERDICT -->
  <div class="verdict">
    <div class="b"></div>
    <div>
      <span class="lab">Recommendation</span>
      <div class="state">Train</div>
    </div>
    <div class="right">
      <b>84%</b>
      availability<br>
      ~38 min estimated<br>
      RIR 0–1 target
    </div>
  </div>

  <!-- ======================================================== EXERCISES -->
  <div class="block">
    <div class="bh">
      <span class="stamp">01</span><h2>The work</h2><span class="r"></span>
      <span class="aside">one all-out set per exercise</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:7mm">#</th>
          <th>Exercise</th>
          <th style="width:18mm">Target</th>
          <th style="width:20mm">Tempo</th>
          <th style="width:26mm">Load</th>
          <th style="width:16mm">Reps</th>
          <th style="width:12mm">RIR</th>
          <th style="width:22mm">Notes</th>
        </tr>
      </thead>
      <tbody>
        {EX_ROWS}
      </tbody>
    </table>
    <div class="legend">
      <span>Load — write what you actually lifted</span>
      <span>RIR — reps left in the tank · 0 = failure</span>
      <span>Tempo — lower · pause · lift, seconds</span>
    </div>
  </div>

  <!-- ====================================================== RECOVERY -->
  <div class="block">
    <div class="bh">
      <span class="stamp">02</span><h2>Recovery ledger</h2><span class="r"></span>
      <span class="aside">as printed — do not train anything in the left column</span>
    </div>
    <div class="rec">
      {REC_ROWS}
    </div>
    <div class="legend">
      <span>Bar = time elapsed against the estimated window</span>
      <span>Estimate, not a measurement</span>
    </div>
  </div>

  <!-- ========================================================== WEEK -->
  <div class="block">
    <div class="bh">
      <span class="stamp">03</span><h2>Week</h2><span class="r"></span>
      <span class="aside">sleep hours · shift</span>
    </div>
    <div class="week">
      {WEEK_CELLS}
    </div>
  </div>

  <!-- ========================================================= NOTES -->
  <div class="block">
    <div class="bh">
      <span class="stamp">04</span><h2>Notes</h2><span class="r"></span>
      <span class="aside">pain, sleep, life — anything that changes the next decision</span>
    </div>
    <div class="notes">
      <div class="line"></div><div class="line"></div><div class="line"></div>
    </div>
  </div>

  <!-- ======================================================== FOOTER -->
  <div class="foot">
    <div class="top">
      <div>
        <div class="mono" style="margin-bottom:1.6mm">Working sets this cycle</div>
        <div class="marks">
          {"".join('<div class="grp">' + tally(size=22) + '</div>' for _ in range(2))}
          <div class="grp">{empty_tally(size=22)}</div>
          <div class="grp">{empty_tally(size=22)}</div>
          <div class="grp">{empty_tally(size=22)}</div>
          <div class="grp">{empty_tally(size=22)}</div>
        </div>
        <div class="lbl" style="margin-top:2mm">
          <b>Count it by hand.</b> One stroke per working set. The fifth stroke closes
          the set — the same mark that sits at the top of this sheet, and the reason the
          app exists: four strokes is work, the fifth is a decision.
        </div>
      </div>
      <div class="sig">
        <div><div class="ln"></div>Bodyweight</div>
        <div><div class="ln"></div>Signature</div>
      </div>
    </div>
    <div class="mono" style="margin-top:2.6mm;font-size:5pt;color:#6B6A63">
      Ancestor · performance lab · generated from your log · everything on this sheet is an estimate and is labelled as one
    </div>
  </div>

</div>

<div class="tools no-print">
  <button onclick="window.print()">Print / Save as PDF</button>
</div>
"""

HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ANCESTOR — Training sheet (A4)</title>
<style>{CSS}</style>
</head>
<body>
{BODY}
</body>
</html>
"""

out = os.path.join(HERE, "print-sheet.html")
with open(out, "w") as f:
    f.write(HTML)
print("wrote", out, len(HTML), "bytes")
