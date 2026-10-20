## Run rules

These rules apply to every levi usecase, in every tool. Where they disagree with a step above about asking the user, they win. The user is often away from the keyboard: a run that stops half-way to ask something stays stopped.

### Ask first, then run alone

1. Start with a cheap discovery pass: read the request, the matching specs, plans and designs and the project, and call the agents that only frame or analyze. Do no expensive work (writing, coding, drawing, testing) before it is done.
2. From that pass, build the whole list of questions: what is missing, unclear or contradictory; every candidate to confirm (which spec, plan or design to reuse); every irreversible or externally visible step (deleting, publishing, pushing, deploying, spending money).
3. Ask them all in one round (several question calls back to back when the tool limits how many fit in one). Each has two to four options, the recommended one first. Say in the same message that the run continues on its own after the answers.
4. Then do not ask again. A question that comes up later is parked: carry on with everything that does not depend on it, and give all parked questions together at the end, with the assumption used meanwhile. Stop early only when nothing is left to do without the answer.

Ask only about a fact only the user knows (business rules, data, credentials), scope or acceptance criteria, an irreversible or externally visible action, or a pick where a wrong guess wastes a large part of the work. Anything else is a choice.

### Choices are picked, not asked

When the work yields several acceptable options and picking one can be undone cheaply (four logo variants, a layout, a palette, a name, a wording, equal libraries), do not wait for the user. Take the recommended option, or the best by your own judgment, and keep going.

- Record each choice in its own small file `docs/levi/<slug>/choices/<who>-<topic>.md` (one file per choice, so agents working in parallel never write the same file): what was chosen between, the pick, why, the alternatives and how to switch. Without a work folder, keep the list in your notes. Every agent may write there; agents record their own choices, and the usecase records the choices it makes itself.
- Keep the rejected options reachable: files go in an `alternatives/` folder next to the deliverable; anything else is described in the entry.
- Before cleaning up the work folder, read `choices/`. Close the final report with the section "Choices I made for you": each choice, the pick, the alternatives, how to change it, and that the user can change any of them. Do this even when the run ends early (blocked, stalled, parked questions).

### Quota guard

Applies to every run with more than one stage. You are on Claude Code, Codex or another tool; the steps differ only where marked. Script paths are relative to this skill's folder.

1. At every stage boundary (after a stage, before dispatching the next agents, before each build round) run `node scripts/quota-check.mjs check --tool <claude|codex>` from this skill's folder and read its JSON. `atThreshold` means 95% or more of the 5-hour window is used.
2. **Usage unknown** (`status: unknown`: Claude Code without the statusline bridge, API-key billing, Copilot): arm the resume job once, right after the opening questions are answered, and keep it until the run ends.
3. **At the threshold:** finish the step in progress, make sure the checkpoint is written (Codex: `run.json`; the work folder holds the rest), and arm the resume job if it is not armed. Then keep working; the job matters only if the limit really interrupts the run.
4. **Arming** the job, with this exact prompt: `I ran out of quota a moment ago and the run was interrupted. Please continue the process or workflow you were running.`
   - *Claude Code:* `CronList` first, to avoid a duplicate; then `CronCreate` (load it with `ToolSearch` if it is deferred), recurring, cron `7 */2 * * *`, with that prompt.
   - *Codex, when this session has a scheduled-task tool* (the Codex app lists such tasks under "Scheduled"): list the existing scheduled tasks first, to avoid a duplicate, then create one that repeats every 2 hours with that prompt, attached to this thread.
   - *Codex, without such a tool:* `node scripts/quota-check.mjs cron-arm --session <sessionId from check> --project <project root> -- <the approval and sandbox flags of this session, for example --full-auto>`. It writes a crontab line every 2 hours; the line does nothing while the quota is used up, removes itself before it resumes the session, and puts itself back if the resume fails. Pass on its `warning` to the user.
   - *No way to arm* (no scheduler tool, Copilot): tell the user in your next message that the run will not resume on its own, and go on.
5. **When that prompt arrives, the job has fired and you are the resumed run.** Find what was interrupted (Codex: a `docs/levi/*/run.json` that is not complete; Claude Code: your own context and the work folder; for a Workflow run, stop the old run and continue it with `resumeFromRunId`) and continue from the recorded stage without repeating finished stages. If nothing was interrupted, delete the job and say there is nothing to resume.
   - *Claude Code:* run `check`. When usage is known and below the threshold, delete the job (`CronList`, then `CronDelete` the one with this prompt); when it is at the threshold or unknown, keep it.
   - *Codex with a scheduled-task tool:* the same as Claude Code: delete the task when usage is known and below the threshold.
   - *Codex with the crontab job:* nothing to delete; the crontab line already removed itself.
6. **When the run ends** (done, blocked or stalled), remove the job: Claude Code `CronDelete`; Codex delete the scheduled task (when the tool cannot delete, name the task in the final report so the user removes it from the Scheduled list; a firing that finds nothing interrupted only says so), or for the crontab job run `node scripts/quota-check.mjs cron-disarm --session <sessionId>`.
