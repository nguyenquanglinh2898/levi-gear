# Codex runner

Run from the project root and persist the workflow after intake derives the slug:

```bash
node <this skill folder>/scripts/codex-run-state.mjs status docs/levi/<slug>
node <this skill folder>/scripts/codex-run-state.mjs init docs/levi/<slug> design <slug> context references draw decide check finalize
```

```bash
node <this skill folder>/scripts/codex-run-state.mjs begin docs/levi/<slug> <stage>
node <this skill folder>/scripts/codex-run-state.mjs complete docs/levi/<slug> <stage> <artifact>...
node <this skill folder>/scripts/codex-run-state.mjs wait docs/levi/<slug> <stage> "<questions>"
node <this skill folder>/scripts/codex-run-state.mjs block docs/levi/<slug> <stage> "<blocker>"
node <this skill folder>/scripts/codex-run-state.mjs resume docs/levi/<slug>
```

Read `status` first after an interruption. Begin the active stage, complete it only after the listed output is present, and use `wait`, `block`, and `resume` for user decisions and external prerequisites. Do not redo a completed stage or rewrite a user upload.

- `context`: select the target design folder and optional read-only spec.
- `references`: make only the permitted reference descriptions and video frames. If ffmpeg is missing, mark this stage `block` with the request for screenshots or ffmpeg; do not guess the video.
- `draw`: dispatch `levi-designer` with exact input/output paths. Complete only when the output folder contains its SVG files.
- `decide`: run the initial checker/render needed to make an informed decision, then preserve the designer's material questions with `wait`. After an answer, `resume` and make the permitted final design change; otherwise complete with the recorded assumptions. Do not mark final verification complete here.
- `check`: run the final SVG checker and, when available, render the final files. If a repair is needed, keep this stage active while the designer gets the exact findings once, then check again. Record the render/check artifacts.
- `finalize`: report verified SVG files, then remove frames, reference descriptions, renders and `run.json`. Never delete uploads or the read-only spec.

Only `levi-designer` writes SVG files. The coordinator runs checks and advances state.
