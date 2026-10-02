# Usecases

A usecase is a self-contained workflow, installed as a skill named `davinci-<id>`. This page lists the usecases in the kit. Run `npx davinci@latest list` for the list in the version you have.

| Usecase | What it does |
|---|---|
| [`brainstorming`](#brainstorming) | Turns a problem or idea into an execution plan: small tasks, an owning agent and an hour estimate for each |

To write your own, see [Authoring usecases](authoring-usecases.md).

## brainstorming

```text
/davinci-brainstorming <problem or idea to brainstorm>
```

Brainstorm any problem with the PM and the teamlead and end up with a plan. The problem can be anything the team could work on: a feature, a refactor, a migration, a process change.

Fits requests such as "brainstorm X", "how should we approach X" and "break X into tasks and estimate it".

### What you get

One file, `docs/brainstorming/<slug>.md`, written in the language of your request. `<slug>` is a short kebab-case English name derived from the problem, for example `export-orders-csv`.

```markdown
# Export orders as CSV

- **Total estimate:** 14.5 hours
- **Agents:** davinci-pm, davinci-teamlead, davinci-developer, davinci-qa

## Tasks

| # | Task | Agent | Estimate (h) | Depends on |
|---|---|---|---|---|
| 1 | Define the CSV columns and limits | davinci-pm | 1 | - |
| 2 | Design the export endpoint | davinci-teamlead | 2 | 1 |
| 3 | Implement the endpoint with tests | davinci-developer | 6 | 2 |

## Notes

Chosen approach, what was rejected, assumptions, the riskiest task.
```

- The **total** is the sum of the task estimates. It is agent working time, not calendar time, so parallel tasks are still added up.
- An **estimate** is the hours the assigned agent needs, including checking its own work, in steps of 0.5 hours. It does not include waiting for you.
- **Agents** lists each agent that owns at least one task, once.
- **Notes** appears only when there is something to add, and never holds an undecided point.

The table above is illustrative. A real plan also includes design, review, QA and acceptance tasks, not only implementation.

### How it works

| Step | Who | What happens |
|---|---|---|
| 1. Intake | workflow | Reads your request, derives the slug. An empty request makes it ask what to brainstorm. |
| 2. Find the spec | workflow | Looks in `docs/specs/` for a file matching the problem. One clear match is used as the basis; several plausible ones make it ask you; none means the PM frames the problem itself. |
| 3. Frame | `davinci-pm` | With a spec: reads it and returns only the gaps that matter. Without: writes a short `brief.md` (goal, scope, what done looks like, open questions). |
| 4. Explore | `davinci-teamlead` | Writes two or three genuinely different approaches with trade-offs and a recommendation, and lists the forks only you can decide. |
| 5. Ask you once | workflow | Merges the questions from steps 3 and 4 and asks them in one round, each with two to four options and the recommended one first. |
| 6. Finalize | PM and teamlead | The teamlead picks the approach and writes the task breakdown; the PM folds your answers into the brief. |
| 7. Plan | `davinci-pm` | Checks that every goal and done-criterion is covered by a task, decides the owner of each task and writes the plan. |
| 8. Review (hard plans) | fresh agent calls | Plans with more than 10 tasks get one independent review by the teamlead and then the PM. See below. |
| 9. Clean up | workflow | Deletes the scratch files. Only the plan is left. |
| 10. Report | workflow | Tells you the plan path, the spec used, the total hours, the agents, and any assumption taken. |

### Hard plans get a second review

A plan with more than 10 tasks is treated as a hard ticket. It is reviewed once more by fresh agent calls that see only the spec (or brief) and the plan, never the conversation. First the teamlead reviews task size, dependencies, estimates and technical risk. Then the PM reviews coverage, ownership and totals. The reviewers decide; they do not hand points back as questions. There is no second round.

### Specs are read-only

If your project keeps specs in `docs/specs/`, brainstorming reads the matching one as the basis. It never creates or edits anything under `docs/specs/`. If you want a spec written or changed, ask for that separately.

### Scratch files

During the run, the agents use `docs/davinci/<slug>/`:

| File | Owner | Purpose |
|---|---|---|
| `brief.md` | PM | The problem framed in a few lines. Written only when there is no spec |
| `architecture.md` | Teamlead | Approaches considered and the one chosen |
| `tasks.md` | Teamlead | Task breakdown with suggested roles and estimates |
| `status.md` | PM | Task assignments |

All four are deleted at the end, and the folder is removed when empty. If a run is interrupted, they may remain; you can delete them.

### If the plan already exists

When `docs/brainstorming/<slug>.md` already exists, the single question round includes one more question: replace it, or write the new plan under another name.
