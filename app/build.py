#!/usr/bin/env python3
"""
ANCESTOR — build script

Produces dist/ancestor.html: one self-contained file with the CSS, all
JavaScript, all six languages and the icons embedded. No server, no network,
no build step on the device.

  python3 build.py

Also verifies the output is genuinely self-contained (no external refs).
"""
import base64
import os
import re
from datetime import date

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
os.makedirs(DIST, exist_ok=True)

# Derived from index.html, in document order. This used to be a hand-kept
# list, which meant a new script could ship in the app and be silently missing
# from the single-file build. The lazy payloads are `type="text/plain"`, so
# they do not match this pattern and stay external until inlined below.
SCRIPTS = re.findall(r'<script src="([^"]+)"></script>',
                     open(os.path.join(ROOT, "index.html"), encoding="utf-8").read())

def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()

css = read("css/app.css")

js_parts = []
for s in SCRIPTS:
    js_parts.append("/* ===== %s ===== */\n%s" % (s, read(s)))
js = "\n\n".join(js_parts)


def data_uri(p, mime):
    full = os.path.join(ROOT, p)
    if not os.path.exists(full):
        return ""
    with open(full, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())


icon192 = data_uri("img/icon-192.png", "image/png")
icon512 = data_uri("img/icon-512.png", "image/png")

# a minimal inline manifest so a file:// copy can still be "installed"
manifest = {
    "name": "ANCESTOR — Recovery Engine",
    "short_name": "Ancestor",
    "start_url": ".",
    "display": "standalone",
    "background_color": "#090909",
    "theme_color": "#090909",
    "icons": [
        {"src": icon192, "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": icon512, "sizes": "512x512", "type": "image/png", "purpose": "any"},
    ],
}
import json
manifest_b64 = base64.b64encode(json.dumps(manifest).encode()).decode()

# ---- assemble from index.html ---------------------------------------------
# The template used to be duplicated here, which let the shipped DOM drift
# away from the source. The bundle is now built from index.html itself, so
# the two can never disagree again.
html = read("index.html")

# stylesheet
# Photographic bands are referenced from the stylesheet as ../img/*.jpg. The
# single file has no asset folder, so each one is inlined as a data URI here.
css = re.sub(r'url\("\.\./img/([\w.-]+\.jpg)"\)',
             lambda m: 'url("' + data_uri("img/" + m.group(1), "image/jpeg") + '")', css)
html = html.replace('<link rel="stylesheet" href="css/app.css">',
                    "<style>\n" + css + "\n</style>")

# scripts, in document order
for src in SCRIPTS:
    tag = '<script src="%s"></script>' % src
    if tag not in html:
        raise SystemExit("index.html is missing " + tag)
    html = html.replace(tag, "<script>/* ===== %s ===== */\n%s\n</script>" % (src, read(src)))

# lazy payloads: inlined as gzip-compressed base64 inside text/plain blocks so
# the browser never parses them until the Anatomy Lab asks for them, and the
# offline HTML file stays ~1.2 MB smaller without losing a single triangle.
def inline_payload(block_id, path, encode):
    global html
    import gzip as _gzip, re as _re
    m = _re.search(r'<script type="text/plain" id="%s" src="[^"]*"></script>' % block_id, html)
    if not m:
        raise SystemExit("index.html is missing the %s payload block" % block_id)
    with open(os.path.join(ROOT, path), "rb") as f:
        raw = f.read()
    # mtime=0: gzip stamps the archive with the time it was made, which made two
    # builds of identical sources differ by a byte in the header every time — and
    # a release artifact that cannot be reproduced is one nobody can diff.
    gz = _gzip.compress(raw, compresslevel=9, mtime=0)
    data = base64.b64encode(gz).decode()
    html = html[:m.start()] + ('<script type="text/plain" id="%s" data-enc="gzip-b64">%s</script>'
                               % (block_id, data)) + html[m.end():]

inline_payload("three-runtime", "js/vendor/three-bundle.js", encode=False)
inline_payload("anatomy-glb", "assets/anatomy-male-mobile.glb", encode=True)

# manifest + icons as data URIs, so a file:// copy is still installable
html = html.replace('<link rel="manifest" href="manifest.webmanifest">',
                    '<link rel="manifest" href="data:application/manifest+json;base64,' + manifest_b64 + '">')
# Every local image reference in the document is replaced with an inline data
# URI, by matching whatever the markup actually says. This keeps the guarantee
# that the single file has no external references, without the build having to
# know in advance which icons the identity happens to use this month.
IMG_MIME = {'.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif'}

def inline_images(doc):
    cache = {}
    def repl(m):
        attr, url = m.group(1), m.group(2)
        if url.startswith('data:') or url.startswith('#') or '://' in url:
            return m.group(0)
        fp = os.path.join(ROOT, url)
        ext = os.path.splitext(url)[1].lower()
        if not os.path.exists(fp) or ext not in IMG_MIME:
            return m.group(0)
        if url not in cache:
            with open(fp, 'rb') as fh:
                cache[url] = 'data:%s;base64,%s' % (IMG_MIME[ext],
                                                    base64.b64encode(fh.read()).decode())
        return '%s="%s"' % (attr, cache[url])
    return re.sub(r'(href|src)="([^"]+)"', repl, doc)

html = inline_images(html)

# no service worker is registered in the single-file build: there is nothing
# off-device to cache. Boot is dispatched manually because the load event has
# already fired by the time this script is parsed.
html = html.replace("document.addEventListener('DOMContentLoaded', boot);",
                    "boot();   // the load event has already fired by now")

# ---------------------------------------------------------------------------
# The policy, finished. index.html ships `script-src 'self'` because it loads
# forty-odd files by URL. This build inlines every one of them, and an inline
# block is not 'self': without permission the browser refuses all of them and
# nothing runs — which is a silent white page, not a security win. So each block
# is hashed and the hashes are written into the same meta tag. The hashes are of
# the exact bytes between the tags, so a change anywhere invalidates one, and
# the build can never ship a policy that does not describe what it wrote.
# The three.js runtime is not a <script> block: it ships gzipped inside a
# text/plain payload and the Lab builds a script element from the decompressed
# text when it opens. That is still an inline script to the browser, so the
# policy has to name it — and because the payload is only ever the bytes of this
# one file, its hash is the hash the browser will compute at runtime.
LAZY_SCRIPTS = ["js/vendor/three-bundle.js"]

def stamp_csp(doc):
    import hashlib as _hashlib
    def sha(text):
        return "'sha256-%s'" % base64.b64encode(_hashlib.sha256(text.encode('utf-8')).digest()).decode()
    hashes = []
    for m in re.finditer(r'<script>([\s\S]*?)</script>', doc):
        hashes.append(sha(m.group(1)))
    for rel in LAZY_SCRIPTS:
        fp = os.path.join(ROOT, rel)
        if os.path.exists(fp):
            with open(fp, 'r', encoding='utf-8') as fh:
                hashes.append(sha(fh.read()))
    if not hashes:
        return doc
    return doc.replace("script-src 'self' 'wasm-unsafe-eval';",
                       "script-src 'self' 'wasm-unsafe-eval' " + " ".join(hashes) + ";", 1)

html = stamp_csp(html)

out = os.path.join(DIST, "ancestor.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)

RELEASE = os.path.join(ROOT, "release")
os.makedirs(RELEASE, exist_ok=True)
with open(os.path.join(RELEASE, "ancestor.html"), "w", encoding="utf-8") as f:
    f.write(html)

# ---- verify the bundle is genuinely self-contained -------------------------
size = os.path.getsize(out)
body = open(out, encoding="utf-8").read()
external = re.findall(r'(?:src|href)\s*=\s*"(?!data:)([^"]+)"', body)
external = [e for e in external if not e.startswith("#") and " +" not in e]

print("Built : %s" % out)
print("Size  : %.0f KB" % (size / 1024))
print("Date  : %s" % date.today().isoformat())
print("Files : %d scripts + stylesheet inlined, CSP stamped" % len(SCRIPTS))
if external:
    print("\n  WARNING — external references found (bundle is NOT self-contained):")
    for e in external:
        print("    - " + e)
else:
    print("Check : self-contained, zero external references, works offline")
