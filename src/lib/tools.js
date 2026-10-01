const TOOLS = ['claude', 'codex', 'copilot'];

// `invoke` is the character that starts an explicit skill call in each tool.
const TOOL_INFO = {
  claude: { label: 'Claude Code', invoke: '/' },
  codex: { label: 'Codex', invoke: '$' },
  copilot: { label: 'Copilot', invoke: '/' },
};

// Claude Code reads only .claude/skills; Codex reads .agents/skills; Copilot reads both
// of those, so it only needs its own copy when Claude is not selected.
function skillDirs(tools) {
  const dirs = new Set();
  if (tools.includes('claude')) dirs.add('.claude/skills');
  if (tools.includes('codex')) dirs.add('.agents/skills');
  if (tools.includes('copilot') && !tools.includes('claude')) dirs.add('.agents/skills');
  return [...dirs];
}

// Codex ignores SKILL.md frontmatter flags and reads its invocation policy from this file.
const CODEX_SKILL_DIR = '.agents/skills';
const CODEX_POLICY = 'policy:\n  allow_implicit_invocation: false\n';

// Subagents are picked from their description, so tie them to their usecase to keep the
// agent from reaching for them on requests that did not go through davinci.
function agentDescription(agent) {
  return `${agent.description} Used only when the ${agent.skill} workflow delegates to it; never select it for other requests.`;
}

function tomlString(text) {
  return '"""\n' + text.replace(/\\/g, '\\\\').replace(/"""/g, '\\"""').trim() + '\n"""';
}

function renderMarkdown(agent) {
  return [
    '---',
    `name: ${agent.name}`,
    `description: ${JSON.stringify(agentDescription(agent))}`,
    '---',
    '',
    agent.body.trim(),
    '',
  ].join('\n');
}

function renderToml(agent) {
  return [
    `name = ${JSON.stringify(agent.name)}`,
    `description = ${JSON.stringify(agentDescription(agent))}`,
    `developer_instructions = ${tomlString(agent.body)}`,
    '',
  ].join('\n');
}

const AGENT_TARGETS = {
  claude: { dir: '.claude/agents', ext: '.md', render: renderMarkdown },
  codex: { dir: '.codex/agents', ext: '.toml', render: renderToml },
  copilot: { dir: '.github/agents', ext: '.agent.md', render: renderMarkdown },
};

function invocationHelp(tools) {
  return tools
    .map((tool) => {
      const { label, invoke } = TOOL_INFO[tool];
      return `  ${label.padEnd(11)} ${invoke}davinci <request>    ${invoke}davinci-<usecase> <request>`;
    })
    .join('\n');
}

module.exports = { TOOLS, CODEX_SKILL_DIR, CODEX_POLICY, skillDirs, AGENT_TARGETS, invocationHelp };
