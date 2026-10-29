/* ============================================================================
   ANCESTOR — Components
   Hand-built SVG. No chart library, no icon font, no stock illustration.

   ANATOMY NOTE: this is a high-fidelity 2D interactive figure, not a 3D mesh.
   Geometry is validated by tools/fig_check.py — every region sits inside the
   body silhouette, left/right pairs are mirror-symmetric, and no two regions
   overlap beyond tolerance.
   ========================================================================== */

/* --------------------------------------------------------- STATE COLOURS */
const STATE_VAR = {
  ready:   'var(--ok)',
  caution: 'var(--warn)',
  rest:    'var(--alert)',
  fresh:   'var(--nodata)'
};
/* ------------------------------------------------------------------ TOKENS
   State colours are declared once, in the stylesheet, and read back here.
   They used to be written twice — once as CSS custom properties and once as
   literals in this file — which is how the anatomy figure ended up painting
   #8C8A80, a grey that exists nowhere in the design system.

   Read once and memoised: this runs for every path of every figure, and a
   getComputedStyle call per path would be a per-frame cost for no reason. */
const STATE_TOKEN = { ready:'ok', caution:'warn', rest:'alert', fresh:'nodata' };
const STATE_FALLBACK = { ready:'#46603F', caution:'#8A5E12', rest:'#963F28', fresh:'#7F7D73' };
const _tokenCache = {};

function token(name, fallback){
  if (_tokenCache[name] !== undefined) return _tokenCache[name] || fallback;
  let v = '';
  try {
    v = getComputedStyle(document.documentElement)
          .getPropertyValue('--' + name).trim();
  } catch (e) { v = ''; }
  _tokenCache[name] = v;
  return v || fallback;
}

/* Redraw after a theme or contrast change. */
function tokenReset(){ Object.keys(_tokenCache).forEach(k => delete _tokenCache[k]); }

const STATE_HEX = {
  get ready()    { return token('ok',     STATE_FALLBACK.ready); },
  get caution()  { return token('warn',   STATE_FALLBACK.caution); },
  get rest()     { return token('alert',  STATE_FALLBACK.rest); },
  get fresh()    { return token('nodata', STATE_FALLBACK.fresh); }
};

/* ------------------------------------------------------ ANATOMY GEOMETRY */
/* Geometry is generated: `node tools/build-figure.js` writes this block from
   the half-body definition, and `--check` fails when the two disagree. */
/* <figure-geometry> */
const FIG = {
  view: '0 0 200 470',
  outline: [
    'M97.9,13 L99.9,13.5 L101.9,13 L106.1,14 L113.1,17.5 L118,23.1 L119.8,28.6 L120.3,33.6 L119.5,37.4 L116.8,45.1 L115.8,45.9 L115.8,47.9 L114,53.1 L111.3,66.1 L111.8,70.1 L113.3,74.6 L117.4,79 L124.1,82.5 L133.4,83.8 L142.4,86.8 L148.9,87.3 L154.3,92.4 L158.3,100.1 L159.3,108.6 L158.5,113.1 L157.3,115.9 L156.8,123.4 L158.3,128.4 L158.8,134.4 L160.8,144.1 L161.3,152.6 L163.5,156.6 L166.5,164.4 L169.3,175.1 L170.3,187.6 L169.8,202.1 L170.3,214.6 L172.8,222.4 L173,226.1 L174,229.4 L180.8,237.1 L184.8,250.1 L184.1,251.3 L182.8,249.9 L179.8,243.6 L178.6,242.8 L177,246.9 L178,254.9 L179.8,258.4 L181.5,264.9 L180.6,265.8 L178.8,263.9 L173.9,252.5 L171.5,254.4 L173,259.9 L173.3,266.9 L172.6,268 L171.3,267.1 L170.8,265.9 L167.6,252.5 L166,252.9 L166.5,261.6 L165.4,265 L164.4,264.8 L163.8,263.6 L162.5,253.1 L161.6,252.5 L161,252.6 L160.3,254.4 L158.5,261.6 L157.5,261.9 L157,258.1 L158,248.9 L157.3,244.9 L159,233.4 L160.3,231.9 L160.3,228.9 L159.3,220.6 L157.8,214.4 L152.8,202.1 L148.5,189.1 L147,182.4 L146.3,174.1 L146.3,164.1 L147.5,161.6 L145.3,155.4 L144.8,149.9 L141.8,138.9 L141.1,131.3 L137.5,146.4 L135.3,152.1 L133,170.1 L131.5,172.9 L130,184.1 L133,192.1 L133.3,196.4 L135,199.4 L138.5,210.9 L139.5,222.4 L139,230.4 L137.3,241.6 L140.5,262.4 L140.5,280.6 L139.8,288.9 L137.3,303.6 L132.5,317.4 L131.5,323.6 L132.3,326.4 L131.5,345.9 L133.8,358.6 L134,369.9 L132,387.4 L126.8,415.1 L126.5,420.4 L127.3,428.1 L128.5,430.1 L128.8,432.4 L130.5,435.6 L137,441.6 L136.8,442.1 L124.9,443 L116.6,442 L114,440.1 L113.8,436.1 L114.3,434.4 L112.3,430.6 L112.5,424.9 L111.3,423.6 L114,417.1 L115,399.4 L112.3,387.4 L112,383.9 L110.8,381.1 L108.8,369.6 L109,359.6 L111,345.6 L108,339.6 L105.5,322.4 L105,304.9 L103.3,291.4 L102.5,272.9 L103.5,245.9 L102.3,238.6 L100.8,234.9 L99.4,234.5 L97.3,239.4 L96.3,246.9 L97.3,275.1 L96.5,292.1 L94.8,305.6 L94.5,320.9 L91.8,339.9 L88.8,345.9 L90.8,359.1 L91,370.4 L84.8,399.9 L86,418.1 L88.5,423.4 L87.3,424.9 L87.5,431.1 L85.8,434.1 L85.8,440.4 L83.1,442 L81.4,442.5 L78.4,442.3 L75.9,443 L63,442.1 L63,441.4 L69.3,435.6 L71,432.4 L72.8,426.4 L73.3,416.4 L68,388.4 L65.8,368.9 L66,359.1 L68.3,346.4 L67.5,327.4 L68.3,323.1 L67.5,317.9 L62.5,303.1 L60,288.4 L59.3,279.6 L59.3,263.1 L62.5,242.1 L60.3,221.4 L61.5,209.1 L64.8,199.6 L66.8,196.1 L67,191.6 L70,183.6 L68.5,173.9 L66.8,169.9 L64.5,151.9 L62.5,146.9 L59,131.6 L58.5,132.1 L58,139.1 L55.3,149.1 L54.5,155.6 L52.3,161.9 L53.5,163.9 L53.5,177.1 L52.3,185.1 L47.3,201.6 L42.3,213.9 L40.5,221.4 L39.5,231.4 L40.8,233.1 L42,240.4 L42.3,246.4 L41.5,251.9 L42.5,254.6 L42.5,261.6 L41.9,262 L41.3,261.4 L38.9,252.3 L36.5,257.1 L36.3,263.1 L35.5,264.6 L34.4,265 L33,262.9 L33.8,261.1 L33.3,257.6 L34,253.1 L32.1,252.5 L29.3,265.6 L28.3,267.6 L27.1,268 L26.5,266.6 L26.8,261.1 L28.3,254.6 L27.1,252.3 L25.5,253.4 L22.8,260.6 L20.3,265.4 L19.4,265.8 L18.5,265.1 L18.8,262.6 L19.3,262.4 L20,258.4 L21.8,255.1 L22.3,249.4 L23.3,245.6 L23,244.1 L22.6,243.5 L20.1,244 L19,247.1 L17,249.9 L16.1,250.8 L15.3,250.1 L16.3,245.1 L19,237.4 L26,228.9 L27,222.6 L29.5,214.9 L30,210.4 L29.8,185.1 L30.8,173.9 L31.5,169.9 L35.5,158.4 L38.8,152.1 L39.3,143.4 L41.5,128.9 L43,123.4 L42.5,115.6 L41.3,112.9 L40.5,107.9 L41.5,100.4 L45.8,92.1 L50.6,87.5 L57.4,86.8 L66.4,83.8 L75.6,82.5 L82.1,79.3 L86.8,74.4 L88.5,67.6 L88.3,63.9 L85.5,51.9 L84.3,48.9 L84.3,46.6 L83,45.1 L80.3,37.1 L79.8,34.6 L80,28.9 L82.3,22.4 L85.6,18.5 L93.1,14.3 L97.8,13.1 Z',
    'M97.9,13 L99.9,13.5 L101.9,13 L106.1,14 L113.1,17.5 L118,23.1 L119.8,28.6 L120.3,33.6 L119.5,37.4 L116.8,45.1 L115.8,45.9 L115.8,47.9 L114,53.1 L111.3,66.1 L111.8,70.1 L113.3,74.6 L117.4,79 L124.1,82.5 L133.4,83.8 L142.4,86.8 L148.9,87.3 L154.3,92.4 L158.3,100.1 L159.3,108.6 L158.5,113.1 L157.3,115.9 L156.8,123.4 L158.3,128.4 L158.8,134.4 L160.8,144.1 L161.3,152.6 L163.5,156.6 L166.5,164.4 L169.3,175.1 L170.3,187.6 L169.8,202.1 L170.3,214.6 L172.8,222.4 L173,226.1 L174,229.4 L180.8,237.1 L184.8,250.1 L184.1,251.3 L182.8,249.9 L179.8,243.6 L178.6,242.8 L177,246.9 L178,254.9 L179.8,258.4 L181.5,264.9 L180.6,265.8 L178.8,263.9 L173.9,252.5 L171.5,254.4 L173,259.9 L173.3,266.9 L172.6,268 L171.3,267.1 L170.8,265.9 L167.6,252.5 L166,252.9 L166.5,261.6 L165.4,265 L164.4,264.8 L163.8,263.6 L162.5,253.1 L161.6,252.5 L161,252.6 L160.3,254.4 L158.5,261.6 L157.5,261.9 L157,258.1 L158,248.9 L157.3,244.9 L159,233.4 L160.3,231.9 L160.3,228.9 L159.3,220.6 L157.8,214.4 L152.8,202.1 L148.5,189.1 L147,182.4 L146.3,174.1 L146.3,164.1 L147.5,161.6 L145.3,155.4 L144.8,149.9 L141.8,138.9 L141.1,131.3 L137.5,146.4 L135.3,152.1 L133,170.1 L131.5,172.9 L130,184.1 L133,192.1 L133.3,196.4 L135,199.4 L138.5,210.9 L139.5,222.4 L139,230.4 L137.3,241.6 L140.5,262.4 L140.5,280.6 L139.8,288.9 L137.3,303.6 L132.5,317.4 L131.5,323.6 L132.3,326.4 L131.5,345.9 L133.8,358.6 L134,369.9 L132,387.4 L126.8,415.1 L126.5,420.4 L127.3,428.1 L128.5,430.1 L128.8,432.4 L130.5,435.6 L137,441.6 L136.8,442.1 L124.9,443 L116.6,442 L114,440.1 L113.8,436.1 L114.3,434.4 L112.3,430.6 L112.5,424.9 L111.3,423.6 L114,417.1 L115,399.4 L112.3,387.4 L112,383.9 L110.8,381.1 L108.8,369.6 L109,359.6 L111,345.6 L108,339.6 L105.5,322.4 L105,304.9 L103.3,291.4 L102.5,272.9 L103.5,245.9 L102.3,238.6 L100.8,234.9 L99.4,234.5 L97.3,239.4 L96.3,246.9 L97.3,275.1 L96.5,292.1 L94.8,305.6 L94.5,320.9 L91.8,339.9 L88.8,345.9 L90.8,359.1 L91,370.4 L84.8,399.9 L86,418.1 L88.5,423.4 L87.3,424.9 L87.5,431.1 L85.8,434.1 L85.8,440.4 L83.1,442 L81.4,442.5 L78.4,442.3 L75.9,443 L63,442.1 L63,441.4 L69.3,435.6 L71,432.4 L72.8,426.4 L73.3,416.4 L68,388.4 L65.8,368.9 L66,359.1 L68.3,346.4 L67.5,327.4 L68.3,323.1 L67.5,317.9 L62.5,303.1 L60,288.4 L59.3,279.6 L59.3,263.1 L62.5,242.1 L60.3,221.4 L61.5,209.1 L64.8,199.6 L66.8,196.1 L67,191.6 L70,183.6 L68.5,173.9 L66.8,169.9 L64.5,151.9 L62.5,146.9 L59,131.6 L58.5,132.1 L58,139.1 L55.3,149.1 L54.5,155.6 L52.3,161.9 L53.5,163.9 L53.5,177.1 L52.3,185.1 L47.3,201.6 L42.3,213.9 L40.5,221.4 L39.5,231.4 L40.8,233.1 L42,240.4 L42.3,246.4 L41.5,251.9 L42.5,254.6 L42.5,261.6 L41.9,262 L41.3,261.4 L38.9,252.3 L36.5,257.1 L36.3,263.1 L35.5,264.6 L34.4,265 L33,262.9 L33.8,261.1 L33.3,257.6 L34,253.1 L32.1,252.5 L29.3,265.6 L28.3,267.6 L27.1,268 L26.5,266.6 L26.8,261.1 L28.3,254.6 L27.1,252.3 L25.5,253.4 L22.8,260.6 L20.3,265.4 L19.4,265.8 L18.5,265.1 L18.8,262.6 L19.3,262.4 L20,258.4 L21.8,255.1 L22.3,249.4 L23.3,245.6 L23,244.1 L22.6,243.5 L20.1,244 L19,247.1 L17,249.9 L16.1,250.8 L15.3,250.1 L16.3,245.1 L19,237.4 L26,228.9 L27,222.6 L29.5,214.9 L30,210.4 L29.8,185.1 L30.8,173.9 L31.5,169.9 L35.5,158.4 L38.8,152.1 L39.3,143.4 L41.5,128.9 L43,123.4 L42.5,115.6 L41.3,112.9 L40.5,107.9 L41.5,100.4 L45.8,92.1 L50.6,87.5 L57.4,86.8 L66.4,83.8 L75.6,82.5 L82.1,79.3 L86.8,74.4 L88.5,67.6 L88.3,63.9 L85.5,51.9 L84.3,48.9 L84.3,46.6 L83,45.1 L80.3,37.1 L79.8,34.6 L80,28.9 L82.3,22.4 L85.6,18.5 L93.1,14.3 L97.8,13.1 Z'
  ],
  regions: {
    front: {
      shoulders: [
        'M62.4,84.8 L67.1,85 L69.6,86 L77.1,86.8 L78.3,87.4 L72.4,91.5 L65.1,94.5 L60.3,99.1 L50.5,113.6 L44.5,125.4 L42.8,122.4 L42.5,115.6 L41.3,112.9 L40.5,107.9 L41.5,100.4 L43.3,96.1 L45.8,92.1 L50.6,87.5 L54.4,86.8 L59.1,87.5 L62.3,84.9 Z',
        'M137.1,84.8 L140.6,87.5 L143.1,86.8 L148.9,87.3 L154.3,92.4 L157,97.1 L158.5,101.1 L159.3,108.6 L158.5,113.1 L157.3,115.9 L157,122.6 L155.8,125.1 L155.3,125.4 L153,120.1 L148.3,111.9 L139.8,99.4 L135.1,94.8 L126.6,91 L121.5,87.4 L122.6,86.8 L125.6,86.8 L126.1,86 L130.4,86 L132.6,85 L137,84.9 Z'
      ],
      chest: [
        'M123.4,89 L135.4,94.8 L138.1,97 L141.3,100.6 L149.8,114.6 L146.9,111.8 L142.6,110.3 L140,111.6 L136.8,116.6 L137.3,137.6 L136.3,138.9 L136.3,143.9 L135.3,147.1 L135.3,131.6 L133.5,131.4 L133.4,126.3 L132,131.9 L125,143.1 L122.9,145.8 L120.1,146.5 L116.3,142.9 L116,140.9 L120.8,137.4 L118.1,137.5 L117.1,136.5 L111.9,135.3 L104.1,129 L102,125.6 L101,116.9 L101.3,112.1 L102.5,109.4 L101.5,106.4 L103,103.6 L102.5,101.1 L104.3,95.1 L107,92.1 L106.5,91.9 L109.1,90.3 L123.3,89.1 Z',
        'M76.1,89.3 L87.6,89.8 L92.6,91.3 L96.3,96.6 L97.3,100.6 L97,103.9 L98.3,106.1 L97.5,109.9 L98.5,111.9 L98.8,118.1 L97.8,126.1 L95.4,129.3 L87.9,135.3 L82.6,136.5 L81.6,137.5 L79.5,137.6 L83.5,140.4 L83.5,142.9 L79.6,146.5 L78.1,146.5 L76.6,145.5 L68,132.4 L66.4,126.8 L66.3,131.4 L64.5,131.6 L64.8,138.9 L64.3,141.1 L64.9,147.5 L63.8,145.6 L63.5,138.9 L62.8,137.9 L62.5,133.9 L62.5,126.1 L63.3,120.9 L62.8,117.6 L63.3,116.9 L60,111.9 L56.9,110 L52.9,111.8 L50,114.6 L58.3,101.1 L62.6,96.3 L64.9,94.5 L76,89.4 Z'
      ],
      biceps: [
        'M56.9,110 L57.5,110.9 L58.3,117.1 L58.3,123.6 L56,138.6 L52.5,148.4 L46,159.9 L45.3,165.4 L44,168.9 L41,171.4 L42.5,165.1 L42.5,156.9 L40.8,148.4 L42.5,132.6 L44.5,125.1 L47.5,118.6 L51.8,111.6 L54.1,111.3 L54.4,111.8 L54.6,111 L56.8,110.1 Z',
        'M142.6,110.3 L145.4,111.5 L148.3,111.9 L152.5,118.9 L155.8,126.4 L157.3,132.1 L159.3,147.1 L157.3,157.1 L157.3,164.6 L158.8,171.4 L156,169.1 L155,167.1 L153.8,159.4 L147,147.6 L144,139.4 L142.5,132.1 L141.5,122.4 L142.5,110.4 Z'
      ],
      forearms: [
        'M38.4,152.8 L39.3,154.6 L39.3,158.6 L40.8,167.9 L40.6,172.3 L50.1,160.5 L51,161.4 L51.5,163.9 L52.4,163.5 L53.5,165.6 L53.5,177.1 L52.3,185.1 L47.3,201.6 L41.8,215.6 L40,225.4 L39.8,231.9 L39.3,231.9 L39.3,230.6 L38.4,229.8 L36.5,231.1 L38.5,227.1 L38.9,222.5 L37.4,222.8 L37,223.4 L36.8,226.4 L37.5,226.6 L37.5,227.4 L36.5,227.4 L36,229.1 L36.5,230.1 L35.1,230 L34.8,231.6 L36.3,238.4 L40.3,245.6 L39.8,246.6 L41,253.4 L42,254.4 L42,258.9 L41.3,258.9 L41,256.9 L39.8,254.6 L40.3,253.1 L39,247.1 L37.6,246 L36.6,246 L35.5,246.9 L35.3,257.1 L35.8,259.9 L35.3,259.4 L35.3,263.1 L34.3,263.4 L34.5,246.9 L33.3,246.1 L32.9,242.5 L31,246.9 L29.5,257.4 L29.8,261.6 L29,260.4 L28.3,264.6 L27.5,264.6 L28,262.4 L27.5,260.4 L28.5,258.4 L30.3,247.4 L30.1,243 L29.4,246.3 L28.8,246.1 L29.1,243.5 L28,246.1 L27,245.9 L22,260.9 L21.6,260.3 L20.8,262.4 L20,262.4 L20.3,259.6 L22.8,255.1 L26.3,245.4 L24.3,245.9 L26.3,241.4 L33.5,229.6 L33.1,229 L32.1,229.3 L31,228.6 L31.8,224.4 L30.4,224.5 L29,223.4 L31.5,216.6 L31.1,214.8 L30,219.4 L27.5,224.1 L28.3,226.1 L27.3,226.9 L27,227.9 L27.5,228.1 L25.3,230.1 L26.8,226.4 L27,222.6 L29.8,213.1 L29.8,185.1 L30.8,173.9 L33.5,163.9 L38.3,152.9 Z',
        'M161.4,152.8 L164.5,158.9 L168.5,170.6 L170.3,187.6 L170,212.4 L174.3,229.6 L172.3,228.1 L172.8,227.9 L171.8,226.4 L172.3,223.9 L169.8,219.1 L168.6,214.3 L168.3,216.4 L170.5,221.4 L170.8,223.6 L169.6,224.5 L168.3,224.4 L169,228.6 L167.9,229.3 L167.1,228.8 L166.3,229.6 L175.3,244.9 L175.4,245.8 L173.9,245.3 L173.8,245.9 L177.5,256.1 L179.5,259.4 L179.3,260.6 L180,262.1 L179.4,262.5 L178.4,260.8 L178,261.4 L177.3,259.4 L177.5,258.4 L173.3,246.6 L172.6,245.8 L171.8,245.9 L170.9,243.8 L171,246.1 L170.3,246.1 L169.6,242.5 L169.5,247.1 L171.3,257.9 L172.3,260.1 L172.3,261.4 L171.8,261.4 L172.3,264.6 L171.5,264.4 L171,262.9 L170.8,259.9 L170.3,261.6 L170.3,256.9 L168.8,246.6 L167.1,243 L166.5,246.1 L165.3,246.9 L165.5,263.4 L164.5,262.4 L164,258.6 L164.5,257.1 L164.3,246.9 L162.9,245.8 L160.8,247.1 L159.8,252.4 L160,254.9 L158.5,258.9 L157.8,258.9 L158,254.4 L158.8,253.4 L160,246.9 L159.5,245.9 L163.5,238.6 L165,229.9 L164.1,230 L163.5,227.6 L162.3,227.4 L162.3,226.6 L163.3,226.4 L162.8,222.9 L160.9,222.5 L161.3,226.6 L163.3,231.1 L161.4,229.8 L160.3,231.9 L159.3,220.6 L157.8,214.4 L152.8,202.1 L147.3,183.6 L146.3,174.1 L146.5,165.1 L147.4,163.5 L148.3,164.1 L148.6,162.5 L149.3,163.1 L148.8,161.6 L149.6,160.5 L159.4,172.5 L159,168.4 L160.5,159.1 L160.5,154.6 L161.3,152.9 Z',
        'M22.9,237.5 L18.8,246.1 L18,245.6 L21,239.4 L22.8,237.6 Z',
        'M177.1,237.5 L178.8,239.1 L181.8,246.1 L181,245.9 L177,237.6 Z'
      ],
      abs: [
        'M133.4,126.3 L133.5,131.1 L134.5,131.6 L134.8,132.6 L134.8,139.1 L135.3,138.1 L135.5,140.1 L134.8,147.6 L135.5,152.4 L133.8,164.6 L131.5,172.9 L130,181.6 L130,184.1 L133,192.1 L133.3,196.1 L132,198.4 L131.3,205.1 L129.8,207.9 L121.5,216.9 L118.9,218.5 L113.6,223.5 L110.4,223.3 L107.1,225.3 L103.9,232 L101.8,230.9 L100.8,228.1 L102,182.9 L101.8,132.6 L105.1,129.3 L108.6,131.5 L109.3,133.1 L110.9,134 L111.1,132.8 L113.1,133 L115.9,131.5 L118.9,132 L120.5,132.9 L120.3,136.1 L122.4,136 L123.6,135.8 L126.4,132.3 L126.6,133 L127.6,132.8 L128.6,133.5 L130.1,132.3 L131.4,132.3 L133.3,126.4 Z',
        'M66.4,126.5 L68.4,132.3 L69.6,132.3 L71.4,133.5 L72.4,132.8 L73.1,133 L73.4,132 L76.1,135.8 L79.4,136.3 L79.5,132.9 L81.9,131.8 L84.1,131.5 L86.6,133 L88.6,132.8 L88.8,133.9 L89.6,133.8 L90.5,133.1 L90.9,131.8 L94.9,129.3 L98,132.6 L98.5,142.9 L98,190.6 L99.3,218.4 L99,228.4 L98,230.9 L96.1,232 L92.6,225.3 L89.4,223.3 L86.1,223.5 L79.1,217.5 L70.8,208.6 L68.8,205.6 L67.8,198.1 L66.5,194.9 L67,191.6 L70,183.6 L68.3,172.6 L66,164.1 L64.5,153.4 L65.3,148.9 L64.3,140.1 L64.6,139 L65.3,139.6 L65,133.1 L65.3,131.6 L66.3,131.1 L66.3,126.6 Z'
      ],
      quads: [
        'M129.4,205.3 L130,207.9 L130.6,208.3 L131.3,207.1 L129,217.6 L128.8,223.4 L131.5,232.6 L135,239.9 L138.8,259.9 L138.8,264.4 L139.1,263.8 L139.8,264.6 L140,272.9 L139.3,286.1 L136,304.4 L131.3,320.9 L127.5,330.6 L126.9,331 L126,329.9 L126.8,332.1 L126.5,334.6 L123.5,345.6 L122.3,347.4 L121.3,350.9 L120.1,350.8 L119.8,349.6 L117.5,334.6 L120.9,336.3 L122.1,336.3 L123.5,335.1 L125.8,331.4 L125,329.9 L122.9,328.3 L120.1,328.3 L116.9,330.3 L115.9,330.3 L113.6,328.8 L110,324.1 L108.5,317.9 L109.5,334.1 L111.8,339.4 L118.3,346.4 L117,356.1 L116,355.4 L114,349.4 L110,341.9 L107.8,336.1 L105.5,317.6 L105.3,306.9 L107.3,287.9 L110.3,270.9 L115.5,255.1 L129.3,205.4 Z',
        'M70.4,205.5 L72.3,210.6 L84.3,254.9 L89.8,271.6 L92.8,289.1 L94.8,308.6 L94.3,318.4 L92,336.6 L86,348.9 L83.5,355.9 L83.1,356.3 L82.8,355.6 L81.8,345.6 L88,339.4 L90,334.9 L91.5,321.9 L91.3,318.4 L89.8,324.4 L86.9,328.3 L83.9,330.3 L79.6,328.3 L76.9,328.3 L75.8,328.9 L74,331.6 L77.6,336.3 L82.5,334.6 L80,349.9 L79.6,350.8 L78.5,350.9 L77.3,346.6 L76.3,345.4 L73,332.9 L74,329.9 L72.5,331.1 L68.8,321.4 L63.5,303.1 L60.5,285.6 L60,265.4 L60.6,263.8 L61,264.6 L61,260.4 L64.8,240.1 L66.3,235.9 L68.3,232.9 L71.3,222.9 L70,212.9 L68.8,208.4 L68.9,207 L69.5,208.4 L70.3,205.6 Z'
      ],
      calves: [
        'M88.6,346.3 L90.8,359.1 L91,370.4 L85,399.6 L83,377.1 L83,359.1 L83.6,357.5 L84,358.6 L86,351.6 L88.5,346.4 Z',
        'M111.1,346.3 L114,352.1 L115.8,358.6 L116.4,358 L116.8,358.9 L116.8,378.4 L115,399.1 L112.3,387.4 L112,383.9 L110.8,381.1 L108.8,369.6 L109,359.6 L111,346.4 Z'
      ]
    },
    back: {
      shoulders: [
        'M54.4,86.8 L56.8,86.9 L56.3,87.4 L56.9,89.8 L63.6,90.3 L70.4,93 L73.3,94.9 L74,96.9 L72.3,97.9 L72.3,99.6 L74.5,105.1 L76.3,112.4 L80,119.6 L78.9,119.5 L77.4,120.8 L74.1,117 L70.9,115.3 L67.9,112 L60.6,107.3 L55.6,112.8 L47.4,118.3 L43,122.9 L42.5,115.6 L41.3,112.9 L40.5,107.9 L41.5,100.4 L45.8,92.1 L50.6,87.5 L54.3,86.9 Z',
        'M143.1,86.8 L148.9,87.3 L150.1,88.3 L154.3,92.4 L158.3,100.1 L159.3,108.6 L158.5,113.1 L157.3,115.9 L157,122.6 L156.6,123 L152.4,118.3 L143.9,112.5 L139.1,107.3 L131.6,112.3 L128.6,115.5 L126.1,116.8 L121.9,120.8 L120.9,119.5 L120,119.6 L123.5,112.6 L125.3,105.4 L127.5,99.9 L127.5,97.9 L126,96.9 L126,95.6 L128.9,93.3 L134.9,90.8 L137.6,90 L142.9,89.8 L143.5,87.9 L143,86.9 Z'
      ],
      back: [
        'M94.4,46.8 L98.4,47 L99.9,48.3 L101.4,47 L105.6,46.8 L109.8,48.4 L108.3,58.1 L109,61.4 L109.8,59.9 L109.5,64.4 L111.5,71.9 L113.3,75.1 L116.4,78.3 L125.4,83.5 L142,86.6 L140.8,87.1 L142,88.4 L141.4,89.5 L134.4,90 L130.3,93.4 L127.5,99.6 L123.5,112.6 L119.5,120.4 L119.8,121.6 L120.4,121.8 L128.1,119.8 L134.9,114.5 L138.1,111 L140,116.4 L140,124.9 L141,131.9 L137.5,146.4 L133.3,158.1 L126.8,170.6 L123.3,179.9 L122.3,188.9 L110.8,200.4 L109,204.4 L102.1,209.3 L100.1,208.8 L99.9,208 L99.6,208.8 L97.6,209.3 L90.8,204.4 L89.3,200.6 L88,199.1 L77.5,188.9 L76.5,179.6 L73.3,171.1 L66.8,158.6 L62.5,146.9 L58.8,131.4 L59.8,125.9 L60,121.6 L59.5,118.9 L60,115.1 L60.4,114.3 L60.8,114.6 L61.6,111 L64.6,114.3 L72.1,120 L79.4,121.8 L80.5,120.6 L76.3,112.4 L72.3,99.4 L69.5,93.4 L65.4,90 L58.4,89.5 L57.8,88.4 L59.3,87.1 L58,86.6 L74.4,83.5 L82.1,79.3 L85.5,76.4 L88.8,70.9 L90.5,63.4 L90.3,60.4 L91,61.1 L91.5,58.9 L90,48.6 L91.9,47.3 L94.3,46.9 Z',
        'M99.9,101 L100,126.9 L99.5,124.1 L99.8,101.1 Z'
      ],
      lowerback: [
        'M84.6,177.3 L90.8,181.9 L88.1,183.3 L86.9,182.5 L85.6,183 L84,180.6 L84.5,177.4 Z',
        'M114.9,177.3 L115.5,177.4 L115.5,181.6 L114.1,183 L112.9,182.5 L112.1,183.3 L109.3,182.1 L109.6,181 L111.6,180.3 L114.8,177.4 Z',
        'M92.1,198.8 L93.4,200.5 L95,201.4 L95.9,204.8 L96,203.6 L96.8,203.1 L96.8,200.1 L97.6,199.8 L98.1,200.5 L98.9,199.3 L99.3,200.1 L99.5,211.9 L98.3,214.1 L98.3,215.4 L97.5,215.4 L97,217.6 L96,218.6 L96.5,220.9 L95.9,221.3 L94.5,220.1 L90.5,214.1 L89.8,206.4 L91,205.1 L90,201.1 L92,198.9 Z',
        'M107.6,198.8 L110,201.4 L109,204.6 L110,206.4 L109.5,212.6 L109,215.1 L105.5,219.9 L103.5,221.1 L103.8,218.6 L103,217.9 L102.8,216.1 L101.8,215.6 L100.3,211.6 L100.8,199.6 L103,200.1 L103,202.9 L104.1,203.8 L105,201.1 L106.1,200.8 L107.5,198.9 Z'
      ],
      triceps: [
        'M60.6,107.3 L62.8,108.9 L62,109.6 L60.3,115.9 L59.8,125.9 L58.5,132.1 L58.3,137.9 L55.3,149.1 L53.8,158.1 L52,162.9 L48.3,169.1 L45.6,169.5 L45.8,168.1 L44.9,168.3 L43.5,167.1 L42.3,161.6 L40.8,158.9 L42,154.1 L40.8,149.4 L40.3,143.6 L41.5,128.9 L42.8,125.4 L42.8,123.6 L45.5,118.9 L47.6,116.8 L50.4,116.3 L55.6,112.8 L60.5,107.4 Z',
        'M138.9,107.3 L144.9,113.5 L149.6,116.3 L152.1,116.8 L153.9,118.3 L155.5,120.1 L157,123.6 L158.3,128.4 L159.8,142.9 L159,150.1 L157.8,153.9 L159.3,158.6 L157.5,161.9 L156.5,167.1 L154.1,168 L154.1,169.5 L151.8,169.4 L147.5,162.1 L145.3,155.4 L144.8,149.9 L141.8,138.9 L139.5,115.6 L138,109.9 L137,108.6 L138.8,107.4 Z'
      ],
      forearms: [
        'M40.6,147.3 L41.8,153.1 L39.5,157.9 L39.5,161.9 L40.3,163.1 L40.6,161.3 L41.8,162.4 L45.6,169.5 L46.9,167 L48.3,167.1 L48.6,169 L48.9,167.8 L51.8,167.1 L51.6,165 L53.5,165.6 L53.5,177.1 L51.8,187.4 L47.3,201.6 L41.8,215.6 L40.5,221.4 L39.3,234.1 L38.9,234.8 L38.5,234.4 L38.5,229.9 L37.8,229.1 L39.5,243.9 L41,249.6 L41.3,254.6 L42,255.1 L42,256.1 L41.6,255.5 L41.4,256.8 L40.9,255.8 L40.9,256.8 L40,255.4 L40.8,254.6 L40,250.4 L35.4,231 L36,241.1 L35.6,260.3 L34.8,260.4 L34.5,253.9 L35,254.6 L35.3,243.9 L33.9,230.8 L32.5,238.1 L33.6,236.8 L34.3,239.4 L33.1,241.8 L32.3,239.4 L29.5,259.4 L29.6,261.8 L29.1,260.8 L28.5,261.1 L28.5,258.6 L32.5,230.1 L31.3,232.4 L31.5,235.4 L30.9,235.8 L30.4,235 L30,235.6 L30.5,236.4 L29.8,236.4 L30,237.1 L29,238.4 L29.3,239.1 L28.5,240.1 L25.5,251.6 L22,260.9 L20.3,263.9 L19.8,263.4 L20.8,261.1 L20.3,259.6 L23.8,252.4 L30,231.4 L29.4,229.3 L28.5,230.4 L28.5,234.6 L27.5,234.4 L27.4,231.8 L20.8,238.4 L19.3,240.4 L17.3,246.6 L16.5,246.6 L16.8,244.4 L19.3,237.6 L24.5,231.6 L26.8,226.4 L27,222.6 L29.5,214.9 L30,210.4 L29.8,185.1 L30.8,173.9 L31.5,169.9 L35.5,158.4 L40.5,147.4 Z',
        'M159.4,147.5 L161,152.1 L164.5,158.9 L168.5,170.6 L170.3,187.6 L169.8,209.4 L170.3,214.6 L172.8,222.4 L173,226.1 L175,231.1 L180.8,237.9 L183.3,244.9 L183.3,246.9 L182.5,246.6 L180,239.6 L172.4,231.5 L172.5,234.4 L171.9,235 L171.3,234.6 L171.3,230.1 L170.6,229.5 L169.8,231.6 L176,252.1 L179.5,259.4 L179,261.1 L180,263.6 L178,261.4 L178,260.1 L174.5,252.1 L171.3,239.9 L170.8,239.6 L171,238.9 L170.5,238.9 L170.3,236.9 L169.5,236.6 L169.5,234.9 L168.9,235.8 L168.3,235.4 L168,233.4 L168.8,232.9 L167.4,229.8 L171.3,261.1 L170.6,260.8 L170.3,261.6 L167.5,238.9 L166.9,241.8 L165.5,239.1 L166.1,236.8 L167.3,238.1 L166.1,231.5 L164.5,246.4 L164.5,248.4 L165.3,248.9 L164.8,249.1 L165.3,260.1 L164.6,260.5 L164,259.1 L163.8,242.1 L164.4,231.3 L162,239.6 L160.8,248.4 L159.5,252.1 L159,255.4 L160,254.9 L159.3,256.4 L158.9,256 L158.3,256.9 L158.8,250.1 L162,232.9 L162,229.1 L161.5,229.1 L161,231.4 L161.3,234.4 L160.9,234.8 L160.5,233.9 L159,219.4 L157.3,212.9 L152.8,202.1 L148.5,189.1 L146.8,180.6 L146.3,173.1 L146.5,165.6 L147.1,165 L148.3,165.1 L148.4,167.3 L150.9,167.8 L151.1,168.8 L151.6,167 L153.1,167 L154.1,169.5 L157.8,162.9 L159,161.9 L159,160.6 L159.4,162.5 L160.5,161.9 L160.5,158.4 L158,153.1 L159.3,147.6 Z',
        'M32.9,220 L33,222.4 L30.3,227.1 L29.8,227.4 L29.8,223.9 L32.8,220.1 Z',
        'M166.9,220 L170,223.9 L170.3,227.4 L169.5,227.1 L166.8,222.1 L166.8,220.1 Z',
        'M38.4,220.3 L38.3,228.4 L37.5,227.6 L37.5,223.1 L38.3,220.4 Z',
        'M161.4,220.3 L162.3,222.4 L162.3,228.9 L161.5,228.6 L161.3,220.4 Z'
      ],
      glutes: [
        'M74.9,192.8 L78.4,193.3 L81.1,195 L82.9,197.5 L83.4,197 L83.5,201.9 L86.4,204.5 L89.6,206 L90.8,208.1 L91,216.1 L94.3,220.1 L95.3,222.9 L94.5,227.4 L95.6,227.8 L97.1,226.3 L99,230.9 L98.8,233.6 L99.3,234.9 L96.5,241.6 L88.1,248.3 L80.9,251 L76.4,253.8 L72.8,259.4 L72.6,263.8 L71.3,261.1 L71.3,259.1 L69.3,255.6 L68.8,250.6 L65.8,238.1 L65.5,232.6 L63.3,225.6 L63.3,212.4 L64.3,206.4 L65,205.4 L66,200.1 L67.3,197.1 L69.1,194.8 L71.1,193.5 L74.8,192.9 Z',
        'M123.1,192.8 L127.6,193 L130.6,194.8 L132.3,196.6 L133.8,199.9 L136.5,211.1 L136.5,226.1 L136,228.9 L134.5,231.4 L134.3,237.4 L133,241.6 L132.5,246.4 L131.3,249.6 L130.8,254.6 L127.5,263.1 L127,262.4 L127,259.1 L124,254.4 L119.6,251.3 L112.1,248.5 L103.9,242.3 L100.5,234.4 L101,233.6 L101,229.9 L102.3,228.1 L102.5,226.4 L104.4,227.8 L105.3,227.4 L104.8,222.4 L105.5,220.1 L109,215.9 L109,208.4 L110,206.1 L113.1,204.8 L116.3,201.9 L116.3,197.4 L116.9,197.5 L118.4,195.3 L123,192.9 Z'
      ],
      hamstrings: [
        'M91.6,245.5 L96.3,271.9 L96,284.1 L93.3,303.6 L92.5,328.6 L90.5,340.9 L88.8,344.1 L88.5,340.4 L89.3,335.6 L87.8,329.6 L82,319.6 L80.5,314.9 L79.9,308.5 L78.5,315.9 L71.5,327.6 L70.3,331.9 L68.5,343.6 L67.8,340.1 L67.5,326.9 L69.3,318.6 L69.5,309.4 L70.3,306.1 L70,289.6 L71.5,269.4 L74,257.4 L77.6,251.8 L79.9,250.5 L83.9,250 L87.1,248.8 L91.5,245.6 Z',
        'M108.4,245.5 L112.6,248.8 L115.9,250 L120.1,250.5 L121.9,251.5 L125,255.4 L126,258.1 L128.3,268.4 L129.8,288.9 L129.5,305.4 L130.3,309.1 L130.5,318.4 L132.3,326.4 L131.8,343.4 L131.4,343.8 L131,342.6 L129.8,332.6 L128.3,327.6 L121.3,315.6 L119.9,308 L119.3,315.4 L118,319.1 L112,329.9 L110.8,334.9 L111.5,343.4 L111.1,344.3 L109.5,341.6 L106.8,323.6 L106.8,305.6 L103.8,283.6 L103.8,270.6 L105.3,259.9 L108.3,245.6 Z'
      ],
      calves: [
        'M123.1,319.3 L124.8,322.1 L127.8,324.6 L129.5,329.1 L130.8,341.1 L133.5,356.4 L133.8,366.6 L130,387.1 L125.8,400.9 L122.3,407.9 L118.9,410.5 L116.8,410.4 L116.3,406.4 L116.5,423.4 L115.5,437.4 L114.3,437.4 L115.3,426.6 L115.3,401.1 L112.3,387.4 L112,383.9 L110.8,381.1 L109.3,373.6 L108.8,369.6 L109,359.6 L111.5,343.4 L111.3,334.6 L112.3,328.9 L117.4,320.3 L119.4,327.8 L121,321.4 L123,319.4 Z',
        'M76.6,319.5 L78.8,321.1 L80.4,327.3 L82.6,320.5 L87.5,328.6 L88.5,334.4 L88.5,344.6 L91,361.9 L90.5,374.1 L89,381.4 L88,383.4 L84.8,399.9 L84.5,419.4 L85.8,437.1 L84.5,437.4 L83.8,432.1 L83.5,406.9 L82.9,410.8 L81.1,410.5 L78.6,409 L77.5,407.9 L73.8,400.1 L70.3,388.9 L66.3,369.6 L66.3,357.4 L69,341.6 L70.3,329.4 L72.3,324.4 L75,322.4 L76.5,319.6 Z',
        'M121.4,384.3 L122.8,387.6 L125.8,389.1 L124,395.1 L123.1,396 L120.8,396.4 L121.3,384.4 Z',
        'M78.4,384.5 L79,396.4 L78.1,396.5 L75.8,395.1 L74,389.4 L77,387.9 L78.3,384.6 Z',
        'M115.4,393.3 L117,399.1 L115.8,397.4 L116.3,401.4 L117.1,402.3 L117.8,401.9 L117.5,400.6 L118.3,398.9 L118,397.4 L117.3,397.4 L115.5,393.4 Z',
        'M84.4,393.5 L83,398.6 L84,397.6 L83.5,401.4 L82.6,402.3 L82,401.9 L82.3,400.6 L81.5,399.1 L81.8,397.4 L82.5,397.4 L84.3,393.6 Z'
      ]
    }
  },
  /* Where each group's number sits, in the figure's own coordinates: the
     centre of its largest ring, so a shape that moves takes its number too. */
  label: {
    front: {
      shoulders: [54,100],
      chest: [79,114],
      biceps: [49,136],
      forearms: [38,199],
      abs: [83,176],
      quads: [77,285],
      calves: [87,370]
    },
    back: {
      shoulders: [58,103],
      back: [100,131],
      lowerback: [95,209],
      triceps: [50,138],
      forearms: [38,199],
      glutes: [79,225],
      hamstrings: [83,290],
      calves: [79,364]
    }
  }
};
/* </figure-geometry> */

/* Two figures can be on screen at once (the dashboard and the anatomy screen),
   and a clip path is addressed by id, so each instance gets its own. */
let FIG_UID = 0;

/* Muscle groups visible on each side, in a sensible reading order */
const SIDE_MUSCLES = {
  front: ['shoulders','chest','biceps','forearms','abs','quads','calves'],
  back:  ['shoulders','back','lowerback','triceps','forearms','glutes','hamstrings','calves']
};

function bboxOf(paths){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  paths.forEach(p => {
    const nums = p.match(/-?\d+(\.\d+)?/g) || [];
    for(let i=0;i+1<nums.length;i+=2){
      const x=+nums[i], y=+nums[i+1];
      if(x<x0)x0=x; if(x>x1)x1=x;
      if(y<y0)y0=y; if(y>y1)y1=y;
    }
  });
  if(x0>x1) return null;
  return {x0,y0,x1,y1};
}
FIG.bbox = {};
['front','back'].forEach(side => {
  FIG.bbox[side] = {};
  Object.keys(FIG.regions[side]).forEach(m => { FIG.bbox[side][m] = bboxOf(FIG.regions[side][m]); });
});

function viewFor(side, selected){
  if(!selected || !FIG.bbox[side][selected]) return FIG.view;
  const b = FIG.bbox[side][selected];
  const pad = 14;
  const w = Math.max(60, (b.x1-b.x0) + pad*2);
  const h = Math.max(60, (b.y1-b.y0) + pad*2);
  // keep the figure's aspect ratio so zoom never distorts
  const cx = (b.x0+b.x1)/2, cy = (b.y0+b.y1)/2;
  const scale = Math.max(w/200, h/470) * 1.6;
  const vw = 200*scale, vh = 470*scale;
  return [cx-vw/2, cy-vh/2, vw, vh].map(v => Math.round(v*10)/10).join(' ');
}

/* -------------------------------------------------------- ANATOMY FIGURE */
function anatomyFigure(state, opts){
  const o = opts || {};
  const side = o.side || 'front';
  const sel  = o.selected || null;
  const now  = o.now || Date.now();
  const rec  = allRecovery(state, now);
  const vb   = viewFor(side, sel);

  /* pointerOnly: the figure is still tappable, but it is not a keyboard
     destination. Used on the dashboard, where the map is a picture of your week
     and the accessible action is the link beside it — thirty focus stops for
     thirty body regions sat between the action card and the rest of the page.
     Tapping keeps working because the click handler lives on data-m. */
  const ptr = !!o.pointerOnly;
  const uid = 'fig' + (++FIG_UID);
  const ink = token('ink','#20211F');
  let out = '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" ' +
            'role="img" aria-label="' + esc(t('body.title') + '. ' + t('a11y.figureAlt')) +
            (ptr ? '. ' + t('home.mapCta') : '') + '" ' +
            'style="transition:all var(--t-slow) var(--ease)">';

  /* The silhouette is also the clip. A region drawn a hair too wide used to
     spill over the outline and read as a sticker on a mannequin; clipped, it is
     trimmed by the body instead, which is the same reason the silhouette is one
     closed line and not a head stuck on a torso. */
  out += '<defs><clipPath id="' + uid + '-body">' +
         FIG.outline.map(d => '<path d="' + d + '"/>').join('') +
         '</clipPath></defs><g clip-path="url(#' + uid + '-body)">';
  /* The body itself, under the groups. Without it, every place where no tracked
     muscle is the surface — a kneecap, the side of the waist, the neck — reads
     as a hole in the figure rather than as tissue that is simply not tracked. */
  out += '<rect class="fig-fill" x="0" y="0" width="200" height="470"/>';

  SIDE_MUSCLES[side].forEach(m => {
    const paths = FIG.regions[side][m];
    if(!paths) return;
    const r = rec[m];
    const st = r ? r.state : 'fresh';
    const hasData = r && r.since !== null;
    const fill = STATE_HEX[st] || STATE_HEX.fresh;
    const opacity = hasData ? (0.42 + 0.5*Math.min(1, r.ratio)).toFixed(2) : 0.30;
    const isSel = (m === sel);
    if(isSel){
      /* The selection is a halo traced round the region itself. The dashed box
         it replaced was drawn from the bounding box, so it lied about the shape
         it was pointing at — a rectangle round a deltoid. */
      paths.forEach(d => { out += '<path class="halo" d="' + d + '"/>'; });
    }
    paths.forEach(d => {
      out += '<path class="seg' + (isSel ? ' sel' : '') + '" data-m="' + m + '" d="' + d + '" ' +
             'fill="' + fill + '" fill-opacity="' + (isSel ? Math.min(1, +opacity + 0.35).toFixed(2) : opacity) + '" ' +
             'stroke="' + ink + '" stroke-width="' + (isSel ? 1.2 : 0.5) + '" ' +
             'stroke-opacity="' + (isSel ? 1 : 0.45) + '">' +
             '<title>' + esc(t('mg.' + m)) + ' — ' + esc(t('mst.' + st)) + '</title></path>';
    });
  });
  out += '</g>';

  /* The body's edge is drawn over the fills so it stays the strongest line. */
  FIG.outline.forEach(d => { out += '<path class="fig-outline" d="' + d + '"/>'; });

  /* Numbers, the same twelve as the list below: two views of one key rather
     than two lists that happen to agree. Decorative — the list is the label. */
  (function numbers(){
    const label = (FIG.label || {})[side] || {};
    const keys = Object.keys(label);
    for(let i = 0; i < keys.length; i++){
      const m = keys[i], p = label[m];
      const idx = (typeof MUSCLES !== 'undefined' ? MUSCLES.indexOf(m) : -1) + 1;
      if(!p || idx < 1) continue;
      out += '<text class="fig-num" x="' + p[0] + '" y="' + p[1] + '" aria-hidden="true">' + idx + '</text>';
    }
  })();
  /* Transparent hit layer drawn on top. The visible artwork is pointer-events:none,
     so this layer is the single, predictable tap target. A wide transparent
     stroke enlarges small regions (deltoids, forearms) to a realistic touch
     size without changing how anything looks. */
  SIDE_MUSCLES[side].forEach(m => {
    (FIG.regions[side][m] || []).forEach(d => {
      out += '<path class="seg-hit" data-m="' + m + '" d="' + d + '" ' +
             'fill="transparent" stroke="transparent" stroke-width="14" ' +
             'stroke-linejoin="round" stroke-linecap="round" ' +
             (ptr ? '' : 'tabindex="0" role="button" aria-label="' +
                esc(t('mg.' + m)) + ' — ' + esc(t('mst.' + (rec[m] ? rec[m].state : 'fresh'))) + '" ') +
             '><title>' + esc(t('mg.' + m)) + '</title></path>';
    });
  });
  out += '</svg>';
  return out;
}

/* ------------------------------------------------------- READINESS METER */
/* Score definition (explicit and testable):
   readiness = 100 x min over the muscles involved in the next session of
               (days since last recorded exposure / estimated recovery days)
   It is an estimate of whether enough time has passed, not a measurement
   of biological recovery. Rounded to the nearest 5% — no false precision. */
function readinessMeter(value, stateKey, opts){
  const o = opts || {};
  if(value === null || value === undefined){
    return '<div class="readiness"><div class="v" style="font-size:15px">' + esc(t('home.insufficient')) +
           '</div><div class="bar"><i style="width:0%"></i></div><div class="cap">' +
           esc(t('readiness.noscore')) + '</div></div>';
  }
  const rounded = Math.round(value*100/5)*5;
  const pct = Math.max(0, value < 1 ? Math.min(95, rounded) : Math.min(100, rounded));
  return '<div class="readiness">' +
    '<div class="v">' + pct + '<small>%</small></div>' +
    '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
    '<div class="cap">' + esc(t('readiness.label')) + '</div>' +
    (o.showDef ? '<div class="cap mt-1" style="max-width:150px;line-height:1.4">' +
      esc(t('readiness.definition')) + '</div>' : '') +
    '</div>';
}

/* ------------------------------------------------------------- METRICS */
/* A metric can carry an explanation. The explanation is reachable by pointer,
   by keyboard focus and by assistive technology — not hover alone.
   When `numKey` is given and `value` is numeric, hydrateMotion() animates
   from the previous real value to the new real value. */
function metric(key, value, unit, delta, tip, numKey, decimals){
  const isNum = numKey && typeof value === 'number' && isFinite(value);
  const vAttrs = isNum
    ? ' class="v num" data-num-key="' + esc(numKey) + '" data-num-to="' + value +
      '" data-num-dec="' + (decimals || 0) + '"'
    : ' class="v"';
  return '<div class="metric">' +
    '<div class="k">' + esc(key) +
      (tip ? '<button type="button" class="tip" aria-label="' + esc(tip) + '" ' +
             'data-tip="' + esc(tip) + '">?</button>' : '') +
    '</div>' +
    '<div' + vAttrs + '>' + esc(value) + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</div>' +
    (delta ? '<div class="d">' + esc(delta) + '</div>' : '') + '</div>';
}
function metricsBlock(items){
  return '<div class="metrics">' +
    items.map(i => metric(i.k, i.v, i.u, i.d, i.tip, i.numKey, i.dec)).join('') + '</div>';
}

/* --------------------------------------------------------------- TABLE */
function dataTable(cols, rows, caption){
  let h = '<div class="table-wrap"><table class="data">';
  if(caption) h += '<caption>' + esc(caption) + '</caption>';
  h += '<thead><tr>' + cols.map(c => '<th class="end"' + (c.n ? ' ' : '') + '>' +
       esc(c.label) + (c.unit ? ' <span class="meta">(' + esc(c.unit) + ')</span>' : '') +
       '</th>').join('') + '</tr></thead><tbody>';
  if(!rows.length){
    h += '<tr><td colspan="' + cols.length + '" class="td-empty">' +
         esc(t('state.none')) + '</td></tr>';
  }
  rows.forEach(r => {
    h += '<tr>' + r.map((c,i) => '<td' + (cols[i] && cols[i].n ? ' class="n"' : '') + '>' +
         (c === null || c === undefined ? '—' : c) + '</td>').join('') + '</tr>';
  });
  h += '</tbody></table></div>';
  return h;
}

/* --------------------------------------------------------------- CHARTS */
function niceCeil(v){
  if(v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v/mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step*mag;
}

/* A chart axis must land on numbers a person can read. The old code rounded
   only the top of the domain and then took min = rawMin * 0.85, which is how a
   chart of 42..52.5 kg ended up labelled 36, 52, 68, 84, 100. */
function niceStep(raw){
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * mag;
}
function niceScale(lo, hi, ticks){
  ticks = ticks || 4;
  if(!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1; }
  if(hi - lo < 1e-9){ hi = lo + 1; }
  const step = niceStep((hi - lo) / ticks);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  /* integers only when the data is integers, so 2.5 does not become 2.5000001 */
  const dp = step < 1 ? 1 : 0;
  const labels = [];
  for(let v = min; v <= max + step / 2; v += step) labels.push(Number(v.toFixed(dp)));
  return { min, max, step, labels, dp };
}

let CHART_SEQ = 0;
function showChartTip(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text || '';
}

/* Line chart: load per session. Title, units, axes and period are mandatory. */
function lineChart(opts){
  const W = 640, H = 240, PL = 46, PR = 26, PT = 16, PB = 34;
  const pts = opts.points || [];
  const unit = opts.unit || '';
  const label = opts.label || '';

  if(pts.length === 0) return emptyState('chart.nodata', 'chart.nodata.body');
  if(pts.length === 1){
    // one point cannot show a trend — say so instead of drawing a fake line
    return '<div class="chart-hd"><span class="t">' + esc(opts.title) + '</span></div>' +
      banner('info', t('chart.onepoint.title'), t('chart.onepoint.body'));
  }

  const tipId = 'ctip_' + (++CHART_SEQ);
  const vals = pts.map(p => p.v);
  const rawMax = Math.max.apply(null, vals);
  const rawMin = Math.min.apply(null, vals);
  /* Six per cent of headroom, then a scale that lands on round numbers at both
     ends. An axis is a ruler, not a remainder. */
  const pad = Math.max((rawMax - rawMin) * 0.08, Math.abs(rawMax) * 0.01 || 1);
  const sc = niceScale(rawMin - pad, rawMax + pad, 4);
  const max = sc.max, min = sc.min;
  const x = i => PL + (i/(pts.length-1))*(W-PL-PR);
  const y = v => PT + (1 - (v-min)/Math.max(0.0001,(max-min)))*(H-PT-PB);

  let g = '';
  sc.labels.forEach(v => {
    const yy = y(v);
    g += '<line class="dv-grid" x1="' + PL + '" y1="' + yy.toFixed(1) + '" x2="' + (W-PR) +
         '" y2="' + yy.toFixed(1) + '"/>' +
         '<text class="dv-ytick" x="' + (PL-8) + '" y="' + (yy+3.5).toFixed(1) + '" ' +
         'text-anchor="end">' + v + '</text>';
  });
  // x labels: first, middle, last — anchor edge labels inward so they never clip
  [0, Math.floor((pts.length-1)/2), pts.length-1].filter((v,i,a)=>a.indexOf(v)===i).forEach(i => {
    const anchor = i === 0 ? 'start' : (i === pts.length - 1 ? 'end' : 'middle');
    const dx = i === 0 ? -2 : (i === pts.length - 1 ? 2 : 0);
    g += '<text class="dv-xtick" x="' + (x(i)+dx).toFixed(1) + '" y="' + (H-12) + '" ' +
         'text-anchor="' + anchor + '">' + esc(pts[i].label) + '</text>';
  });

  const d = pts.map((p,i) => (i?'L':'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
  const dots = pts.map((p,i) => {
    const valTxt = p.text ? p.text : ((Math.round(p.v*10)/10) + (unit ? ' ' + unit : ''));
    const fullTip = p.label + ' — ' + valTxt + (p.best ? ' (' + t('chart.pr') + ')' : '');
    const jsTip = fullTip.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<g class="chart-pt" tabindex="0" role="listitem" aria-label="' + esc(fullTip) + '" ' +
      'onmouseenter="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')" ' +
      'onfocus="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')" ' +
      'data-act="showChartTip" data-a1="' + tipId + '" data-a2="' + esc(jsTip) + '">' +
      '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="11" fill="transparent"/>' +
      (p.best
        ? '<circle class="dv-dot best" style="animation-delay:' +
          Math.round((i/(pts.length-1))*520) + 'ms" cx="' + x(i).toFixed(1) +
          '" cy="' + y(p.v).toFixed(1) + '" r="5.2"/>'
        : '<circle class="dv-dot" style="animation-delay:' +
          Math.round((i/(pts.length-1))*520) + 'ms" cx="' + x(i).toFixed(1) +
          '" cy="' + y(p.v).toFixed(1) + '" r="2.8"/>') +
      '<title>' + esc(fullTip) + '</title></g>';
  }).join('');

  const first = pts[0], last = pts[pts.length-1];
  const latestTip = last.label + ' — ' + (last.text ? last.text : ((Math.round(last.v*10)/10) + (unit ? ' ' + unit : '')));

  return '<div class="chart-hd"><span class="t">' + esc(opts.title) + '</span>' +
    '<span class="p">' + esc(opts.period) + ' · ' + esc(t('chart.unit')) + ': ' + esc(unit) + '</span></div>' +
    '<svg class="chart chart-anim" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title) + '">' +
    g +
    '<path class="chart-path" pathLength="1000" d="' + d + '"/>' +
    '<g role="list">' + dots + '</g>' +
    '<line class="dv-axis" x1="' + PL + '" y1="' + (H-PB) + '" x2="' + (W-PR) + '" y2="' + (H-PB) + '"/>' +
    '</svg>' +
    '<div class="chart-legend"><div><i class="sw direct"></i>' + esc(label) +
    '</div><div><i class="sw dot"></i>' +
    esc(t('chart.pr')) + '</div>' +
    '<span class="chart-tip-readout mono" id="' + tipId + '" aria-live="polite">' + esc(latestTip) + '</span></div>' +
    '<p class="sr-only">' + esc(t('chart.summarySpark', {
      first: first.label + ' ' + (Math.round(first.v*10)/10) + (unit ? ' ' + unit : ''),
      last:  last.label  + ' ' + (Math.round(last.v*10)/10)  + (unit ? ' ' + unit : ''),
      min:   Math.round(rawMin*10)/10,
      max:   Math.round(rawMax*10)/10
    })) + '</p>';
}

/* Bar chart: volume by muscle group. */
function barChart(opts){
  /* PT is generous because the value printed above a bar is part of the mark:
     a tall bar must not push its own number into the top gridline. */
  const W = 640, H = 220, PL = 46, PR = 14, PT = 24, PB = 40;
  const rows = opts.rows || [];
  if(!rows.length) return emptyState('chart.nodata', 'chart.nodata.body');
  const tipId = 'ctip_' + (++CHART_SEQ);
  const sc = niceScale(0, Math.max.apply(null, rows.map(r => r.v)) * 1.04, 4);
  const max = sc.max || 1;
  const bw = (W-PL-PR)/rows.length;
  const u = opts.unit || '';
  let g = '';
  sc.labels.forEach(v => {
    const yy = PT + (1 - v/max)*(H-PT-PB);
    g += '<line class="dv-grid" x1="' + PL + '" y1="' + yy.toFixed(1) + '" x2="' + (W-PR) +
         '" y2="' + yy.toFixed(1) + '"/>' +
         '<text class="dv-ytick" x="' + (PL-8) + '" y="' + (yy+3.5).toFixed(1) + '" ' +
         'text-anchor="end">' + v + '</text>';
  });
  rows.forEach((r,i) => {
    const h = (r.v/max)*(H-PT-PB);
    const bx = PL + i*bw + bw*0.16, bwid = bw*0.68;
    const tipTxt = (r.name || r.short) + ' — ' + Math.round(r.v*10)/10 + (u ? ' ' + u : '');
    const jsTip = tipTxt.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    /* A zero is a zero: a 2 px stub on the axis, never a 1 px sliver that
       pretends to be a very small value. */
    const zero = !(r.v > 0);
    g += '<g class="chart-bar-g" tabindex="0" role="listitem" aria-label="' + esc(tipTxt) + '" ' +
         'onmouseenter="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')" ' +
         'onfocus="showChartTip(\'' + tipId + '\',\'' + esc(jsTip) + '\')" ' +
         'data-act="showChartTip" data-a1="' + tipId + '" data-a2="' + esc(jsTip) + '">' +
         (zero
           ? '<rect class="chart-bar zero" x="' + bx.toFixed(1) + '" y="' + (H-PB-2) +
             '" width="' + bwid.toFixed(1) + '" height="2"/>'
           : '<rect class="chart-bar" style="animation-delay:' + (i*45) + 'ms" x="' + bx.toFixed(1) +
             '" y="' + (H-PB-h).toFixed(1) + '" width="' + bwid.toFixed(1) +
             '" height="' + h.toFixed(1) + '"/>') +
         '<title>' + esc(tipTxt) + '</title>' +
         (zero ? '' :
           '<text class="dv-value" x="' + (bx+bwid/2).toFixed(1) + '" y="' + Math.max(PT + 8, H-PB-h-7).toFixed(1) +
           '" text-anchor="middle">' + (Math.round(r.v*10)/10) + '</text>') +
         '<text class="dv-xtick" x="' + (bx+bwid/2).toFixed(1) + '" y="' + (H-14) +
         '" text-anchor="middle">' + esc(r.short) + '</text></g>';
  });
  const srList = rows.map(r => (r.name || r.short) + ' ' + Math.round(r.v*10)/10).join(', ');
  return '<div class="chart-hd"><span class="t">' + esc(opts.title) + '</span><span class="p">' +
    esc(opts.period) + ' · ' + esc(t('chart.unit')) + ': ' + esc(u) + '</span></div>' +
    '<svg class="chart chart-anim" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title) + '">' +
    '<g role="list">' + g + '</g>' +
    '<line class="dv-axis" x1="' + PL + '" y1="' + (H-PB) + '" x2="' + (W-PR) + '" y2="' + (H-PB) + '"/></svg>' +
    '<div class="chart-legend"><span class="chart-tip-readout mono" id="' + tipId + '" aria-live="polite">' +
    esc(rows[0] ? ((rows[0].name || rows[0].short) + ' — ' + Math.round(rows[0].v*10)/10 + (u ? ' ' + u : '')) : '') +
    '</span></div>' +
    '<p class="sr-only">' + esc(opts.title + ': ' + srList) + '</p>';
}

/* -------------------------------------------------------------- TIMELINE */
function timelineStrip(state, now){
  const p = state.profile || {};
  const anchor = p.usualWake != null ? p.usualWake : 4;
  let h = '<div class="tl">';
  for(let i=0;i<7;i++){
    const d0 = bioDayStart(now + i*86400000, anchor), d1 = d0 + 86400000;
    let blocks = '';
    (state.sleep||[]).forEach(r => {
      const s = sleepRange(r); if(!s) return;
      if(s.end > d0 && s.start < d1){
        const a = Math.max(0,(s.start-d0)/86400000), b = Math.min(1,(s.end-d0)/86400000);
        blocks += '<div class="sleep" style="top:' + (a*100).toFixed(1) + '%;height:' + ((b-a)*100).toFixed(1) + '%"></div>';
      }
    });
    shiftsOverlapping(state.shifts, d0, d1).forEach(s => {
      const a = Math.max(0,(s.range.start-d0)/86400000), b = Math.min(1,(s.range.end-d0)/86400000);
      blocks += '<div class="shift" style="top:' + (a*100).toFixed(1) + '%;height:' + ((b-a)*100).toFixed(1) + '%"></div>';
    });
    const isNow = now >= d0 && now < d1;
    if(isNow) blocks += '<div class="now" style="top:' + (((now-d0)/86400000)*100).toFixed(1) + '%"></div>';
    h += '<div class="tlcol"><div class="lab">' + esc(dayLabel(d0, 'narrow')) + '</div>' +
         '<div class="track">' + blocks + '</div>' +
         '<div class="mk">' + new Date(d0).getDate() + '</div></div>';
  }
  h += '</div><div class="legend">' +
    '<div><i class="sw sleep"></i>' + esc(t('tl.sleep')) + '</div>' +
    '<div><i class="sw shift"></i>' + esc(t('tl.shift')) + '</div>' +
    '<div><i class="sw now"></i>' + esc(t('tl.now')) + '</div>' +
    '</div>';
  return h;
}

/* -------------------------------------------------------- FEEDBACK STATES */
/* The mark for a state with no content in it: a blank tally form. Four
   strokes, uninked, waiting to be counted. It replaces six stock line icons —
   an inbox, a chart, a clock, a body, a plan, a crossed-out circle — which said
   nothing the wordmark had not already said, and which nobody had drawn on
   this system's logic. */
const TALLY_BLANK =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor" opacity=".32">' +
  '<rect x="3.2" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="8.267" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="13.333" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="18.4" y="4.2" width="2.4" height="15.6"/>' +
  '</g></svg>';

/* The one loading primitive. `skel('title row row figure')` emits bars shaped
   like the thing that is coming, so the layout does not jump when it lands.
   There were three loaders before this: a shimmering block, a static grey row,
   and a rotating circle — plus two helper functions nobody called. */
const SKEL_SHAPES = {
  title:  {h: 22, w: 64},
  lede:   {h: 12, w: 84},
  row:    {h: 14, w: 100},
  short:  {h: 14, w: 52},
  figure: {h: 64, w: 100},
  label:  {h: 9,  w: 34}
};
function skel(parts, opts){
  opts = opts || {};
  const list = String(parts || 'row row row').trim().split(/\s+/);
  let h = '<div class="skel' + (opts.cls ? ' ' + opts.cls : '') + '" aria-busy="true" aria-live="polite">' +
          '<span class="sr-only">' + esc(t(opts.labelKey || 'lab.loading')) + '</span>';
  list.forEach((key, i) => {
    const sh = SKEL_SHAPES[key] || SKEL_SHAPES.row;
    h += '<div class="skel-bar skel-' + (SKEL_SHAPES[key] ? key : 'row') + '"' +
         ' style="height:' + sh.h + 'px;width:' + sh.w + '%;animation-delay:' + (i * 90) + 'ms"></div>';
  });
  return h + '</div>';
}

/* A wait inside a fixed frame — the 3D lab — is marked with the tally's four
   strokes and the fifth not yet drawn. Not a spinner: a circle says "wait",
   a tally says "counting", and counting is what this product does. */
function waitMark(){
  return '<span class="wait" aria-hidden="true"><svg viewBox="0 0 24 24">' +
    '<g fill="currentColor">' +
    '<rect class="ws ws1" x="3.2" y="4.2" width="2.4" height="15.6"/>' +
    '<rect class="ws ws2" x="8.267" y="4.2" width="2.4" height="15.6"/>' +
    '<rect class="ws ws3" x="13.333" y="4.2" width="2.4" height="15.6"/>' +
    '<rect class="ws ws4" x="18.4" y="4.2" width="2.4" height="15.6"/>' +
    '</g></svg></span>';
}

/* The failure state. Four strokes drawn, and the fifth — the one that closes
   the set — in the alert colour, because that is exactly what happened: the
   screen could not be completed. */
const TALLY_BROKEN =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<g fill="currentColor"><g opacity=".3">' +
  '<rect x="3.2" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="8.267" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="13.333" y="4.2" width="2.4" height="15.6"/>' +
  '<rect x="18.4" y="4.2" width="2.4" height="15.6"/>' +
  '</g><rect x="2.30" y="10.8" width="19.4" height="2.4" transform="rotate(-16 12 12)"/></g></svg>';

/* A screen that failed is not a crash dialogue. It says what happened, says the
   log is intact, offers one way out, and puts the stack one tap away. */
function failureState(err){
  const detail = err && (err.stack || err.message) ? String(err.stack || err.message) : '';
  return '<div class="fail">' +
    '<div class="mk">' + TALLY_BROKEN + '</div>' +
    '<h3>' + esc(t('app.fail.title')) + '</h3>' +
    '<p>' + esc(t('app.fail.body')) + '</p>' +
    '<div class="act">' +
      '<button class="btn" data-act="render">' + esc(t('app.fail.retry')) + '</button>' +
      '<button class="btn quiet" data-act="go" data-a1="home">' + esc(t('nav.today')) + '</button>' +
    '</div>' +
    (detail ? '<details class="fail-more"><summary>' + esc(t('app.fail.detail')) + '</summary>' +
      '<pre>' + esc(detail) + '</pre></details>' : '') +
    '</div>';
}

/* The third argument used to pick an icon. It is accepted and ignored, so no
   call site had to change and no call site can pick a different mark again. */
function emptyState(titleKey, bodyKey, icon, actionHtml, level){
  /* level: the heading level this state sits at. Defaults to h3, because most
     empty states live inside a section that already has an h2. Where one stands
     directly under the screen's h1 it passes 2 — the level is a place in the
     document, not a size, and the type is the same either way. */
  const lv = level === 2 ? 2 : 3;
  return '<div class="empty"><div class="mk">' + TALLY_BLANK + '</div>' +
    '<h' + lv + '>' + esc(t(titleKey)) + '</h' + lv + '>' +
    '<p>' + esc(t(bodyKey)) + '</p>' +
    (actionHtml ? '<div class="act">' + actionHtml + '</div>' : '') + '</div>';
}

function banner(kind, title, body){
  const ic = kind === 'ok' ? 'OK' : kind === 'warn' ? '!' : kind === 'alert' ? '!!' : 'i';
  return '<div class="banner ' + kind + '"><span class="ic">' + ic + '</span><span>' +
    (title ? '<b>' + esc(title) + '</b> ' : '') + esc(body || '') + '</span></div>';
}


/* ------------------------------------------------------------- PRINT CARD */
/* ============================================================================
   Sparkline — a compact trend line for real session data.
   Includes an accessible table-free summary so the information is not locked
   behind the ability to see the shape.
   ========================================================================== */
function sparkline(points, opts){
  opts = opts || {};
  if(!points || points.length < 2) return '';
  const w = 100, h = 34, pad = 2;
  const max = points.reduce((a,p) => Math.max(a, p.v), 0);
  const min = points.reduce((a,p) => Math.min(a, p.v), Infinity);
  const flat = Math.abs(max - min) < 1e-9;
  const span = flat ? 1 : (max - min);
  const x = i => pad + (i / (points.length - 1)) * (w - pad*2);
  const y = v => flat ? (h / 2) : (h - pad - ((v - min) / span) * (h - pad*2));

  let d = '';
  points.forEach((p, i) => { d += (i ? ' L' : 'M') + x(i).toFixed(2) + ' ' + y(p.v).toFixed(2); });
  const area = d + ' L' + x(points.length-1).toFixed(2) + ' ' + (h-pad) + ' L' + x(0).toFixed(2) + ' ' + (h-pad) + ' Z';

  const first = points[0], lastP = points[points.length-1];
  const delta = lastP.v - first.v;
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  return '<div class="spark' + (opts.compact ? ' compact' : '') + '">' +
    '<div class="spark-hd"><span class="eyebrow">' + esc(opts.label || '') + '</span>' +
    '<span class="spark-delta ' + dir + '">' + (delta > 0 ? '+' : '') + (Math.round(delta*10)/10) +
    ' ' + esc(opts.unit || '') + '</span></div>' +
    '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<path class="spark-area" d="' + area + '"/>' +
      '<path class="spark-line" d="' + d + '"/>' +
      points.map((p,i) => {
        const now = i === points.length - 1;
        return '<circle class="spark-dot' + (now ? ' now' : '') + '" cx="' + x(i).toFixed(2) +
          '" cy="' + y(p.v).toFixed(2) + '" r="' + (now ? 2.2 : 1.2) +
          '"><title>' + esc(p.label + ': ' + (Math.round(p.v*10)/10)) + '</title></circle>';
      }).join('') +
    '</svg>' +
    '<div class="spark-foot"><span>' + esc(first.label) + '</span><span>' + esc(lastP.label) + '</span></div>' +
    '<p class="sr-only">' + esc(t('chart.summarySpark',
      { first: points[0].label + ' ' + points[0].v, last: lastP.label + ' ' + lastP.v,
        min: Math.round(min*10)/10, max: Math.round(max*10)/10 })) + '</p>' +
    '</div>';
}

/* Progress ring for a single real fraction. */
function progressRing(fraction, opts){
  opts = opts || {};
  const pct = Math.max(0, Math.min(100, Math.round((fraction || 0) * 100)));
  const r = opts.r || 26, sw = opts.stroke || 5;
  const c = 2 * Math.PI * r;
  const rk = opts.ringKey ? ' data-ring-key="' + esc(opts.ringKey) + '"' : '';
  return '<div class="ring" style="width:' + ((r+sw)*2) + 'px;height:' + ((r+sw)*2) + 'px">' +
    '<svg viewBox="0 0 ' + ((r+sw)*2) + ' ' + ((r+sw)*2) + '" aria-hidden="true">' +
      '<circle class="ring-track" cx="' + (r+sw) + '" cy="' + (r+sw) + '" r="' + r +
        '" stroke-width="' + sw + '" fill="none"/>' +
      /* The markup carries the finished arc, not an empty one. The motion
         engine animates from zero on first paint; nothing that fails to run
         JS, and no print pass, may show a ring that reads 72% and draws 0%. */
      '<circle class="ring-value" cx="' + (r+sw) + '" cy="' + (r+sw) + '" r="' + r +
        '" stroke-width="' + sw + '" fill="none" stroke-dasharray="' + c.toFixed(2) +
        '" stroke-dashoffset="' + (c * (1 - pct/100)).toFixed(2) +
        '" data-ring="' + (pct/100) + '"' + rk + '/>' +
    '</svg>' +
    '<span class="ring-t num">' + pct + '<small>%</small></span>' +
    '<span class="sr-only">' + esc((opts.label || '') + ': ' + pct + '%') + '</span>' +
    '</div>';
}

/* ============================================================================
   Exercise Anatomical & Kinematic Vector Media
   100% offline, deterministic SVG driven by each exercise's real muscle
   contributions (ex.m) and movement pattern (ex.pat).
   ========================================================================== */
function exerciseFigureSideSvg(ex, side){
  if(!ex) return '';
  const weights = {};
  (ex.m || []).forEach(([m, w], idx) => { weights[m] = { w: w, primary: idx === 0 }; });
  let s = '<svg viewBox="' + FIG.view + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">';
  /* The head is part of the silhouette now, not an ellipse on top of it: a
     separate head left a seam at the throat where the two edges met. */
  FIG.outline.forEach(d => { s += '<path class="fig-outline" d="' + d + '"/>'; });
  (SIDE_MUSCLES[side] || []).forEach(m => {
    const info = weights[m];
    if(!info) return;
    const col = info.primary ? token('burnt','#D66A3A') : token('warn','#8A5E12');
    const op  = info.primary ? '0.88' : Math.min(0.65, 0.28 + info.w).toFixed(2);
    (FIG.regions[side][m] || []).forEach(d => {
      s += '<path d="' + d + '" fill="' + col + '" fill-opacity="' + op +
           '" stroke="' + token('ink','#20211F') + '" stroke-width="' + (info.primary ? '1.3' : '0.7') + '"/>';
    });
  });
  s += '</svg>';
  return s;
}

function exerciseThumbSvg(ex){
  if(!ex || !ex.m || !ex.m.length) return '';
  const prime = ex.m[0][0];
  const side = FIG.regions.front[prime] ? 'front' : 'back';
  return '<span class="ex-thumb" aria-hidden="true">' + exerciseFigureSideSvg(ex, side) + '</span>';
}

/* Movement patterns, drawn once, in one grammar.
   ---------------------------------------------------------------------
   These eleven diagrams were four different drawing styles: stroke widths from
   1.6 to 3, round caps on some and not others, heads as circles of two sizes,
   and 47 hardcoded hex colours that no theme could reach. They now share one
   rule, and it is the mark's rule:

     body    ink, 3.2, square caps, straight segments only
     joint   a 3.2 solid square
     head    an 11 solid square — mass, never a circle
     load    a bar with two plates
     force   one burnt arrow: the direction the load is driven
     range   a dashed burnt arc and a dot at the joint doing the work
     ground  a hairline, only under a supported body

   Colour comes from classes (.k-i, .k-b, .k-r) defined in the stylesheet, so
   the drawings finally follow the palette like everything else. */
const INK = 'k-i', BURNT = 'k-b', RULE = 'k-r';   /* classes, not hexes */
const seg = (x1, y1, x2, y2) =>
  `<path class="${INK}" d="M${x1} ${y1}L${x2} ${y2}" stroke-width="3.2"/>`;
/* Small, solid, square. Four of these and a head should never be confused:
   the head is 11, a joint is 3.2. */
const joint = (x, y, s) => {
  s = s || 3.2;
  return `<rect class="${INK}" x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s}" height="${s}"/>`;
};
const head = (x, y) =>
  `<rect class="${INK}" x="${x - 5.5}" y="${y - 5.5}" width="11" height="11"/>`;
const ground = (y, x1, x2) =>
  `<path class="${RULE}" d="M${x1 === undefined ? 14 : x1} ${y}L${x2 === undefined ? 126 : x2} ${y}" stroke-width="1.6"/>`;
const force = (x1, y1, x2, y2) => {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 7;
  const p1 = [x2 - L * Math.cos(a - 0.42), y2 - L * Math.sin(a - 0.42)];
  const p2 = [x2 - L * Math.cos(a + 0.42), y2 - L * Math.sin(a + 0.42)];
  return `<path class="${BURNT}" d="M${x1} ${y1}L${x2} ${y2}" stroke-width="2.4"/>` +
         `<path class="${BURNT}" d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${x2} ${y2}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" stroke-width="2.4"/>`;
};
const bar = (x, y, w) =>
  `<path class="${INK}" d="M${x - w / 2} ${y}L${x + w / 2} ${y}" stroke-width="2.4"/>` +
  `<rect class="${INK}" x="${x - w / 2 - 4}" y="${y - 6.5}" width="5" height="13"/>` +
  `<rect class="${INK}" x="${x + w / 2 - 1}" y="${y - 6.5}" width="5" height="13"/>`;
const arc = (cx, cy, r, a0, a1) => {
  const p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const s = p(a0), e = p(a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `<path class="${BURNT}" d="M${s[0].toFixed(1)} ${s[1].toFixed(1)}A${r} ${r} 0 ${large} ${sweep} ${e[0].toFixed(1)} ${e[1].toFixed(1)}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
};
const hot = (x, y) => `<circle class="${BURNT}" cx="${x}" cy="${y}" r="2.6"/>`;

const KIN = {};

/* Horizontal push, lying: a bench, a body on it, the bar above the hands. */
KIN.pushH =
  ground(88, 16, 124) +
  seg(24, 70, 104, 70) +                      /* the bench */
  seg(34, 70, 34, 86) + seg(94, 70, 94, 86) + /* its legs */
  seg(56, 64, 92, 64) +                       /* the torso, lying */
  head(46, 62) +
  joint(56, 64) + joint(92, 64) +
  seg(92, 64, 104, 68) + joint(104, 68) +     /* legs to the floor */
  seg(104, 68, 108, 86) +
  seg(56, 64, 56, 44) + joint(56, 44) +       /* upper arm */
  seg(56, 44, 76, 40) + joint(76, 40) +       /* forearm */
  bar(76, 34, 34) +                           /* the bar */
  force(120, 64, 120, 26) +
  hot(56, 44);

/* Vertical push: standing, pressing overhead. */
KIN.pushV =
  ground(88) +
  head(70, 14) + seg(70, 24, 70, 60) + joint(70, 60) +
  seg(70, 60, 58, 74) + joint(58, 74) + seg(58, 74, 56, 88) +
  seg(70, 60, 82, 74) + joint(82, 74) + seg(82, 74, 84, 88) +
  seg(70, 34, 46, 30) + joint(46, 30) +       /* upper arm, out and up */
  seg(46, 30, 44, 14) + joint(44, 14) +       /* forearm, vertical */
  seg(70, 34, 94, 30) + joint(94, 30) +
  seg(94, 30, 96, 14) + joint(96, 14) +
  bar(70, 8, 48) +
  force(122, 66, 122, 26) +
  hot(44, 14);

/* Horizontal pull: folded over the bar, pulling it to the ribs. */
KIN.pullH =
  ground(88) +
  head(84, 30) +
  seg(84, 42, 52, 56) +                       /* the back, folded */
  joint(84, 42) + joint(52, 56) +
  seg(52, 56, 46, 72) + joint(46, 72) + seg(46, 72, 44, 88) +
  seg(52, 56, 62, 72) + joint(62, 72) + seg(62, 72, 66, 88) +
  seg(84, 42, 78, 58) + joint(78, 58) +       /* arm from the shoulder */
  seg(78, 58, 66, 52) + joint(66, 52) +       /* forearm pulled to the ribs */
  bar(64, 48, 26) +
  force(126, 48, 92, 48) +
  hot(78, 58);

/* Vertical pull: hanging, pulling the bar down to the chest. */
KIN.pullV =
  seg(26, 8, 114, 8) +                        /* the frame */
  bar(70, 14, 44) +
  head(70, 38) +
  seg(70, 48, 70, 62) + joint(70, 62) +       /* torso */
  seg(70, 62, 58, 78) + joint(58, 78) + seg(58, 78, 56, 88) +
  seg(70, 62, 82, 78) + joint(82, 78) + seg(82, 78, 84, 88) +
  seg(70, 46, 50, 26) + joint(50, 26) +       /* arm up and out */
  seg(50, 26, 54, 18) + joint(54, 18) +
  seg(70, 46, 90, 26) + joint(90, 26) +
  seg(90, 26, 86, 18) + joint(86, 18) +
  force(120, 22, 120, 58) +
  hot(50, 26);

/* Squat: the bar across the shoulders, the hips travelling down and back. */
KIN.squat =
  ground(88) +
  head(56, 20) + seg(56, 30, 54, 54) + joint(54, 54) +
  bar(54, 34, 46) +                           /* across the shoulders */
  seg(54, 54, 70, 68) + joint(70, 68) +       /* thigh, down and forward */
  seg(70, 68, 62, 86) +                       /* shin, back to the floor */
  seg(54, 54, 62, 68) + joint(62, 68) +
  seg(62, 68, 54, 86) +
  arc(70, 68, 24, -2.4, -1.0) +
  hot(70, 68) +
  force(116, 66, 116, 30);

/* Hinge: a straight back folding at the hip, the bar hanging from the hands. */
KIN.hinge =
  ground(88) +
  head(92, 34) +
  seg(92, 44, 58, 54) +                       /* a straight back */
  joint(92, 44) + joint(58, 54) +
  seg(58, 54, 52, 70) + joint(52, 70) + seg(52, 70, 48, 88) +
  seg(58, 54, 68, 70) + joint(68, 70) + seg(68, 70, 74, 88) +
  seg(92, 44, 88, 60) + joint(88, 60) +       /* both arms hanging */
  seg(88, 60, 88, 74) +
  bar(88, 78, 30) +
  arc(58, 54, 20, 1.9, 3.3) +
  hot(58, 54);

/* Elbow flexion: the forearm travels up around the elbow. */
KIN.curl =
  ground(88) +
  head(52, 16) + seg(52, 26, 52, 58) + joint(52, 58) +
  seg(52, 58, 44, 72) + joint(44, 72) + seg(44, 72, 42, 88) +
  seg(52, 58, 62, 72) + joint(62, 72) + seg(62, 72, 66, 88) +
  seg(52, 32, 52, 54) + joint(52, 54) +       /* upper arm, at the side */
  seg(52, 54, 74, 64) + joint(74, 64) +       /* forearm, down */
  bar(78, 68, 26) +
  arc(52, 54, 26, 0.35, -0.95) +
  hot(52, 54);

/* Elbow extension: the forearm travelling out. */
KIN.extend =
  ground(84) +
  head(52, 16) + seg(52, 24, 52, 56) + joint(52, 56) +
  seg(52, 56, 44, 80) + seg(52, 56, 60, 80) +
  seg(52, 34, 52, 54) + joint(52, 54) +
  seg(52, 54, 78, 62) + joint(78, 62) +
  seg(78, 62, 96, 50) + joint(96, 50) +       /* forearm extended */
  bar(96, 46, 20) +
  arc(78, 62, 22, -0.9, 0.2) +
  hot(78, 62);

/* Plantar flexion: the heel raised, the whole body on the ball of the foot. */
KIN.calf =
  ground(88) +
  head(64, 14) + seg(64, 24, 64, 56) + joint(64, 56) +
  seg(64, 56, 62, 70) + joint(62, 70) +
  seg(62, 70, 60, 80) + joint(60, 80) +       /* shin to the ankle */
  seg(60, 80, 80, 84) +                       /* the foot, heel high */
  seg(64, 56, 74, 70) + joint(74, 70) +
  seg(74, 70, 72, 80) +
  arc(60, 80, 18, -1.5, -0.2) +
  hot(60, 80);

/* Trunk: the plank, held. */
KIN.core =
  ground(84) +
  head(28, 52) + seg(34, 54, 92, 70) + joint(92, 70) +
  seg(32, 56, 30, 78) + joint(30, 78) +       /* the support arm */
  seg(30, 78, 42, 86) +
  seg(92, 70, 76, 84) +                       /* the leg */
  seg(92, 70, 104, 80) +
  force(62, 44, 62, 62) +
  hot(62, 58);

/* Locomotion: stride, with the direction of travel. */
KIN.cardio =
  ground(84, 20, 122) +
  head(58, 26) + seg(58, 34, 54, 56) + joint(54, 56) +
  seg(54, 56, 34, 78) + joint(34, 78) + seg(34, 78, 30, 84) +
  seg(54, 56, 72, 72) + joint(72, 72) + seg(72, 72, 78, 84) +
  seg(58, 36, 44, 46) + seg(58, 36, 74, 40) +
  force(88, 46, 118, 46) +
  hot(54, 56);

function patternKinematicSvg(ex){
  const pat = (ex && ex.pat) || 'pushH';
  const body = KIN[pat] || KIN.pushH;
  return '<svg viewBox="0 0 140 94" role="img" aria-label="' + esc(t('pat.' + pat)) + '">' +
         body + '</svg>';
}

function exerciseVisualSvg(ex){
  if(!ex) return '';
  return '<div class="ex-vis">' +
    '<div class="ex-vis-figs">' +
      '<div>' + exerciseFigureSideSvg(ex, 'front') + '<span class="dash-fig-cap">' + esc(t('body.front')) + '</span></div>' +
      '<div>' + exerciseFigureSideSvg(ex, 'back')  + '<span class="dash-fig-cap">' + esc(t('body.back'))  + '</span></div>' +
    '</div>' +
    '<div class="ex-vis-kin">' +
      '<p class="eyebrow mb-1">' + esc(t('pat.' + ex.pat)) + '</p>' +
      patternKinematicSvg(ex) +
      '<div class="legend mt-1" style="gap:8px">' +
        '<div><i class="sw direct"></i>' + esc(t('lab.primary')) + '</div>' +
        '<div><i class="sw indirect"></i>' + esc(t('vol.indirect')) + '</div>' +
      '</div>' +
      '<p class="hint mt-1" style="font-size:11px">' + esc(t('exd.diagramNote')) + '</p>' +
    '</div>' +
  '</div>';
}

