# Codex runner

Run this workflow from the project root with a durable checkpoint. Do not reconstruct a stopped planning run from chat history.

```bash
node <this skill folder>/scripts/codex-run-state.mjs status docs/levi/<slug>
node <this skill folder>/scripts/codex-run-state.mjs init docs/levi/<slug> brainstorming <slug> frame explore decide finalize plan review verify
```

```bash
node <this skill folder>/scripts/codex-run-state.mjs begin docs/levi/<slug> <stage>
node <this skill folder>/scripts/codex-run-state.mjs complete docs/levi/<slug> <stage> <artifact>...
node <this skill folder>/scripts/codex-run-state.mjs wait docs/levi/<slug> <stage> "<questions>"
node <this skill folder>/scripts/codex-run-state.mjs block docs/levi/<slug> <stage> "<blocker>"
node <this skill folder>/scripts/codex-run-state.mjs resume docs/levi/<slug>
```

Create the state after intake has derived the slug. On every new or resumed turn, read `status` first. Call `begin` for the current stage and `complete` only when its required artifact exists. Use `wait` for the single consolidated user-question round, `block` for a dependency outside the project, and `resume` once resolved. Completed stages are never repeated.

- `frame`: find the optional read-only spec and have `levi-pm` write `brief.md` when no spec exists.
- `explore`: `levi-teamlead` writes `architecture.md` from the basis.
- `decide`: collect the PM/teamlead questions and the overwrite choice. Mark this stage `wait` before asking the user; after the answer, `resume` and complete it. Do not ask later unless blocked.
- `finalize`: dispatch the PM and teamlead with the confirmed choices; when the problem holds several features, the PM writes `phases.md` first and the teamlead plans from it. Complete only when `tasks.md` exists (and `phases.md`, for several features) and, when no spec was available, `brief.md` has been updated.
- `plan`: `levi-pm` writes `docs/brainstorming/<slug>.md`; if it finds a coverage gap, return only the missing tasks to the teamlead and keep this stage active.
- `review`: when the plan has more than ten tasks, run the independent teamlead then PM review exactly once. Complete with the final plan; otherwise complete the skipped stage without an artifact.
- `verify`: check totals and agents in the final plan, then complete with that plan. Only after this stage is complete may cleanup remove the checkpoint and scratch files.

Use the named Levi role agents; the coordinator alone changes `run.json`. The final plan is the only deliverable after cleanup.
