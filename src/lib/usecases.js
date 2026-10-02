const fs = require('fs');
const path = require('path');
const { parse } = require('./frontmatter');
const { PREFIX, readAgent, loadTeam } = require('./agents');

const ROUTER_NAME = 'levi';
const KIT_DIR = path.join(__dirname, '..', '..', 'usecases');

function skillName(id) {
  return PREFIX + id;
}

function kitVersion() {
  return require('../../package.json').version;
}

function loadAgents(id, dir) {
  const agentsDir = path.join(dir, 'agents');
  if (!fs.existsSync(agentsDir)) return [];
  return fs
    .readdirSync(agentsDir)
    .filter((f) => f.endsWith('.md'))
    .map((file) =>
      readAgent(path.join(agentsDir, file), `usecases/${id}/agents/${file}`, `${skillName(id)}-${file.slice(0, -3)}`, skillName(id))
    );
}

function load(id) {
  const dir = path.join(KIT_DIR, id);
  const skillFile = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) throw new Error(`usecases/${id}: missing SKILL.md`);
  const { data } = parse(fs.readFileSync(skillFile, 'utf8'));
  if (data.name !== skillName(id)) {
    throw new Error(`usecases/${id}/SKILL.md: name must be "${skillName(id)}", got "${data.name}"`);
  }
  if (!data.description) throw new Error(`usecases/${id}/SKILL.md: missing description`);
  return { id, dir, description: data.description, agents: loadAgents(id, dir) };
}

// Every agent name must be unique across the team and all usecases, and a usecase id must not
// reuse a team role, or `levi-<id>` would name both a skill and an agent.
function checkNames(usecases, team) {
  const seen = new Set();
  for (const agent of [...team, ...usecases.flatMap((u) => u.agents)]) {
    if (seen.has(agent.name)) throw new Error(`Agent name "${agent.name}" is defined twice in the kit`);
    seen.add(agent.name);
  }
  for (const u of usecases) {
    if (seen.has(skillName(u.id))) throw new Error(`usecases/${u.id}: id clashes with team agent "${skillName(u.id)}"`);
  }
}

// Loads and validates the whole kit, so a broken file fails before anything is touched.
function loadKit() {
  const usecases = fs.existsSync(KIT_DIR)
    ? fs
        .readdirSync(KIT_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => load(e.name))
    : [];
  const team = loadTeam();
  checkNames(usecases, team);
  return { usecases, team };
}

function listUsecases() {
  return loadKit().usecases;
}

module.exports = { PREFIX, ROUTER_NAME, kitVersion, skillName, loadKit, listUsecases };
