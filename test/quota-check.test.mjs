import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { build } = require('../src/lib/desired-state');
const { loadKit } = require('../src/lib/usecases');

const script = path.resolve('src/runtime/quota-check.mjs');
const inSeconds = (hours) => Math.floor(Date.now() / 1000) + hours * 3600;

function run(args, { env = {}, input } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', input, env: { ...process.env, ...env } });
  return { ...result, json: () => JSON.parse(result.stdout) };
}

function temp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('Claude Code: the statusline bridge records usage and check reads it back', () => {
  const home = temp('levi-claude-');
  const env = { CLAUDE_CONFIG_DIR: home };
  try {
    assert.equal(run(['check'], { env }).json().status, 'unknown');

    const payload = JSON.stringify({ rate_limits: { five_hour: { used_percentage: 96, resets_at: inSeconds(3) } } });
    assert.equal(run(['record'], { env, input: payload }).stdout, '5h 96%');
    assert.equal(run(['record', '--passthrough'], { env, input: payload }).stdout, payload);

    const state = run(['check'], { env }).json();
    assert.equal(state.usedPercent, 96);
    assert.equal(state.atThreshold, true);

    // A statusline payload without limits (API-key billing) must not break the statusline.
    assert.equal(run(['record'], { env, input: '{}' }).status, 0);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('Claude Code: a window whose reset time has passed counts as unused', () => {
  const home = temp('levi-claude-');
  const env = { CLAUDE_CONFIG_DIR: home };
  try {
    const payload = JSON.stringify({ rate_limits: { five_hour: { used_percentage: 99, resets_at: Math.floor(Date.now() / 1000) - 60 } } });
    run(['record'], { env, input: payload });
    const state = run(['check'], { env }).json();
    assert.equal(state.usedPercent, 0);
    assert.equal(state.atThreshold, false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('Every installed usecase carries the run rules and the quota helper', () => {
  const kit = loadKit();
  assert.match(kit.runRules, /^## Run rules/);
  const ids = kit.usecases.map((u) => u.id);
  const files = build(kit, ids).files;
  for (const id of ids) {
    const skill = files.get(`.claude/skills/levi-${id}/SKILL.md`).content.toString();
    assert.equal(skill.split('## Run rules').length, 2, `${id}: the run rules must appear exactly once`);
    assert.ok(skill.trimEnd().endsWith(kit.runRules.trimEnd().split('\n').pop()), `${id}: the run rules come last`);
    assert.ok(files.has(`.claude/skills/levi-${id}/scripts/quota-check.mjs`), `${id}: quota helper missing`);
  }
});
