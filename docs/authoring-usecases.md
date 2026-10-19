# Authoring usecases

A usecase is a folder in the kit's `usecases/` directory. This page is for working on levi itself. If you only use levi in a project, see [Customization](customization.md).

## Layout

```text
usecases/<id>/
  SKILL.md              # entry point; frontmatter name: levi-<id>, description
  references/, scripts/ # optional; copied along with the skill
  agents/<role>.md      # optional subagents; frontmatter name: levi-<id>-<role>, description

agents/<role>.md        # team agents shared by all usecases; frontmatter name: levi-<role>
agents/_*.md            # partials appended to every team agent
```

Everything in the usecase folder except `agents/` is copied into each tool's skill folder. `agents/` becomes subagent files in the formats each tool needs.

## SKILL.md

Frontmatter fields:

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | Must be exactly `levi-<id>`, where `<id>` is the folder name |
| `description` | yes | What the usecase does and which requests fit it |
| `argument-hint` | no | Shown by tools that support it, for example `"<problem or idea>"` |
| `requires` | no | Comma list of usecase ids this one builds on, for example `spec-writing, brainstorming`. Installing this usecase installs them too |
| `skill-for` | no | Comma list of team roles (`qa`, `pm`, ...) this usecase is the skill of. See [Role skills](#role-skills) |
| `skill-when` | with `skill-for` | The kind of task, completing "When ...", for example `you write or change test cases or test scenarios` |
| `skill-guide` | with `skill-for` | Path of the guide the role follows, relative to the usecase folder, for example `references/test-case-guide.md` |

The installer adds `disable-model-invocation: true` to the installed copy.

The `description` is what the `levi` entry point matches requests against, so state precisely what the usecase does and which requests it fits. English is fine; requests in other languages are matched by meaning.

The body is the workflow. Keep the workflow in this file: the entry point reads it directly, because manual-only skills cannot be called through a skill tool.

To reuse another usecase, list it in `requires` and tell the workflow to read its `SKILL.md` in the sibling folder (`levi-<id>/SKILL.md`) and follow it. Installed skills sit side by side in each tool's skill folder.

A usecase may ship a Claude Code Workflow script (for example `workflow.js`) to run independent subagents from code. The tool calls it by its path in the skill folder. It is not a portable Node program. For Codex, write a durable runner in the skill (normally a focused reference) that uses the installed `scripts/codex-run-state.mjs` helper to persist the current stage and artifacts in `docs/levi/<slug>/run.json`; resume from that file, never from chat history. Short, read-only single-agent usecases can be retried safely instead. See `usecases/create-feature/`.

## Role skills

A usecase can be the skill a team role uses for one kind of task, in every usecase and not only its own: `generate-test-scenarios` is how `levi-qa` writes test cases, wherever it is asked to. Declare it in the frontmatter:

```yaml
skill-for: qa
skill-when: you write or change test cases or test scenarios, or record their results
skill-guide: references/test-case-guide.md
```

The installer then:

- installs the usecase with every install, since the team always is;
- adds a "Your skills" section to each named role's agent file, with the task and the guide's path in that tool's skill folder.

Write the guide so that it works on its own, whichever usecase calls the agent: what the prompt provides, the rules, the format of what the agent writes, and paths relative to the skill folder. Leave the workflow steps (asking the user, choosing files) in `SKILL.md`. Usecases that hand the role this task should point to the guide as well, and say only what is specific to them: the sources, the paths, what must be covered.

## Agents

Both usecase agents and team agents use this frontmatter:

| Field | Required | Values |
|---|---|---|
| `name` | yes | `levi-<id>-<role>` for usecase agents; `levi-<role>` for team agents |
| `description` | yes | What the agent does and when it is used |
| `tools` | no | Comma list of `read`, `edit`, `execute`, `web`. Omit for the tool's defaults |
| `model` | no | `strong`, `standard` or `fast`. Omit to inherit |

How these map to each tool: see [Configuration and file layout](configuration.md#how-agent-fields-are-converted).

Rules:

- An explicit `tools` list cuts off MCP tools on Claude Code and Copilot. Leave it out for agents that need a browser or other MCP servers.
- The installer appends a note to every subagent description so the tool delegates to it only through its usecase.
- A usecase id must not reuse a team role name (`pm`, `teamlead`, `developer`, `designer`, `qa`): `levi-<id>` would name both a skill and an agent.
- Agent names must be unique across the whole kit.
- Files in `agents/` whose names start with `_` are not agents. They are appended to every team agent. `_team-protocol.md` is one.

## Delegating to the team

From the usecase's `SKILL.md`, call team agents by name (`levi-pm`, `levi-qa`, ...) and name the work folder they should use (`docs/levi/<slug>/` by default). Team agents do not call each other, so the workflow sequences them.

Tell each agent the exact paths to read and write. Agents have no memory of the conversation: a fresh call sees only the prompt you give it.

## Validation

The kit is loaded and validated before every command writes anything. These fail with a message:

- `SKILL.md` missing, or `name` not equal to `levi-<id>`, or `description` missing;
- an agent whose `name` does not match its file, with no `description`, with an unknown `tools` value or with an unknown `model` tier;
- the same agent name defined twice, or a usecase id equal to a team role;
- a `requires` entry that names itself or a usecase missing from the kit;
- `skill-for` naming a role the team does not have, or without `skill-when` and `skill-guide`, or a `skill-guide` file that does not exist.

## Conventions

- Write everything in the repository in English: usecase files, code, comments and docs. Requests to the entry point can still be in any language.
- Keep files focused; split a workflow into `references/` when it gets long.
- Do not add runtime dependencies. The CLI uses only Node's standard library.

## Test

There is no repository-wide test suite. Test in a scratch project:

```bash
mkdir /tmp/scratch && cd /tmp/scratch
node /path/to/levi-gear/bin/levi.js init
node /path/to/levi-gear/bin/levi.js status
```

Inspect the generated files for each tool. Then change a generated file and run `status` and `update` to confirm that your edit is kept. When you can, run the usecase in each real client.

For a stateful Codex usecase, also interrupt a run in each nonterminal stage, start a fresh chat, run the usecase again and confirm it reads `run.json`, does not repeat completed artifacts, and resumes the recorded stage. Test `wait`, `block` and `resume`, as well as a completed run's cleanup.

## Release

```bash
npm version <patch|minor>
npm publish
```

The package publishes only `agents`, `bin`, `src` and `usecases` (the `files` list in `package.json`). `docs/` is not part of the package.
