---
name: levi-brainstorming
description: Brainstorm any problem or idea with the PM and Teamlead and turn it into an execution plan - a list of small tasks, each with the team agent that owns it and an estimate in hours. A problem with several features is planned in phases: an MVP first, then one feature completed per phase, each phase a release that runs on its own. Uses the project's spec in docs/specs/ as a basis when one exists; never creates or edits specs. Fits requests such as "brainstorm X", "how should we approach X", "break X into tasks and estimate it".
argument-hint: "<problem or idea to brainstorm>"
---

# Brainstorming

Turn a problem into an execution plan. `levi-pm` frames the problem and owns the plan; `levi-teamlead` explores the approaches and breaks the work into tasks. You run them in turn, relay their questions to the user, and never do their part yourself. A plan with more than 10 tasks is a hard ticket: it gets a second, independent review before it is final.

The problem can be anything the team could work on: a feature, a refactor, a migration, a process change.

**A problem with several features is planned in phases.** Phase 1 is the MVP: the basic version of what the product needs to work end to end. Every later phase completes one feature. The plan is cut so that each phase is a release that runs on its own and never needs a later phase, which also keeps each stretch of development small. A problem with one feature, or with no sensible cut, gets a flat plan.

This usecase plans; it does not write specs. Never create or edit anything under `docs/specs/`. An existing spec is read-only input. If the user wants a spec written or changed, they will ask for it separately.

## Files

| File | Owner | Purpose |
|---|---|---|
| `docs/brainstorming/<slug>.md` | PM | **The deliverable**: the plan |
| `docs/levi/<slug>/brief.md` | PM | Scratch: the problem framed in a few lines. Written only when there is no spec. Deleted at the end |
| `docs/levi/<slug>/phases.md` | PM | Scratch: the features, the MVP cut and the order of the later phases. Written only when the problem holds several features. Deleted at the end |
| `docs/levi/<slug>/architecture.md` | Teamlead | Scratch: approaches considered and the one chosen. Deleted at the end |
| `docs/levi/<slug>/tasks.md` | Teamlead | Scratch: task breakdown with suggested roles and estimates. Deleted at the end |
| `docs/levi/<slug>/status.md` | PM | Scratch: task assignments. Deleted at the end |

`<slug>` is a short kebab-case name for the problem, in English (for example `export-orders-csv`). Create folders as needed. Pass each agent the exact paths it should read and write. When the run finishes, only the plan is left behind (and the spec, untouched, if the project had one).

## Codex runner

On Codex, use [`references/codex-runner.md`](references/codex-runner.md). It records the planning stage in `docs/levi/<slug>/run.json`, so a stopped run resumes from its artifact checkpoint rather than from conversation memory.

## Steps

1. **Intake.** The request is the problem. If it is empty, ask what to brainstorm and stop. Derive the slug and a plain-language problem name.
2. **Find the spec.** List `docs/specs/` and match files against the problem by name and title.
   - One clear match: use it as the basis. Say which in one line.
   - Two or more equally plausible: ask the user which one (or "none"), then continue.
   - None: there is no spec, and the PM frames the problem itself in step 3.
3. **PM frames the problem.** Call `levi-pm` with the problem, the spec path if any, and the mode:
   - *Spec exists:* read it as the basis, without editing it. Return only the gaps and questions that matter for this problem.
   - *No spec:* write `docs/levi/<slug>/brief.md`: goal, users, scope, out of scope, what done looks like as checkable points, and open questions. Mark every assumption as an assumption. Do not write a spec.

   From here on, "the basis" means the spec when there is one, otherwise `brief.md`.
4. **Teamlead explores.** Call `levi-teamlead` with the problem and the basis path. It reads the basis and the project, then writes `architecture.md`: two or three genuinely different approaches with their trade-offs, a recommendation, and the forks only the user can decide. It does not break the work down yet.
5. **Ask the user once.** Merge the questions from steps 3 and 4, drop duplicates, and ask them all in a single round (use the tool's structured question feature if it has one). Give each question two to four options with the recommended one first. Ask what only the user can settle (facts, scope, priorities, a fork that decides the approach); a choice that is cheap to change, such as a name or the order of two equal tasks, is picked and recorded as the run rules say. Add one more question if `docs/brainstorming/<slug>.md` already exists: replace it, or write the new plan under another name. Skip this step when there are no questions. An unanswered question takes its recommended option, recorded as an assumption. After this step the user's part is done; do not ask again unless an agent is BLOCKED.
6. **Finalize the inputs.** Run these with the user's answers as input. When the problem holds several features, run the PM first (it writes `phases.md`) and then the teamlead; otherwise run them in parallel when the tool allows.
   - `levi-pm`: when it wrote `brief.md`, fold the answers into it and clear the open questions that were answered. When the problem holds more than one feature, also write `phases.md`: the list of features; **Phase 1, the MVP**, the smallest set that works end to end for the core purpose, holding the basic version of every feature the core flow needs and nothing optional, with what a user can do with that release; then **one later phase per feature**, each completing that feature (bringing it from the MVP's basic version to complete, or adding it whole when the MVP has none of it), ordered by value and then risk, with the reason for the order; and for each phase a release check, a way to tell that the release works on its own. No phase may need anything from a later phase, and a later phase extends the earlier ones instead of reworking them. Say so and write no phases when there is one feature or no sensible cut.
   - `levi-teamlead`: update `architecture.md` with the chosen approach, then write `tasks.md`. Every task is small (split anything over about 8 hours) and has: ID, goal, files or areas touched, done criteria, dependencies, the suggested role (`levi-pm`, `levi-teamlead`, `levi-developer`, `levi-designer` or `levi-qa`) and an estimate in hours. Include design, review, QA and acceptance tasks, not only implementation. Name the riskiest task. With `phases.md`, each task also has its phase; the shared foundation goes in Phase 1; every phase has its own QA and release-check tasks, so its release is really verified; a task depends only on tasks of its own or an earlier phase; and nothing for a later phase is built early.
   - **Keep tasks independent.** The breakdown exists so that many agents can work at the same time, so cut the work along seams that leave as few dependencies as possible. Each task should be doable and checkable on its own, with its own inputs and done criteria, without waiting for or touching the output of another task. Prefer vertical slices over layers, and tasks that own separate files or areas.
   - **Pull shared work out first.** When several tasks truly need the same thing (a data model, an interface or contract, a shared component, a config), do not let them depend on one another. Make one foundation task that delivers only that shared part, as small as it can be, and let the other tasks depend on it alone. After the foundation task, the remaining tasks must be able to run in parallel.
   - **Dependencies are the exception.** Keep a dependency only when it cannot be removed, such as a task that needs a decision, an interface, or a result that does not exist yet. Prefer a dependency on a foundation task over a chain of tasks. Avoid long chains; a task that waits on a task that waits on another is a sign the cut is wrong.
7. **PM writes the plan.** Call `levi-pm` with the basis, `architecture.md` and `tasks.md`. It checks that every goal and done-criterion in the basis is covered by a task (in some phase, when there are phases), decides the owner of each task (the Teamlead's suggestion unless it has a reason to change it), records the assignments in `status.md`, and writes `docs/brainstorming/<slug>.md` in the format below (the phased format when `phases.md` exists). The scratch files are deleted later, so the plan's Notes must carry the chosen approach, what was rejected and why, and the riskiest task.
   - If the PM reports uncovered criteria, send them to `levi-teamlead` to add tasks, then call the PM once more. The PM must settle any criterion that is still uncovered by itself: add the missing task and assign it, or rule the criterion out of scope with a one-line note in the plan's Notes. It never edits the spec, and it does not leave a gap open.
8. **Review a hard plan.** Count the rows of the task tables (all phases together). With 10 tasks or fewer, skip to step 9. With more than 10, run an independent review, once:
   - Use fresh agent calls that get only the paths of the basis and the plan (plus `review.md` for the PM's call), never the conversation, the other scratch files or your own opinion of the plan. A new call starts with no memory of the earlier steps, which is what makes the review independent.
   - First call `levi-teamlead` to review the plan: task size, independence (remove dependencies that are not needed, move work shared by several tasks into one foundation task), dependencies and order, estimates, missing or redundant tasks, technical risk, and for a phased plan that no task depends on a later phase and that each phase's release works on its own. The plan belongs to the PM, so the teamlead does not edit it: it writes its decisions to `docs/levi/<slug>/review.md` as a list of concrete changes (task, what changes, why). It decides: it may change tasks, estimates and even the chosen approach, and its calls override the first round.
   - Then call `levi-pm` as a second fresh call, with the basis, the plan and `review.md`. The PM applies the teamlead's changes to `docs/brainstorming/<slug>.md`, then reviews the result against the basis: coverage of every goal and done-criterion, owner of each task, the total and the agent list, and for a phased plan that the MVP is the smallest working release and that each later phase completes one feature. It decides on scope, coverage and ownership, and writes the final version over the old one. The teamlead's calls bind on technical matters (task size, estimates, approach, dependencies); the PM's calls override on scope, coverage and ownership. Its reply lists what changed in the review.
   - The reviewers settle every point themselves, with their best judgment; they do not defer a point, hand it back as a question, or park it in Notes. Notes only add information to a decision already made, such as a changed approach and why, or an assumption behind it. Update the Notes to match the final plan. Do not start a second round.
9. **Clean up.** Delete `architecture.md`, `tasks.md`, `status.md`, `brief.md`, `phases.md` and `review.md` (the last three if they exist) and `choices/` (read it first for the report) from `docs/levi/<slug>/`, then remove the folder if it is now empty. Remove `docs/levi` too if that is empty. Delete only those files, and only after the plan is final. Keep the plan, and never touch the spec.
10. **Check and report.** Open the plan and confirm that the total equals the sum of the task estimates (the phase estimates too, for a phased plan) and that the agent list equals the agents in the task tables; fix it if not. Tell the user the plan path, the spec used (if any), the total hours, the agents involved, whether the plan was reviewed (and what the review changed), and any assumption taken in place of an unanswered question.

## Plan format

`docs/brainstorming/<slug>.md`, written in the language of the request. A problem with one feature, or with no sensible cut, gets the flat plan:

```markdown
# <Problem name>

- **Total estimate:** <N> hours
- **Agents:** levi-pm, levi-teamlead, levi-developer

## Tasks

| # | Task | Agent | Estimate (h) | Depends on |
|---|---|---|---|---|
| 1 | <small, concrete task> | levi-teamlead | 2 | - |
| 2 | <small, concrete task> | levi-developer | 4 | 1 |

## Notes

<Only when there is something to add: the chosen approach and what was rejected, assumptions,
risks (the riskiest task), work that needs a human. Notes supplement the plan and never hold an
undecided point. Omit this whole section otherwise.>
```

A problem with several features gets the phased plan. The tasks sit in one table per phase:

```markdown
# <Problem name>

- **Total estimate:** <N> hours
- **Agents:** levi-pm, levi-teamlead, levi-developer

## Phases

| Phase | Release | Estimate (h) |
|---|---|---|
| 1. MVP | <what a user can do with this release> | 20 |
| 2. <Feature> | <what this release adds> | 8 |

## Phase 1: MVP

**Release check:** <how to tell that this release works on its own>

| # | Task | Agent | Estimate (h) | Depends on |
|---|---|---|---|---|
| 1 | <small, concrete task> | levi-teamlead | 2 | - |

## Phase 2: <Feature>

**Release check:** <how to tell that this release works on its own>

| # | Task | Agent | Estimate (h) | Depends on |
|---|---|---|---|---|
| 2 | <small, concrete task> | levi-developer | 4 | 1 |

## Notes
```

- The total is the sum of the task estimates. It is agent working time, not the calendar duration, so tasks that can run in parallel are still added up. In a phased plan each phase's estimate is the sum of its tasks.
- An estimate is the hours the assigned agent needs for that task, including checking its own work, in steps of 0.5 hours. It does not include waiting for the user.
- The agent list contains each agent that owns at least one task, once.
- `Depends on` lists only dependencies that cannot be removed. Most tasks should have `-` or point at a foundation task, so that as many tasks as possible can run in parallel.
- Task numbers run across the phases. In a phased plan a task depends only on tasks of its own phase or an earlier one, never a later one. Phase 1 is the MVP and holds the foundation; each later phase completes one feature; every phase ends with its own QA and release-check tasks, so each release can ship and run on its own.
