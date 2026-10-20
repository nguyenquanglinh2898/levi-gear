# Codex runner

This is the one Codex usecase that deliberately has no `run.json`: every dispatch is read-only and creates no project artifacts. Resolve the target and pull-request access checks first, size the change, then dispatch the installed named teamlead agent: once with the exact review prompt in `SKILL.md` for 100 or fewer reviewable files, or as `large-changes.md` says (a split, the slice reviews at the same time, then a merge) for more.

If the turn is interrupted before the review is returned, rerun the same read-only target check, sizing and dispatches. Do not write a checkpoint, comment on the pull request, or modify the working tree. Once the review is returned, relay it unchanged.
