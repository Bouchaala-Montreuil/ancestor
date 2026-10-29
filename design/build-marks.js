/* ============================================================================
   ANCESTOR — mark build
   Run: node design/build-marks.js

   The mark is a tally: four strokes of recorded work, and the fifth that
   closes the set. It is the oldest counting gesture we have, drawn on the
   oldest surface we have. No gradient, no container, four strokes and a slash.

   Everything is generated from the geometry below so the mark at 16 px and the
   mark at 512 px are the same mark, not two drawings that agree roughly.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '..', 'app', 'node_modules', 'sharp'));

const OUT = path.join(__dirname, 'marks');
fs.mkdirSync(OUT, { recursive: true });

const INK = '#20211F';
const PAPER = '#F1EBDD';
const BURNT = '#D66A3A';

/* ---------------------------------------------------------------- GEOMETRY
   24 × 24 grid. Four strokes, evenly spaced inside a 3.2 unit margin, one
   slash at -20° through the centre. Thickness is 2.4 — heavy enough to
   survive 16 px, light enough to stay a mark rather than a blob. */
const G = { box: 24, margin: 3.2, stroke: 2.4, y0: 4.2, y1: 19.8, angle: -16 };
G.span = G.box - G.margin * 2;                       // 17.6
G.gap = (G.span - G.stroke * 4) / 3;                 // 2.667
G.x = [0, 1, 2, 3].map(i => +(G.margin + i * (G.stroke + G.gap)).toFixed(3));
G.slashLen = 19.4;

function tallyBody(){
  let s = '';
  G.x.forEach(x => {
    s += `<rect x="${x}" y="${G.y0}" width="${G.stroke}" height="${(G.y1 - G.y0).toFixed(1)}"/>`;
  });
  s += `<rect x="${(12 - G.slashLen / 2).toFixed(2)}" y="${12 - G.stroke / 2}" ` +
       `width="${G.slashLen}" height="${G.stroke}" ` +
       `transform="rotate(${G.angle} 12 12)"/>`;
  return s;
}

function markSvg(color){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Ancestor">` +
         `<g fill="${color}">${tallyBody()}</g></svg>\n`;
}

/* Icons. A mark on a home screen is read at 48 px, between two other icons,
   next to a notification badge. It needs a field, not a hairline. */
function iconSvg(bg, fg, scale){
  const inner = G.box * scale;
  const off = (G.box - inner) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">` +
         `<rect width="24" height="24" fill="${bg}"/>` +
         `<g fill="${fg}" transform="translate(${off.toFixed(2)},${off.toFixed(2)}) scale(${scale})">` +
         `${tallyBody()}</g></svg>`;
}

function monogramSvg(bg){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">` +
         `<rect width="24" height="24" fill="${bg}"/></svg>`;
}

/* ------------------------------------------------------------------ WRITE */
const files = {
  'ancestor-mark.svg':        markSvg(INK),
  'ancestor-mark-ivory.svg':  markSvg(PAPER),
  'ancestor-mark-burnt.svg':  markSvg(BURNT),
  'ancestor-icon.svg':        iconSvg(INK, PAPER, 0.66)
};
Object.keys(files).forEach(f => fs.writeFileSync(path.join(OUT, f), files[f]));

(async () => {
  const put = async (svg, size, name) => {
    const png = await sharp(Buffer.from(svg), { density: Math.max(72, size * 4) })
      .resize(size, size, { fit: 'contain' }).png().toBuffer();
    fs.writeFileSync(path.join(OUT, name), png);
  };
  const icon   = iconSvg(INK, PAPER, 0.66);
  const mask   = iconSvg(INK, PAPER, 0.50);      // inside the 80% safe circle
  const mono   = iconSvg(INK, PAPER, 0.66);

  await put(icon, 512, 'icon-512.png');
  await put(icon, 192, 'icon-192.png');
  await put(mask, 512, 'icon-maskable-512.png');
  await put(icon, 180, 'apple-touch-icon.png');
  await put(icon, 32,  'favicon-32.png');

  /* Contact sheet: the mark must survive every size it will ever be seen at. */
  const sizes = [192, 96, 48, 32, 24, 16];
  const tiles = [];
  let x = 24;
  for (const s of sizes) {
    const buf = await sharp(Buffer.from(markSvg(INK)), { density: Math.max(96, s * 6) })
      .resize(s, s).png().toBuffer();
    tiles.push({ input: buf, left: x, top: 88 });
    x += s + 36;
  }
  x = 24;
  for (const s of [96, 48, 24]) {
    const buf = await sharp(Buffer.from(iconSvg(INK, PAPER, 0.66)), { density: Math.max(96, s * 6) })
      .resize(s, s).png().toBuffer();
    tiles.push({ input: buf, left: x, top: 300 });
    x += s + 36;
  }
  await sharp({ create: { width: 760, height: 430, channels: 3, background: PAPER } })
    .composite(tiles).png().toFile(path.join(OUT, 'contact-sheet.png'));

  console.log('wrote', fs.readdirSync(OUT).length, 'files to design/marks');
})();
