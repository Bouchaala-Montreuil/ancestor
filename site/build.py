#!/usr/bin/env python3
"""Build the landing page.

    python3 site/build.py        ->  site/index.html

The page ships as one file: the two woff2 weights and every figure are inlined,
so it opens from the filesystem with no server and no requests. The figures are
the app's own drawings, copied out of the running DOM (see site/README.md).
"""
import base64, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
REPO = ROOT.parent

def b64(path):
    return base64.b64encode(pathlib.Path(path).read_bytes()).decode('ascii')

def fig(name):
    p = ROOT / 'figures' / (name + '.svg')
    if not p.exists():
        sys.exit('missing figure: ' + str(p))
    return p.read_text().strip()

FONTS = REPO / 'app' / 'fonts'

def main():
    tpl = (ROOT / 'template.html').read_text()
    mark = fig('mark')
    subs = {
        '@FONT500@': b64(FONTS / 'barlow-condensed-500.woff2'),
        '@FONT700@': b64(FONTS / 'barlow-condensed-700.woff2'),
        '@MARK@': mark,
        '@MARK_LARGE@': mark.replace('<svg ', '<svg width="96" height="96" '),
        '@FIG_PUSH@': fig('push'),
        '@FIG_SQUAT@': fig('squat'),
        '@FIG_BENCH@': fig('hinge'),
        '@FIG_BODY@': fig('body'),
        '@FIG_LINE@': fig('line'),
        '@FIG_PULL@': fig('pull'),
        '@FIG_BARS@': fig('bars'),
        '@KIN_SQUAT@': fig('squat'),
        '@KIN_HINGE@': fig('hinge'),
        '@KIN_PULL@': fig('pull'),
        '@FIG_LINE_BIG@': fig('line'),
    }
    out = tpl
    for k, v in subs.items():
        if k not in out:
            print('  note: token %s unused' % k)
        out = out.replace(k, v)

    left = re.findall(r'@[A-Z0-9_]+@', out)
    if left:
        sys.exit('unreplaced tokens: ' + ', '.join(sorted(set(left))))

    (ROOT / 'index.html').write_text(out)

    # the page must not reach the network
    net = re.findall(r'(?:src|href)="(https?:)?//[^"]+', out)
    if net:
        sys.exit('external reference: ' + ', '.join(net[:3]))

    kb = len(out.encode()) / 1024
    print('  wrote site/index.html  %.1f KB  (%d figures, 2 fonts inlined)' % (kb, len(set(subs.values())) - 2))

if __name__ == '__main__':
    main()
