# Usecases

A usecase is a self-contained workflow, installed as a skill named `levi-<id>`. This page lists the usecases in the kit. Run `npx levi-gear@latest list` for the list in the version you have.

| Usecase | What it does |
|---|---|
| [`brainstorming`](#brainstorming) | Turns a problem or idea into an execution plan: small tasks, an owning agent and an hour estimate for each |
| [`spec-writing`](#spec-writing) | Writes or updates a spec with the PM: it asks about everything unclear first and writes only what you confirmed |

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
