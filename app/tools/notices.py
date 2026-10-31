#!/usr/bin/env python3
"""Keep offline third-party notices identical in the modular and single-file app.

The canonical upstream licence texts live in assets/ and fonts/. `index.html`
contains a generated, inert template so the same text is available without a
network request, even when the app is opened via file://. Run this script after
changing a notice, or use --check to fail if the embedded copy is stale.
"""
from __future__ import annotations

import argparse
import html
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
START = '<!-- BEGIN GENERATED THIRD-PARTY NOTICES -->'
END = '<!-- END GENERATED THIRD-PARTY NOTICES -->'
SECTIONS = (
    ('THREE.JS — MIT', 'assets/THREE-LICENSE.txt'),
    ('MESHOPTIMIZER DECODER — MIT', 'assets/MESHOPT-LICENSE.txt'),
    ('BARLOW CONDENSED — SIL OPEN FONT LICENSE 1.1', 'fonts/OFL.txt'),
    ('ANATOMY MODEL AND DERIVED FIGURE — CC BY-SA 4.0', 'assets/ANATOMY-RELEASE-ATTRIBUTION.txt'),
)


def notice_text() -> str:
    return '\n\n'.join(
        heading + '\n\n' + (ROOT / path).read_text(encoding='utf-8').strip()
        for heading, path in SECTIONS
    )


def expected_block() -> str:
    # A template is inert, but its text is available to the About disclosure.
    # Escape markup characters so the browser's textContent is the original.
    return (START + '\n<template id="third-party-notices">\n' +
            html.escape(notice_text(), quote=False) +
            '\n</template>\n' + END)


def current_block(document: str) -> str:
    if document.count(START) != 1 or document.count(END) != 1:
        raise ValueError('index.html must contain exactly one generated notices block')
    start, end = document.index(START), document.index(END) + len(END)
    if end <= start:
        raise ValueError('generated notices markers are out of order')
    return document[start:end]


def check_document(document: str) -> None:
    if current_block(document) != expected_block():
        raise ValueError('third-party notices are stale; run python3 tools/notices.py')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='validate without editing')
    parser.add_argument('--index', type=Path, default=ROOT / 'index.html',
                        help='document to check or update (defaults to index.html)')
    args = parser.parse_args()
    try:
        document = args.index.read_text(encoding='utf-8')
        old = current_block(document)
        new = expected_block()
        if args.check:
            check_document(document)
            print('Third-party notices match their canonical files.')
        else:
            args.index.write_text(document.replace(old, new, 1), encoding='utf-8')
            print('Updated third-party notices in ' + str(args.index))
        return 0
    except (OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
