# Codex runner

Use this durable runner on Codex instead of the Claude-only `workflow.js`. Run every command below from the project root. After clarification is complete, first inspect `docs/levi/<slug>/run.json`. If absent, initialize it:

```bash
node <this skill folder>/scripts/codex-run-state.mjs init docs/levi/<slug> fix-bug <slug> baseline tests merge-check lock build
```

For each current stage, call `begin` before dispatching the named Levi agent and `complete` only after its artifacts exist. `status` is the source of truth after an interruption; completed stages are never repeated. Use `wait` for questions that need the user, `block` for an external dependency, and `resume` after it is resolved. Do not use the Claude-only `resumeFromRunId`.

```bash
node <this skill folder>/scripts/codex-run-state.mjs begin docs/levi/<slug> <stage>
node <this skill folder>/scripts/codex-run-state.mjs complete docs/levi/<slug> <stage> <artifact>...
node <this skill folder>/scripts/codex-run-state.mjs wait docs/levi/<slug> <stage> "<questions>"
node <this skill folder>/scripts/codex-run-state.mjs block docs/levi/<slug> <stage> "<blocker>"
node <this skill folder>/scripts/codex-run-state.mjs resume docs/levi/<slug>
```

For a valid terminal result that does not build a fix, use `finish` before cleanup:

```bash
node <this skill folder>/scripts/codex-run-state.mjs finish docs/levi/<slug> tests
node <this skill folder>/scripts/codex-run-state.mjs finish docs/levi/<slug> merge-check
```

- `baseline`: record the baseline commit and dirty paths for the later review.
- `tests`: QA writes and PM-approved scenarios while the developer investigates and produces a failing test. Both tracks are separate; complete only with `investigation.md`, `test-cases.json`, and the rendered scenario files. When the code already does what is expected, use `finish` at this stage and report `not_a_bug`; do not build a change.
- `merge-check`: run the existing blame/ancestor check when the initial check did not prove all code merged. For unmerged root-cause code, use `finish` at this stage, report `unmerged`, and do not fix it.
- `lock`: lock the developer tests and QA cases with the existing lock script. Require both lock manifests.
- `build`: run the existing code → test gate → teamlead review → QA E2E loop (a review of more than 100 reviewable files follows `levi-code-review/references/large-changes.md`: split, parallel slice reviews, one merge). Keep the stage active across all rounds. Complete only after approved review and all cases PASS.

Use installed named roles for every subagent call. The coordinator owns the checkpoint and stages; subagents only read/write their assigned artifacts. Keep dependent work sequential and use parallel calls only for the independent QA and investigation tracks.
