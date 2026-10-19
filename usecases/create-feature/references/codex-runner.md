# Codex runner

This file is the durable runner for Codex. It replaces the Claude-only `workflow.js`; do not try to execute that file with Node or translate its state from chat history.

## Start or continue

After preparation has selected a Ready spec, a plan and any required designs, use the state helper installed in this skill folder. Run every command below from the project root:

```bash
node <this skill folder>/scripts/codex-run-state.mjs status docs/levi/<slug>
```

If there is no state file, start one:

```bash
node <this skill folder>/scripts/codex-run-state.mjs init docs/levi/<slug> create-feature <slug> plan tests lock build
```

Never create a second state file for the same run. On a resumed run, read `status`; its `currentStage`, stage `status`, artifacts and history decide the next action. Do not repeat a completed stage.

Before starting or retrying the current stage, call `begin`. It is valid to call `begin` again on an active stage; that records a new attempt. A successful stage is recorded only after its required artifact exists:

```bash
node <this skill folder>/scripts/codex-run-state.mjs begin docs/levi/<slug> <stage>
node <this skill folder>/scripts/codex-run-state.mjs complete docs/levi/<slug> <stage> <artifact>...
```

For a question only the user can settle, or an external blocker, preserve the exact reason before returning it:

```bash
node <this skill folder>/scripts/codex-run-state.mjs wait docs/levi/<slug> <stage> "<questions for the user>"
node <this skill folder>/scripts/codex-run-state.mjs block docs/levi/<slug> <stage> "<external blocker>"
```

When the user answers or supplies the missing dependency, run `resume` and continue the same stage. Do not use `resumeFromRunId`: that is a Claude Workflow capability, not a Codex recovery mechanism.

## Stages

### `plan`

Dispatch `levi-teamlead` with only the spec, plan, designs, project and work-folder paths. It writes `tasks.md`. Check that every acceptance criterion has a test group, then complete this stage with `tasks.md`.

### `tests`

Run the developer test groups and the QA scenario track as separate named Codex subagents. They may run in parallel only when their output paths do not overlap. The developer tests and QA cases are then independently reviewed and repaired until approved, up to the existing five-review limit. Do not advance until both tracks are approved and `test-cases.json`, `<testBase>.md` and `<testBase>.xlsx` exist. If a reviewer finds a spec ambiguity, mark this stage `wait`; do not guess.

### `lock`

Run the existing `lock-tests.mjs` commands for the approved test files and QA deliverables. Complete only after both manifests exist: `locked/manifest.json` and `qa-snapshot/manifest.json`.

### `build`

Keep this stage active through all build rounds. In each round, dispatch only the owner of the pending implementation, test, review or E2E finding. Then run the lock verification, feature tests and whole suite. Run the teamlead review only after the test gate passes; run QA E2E only after that review approves. Record every real failure in the next Codex subagent prompt. Complete `build` only after the review approves and every QA case is PASS; pass `review.md`, `<testBase>.md` and `<testBase>.xlsx` as artifacts.

## Dispatch contract

Use the installed named agents (`levi-teamlead`, `levi-developer`, `levi-qa`, `levi-pm`) rather than asking a general agent to impersonate a role. Each prompt must name the allowed input paths, output paths, acceptance criteria, and whether the agent may edit. The coordinator alone advances the state. Keep dependent operations in the coordinator; reserve parallel subagents for independent test groups or implementation batches that the plan says do not overlap.
