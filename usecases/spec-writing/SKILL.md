---
name: levi-spec-writing
description: Write or update a project spec with the PM, without inventing anything. The PM lists every open question and doubt, the user confirms them, and the spec is written only once the facts are sufficient and confirmed; whatever is still unconfirmed is left as an open question, never filled in. The spec goes to docs/specs/<slug>.md. Fits requests such as "write a spec for X", "update the spec of X", "turn this idea into a spec", "viết spec cho X".
argument-hint: "<what the spec is about>"
skill-for: pm
skill-when: you write or update a spec
skill-guide: references/spec-guide.md
---

# Spec writing

Turn a request into a spec that contains only what is certain. `levi-pm` is the only agent that writes the spec; you run it in turn, relay its questions to the user, and never write, edit or answer any part of the spec yourself.

A spec is a promise to the rest of the team: **a line goes into the spec only when it is confirmed.** What counts as confirmed, and the format of the spec, are in `references/spec-guide.md`; the PM follows that guide.

## Files

| File | Owner | Purpose |
|---|---|---|
| `docs/specs/<slug>.md` | PM | **The deliverable**: the spec |
| `docs/levi/<slug>/ledger.md` | PM | Scratch: confirmed facts, open questions and the readiness verdict. Deleted at the end |

`<slug>` is a short kebab-case name for the subject, in English (for example `export-orders-csv`). Create folders as needed. Pass the PM the exact paths it should read and write. Only the PM touches either file.

## Steps

1. **Intake.** The request is the subject. If it is empty, ask what the spec is about and stop. Derive the slug. Note every file or link the user mentioned: they are sources.
2. **Find an existing spec.** List `docs/specs/` and match files against the subject by name and title.
   - One clear match: update mode, using that file.
   - Two or more equally plausible: ask the user which one (or "new spec"), then continue.
   - None: new spec at `docs/specs/<slug>.md`.
3. **PM discovers.** Call `levi-pm` with the subject, the source paths, the existing spec path (update mode), and the ledger path. It reads every source and writes `ledger.md` in this format:

   ```markdown
   ## Confirmed
   | ID | Fact | Source |
   |---|---|---|
   | F1 | <one fact> | user / <file path> / existing spec |

   ## Open questions
   | ID | Question | Why it matters | Options (recommended first) | Blocks |
   |---|---|---|---|---|
   | Q1 | <question> | <what in the spec changes with the answer> | A, B, C | goal / scope / story / criterion / ... |

   ## Readiness
   Ready to write: yes | no
   Missing: <what is still unconfirmed and which section it blocks>
   ```

   The PM must look hard for what is unclear before it says anything is ready: unclear rules, missing states, edge cases and error cases, who the users are and their permissions, what is out of scope, data and limits, priorities, integrations, and terms that could mean two things. Anything it cannot point to a source for is an open question, not a fact. It also lists the questions in its reply.
4. **Ask the user, all at once.** Take every open question from the ledger and ask them in one round (use the tool's structured question feature if it has one; if it limits the number of questions per call, make the calls back to back). Give each question two to four options with the recommended one first, and let the user answer freely instead. "Not sure yet" is a valid answer and leaves the question open. Do not answer a question for the user and do not treat its recommended option as the answer. Skip this step when there are no open questions.
5. **PM absorbs the answers.** Call `levi-pm` with the user's answers, quoted as given, and the ledger path. It moves each answered question into Confirmed (source: user), closes it, adds any follow-up question the answers newly raise, and updates Readiness. Then:
   - The ledger says ready: go to step 6.
   - Not ready, and there are open questions the user can still answer: go back to step 4. Ask only the new and the still-open ones. At most three rounds in total.
   - The user says to write now, or the three rounds are used up: go to step 6 with what is confirmed. Say what is still open.
   - The goal, the users or the core scope are still unconfirmed: do not write a spec. Tell the user exactly what is missing and stop. Keep `ledger.md` so a later run can continue; do not delete it.
6. **PM writes the spec.** Call `levi-pm` with the ledger path and the spec path. It writes `docs/specs/<slug>.md` following `references/spec-guide.md`, using only Confirmed facts, in the language of the request. In update mode it changes only what a confirmed fact touches and leaves the rest as it was. Every unresolved question goes into the spec's Open questions; a section that depends on one says so instead of being filled in.
7. **Clean up.** Delete `ledger.md`, then remove `docs/levi/<slug>/` if empty, and `docs/levi` if that is empty. Delete only after the spec is written. The spec's Source column keeps the traceability.
8. **Report.** Tell the user the spec path, whether it is new or updated, its Status, how many stories and acceptance criteria it holds, the open questions still in it (one line each).
