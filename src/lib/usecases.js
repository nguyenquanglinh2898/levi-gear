const fs = require('fs');
const path = require('path');
const { parse } = require('./frontmatter');

const PREFIX = 'davinci-';
const ROUTER_NAME = 'davinci';
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
    .map((file) => {
      const raw = fs.readFileSync(path.join(agentsDir, file), 'utf8');
      const { data, body } = parse(raw);
      const expected = `${skillName(id)}-${file.slice(0, -3)}`;
      if (data.name !== expected) {
        throw new Error(`usecases/${id}/agents/${file}: name must be "${expected}", got "${data.name}"`);
      }
      if (!data.description) {
        throw new Error(`usecases/${id}/agents/${file}: missing description`);
      }
      return { name: data.name, description: data.description, body, skill: skillName(id) };
    });
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

function listUsecases() {
  if (!fs.existsSync(KIT_DIR)) return [];
  return fs
    .readdirSync(KIT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => load(e.name));
}

module.exports = { PREFIX, ROUTER_NAME, kitVersion, skillName, listUsecases };
