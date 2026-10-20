---
name: levi-code-review
description: Have the teamlead review code and suggest a fix for every problem it finds, without changing anything. It checks security against the OWASP Top 10 (injection, broken authentication, sensitive data exposure, XXE, broken access control, security misconfiguration, XSS, insecure deserialization, SSRF and more) and performance and correctness (N+1 queries, race conditions, memory leaks, inefficient algorithms, missing indexes, wrong error handling, breaking API changes). The target is a pull request link, a branch, a commit range, files or folders, or the uncommitted changes. The findings are given in the conversation, graded critical / warning / suggestion. A change of more than 100 files is split into slices that several teamlead reviewers read at the same time, and one lead teamlead merges their findings into a single review, so the author gets everything in one round. Other usecases (create-feature, fix-bug) use the same review criteria for their teamlead review. Fits requests such as "review this PR", "review my changes", "check this code for security issues", "review PR này", "review code giúp tôi", "kiểm tra bảo mật đoạn code này".
argument-hint: "<pull request link, branch, commit range or path; empty for the uncommitted changes>"
skill-for: teamlead
skill-when: you review code
skill-guide: references/review-guide.md
---

# Code review

`levi-teamlead` reviews the code; reviewing code is its job, and no other team member does it. You work out what to review, call the teamlead (or, for a large change, several), and pass the review on to the user. You never review the code yourself, and nothing is changed: not the code, not the working tree, not the pull request.

## The rules that never bend

- **Suggest, never change.** The review returns findings and fixes. Nobody edits, commits, checks out, pushes or comments on anything.
- **Every finding has a fix.** Each problem comes with a concrete change to make, in the project's own language and idiom.
- **Evidence, not guesses.** Each finding points to a file and line and says how it fails. What depends on code or config the teamlead could not see is marked as an assumption.
- **Relay, do not edit.** You pass the findings on as the teamlead gave them. Do not add, drop, merge or soften any. (For a large change the lead teamlead merges the slices' findings; you relay its merged review.)

## Files

| File | Purpose |
|---|---|
| `references/review-guide.md` | How the teamlead reviews: scope, severities, finding format, verdict |
| `references/security.md` | Security checklist, by OWASP Top 10 category |
| `references/performance-and-correctness.md` | Performance and correctness checklist |
| `references/large-changes.md` | How a change of more than 100 files is split among teamlead reviewers and merged into one review |

Nothing is written into the project. The review is given in the conversation.

## Codex runner

On Codex, use [`references/codex-runner.md`](references/codex-runner.md). This workflow is deliberately stateless: its single read-only review dispatch is safe to restart after an interruption.

## Steps

1. **Target.** Work out what to review from the request:

   | Request gives | Target |
   |---|---|
   | A pull request link (or a number, for the current repository) | That pull request |
   | A branch name | The branch against the base branch |
   | A commit, or a range `a..b` | Those commits |
   | Files or folders | Those files as they are, in full, not a diff |
   | Nothing | The uncommitted changes (`git status --porcelain`); if there are none, the current branch against the base branch |

   The base branch is the target of `git symbolic-ref --short refs/remotes/origin/HEAD` when it exists, otherwise `main` or `master`. If the target is still empty (no changes, an empty branch, a path that does not exist), tell the user and stop. When the request asks for one area only (for example "only security"), pass that on as the focus; otherwise the focus is everything.
2. **Pull request access.** For a pull request, check that `gh` works (`gh auth status`) and that the pull request exists (`gh pr view <link> --json number`). If either fails, tell the user what is missing and stop.
3. **Size the change.** Count the reviewable files of the target as `references/large-changes.md` says. With more than 100, review it as that file says (its split, slice and merge steps replace the single call below, with the same prompt for every teamlead call), and go to step 4 with the merged review. With 100 or fewer, continue.
4. **Review.** Call `levi-teamlead` once, with this prompt filled in:

   ```text
   Review this code as the gate before merge. Change nothing.

   Target: <the target from step 1, exact>
   How to read it: <the commands for this kind of target, from the table below>
   Focus: <everything | the area the user asked for>
   What the user said about it: <the request, word for word>

   Follow <this skill's folder>/references/review-guide.md and the two checklists next to it.
   Read the project code around the change (callers, schema, configuration, conventions) to judge it.
   Do not create, edit or delete any file, do not check out, commit or push, and do not post anything to the pull request.
   Return the review in your reply, in the format the guide gives, in the language of the user's request.
   ```

   | Target | How to read it |
   |---|---|
   | Pull request | `gh pr view <link> --json title,body,baseRefName,headRefOid,changedFiles,files,url` and `gh pr diff <link>`. Full files: if it belongs to this repository, `git fetch origin pull/<number>/head`, then `git show <headRefOid>:<path>`; otherwise `gh api "repos/<owner>/<repo>/contents/<path>?ref=<headRefOid>" -H "Accept: application/vnd.github.raw"` |
   | Branch | `git diff <base>...<branch>`, and `git show <branch>:<path>` for full files |
   | Commits | `git show <commit>` or `git diff <a>..<b>` |
   | Files or folders | The files themselves |
   | Uncommitted changes | `git diff HEAD` and the untracked files `git status --porcelain` lists |

5. **Relay.** Give the user the teamlead's review: the verdict, then the findings from critical to suggestion, each with its location, the problem, how it fails and the suggested fix. Then the checks it could not make, and its questions. If the teamlead was BLOCKED or needed context, tell the user what it needs.

## When another usecase reviews code

A usecase that has the teamlead review code (for example `create-feature` and `fix-bug`) uses the same criteria. In its teamlead prompt, it:

- names the change to review (for example "everything that differs from commit `<sha>`") and the context it is judged against (spec, plan, designs);
- tells the teamlead to follow `levi-code-review/references/review-guide.md` and its checklists (in the folder next to its own skill folder);
- says where the findings go (for example `review.md` and the workflow's schema) and which ones block;
- counts the reviewable files of the change, and when there are more than 100 reviews it in slices and merges the findings, as `references/large-changes.md` says. Only the lead's merge writes the review file; the slice reviewers write nothing.

The calling usecase's own rules come first: where the review is written, what blocks, and what may not be changed (for example locked tests). This usecase's rule of writing nothing applies only when it runs by itself.
