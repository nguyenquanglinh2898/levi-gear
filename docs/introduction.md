# Introduction

levi is an npm package that installs **Agent Skills** and **subagents** into a project, so that Claude Code, Codex and GitHub Copilot can run the same team workflows. It has no runtime dependencies and needs Node.js 18 or newer.

## The pieces

| Piece | What it is | Who runs it |
|---|---|---|
| **Usecase** | A self-contained workflow, written as a skill (`SKILL.md`), optionally with its own subagents and reference files. Example: `brainstorming`. | You, by calling it |
| **Team agents** | Five shared role agents (PM, teamlead, developer, designer, QA) that usecases delegate to. | A usecase, never you directly |
| **Entry point** | A generated skill named `levi` that reads your request and runs the best matching usecase. | You, by calling it |
| **`.levi.json`** | A record of what was installed and a hash of each file, so updates never overwrite your edits. | The CLI |

A usecase is the *what*: the steps to follow. The team is the *who*: the roles that carry the steps out. The usecase's skill runs the team by calling each member in turn.

## Design principles

**Manual only.** levi never runs by itself. Every installed skill is marked so that the tool does not trigger it on its own. A prompt that does not start with the levi command is handled by your tool as usual.

**One kit, three tools.** You write a usecase once. The installer converts it for each tool: skill folders for all three, subagent files in Markdown for Claude Code and Copilot, TOML for Codex.

**Your files are yours.** Installed files are plain files in your repository. You can edit them. `levi update` keeps every file you changed and only refreshes the ones you did not touch.

**Files as the hand-off.** Team members do not see each other's conversation. They pass work through files in a work folder. See [The team](team.md).

## How a request flows

```text
you:  /levi break "export orders as CSV" into tasks
        │
        ▼
 levi (entry point)  ── matches the request to a usecase description
        │
        ▼
 levi-brainstorming  ── the usecase's SKILL.md is the workflow
        │   calls in turn
        ├──▶ levi-pm        frames the problem
        ├──▶ levi-teamlead  explores approaches, breaks down the work
        └──▶ levi-pm        writes the final plan
        │
        ▼
 docs/brainstorming/export-orders-csv.md
```

You can skip the entry point and call the usecase directly: `/levi-brainstorming <request>`.

## Supported tools

| Tool | Skills read from | Subagents written to |
|---|---|---|
| Claude Code | `.claude/skills/` | `.claude/agents/` |
| Codex | `.agents/skills/` | `.codex/agents/` |
| GitHub Copilot | `.claude/skills/` and `.agents/skills/` | `.github/agents/` |

You choose which tools to install for. See [Installation](installation.md).
