const fs = require('fs');
const path = require('path');
const { ROUTER_NAME, skillName } = require('./usecases');
const { SKILL_DIR, AGENT_DIR, renderAgent } = require('./tools');
const { joinSections } = require('./agents');
const { withRoleSkills } = require('./role-skills');
const { setField } = require('./frontmatter');
const { renderRouter } = require('./router');

const QUOTA_CHECK = path.join(__dirname, '..', 'runtime', 'quota-check.mjs');

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

// Every levi skill runs only when the user invokes it, which the frontmatter flag enforces.
function addSkill(out, usecase, runRules) {
  const root = path.posix.join(SKILL_DIR, skillName(usecase.id));
  for (const rel of walk(usecase.dir, true)) {
    let content = fs.readFileSync(path.join(usecase.dir, rel));
    if (rel === 'SKILL.md') content = joinSections(setField(content.toString('utf8'), 'disable-model-invocation', 'true'), runRules);
    put(out, path.posix.join(root, rel), content, usecaseGroup(usecase.id));
  }
  // The quota guard in the run rules calls this helper.
  put(out, path.posix.join(root, 'scripts/quota-check.mjs'), fs.readFileSync(QUOTA_CHECK), usecaseGroup(usecase.id));
}

// `prepare` adapts an agent before it is rendered (team agents get their role skills).
function addAgents(out, agents, group, prepare = (agent) => agent) {
  for (const agent of agents) put(out, path.posix.join(AGENT_DIR, `${agent.name}.md`), renderAgent(prepare(agent)), group);
}

// The `levi` entry point is generated from whatever usecases are installed.
function addRouter(out, usecases, team) {
  if (!usecases.length) return;
  put(out, path.posix.join(SKILL_DIR, ROUTER_NAME, 'SKILL.md'), renderRouter(SKILL_DIR, usecases, team), 'router');
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

// The files a clean install of `ids` (and what they require) would contain: Map of
// project-relative path to { content, group }. Nothing is written here. Usecases that are a team
// role's skill are always installed, since the team always is and its agents rely on them.
function build(kit, ids) {
  const byId = new Map(kit.usecases.map((u) => [u.id, u]));
  const out = new Map();
  const missing = [];
  const present = [];
  const roleSkills = kit.usecases.filter((u) => u.skill).map((u) => u.id);
  for (const id of withRequired(byId, [...ids, ...roleSkills])) {
    if (!byId.has(id)) {
      missing.push(id);
      continue;
    }
    const usecase = byId.get(id);
    present.push(usecase);
    addSkill(out, usecase, kit.runRules);
    addAgents(out, usecase.agents, usecaseGroup(id));
  }
  addRouter(out, present, kit.team);
  addAgents(out, kit.team, 'team', (agent) => withRoleSkills(agent, present, SKILL_DIR));
  return { files: out, missing, ids: present.map((u) => u.id) };
}

module.exports = { build, usecaseGroup };
