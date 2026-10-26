# Unattended runs

You are often not at the keyboard while a usecase runs. Every usecase follows three rules so that it does not stop half-way for you. They are written once, in `usecases/_run-rules.md`, and the installer appends them to every installed `SKILL.md`.

## 1. Everything is asked up front

A run starts with a cheap discovery pass: it reads the request, the matching specs, plans and designs and the project, and calls the agents that only frame or analyze. From that it builds the whole list of what is missing, unclear or contradictory, which existing spec, plan or design to reuse, and every step that cannot be undone or that others can see (deleting, publishing, pushing, deploying, spending money). It asks all of it in **one round**, then tells you that the run now continues on its own.

After that round it does not ask again. A question that comes up later is parked: everything that does not depend on it goes on, and the parked questions come back together at the end, with the assumption used meanwhile.

It asks only about facts only you know, scope and acceptance criteria, irreversible or visible actions, and picks where a wrong guess would waste a large part of the work. Everything else is a choice.

## 2. Choices are picked, not asked

When the work yields several acceptable options and a pick is cheap to undo (four logo variants, a layout, a palette, a name, a wording), the run takes the recommended option, or the best by its own judgment, and goes on. It records each pick in `docs/levi/<slug>/choices/<who>-<topic>.md` (what was chosen between, the pick, why, the alternatives, how to switch) and keeps the rejected options reachable, for files in an `alternatives/` folder next to the deliverable.

The final report ends with **Choices I made for you**: every choice, the pick, the alternatives and how to change it. You change what you disagree with; nothing else is needed. The list is given even when the run ends early.

## 3. The quota guard

A run with more than one stage checks how much of the 5-hour usage window is used at every stage boundary (`scripts/quota-check.mjs check`, in every skill folder). At **95% or more** it finishes the step in progress, writes its checkpoint, writes the handoff report `docs/breakpoints/handoff.md` (see below), arms a job that resumes the run every 2 hours, and keeps working. If the limit then stops the run, the job fires once the quota is back and sends:

> I ran out of quota a moment ago and the run was interrupted. Please continue the process or workflow you were running.

The resumed run continues from its recorded stage without repeating finished ones, and the job is removed: by the resumed run on Claude Code (once usage is below 95%), by the job itself on Codex, and in any case when the run ends.

| | Claude Code | Codex |
|---|---|---|
| Reads the usage from | A file the statusline writes (setup below) | The newest session file in `~/.codex/sessions`, nothing to set up |
| Job | `CronCreate`, recurring `7 */2 * * *`, inside the session | The scheduled task of the Codex app (every 2 hours, on the thread) when the session has the tool; otherwise a `crontab` line every 2 hours that runs `codex exec resume <session>` |
| Needs | The session to stay open (it does while waiting for the limit) | The app open, or for crontab a running cron daemon |
| Copilot | No way to read the quota or to schedule: the run says so and goes on | |

**When the usage cannot be read** (Claude Code without the setup below, or with API-key billing), the run arms the same job right after the opening questions, so you are covered anyway, and removes it when the run ends.

### The handoff report

At the 95% threshold the run also writes one file, `docs/breakpoints/handoff.md`. It is always that single file, and each new interruption overwrites it whole (still-unfinished items are carried over). It starts with a status line (`interrupted` or `complete`) and holds the goal and your answers, the project context, a stage table (done, in progress, not started), the deliverables and decisions so far, the ordered next steps, the state of the files, open items, and how to continue. It is written for a reader with no other context, so the session that resumes after the reset, or a different AI agent on another platform that you hand the file to, needs nothing else to carry on. The resumed run reads it first; when the run ends it overwrites the file with `Status: complete`. It never contains secrets.

### Setting up the statusline (Claude Code, once)

Claude Code shows the usage only to the statusline command. Point it at the helper, which saves the number to `~/.claude/levi-quota.json` (or `$CLAUDE_CONFIG_DIR`) and prints `5h 42%`. In your Claude Code settings:

```json
{ "statusLine": { "type": "command", "command": "node /abs/path/to/.claude/skills/levi-brainstorming/scripts/quota-check.mjs record" } }
```

To keep a statusline you already have, pipe into it: `node .../quota-check.mjs record --passthrough | <your command>`. Any levi skill folder has the same helper. It works for Pro and Max plans only; the number appears after the session's first response.

### Good to know

- Claude Code can also wait out the limit by itself ("Continue automatically at usage limit" in `/config`). The job is the backup for when that stops, for example after two limit hits in a row.
- A scheduled prompt that fires while the limit is still on may fail; it is tried again 2 hours later.
- On WSL, cron does not start by itself unless systemd is enabled. `cron-arm` warns when no cron daemon is running.
- The Codex job uses the approval and sandbox flags the run passes to `cron-arm` (for example `--full-auto`); without them a resumed `codex exec` runs with Codex's defaults.
- `node scripts/quota-check.mjs check --tool codex` prints the current usage as JSON, which is handy to test the setup. `cron-disarm --session <id>` removes a job by hand.
