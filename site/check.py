#!/usr/bin/env python3
"""Checks for the landing page.

    python3 site/check.py

There is no browser in this environment, so the page is verified the way the
rest of the project is: structurally, numerically, and against the rules the
design claims. What this cannot check is how it looks — see site/README.md.
"""
import html.parser
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
PAGE = ROOT / 'index.html'

PALETTE = {
    '#20211F': 'charcoal', '#F1EBDD': 'ivory', '#D66A3A': 'burnt',
    '#77796F': 'technical', '#C8C0B2': 'line', '#FCF9F2': 'surface',
    '#E7E0CF': 'recess', '#3F4139': 'ink-2', '#5B5D54': 'ink-3',
    '#636559': 'tech-ink', '#A8461F': 'burnt-text', '#46603F': 'ok',
    '#8A5E12': 'warn', '#963F28': 'alert', '#1A0B08': 'burnt ink',
    '#1A1B19': 'band plate', '#3A3B36': 'band rule', '#4A4B44': 'band hairline',
    '#C9C3B4': 'band body', '#A9A395': 'band annotation', '#1A0E08': 'on burnt',
}

fails, passes = [], 0


def chk(name, cond, note=''):
    global passes
    if cond:
        passes += 1
        print('  PASS  ' + name + ('  ' + note if note else ''))
    else:
        fails.append(name)
        print('  FAIL  ' + name + ('  -> ' + note if note else ''))


def lum(hexv):
    h = hexv.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = f(r), f(g), f(b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


class Doc(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.headings, self.links, self.ids, self.tags = [], [], [], []
        self.svg_attrs, self.figcaps, self.figures = [], 0, 0
        self._in_svg = 0

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): v for k, v in attrs}
        self.tags.append(tag)
        if 'id' in a:
            self.ids.append(a['id'])
        if tag in ('h1', 'h2', 'h3', 'h4'):
            self.headings.append((tag, a))
        if tag == 'a' and 'href' in a:
            self.links.append(a['href'])
        if tag == 'svg':
            self._in_svg += 1
            self.svg_attrs.append(a)
        if tag == 'figure':
            self.figures += 1
        if tag == 'figcaption':
            self.figcaps += 1

    def handle_endtag(self, tag):
        if tag == 'svg' and self._in_svg:
            self._in_svg -= 1


def main():
    src = PAGE.read_text()
    # regex work happens on a copy with the data URIs collapsed: an 87 KB page
    # is mostly two fonts, and backtracking through base64 is slow and pointless
    scan = re.sub(r'base64,[A-Za-z0-9+/=]+', 'base64,...', src)
    # CSS questions are asked of the <style> block only
    css = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
    doc = Doc()
    doc.feed(src)

    print('\n1. The page is one file and asks for nothing')
    chk('built page exists', PAGE.exists(), '%.1f KB' % (len(src.encode()) / 1024))
    chk('no remote reference of any kind',
        not re.search(r'(?:src|href)\s*=\s*["\'](?:https?:)?//', scan))
    chk('no @import and no url() pointing at a file',
        '@import' not in src and
        not re.search(r'url\((?!["\']?data:|#|%23)[^)]+\)', css))
    chk('both weights are embedded as data URIs',
        src.count('data:font/woff2;base64,') == 2)
    chk('every figure is inline — no <img> and no photograph anywhere', '<img' not in src)
    chk('still a single file worth downloading', len(src.encode()) < 220 * 1024,
        '%.1f KB' % (len(src.encode()) / 1024))

    print('\n2. Structure')
    chk('one h1', [h for h in doc.headings if h[0] == 'h1'].__len__() == 1)
    levels = [int(t[1]) for t, _ in doc.headings]
    chk('heading levels never skip', all(b - a <= 1 for a, b in zip(levels, levels[1:])),
        ' '.join(map(str, levels)))
    chk('every internal link has a target',
        all(l[1:] in doc.ids for l in doc.links if l.startswith('#') and len(l) > 1),
        ', '.join(l for l in doc.links if l.startswith('#')))
    chk('ids are unique', len(doc.ids) == len(set(doc.ids)))
    chk('a skip link exists', 'class="skip"' in src)
    chk('the document declares a language', 'lang="en"' in src)
    chk('every svg declares a viewBox and a role',
        all('viewbox' in a for a in doc.svg_attrs) and
        all(('role' in a or 'aria-hidden' in a) for a in doc.svg_attrs),
        '%d svgs' % len(doc.svg_attrs))
    chk('every figure is captioned', doc.figures > 0 and doc.figcaps >= doc.figures,
        '%d figures / %d captions' % (doc.figures, doc.figcaps))

    print('\n3. Files the page links to exist')
    for href in sorted(set(doc.links)):
        if href.startswith('#') or href.startswith('data:'):
            continue
        target = (ROOT / href).resolve()
        chk('link resolves: ' + href, target.exists(), str(target.relative_to(ROOT.parent)))

    print('\n4. Colour')
    hexes = set(h.upper() for h in re.findall(r'#[0-9a-fA-F]{6}\b', scan))
    unknown = sorted(h for h in hexes if h not in {k.upper() for k in PALETTE})
    chk('no colour outside the five tokens and their named variants',
        not unknown, ', '.join(unknown))
    chk('no gradients, no blur, no glass',
        'gradient' not in css and 'backdrop-filter' not in css and 'blur(' not in css)
    # Raw burnt (#D66A3A) is 2.95:1 on paper: it may only carry text on the
    # charcoal band, where it is 4.61:1.
    text_burnt = set(
        ' '.join(sel.split()) for sel in
        re.findall(r'([^{}]+)\{[^}]*?(?<![-\w])color\s*:\s*var\(--burnt\)', css)
    )
    known = {'.band .sect-h .n', '.claim .k'}
    chk('raw burnt never carries text on paper', text_burnt <= known,
        ', '.join(sorted(text_burnt - known)))

    pairs = [
        ('#20211F', '#F1EBDD', 'body text on paper', 4.5),
        ('#3F4139', '#F1EBDD', 'secondary text on paper', 4.5),
        ('#5B5D54', '#F1EBDD', 'tertiary text on paper', 4.5),
        ('#636559', '#F1EBDD', 'mono annotation on paper', 4.5),
        ('#A8461F', '#F1EBDD', 'accent text on paper', 4.5),
        ('#F1EBDD', '#20211F', 'text on the ink band', 4.5),
        ('#C9C3B4', '#20211F', 'band body text', 4.5),
        ('#A9A395', '#20211F', 'band annotation', 4.5),
        ('#D66A3A', '#20211F', 'burnt on charcoal', 4.5),
        ('#20211F', '#FCF9F2', 'text on a plate', 4.5),
        ('#A8461F', '#FCF9F2', 'accent on a plate', 4.5),
        ('#20211F', '#E7E0CF', 'footer text', 4.5),
        ('#5B5D54', '#E7E0CF', 'footer secondary text', 4.5),
        ('#636559', '#E7E0CF', 'footer fine print and links', 4.5),
        ('#636559', '#FCF9F2', 'mono annotation on a plate', 4.5),
        ('#5B5D54', '#FCF9F2', 'notes label on a plate', 4.5),
        ('#20211F', '#E7E0CF', 'footer wordmark', 4.5),
        ('#D66A3A', '#FCF9F2', 'burnt graphic on a plate (not text)', 3.0),
        ('#1A0E08', '#D66A3A', 'hover label on the burnt button', 4.5),
    ]
    for fg, bg, name, need in pairs:
        c = contrast(fg, bg)
        chk('%s (%s on %s) %.2f:1' % (name, fg, bg, c), c >= need, '>= %.1f' % need)

    print('\n5. Layout lives in the stylesheet')
    inline = re.findall(r'style="([^"]*)"', scan)
    layout = [x for x in inline
              if not x.startswith('animation-delay')
              and not x.startswith('background:#')]
    chk('no inline layout or type in the copy', not layout, '; '.join(layout[:3]))
    chk('the only inline styles are data (chart delays, swatch colours)',
        all(x.startswith('animation-delay') or re.fullmatch(r'background:#[0-9A-Fa-f]{6}', x)
            for x in inline),
        '%d inline styles' % len(inline))

    print('\n6. Type')
    chk('display face is Barlow Condensed, both weights',
        src.count('font-family:"Barlow Condensed"') >= 2)
    chk('display sizes use a tight line-height, never 1.5',
        bool(re.search(r'h1\{[^}]*line-height:\.8\d', css)) and
        bool(re.search(r'\.sect-h h2\{[^}]*line-height:\.9\d', css)) and
        not re.search(r'(?<![\w-])h1\{[^}]*line-height:1\.[4-9]', css))
    chk('the page scales type with the viewport, not fixed px alone',
        css.count('clamp(') >= 6, '%d clamps' % css.count('clamp('))
    chk('monospace carries the annotation',
        '--f-mono' in css and css.count('var(--f-mono)') >= 10)
    chk('nothing below 9 px is set', not re.search(r'font-size:\s*[0-8](\.\d+)?px', css))

    print('\n7. Motion')
    chk('motion is opt-in, behind prefers-reduced-motion:no-preference',
        'prefers-reduced-motion:no-preference' in src)
    chk('nothing animates in a loop',
        'infinite' not in css and 'animation-iteration-count' not in css)
    chk('the un-animated chart is still drawn',
        not re.search(r'\.chart-path\{[^}]*stroke-dashoffset', css))

    print('\n8. The numbers on the page are the numbers in the code')
    app = (ROOT.parent / 'app')
    ex = (app / 'js/data/exercises.js').read_text()
    n_ex = len(re.findall(r"\{id:'", ex))
    chk('68 exercises', n_ex == 68, str(n_ex))

    les = (app / 'js/data/lessons.js').read_text()
    body = les[les.index('const LESSONS = ['):]
    n_les = len(re.findall(r"\n\{\n  id:'", body))
    chk('11 lessons', n_les == 11, str(n_les))

    ev = (app / 'js/data/evidence.js').read_text()
    # the records are JSON, so every key is quoted
    n_ev = len(re.findall(r'"identifierVerified":', ev))
    chk('14 evidence records', n_ev == 14, str(n_ev))

    langs = (app / 'js/i18n/ui.js').read_text()
    m = re.search(r"const LANGS = \[([^\]]+)\]", langs)
    n_lang = len(re.findall(r"'", m.group(1))) // 2 if m else 0
    chk('7 languages, one of them RTL', n_lang == 7 and "RTL_LANGS" in
        (app / 'js/i18n/locale.js').read_text(), str(n_lang))

    rel = app / 'release/ancestor.html'
    size_mb = rel.stat().st_size / (1024 * 1024) if rel.exists() else 0
    chk('the single file is about 2.1 MB', 1.9 <= size_mb <= 2.3, '%.2f MB' % size_mb)
    chk('the single file asks for nothing',
        not re.search(r'(?:src|href)\s*=\s*["\']https?:', rel.read_text())
        if rel.exists() else False)

    print('\n' + '=' * 60)
    if fails:
        print('  %d FAILED, %d passed' % (len(fails), passes))
        for f in fails:
            print('   - ' + f)
        sys.exit(1)
    print('  ALL %d SITE CHECKS PASSED' % passes)
    print('=' * 60 + '\n')


if __name__ == '__main__':
    main()
