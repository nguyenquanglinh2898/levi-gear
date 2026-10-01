const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadKit } = require('./usecases');
const { build } = require('./desired-state');

// Git may rewrite line endings (core.autocrlf), which must not count as a user edit, so text
// is hashed with CRLF folded to LF. Binary files (any NUL byte) are hashed as they are.
function sha(buf) {
  const text = buf.includes(0) ? buf : Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Path -> hash recorded at install time (null when the config predates hashing).
function trackedFiles(config) {
  const map = new Map();
  const add = (entry) => Object.entries((entry && entry.files) || {}).forEach(([p, h]) => map.set(p, h));
  Object.values(config.usecases || {}).forEach(add);
  add(config.router);
  add(config.team);
  return map;
}

function readHash(abs) {
  return fs.existsSync(abs) && fs.statSync(abs).isFile() ? sha(fs.readFileSync(abs)) : null;
}

// Decides what to do with one file davinci wants to have. The recorded hash tells whether the
// user changed it since davinci wrote it; a changed file is never overwritten without force.
function planWanted(p, wanted, recorded, diskHash, forced) {
  const newHash = sha(wanted.content);
  const base = { path: p, group: wanted.group, newHash, recorded };
  if (diskHash === null) {
    return recorded !== undefined && !forced ? { ...base, op: 'keep-deleted' } : { ...base, op: 'add' };
  }
  if (diskHash === newHash) return { ...base, op: 'same' };
  if (recorded === undefined) return { ...base, op: forced ? 'update' : 'conflict' };
  if (recorded !== null && diskHash === recorded) return { ...base, op: 'update' };
  if (forced) return { ...base, op: 'update' };
  return { ...base, op: 'customized' };
}

function plan(projectDir, desired, tracked, force) {
  const forced = (p) => force === true || (force instanceof Set && force.has(p));
  const actions = [];
  for (const [p, wanted] of desired.files) {
    const recorded = tracked.has(p) ? tracked.get(p) : undefined;
    actions.push({ ...planWanted(p, wanted, recorded, readHash(path.join(projectDir, p)), forced(p)), content: wanted.content });
  }
  for (const [p, recorded] of tracked) {
    if (desired.files.has(p)) continue;
    const diskHash = readHash(path.join(projectDir, p));
    if (diskHash === null) actions.push({ path: p, op: 'drop' });
    else if (recorded !== null && diskHash === recorded) actions.push({ path: p, op: 'remove' });
    else actions.push({ path: p, op: 'orphan' });
  }
  return actions;
}

// Removes now-empty folders below the tool folders (.claude/skills/..., not .claude/skills).
function pruneEmptyDirs(projectDir, rel) {
  let dir = path.posix.dirname(rel);
  while (dir.split('/').length >= 3) {
    const abs = path.join(projectDir, dir);
    if (!fs.existsSync(abs) || fs.readdirSync(abs).length) return;
    fs.rmdirSync(abs);
    dir = path.posix.dirname(dir);
  }
}

function writeFile(projectDir, rel, content) {
  const abs = path.join(projectDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function apply(projectDir, actions) {
  for (const a of actions) {
    if (a.op === 'add' || a.op === 'update') writeFile(projectDir, a.path, a.content);
    else if (a.op === 'remove') {
      fs.rmSync(path.join(projectDir, a.path), { force: true });
      pruneEmptyDirs(projectDir, a.path);
    }
  }
}

// What .davinci.json should remember: the hash of each file as davinci last wrote it. A file
// the user changed keeps its old hash so it stays flagged; a path davinci never owned is not tracked.
function recordFiles(actions, ids) {
  const config = { usecases: {}, router: { files: {} }, team: { files: {} } };
  for (const id of ids) config.usecases[id] = { files: {} };
  for (const a of actions) {
    if (!a.group || a.op === 'conflict') continue;
    const hash = ['add', 'update', 'same'].includes(a.op) ? a.newHash : a.recorded;
    const target = a.group.startsWith('usecase:') ? config.usecases[a.group.slice(8)] : config[a.group];
    target.files[a.path] = hash;
  }
  return config;
}

// Brings the project in line with the kit for `ids` and `tools`, touching only files the user
// has not changed. `previous` is the stored config. With dryRun nothing is written.
function sync(projectDir, ids, tools, previous, { force = false, dryRun = false } = {}) {
  const desired = build(loadKit(), ids, tools);
  const actions = plan(projectDir, desired, trackedFiles(previous), force);
  if (!dryRun) apply(projectDir, actions);
  return { actions, missing: desired.missing, ...recordFiles(actions, desired.ids) };
}

module.exports = { sync };
