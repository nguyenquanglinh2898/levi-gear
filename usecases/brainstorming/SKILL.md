---
name: levi-brainstorming
description: Brainstorm any problem or idea with the PM and Teamlead and turn it into an execution plan - a list of small tasks, each with the team agent that owns it and an estimate in hours. Uses the project's spec in docs/specs/ as a basis when one exists; never creates or edits specs. Fits requests such as "brainstorm X", "how should we approach X", "break X into tasks and estimate it".
argument-hint: "<problem or idea to brainstorm>"
---

# Brainstorming

Turn a problem into an execution plan. `levi-pm` frames the problem and owns the plan; `levi-teamlead` explores the approaches and breaks the work into tasks. You run them in turn, relay their questions to the user, and never do their part yourself. A plan with more than 10 tasks is a hard ticket: it gets a second, independent review before it is final.

The problem can be anything the team could work on: a feature, a refactor, a migration, a process change.

This usecase plans; it does not write specs. Never create or edit anything under `docs/specs/`. An existing spec is read-only input. If the user wants a spec written or changed, they will ask for it separately.

## Files

| File | Owner | Purpose |
|---|---|---|
| `docs/brainstorming/<slug>.md` | PM | **The deliverable**: the plan |
| `docs/levi/<slug>/brief.md` | PM | Scratch: the problem framed in a few lines. Written only when there is no spec. Deleted at the end |
| `docs/levi/<slug>/architecture.md` | Teamlead | Scratch: approaches considered and the one chosen. Deleted at the end |
| `docs/levi/<slug>/tasks.md` | Teamlead | Scratch: task breakdown with suggested roles and estimates. Deleted at the end |
| `docs/levi/<slug>/status.md` | PM | Scratch: task assignments. Deleted at the end |

`<slug>` is a short kebab-case name for the problem, in English (for example `export-orders-csv`). Create folders as needed. Pass each agent the exact paths it should read and write. When the run finishes, only the plan is left behind (and the spec, untouched, if the project had one).

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
5. **Ask the user once.** Merge the questions from steps 3 and 4, drop duplicates, and ask them all in a single round (use the tool's structured question feature if it has one). Give each question two to four options with the recommended one first. Add one more question if `docs/brainstorming/<slug>.md` already exists: replace it, or write the new plan under another name. Skip this step when there are no questions. An unanswered question takes its recommended option, recorded as an assumption. After this step the user's part is done; do not ask again unless an agent is BLOCKED.
6. **Finalize the inputs.** Run these in parallel when the tool allows, with the user's answers as input:
   - `levi-pm`, only when it wrote `brief.md`: fold the answers into it and clear the open questions that were answered.
   - `levi-teamlead`: update `architecture.md` with the chosen approach, then write `tasks.md`. Every task is small (split anything over about 8 hours) and has: ID, goal, files or areas touched, done criteria, dependencies, the suggested role (`levi-pm`, `levi-teamlead`, `levi-developer`, `levi-designer` or `levi-qa`) and an estimate in hours. Include design, review, QA and acceptance tasks, not only implementation. Name the riskiest task.
7. **PM writes the plan.** Call `levi-pm` with the basis, `architecture.md` and `tasks.md`. It checks that every goal and done-criterion in the basis is covered by a task, decides the owner of each task (the Teamlead's suggestion unless it has a reason to change it), records the assignments in `status.md`, and writes `docs/brainstorming/<slug>.md` in the format below. The scratch files are deleted later, so the plan's Notes must carry the chosen approach, what was rejected and why, and the riskiest task.
   - If the PM reports uncovered criteria, send them to `levi-teamlead` to add tasks, then call the PM once more. The PM must settle any criterion that is still uncovered by itself: add the missing task and assign it, or rule the criterion out of scope with a one-line note in the plan's Notes. It never edits the spec, and it does not leave a gap open.
8. **Review a hard plan.** Count the rows of the task table. With 10 tasks or fewer, skip to step 9. With more than 10, run an independent review, once:
   - Use fresh agent calls that get only the paths of the basis and the plan, never the conversation, the scratch files or your own opinion of the plan. A new call starts with no memory of the earlier steps, which is what makes the review independent.
   - First call `levi-teamlead` to review the plan: task size, dependencies and order, estimates, missing or redundant tasks, technical risk. It edits `docs/brainstorming/<slug>.md` in place and decides: it may change tasks, estimates and even the chosen approach, and its calls override the first round.
   - Then call `levi-pm` as a second fresh call to review the result against the basis: coverage of every goal and done-criterion, owner of each task, the total and the agent list. The PM edits the same file, decides on scope, coverage and ownership, and writes the final version over the old one. Its calls override the first round and the Teamlead's review where they conflict. Each reply lists what changed in the review.
   - The reviewers settle every point themselves, with their best judgment; they do not defer a point, hand it back as a question, or park it in Notes. Notes only add information to a decision already made, such as a changed approach and why, or an assumption behind it. Update the Notes to match the final plan. Do not start a second round.
9. **Clean up.** Delete `architecture.md`, `tasks.md`, `status.md` and `brief.md` (if it exists) from `docs/levi/<slug>/`, then remove the folder if it is now empty. Remove `docs/levi` too if that is empty. Delete only those files, and only after the plan is final. Keep the plan, and never touch the spec.
10. **Check and report.** Open the plan and confirm that the total equals the sum of the task estimates and that the agent list equals the agents in the task table; fix it if not. Tell the user the plan path, the spec used (if any), the total hours, the agents involved, whether the plan was reviewed (and what the review changed), and any assumption taken in place of an unanswered question.

## Plan format

`docs/brainstorming/<slug>.md`, written in the language of the request:

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

- The total is the sum of the task estimates. It is agent working time, not the calendar duration, so tasks that can run in parallel are still added up.
- An estimate is the hours the assigned agent needs for that task, including checking its own work, in steps of 0.5 hours. It does not include waiting for the user.
- The agent list contains each agent that owns at least one task, once.
