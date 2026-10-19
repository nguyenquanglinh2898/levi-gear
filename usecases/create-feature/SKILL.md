---
name: levi-create-feature
description: Build a new feature end to end, spec first and test first. Finds or writes the spec (confirmed with the user), the brainstorming plan and, for UI work, the designs; then the developer writes unit and feature tests and QA writes test cases (Markdown and Excel), both from the spec and reviewed against it; the tests are locked, only QA may change its test cases, and the developer writes the code until every test passes, the teamlead approves the code review, and then QA passes every scenario end to end in a headless browser. Tests and test cases are never changed to make them pass. On Claude Code the implementation runs as a Workflow of independent subagents. Fits requests such as "build feature X", "implement X", "add X to the app", "triển khai tính năng X", "thêm tính năng X".
argument-hint: "<the feature to build, and the spec if you have one>"
requires: spec-writing, brainstorming, design, code-review, generate-test-scenarios
---

# Create a feature

Build a feature the spec-driven way: **the spec decides, the tests and scenarios are written from it, and the code is changed until it satisfies them.** You run the team; you never write the spec, the tests, the scenarios or the code yourself.

The work has two halves:

- **Prepare** (steps 1 to 5), here in the conversation, because it needs the user: the spec, the brainstorming plan and the designs. It reuses the `spec-writing`, `brainstorming` and `design` usecases.
- **Implement** (step 6), without the user: tests, scenarios, code, end-to-end runs and code review. Every agent call is a fresh, independent subagent that sees only the files it is given, never the conversation or another agent's reasoning. Claude Code runs `workflow.js`; Codex uses the durable runner in [`references/codex-runner.md`](references/codex-runner.md).

## The rules that never bend

- **The spec is the top priority.** Tests and scenarios follow it exactly, and the code follows them. Nobody but `levi-pm` touches the spec, and only through the `spec-writing` flow.
- **Tests and test cases are checked against the spec, then kept.** They are the definition of done: no agent may edit, delete, skip or weaken the tests, or change test configuration to leave them out. When one fails, the code is wrong and the code is fixed. The tests are locked by `scripts/lock-tests.mjs`: every locked file is hashed, checked after every round and restored when changed. The test cases belong to QA: QA writes, changes and runs them with the test case guide of `generate-test-scenarios`, and a change by anyone else is undone with the same script before QA runs them. QA never changes an expected result to match what the code does.
- **Writers work apart.** The developer writes tests and QA writes scenarios from the spec, each without reading the other's work. QA never reads the application code.
- **Nothing is committed.** The changes stay in the working tree for the user to review.

## Files

| File | Owner | Purpose |
|---|---|---|
| `docs/specs/<spec>.md` | PM | The spec. Read-only here, except through the `spec-writing` flow |
| `docs/brainstorming/<plan>.md` | PM | The brainstorming plan |
| `docs/designs/<design>/` | Designer | The designs, for UI work |
| Unit and feature tests, in the framework's folders | Developer | **Deliverable.** Locked once reviewed |
| `docs/tests/<base>.md`, `docs/tests/<base>.xlsx` | QA | **Deliverable.** The test cases with their PASS or FAIL result, in the format of `generate-test-scenarios`. Only QA changes them |
| Application code, migrations | Developer, Teamlead | **Deliverable.** The feature |
| `docs/levi/<slug>/tasks.md` | Teamlead | Scratch: execution plan and the interfaces tests and code share. Deleted at the end |
| `docs/levi/<slug>/review.md` | Teamlead | Scratch: code review findings. Deleted at the end |
| `docs/levi/<slug>/locked/`, `qa-snapshot/` | Workflow | Scratch: copies and hashes of the locked tests, and of the test cases as QA last wrote them. Deleted at the end |
| `docs/levi/<slug>/test-cases.json` | QA | Scratch: the data the test cases are rendered from. Deleted at the end |

`<slug>` is a short kebab-case name for the feature, in English (for example `export-orders-csv`). The other usecases are installed next to this one: their `SKILL.md` files are in the sibling folders `levi-spec-writing/`, `levi-brainstorming/`, `levi-design/`, `levi-code-review/` and `levi-generate-test-scenarios/`. When this file says "run the X flow", read that `SKILL.md` and follow its steps with the given subject, then come back here.

## Steps

1. **Intake.** The request is the feature. If it is empty, ask what to build and stop. Derive the slug. Note any spec the user attached or pointed to (a path, a link, "the spec in ...").
2. **Spec.**
   - *The user gave one:* use it.
   - *Otherwise:* list `docs/specs/` and match files against the feature by name, title and goal. When one or more look like the spec for this feature, ask the user to confirm, in one question: each candidate (path and title) as an option, the most likely first, plus "None of these: write a new spec". Never use a candidate the user did not confirm.
   - *Confirmed:* use it. *Rejected, or no candidate:* run the `spec-writing` flow with the feature as subject, to write a new spec in `docs/specs/`, then use that.
   - **The spec must be Ready.** If its Status is Draft, its open questions would have to be guessed, so do not implement yet. Ask the user to settle them, and run the `spec-writing` flow in update mode with the answers. If the user prefers to leave a point out, that is an answer too: the PM moves it to Out of scope. Continue only when the Status is Ready.
3. **Brainstorming plan.** List `docs/brainstorming/` and match plans against the feature and the spec. One clear match: use it, and say which in one line. Two or more equally plausible: ask the user which one (or "none"). None: run the `brainstorming` flow, with the feature and the spec, and use the plan it writes.
4. **Designs.** Decide from the spec whether the feature has a user interface (screens, pages, forms, components, visible states). If it has none, skip this step. If it has, list `docs/designs/` and match folders against the feature: one clear match is used; two or more plausible ones, ask the user; none: run the `design` flow with the feature as subject and the spec as context, and use the folder it writes.
5. **Get ready.** Delete `docs/levi/<slug>/locked/` and `qa-snapshot/` if an earlier run left them. Work out the feature ID and the output base `<base>` of the test cases from the spec, as the "Features, IDs and file names" table of `levi-generate-test-scenarios/SKILL.md` says. Say in a few lines what will be used (spec, plan, designs) and that implementation starts now.
6. **Implement.**
   - *With a Workflow tool (Claude Code):* call it with `scriptPath` set to `workflow.js` in this skill's folder, and `args`:

     ```json
     {
       "slug": "<slug>",
       "feature": "<the request, as the user wrote it>",
       "spec": "docs/specs/<spec>.md",
       "plan": "docs/brainstorming/<plan>.md",
       "designs": "docs/designs/<design>/ (omit when there is no UI)",
       "featureId": "<the feature ID>",
       "testBase": "docs/tests/<base>",
       "skillDir": "<this skill's folder, relative to the project root>"
     }
     ```

     The script runs the steps under [Implementation](#implementation) below and returns a result with a `status`. Follow its progress with the user only when they ask.
   - *On Codex:* follow [`references/codex-runner.md`](references/codex-runner.md). It persists the stage in `docs/levi/<slug>/run.json`, so a stopped run resumes from the recorded stage rather than restarting. Run the steps under [Implementation](#implementation) through that runner, each agent call as a new named subagent call that gets only the paths and instructions written there.
   - *Other tools without a Workflow tool:* run the steps under [Implementation](#implementation) yourself, in order, each agent call as a new subagent call that gets only the paths and instructions written there.
7. **Act on the result.**
   - `done`: go to step 8.
   - `spec_questions`: the spec is silent or unclear on a point the tests depend on. Ask the user the questions in one round, run the `spec-writing` flow in update mode with the answers, then run step 6 again from the start.
   - `blocked`: something outside the code stops the work (the app cannot start, a service or a credential is missing, an agent could not finish). Tell the user the stage and the detail, and what they need to provide. Keep `docs/levi/<slug>/`. Run step 6 again when they say to.
   - `stalled`: the build rounds ran out (10 by default) and something still fails. Tell the user what failed last. On Claude Code, continue in the same session with `resumeFromRunId` and a higher `maxRounds`; on Codex, keep `run.json` and resume its active `build` stage after the user asks to continue. Tests and test cases still do not change.
8. **Clean up.** Delete `docs/levi/<slug>/` (`tasks.md`, `review.md`, `locked/`), then `docs/levi` if it is empty. Keep everything else: spec, plan, designs, tests, test cases with their results, code.
9. **Report.** Tell the user: the spec, plan and designs used (and which were created in this run); the test files and the command that runs them; the test case files with their result (for example `12/12 PASS`); how many build rounds it took; the review outcome and the suggestions left open; the files changed (from `git status`); and that nothing was committed.

## Implementation

The steps the Workflow runs, and the ones you run when there is no Workflow tool. Every call names its agent; give it the paths of the spec, the plan, the designs and `docs/levi/<slug>/`. When a call returns questions that only the user can answer about the spec, stop with `spec_questions`. When a call is BLOCKED, stop with `blocked`.

1. **Baseline.** Record `git rev-parse HEAD` and the files `git status --porcelain` lists, so the review later sees only this run's changes.
2. **Plan** — `levi-teamlead`. Reads the spec, the plan, the designs and the project. Writes `docs/levi/<slug>/tasks.md`: the interfaces tests and code share (exact names of modules, functions, endpoints, routes, components, data shapes), the test framework and where tests go, and the development tasks from the brainstorming plan with their owners. Returns: every acceptance criterion ID; test groups (each with its criteria and folder) covering every criterion; implementation batches in dependency order, where tasks of one batch do not touch the same files; any test setup the project needs; the command for the new tests and the one for the whole suite; how to start the app for E2E. A criterion left out of every test group goes back to the teamlead.
3. **Test setup** — `levi-developer`, only when the plan says the project cannot run tests yet.
4. **Tests and scenarios**, two tracks at the same time:
   - *Developer track.* One `levi-developer` call per test group, in parallel, writes unit and feature tests for its criteria, from the spec alone, against the interfaces in `tasks.md`, each test naming the criterion it covers. Then, until approved (at most 5 reviews): run the new tests (they are expected to fail, the feature does not exist yet), and a fresh `levi-teamlead` call reviews the tests against the spec: every criterion covered, every assertion from the spec and nothing beyond it, each test able to fail, one command that runs them. It does not edit them; a `levi-developer` call fixes what it found.
   - *QA track.* `levi-qa` writes the test cases from the spec and the designs, without reading code or tests, following `levi-generate-test-scenarios/references/test-case-guide.md`, with the feature ID, the cases file `docs/levi/<slug>/test-cases.json` and the output base `docs/tests/<base>`. Every acceptance criterion is in the refs of at least one case, and every ambiguity it finds comes back as a question. Then, until approved (at most 5 reviews): a fresh `levi-pm` call reviews the test cases against the spec (coverage, exact expected results, nothing invented, runnable from the file alone); `levi-qa` fixes what it found.
5. **Lock.** `node <skill folder>/scripts/lock-tests.mjs lock docs/levi/<slug>/locked <every test file>`, and the same with `docs/levi/<slug>/qa-snapshot docs/tests/<base>.md docs/tests/<base>.xlsx` for the test cases.
6. **Build**, in rounds (at most 10 unless raised), until the teamlead approves and every scenario passes:
   1. *Code.* First round: each batch in order, the tasks of a batch in parallel, each by its owner (`levi-developer`, or `levi-teamlead` for schema, migrations and CI/CD). Later rounds: the owners fix exactly what the last round found.
   2. *Gate.* Run `lock-tests.mjs verify docs/levi/<slug>/locked` (it restores any locked file that was changed), then the new tests, then the whole suite. Any restored file, failing test or regression sends the round back to the developer with the failures.
   3. *Review* — once the tests pass, a fresh `levi-teamlead` call reviews the change since the baseline against the spec, `tasks.md` and the designs (correctness, security, performance, fit), following `levi-code-review/references/review-guide.md` and its checklists, writes `review.md` and approves only when no critical or warning finding is left. Findings go back to their owners, and the round starts again.
   4. *E2E* — only after the review approves. First `lock-tests.mjs verify docs/levi/<slug>/qa-snapshot`, which undoes any change to the test cases made outside QA. Then `levi-qa` starts the app, runs every case in a headless browser (the project's E2E runner such as Playwright, or a browser tool; through the API or CLI when there is no UI), records PASS or FAIL and the evidence as its test case guide says, and stops the app; the snapshot is then taken again. Any case that is not PASS goes back to the developer with the evidence, and the next round runs code, gate, review and E2E again.
   5. The run is done when the review approves and every case passes.
