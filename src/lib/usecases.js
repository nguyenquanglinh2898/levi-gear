const fs = require('fs');
const path = require('path');
const { parse } = require('./frontmatter');
const { PREFIX, readAgent, loadTeam } = require('./agents');

const ROUTER_NAME = 'levi';
const KIT_DIR = path.join(__dirname, '..', '..', 'usecases');
// Rules every usecase follows; appended to each installed SKILL.md. Not a usecase: it is a file, not a folder.
const RUN_RULES_FILE = path.join(KIT_DIR, '_run-rules.md');

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

function parseList(value) {
  return (value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// A usecase can be the skill of team roles for one kind of task: `skill-for` (the roles),
// `skill-when` (the task, completing "When ...") and `skill-guide` (the file the role follows).
function loadRoleSkill(id, dir, data) {
  const roles = parseList(data['skill-for']);
  if (!roles.length) return null;
  const label = `usecases/${id}/SKILL.md`;
  if (!data['skill-when']) throw new Error(`${label}: skill-for needs skill-when`);
  if (!data['skill-guide']) throw new Error(`${label}: skill-for needs skill-guide`);
  if (!fs.existsSync(path.join(dir, data['skill-guide']))) throw new Error(`${label}: skill-guide "${data['skill-guide']}" not found`);
  return { roles, when: data['skill-when'], guide: data['skill-guide'] };
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
  const requires = parseList(data.requires);
  return { id, dir, description: data.description, requires, skill: loadRoleSkill(id, dir, data), agents: loadAgents(id, dir) };
}

// A usecase may build on others (`requires:` in its SKILL.md); they must exist in the kit.
// Role skills must name roles the team has.
function checkSkillRoles(usecases, team) {
  const roles = new Set(team.map((a) => a.name.slice(PREFIX.length)));
  for (const u of usecases) {
    for (const role of (u.skill && u.skill.roles) || []) {
      if (!roles.has(role)) throw new Error(`usecases/${u.id}/SKILL.md: skill-for names unknown team role "${role}"`);
    }
  }
}

function checkRequires(usecases) {
  const ids = new Set(usecases.map((u) => u.id));
  for (const u of usecases) {
    for (const r of u.requires) {
      if (r === u.id || !ids.has(r)) throw new Error(`usecases/${u.id}/SKILL.md: requires unknown usecase "${r}"`);
    }
  }
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
  checkRequires(usecases);
  checkSkillRoles(usecases, team);
  const runRules = fs.existsSync(RUN_RULES_FILE) ? fs.readFileSync(RUN_RULES_FILE, 'utf8').trim() : '';
  return { usecases, team, runRules };
}

function listUsecases() {
  return loadKit().usecases;
}

module.exports = { PREFIX, ROUTER_NAME, kitVersion, skillName, loadKit, listUsecases };
