#!/usr/bin/env node
// Locks the tests and test scenarios of a feature, so that nobody can change them to make them pass.
//
//   node lock-tests.mjs lock <snapshot-dir> <path>...   copy the files (folders are walked) and record their hashes
//   node lock-tests.mjs verify <snapshot-dir>           restore every locked file that was changed or deleted
//
// Run from the project root; paths are relative to it. `verify` prints JSON and exits 1 when it had to restore
// something. In Markdown files the `- **Status:**` and `- **Evidence:**` lines are left out of the hash: QA fills
// them in when it runs the scenarios, and that is not a change to the scenario.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const RESULT_LINE = /^\s*- \*\*(Status|Evidence):\*\*.*$/gm;

function hash(file) {
  let text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (file.endsWith('.md')) text = text.replace(RESULT_LINE, '');
  return crypto.createHash('sha256').update(text).digest('hex');
}

function walk(p) {
  if (!fs.existsSync(p)) throw new Error(`not found: ${p}`);
  if (!fs.statSync(p).isDirectory()) return [p];
  return fs.readdirSync(p).flatMap((name) => walk(path.join(p, name)));
}

function lock(dir, paths) {
  if (!paths.length) throw new Error('nothing to lock');
  const files = {};
  for (const file of [...new Set(paths.flatMap(walk))].map((f) => path.normalize(f))) {
    const copy = path.join(dir, 'files', file);
    fs.mkdirSync(path.dirname(copy), { recursive: true });
    fs.copyFileSync(file, copy);
    files[file] = hash(file);
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ files }, null, 2) + '\n');
  console.log(JSON.stringify({ locked: Object.keys(files) }, null, 2));
}

function verify(dir) {
  const { files } = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const restored = [];
  for (const [file, expected] of Object.entries(files)) {
    if (fs.existsSync(file) && hash(file) === expected) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.copyFileSync(path.join(dir, 'files', file), file);
    restored.push(file);
  }
  console.log(JSON.stringify({ intact: restored.length === 0, restored, checked: Object.keys(files).length }, null, 2));
  if (restored.length) process.exitCode = 1;
}

const [cmd, dir, ...rest] = process.argv.slice(2);
try {
  if (cmd === 'lock' && dir) lock(dir, rest);
  else if (cmd === 'verify' && dir) verify(dir);
  else {
    console.error('usage: lock-tests.mjs lock <snapshot-dir> <path>... | verify <snapshot-dir>');
    process.exitCode = 2;
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 2;
}
