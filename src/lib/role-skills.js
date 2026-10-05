const { PREFIX, joinSections } = require('./agents');

// A usecase can be the skill a team role uses for one kind of task (`skill-for` in its SKILL.md).
// The team agent gets a section that points to the skill's guide, so that it follows the guide
// whichever usecase calls it, not only when its own usecase runs.
function withRoleSkills(agent, usecases, skillDir) {
  const role = agent.name.slice(PREFIX.length);
  const mine = usecases.filter((u) => u.skill && u.skill.roles.includes(role));
  if (!mine.length) return agent;
  const rows = mine.map((u) => `| When ${u.skill.when} | \`${skillDir}/${PREFIX}${u.id}/${u.skill.guide}\` |`);
  const section = [
    '## Your skills',
    '',
    'These levi skills are yours. When a task you are given is one of the kinds below, read the guide before you start and follow it, whichever workflow called you and even when the prompt does not mention it. Paths in a guide are relative to its skill folder. The prompt still decides what to work on, which sources to use and where to write; where it says something the guide also covers, the prompt wins.',
    '',
    '| Task | Guide |',
    '|---|---|',
    ...rows,
  ].join('\n');
  return { ...agent, body: joinSections(agent.ownBody, section, agent.appendix) };
}

module.exports = { withRoleSkills };
