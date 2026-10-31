#!/usr/bin/env bash
# Chromium for the real-browser suites, installed outside the repository.
# The default package and its transitive dependencies are pinned by
# tools/chromium-deps/package-lock.json. The browser is decompressed into a
# lock-specific directory so a previous /tmp/chromium cannot silently win.
#
#   source tools/chromium.sh
#   npm run test:browser
#
# CR_ROOT selects the temporary working directory. CR_PKG can opt into a
# different Chromium package, but that custom choice is not covered by the
# checked-in lock and is not the browser used for the documented release gate.

set -euo pipefail

CR_TOOLS_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CR_BASE="${CR_ROOT:-/tmp/ancestor-chromium}"
mkdir -p "$CR_BASE"
CR_BASE="$(cd -- "$CR_BASE" && pwd -P)"
CR_LOCK_DIR="$CR_TOOLS_DIR/chromium-deps"
CR_LOCKED_SPEC="$(node -p "'@sparticuz/chromium@'+require(process.argv[1]).dependencies['@sparticuz/chromium']" "$CR_LOCK_DIR/package.json")"
CR_SELECTED_PKG="${CR_PKG:-$CR_LOCKED_SPEC}"

# Node is already required by the helper; avoid platform-specific sha256sum.
cr_hash_file() { node -e 'const c=require("crypto"),f=require("fs");process.stdout.write(c.createHash("sha256").update(f.readFileSync(process.argv[1])).digest("hex"))' "$1"; }
cr_hash_text() { node -e 'process.stdout.write(require("crypto").createHash("sha256").update(process.argv[1]).digest("hex"))' "$1"; }

if [ "$CR_SELECTED_PKG" = "$CR_LOCKED_SPEC" ]; then
  CR_DIR="$CR_BASE/locked"
  CR_LOCK_ID="$(cr_hash_file "$CR_LOCK_DIR/package-lock.json")"
  mkdir -p "$CR_DIR"
  if [ ! -f "$CR_DIR/node_modules/@sparticuz/chromium/package.json" ] ||
     [ "$(cat "$CR_DIR/.ancestor-lock-id" 2>/dev/null || true)" != "$CR_LOCK_ID" ]; then
    echo "installing locked $CR_SELECTED_PKG from the npm registry into $CR_DIR ..." >&2
    cp "$CR_LOCK_DIR/package.json" "$CR_LOCK_DIR/package-lock.json" "$CR_DIR/"
    ( cd "$CR_DIR" && npm ci --ignore-scripts --no-audit --no-fund >/dev/null )
    printf '%s\n' "$CR_LOCK_ID" > "$CR_DIR/.ancestor-lock-id"
  fi
else
  # Preserve the existing override for maintainers testing a different build,
  # while keeping it separate from (and never claiming it is) the pinned one.
  CR_OVERRIDE_ID="$(cr_hash_text "$CR_SELECTED_PKG")"
  CR_OVERRIDE_ID="${CR_OVERRIDE_ID:0:16}"
  CR_DIR="$CR_BASE/custom-$CR_OVERRIDE_ID"
  mkdir -p "$CR_DIR"
  if [ ! -f "$CR_DIR/node_modules/@sparticuz/chromium/package.json" ]; then
    echo "installing custom $CR_SELECTED_PKG (not covered by the release lock) into $CR_DIR ..." >&2
    ( cd "$CR_DIR" && npm init -y >/dev/null 2>&1 && npm install --save-exact --ignore-scripts --no-audit --no-fund "$CR_SELECTED_PKG" >/dev/null )
  fi
  CR_LOCK_ID="$(cr_hash_file "$CR_DIR/package-lock.json")"
fi

# Both the binary and SwiftShader use os.tmpdir(). Give each resolved lock its
# own directory; @sparticuz otherwise reuses any unrelated /tmp/chromium.
CR_RUNTIME="$CR_DIR/runtime-${CR_LOCK_ID:0:16}"
mkdir -p "$CR_RUNTIME"
BIN="$(cd "$CR_DIR" && TMPDIR="$CR_RUNTIME" node -e '
  let m = require("@sparticuz/chromium");
  m = (m && m.default) || m;
  if (m && m.default && typeof m.executablePath !== "function") m = m.default;
  if (!m || typeof m.executablePath !== "function") { console.error("unexpected @sparticuz/chromium export shape"); process.exit(1); }
  m.executablePath().then(p => process.stdout.write(p)).catch(e => { console.error(e.message); process.exit(1); });
')"

# The package contains the Amazon Linux shared libraries used by the browser.
if [ ! -f "$CR_RUNTIME/lib/libnspr4.so" ]; then
  node -e '
    const fs = require("fs"), zlib = require("zlib");
    fs.writeFileSync(process.argv[2], zlib.brotliDecompressSync(fs.readFileSync(process.argv[1])));
  ' "$CR_DIR/node_modules/@sparticuz/chromium/bin/al2023.tar.br" "$CR_RUNTIME/al2023.tar"
  tar -xf "$CR_RUNTIME/al2023.tar" -C "$CR_RUNTIME"
fi

export PUPPETEER_EXECUTABLE_PATH="$BIN"
# Re-sourcing with another package must not leave the previous helper's
# libraries in the search path. Also avoid an empty trailing component, which
# would implicitly add the caller's current directory to that search path.
if [ -n "${ANCESTOR_CHROMIUM_LIB_PREFIX:-}" ]; then
  case "${LD_LIBRARY_PATH:-}" in
    "$ANCESTOR_CHROMIUM_LIB_PREFIX") LD_LIBRARY_PATH='' ;;
    "$ANCESTOR_CHROMIUM_LIB_PREFIX":*) LD_LIBRARY_PATH="${LD_LIBRARY_PATH#"$ANCESTOR_CHROMIUM_LIB_PREFIX":}" ;;
  esac
fi
ANCESTOR_CHROMIUM_LIB_PREFIX="$CR_RUNTIME/lib:$CR_RUNTIME"
export LD_LIBRARY_PATH="$ANCESTOR_CHROMIUM_LIB_PREFIX${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
echo "PUPPETEER_EXECUTABLE_PATH=$PUPPETEER_EXECUTABLE_PATH" >&2
echo "LD_LIBRARY_PATH=$LD_LIBRARY_PATH" >&2
