# Configuration and file layout

## .levi.json

levi keeps its state in `.levi.json` at the project root. There is nothing to configure by hand: `init` and `update` write it. Commit it.

```json
{
  "version": "0.1.0",
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
| `usecases.<id>.files` | Each file written for that usecase: its project-relative path and the SHA-256 of the content when levi wrote it |
| `router.files` | Files of the generated `levi` entry point |
| `team.files` | The team agent files |

The hash is how `update` tells your edits from untouched files. A path that is not listed in `.levi.json` is not managed by levi, and `update` will not overwrite or delete it.

Do not edit the hashes. Changing one makes `update` misjudge the file. To release a file from levi, see [Customization](customization.md#keeping-a-file-out-of-levi's-control).

A `tools` field left by earlier versions is ignored and dropped on the next `init` or `update`.

Configs from early versions listed files as an array without hashes. They still load; every file in such a config that differs from the kit counts as changed by you until you run `levi update --force`, after which hashes are recorded. See [Troubleshooting](troubleshooting.md).

## Where files are written

### Skills

`.claude/skills/levi/` is the entry point and `.claude/skills/levi-<usecase>/` holds each usecase.

A skill folder holds the usecase's `SKILL.md` plus everything else in the usecase folder except `agents/` (references, scripts). Every skill folder also gets `scripts/quota-check.mjs`, the quota guard helper described in [Unattended runs](unattended-runs.md).

### Subagents

`.claude/agents/levi-<usecase>-<role>.md`, Markdown with frontmatter. Team agents follow the same pattern without the usecase: `levi-<role>`, for example `.claude/agents/levi-pm.md`.

## Manual-only flag

Every levi skill is installed so Claude Code never triggers it on its own: the installed `SKILL.md` frontmatter carries `disable-model-invocation: true`.

This is why the entry point reads a usecase's `SKILL.md` by path rather than calling it through a skill tool: manual-only skills cannot be called that way.

## How agent fields are converted

Usecase and team agent source files use a small neutral format. The installer converts it to Claude Code frontmatter.

| Field | Values | Claude Code |
|---|---|---|
| `tools` | `read`, `edit`, `execute`, `web`; omit for the defaults | `Read, Grep, Glob` / `Edit, Write` / `Bash` / `WebFetch, WebSearch` |
| `model` | `strong`, `standard`, `fast`; omit to inherit | `opus` / `sonnet` / `haiku` |

An explicit `tools` list also cuts off MCP tools. That is why `levi-developer` and `levi-qa` leave `tools` out: they may need a browser or other MCP servers.

## Leftovers from earlier versions

Earlier versions could also install for Codex and GitHub Copilot, into `.agents/skills/`, `.codex/agents/` and `.github/agents/`. The next `levi update` removes those files when you did not edit them and keeps (and reports) the ones you did.

## Work folders

Not part of the install. The usecases and team write their working files into your project while they run, by default under `docs/levi/<slug>/`, and usecase deliverables into their own folder (for example `docs/brainstorming/`). See [The team](team.md#the-work-folder).
