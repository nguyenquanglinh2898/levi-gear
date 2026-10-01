# davinci

An agentic kit for AI agents. Each **usecase** is a self-contained workflow (a skill, optionally with subagents) that gets installed for Claude Code, Codex and GitHub Copilot.

Requires Node.js 18 or newer. There are no runtime dependencies.

## Install into a project

```bash
npx davinci@latest init                      # all usecases, all tools
npx davinci@latest init brainstorming        # only some usecases
npx davinci@latest init --tools claude,codex # only some tools
```

Installed files are recorded in `.davinci.json`. Commit the generated folders and `.davinci.json` so teammates get everything by cloning.

## Commands

| Command | What it does |
|---|---|
| `davinci init [usecase...] [--tools claude,codex,copilot]` | Install usecases (all by default) for the chosen tools |
| `davinci update` | Refresh installed usecases to this package version |
| `davinci list` | List usecases in the kit and print how to invoke them |

## Using it

davinci only runs when you ask for it. A prompt that does not start with the davinci command is handled by your tool as usual.

| Tool | Let davinci pick the usecase | Call a usecase directly |
|---|---|---|
| Claude Code | `/davinci <request>` | `/davinci-<usecase> <request>` |
| Copilot | `/davinci <request>` | `/davinci-<usecase> <request>` |
| Codex | `$davinci <request>` | `$davinci-<usecase> <request>` |

Codex has no user-defined `/` commands in a repo, so it uses `$` instead. `davinci init`, `update` and `list` print the right syntax for the tools you installed.

`davinci <request>` is an entry point generated at install time from the installed usecases. It matches the request (in any language) against each usecase description, asks you when two fit equally, and tells you when none fits.

## Update

```bash
npx davinci@latest update
```

Reinstalls every installed usecase from the latest package and removes usecases that were dropped from the kit.

## Where things go

| Tool | Skill | Subagents |
|---|---|---|
| Claude Code | `.claude/skills/davinci/`, `.claude/skills/davinci-<usecase>/` | `.claude/agents/davinci-<usecase>-<role>.md` |
| Codex | `.agents/skills/davinci/`, `.agents/skills/davinci-<usecase>/` | `.codex/agents/davinci-<usecase>-<role>.toml` |
| Copilot | reads `.claude/skills` and `.agents/skills` (gets `.agents/skills` itself only if Claude is not selected) | `.github/agents/davinci-<usecase>-<role>.agent.md` |

## Authoring a usecase

```
usecases/<id>/
  SKILL.md              # entry point; frontmatter name: davinci-<id>, description
  references/, scripts/ # optional, copied along with the skill
  agents/<role>.md      # optional subagents; frontmatter name: davinci-<id>-<role>, description
```

- Every usecase is manual-only: the installer sets `disable-model-invocation: true` in the installed `SKILL.md` (Claude Code, Copilot) and writes `agents/openai.yaml` with `allow_implicit_invocation: false` (Codex). The tool never triggers it by itself.
- The `description` in `SKILL.md` is what the `davinci` entry point reads to choose between usecases, so state precisely what the usecase does and which requests it fits. English is fine; requests in other languages are matched by meaning.
- The entry point reads a chosen usecase's `SKILL.md` directly, because manual-only skills cannot be called through a skill tool. Keep the workflow in that file.
- The installer appends a note to each subagent description so the tool delegates to it only through its usecase.
- Subagent files use the same format for every tool; the installer converts them (Codex needs TOML).
- Write everything in the repo in English: usecase files, code, comments and docs. Requests to the entry point can still be in any language.
- Test in a scratch project with `node /path/to/davinci/bin/davinci.js init`, then `npm version <patch|minor>` and `npm publish`.

## Customize

`davinci-*` files belong to the kit and are overwritten on update. To change one, copy it to a name without the `davinci-` prefix and edit that copy. A copy is no longer managed by davinci: it is not manual-only unless you set that yourself, and `/davinci` does not list it.

## Contributing

Commit messages, branch names and pull requests are written in English, using short conventional prefixes (`feat:`, `fix:`, `docs:`).

## Status

The installer is tested by installing into a scratch project and inspecting the generated files. It has not yet been verified inside the real Claude Code, Codex and Copilot clients: the invocation syntax and the manual-only flags follow their documentation.
