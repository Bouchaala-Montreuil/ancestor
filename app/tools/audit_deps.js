#!/usr/bin/env node
/* Audit both committed dependency locks even if the first audit fails.
   This networked check is deliberately separate from the deterministic gate. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const npm = process.env.npm_execpath;
if (!npm) {
  console.error('Run this audit with npm run audit:deps.');
  process.exitCode = 1;
} else {
  let failed = false;
  const checks = [
    ['application tooling', ['audit']],
    ['Chromium helper', ['audit', '--prefix', 'tools/chromium-deps']]
  ];
  for (const [label, args] of checks) {
    console.log('\n--- npm audit: ' + label + ' ---');
    const result = spawnSync(process.execPath, [npm, ...args], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit'
    });
    if (result.error) console.error(label + ': ' + result.error.message);
    if (result.signal) console.error(label + ': terminated by ' + result.signal);
    if (result.error || result.signal || result.status !== 0) failed = true;
  }
  if (failed) {
    console.error('\nOne or more dependency audits failed; see both results above.');
    process.exitCode = 1;
  }
}
