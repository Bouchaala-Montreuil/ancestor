#!/usr/bin/env bash
# ============================================================================
# ANCESTOR — build the display font
#
# Barlow Condensed, SIL Open Font License 1.1, by Jeremy Tribby.
# https://github.com/jpt/barlow
#
# Why this face: it is a sign-painting grotesque with squarish terminals and
# flat sides. At 104 px uppercase it reads as an instrument panel; at 15 px it
# still reads. It has the width the display role needs without the poster
# mannerisms Oswald picked up from being over-used.
#
# Why subset: the full latin files are 22 KB each. This cuts them to 12 KB by
# dropping everything the app cannot print — including Cyrillic, Vietnamese and
# the 200+ glyphs of Latin Extended-B. Two weights, 24 KB total, base64 into
# the stylesheet at 32 KB. An app that already ships 2 MB of 3D atlas can carry
# 32 KB to look like itself on a phone that has never heard of Arial Narrow.
#
# Output: app/fonts/*.woff2  (source of truth for the base64 block in app.css)
#
# Requires: pip install fonttools brotli
# ============================================================================
set -euo pipefail

VERSION="5.3.0"
WEIGHTS=(500 700)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/app/fonts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
cd "$TMP"
npm pack "@fontsource/barlow-condensed@${VERSION}" --silent >/dev/null
tar xzf "fontsource-barlow-condensed-${VERSION}.tgz"

# Latin + Latin-1 + Latin Extended-A covers en fr es de it nl (é è ê ë à â ç
# ü ö ä ß ñ í ó ú). Beyond ASCII the app also prints: en/em dash, curly quotes,
# ellipsis, middot, times, degree, arrows, guillemets, euro, minus.
UNICODES="U+0020-007E,U+00A0-00FF,U+0100-017F,U+2013,U+2014,U+2018-201D,U+2026,U+00B7,U+00D7,U+00B0,U+2190-2193,U+2039,U+203A,U+20AC,U+2248,U+2212"

for w in "${WEIGHTS[@]}"; do
  pyftsubset "package/files/barlow-condensed-latin-${w}-normal.woff2" \
    --output-file="$OUT/barlow-condensed-${w}.woff2" \
    --flavor=woff2 \
    --layout-features='kern,liga,calt,tnum,lnum,onum,case' \
    --unicodes="$UNICODES" \
    --desubroutinize --no-hinting
  printf '  app/fonts/barlow-condensed-%s.woff2  %s bytes\n' "$w" "$(stat -c%s "$OUT/barlow-condensed-$w.woff2")"
done

# The licence has to travel with the subset, not just with the download.
cp package/LICENSE "$OUT/OFL.txt"
printf '\n  %s\n' "wrote $OUT/OFL.txt"
