const fs = require('fs');
const path = require('path');
const { PREFIX, ROUTER_NAME, skillName, listUsecases } = require('./usecases');
const { CODEX_SKILL_DIR, CODEX_POLICY, skillDirs, AGENT_TARGETS } = require('./tools');
const { setField } = require('./frontmatter');
const { renderRouter } = require('./router');

// Every davinci skill runs only when the user invokes it: Claude Code and Copilot read the
// frontmatter flag, Codex reads agents/openai.yaml (only written where Codex looks).
function makeManualOnly(dest, dir) {
  const skillFile = path.join(dest, 'SKILL.md');
  fs.writeFileSync(skillFile, setField(fs.readFileSync(skillFile, 'utf8'), 'disable-model-invocation', 'true'));
  if (dir === CODEX_SKILL_DIR) {
    fs.mkdirSync(path.join(dest, 'agents'), { recursive: true });
    fs.writeFileSync(path.join(dest, 'agents', 'openai.yaml'), CODEX_POLICY);
  }
}

function installUsecase(projectDir, usecase, tools) {
  const files = [];
  for (const dir of skillDirs(tools)) {
    const rel = path.posix.join(dir, skillName(usecase.id));
    const dest = path.join(projectDir, rel);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(usecase.dir, dest, {
      recursive: true,
      filter: (src) => path.relative(usecase.dir, src).split(path.sep)[0] !== 'agents',
    });
    makeManualOnly(dest, dir);
    files.push(rel);
  }
  for (const tool of tools) {
    const target = AGENT_TARGETS[tool];
    for (const agent of usecase.agents) {
      const rel = path.posix.join(target.dir, agent.name + target.ext);
      const dest = path.join(projectDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, target.render(agent));
      files.push(rel);
    }
  }
  return files;
}

// The `davinci` entry point is generated from whatever usecases ended up installed.
function installRouter(projectDir, usecases, tools) {
  if (!usecases.length) return [];
  return skillDirs(tools).map((dir) => {
    const rel = path.posix.join(dir, ROUTER_NAME);
    const dest = path.join(projectDir, rel);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'SKILL.md'), renderRouter(dir, usecases));
    if (dir === CODEX_SKILL_DIR) {
      fs.mkdirSync(path.join(dest, 'agents'), { recursive: true });
      fs.writeFileSync(path.join(dest, 'agents', 'openai.yaml'), CODEX_POLICY);
    }
    return rel;
  });
}

function removeFiles(projectDir, files) {
  for (const rel of files) {
    const dest = path.resolve(projectDir, rel);
    const inside = dest.startsWith(path.resolve(projectDir) + path.sep);
    const name = path.basename(dest);
    if (inside && (name === ROUTER_NAME || name.startsWith(PREFIX))) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  }
}

// Replaces everything recorded in `previous` ({ usecases, router }) with a fresh install of
// `ids` for `tools`.
function sync(projectDir, ids, tools, previous) {
  const kit = new Map(listUsecases().map((u) => [u.id, u]));
  for (const entry of Object.values(previous.usecases)) removeFiles(projectDir, entry.files);
  removeFiles(projectDir, previous.router ? previous.router.files : []);
  const installed = {};
  const missing = [];
  for (const id of ids) {
    if (!kit.has(id)) {
      missing.push(id);
      continue;
    }
    installed[id] = { files: installUsecase(projectDir, kit.get(id), tools) };
  }
  const router = { files: installRouter(projectDir, Object.keys(installed).map((id) => kit.get(id)), tools) };
  return { installed, router, missing };
}

module.exports = { sync };
