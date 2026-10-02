# Authoring usecases

A usecase is a folder in the kit's `usecases/` directory. This page is for working on davinci itself. If you only use davinci in a project, see [Customization](customization.md).

## Layout

```text
usecases/<id>/
  SKILL.md              # entry point; frontmatter name: davinci-<id>, description
  references/, scripts/ # optional; copied along with the skill
  agents/<role>.md      # optional subagents; frontmatter name: davinci-<id>-<role>, description

agents/<role>.md        # team agents shared by all usecases; frontmatter name: davinci-<role>
agents/_*.md            # partials appended to every team agent
```

Everything in the usecase folder except `agents/` is copied into each tool's skill folder. `agents/` becomes subagent files in the formats each tool needs.

## SKILL.md

Frontmatter fields:

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | Must be exactly `davinci-<id>`, where `<id>` is the folder name |
| `description` | yes | What the usecase does and which requests fit it |
| `argument-hint` | no | Shown by tools that support it, for example `"<problem or idea>"` |

The installer adds `disable-model-invocation: true` to the installed copy.

The `description` is what the `davinci` entry point matches requests against, so state precisely what the usecase does and which requests it fits. English is fine; requests in other languages are matched by meaning.

The body is the workflow. Keep the workflow in this file: the entry point reads it directly, because manual-only skills cannot be called through a skill tool.

## Agents

Both usecase agents and team agents use this frontmatter:

| Field | Required | Values |
|---|---|---|
| `name` | yes | `davinci-<id>-<role>` for usecase agents; `davinci-<role>` for team agents |
| `description` | yes | What the agent does and when it is used |
| `tools` | no | Comma list of `read`, `edit`, `execute`, `web`. Omit for the tool's defaults |
| `model` | no | `strong`, `standard` or `fast`. Omit to inherit |

How these map to each tool: see [Configuration and file layout](configuration.md#how-agent-fields-are-converted).

Rules:

- An explicit `tools` list cuts off MCP tools on Claude Code and Copilot. Leave it out for agents that need a browser or other MCP servers.
- The installer appends a note to every subagent description so the tool delegates to it only through its usecase.
- A usecase id must not reuse a team role name (`pm`, `teamlead`, `developer`, `designer`, `qa`): `davinci-<id>` would name both a skill and an agent.
- Agent names must be unique across the whole kit.
- Files in `agents/` whose names start with `_` are not agents. They are appended to every team agent. `_team-protocol.md` is one.

## Delegating to the team

From the usecase's `SKILL.md`, call team agents by name (`davinci-pm`, `davinci-qa`, ...) and name the work folder they should use (`docs/davinci/<slug>/` by default). Team agents do not call each other, so the workflow sequences them.

Tell each agent the exact paths to read and write. Agents have no memory of the conversation: a fresh call sees only the prompt you give it.

## Validation

The kit is loaded and validated before every command writes anything. These fail with a message:

- `SKILL.md` missing, or `name` not equal to `davinci-<id>`, or `description` missing;
- an agent whose `name` does not match its file, with no `description`, with an unknown `tools` value or with an unknown `model` tier;
- the same agent name defined twice, or a usecase id equal to a team role.

## Conventions

- Write everything in the repository in English: usecase files, code, comments and docs. Requests to the entry point can still be in any language.
- Keep files focused; split a workflow into `references/` when it gets long.
- Do not add runtime dependencies. The CLI uses only Node's standard library.

## Test

There is no test suite. Test in a scratch project:

```bash
mkdir /tmp/scratch && cd /tmp/scratch
node /path/to/davinci/bin/davinci.js init
node /path/to/davinci/bin/davinci.js status
```

Inspect the generated files for each tool. Then change a generated file and run `status` and `update` to confirm that your edit is kept. When you can, run the usecase in each real client.

## Release

```bash
npm version <patch|minor>
npm publish
```

The package publishes only `agents`, `bin`, `src` and `usecases` (the `files` list in `package.json`). `docs/` is not part of the package.
