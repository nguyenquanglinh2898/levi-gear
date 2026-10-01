const { skillName } = require('./usecases');

// Builds the SKILL.md of the `davinci` entry point for one skill directory. Usecase skills
// are manual-only, so the router cannot call them through the tool's skill mechanism; it
// reads their SKILL.md by path instead.
function renderRouter(skillDir, usecases) {
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
   - Two or more fit about equally: ask the user which one, with a single question, and wait.
   - One clearly fits: say which one you chose in one line.
3. Read that usecase's file and follow it, treating the request as its input. Resolve relative paths in that file from its own directory. Do not call it through a skill tool: usecases are manual-only.
4. Use the usecase's subagents (\`${skillName('<usecase>')}-<role>\`) only as that usecase instructs.
`;
}

module.exports = { renderRouter };
