"""Compact only isolated CSS comments in the standalone release.

Source comments stay in css/app.css. Preserve quoted text, escaped characters,
legal/attribution comments, and comments adjacent to tokens. Replace each isolated
comment with an empty comment, retaining its token boundary and surrounding
whitespace without leaving the generated release with trailing whitespace.
"""


import re


LEGAL_COMMENT = re.compile(r"\b(?:copyright|licen[cs]e|licen[cs]ed|attribution|OFL|SPDX)\b", re.IGNORECASE)


def strip_isolated_comments(css: str) -> str:
    out = []
    i, quote = 0, None
    while i < len(css):
        c = css[i]
        if c == '\\' and i + 1 < len(css):
            out.append(css[i:i + 2])
            i += 2
            continue
        if quote:
            out.append(c)
            if c == quote:
                quote = None
            i += 1
            continue
        if c in ('"', "'"):
            quote = c
            out.append(c)
            i += 1
            continue
        if css.startswith('/*', i):
            end = css.find('*/', i + 2)
            if end < 0:
                raise ValueError('unterminated CSS comment')
            end += 2
            before = css[i - 1] if i else ' '
            after = css[end] if end < len(css) else ' '
            if css.startswith('/*!', i) or LEGAL_COMMENT.search(css[i:end]) or not (before.isspace() and after.isspace()):
                out.append(css[i:end])
            else:
                out.append('/**/')
            i = end
            continue
        out.append(c)
        i += 1
    if quote:
        raise ValueError('unterminated CSS string')
    return ''.join(out)
