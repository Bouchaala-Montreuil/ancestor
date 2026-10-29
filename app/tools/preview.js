#!/usr/bin/env node
/* ============================================================================
   Serve app/ for the live preview.

       node tools/preview.js [port]

   Why not `python3 -m http.server`: it answers HTTP/1.0 and closes the
   connection after every response. Through the preview's HTTPS proxy that can
   leave the browser holding a connection it thinks is still open, which looks
   exactly like "the page never finishes loading". This speaks HTTP/1.1 with
   keep-alive, an exact Content-Length on every response, correct MIME types
   for .webmanifest and .glb, and no caching — so a rebuilt file is never
   served stale from the browser while working.

   It also logs the part python's server does not: method, path, status, Host
   and User-Agent, so when a preview misbehaves there is evidence rather than a
   guess about what the browser asked for.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.ico': 'image/x-icon'
};

const stamp = () => new Date().toISOString().slice(11, 19);

const server = http.createServer((req, res) => {
  const started = Date.now();
  const rel = decodeURIComponent(String(req.url).split('?')[0].split('#')[0])
    .replace(/^\/+/, '') || 'index.html';

  const finish = (status, size, note) => {
    const ua = String(req.headers['user-agent'] || '-').slice(0, 46);
    const host = String(req.headers.host || '-');
    console.log(
      stamp() + '  ' + String(req.method).padEnd(4) + ' ' + String(status).padEnd(3) + '  ' +
      rel.padEnd(38).slice(0, 38) + '  ' + String(size).padStart(8) + 'B  ' +
      (Date.now() - started) + 'ms  host=' + host + '  ua=' + ua + (note ? '  ' + note : '')
    );
  };

  /* No directory listings, no traversal, no dotfiles. */
  const file = path.join(ROOT, rel);
  if (rel.split('/').some(seg => seg.startsWith('.')) || !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain', 'Content-Length': 9 });
    finish(403, 9);
    return res.end('forbidden');
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      const body = 'not found';
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Content-Length': body.length });
      finish(404, body.length);
      return res.end(body);
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'Cache-Control': 'no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    });
    finish(200, st.size);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

/* A refused write or a dead socket must not take the preview down. */
server.on('clientError', (e, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('preview: ' + ROOT + ' on http://0.0.0.0:' + PORT + '  (HTTP/1.1, no-store)');
});
