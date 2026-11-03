import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { init } = require('../src/commands/init');
const { update } = require('../src/commands/update');
const config = require('../src/lib/config');

// An install made when levi still supported Codex and Copilot tracks files in .agents, .codex
// and .github. After the upgrade, `update` must remove the ones the user never touched and
// leave the ones they edited.
test('update removes untouched Codex and Copilot files of an older install and keeps edited ones', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'levi-legacy-'));
  const log = console.log;
  console.log = () => {};
  try {
    init(dir, ['code-review']);
    const untouched = '.agents/skills/levi-code-review/SKILL.md';
    const edited = '.codex/agents/levi-qa.toml';
    for (const rel of [untouched, edited]) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), 'old\n');
    }
    const old = config.read(dir);
    old.tools = ['claude', 'codex'];
    // An older install recorded the hash of each file as it wrote it.
    old.team.files[edited] = require('crypto').createHash('sha256').update('old\n').digest('hex');
    old.team.files[untouched] = require('crypto').createHash('sha256').update('old\n').digest('hex');
    config.write(dir, old);
    fs.writeFileSync(path.join(dir, edited), 'edited by the user\n');

    update(dir);

    assert.equal(fs.existsSync(path.join(dir, untouched)), false, 'untouched legacy file is removed');
    assert.equal(fs.existsSync(path.join(dir, edited)), true, 'edited legacy file is kept');
    assert.equal('tools' in config.read(dir), false, 'the tools field is dropped');
    assert.ok(fs.existsSync(path.join(dir, '.claude/skills/levi-code-review/SKILL.md')));
  } finally {
    console.log = log;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
