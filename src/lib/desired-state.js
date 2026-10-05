const fs = require('fs');
const path = require('path');
const { ROUTER_NAME, skillName } = require('./usecases');
const { CODEX_SKILL_DIR, CODEX_POLICY, skillDirs, AGENT_TARGETS } = require('./tools');
const { setField } = require('./frontmatter');
const { renderRouter } = require('./router');

// Group keys say which part of the kit a file belongs to; they decide where its hash is
// recorded in .levi.json.
const usecaseGroup = (id) => `usecase:${id}`;

// Relative posix paths of every file under `dir`, leaving out the top-level agents/ folder
// (those become subagent files elsewhere).
function walk(dir, skipAgents, base = '') {
  return fs.readdirSync(path.join(dir, base), { withFileTypes: true }).flatMap((entry) => {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return skipAgents && !base && entry.name === 'agents' ? [] : walk(dir, skipAgents, rel);
    return [rel];
  });
}

function put(out, rel, content, group) {
  out.set(rel, { content: Buffer.from(content), group });
}

// Every levi skill runs only when the user invokes it: Claude Code and Copilot read the
// frontmatter flag, Codex reads agents/openai.yaml (only written where Codex looks).
function addSkill(out, usecase, dir) {
  const root = path.posix.join(dir, skillName(usecase.id));
  for (const rel of walk(usecase.dir, true)) {
    let content = fs.readFileSync(path.join(usecase.dir, rel));
    if (rel === 'SKILL.md') content = setField(content.toString('utf8'), 'disable-model-invocation', 'true');
    put(out, path.posix.join(root, rel), content, usecaseGroup(usecase.id));
  }
  if (dir === CODEX_SKILL_DIR) put(out, path.posix.join(root, 'agents/openai.yaml'), CODEX_POLICY, usecaseGroup(usecase.id));
}

function addAgents(out, agents, tools, group) {
  for (const tool of tools) {
    const target = AGENT_TARGETS[tool];
    for (const agent of agents) put(out, path.posix.join(target.dir, agent.name + target.ext), target.render(agent), group);
  }
}

// The `levi` entry point is generated from whatever usecases are installed.
function addRouter(out, usecases, team, tools) {
  if (!usecases.length) return;
  for (const dir of skillDirs(tools)) {
    const root = path.posix.join(dir, ROUTER_NAME);
    put(out, path.posix.join(root, 'SKILL.md'), renderRouter(dir, usecases, team), 'router');
    if (dir === CODEX_SKILL_DIR) put(out, path.posix.join(root, 'agents/openai.yaml'), CODEX_POLICY, 'router');
  }
}

// `ids` plus every usecase they require, directly or not, each once.
function withRequired(byId, ids) {
  const all = [];
  const visit = (id) => {
    if (all.includes(id)) return;
    all.push(id);
    if (byId.has(id)) byId.get(id).requires.forEach(visit);
  };
  ids.forEach(visit);
  return all;
}

// The files a clean install of `ids` (and what they require) for `tools` would contain: Map of
// project-relative path to { content, group }. Nothing is written here.
function build(kit, ids, tools) {
  const byId = new Map(kit.usecases.map((u) => [u.id, u]));
  const out = new Map();
  const missing = [];
  const present = [];
  for (const id of withRequired(byId, ids)) {
    if (!byId.has(id)) {
      missing.push(id);
      continue;
    }
    const usecase = byId.get(id);
    present.push(usecase);
    for (const dir of skillDirs(tools)) addSkill(out, usecase, dir);
    addAgents(out, usecase.agents, tools, usecaseGroup(id));
  }
  addRouter(out, present, kit.team, tools);
  addAgents(out, kit.team, tools, 'team');
  return { files: out, missing, ids: present.map((u) => u.id) };
}

module.exports = { build, usecaseGroup };
