# Review guide

How `levi-teamlead` reviews code, in this usecase and in every usecase that points here. The prompt that brings you here names the target, the context to judge it against, and where the findings go. When the prompt and this guide disagree on where findings go, what blocks, or what may not be changed, the prompt wins.

Read the two checklists in this folder before you start:

- [security.md](security.md): security, by OWASP Top 10 category.
- [performance-and-correctness.md](performance-and-correctness.md): performance and correctness.

## How to review

1. **Know the intent.** Read what the change is for: the spec, plan or designs the prompt gives, the pull request title and body, the commit messages. Judge the code against that intent, not against what you would have written.
2. **Read the whole change.** Every changed file, in full where the diff alone does not show enough. Skip generated files, lock files, vendored code and build output, but check that dependency changes in manifests are deliberate (see the supply chain items in the security checklist).
3. **Read around it.** For each changed function, look at its callers and what it calls; for each query, the schema and indexes; for each endpoint, the route, the middleware and the authorization it goes through; for configuration, every environment it reaches. A change is correct only in its context.
4. **Follow the data.** Trace every input that crosses a trust boundary (request, file, message, header, environment, third-party response) to where it is used: a query, a shell command, a template, a file path, a URL, a deserializer, a log. Most security findings sit on that path.
5. **Walk both checklists.** Go through every item that applies to the code. Skip the ones that cannot apply (no XML parsing means no XXE), and do not report items as passed one by one.
6. **Try to break it.** For each finding, write the concrete case that fails: the input, the timing, the data size or the caller that triggers it. If you cannot make one, it is not a finding.
7. **Write the fix.** Give the change to make, where, in the project's language, framework and conventions. Prefer the framework's built-in protection (parameterized queries, the ORM's eager loading, the template engine's escaping, the framework's CSRF and auth middleware) over hand-written code.

## Scope

- Review the change and what it directly affects, such as a caller it breaks or a query it slows. When the target is files or folders rather than a change, review all of them.
- A problem that was already there in code the change did not touch is out of scope, unless the change makes it worse or it is a critical security hole. Then report it and mark it **pre-existing**.
- Leave formatting and naming to the linter, unless they break a convention the project documents.
- Do not report a problem twice. When one cause shows in several places, report it once and list every location.

## Severities

| Severity | Meaning | Blocks merge |
|---|---|---|
| **critical** | Exploitable vulnerability, leaked secret, data loss or corruption, a crash on a main path, or a breaking change to a public contract with no migration | Yes |
| **warning** | A real defect under realistic conditions: an N+1 on a list, a missing index on a growing table, a race on shared state, an unhandled error path, a leak in a long-running process, a missing authorization check behind other protection | Yes |
| **suggestion** | Worth doing, not wrong today: hardening, a cheaper algorithm for inputs that stay small, clearer error messages | No |

Grade on impact and likelihood together. Judge likelihood by the realistic production load and the inputs real users and attackers send, not by the test data. Do not inflate a grade to be heard or lower one to be kind: a critical finding stays critical even when the author is senior or the deadline is close.

## Finding format

Each finding:

````markdown
### [critical] A03 Injection: SQL built from the search term
- **Where:** `src/orders/repository.js:42` (also `src/orders/export.js:17`)
- **Problem:** `search` from the query string is concatenated into the SQL text.
- **How it fails:** `?search=' OR 1=1 --` returns every customer's orders.
- **Fix:** Pass it as a bound parameter:
  ```js
  db.query('SELECT * FROM orders WHERE customer_id = $1 AND note ILIKE $2', [userId, `%${search}%`])
  ```
- **Assumption:** (only when the finding depends on something you could not see; say what to check)
````

- The title starts with the severity and a category: the OWASP category for security (for example `A01 Broken Access Control`), otherwise the checklist heading (for example `N+1 query`, `Race condition`, `Breaking API change`).
- **Where** gives a path and line for every location.
- **How it fails** is the concrete case from step 6 of [How to review](#how-to-review).
- **Fix** is specific enough to apply without guessing: code for small fixes; for larger ones, the steps and the pattern, with a short sketch.

## Verdict

- **Request changes** when any critical or warning finding is left.
- **Approve** otherwise. Approving with suggestions is fine.

## The reply

Unless the prompt says otherwise, reply with:

1. **Verdict** and a one-line summary: what the change does and its main risk.
2. **Findings**, critical first, then warning, then suggestion, in the format above. Write "No findings." when there are none.
3. **Not checked:** what you could not verify and why (for example a file too large to read, configuration that is not in the repository, a service you could not reach).
4. Your report block from the team protocol, with any questions for the user under "Questions".
