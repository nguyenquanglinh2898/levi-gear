# Test case guide

How `levi-qa` writes, changes and runs test cases (also called test scenarios), in the `generate-test-scenarios` usecase and in every other one: whichever workflow asks you for test cases, this is how you do it.

The prompt gives you:

- the **sources**: the files the cases come from (a spec, and sometimes designs, a bug report or the points the user confirmed);
- the **feature ID** (`F001`, `EXPORT-ORDERS-CSV`, ...), which every case ID carries;
- the **cases file**: a JSON scratch file the cases are written in;
- the **output base**: the path, without extension, of the two files rendered from it (`docs/tests/F001-login` gives `docs/tests/F001-login.md` and `.xlsx`).

When the prompt leaves the feature ID or the output base out, derive them as the "Features, IDs and file names" table in `SKILL.md` says. When it leaves the cases file out, use `docs/levi/<slug>/test-cases.json` in the work folder. These files are yours as QA; create their folders as needed. Paths in this guide are relative to the skill folder, the parent of `references/`.

## The source rule

- **The sources are the only source.** Read only the sources the prompt names, and this guide. Do not read application code, tests, or anything else the prompt does not name, and do not use what similar products usually do. A case, a step or an expected result that no source supports does not get written.
- **Never touch a source.** Specs and the other sources are read-only, even for a typo. What is wrong or missing in them goes into the ambiguities.
- **Do not decide for the spec.** When a source is unclear, silent or contradicts itself on a point a case needs, do not pick an answer. If the case can still be run and checked without that point, write it without it and say so in its notes; if a step or the expected result depends on it (an unstated limit, count or message), leave the case out. Record the point as an ambiguity either way, and, when the prompt asks for questions, list it there too.
- **Test data is not invention.** A concrete input that illustrates a rule the source states (an email without `@` for "email must be valid") is test data, and allowed. A value that settles what the source leaves open (whether a limit is inclusive, how many attempts lock an account) is not: that is an ambiguity.
- **Write in the language of the spec** (or of the sources, when there is no spec). Titles, preconditions, steps, expected results, notes, ambiguities and the section labels follow it. Field names, IDs, categories and priorities stay as defined below.

## References

Every case names the items it comes from. Use the source's own IDs when it has them (`US-1`, `AC-3`, `BR-2`). When an item has no ID, name its place: the section heading plus the item's position, counting list items, table rows or sentences of a paragraph, for example `Validation rules #2` or `Screen flow #3`; for a bug report, `Report` or `Confirmed #2`. Use the same reference everywhere for the same item. An ambiguity that spans several items lists them comma-separated, for example `V-1, V-3`.

## Coverage areas

| Area | What to cover | Category |
|---|---|---|
| Positive path | Each user story done the way the spec describes it, at least one case per story | Functional |
| Permissions | Each role the spec allows can do the action; each role the spec forbids, or that is not among the allowed ones when the spec lists them, is refused in the way the spec says | Security |
| Screen flow edge cases | Navigation the spec describes: back, cancel, leaving and returning, the transitions between screens and states | Functional or UX |
| Validation and error states | Required fields, formats, lengths, boundary values (at the limit, just below, just above), each error state and message | Functional |
| Background logic | Each trigger the spec gives for background processing, and the outcome it says is observable | Functional |

- Cover only the areas the sources give material for. When a gap matters (for example a form with no validation rules), it is an ambiguity.
- Use **UX** for what the spec says about feedback, messages, loading and empty states; **Performance** and **Accessibility** only for requirements the spec states, such as a time limit or a screen reader label.
- Boundary values come from the spec's numbers. If the spec gives a limit without saying whether it is inclusive, that is an ambiguity.
- The prompt can add what must be covered, for example every acceptance criterion, or the steps of a bug report as the first case.

## Analysis

Only when the prompt asks for an analysis pass. Read the sources and write the analysis file you are given, in this format:

```markdown
# <FeatureID>: <feature name>

## Spec items
| Ref | Kind | Summary |
|---|---|---|
| US-1 | story | <one line> |

## Coverage plan
| Area | Spec items | Planned cases |
|---|---|---|
| Positive path | US-1 | <what each case checks, one line each> |

## Ambiguities
| # | Spec item | Issue |
|---|---|---|
| 1 | AC-3 | <what is unclear, silent or contradictory, and what a case needs to know> |

## Readiness
Generate: yes | no
Missing: <what the spec lacks; "none">
```

- **Kind** is one of `story`, `screen-flow`, `permission`, `background`, `validation`, `error-state` or `other`. List every item of these kinds the spec contains.
- **Generate** is `no` only when the spec gives nothing that can be tested: no story, no flow, no rule with an observable outcome. A spec that only lacks some areas is still `yes`; the gaps are listed under Missing and as ambiguities.

## Writing test cases

Plan the coverage (in your head, or from your analysis when there is one), write the cases file as JSON, check it and render it.

### Fields

| Field | Rule |
|---|---|
| `id` | `TC-<FeatureID>-<3 digits>`, numbered from 001 in order, no gaps |
| `title` | Short, says exactly what is checked |
| `category` | `Functional`, `UX`, `Security`, `Performance` or `Accessibility` |
| `priority` | `P0`: blocks the main flow, or security. `P1`: important function. `P2`: minor or cosmetic |
| `preconditions` | Data state, user role and the starting screen. Line breaks are allowed |
| `steps` | One action per step, in order, without numbers (the script numbers them) |
| `expected` | A concrete, observable result, worded as the source words it, checkable yes or no |
| `refs` | The items the case traces to |
| `positive` | `true` for a case that completes a user story as described, `false` otherwise |
| `notes` | Optional: what QA must confirm, and the ambiguity the case depends on |
| `status`, `evidence` | Only once the case has been run, see [Recording results](#recording-results) |

### JSON format

```json
{
  "featureId": "F001",
  "featureName": "<feature name as the spec gives it>",
  "spec": ["docs/specs/F001-login.md"],
  "labels": {
    "title": "Test cases",
    "source": "Spec",
    "total": "Total",
    "result": "Result",
    "coverage": "Coverage",
    "category": "Category",
    "priority": "Priority",
    "preconditions": "Preconditions",
    "steps": "Steps",
    "expected": "Expected Result",
    "notes": "Notes",
    "status": "Status",
    "evidence": "Evidence",
    "cases": "Test cases",
    "ambiguities": "Spec ambiguities",
    "item": "Spec item",
    "issue": "Issue",
    "affected": "Affected cases",
    "none": "None.",
    "specRef": "Spec"
  },
  "stories": [{ "ref": "US-1", "title": "<story in one line>" }],
  "cases": [
    {
      "id": "TC-F001-001",
      "title": "<title>",
      "category": "Functional",
      "priority": "P0",
      "preconditions": "<preconditions>",
      "steps": ["<action>", "<action>"],
      "expected": "<expected result>",
      "refs": ["US-1", "AC-1"],
      "positive": true,
      "notes": "<optional>"
    }
  ],
  "ambiguities": [{ "ref": "AC-3", "issue": "<what is unclear>", "cases": ["TC-F001-004"] }]
}
```

- `spec` lists every source file the cases come from.
- `labels` holds the headings and field names of the Markdown file and the `Spec:` prefix of the notes. Translate them all into the spec's language; leave out only those you keep in English. The column headers of the `.xlsx` file always stay in English, so that importers recognize them.
- `stories` lists every user story of the spec. Leave it empty only when the sources have none; when a spec has none, say so as an ambiguity.
- `ambiguities` carries every ambiguity that still stands. `cases` lists the cases that depend on it, or is empty.

### Check and render

1. `node scripts/render-test-cases.mjs check <cases file>` (the script is in the skill folder). Fix every error it prints and run it again until it passes. It checks the ID format and order, the field values, duplicate cases, that every story has a positive case, and that ambiguities point to real cases.
2. Check what the script cannot, and fix what fails:
   - every case traces to a source item that says what the case expects; nothing is invented;
   - each step is a single action;
   - each expected result can be observed and checked yes or no;
   - no two cases check the same thing with different words;
   - every area you planned has its cases, and everything the prompt said must be covered is.
3. `node scripts/render-test-cases.mjs render <cases file> <output base>`. It writes `<output base>.md` and `<output base>.xlsx`, and refuses to replace them: add `--force` only when they are already yours (written by you earlier in this run, or a set you are changing) or the prompt says to replace them. Never write or edit those two files by hand.

## Changing test cases

The rendered files belong to QA, and only QA changes them, always through the cases file:

1. When you do not have the cases file of this run, get it back from the rendered Markdown: `node scripts/render-test-cases.mjs extract <output base>.md <cases file>` (the data is embedded at the end of the file, in a comment that viewers do not show).
2. Change the cases in the JSON: fix what a review found, cover a changed source, add or remove cases. Keep the numbering from 001 with no gaps.
3. Check and render again, with `--force`.

Never change an expected result to match what the product does. When you think the source is wrong, it is an ambiguity or a question, not a change to the case.

## Recording results

When you run the cases (end to end, in a headless browser through the project's E2E runner or a browser tool, or through the API or CLI when there is no UI):

1. Follow each case's preconditions and steps as written, and compare with its expected result.
2. In the cases file, give each case you ran `"status": "PASS"` or `"status": "FAIL"`, and `"evidence"`: what you observed (for FAIL, the actual result against the expected one, and the error). A case you could not run is FAIL, with the reason: untested is not passed.
3. Check and render again, with `--force`. The Markdown then shows the result of each case and the total, and the `.xlsx` gets `Status` and `Evidence` columns.
