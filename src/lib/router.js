const { skillName } = require('./usecases');

// Builds the SKILL.md of the `davinci` entry point for one skill directory. Usecase skills
// are manual-only, so the router cannot call them through the tool's skill mechanism; it
// reads their SKILL.md by path instead.
function renderRouter(skillDir, usecases, team) {
  const teamNames = team.map((a) => `\`${a.name}\``).join(', ');
  const catalog = usecases
    .map((u) => `- **${u.id}**: ${u.description}\n  File: \`${skillDir}/${skillName(u.id)}/SKILL.md\``)
    .join('\n');
  return `---
name: davinci
description: ${JSON.stringify('Entry point of the davinci kit. Run only when the user explicitly invokes it with a request; picks the matching davinci usecase and runs it.')}
argument-hint: "<request>"
disable-model-invocation: true
---

# davinci

The request is whatever the user typed after invoking \`davinci\`. It may be written in any language; answer in the language the user used.

## Usecases

${catalog}

## Steps

1. If the request is empty, list the usecases above with one line each and ask what the user wants. Stop.
2. Pick the usecase whose description best matches the request.
   - No usecase fits: say so, list the available usecases, and stop. Do not improvise a substitute.
   - One or more fit: run the best match. When several fit about equally, take the one whose description names the request's main goal most specifically. Do not ask the user to choose.
   - Say which one you chose in one line, and when another was a close match, name it and add that \`/davinci-<usecase>\` runs it directly.
3. Read that usecase's file and follow it, treating the request as its input. Resolve relative paths in that file from its own directory. Do not call it through a skill tool: usecases are manual-only.
4. Use the usecase's subagents (\`${skillName('<usecase>')}-<role>\`)${teamNames ? ` and the davinci team agents (${teamNames})` : ''} only as that usecase instructs.
`;
}

module.exports = { renderRouter };
