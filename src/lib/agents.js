const fs = require('fs');
const path = require('path');
const { parse } = require('./frontmatter');

const PREFIX = 'levi-';
const TEAM_DIR = path.join(__dirname, '..', '..', 'agents');
// Files in agents/ starting with "_" are not agents: they are appended to every team agent.
const PARTIAL = '_';

// Tool-neutral fields. The installer maps them to each tool in tools.js.
const CAPABILITIES = ['read', 'edit', 'execute', 'web'];
const MODEL_TIERS = ['strong', 'standard', 'fast'];

function parseList(value) {
  return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : null;
}

// Reads one agent file. `owner` is the skill that delegates to it, or null for team agents.
function readAgent(file, label, expectedName, owner, appendix = '') {
  const { data, body } = parse(fs.readFileSync(file, 'utf8'));
  if (data.name !== expectedName) {
    throw new Error(`${label}: name must be "${expectedName}", got "${data.name}"`);
  }
  if (!data.description) throw new Error(`${label}: missing description`);
  const tools = parseList(data.tools);
  const badTools = (tools || []).filter((t) => !CAPABILITIES.includes(t));
  if (badTools.length) {
    throw new Error(`${label}: unknown tools ${badTools.join(', ')}; use ${CAPABILITIES.join(', ')}`);
  }
  if (data.model && !MODEL_TIERS.includes(data.model)) {
    throw new Error(`${label}: unknown model "${data.model}"; use ${MODEL_TIERS.join(', ')}`);
  }
  return {
    name: data.name,
    description: data.description,
    body: appendix ? `${body.trim()}\n\n${appendix.trim()}\n` : body,
    owner,
    tools,
    model: data.model || null,
  };
}

function loadTeam() {
  if (!fs.existsSync(TEAM_DIR)) return [];
  const files = fs.readdirSync(TEAM_DIR).filter((f) => f.endsWith('.md')).sort();
  const appendix = files
    .filter((f) => f.startsWith(PARTIAL))
    .map((f) => fs.readFileSync(path.join(TEAM_DIR, f), 'utf8'))
    .join('\n\n');
  return files
    .filter((f) => !f.startsWith(PARTIAL))
    .map((f) => readAgent(path.join(TEAM_DIR, f), `agents/${f}`, PREFIX + f.slice(0, -3), null, appendix));
}

module.exports = { PREFIX, CAPABILITIES, MODEL_TIERS, readAgent, loadTeam };
