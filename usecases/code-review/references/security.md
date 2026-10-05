# Security checklist

Grouped by the OWASP Top 10 (2021 edition), whose IDs are used in finding titles. Older names fold in as follows: sensitive data exposure is A02, XSS is A03, XXE is A05, insecure deserialization is A08. Newer editions also list software supply chain failures and the mishandling of exceptional conditions; the first is covered under A06, the second in the last section, whose findings use the category `Exceptional conditions`.

Every item says what to look for and the usual fix. Apply the fix in the project's own framework.

## A01 Broken Access Control

Look for:
- An endpoint, resolver, job or message handler that reads or changes data with no authorization check, or one that checks only that the user is logged in.
- Objects loaded by an ID from the request without checking that the current user owns them or may see them (IDOR): `GET /orders/:id`, `DELETE /files/:id`.
- Authorization done only in the UI (hidden buttons, disabled fields) and not on the server.
- Role or tenant taken from the request body, a query string or an unsigned cookie instead of the server-side session or a verified token.
- Mass assignment: the whole request body bound to a model, so a client can set `role`, `isAdmin`, `ownerId`, `price`.
- Queries in a multi-tenant system without a tenant filter.
- File paths built from input (`../` path traversal); CORS that reflects any origin with credentials.
- A missing CSRF check on cookie-authenticated state-changing requests.

Fix: check authorization on the server for every action, deny by default, in one place (policy, middleware, guard). Scope queries by the owner or tenant (`WHERE id = $1 AND owner_id = $2`). Allow-list the fields a client may set. Resolve paths and check they stay under the intended root. Use the framework's CSRF protection and an explicit CORS allow-list.

## A02 Cryptographic Failures (sensitive data exposure)

Look for:
- Passwords stored in plain text or hashed with a fast hash (MD5, SHA-1, SHA-256 with no work factor).
- Secrets in the code, in committed config, in logs, in error messages, in URLs or in client bundles.
- Sensitive fields (password hash, tokens, national ID, card data, internal notes) returned in API responses or serialized whole from the model.
- Personal or secret data sent over plain HTTP, or stored without encryption where the project requires it.
- Weak or home-made crypto: ECB mode, a fixed IV, `Math.random()` or a similar non-cryptographic generator for tokens, reset codes or IDs that must not be guessed.
- TLS verification turned off (`rejectUnauthorized: false`, `verify=False`).

Fix: hash passwords with bcrypt, scrypt or Argon2. Load secrets from the environment or a secret manager, and rotate any that leaked. Return explicit DTOs or serializers with an allow-list of fields. Use the platform's CSPRNG and vetted libraries with authenticated encryption (AES-GCM). Keep TLS verification on.

## A03 Injection (including XSS)

Look for:
- SQL, NoSQL, LDAP or ORM raw queries built by concatenation or string formatting with input. Includes `ORDER BY`, column names and `LIKE` patterns.
- NoSQL operator injection: a JSON body passed straight into a filter (`{"$gt": ""}`).
- Shell commands built from input (`exec`, `system`, `subprocess` with `shell=True`, backticks).
- Template injection: user input used as a template rather than as data.
- XSS: input rendered without escaping (`innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `|safe`, `{!! !!}`, `html_safe`), input in `href` or `src` (`javascript:` URLs), or in inline scripts and event handlers.
- Header and log injection: CR/LF from input written into headers or log lines.

Fix: bound parameters or the query builder for values, and an allow-list for identifiers such as sort columns. Validate the type and shape of input at the boundary (schema validation). Call processes with an argument array and no shell. Let the template engine escape by default. Sanitize HTML that must be rendered with a vetted sanitizer (for example DOMPurify), and add a Content Security Policy.

## A04 Insecure Design

Look for:
- No rate limit or lockout on login, reset, OTP, signup, search or other costly endpoints.
- Business rules that a client can bypass: a price, discount, quantity or state sent from the client and trusted; steps of a flow that can be skipped or replayed.
- Payments, transfers or other one-time actions with no idempotency key.
- No upper bound on input size, page size, upload size or the number of items in a request.

Fix: rate limit and lock out on the server. Recompute prices and permissions on the server and check state transitions there. Use idempotency keys for one-time actions. Set limits on every size and count.

## A05 Security Misconfiguration (including XXE)

Look for:
- Debug mode, stack traces or verbose errors enabled in production configuration.
- Default credentials, sample accounts, open admin panels, permissive CORS, missing security headers.
- Public storage buckets, or files and directories served that should not be (`.env`, `.git`, backups).
- XML parsers with external entities or DTDs enabled (XXE): `DocumentBuilderFactory`, `XMLReader`, `lxml`, `libxml` defaults, SOAP and SVG uploads.
- Cookies without `HttpOnly`, `Secure` and a suitable `SameSite`.

Fix: separate production configuration with debug off and generic error responses. Add security headers (HSTS, CSP, `X-Content-Type-Options`). Disable DTDs and external entities in every XML parser (or use a safe wrapper such as `defusedxml`). Set the cookie flags.

## A06 Vulnerable and Outdated Components (supply chain)

Look for:
- New or upgraded dependencies: are they needed, maintained, and spelled right (typosquatting)? Do they pull install scripts?
- Versions with known vulnerabilities, unpinned versions, or a lock file not updated with the manifest.
- Code, scripts or images fetched from unverified sources at build or run time (`curl | sh`, `latest` tags).
- CI changes that expose secrets to untrusted pull requests.

Fix: pin versions and commit the lock file. Run the ecosystem's audit (`npm audit`, `pip-audit`, `bundle audit`, `govulncheck`) and upgrade or replace what it flags. Verify checksums and pin images by digest. Keep secrets out of jobs triggered by forks.

## A07 Identification and Authentication Failures (broken auth)

Look for:
- Login, reset or token checks that leak whether an account exists, or compare secrets with `==` instead of a constant-time compare.
- JWTs accepted with `alg: none`, without checking the signature, expiry, issuer or audience, or signed with a weak or committed secret.
- Sessions not rotated on login or privilege change, not invalidated on logout or password change, or with no expiry.
- Reset and verification tokens that are guessable, reusable or never expire.
- Tokens stored in `localStorage` where an HttpOnly cookie is possible.

Fix: use the framework's or a vetted library's authentication. Verify every JWT claim with a pinned algorithm. Rotate session IDs on login. Make reset tokens random, single use and short lived. Return the same response whether or not the account exists.

## A08 Software and Data Integrity Failures (insecure deserialization)

Look for:
- Untrusted data passed to a deserializer that can build arbitrary objects: Java `ObjectInputStream`, Python `pickle` or `yaml.load`, PHP `unserialize`, .NET `BinaryFormatter`, Ruby `Marshal`, Node `node-serialize`.
- Webhooks, callbacks or messages accepted without verifying their signature.
- Updates, plugins or data pulled without an integrity check.

Fix: accept plain data formats (JSON) validated against a schema; use safe loaders (`yaml.safe_load`). Verify HMAC signatures on webhooks with a constant-time compare. Check signatures or checksums of what is downloaded.

## A09 Security Logging and Monitoring Failures

Look for:
- Security events with no log: failed logins, access denied, password and role changes, admin actions.
- Logs holding passwords, tokens, full card numbers or personal data.
- Errors swallowed so that an attack leaves no trace.

Fix: log security events with the user, action, target and outcome, and no secrets. Mask sensitive fields in the logger.

## A10 Server-Side Request Forgery (SSRF)

Look for:
- The server fetching a URL or host taken from input: webhooks, link previews, image fetchers, imports, PDF renderers.
- No block on internal addresses (`localhost`, `169.254.169.254`, private ranges), redirects followed blindly, or DNS checked once and then re-resolved.

Fix: allow-list the hosts and schemes. Resolve the address, reject private and link-local ranges, and connect to the address you checked. Do not follow redirects, or re-check each one. Run fetchers with no access to internal networks.

## Exceptional conditions (failing open)

Look for:
- Code that fails open: an authorization, validation or payment check that is skipped or succeeds when it throws, times out or gets an unexpected value.
- A `catch` that falls through to the success path.

Fix: fail closed. On any error in a security check, deny and log.
