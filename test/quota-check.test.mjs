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
const SESSION = '01a0fc03-6ad5-7e61-81c0-e38382a5f776';
const inSeconds = (hours) => Math.floor(Date.now() / 1000) + hours * 3600;

function run(args, { env = {}, input } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', input, env: { ...process.env, ...env } });
  return { ...result, json: () => JSON.parse(result.stdout) };
}

function temp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function codexHome(usedPercent, resetsAt) {
  const home = temp('levi-codex-');
  const dir = path.join(home, 'sessions', '2026', '10', '20');
  fs.mkdirSync(dir, { recursive: true });
  const event = (limits) => JSON.stringify({ type: 'event_msg', payload: { type: 'token_count', rate_limits: limits } });
  const lines = [
    event({ primary: { used_percent: 10, window_minutes: 300, resets_at: resetsAt }, secondary: { used_percent: 1, window_minutes: 10080, resets_at: resetsAt } }),
    event(null),
    event({ primary: { used_percent: usedPercent, window_minutes: 300, resets_at: resetsAt }, secondary: { used_percent: 1, window_minutes: 10080, resets_at: resetsAt } }),
  ];
  fs.writeFileSync(path.join(dir, `rollout-2026-10-20T01-00-00-${SESSION}.jsonl`), lines.join('\n') + '\n');
  return home;
}

test('Codex: reads the newest 5-hour usage and flags the threshold', () => {
  const home = codexHome(96.5, inSeconds(2));
  try {
    const state = run(['check', '--tool', 'codex'], { env: { CODEX_HOME: home, CODEX_THREAD_ID: '' } }).json();
    assert.equal(state.status, 'ok');
    assert.equal(state.usedPercent, 96.5);
    assert.equal(state.atThreshold, true);
    assert.equal(state.sessionId, SESSION);
    assert.equal(run(['check', '--tool', 'codex', '--threshold', '99'], { env: { CODEX_HOME: home } }).json().atThreshold, false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('Codex: a window whose reset time has passed counts as unused', () => {
  const home = codexHome(99, Math.floor(Date.now() / 1000) - 60);
  try {
    const state = run(['check', '--tool', 'codex'], { env: { CODEX_HOME: home } }).json();
    assert.equal(state.usedPercent, 0);
    assert.equal(state.atThreshold, false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('Claude Code: the statusline bridge records usage and check reads it back', () => {
  const home = temp('levi-claude-');
  const env = { CLAUDE_CONFIG_DIR: home };
  try {
    assert.equal(run(['check', '--tool', 'claude'], { env }).json().status, 'unknown');

    const payload = JSON.stringify({ rate_limits: { five_hour: { used_percentage: 96, resets_at: inSeconds(3) } } });
    assert.equal(run(['record'], { env, input: payload }).stdout, '5h 96%');
    assert.equal(run(['record', '--passthrough'], { env, input: payload }).stdout, payload);

    const state = run(['check', '--tool', 'claude'], { env }).json();
    assert.equal(state.usedPercent, 96);
    assert.equal(state.atThreshold, true);

    // A statusline payload without limits (API-key billing) must not break the statusline.
    assert.equal(run(['record'], { env, input: '{}' }).status, 0);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('Codex job: arming is idempotent, keeps other entries and disarming removes only its own line', () => {
  const dir = temp('levi-cron-');
  const store = path.join(dir, 'crontab.txt');
  const fake = path.join(dir, 'crontab');
  fs.writeFileSync(store, '0 3 * * * /usr/bin/backup\n');
  fs.writeFileSync(fake, `#!/bin/sh\nif [ "$1" = "-l" ]; then cat "${store}"; else cat > "${store}"; fi\n`, { mode: 0o755 });
  const codex = path.join(dir, 'codex');
  fs.writeFileSync(codex, '#!/bin/sh\n', { mode: 0o755 });
  const env = { LEVI_CRONTAB: fake, PATH: `${dir}${path.delimiter}${process.env.PATH}` };
  try {
    const args = ['cron-arm', '--session', SESSION, '--project', dir, '--', '--full-auto'];
    assert.equal(run(args, { env }).json().armed, true);
    run(args, { env });
    const lines = fs.readFileSync(store, 'utf8').trim().split('\n');
    assert.equal(lines.length, 2);
    assert.equal(lines[0], '0 3 * * * /usr/bin/backup');
    assert.match(lines[1], /^7 \*\/2 \* \* \* .*cron-fire.*'--full-auto'.* # levi-quota-resume /);

    run(['cron-disarm', '--session', SESSION], { env });
    assert.equal(fs.readFileSync(store, 'utf8'), '0 3 * * * /usr/bin/backup\n');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Codex job: cron-fire waits while the quota is used up and disarms before resuming once it is back', () => {
  const dir = temp('levi-fire-');
  const store = path.join(dir, 'crontab.txt');
  const fake = path.join(dir, 'crontab');
  const calls = path.join(dir, 'codex-calls.txt');
  fs.writeFileSync(store, '');
  fs.writeFileSync(fake, `#!/bin/sh\nif [ "$1" = "-l" ]; then cat "${store}"; else cat > "${store}"; fi\n`, { mode: 0o755 });
  const codex = path.join(dir, 'codex');
  fs.writeFileSync(codex, `#!/bin/sh\necho "$@" >> "${calls}"\nexit 0\n`, { mode: 0o755 });
  const env = { LEVI_CRONTAB: fake, PATH: `${dir}${path.delimiter}${process.env.PATH}` };
  const used = codexHome(97, inSeconds(2));
  const free = codexHome(10, inSeconds(2));
  try {
    run(['cron-arm', '--session', SESSION, '--project', dir], { env });
    assert.match(fs.readFileSync(store, 'utf8'), /levi-quota-resume/);

    const waiting = run(['cron-fire', '--session', SESSION, '--project', dir, '--codex', codex], { env: { ...env, CODEX_HOME: used } }).json();
    assert.equal(waiting.fired, false);
    assert.match(fs.readFileSync(store, 'utf8'), /levi-quota-resume/);
    assert.equal(fs.existsSync(calls), false);

    const resumed = run(['cron-fire', '--session', SESSION, '--project', dir, '--codex', codex, '--', '--full-auto'], { env: { ...env, CODEX_HOME: free } }).json();
    assert.equal(resumed.fired, true);
    assert.equal(fs.readFileSync(store, 'utf8').includes('levi-quota-resume'), false);
    assert.match(fs.readFileSync(calls, 'utf8'), new RegExp(`^exec resume --full-auto ${SESSION} I ran out of quota`));
  } finally {
    for (const d of [dir, used, free]) fs.rmSync(d, { recursive: true, force: true });
  }
});

test('Every installed usecase carries the run rules and the quota helper, in every tool', () => {
  const kit = loadKit();
  assert.match(kit.runRules, /^## Run rules/);
  const ids = kit.usecases.map((u) => u.id);
  for (const [tool, dir] of [['claude', '.claude/skills'], ['codex', '.agents/skills']]) {
    const files = build(kit, ids, [tool]).files;
    for (const id of ids) {
      const skill = files.get(`${dir}/levi-${id}/SKILL.md`).content.toString();
      assert.equal(skill.split('## Run rules').length, 2, `${tool}/${id}: the run rules must appear exactly once`);
      assert.ok(skill.trimEnd().endsWith(kit.runRules.trimEnd().split('\n').pop()), `${tool}/${id}: the run rules come last`);
      assert.ok(files.has(`${dir}/levi-${id}/scripts/quota-check.mjs`), `${tool}/${id}: quota helper missing`);
    }
  }
});
