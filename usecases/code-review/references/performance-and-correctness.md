# Performance and correctness checklist

Every item says what to look for and the usual fix. Each heading is the category used in finding titles. Apply the fix in the project's own framework, and judge cost at the data sizes production will reach, not the test data.

## N+1 query

Look for:
- A query, an API call or a lazy-loaded relation inside a loop, a `map`, a serializer or a template that runs once per row (`orders.forEach(o => o.customer)`, a GraphQL resolver per field).
- A count or existence check per item in a list.

Fix: load in one query with the ORM's eager loading (`include`, `joinedload`, `includes`, `with`, `preload`), a join, or one `WHERE id IN (...)` and a map in memory. Use a batch loader (DataLoader) for GraphQL resolvers.

## Missing index

Look for:
- A new query, filter, sort or join on columns with no index, on a table that grows: `WHERE`, `ORDER BY`, `JOIN ON`, foreign keys, unique lookups such as email or slug.
- A composite filter whose index has the columns in the wrong order, or a `LIKE '%term'` or a function on the column that cannot use the index.
- A migration that adds an index or a column with a default on a large table in a way that locks it.

Fix: add the index in a migration (composite in the order of equality filters first, then range or sort). Use a full-text or trigram index for substring search. Build indexes without locking where the database supports it (`CREATE INDEX CONCURRENTLY` in PostgreSQL). Check the plan with `EXPLAIN`.

## Unbounded work

Look for:
- Queries or endpoints with no `LIMIT` or pagination, `SELECT *` on wide tables, a whole table or file loaded into memory.
- Work that grows with input and has no cap: exports, bulk operations, regular expressions open to catastrophic backtracking, recursion with no depth limit.
- Slow work done in the request path (sending email, image processing, calls to slow services) that could run in the background.

Fix: paginate (cursor-based for large or changing sets), select only the needed columns, stream or process in batches, cap sizes, and move slow work to a queue.

## Inefficient algorithm

Look for:
- Nested loops over the same or related collections (O(n²)), `includes` or `indexOf` inside a loop, repeated sorting, string building by concatenation in a loop.
- The same expensive value computed again and again (in a loop, on every render, on every request) when it could be computed once.

Fix: use a map or set for lookups, sort once, hoist invariant work out of the loop, memoize or cache with a clear invalidation rule. Only flag it when the input can realistically be large; otherwise it is at most a suggestion.

## Race condition

Look for:
- Check then act on shared state without a lock or a constraint: "if the username is free, insert", "if the balance is enough, debit", "if the stock is above zero, decrement".
- Read, modify, write of a counter or document without an atomic update or a version check.
- Shared mutable state in a process that serves concurrent requests: module-level variables, singletons, caches without locking.
- Async code where a promise is not awaited, callbacks run in an order that is assumed, or two requests can interleave between steps.
- Jobs or webhooks that can run twice or at the same time with no idempotency.

Fix: let the database enforce it (unique constraint, `UPDATE ... SET qty = qty - 1 WHERE qty > 0`, `SELECT ... FOR UPDATE` in a transaction), use optimistic locking with a version column, use atomic operations of the store, and make jobs idempotent. Await every promise, or handle it explicitly.

## Transactions and consistency

Look for:
- Several writes that must succeed or fail together without a transaction.
- External calls (payment, email, another service) inside a database transaction, or a write to two systems with no plan for one of them failing.
- An isolation level too weak for the invariant the code relies on.

Fix: wrap related writes in one transaction, keep external calls out of it, and use an outbox or a compensating step for writes across systems.

## Memory and resource leak

Look for:
- Event listeners, subscriptions, intervals, timers or observers added and never removed (for example in a component without cleanup, or on every request).
- Caches, maps or arrays at module level that only grow.
- Connections, file handles, streams, cursors or transactions not closed on every path, including errors.
- Large objects kept alive by closures, or held after they are needed.

Fix: remove listeners and clear timers in the matching teardown (`useEffect` cleanup, `ngOnDestroy`, `finally`). Bound caches by size and age (LRU, TTL). Use `try/finally`, `with`, `using` or `defer` to release resources. Use the connection pool and never open a connection per call.

## Error handling

Look for:
- Errors swallowed: an empty `catch`, a `catch` that logs and goes on as if it worked, a returned error value that is never checked.
- Async errors that are lost: no `await`, no `.catch`, unhandled rejections in background tasks.
- Every error mapped to 500, or details of internal errors and stack traces returned to the client.
- Calls to the network or other services with no timeout, or retries with no backoff and no limit, or retries of actions that are not idempotent.
- Partial failure leaving data half written.

Fix: handle the errors you can recover from, let the others propagate to one handler that logs them and returns a safe message with the right status (400 for bad input, 404, 409 for conflicts). Set timeouts on every external call, retry only idempotent operations with backoff and a cap, and roll back or compensate on partial failure.

## Logic and edge cases

Look for:
- Null or missing values not handled, off-by-one in ranges and pagination, empty lists, first and last items.
- Money in floating point, rounding done in the wrong place, mixed currencies.
- Time zones and dates: local time stored where UTC is expected, daylight saving, end of month, dates compared as strings.
- Comparison and type mistakes: `==` coercion, string and number mixed, integer overflow, case and Unicode in comparisons.
- Behavior that does not match the spec or acceptance criteria the prompt gives.

Fix: handle the case explicitly, and name the input that triggers it. Use integer minor units or a decimal type for money, and store times in UTC.

## Breaking API change

Look for:
- In any public contract (HTTP or GraphQL API, event or message schema, exported function or type of a library, CLI flags, configuration keys, database schema read by others):
  - a removed or renamed field, endpoint, parameter, export or option;
  - a changed type, format, unit, default, status code or error shape;
  - a new required input, or a stricter validation of existing input;
  - a change in meaning with the same shape (sort order, inclusive or exclusive range, null now means something else).
- Database migrations that drop or rename a column still read by code that is deployed, or that cannot be rolled back.

Fix: keep the change additive (new optional fields, new endpoints) and keep the old shape working. When a break is needed, version it (`/v2`, a new event type, a major version), mark the old one deprecated with a removal date, and note it in the changelog. For schema changes, expand then contract: add the new column, write to both, backfill, switch reads, and remove the old column in a later release.
