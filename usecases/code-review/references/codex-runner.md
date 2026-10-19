# Codex runner

This is the one Codex usecase that deliberately has no `run.json`: it is a single read-only `levi-teamlead` dispatch and creates no project artifacts. Resolve the target and pull-request access checks first, then dispatch the installed named teamlead agent with the exact review prompt in `SKILL.md`.

If the turn is interrupted before the review is returned, rerun the same read-only target check and dispatch. Do not write a checkpoint, comment on the pull request, or modify the working tree. Once the review is returned, relay it unchanged.
