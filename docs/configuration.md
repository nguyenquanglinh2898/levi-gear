# Configuration and file layout

## .levi.json

levi keeps its state in `.levi.json` at the project root. There is nothing to configure by hand: `init` and `update` write it. Commit it.

```json
{
  "version": "0.1.0",
  "tools": ["claude", "codex", "copilot"],
  "usecases": {
    "brainstorming": {
      "files": {
        ".claude/skills/levi-brainstorming/SKILL.md": "3b1f...e9",
        ".claude/skills/levi-brainstorming/...": "..."
      }
    }
  },
  "router": { "files": { ".claude/skills/levi/SKILL.md": "a07c...41" } },
  "team": { "files": { ".claude/agents/levi-pm.md": "5d22...b0" } }
}
```

| Field | Meaning |
|---|---|
| `version` | The package version that last wrote the file |
| `tools` | The tools installed for. `update` keeps using these |
| `usecases.<id>.files` | Each file written for that usecase: its project-relative path and the SHA-256 of the content when levi wrote it |
| `router.files` | Files of the generated `levi` entry point |
| `team.files` | The team agent files |

The hash is how `update` tells your edits from untouched files. A path that is not listed in `.levi.json` is not managed by levi, and `update` will not overwrite or delete it.

Do not edit the hashes. Changing one makes `update` misjudge the file. To release a file from levi, see [Customization](customization.md#keeping-a-file-out-of-levi's-control).

Configs from early versions listed files as an array without hashes. They still load; every file in such a config that differs from the kit counts as changed by you until you run `levi update --force`, after which hashes are recorded. See [Troubleshooting](troubleshooting.md).

## Where files are written

### Skills

| Tool | Location |
|---|---|
| Claude Code | `.claude/skills/levi/` and `.claude/skills/levi-<usecase>/` |
| Codex | `.agents/skills/levi/` and `.agents/skills/levi-<usecase>/` |
| Copilot | Reads `.claude/skills` and `.agents/skills`. levi writes `.agents/skills` for it only when Claude Code is not also selected |

So the skill folders written depend on your tool selection:

| `--tools` | Skill folders written |
|---|---|
| `claude` | `.claude/skills` |
| `codex` | `.agents/skills` |
| `copilot` | `.agents/skills` |
| `claude,copilot` | `.claude/skills` |
| `codex,copilot` | `.agents/skills` |
| `claude,codex` or all three | `.claude/skills` and `.agents/skills` |

A skill folder holds the usecase's `SKILL.md` plus everything else in the usecase folder except `agents/` (references, scripts). In `.agents/skills`, levi also writes `agents/openai.yaml` for Codex.

### Subagents

| Tool | Location | Format |
|---|---|---|
| Claude Code | `.claude/agents/levi-<usecase>-<role>.md` | Markdown with frontmatter |
| Codex | `.codex/agents/levi-<usecase>-<role>.toml` | TOML |
| Copilot | `.github/agents/levi-<usecase>-<role>.agent.md` | Markdown with frontmatter |

Team agents follow the same pattern without the usecase: `levi-<role>`, for example `.claude/agents/levi-pm.md`.

## Manual-only flags

Every levi skill is installed so the tool never triggers it on its own:

| Tool | How |
|---|---|
| Claude Code, Copilot | `disable-model-invocation: true` in the installed `SKILL.md` frontmatter |
| Codex | `agents/openai.yaml` next to the skill with `policy: allow_implicit_invocation: false` |

This is why the entry point reads a usecase's `SKILL.md` by path rather than calling it through a skill tool: manual-only skills cannot be called that way.

## How agent fields are converted

Usecase and team agent source files use one tool-neutral format. The installer converts it per tool.

| Field | Values | Claude Code | Codex | Copilot |
|---|---|---|---|---|
| `tools` | `read`, `edit`, `execute`, `web`; omit for the tool's defaults | `Read, Grep, Glob` / `Edit, Write` / `Bash` / `WebFetch, WebSearch` | `sandbox_mode = "read-only"` without `edit` and `execute`, else `"workspace-write"` | `read, search` / `edit` / `execute` / `web` |
| `model` | `strong`, `standard`, `fast`; omit to inherit | `opus` / `sonnet` / `haiku` | `model_reasoning_effort` `high` / `medium` / `low` | not set (keeps your model) |

An explicit `tools` list also cuts off MCP tools on Claude Code and Copilot. That is why `levi-developer` and `levi-qa` leave `tools` out: they may need a browser or other MCP servers.

## Work folders

Not part of the install. The usecases and team write their working files into your project while they run, by default under `docs/levi/<slug>/`, and usecase deliverables into their own folder (for example `docs/brainstorming/`). See [The team](team.md#the-work-folder).
