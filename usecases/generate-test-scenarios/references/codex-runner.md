# Codex runner

Run from the project root with one durable state per invocation:

```bash
node <this skill folder>/scripts/codex-run-state.mjs status docs/levi/test-cases
node <this skill folder>/scripts/codex-run-state.mjs init docs/levi/test-cases generate-test-scenarios test-cases select analyze report generate verify
```

```bash
node <this skill folder>/scripts/codex-run-state.mjs begin docs/levi/test-cases <stage>
node <this skill folder>/scripts/codex-run-state.mjs complete docs/levi/test-cases <stage> <artifact>...
node <this skill folder>/scripts/codex-run-state.mjs wait docs/levi/test-cases <stage> "<questions>"
node <this skill folder>/scripts/codex-run-state.mjs block docs/levi/test-cases <stage> "<blocker>"
node <this skill folder>/scripts/codex-run-state.mjs resume docs/levi/test-cases
```

When a valid branch ends before the last stage, use `finish` rather than pretending later stages completed:

```bash
node <this skill folder>/scripts/codex-run-state.mjs finish docs/levi/test-cases report
```

Use `status` before continuing a stopped run. Begin the current stage, complete it only after its outputs exist, and use `wait`, `block`, and `resume` for user choices and dependencies. Record the selected feature list and output bases in `docs/levi/test-cases/selection.md`, then pass that file to `complete` for `select`. Do not regenerate a feature whose verify stage completed.

- `select`: find requested specs, report missing ones, and preserve required choices (all features, ambiguous codes, overwrite/versioned output) with `wait`. Complete when exact features and output bases are fixed in `selection.md`.
- `analyze`: dispatch one `levi-qa` agent per selected feature only. They may run in parallel because each owns `docs/levi/test-cases/<FeatureID>-analysis.md`. Complete only when every selected analysis exists.
- `report`: report `Generate: no` and ambiguities before any writing. If every selected feature is skipped, use `finish docs/levi/test-cases report` and clean up; otherwise continue.
- `generate`: dispatch QA only for features marked `Generate: yes`. Complete only when each `json` case source and both requested output files exist.
- `verify`: run `render-test-cases.mjs check` for every generated feature. QA may repair each failing feature once; a remaining failure marks this stage `block` with its errors. Complete only after all selected outputs validate, then cleanup removes the scratch state.

Only `levi-qa` writes analysis, case sources and deliverables. The coordinator does not edit those files.
