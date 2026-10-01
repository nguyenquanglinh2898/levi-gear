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

// Subagents are picked from their description, so scope them to davinci to keep the agent
// from reaching for them on requests that did not go through davinci.
function agentDescription(agent) {
  const by = agent.owner ? `the ${agent.owner} workflow` : 'a davinci workflow';
  const text = /[.!?]$/.test(agent.description) ? agent.description : `${agent.description}.`;
  return `${text} Used only when ${by} delegates to it; never select it for other requests.`;
}

// Tool-neutral capabilities and model tiers (see agents.js), mapped per tool. Omitting `tools`
// keeps the tool's defaults, including MCP servers, which an explicit list would cut off.
const CLAUDE_TOOLS = { read: ['Read', 'Grep', 'Glob'], edit: ['Edit', 'Write'], execute: ['Bash'], web: ['WebFetch', 'WebSearch'] };
const COPILOT_TOOLS = { read: ['read', 'search'], edit: ['edit'], execute: ['execute'], web: ['web'] };
const CLAUDE_MODELS = { strong: 'opus', standard: 'sonnet', fast: 'haiku' };
const CODEX_EFFORT = { strong: 'high', standard: 'medium', fast: 'low' };

function mapTools(tools, table) {
  return tools.flatMap((t) => table[t]);
}

function tomlString(text) {
  return '"""\n' + text.replace(/\\/g, '\\\\').replace(/"""/g, '\\"""').trim() + '\n"""';
}

function renderMarkdown(agent, extra) {
  return ['---', `name: ${agent.name}`, `description: ${JSON.stringify(agentDescription(agent))}`, ...extra, '---', '', agent.body.trim(), ''].join(
    '\n'
  );
}

function renderClaude(agent) {
  const extra = [];
  if (agent.tools) extra.push(`tools: ${mapTools(agent.tools, CLAUDE_TOOLS).join(', ')}`);
  if (agent.model) extra.push(`model: ${CLAUDE_MODELS[agent.model]}`);
  return renderMarkdown(agent, extra);
}

// Copilot model names change often, so agents keep the user's selected model.
function renderCopilot(agent) {
  const extra = agent.tools ? [`tools: ${JSON.stringify(mapTools(agent.tools, COPILOT_TOOLS))}`] : [];
  return renderMarkdown(agent, extra);
}

// Codex has no per-tool list: an agent that can neither edit nor execute runs read-only.
function renderToml(agent) {
  const lines = [`name = ${JSON.stringify(agent.name)}`, `description = ${JSON.stringify(agentDescription(agent))}`];
  if (agent.model) lines.push(`model_reasoning_effort = "${CODEX_EFFORT[agent.model]}"`);
  if (agent.tools) {
    const writes = agent.tools.includes('edit') || agent.tools.includes('execute');
    lines.push(`sandbox_mode = "${writes ? 'workspace-write' : 'read-only'}"`);
  }
  lines.push(`developer_instructions = ${tomlString(agent.body)}`, '');
  return lines.join('\n');
}

const AGENT_TARGETS = {
  claude: { dir: '.claude/agents', ext: '.md', render: renderClaude },
  codex: { dir: '.codex/agents', ext: '.toml', render: renderToml },
  copilot: { dir: '.github/agents', ext: '.agent.md', render: renderCopilot },
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
