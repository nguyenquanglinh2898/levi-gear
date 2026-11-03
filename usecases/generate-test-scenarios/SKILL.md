---
name: levi-generate-test-scenarios
description: Have QA generate screen-level test cases (test scenarios) from the feature specs already in the repository, using the spec as the only source. It covers the positive path of every user story, role permissions, screen flow edge cases, validation and error states, and background logic, and lists where the spec is unclear. Each feature gets docs/tests/<FeatureID>-<slug>.md and a matching .xlsx sheet that can be imported into Jira, TestRail, Notion or a spreadsheet. Specs are never created or changed; a missing spec or missing information is reported up front. Fits requests such as "generate test cases for F001", "write test scenarios from the spec", "sinh test case cho F001, F002", "viết kịch bản test từ spec".
argument-hint: "<feature IDs (for example F001 F002) or spec files and folders; empty for every feature>"
skill-for: qa
skill-when: you write or change test cases or test scenarios, or record their results
skill-guide: references/test-case-guide.md
---

# Generate test scenarios

`levi-qa` writes the test cases; writing test cases is its job, and this skill's guide is how it does it in every usecase. You find the specs, ask the user what needs deciding, call QA once per feature for each pass, and report the result. You never write or edit a test case, a spec, or an output file yourself.

## The rules that never bend

- **The spec is the only source.** Every case comes from what the spec says. Nothing is inferred from the code, the UI, the designs or outside knowledge, and no function is invented.
- **Specs are read-only.** Nothing under `docs/specs/` (or any spec the user points to) is created, edited or completed. A missing spec or a gap in one is reported to the user, not filled in.
- **Unclear stays unclear.** Where the spec is vague or silent, nobody decides: the point goes into the case's notes and into the "spec ambiguities" section.
- **Never overwrite silently.** An existing output file is replaced only when the user says so.

## Files

| File | Owner | Purpose |
|---|---|---|
| `docs/tests/<base>.md` | QA | **Deliverable**: title and source spec, coverage summary, the test cases, spec ambiguities |
| `docs/tests/<base>.xlsx` | QA | **Deliverable**: one sheet, one row per case, columns `ID, Title, Category, Priority, Preconditions, Steps, Expected Result, Notes` |
| `docs/levi/test-cases/<FeatureID>-analysis.md` | QA | Scratch: spec items, coverage plan, ambiguities, readiness |
| `docs/levi/test-cases/<FeatureID>.json` | QA | Scratch: the cases the two deliverables are rendered from |
| `references/test-case-guide.md` | - | How QA analyzes the spec and writes the cases |
| `scripts/render-test-cases.mjs` | - | Checks the cases and renders both deliverables from them, so they always agree. The cases are also embedded in the `.md`, so QA can change them later |

## Features, IDs and file names

A feature is one spec file, or one folder of spec files, under `docs/specs/` (searched recursively). When one file holds several features under headings that start with a feature code, each of those sections is a feature, and its source is that section plus the file's shared sections (roles, glossary, common rules).

| Item | Rule |
|---|---|
| Feature ID | The code the spec gives the feature, such as `F001` or `FEAT-12`: at the start of the file or folder name (`F001-login.md`), in the title (`# F001: Login`) or in a header field (`ID: F001`). Uppercase. A spec with no code uses its slug in uppercase, for example `EXPORT-ORDERS-CSV` |
| Feature slug | The file or folder name without extension and without the code, in kebab-case. When nothing is left, the title in ASCII kebab-case |
| Output `<base>` | `<FeatureID>-<slug>` when the spec has a code (`F001-login`); `<slug>-test-cases` when it has none (`export-orders-csv-test-cases`) |
| Case ID | `TC-<FeatureID>-<3 digits>`, for example `TC-F001-001` |

## Steps

1. **Intake.** From the request, take the feature codes (`F001`, `F002`, ...) and the spec files or folders it names. Anything else in it (a focus such as "only permissions") is passed to QA as written.
2. **Find the specs.**
   - Paths given: each file or folder is a feature. A path that does not exist is missing.
   - Codes given: match each against `docs/specs/` by file and folder name, title and header fields, case-insensitively. No match: missing, reported as for example "No spec for F003 in docs/specs/".
   - Neither given: list every feature in `docs/specs/`. If there is none, tell the user (`docs/specs/` is missing or empty) and stop.

   Only the specs found this way are read. Work out each feature's ID, slug and output base.
3. **Ask the user, all at once.** In one round (use the tool's structured question feature if it has one; if it limits the number of questions per call, make the calls back to back), ask only what applies:
   - *No codes or paths were given:* list the features found and ask whether to generate for all of them or which ones. Do not generate for the whole project without this confirmation.
   - *A code matches more than one spec:* which one.
   - *`docs/tests/<base>.md` or `.xlsx` already exists:* replace it, or write a new version with a date suffix, `<base>-YYYYMMDD` (today's date; if that exists too, add `-2`, `-3`, ...).

   In the same message, before the questions, tell the user every missing spec. If no feature is left to generate, say so and stop. Skip the questions when none applies.
4. **Analyze.** Call `levi-qa` once per feature (in parallel when the tool allows), with this prompt filled in:

   ```text
   Analysis pass for feature <FeatureID>: <feature name or slug>.

   Spec files (your only source): <paths, and the section when it is part of a file>
   Write (yours as QA; create the folder if needed): docs/levi/test-cases/<FeatureID>-analysis.md
   What the user asked: <the request, word for word>

   Follow <this skill's folder>/references/test-case-guide.md, "The source rule" and "Analysis".
   Read nothing but the spec files above and that guide. Do not change any spec. Write no other file.
   ```

5. **Report what is missing, up front.** Before any case is written, tell the user in one message, per feature: `Generate: no` with what the spec lacks (that feature is skipped), and for the others the Missing line and the number of ambiguities found. Then go on; this is information, not a question. If every feature is `Generate: no`, delete the scratch folder and stop.
6. **Generate.** For every feature with `Generate: yes`, call `levi-qa` (in parallel when the tool allows):

   ```text
   Generation pass for feature <FeatureID>: <feature name or slug>.

   Spec files (your only source): <paths, and the section when it is part of a file>
   Your analysis: docs/levi/test-cases/<FeatureID>-analysis.md
   Cases file: docs/levi/test-cases/<FeatureID>.json
   Output base: docs/tests/<base>
   Replace existing files: <yes, pass --force | no>

   Follow <this skill's folder>/references/test-case-guide.md, "The source rule" and "Writing test cases".
   Read nothing but the spec files, your analysis and that guide. Do not change any spec.
   Report the case count and every ambiguity that remains.
   ```

7. **Verify.** For each feature, run `node <this skill's folder>/scripts/render-test-cases.mjs check docs/levi/test-cases/<FeatureID>.json` and check that `docs/tests/<base>.md` and `docs/tests/<base>.xlsx` exist. If the check fails or a file is missing, send QA the errors once to fix and render again. If it still fails, report the feature as not done, with the errors.
8. **Clean up.** Delete `docs/levi/test-cases/`, and `docs/levi` if that is empty. Delete only after step 7.
9. **Report.** A short summary, in the language of the request:
   - per feature: the number of cases (by priority), the two file paths, and the spec it came from;
   - features not generated: missing specs and specs that lacked what was needed;
   - the spec ambiguities to clarify with QA and BA, one line each (feature, spec item, issue).

   If QA was BLOCKED or needed context, say what it needs.

Without a parallel subagent feature, run the QA calls of steps 4 and 6 one after another; the steps are the same.
