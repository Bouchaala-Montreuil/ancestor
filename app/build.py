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

SCRIPTS = [
    "js/i18n/core.js", "js/i18n/ui.js", "js/i18n/exercises.js", "js/i18n/screens.js",
    "js/i18n/acc.js", "js/i18n/ar.js", "js/i18n/v2.js", "js/i18n/science.js", "js/i18n/science2.js", "js/i18n/ex_modes.js", "js/i18n/modes.js",
    "js/i18n/lesson_bodies_en.js", "js/i18n/lesson_bodies_fr.js",
    "js/i18n/lesson_bodies_es_de.js",
    "js/i18n/lesson_bodies_it_nl_ar.js", "js/i18n/locale.js",
    "js/data/exercises.js", "js/data/ex_meta.js",
    "js/data/ex_logging.js",
    "js/data/anatomy_map.js",
    "js/data/modules.js",
    "js/data/evidence.js", "js/data/lessons.js",
    "js/core/time.js", "js/core/profile.js", "js/core/store.js",
    "js/engine/progression.js", "js/engine/recovery.js",
    "js/engine/readiness.js", "js/engine/program.js", "js/engine/why.js",
    "js/ui/components.js", "js/ui/screens.js", "js/ui/workout.js", "js/ui/motion.js",
    "js/ui/modules.js", "js/ui/science.js",
    "js/ui/anatomy3d.js",
    "js/app.js",
]

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
    "background_color": "#08090A",
    "theme_color": "#08090A",
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
    gz = _gzip.compress(raw, compresslevel=9)
    data = base64.b64encode(gz).decode()
    html = html[:m.start()] + ('<script type="text/plain" id="%s" data-enc="gzip-b64">%s</script>'
                               % (block_id, data)) + html[m.end():]

inline_payload("three-runtime", "js/vendor/three-bundle.js", encode=False)
inline_payload("anatomy-glb", "assets/anatomy-male-mobile.glb", encode=True)

# manifest + icons as data URIs, so a file:// copy is still installable
html = html.replace('<link rel="manifest" href="manifest.webmanifest">',
                    '<link rel="manifest" href="data:application/manifest+json;base64,' + manifest_b64 + '">')
html = html.replace('<link rel="icon" href="img/icon-192.png">', '<link rel="icon" href="' + icon192 + '">')
html = html.replace('<link rel="apple-touch-icon" href="img/icon-192.png">',
                    '<link rel="apple-touch-icon" href="' + icon192 + '">')

# no service worker is registered in the single-file build: there is nothing
# off-device to cache. Boot is dispatched manually because the load event has
# already fired by the time this script is parsed.
html = html.replace("document.addEventListener('DOMContentLoaded', boot);",
                    "boot();   // the load event has already fired by now")

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
print("Files : %d scripts + stylesheet inlined" % len(SCRIPTS))
if external:
    print("\n  WARNING — external references found (bundle is NOT self-contained):")
    for e in external:
        print("    - " + e)
else:
    print("Check : self-contained, zero external references, works offline")
