# Codex runner

Run this workflow from the project root with a durable checkpoint. Initialize it immediately after intake:

```bash
node <this skill folder>/scripts/codex-run-state.mjs status docs/levi/<slug>
node <this skill folder>/scripts/codex-run-state.mjs init docs/levi/<slug> spec-writing <slug> discover decide write verify
```

```bash
node <this skill folder>/scripts/codex-run-state.mjs begin docs/levi/<slug> <stage>
node <this skill folder>/scripts/codex-run-state.mjs complete docs/levi/<slug> <stage> <artifact>...
node <this skill folder>/scripts/codex-run-state.mjs wait docs/levi/<slug> <stage> "<questions>"
node <this skill folder>/scripts/codex-run-state.mjs block docs/levi/<slug> <stage> "<blocker>"
node <this skill folder>/scripts/codex-run-state.mjs resume docs/levi/<slug>
```

On a resumed run, `status` is authoritative. Begin the current stage, complete it only after the stated artifact exists, and never repeat a completed stage. Use `wait` to preserve unanswered user questions, `block` for an external dependency, and `resume` after it is resolved.

- `discover`: select update/new mode and dispatch `levi-pm` to write `ledger.md`. Complete with that ledger.
- `decide`: run the up-to-three user-answer rounds. Before each question round use `wait`; after the answer use `resume` and have the PM update `ledger.md`. Complete when it is ready to write, when the user explicitly asks to write with remaining questions, or mark `block` when the goal/users/core scope cannot be confirmed.
- `write`: dispatch `levi-pm` once with the ledger and selected spec path. Complete only when `docs/specs/<slug>.md` exists.
- `verify`: confirm the PM-owned spec is the requested new/update output and report its status. Cleanup can remove the state and ledger only after this stage completes.

The coordinator never edits the ledger or spec. Only `levi-pm` writes them.
