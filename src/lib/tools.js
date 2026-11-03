// levi installs for Claude Code only: skills go to .claude/skills, subagents to .claude/agents.
const SKILL_DIR = '.claude/skills';
const AGENT_DIR = '.claude/agents';

// Subagents are picked from their description, so scope them to levi to keep the agent
// from reaching for them on requests that did not go through levi.
function agentDescription(agent) {
  const by = agent.owner ? `the ${agent.owner} workflow` : 'a levi workflow';
  const text = /[.!?]$/.test(agent.description) ? agent.description : `${agent.description}.`;
  return `${text} Used only when ${by} delegates to it; never select it for other requests.`;
}

// Tool-neutral capabilities and model tiers (see agents.js), mapped to Claude Code. Omitting
// `tools` keeps the defaults, including MCP servers, which an explicit list would cut off.
const CLAUDE_TOOLS = { read: ['Read', 'Grep', 'Glob'], edit: ['Edit', 'Write'], execute: ['Bash'], web: ['WebFetch', 'WebSearch'] };
const CLAUDE_MODELS = { strong: 'opus', standard: 'sonnet', fast: 'haiku' };

function renderAgent(agent) {
  const extra = [];
  if (agent.tools) extra.push(`tools: ${agent.tools.flatMap((t) => CLAUDE_TOOLS[t]).join(', ')}`);
  if (agent.model) extra.push(`model: ${CLAUDE_MODELS[agent.model]}`);
  return ['---', `name: ${agent.name}`, `description: ${JSON.stringify(agentDescription(agent))}`, ...extra, '---', '', agent.body.trim(), ''].join('\n');
}

const INVOCATION_HELP = '  /levi <request>    /levi-<usecase> <request>';

module.exports = { SKILL_DIR, AGENT_DIR, renderAgent, INVOCATION_HELP };
