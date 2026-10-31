/* Reproducibility and offline licence regressions. This does not replace a
   legal review or a networked vulnerability audit. Run: node tests/release_integrity.js */
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = p => JSON.parse(read(p));
let passed = 0, failed = 0; const failures = [];
function check(name, ok, detail){
  if(ok){ passed++; console.log('  PASS  ' + name); }
  else { failed++; failures.push(name); console.error('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

const pkg = json('package.json'), lock = json('package-lock.json');
const helper = json('tools/chromium-deps/package.json');
const helperLock = json('tools/chromium-deps/package-lock.json');
check('the application and browser helper have npm v3 lockfiles', lock.lockfileVersion === 3 && helperLock.lockfileVersion === 3);
check('the application lock describes the declared development dependencies',
  Object.keys(pkg.devDependencies).length === Object.keys(lock.packages[''].devDependencies || {}).length &&
  Object.entries(pkg.devDependencies).every(([k,v])=>lock.packages[''].devDependencies[k]===v));
check('the Node requirement is recorded consistently in both app manifests',
  !!pkg.engines?.node && lock.packages[''].engines?.node === pkg.engines.node);
check('the app does not introduce npm production dependencies', !pkg.dependencies || !Object.keys(pkg.dependencies).length);
check('the Puppeteer lock selects the intended major version',
  Number(lock.packages['node_modules/puppeteer']?.version.split('.')[0]) >= 25);
check('the browser helper locks an exact Chromium version',
  /^\d+\.\d+\.\d+$/.test(helper.dependencies['@sparticuz/chromium']) &&
  helperLock.packages['node_modules/@sparticuz/chromium']?.version === helper.dependencies['@sparticuz/chromium']);
check('the browser helper lock and manifest agree',
  helperLock.packages[''].dependencies['@sparticuz/chromium'] === helper.dependencies['@sparticuz/chromium']);
for(const [name, l] of [['app',lock],['browser helper',helperLock]]){
  const missing = Object.entries(l.packages).filter(([key,p]) => key && p.resolved && !/^sha(256|384|512)-/.test(p.integrity || '')).map(([key])=>key);
  check(name + ': every resolved package in the lock carries an integrity hash', missing.length === 0, missing.join(', '));
}
check('the Chromium helper uses the checked-in lock and a lock-specific browser path',
  /npm ci/.test(read('tools/chromium.sh')) && /chromium-deps/.test(read('tools/chromium.sh')) && /runtime-\$\{CR_LOCK_ID:0:16\}/.test(read('tools/chromium.sh')));

// Exercise audit orchestration with a fake npm CLI; verify failures never skip
// the other lock and propagate without needing the network in npm run verify.
const auditTmp = fs.mkdtempSync(path.join(os.tmpdir(),'ancestor-audits-test-'));
try {
  const fake = path.join(auditTmp,'fake-npm-cli.js');
  const record = path.join(auditTmp,'calls.jsonl');
  fs.writeFileSync(fake, `const fs=require('fs');
const args=process.argv.slice(2), helper=args.includes('--prefix');
fs.appendFileSync(process.env.AUDIT_RECORD, JSON.stringify(args)+'\\n');
const fail=process.env.AUDIT_FAIL;
process.exit((fail==='app' && !helper)||(fail==='helper' && helper) ? 1 : 0);`);
  for(const failedLock of ['app','helper','none']){
    fs.writeFileSync(record,'');
    const result = spawnSync(process.execPath,['tools/audit_deps.js'],{
      cwd:ROOT, encoding:'utf8', env:{...process.env,npm_execpath:fake,AUDIT_RECORD:record,AUDIT_FAIL:failedLock}
    });
    const calls = fs.readFileSync(record,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    const both = calls.length===2 && calls[0].join(' ')==='audit' &&
      calls[1].join(' ')==='audit --prefix tools/chromium-deps';
    const outcome = failedLock==='none' ? 'success' : 'failure from '+failedLock;
    check('dependency audits check both locks and correctly return '+outcome,
      both && result.status === (failedLock==='none' ? 0 : 1), result.stderr);
  }
} finally { fs.rmSync(auditTmp,{recursive:true,force:true}); }

const three = read('assets/THREE-LICENSE.txt').trim();
const meshopt = read('assets/MESHOPT-LICENSE.txt').trim();
const font = read('fonts/OFL.txt').trim();
const anatomy = read('assets/ANATOMY-RELEASE-ATTRIBUTION.txt').trim();
check('three.js licence is the exact licence of the locked installed source', three === read('node_modules/three/LICENSE').trim());
check('meshoptimizer licence is the exact licence of the locked installed source', meshopt === read('node_modules/meshoptimizer/LICENSE.md').trim());
check('the three.js decoder names the same copyright holder', /Copyright.*2016-2026.*Arseny Kapoulkine/.test(read('node_modules/three/examples/jsm/libs/meshopt_decoder.module.js')));
check('font notice contains the full OFL and copyright', /SIL OPEN FONT LICENSE Version 1\.1/.test(font) && /Copyright 2017 The Barlow Project Authors/.test(font) && /TERMINATION/.test(font));
check('anatomy attribution names creators, the licence, source and changes',
  /Z-Anatomy/.test(anatomy) && /BodyParts3D/.test(anatomy) && /Kousaku Okubo/.test(anatomy) &&
  /creativecommons\.org\/licenses\/by-sa\/4\.0/.test(anatomy) && /Changes:/.test(anatomy) && /not been independently reviewed/.test(anatomy));
const rootLicense = read('../LICENSE');
check('the project licence identifies the vendored software and independent licences',
  /three\.js/i.test(rootLicense) && /meshoptimizer/i.test(rootLicense) && /THREE-LICENSE\.txt/.test(rootLicense) && /MESHOPT-LICENSE\.txt/.test(rootLicense));
const vendor = read('js/vendor/three-bundle.js');
check('both full MIT notices are present in the vendored script', vendor.includes(three) && vendor.includes(meshopt));
const sourceHTML = read('index.html'), releaseHTML = read('release/ancestor.html');
function templateText(html){
  const dom = new JSDOM(html);
  const template = dom.window.document.getElementById('third-party-notices');
  const text = template?.content.textContent.trim() || '';
  dom.window.close(); return text;
}
const sourceNotice = templateText(sourceHTML), releaseNotice = templateText(releaseHTML);
check('all four full notices and attribution are present in the modular app',
  [three,meshopt,font,anatomy].every(text=>sourceNotice.includes(text)));
check('the same notices travel with the standalone app', sourceNotice.length > 0 && releaseNotice === sourceNotice);
const match = releaseHTML.match(/<script type="text\/plain" id="three-runtime" data-enc="gzip-b64">([^<]+)<\/script>/);
let decoded = '';
try { decoded = zlib.gunzipSync(Buffer.from(match?.[1] || '', 'base64')).toString('utf8'); } catch (_) {}
check('the standalone 3D payload is exactly the licensed vendor script', decoded === vendor && decoded.includes(three) && decoded.includes(meshopt));
const sourceCheck = spawnSync('python3',['tools/notices.py','--check'],{cwd:ROOT,encoding:'utf8'});
check('the notices generator validates the real source document', sourceCheck.status === 0, sourceCheck.stderr);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'ancestor-notices-test-'));
try {
  const bad = path.join(tmp,'index.html');
  fs.writeFileSync(bad,sourceHTML.replace('Copyright © 2010-2026 three.js authors','REMOVED NOTICE'));
  const negative = spawnSync('python3',[path.join(ROOT,'tools/notices.py'),'--check','--index',bad],{cwd:ROOT,encoding:'utf8'});
  check('the notices check rejects a damaged embedded copyright', negative.status !== 0 && /stale/.test(negative.stderr), negative.stderr);
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
// CSS packaging only compacts comments surrounded by whitespace.
const compactCSS = text => spawnSync('python3', ['-c',
  'import sys; from tools.css_packaging import strip_isolated_comments; sys.stdout.write(strip_isolated_comments(sys.stdin.read()))'],
  {cwd:ROOT,encoding:'utf8',input:text,maxBuffer:1024*1024});
const cssFixture = `a /* discard */ b
div/**/.card { content: "/* keep */"; }
/*! licence */
`;
const packedFixture = compactCSS(cssFixture);
check('standalone CSS compacts isolated comments but preserves tokens, strings and licence comments',
  packedFixture.status === 0 && packedFixture.stdout === `a /**/ b
div/**/.card { content: "/* keep */"; }
/*! licence */
`, packedFixture.stderr);
const escapedFixture = compactCSS(String.raw`.x { content: "escaped \" /* not a comment */"; } /* drop */ `);
check('CSS packing honours escaped quotes inside strings',
  escapedFixture.status === 0 && escapedFixture.stdout.includes('/* not a comment */') && !escapedFixture.stdout.includes('/* drop */'), escapedFixture.stderr);
const legalCSS = '/* Copyright 2026 Third Party */\n/* Barlow Condensed, SIL OFL 1.1 */\n/* SPDX-License-Identifier: MIT */\n';
const packedLegalCSS = compactCSS(legalCSS);
check('plain legal and attribution comments are retained in the release CSS',
  packedLegalCSS.status === 0 && packedLegalCSS.stdout === legalCSS, packedLegalCSS.stderr);
check('CSS packaging fails closed on an unfinished comment or string',
  compactCSS('a /* broken').status !== 0 && compactCSS(`.x{content:"broken}`).status !== 0);
const originalCSS = read('css/app.css'), packedCSS = compactCSS(originalCSS);
const releaseStyle = releaseHTML.match(/<style>\n([\s\S]*?)\n<\/style>/)?.[1] || '';
const packedWithImages = packedCSS.stdout.replace(/url\("\.\.\/img\/([\w.-]+\.jpg)"\)/g,
  (_, name) => 'url("data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT,'img',name)).toString('base64') + '")');
check('the release uses the tested compacted CSS with the real images inlined',
  packedCSS.status === 0 && packedCSS.stdout.length < originalCSS.length && releaseStyle === packedWithImages &&
  read('css/app.css') === originalCSS, packedCSS.stderr);

const release = fs.statSync(path.join(ROOT,'release/ancestor.html')).size;
check('the standalone release stays inside the 3 MiB budget', release < 3*1024*1024, release + ' bytes');
const appBuild = /const APP_BUILD = '([^']+)'/.exec(read('js/core/store.js'))?.[1];
const cache = /const CACHE = '([^']+)'/.exec(read('sw.js'))?.[1];
check('the app build and service worker cache version agree', !!appBuild && cache === 'ancestor-' + appBuild);

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if(failed){ console.error(failures.join('\n')); process.exitCode = 1; }
