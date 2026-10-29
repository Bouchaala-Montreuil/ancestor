#!/usr/bin/env bash
# Get a Chromium for `tests/browser.js` from the npm registry alone.
#
# The obvious route — `npx puppeteer browsers install chrome` — pulls from
# Google's CDN, which is blocked in a locked-down sandbox. `@sparticuz/chromium`
# ships the same Chromium, brotli-compressed, inside an npm tarball, plus the
# Amazon Linux 2023 shared libraries it needs (libnspr4, libnss3, libexpat).
# That is enough to run the 93 real-browser checks anywhere npm works.
#
#   source tools/chromium.sh        # sets PUPPETEER_EXECUTABLE_PATH and LD_LIBRARY_PATH
#   node tests/browser.js
#
# Written and verified 2026-10-29; the suite passed 93/93 with it.

set -euo pipefail

CR_ROOT="${CR_ROOT:-/tmp/ancestor-chromium}"
CR_PKG="${CR_PKG:-@sparticuz/chromium@153.0.0}"   # the version this was verified with

mkdir -p "$CR_ROOT"
if [ ! -d "$CR_ROOT/node_modules/@sparticuz/chromium" ]; then
  echo "fetching $CR_PKG from the npm registry into $CR_ROOT ..." >&2
  ( cd "$CR_ROOT" && npm init -y >/dev/null 2>&1 && npm install "$CR_PKG" --no-audit --no-fund >/dev/null 2>&1 )
fi

# 1. the browser binary, decompressed out of chromium.br by the package itself
BIN="$(cd "$CR_ROOT" && node -e '
  /* The package has changed its export shape between majors (153: default is
     the instance; 143: a class under .default), so unwrap defensively rather
     than pinning the caller to one of them. */
  let m = require("@sparticuz/chromium");
  m = (m && m.default) || m;
  if (m && m.default && typeof m.executablePath !== "function") m = m.default;
  if (!m || typeof m.executablePath !== "function") { console.error("unexpected @sparticuz/chromium export shape"); process.exit(1); }
  m.executablePath().then(p => process.stdout.write(p)).catch(e => { console.error(e.message); process.exit(1); });
')"

# 2. the shared libraries it links against, out of al2023.tar.br
LIBS="$CR_ROOT/lib"
if [ ! -f "$LIBS/libnspr4.so" ]; then
  mkdir -p "$LIBS"
  node -e '
    const fs = require("fs"), zlib = require("zlib");
    const src = process.argv[1], out = process.argv[2];
    fs.writeFileSync(out, zlib.brotliDecompressSync(fs.readFileSync(src)));
  ' "$CR_ROOT/node_modules/@sparticuz/chromium/bin/al2023.tar.br" "$CR_ROOT/al2023.tar"
  tar -xf "$CR_ROOT/al2023.tar" -C "$CR_ROOT"
fi

# 3. SwiftShader, which is what makes the WebGL checks mean anything without a GPU
export PUPPETEER_EXECUTABLE_PATH="$BIN"
export LD_LIBRARY_PATH="$CR_ROOT/lib:$CR_ROOT:${LD_LIBRARY_PATH:-}"
echo "PUPPETEER_EXECUTABLE_PATH=$PUPPETEER_EXECUTABLE_PATH" >&2
echo "LD_LIBRARY_PATH=$LD_LIBRARY_PATH" >&2
