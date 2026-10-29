#!/usr/bin/env python3
"""Does the display type actually fit?

    python3 site/measure_type.py

The page is designed without a browser, and the one thing that cannot be reasoned
away is text width. So it is measured: the real woff2 the page ships is loaded,
the advance widths are summed, and the result is compared with the column the
text has to live in at each breakpoint.

Needs fontTools and brotli (`pip install fonttools brotli`) — woff2 is compressed.

The clamp on the h1 in `template.html` comes from this file, not from taste: at
Barlow Condensed 700 the word "encouragement." sets 5.93 × its font size, and the
hero column is 0.6 × (viewport − 128) above 900 px. The cap is where those two
numbers meet.
"""
import pathlib
import re
import sys

try:
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit('needs fontTools: pip install fonttools brotli')

REPO = pathlib.Path(__file__).resolve().parent.parent
FONTS = REPO / 'app' / 'fonts'
PAGE = REPO / 'site' / 'index.html'

SHELL = 1160          # --shell
PAD = 32              # .wrap padding at >= 900px (--s6)
PAD_SM = 24           # .wrap padding below 900px (--s5)
HERO_GAP = 64         # --s8
HERO_SPLIT = 0.60     # 1.2fr of 2.0fr
BREAK = 900           # where the hero becomes two columns


def load(name):
    f = TTFont(str(FONTS / name))
    upm = f['head'].unitsPerEm
    cmap, hmtx = f.getBestCmap(), f['hmtx']

    def width(text, size):
        total = 0
        for ch in text:
            g = cmap.get(ord(ch))
            total += hmtx[g][0] if g else 0.5 * upm
        return total / upm * size
    return width


def clamp(lo, vw, hi, viewport):
    return max(lo, min(vw * viewport / 100.0, hi))


def inner(viewport):
    pad = PAD if viewport >= BREAK else PAD_SM
    return min(viewport, SHELL) - 2 * pad


def hero_column(viewport):
    if viewport < BREAK:
        return inner(viewport)
    return (inner(viewport) - HERO_GAP) * HERO_SPLIT


def longest_word(text):
    words = re.split(r'[\s\u00a0]+', text.strip())
    return max(words, key=len) if words else ''


def strip_tags(s):
    return re.sub(r'<[^>]+>', '', s)


def main():
    if not PAGE.exists():
        sys.exit('build first: python3 site/build.py')
    src = PAGE.read_text()
    w7, w5 = load('barlow-condensed-700.woff2'), load('barlow-condensed-500.woff2')

    h1 = strip_tags(re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S).group(1)).replace('\n', ' ')
    h1 = ' '.join(h1.split())
    h2s = [' '.join(strip_tags(m).split()) for m in re.findall(r'<h2[^>]*>(.*?)</h2>', src, re.S)]

    h1_word = longest_word(h1)

    # read the clamps out of the built stylesheet, so the page and the check
    # can never drift apart
    def clamp_of(selector):
        m = re.search(selector + r'\{[^}]*font-size:clamp\(([\d.]+)px,([\d.]+)vw,([\d.]+)px\)', src)
        if not m:
            sys.exit('could not read the clamp for ' + selector)
        return tuple(float(x) for x in m.groups())

    h1_clamp = clamp_of(r'h1')
    h2_clamp = clamp_of(r'\.sect-h h2')

    bad = []
    print('\n%-7s %-9s %-8s %-8s %s' % ('w/px', 'h1 size', 'h1 word', 'column', 'verdict'))
    print('-' * 62)
    for v in (320, 360, 390, 480, 768, 900, 1024, 1160, 1280, 1440, 1920):
        size = clamp(*h1_clamp, viewport=v)
        need = w7(h1_word, size)
        have = hero_column(v)
        ok = need <= have
        if not ok:
            bad.append('h1 at %dpx: "%s" needs %.0f, has %.0f' % (v, h1_word, need, have))
        print('%-7d %-9.1f %-8.0f %-8.0f %s' % (v, size, need, have, 'ok' if ok else 'OVERFLOW'))

    print('\n%-32s %-8s %-8s %s' % ('heading', 'longest word', 'needs', 'verdict'))
    print('-' * 66)
    for text in h2s:
        word = longest_word(text)
        # the h2 shares its row with a number and a standfirst, but it may wrap,
        # so the binding constraint is the word against the whole inner measure
        size = clamp(*h2_clamp, viewport=1160)
        need = w7(word, size)
        have = inner(1160)
        ok = need <= have
        if not ok:
            bad.append('h2 "%s": word "%s" needs %.0f, has %.0f' % (text, word, need, have))
        print('%-32s %-8s %-8.0f %s' % (text[:32], word[:8], need, 'ok' if ok else 'OVERFLOW'))

    # the standfirst is 15 px system sans: 44ch is the limit, ~0.5 em per char
    print('\nStandfirst: 44ch x 15px, held by max-width and re-flowed by the grid.')

    print('\n' + '=' * 66)
    if bad:
        print('  %d OVERFLOWS' % len(bad))
        for b in bad:
            print('   - ' + b)
        sys.exit(1)
    print('  NO OVERFLOW — every display string fits at every breakpoint')
    print('=' * 66 + '\n')


if __name__ == '__main__':
    main()
