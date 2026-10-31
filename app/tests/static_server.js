/* Disposable loopback server for browser tests. It exposes only app/ files and
   uses an ephemeral port so the suite does not depend on a running preview. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname,'..');
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.json':'application/json',
  '.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg',
  '.svg':'image/svg+xml','.glb':'model/gltf-binary'};
module.exports = function startTestServer(){
  const srv=http.createServer((req,res)=>{
    let name;
    try { name=decodeURIComponent((req.url||'/').split('?')[0]); } catch(_e){res.writeHead(400);res.end();return;}
    const file=path.resolve(ROOT,name==='/'?'index.html':'.'+name);
    if((file!==ROOT&&!file.startsWith(ROOT+path.sep))||!fs.existsSync(file)||fs.statSync(file).isDirectory()){
      res.writeHead(404);res.end('not found');return;
    }
    res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve,reject)=>{srv.once('error',reject);srv.listen(0,'127.0.0.1',()=>resolve(srv));});
};
