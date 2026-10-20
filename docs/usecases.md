# Usecases

A usecase is a self-contained workflow, installed as a skill named `levi-<id>`. This page lists the usecases in the kit. Run `npx levi-gear@latest list` for the list in the version you have.

| Usecase | What it does |
|---|---|
| [`brainstorming`](#brainstorming) | Turns a problem or idea into an execution plan: small tasks, an owning agent and an hour estimate for each |
| [`spec-writing`](#spec-writing) | Writes or updates a spec with the PM: it asks about everything unclear first and writes only what you confirmed |
| [`design`](#design) | Draws SVG designs with the Designer from a text description, images or videos you upload, or both |
| [`create-feature`](#create-feature) | Builds a feature spec first and test first: the tests from the spec are locked, QA's test cases are QA's alone, and the code is fixed until the tests pass, the teamlead approves, and every test case passes end to end |
| [`fix-bug`](#fix-bug) | Fixes a bug in merged code: the developer clarifies it with you, then fixes it test first while QA writes scenarios; the teamlead reviews and QA tests end to end until everything passes |
| [`code-review`](#code-review) | The teamlead reviews a pull request, a branch, commits, files or your uncommitted changes for security (OWASP Top 10), performance and correctness, and suggests a fix for every finding. Nothing is changed |
| [`generate-test-scenarios`](#generate-test-scenarios) | QA writes screen-level test cases from the feature specs alone, as Markdown and an Excel sheet in `docs/tests/`, and lists where the spec is unclear. Specs are never changed |

Four of them are also the skills of team roles, and are installed with every install: `spec-writing` (PM), `design` (designer), `code-review` (teamlead) and `generate-test-scenarios` (QA). See [Role skills](team.md#role-skills).

On Codex, every multi-stage usecase keeps a `run.json` checkpoint in its `docs/levi/` work folder. Reinvoke the same usecase after an interruption: it reads that checkpoint and resumes its active stage. `code-review` is a single read-only agent call, so it is safely rerun instead of checkpointed.

To write your own, see [Authoring usecases](authoring-usecases.md).

## brainstorming

```text
/levi-brainstorming <problem or idea to brainstorm>
```

Brainstorm any problem with the PM and the teamlead and end up with a plan. The problem can be anything the team could work on: a feature, a refactor, a migration, a process change.

Fits requests such as "brainstorm X", "how should we approach X" and "break X into tasks and estimate it".

### What you get

One file, `docs/brainstorming/<slug>.md`, written in the language of your request. `<slug>` is a short kebab-case English name derived from the problem, for example `export-orders-csv`.

```markdown
# Export orders as CSV

- **Total estimate:** 14.5 hours
- **Agents:** levi-pm, levi-teamlead, levi-developer, levi-qa

## Tasks

| # | Task | Agent | Estimate (h) | Depends on |
|---|---|---|---|---|
| 1 | Define the CSV columns and limits | levi-pm | 1 | - |
| 2 | Design the export endpoint | levi-teamlead | 2 | 1 |
| 3 | Implement the endpoint with tests | levi-developer | 6 | 2 |

## Notes

Chosen approach, what was rejected, assumptions, the riskiest task.
```

- The **total** is the sum of the task estimates. It is agent working time, not calendar time, so parallel tasks are still added up.
- An **estimate** is the hours the assigned agent needs, including checking its own work, in steps of 0.5 hours. It does not include waiting for you.
- **Agents** lists each agent that owns at least one task, once.
- **Depends on** lists only dependencies that cannot be removed. Tasks are cut to be as independent as possible so that they can run in parallel; when several tasks need the same thing (a data model, an interface, a shared component), it becomes one small foundation task that the others depend on, instead of a chain of tasks waiting on each other.
- **Notes** appears only when there is something to add, and never holds an undecided point.

### Several features: a plan in phases

When the problem holds several features, the plan is cut into phases so that development stays small and every release runs by itself:

- **Phase 1 is the MVP**: the basic version of every feature the core flow needs, nothing optional.
- **Each later phase completes one feature**, in order of value and then risk.
- **Each phase is a release that works on its own.** No phase needs anything from a later phase, and a later phase extends the earlier ones. Every phase ends with its own QA and release-check tasks.

The plan then has a phase table and one task table per phase, with a release check for each phase. A problem with one feature, or with no sensible cut, gets the flat plan above. The PM writes `phases.md` (scratch) before the teamlead breaks the work down.

The table above is illustrative. A real plan also includes design, review, QA and acceptance tasks, not only implementation.

### How it works

| Step | Who | What happens |
|---|---|---|
| 1. Intake | workflow | Reads your request, derives the slug. An empty request makes it ask what to brainstorm. |
| 2. Find the spec | workflow | Looks in `docs/specs/` for a file matching the problem. One clear match is used as the basis; several plausible ones make it ask you; none means the PM frames the problem itself. |
| 3. Frame | `levi-pm` | With a spec: reads it and returns only the gaps that matter. Without: writes a short `brief.md` (goal, scope, what done looks like, open questions). |
| 4. Explore | `levi-teamlead` | Writes two or three genuinely different approaches with trade-offs and a recommendation, and lists the forks only you can decide. |
| 5. Ask you once | workflow | Merges the questions from steps 3 and 4 and asks them in one round, each with two to four options and the recommended one first. |
| 6. Finalize | PM and teamlead | The teamlead picks the approach and writes the task breakdown, cut so tasks are as independent as possible; the PM folds your answers into the brief. |
| 7. Plan | `levi-pm` | Checks that every goal and done-criterion is covered by a task, decides the owner of each task and writes the plan. |
| 8. Review (hard plans) | fresh agent calls | Plans with more than 10 tasks get one independent review: the teamlead writes its decisions to `review.md`, then the PM applies them and checks the result. See below. |
| 9. Clean up | workflow | Deletes the scratch files. Only the plan is left. |
| 10. Report | workflow | Tells you the plan path, the spec used, the total hours, the agents, and any assumption taken. |

### Hard plans get a second review

A plan with more than 10 tasks is treated as a hard ticket. It is reviewed once more by fresh agent calls that see only the spec (or brief) and the plan, never the conversation. First the teamlead reviews task size, independence, dependencies, estimates and technical risk, and writes its decisions to `review.md`; it does not edit the plan, which belongs to the PM. Then the PM applies those decisions and reviews coverage, ownership and totals. The reviewers decide; they do not hand points back as questions. There is no second round.

### Specs are read-only

If your project keeps specs in `docs/specs/`, brainstorming reads the matching one as the basis. It never creates or edits anything under `docs/specs/`. If you want a spec written or changed, ask for that separately.

### Scratch files

During the run, the agents use `docs/levi/<slug>/`:

| File | Owner | Purpose |
|---|---|---|
| `brief.md` | PM | The problem framed in a few lines. Written only when there is no spec |
| `architecture.md` | Teamlead | Approaches considered and the one chosen |
| `tasks.md` | Teamlead | Task breakdown with suggested roles and estimates |
| `status.md` | PM | Task assignments |
| `review.md` | Teamlead | The review decisions for a hard plan. Written only for plans with more than 10 tasks |
| `phases.md` | PM | The features, the MVP cut and the order of the later phases. Written only when the problem holds several features |

All of them are deleted at the end, and the folder is removed when empty. If a run is interrupted, they may remain; you can delete them.

### If the plan already exists

When `docs/brainstorming/<slug>.md` already exists, the single question round includes one more question: replace it, or write the new plan under another name.

## spec-writing

```text
/levi-spec-writing <what the spec is about>
```

Write a spec, or update an existing one, with the PM. The PM never invents requirements: it first lists everything that is unclear or undecided, you confirm it, and only then is the spec written.

Fits requests such as "write a spec for X", "update the spec of X" and "turn this idea into a spec".

### What you get

One file, `docs/specs/<slug>.md`, written in the language of your request. `<slug>` is a short kebab-case English name, for example `export-orders-csv`.

```markdown
# Export orders as CSV

- **Status:** Draft (open questions remain)
- **Sources:** user, docs/orders-overview.md

## Goal
Let a shop owner download their orders as a CSV file.

## Users
...

## User stories
| ID | Story | Source |
|---|---|---|
| US-1 | As a shop owner, I want to export my orders, so that I can use them in a spreadsheet | user |

## Acceptance criteria
| ID | Story | Criterion | Source |
|---|---|---|---|
| AC-1 | US-1 | The file contains one row per order in the selected date range | user |

## Open questions
| # | Question | Blocks |
|---|---|---|
| 1 | Which columns does the file contain? | AC-1 |
```

- Every story and criterion has a **Source**: `user`, or the path of the document it comes from. A line with no source is not written.
- A section with nothing confirmed says `Not yet defined. See Open questions.` It is never filled with a guess.
- **Status** is `Ready` only when Open questions is empty.
- A guess, a typical default, or a recommended option you did not accept does not count as confirmed. An unanswered question stays open.

### How it works

| Step | Who | What happens |
|---|---|---|
| 1. Intake | workflow | Reads your request and the files you mention, derives the slug. An empty request makes it ask what the spec is about. |
| 2. Find an existing spec | workflow | Looks in `docs/specs/`. One clear match means an update; several plausible ones make it ask you; none means a new spec. |
| 3. Discover | `levi-pm` | Reads the sources and writes a ledger: confirmed facts with their source, open questions with options, and a ready-to-write verdict. |
| 4. Ask you | workflow | Asks all the open questions in one round, each with options and the recommended one first. You can answer freely or say "not sure yet". |
| 5. Absorb answers | `levi-pm` | Records your answers as confirmed facts, adds follow-up questions they raise, updates the verdict. Steps 4 and 5 repeat up to three rounds, until the PM says it is ready or you say to write now. |
| 6. Write | `levi-pm` | Writes the spec from the confirmed facts only. Unresolved questions go to Open questions. |
| 7. Clean up | workflow | Deletes the ledger. Only the spec is left. |
| 8. Report | workflow | Tells you the spec path, its status, the counts and the open questions. |

If the goal, the users or the core scope are still unconfirmed when the rounds end, no spec is written. The ledger is kept in `docs/levi/<slug>/ledger.md` so a later run can continue.

### Only the PM touches specs

Nobody else writes specs: the developer, designer, QA and teamlead only read them, and they report problems they find to the PM. This is part of the [team protocol](team.md#the-protocol).

## design

```text
/levi-design <what to design, and the images or videos to base it on>
```

Create UI designs as SVG files with the Designer. Describe what you want in plain text, attach images or videos (screenshots, mockups, sketches, screen recordings), or both.

Fits requests such as "design a login screen", "recreate this mockup as SVG" and "design the app shown in this video".

### What you get

A folder `docs/designs/<slug>/` with one SVG file per screen, state or breakpoint. `<slug>` is a short kebab-case English name, for example `login-screen`.

```text
docs/designs/login-screen/
  login.svg
  login-error.svg
  login-mobile.svg
```

- Each file is valid, self-contained SVG: one artboard, a `<title>`, named groups, colors and type defined once as tokens and shared by every file in the folder. No embedded raster images, external fonts or scripts.
- Texts and data come from your request and references, exactly as given. Anything else is a marked placeholder, never an invention.
- Your words decide how an image is used. By default it is **recreated** (layout, texts, colors, icons); say "in this style" and it is only a **style reference**.
- Photos in a reference become labeled placeholders, and text uses a system font stack.

### How it works

| Step | Who | What happens |
|---|---|---|
| 1. Intake | workflow | Reads your text and attachments, derives the slug. With neither text nor attachment it asks what to design. |
| 2. Find the context | workflow | Looks in `docs/designs/` for an existing design to update, and in `docs/specs/` for a spec to use as read-only context. |
| 3. Prepare the references | workflow | Images with a path are passed as they are. An image that exists only in the conversation is written down as a plain description. A video is turned into up to 12 key frames with ffmpeg. |
| 4. Draw | `levi-designer` | Decides the list of files, then draws them from the references, keeping one visual language across all of them. |
| 5. Check | workflow | Runs a checker that rejects invalid SVG, raster images, external references and scripts, and renders each file to a PNG when a renderer is installed (`rsvg-convert`, `inkscape` or headless Chrome) to look for cut-off or overlapping content and for differences from the reference. |
| 6. Fix | `levi-designer` | One pass on the problems found. There is no second pass; what is still wrong is reported. |
| 7. Ask you | workflow | Asks the designer's questions in one round, only those that change the design. Without questions, assumptions go into the report. |
| 8. Clean up and report | workflow | Deletes frames, descriptions and renders. Tells you the files, assumptions and what could not be reproduced. |

### Requirements

- Videos need `ffmpeg`. Without it, the workflow asks you for screenshots of the key screens instead of guessing what the video shows.
- The render check needs `rsvg-convert`, `inkscape` or Chrome/Chromium. Without one it is skipped and the report says so.
- The checker needs `python3` (or `xmllint` as a fallback).

### Specs are read-only

If your project keeps specs in `docs/specs/`, the matching one is used as context. The design never creates or edits anything there.

### Scratch files

During the run the workflow uses `docs/levi/<slug>/`: `frames/` (video key frames), `references.md` (descriptions of images that have no file) and `render/` (PNG renders). All are deleted at the end. Your uploaded files are never touched.

## create-feature

```text
/levi-create-feature <the feature to build, and the spec if you have one>
```

Build a feature end to end, the spec-driven way: the spec decides, the tests and test scenarios are written from it, and the code is changed until it satisfies them. Tests and scenarios are never changed to make them pass.

Fits requests such as "build feature X", "implement X" and "add X to the app".

Installing it also installs `spec-writing`, `brainstorming`, `design`, `code-review` and `generate-test-scenarios`, which it reuses.

### What you get

- The feature's code (and migrations, when it needs them), left uncommitted in your working tree.
- Unit and feature tests in the folders your test framework uses, covering every acceptance criterion of the spec.
- `docs/tests/<base>.md` and `.xlsx`: the test cases, in the [`generate-test-scenarios`](#generate-test-scenarios) format (IDs `TC-<FeatureID>-001` and up), each with the criteria it covers and its `PASS` or `FAIL` result with evidence from the end-to-end run.
- The spec, brainstorming plan and designs, when they had to be created.

### How it works

**Prepare, with you.**

| Step | Who | What happens |
|---|---|---|
| 1. Spec | workflow, `spec-writing` | Uses the spec you give. Otherwise it looks in `docs/specs/` and asks you to confirm a likely match. If you reject it, or there is none, the PM writes a new spec with the `spec-writing` flow. A Draft spec must be settled first: its open questions are answered or moved out of scope. |
| 2. Plan | workflow, `brainstorming` | Uses the matching plan in `docs/brainstorming/`, or runs the `brainstorming` flow. |
| 3. Designs | workflow, `design` | When the feature has a UI: uses the matching folder in `docs/designs/`, or runs the `design` flow. |

**Implement, without you.** On Claude Code this runs as a Workflow, where every step is a fresh, independent subagent that sees only the files it is given. On Codex, a durable runner persists `docs/levi/<slug>/run.json` and dispatches the same named subagents stage by stage; after an interruption it resumes from that checkpoint. On Copilot the same steps run one after another as subagent calls.

| Step | Who | What happens |
|---|---|---|
| 4. Execution plan | `levi-teamlead` | Fixes the interfaces tests and code share, the test framework and commands, how to start the app, the test groups (covering every criterion) and the implementation batches. |
| 5. Tests | `levi-developer`, reviewed by `levi-teamlead` | Unit and feature tests, written from the spec in parallel groups. They run once before any code exists (they should fail), then a fresh teamlead reviews them against the spec until it approves. |
| 5. Test cases | `levi-qa`, reviewed by `levi-pm` | Written from the spec at the same time, without reading code or tests, with QA's test case guide. A fresh PM reviews them against the spec until it approves. |
| 6. Lock | workflow | Copies and hashes the tests, and snapshots the test cases. From here on they are the definition of done. |
| 7. Build | `levi-developer`, `levi-teamlead` | Implements the batches, tasks of a batch in parallel. |
| 8. Gate | workflow | Restores any locked file that was changed, runs the new tests and the whole suite. A failure goes back to the developer. |
| 9. Review | `levi-teamlead` | Once the tests pass, reviews the change against the spec. Critical and warning findings go back to their owner. |
| 10. E2E | `levi-qa` | After the review approves, undoes any change made to the test cases outside QA, starts the app and runs every case in a headless browser (through the API or CLI when there is no UI), recording PASS or FAIL. Failing cases go back to the developer, and steps 7 to 10 repeat until the review approves and every case passes. |

### Tests are locked, test cases are QA's

The developer's tests and QA's test cases are checked against the spec by a fresh reviewer before anything is built, so a failure later can only mean the code is wrong. After the lock, every round verifies the hashes of the tests: a changed or deleted test is restored and the developer is told. The test cases belong to QA: only QA changes them, through its test case guide, and a change made by anyone else is undone before QA runs them. QA never changes an expected result to match what the code does.

### When it stops

| Result | Meaning | What happens |
|---|---|---|
| Spec questions | The spec is silent or unclear on a point the tests need | You answer, the PM updates the spec, and implementation starts again |
| Blocked | Something outside the code: the app cannot start, a service or credential is missing | You get the stage and what to provide; the work folder is kept |
| Stalled | 10 build rounds and something still fails | You get the last failures; Claude Code resumes in the same Workflow session, while Codex resumes the active build stage from `run.json` |

### Requirements

- A test framework the developer can run from the command line; if the project has none, the teamlead picks one and the developer sets it up.
- For E2E on a UI: the project's E2E runner (such as Playwright) or a browser tool the QA agent can use, and an app that starts locally.

### Scratch files

`docs/levi/<slug>/` holds `tasks.md` (the execution plan), `review.md` (the code review), `test-cases.json` (the data of the test cases), `locked/` (the snapshot of the locked tests) and `qa-snapshot/` (the test cases as QA last wrote them). It is deleted when the feature is done, and kept when the run stops.

## fix-bug

```text
/levi-fix-bug <what goes wrong, how to reproduce it, and screenshots or logs if you have them>
```

Fix a bug with the team. The developer first lists what is unclear and you confirm it; then the developer investigates and fixes it test first while QA writes the test cases, the teamlead reviews every fix, and QA tests it end to end. Tests and test cases are never changed to make them pass.

Fits requests such as "fix this bug", "X is broken" and "X shows the wrong value".

Installing it also installs `create-feature` (and what that one requires), whose test lock script it uses, `code-review`, whose criteria the teamlead reviews by, and `generate-test-scenarios`, whose format the test cases use.

### What counts as a bug

A bug is a defect in feature code that is already **merged into the base branch**. When the code at fault is still on a branch that is not merged, or not committed (for example the output of `create-feature` you are checking), asking to change it is a revision of that work, not a bug. `fix-bug` checks this with `git blame` on the lines of the root cause and stops when they are not merged.

### What you get

- The fix, left uncommitted in your working tree.
- Unit and feature tests that failed on the bug and pass now: new ones, or the existing ones when they already covered it.
- `docs/tests/bugs/<slug>.md` and `.xlsx`: the bug's test cases (IDs `TC-BUG-<SLUG>-001` and up), the first following the steps of your report, each with its `PASS` or `FAIL` result.

### How it works

**Clarify, with you.**

| Step | Who | What happens |
|---|---|---|
| 1. Intake | workflow | Reads the report and attachments, checks whether all code is merged into the base branch, writes the report down, and finds the spec and designs of the feature. |
| 2. Clarify | `levi-developer` | Lists every unclear point that would change the fix or its tests, with options. You answer; the answers are kept word for word. Up to three rounds, until nothing is open. If the code does what the spec says, it is a change, not a bug, and the run stops. |

**Fix, without you.** On Claude Code this runs as a Workflow of fresh, independent subagents; on Codex a durable runner resumes from `docs/levi/<slug>/run.json`; on Copilot the same steps run one after another.

| Step | Who | What happens |
|---|---|---|
| 3. Test cases | `levi-qa` | At the same time as step 4, without reading code: writes the test cases with its test case guide; they are snapshotted at once. Then waits for the review to approve. |
| 4. Investigate, test first | `levi-developer` | Finds the root cause and makes sure unit and feature tests fail because of the bug: existing ones if they cover it, otherwise new ones. |
| 5. Merge check and lock | workflow | `git blame` on the root-cause lines (unmerged code stops the run), then the tests that cover the bug are locked. |
| 6. Fix | `levi-developer` | Fixes the root cause until the bug's tests and the whole suite pass. |
| 7. Review | `levi-teamlead` | Reviews the fix. Critical and warning findings go back to the developer. |
| 8. E2E | `levi-qa` | After the approval, undoes any change made to the test cases outside QA and runs every case in a headless browser. Failing cases go back to the developer, and steps 6 to 8 repeat until the review approves and every case passes. |

### When it stops

| Result | Meaning |
|---|---|
| Not a bug | The code does what the spec and your confirmed points expect |
| Unmerged | The root cause is in code that is not merged: it is a revision of that work. Nothing is changed |
| Questions | An agent found a point still open; you answer and the fix runs again |
| Blocked | The app cannot start, a service or credential is missing, or no test could be made to fail on the bug |
| Stalled | 10 rounds and something still fails; Claude Code can resume the Workflow session, while Codex resumes the active build stage from `run.json` |

### Scratch files

`docs/levi/<slug>/` holds `report.md` (your report), `confirmed.md` (the questions and your answers), `investigation.md` (root cause and plan), `review.md` (the review), `test-cases.json` (the data of the test cases), `locked/` (the snapshots of the tests and the test cases) and, for a video, `frames/`. It is deleted when the fix is done, and kept when the run stops.

## code-review

```text
/levi-code-review <pull request link, branch, commit range or path; empty for the uncommitted changes>
```

The teamlead reviews code and suggests a fix for every problem it finds. Nothing is changed: no file, no commit, no comment on the pull request. The review is given in the conversation.

Fits requests such as "review this PR", "review my changes" and "check this code for security issues".

### What it reviews

| You give | It reviews |
|---|---|
| A pull request link | The pull request, read with `gh` (which must be installed and logged in) |
| A branch | The branch against the base branch |
| A commit or a range `a..b` | Those commits |
| Files or folders | Those files in full |
| Nothing | Your uncommitted changes, or the current branch against the base branch when there are none |

You can narrow the focus, for example "only security".

### What it checks

- **Security**, by OWASP Top 10 category: broken access control, cryptographic failures and sensitive data exposure, injection and XSS, insecure design, security misconfiguration and XXE, vulnerable and outdated components, broken authentication, insecure deserialization and other integrity failures, missing security logging, SSRF, and checks that fail open.
- **Performance and correctness**: N+1 queries, missing indexes, unbounded work, inefficient algorithms, race conditions, transactions, memory and resource leaks, error handling, logic and edge cases, and breaking API changes.

The criteria are in `references/` of the skill: `review-guide.md` (how to review, severities, finding format) and the checklists `security.md` and `performance-and-correctness.md`. The teamlead review of `create-feature` and `fix-bug` follows the same criteria.

### What you get

A verdict (**Approve** or **Request changes**), then the findings from critical to suggestion. Each finding has its location, the problem, a concrete case where it fails, and the suggested fix:

| Severity | Meaning | Blocks merge |
|---|---|---|
| critical | Exploitable vulnerability, leaked secret, data loss, a crash on a main path, a breaking change with no migration | Yes |
| warning | A real defect under realistic conditions, such as an N+1 on a list, a missing index, a race or an unhandled error | Yes |
| suggestion | Worth doing, not wrong today | No |

It ends with what the teamlead could not check, and any questions.

### Large changes

A reviewer who reads hundreds of files skims, and problems then turn up a few at a time over many review rounds. So a change of **more than 100 reviewable files** (generated files, lock files, vendored code and build output do not count) is not read by one teamlead:

1. A lead teamlead splits the files into slices of at most 100, grouped by what belongs together (a module with its tests, callers and migrations), not by alphabet.
2. One fresh teamlead call per slice reviews it, all at the same time, and reports every finding in one pass.
3. The lead teamlead merges the slice reports into the one review: findings with one cause are joined, severities are made consistent, and issues that cross slices are settled by reading both sides.

You get one review, as for a small change. `create-feature` and `fix-bug` do the same in their teamlead review step, on every round. The steps are in `references/large-changes.md` of the skill.

## generate-test-scenarios

```text
/levi-generate-test-scenarios <feature IDs (for example F001 F002) or spec files and folders; empty for every feature>
```

QA writes screen-level test cases from the feature specs already in your repository. The spec is the only source: nothing comes from the code, the UI, the designs or outside knowledge, and no function is invented. Specs are never created or changed.

Fits requests such as "generate test cases for F001", "write test scenarios from the spec" and "sinh test case cho F001, F002".

### What you get

Two files per feature in `docs/tests/`, written in the language of the spec:

| File | Contents |
|---|---|
| `<base>.md` | Title and source spec, a coverage summary (cases by category and priority), the test cases, and "spec ambiguities": what QA and BA need to clarify |
| `<base>.xlsx` | One sheet, one row per case, columns `ID, Title, Category, Priority, Preconditions, Steps, Expected Result, Notes`, ready to import into Jira, TestRail, Notion or a spreadsheet |

`<base>` is `<FeatureID>-<slug>` (for example `F001-login`) when the spec gives the feature a code, in its file or folder name, title or header. A spec without a code uses its slug in uppercase as the feature ID and `<slug>-test-cases` as the base.

Each test case has:

| Field | Rule |
|---|---|
| ID | `TC-<FeatureID>-<3 digits>`, for example `TC-F001-001` |
| Title | Short, says what is checked |
| Category | Functional, UX, Security, Performance or Accessibility |
| Priority | P0 (blocks the main flow, or security), P1 (important function), P2 (minor, cosmetic) |
| Preconditions | Data state, user role, starting screen |
| Steps | Numbered, one action each |
| Expected Result | Concrete and observable, as the spec words it |
| Notes | The spec items it traces to, and what QA must confirm |

The cases cover what the spec mentions: the positive path of every user story, the roles allowed and refused, screen flow edge cases, validation (required fields, formats, lengths, boundary values) and error states, and what triggers background logic. Both files are rendered by a script from the same data, which checks the ID format and order, duplicates, and that every user story has a positive case. The data is also embedded at the end of the `.md` file, in a comment Markdown viewers do not show, so that QA can change the cases later. When the cases are run (in `create-feature` and `fix-bug`), each gets a `Status` and `Evidence`, shown in the `.md` and as two more columns in the `.xlsx`.

This is QA's skill: whichever usecase asks `levi-qa` for test cases, it writes them with this format and these rules.

### How it works

| Step | Who | What happens |
|---|---|---|
| 1. Intake | workflow | Reads the feature codes or spec paths in your request. |
| 2. Find the specs | workflow | Matches each code against `docs/specs/`. A code with no spec is reported, for example "No spec for F003 in docs/specs/". With no code or path, it lists every feature found. |
| 3. Ask you once | workflow | Tells you the missing specs, then asks in one round: whether to generate for every feature (only when you named none), which spec a code means when several match, and for each output that already exists, whether to replace it or write a new version with a `-YYYYMMDD` suffix. |
| 4. Analyze | `levi-qa` | Per feature, reads only the spec: its items, a coverage plan, the ambiguities, and whether there is anything testable at all. |
| 5. Report gaps | workflow | Before any case is written, tells you what each spec lacks. A spec with nothing testable is skipped. |
| 6. Generate | `levi-qa` | Writes the cases, runs the check script until it passes, reviews what the script cannot check (one action per step, verifiable results, nothing invented), and renders both files. |
| 7. Verify and clean up | workflow | Runs the check again, confirms both files exist, and deletes the scratch files. |
| 8. Report | workflow | The number of cases, the file paths, and the spec points to clarify. |

Where the spec is unclear or silent, nothing is decided: the point is written in the case's notes and in the spec ambiguities section.

### Requirements

Node.js 18 or newer, which levi already needs. The Excel file is written without any extra package.

### Scratch files

During the run, QA uses `docs/levi/test-cases/`: `<FeatureID>-analysis.md` (spec items, coverage plan, ambiguities) and `<FeatureID>.json` (the cases both files are rendered from). They are deleted at the end.
