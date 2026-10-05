# Spec guide

How `levi-pm` writes or updates a spec, in the `spec-writing` usecase and in every usecase that has it write one. The prompt names the spec to write, the sources, and the facts already confirmed (for example a ledger).

## Only what is confirmed

A spec is a promise to the rest of the team, so the rule is simple: **a line goes into the spec only when it is confirmed.** Confirmed means one of:

- the user stated it, in the request or in an answer to a question;
- it is written in a document the user pointed to, or in a project file the PM read (the path is the proof);
- for an update, it is already in the existing spec and the user did not change it.

These are not confirmed, and never go into the spec as fact: a guess, a plausible default, "what products like this usually do", a recommended option the user did not accept, an unanswered question. They stay open questions.

In update mode, change only what a confirmed fact touches and leave the rest as it was.

## Format

`docs/specs/<slug>.md`, in the language of the request:

```markdown
# <Title>

- **Status:** Ready | Draft (open questions remain)
- **Sources:** <documents and people the facts come from>

## Goal
<What the product or change must achieve, and for whom.>

## Users
<Who uses it and what each kind of user may do.>

## Scope
<What is included.>

## Out of scope
<What is explicitly excluded.>

## User stories
| ID | Story | Source |
|---|---|---|
| US-1 | As a <user>, I want <goal>, so that <reason> | user / <file path> |

## Acceptance criteria
| ID | Story | Criterion | Source |
|---|---|---|---|
| AC-1 | US-1 | <observable behavior that can be checked yes or no> | user / <file path> |

## Rules and constraints
<Business rules, limits, states and error cases. Omit this section when none is confirmed.>

## Open questions
| # | Question | Blocks |
|---|---|---|
| 1 | <unanswered question> | <the section it blocks> |
```

- **Status** is Ready only when Open questions is empty; otherwise Draft.
- Every story and criterion has a **Source**. A row with no source does not belong in the spec.
- Criteria describe behavior the user or a tester can observe, never how it is built. Do not name technologies, tables or classes unless the user stated them as a requirement.
- Goal, Users, Scope, Out of scope, Stories and Criteria are always present. When nothing is confirmed for one, its body is `Not yet defined. See Open questions.`, with the matching question listed.
- Open questions are written as questions, never as assumptions. The spec has no "Assumptions" section.
