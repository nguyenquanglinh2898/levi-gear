# Reviewing large changes

One reviewer reading hundreds of files skims, and a skimmed review finds a few problems per round, so the author fixes, resubmits and meets the next few. A large change is therefore reviewed in slices by several teamlead calls at the same time, and one lead teamlead merges their findings into a single review. The author then gets everything in one go.

Every usecase that has the teamlead review code follows this file, whatever else it says about where the review goes and what blocks. It applies to every review round, not only the first.

Team members never call each other, so the **usecase that runs the review** (the workflow or the skill you are following) does the calling and the counting. The teamlead calls below are fresh and independent: each sees only its prompt.

## When it applies

Count the **reviewable files** of the change: the changed files, leaving out generated files, lock files, vendored code and build output (the review guide's list).

| Reviewable files | Review |
|---|---|
| 100 or fewer | One teamlead call, as the usecase says |
| More than 100 | Slices, as below |

Count from the whole change, never from a listing that may be cut off. For a pull request use `gh pr view <link> --json changedFiles` for the number and `gh api --paginate "repos/<owner>/<repo>/pulls/<number>/files" --jq '.[].filename'` for the names (`gh pr view --json files` stops at 100 files, and `gh pr diff` fails on very large diffs: read a pull request from this repository locally, with `git fetch origin pull/<number>/head` and a diff against the merge base).

## Steps

1. **Split.** One `levi-teamlead` call (the lead) gets the target, the file list with the changed lines of each file, and the rule below. It returns the slices: a title, the files, and one line on what the slice shares with the others (an interface, a schema, a config).
   - At most 100 files per slice, and as few slices as that allows.
   - Group by what belongs together: a module or feature with its tests, callers, schema and migrations; one layer of a cross-cutting change. Never by alphabet or by chunks of 100.
   - Every reviewable file is in exactly one slice. Check this yourself before going on; send an incomplete or oversized split back to the lead once, and if it is still wrong, cut the list by directory order into slices of at most 100 files.
2. **Review the slices**, one fresh `levi-teamlead` call per slice, all at the same time (in batches when the tool limits how many run at once). Each gets: the same prompt a single review would get (target, how to read it, focus, context, the guide and checklists), its own files, the title and shared-interface line of every other slice, and these rules:
   - Review every file of your slice in full and walk both checklists. Read outside the slice whenever you need context.
   - **Report everything you find, in one pass, whatever the severity.** Nothing is kept back for a later round: the author will fix the whole list at once.
   - Report on your slice's files. When a change in your slice breaks, or relies on, code in another slice, report it on your file and name the other location. A concern that only the other slice's reviewer can settle goes under "Cross-slice".
   - Change nothing and write no file: your reply is the only output. The review guide's finding format applies; give no verdict for the whole change.
3. **Merge**, one fresh `levi-teamlead` call (the lead) gets every slice report and the split. It writes the one review the usecase asks for, in the guide's format, with one verdict:
   - Join findings that have one cause (list every location), and give equal problems equal severity across slices.
   - Settle each cross-slice item by reading the code on both sides; keep it as a finding, or drop it with a reason.
   - Re-read the location of every critical finding before keeping it.
   - Keep every valid finding. Add nothing new except what the cross-slice items turn up.
   - A slice that returned nothing usable is called again once. If it still fails, the review is incomplete: the slice goes under "Not checked" and the verdict cannot be Approve (a workflow stops as blocked instead of continuing).
4. **Hand over** the merged review to whoever acts on it (the developer, or the user for `code-review`), as one list.
