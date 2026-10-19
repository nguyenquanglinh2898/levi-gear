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
const stateScript = path.resolve('src/runtime/codex-run-state.mjs');

function runState(...args) {
  const result = spawnSync(process.execPath, [stateScript, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test('Codex run state resumes the active stage without repeating completed work', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'levi-state-'));
  try {
    runState('init', work, 'create-feature', 'demo', 'plan', 'tests');
    runState('begin', work, 'plan');
    const tasks = path.join(work, 'tasks.md');
    fs.writeFileSync(tasks, '# tasks\n');
    runState('complete', work, 'plan', tasks);
    runState('wait', work, 'tests', 'Need a decision');
    runState('resume', work);

    const status = runState('status', work);
    assert.equal(status.state, 'running');
    assert.equal(status.currentStage, 'tests');
    assert.equal(status.stages[0].status, 'complete');
    assert.equal(status.stages[1].status, 'active');
    assert.equal(status.stages[0].artifacts[0], tasks);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});

test('Codex run state can finish a valid early-exit workflow', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'levi-state-'));
  try {
    runState('init', work, 'generate-test-scenarios', 'test-cases', 'select', 'report', 'generate');
    runState('begin', work, 'select');
    runState('complete', work, 'select');
    runState('finish', work, 'report');

    const status = runState('status', work);
    assert.equal(status.state, 'done');
    assert.equal(status.currentStage, null);
    assert.equal(status.stages[1].status, 'complete');
    assert.equal(status.stages[2].status, 'skipped');
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});

test('Codex installation includes durable state for every usecase without changing Claude output', () => {
  const kit = loadKit();
  const ids = kit.usecases.map((usecase) => usecase.id);
  const codex = build(kit, ids, ['codex']).files;
  const claude = build(kit, ['create-feature'], ['claude']).files;

  for (const usecase of kit.usecases) {
    const root = `.agents/skills/levi-${usecase.id}`;
    assert.ok(codex.has(`${root}/scripts/codex-run-state.mjs`), `${usecase.id} is missing the state helper`);
  }
  for (const id of ['brainstorming', 'spec-writing', 'design', 'create-feature', 'fix-bug', 'code-review', 'generate-test-scenarios']) {
    assert.match(codex.get(`.agents/skills/levi-${id}/SKILL.md`).content.toString(), /references\/codex-runner\.md/, `${id} lacks a dedicated runner`);
    assert.ok(codex.has(`.agents/skills/levi-${id}/references/codex-runner.md`), `${id} lacks a runner reference`);
  }
  assert.equal(claude.has('.claude/skills/levi-create-feature/scripts/codex-run-state.mjs'), false);
});
