---
name: levi-fix-bug
description: Fix a bug in code that is already merged into the base branch. The developer lists what is unclear in the report and the user confirms it; then, as a Workflow of independent subagents, the developer investigates and fixes it test first (writing unit and feature tests only when the existing ones do not cover the bug) while QA writes the bug's test cases; the teamlead reviews every fix once the tests pass, and after its approval QA runs the test cases end to end in a headless browser and sends the failing ones back to the developer. Tests and test cases are never changed to make them pass. A problem in work that is not merged yet is a revision of that work, not a bug. Fits requests such as "fix this bug", "X is broken", "X shows the wrong value", "sửa bug X", "lỗi X".
argument-hint: "<what goes wrong, how to reproduce it, and screenshots or logs if you have them>"
requires: create-feature, code-review, generate-test-scenarios
---

# Fix a bug

Fix a bug with the team: `levi-developer` clarifies, investigates and fixes, `levi-teamlead` reviews, `levi-qa` writes the scenarios and tests the fix end to end. You run them, relay their questions to the user, and never investigate, fix, review or test yourself.

**What counts as a bug.** A bug is a defect in feature code that is already merged into the base branch. When the code at fault is still on a branch that is not merged, or not committed (for example the output of `create-feature` the user is checking), a request to change it is a revision of that work, not a bug. This usecase does not handle revisions: it says so and stops.

The work has two halves:

- **Clarify** (steps 1 to 5), here in the conversation, because it needs the user. The developer lists what is unclear and the user confirms it.
- **Fix** (step 6), without the user. Claude Code runs `workflow.js`; Codex uses the durable runner in [`references/codex-runner.md`](references/codex-runner.md). Every agent call is a fresh subagent that sees only the files it is given, and the developer and QA work at the same time without reading each other's work.

## The rules that never bend

- **Test first.** Before the fix, there are unit and feature tests that fail because of the bug: existing ones when they already cover it, otherwise new ones the developer writes. The fix is done when they pass, together with the whole suite.
- **Tests are locked, test cases are QA's.** The tests that cover the bug are locked before the fix: nobody may edit, delete, skip or weaken them afterwards, and when one fails, the code is fixed. The lock is the `lock-tests.mjs` script of `create-feature`: it hashes the files, checks them after every round and restores any that changed. The test cases belong to QA: QA writes, changes and runs them with the test case guide of `generate-test-scenarios`, and a change by anyone else is undone with the same script before QA runs them. QA never changes an expected result to match what the code does.
- **No guessing.** The expected behavior comes from the spec, the designs and the points the user confirmed. What none of them settles is asked, not assumed.
- **Nothing is committed.** The changes stay in the working tree for the user to review.

## Files

| File | Owner | Purpose |
|---|---|---|
| `docs/specs/<spec>.md`, `docs/designs/<design>/` | PM, Designer | The spec and designs of the feature, when there are. Read-only |
| Unit and feature tests, in the framework's folders | Developer | **Deliverable.** The tests that cover the bug. Locked before the fix |
| `docs/tests/bugs/<slug>.md`, `docs/tests/bugs/<slug>.xlsx` | QA | **Deliverable.** The test cases of the bug with their PASS or FAIL result, in the format of `generate-test-scenarios`. Only QA changes them |
| Application code | Developer | **Deliverable.** The fix |
| `docs/levi/<slug>/report.md` | Workflow | Scratch: the bug report as the user gave it. Deleted at the end |
| `docs/levi/<slug>/confirmed.md` | Workflow | Scratch: the developer's questions and the user's answers, word for word. Deleted at the end |
| `docs/levi/<slug>/investigation.md` | Developer | Scratch: root cause, tests that cover the bug, fix plan. Deleted at the end |
| `docs/levi/<slug>/review.md` | Teamlead | Scratch: review findings. Deleted at the end |
| `docs/levi/<slug>/locked/` | Workflow | Scratch: copies and hashes of the locked tests, and of the test cases as QA last wrote them. Deleted at the end |
| `docs/levi/<slug>/test-cases.json` | QA | Scratch: the data the test cases are rendered from. Deleted at the end |

`<slug>` is a short kebab-case name for the bug, in English (for example `cart-total-rounding`). `levi-create-feature/`, `levi-design/`, `levi-code-review/` and `levi-generate-test-scenarios/` are installed next to this skill's folder. The test cases use the feature ID `BUG-<SLUG>` (the slug in uppercase), so their IDs are `TC-BUG-<SLUG>-001` and up.

## Steps

1. **Intake.** The request is the bug report: what goes wrong, where, how to reproduce it, what was expected, with any screenshots, logs or videos. If it is empty, ask what is broken and stop. Derive the slug.
2. **Merge check.** Find the base branch: the target of `git symbolic-ref --short refs/remotes/origin/HEAD` when it exists, otherwise `main` or `master`; use `origin/<branch>` when that ref exists, else the local branch. All code is merged when `git status --porcelain` lists nothing and `git merge-base --is-ancestor HEAD <base>` exits 0. Otherwise the workflow checks the lines at the root cause once the developer has found it.
   - If the user clearly points at work that is not merged (a change still on its branch, the output of a usecase they are reviewing), tell them it is a revision of that work, not a bug, and stop.
3. **Write down the report.** Write `docs/levi/<slug>/report.md`: the report exactly as the user wrote it, the path of every attachment, and for an image that exists only in the conversation, a plain description of what it shows (texts exactly, values, states), without opinions. For a video, extract key frames into `docs/levi/<slug>/frames/` as step 3 of `levi-design/SKILL.md` describes, and list them.
4. **Spec and designs.** List `docs/specs/` and `docs/designs/` and match them against the feature where the bug happens, or use what the user pointed to. One clear match is used; two or more plausible ones, ask the user which (or "none"). With none, the expected behavior comes from the report and the confirmed points alone.
5. **Clarify with the developer.** Call `levi-developer` with `report.md`, the spec, the designs and `confirmed.md` (when it exists). It reads them and the project, changes nothing, and returns:
   - every point that is unclear and would change the fix or its tests: the expected behavior, the steps, the data, the environment, the scope (which cases are part of the bug). Each comes with two to four options, the most likely first;
   - whether it looks like a bug: the behavior differs from what the spec, the designs and the report expect, or the code does exactly what the spec says.

   Ask the user all the points in one round (use the tool's structured question feature if it has one). Append the questions and answers to `confirmed.md`, word for word. Do not answer for the user, and do not take an option as the answer unless the user picks it. Then call `levi-developer` again, fresh, with the updated `confirmed.md`. Stop when it has no more points; at most three rounds. If it then says the code works as the spec states, tell the user, quoting the spec: changing that behavior is a change to the feature, not a bug fix. Stop there.
6. **Fix.** Delete `docs/levi/<slug>/locked/` if an earlier run left it.
   - *With a Workflow tool (Claude Code):* call it with `scriptPath` set to `workflow.js` in this skill's folder, and `args`:

     ```json
     {
       "slug": "<slug>",
       "spec": "docs/specs/<spec>.md (omit when there is none)",
       "designs": "docs/designs/<design>/ (omit when there is none)",
       "base": "<base branch ref from step 2>",
       "allMerged": true,
       "skillDir": "<this skill's folder, relative to the project root>"
     }
     ```

     Set `allMerged` to false when step 2 found unmerged work.
   - *On Codex:* follow [`references/codex-runner.md`](references/codex-runner.md), which persists `docs/levi/<slug>/run.json`, then run the steps under [Workflow](#workflow) through that runner.
   - *Other tools without a Workflow tool:* run the steps under [Workflow](#workflow) below yourself, in order, each agent call as a new subagent call that gets only the paths and instructions written there.
7. **Act on the result.**
   - `done`: go to step 8.
   - `questions`: an agent found a point that is still open. Ask the user, append the answers to `confirmed.md`, and run step 6 again.
   - `not_a_bug`: the developer found that the code does what the spec and the confirmed points expect. Tell the user why, clean up (step 8) and stop.
   - `unmerged`: the root cause is in code that is not merged into the base branch. Tell the user it is a revision of unmerged work, not a bug, with the root cause and its locations. Clean up and stop. The code was not changed.
   - `blocked`: something outside the code stops the work (the app cannot start, a service or credential is missing, no test could be made to fail on the bug). Tell the user the stage, the detail and what they need to provide. Keep `docs/levi/<slug>/` and run step 6 again when they say to.
   - `stalled`: the rounds ran out (10 by default) and something still fails. Tell the user what failed last. On Claude Code, continue in the same session with `resumeFromRunId` and a higher `maxRounds`; on Codex, keep `run.json` and resume the active `build` stage when the user asks to continue. Tests and test cases still do not change.
8. **Clean up.** Delete `docs/levi/<slug>/`, then `docs/levi` if it is empty. Keep everything else.
9. **Report.** Tell the user: the root cause and where it was; the tests that cover the bug (written now, or existing ones) and the command that runs them; the test case files with their result (for example `4/4 PASS`); how many rounds it took; the review outcome and the suggestions left open; the files changed (from `git status`); and that nothing was committed.

## Workflow

The steps `workflow.js` runs, and the ones you run when there is no Workflow tool. Give every call the paths of `report.md`, `confirmed.md`, the spec, the designs and `docs/levi/<slug>/`. When a call returns points only the user can settle, stop with `questions`. When a call is BLOCKED, stop with `blocked`.

1. **Baseline.** Record `git rev-parse HEAD` and the files `git status --porcelain` lists, so the review sees only this run's changes.
2. **Two tracks at the same time**, neither reading the other's work:
   - *QA.* `levi-qa` writes the test cases from the report, the confirmed points, the spec and the designs, without reading code, following `levi-generate-test-scenarios/references/test-case-guide.md`, with the cases file `docs/levi/<slug>/test-cases.json` and the output base `docs/tests/bugs/<slug>`: case 1 follows the steps of the report, the next ones cover nearby cases the same bug could break. The files are snapshotted at once (`lock-tests.mjs lock docs/levi/<slug>/locked/scenarios ...`). QA then waits for the review to approve.
   - *Developer, test first.* `levi-developer` finds the root cause (file, line range, other places with the same cause) and writes `investigation.md`. If existing unit and feature tests already cover the bug and fail because of it, it uses them; otherwise it writes the missing ones, from the spec and the confirmed points. The tests are run: some must fail on the current code. If none fails, the developer tries again (at most 3 times). If the code turns out to do what is expected, stop with `not_a_bug`.
3. **Merge check**, unless all code is merged: for each root-cause location, `git blame --porcelain -L <from>,<to> -- <file>`, then `git merge-base --is-ancestor <commit> <base>` for each commit. An uncommitted line (all-zero commit), an untracked file or a commit that is not an ancestor of the base means the code is not merged: stop with `unmerged`.
4. **Lock** the tests that cover the bug (`lock-tests.mjs lock docs/levi/<slug>/locked/tests ...`).
5. **Rounds** (at most 10 unless raised), each starting with a fresh `levi-developer` call:
   1. *Fix.* The developer fixes the code: first as planned in `investigation.md`, later what the last round sent back. It fixes the cause, not the symptom.
   2. *Tests.* `lock-tests.mjs verify` on the tests (any changed test is restored and the developer is told), then the bug's tests, then the whole suite. A failure goes back to the developer.
   3. *Review.* Once the tests pass, a fresh `levi-teamlead` call reviews the change since the baseline: the root cause fixed everywhere, what the spec, designs and confirmed points expect, nothing else broken, security, performance, fit, following `levi-code-review/references/review-guide.md` and its checklists. It writes `review.md`. A change of more than 100 reviewable files is reviewed in slices by several fresh `levi-teamlead` calls and merged by a lead call, as `levi-code-review/references/large-changes.md` says. Critical or warning findings go back to the developer.
   4. *E2E.* Once the review approves, `lock-tests.mjs verify` on the test cases undoes any change made outside QA. Then `levi-qa` runs every case in a headless browser (the project's E2E runner such as Playwright, or a browser tool; through the API or CLI when there is no UI) and records PASS or FAIL as its test case guide says; the snapshot is then taken again. Failing cases go back to the developer, and the next round runs tests, review and E2E again.
   5. The run is done when the review approves and every case passes.
