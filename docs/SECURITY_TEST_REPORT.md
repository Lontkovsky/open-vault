# Security adversarial test report

Status: local development evidence. No external review or production certification is claimed.

## Baseline reproduction

Before the focused test was added, one temporary synthetic draft stored a script-shaped question and an unreachable `https://127.0.0.1:1/private` source as data. The current APIs returned: other-user read `404`, other-user edit `403`, SQL-shaped catalogue query `200` without exposing the draft, and foreign-origin mutation `403`. The draft and sessions were removed. The behavior existed, but there was no single reproducible test/report and no executable validation of the A01–A11 registry.

## Focused cases

| Case | Input and prerequisite | Expected | Actual local result | Remaining boundary |
|---|---|---|---|---|
| Machine registry | `docs/attack-coverage.json` | Exactly A01–A11; strict, unique IDs; defense outcome and evidence state are separate; tested entries have evidence | Passed | Registry evidence is still self-review unless marked otherwise |
| SQL/path injection | Catalogue query and poll ID contain `' OR 1=1 --` | Query is data; draft remains hidden; invalid UUID is rejected | Passed: catalogue `200` without draft, path `400 INVALID_INPUT` | PostgreSQL/source compromise is outside input validation |
| Stored XSS transport | Script and event-handler shaped text in question/source | API stores and returns exact text only as JSON; CSP is present | Passed at API boundary | Actual DOM non-execution remains in the single final retained-Browser run requested by the owner |
| CSRF/cross-origin mutation | Valid bearer token with `Origin: https://attacker.invalid` | Exact-origin hook rejects before mutation | Passed: `403 ORIGIN_REJECTED` | A compromised allowed origin or stolen bearer token is a different threat |
| SSRF | Unreachable HTTPS loopback source URL, then an HTTP loopback URL | HTTPS source is stored without server fetch; non-HTTPS source is rejected | Passed: draft created with unreachable HTTPS URL; HTTP URL returned `400 INVALID_INPUT` | Users may later open external links in their own client; the platform does not archive or fetch them |
| IDOR read | Authenticated participant requests another author's Draft | Resource is not disclosed | Passed: `404 POLL_NOT_FOUND` | Moderator access is an explicit role capability |
| IDOR write | Authenticated participant edits another author's Draft | Author check rejects | Passed: `403 AUTHOR_REQUIRED` | Compromised author session remains an account-security risk |
| Privilege escalation | Participant calls review and incident routes | Moderator check rejects | Passed: both returned `403 MODERATOR_REQUIRED` | Compromised moderator credentials retain moderator powers |
| Oversized request | JSON body exceeds 1 MiB | Reject before route handling | Passed: `413 INVALID_INPUT` | Gateway/provider limits still require deployment-specific monitoring |
| Resource burst | More than 8 active plus 16 waiting requests | Bound active work and queue; reject overflow/expired wait | Passed: maximum 8 active; overflow and two-second expiry returned `503 SERVER_BUSY` | Process-local control does not replace upstream DDoS protection |

All fixtures are synthetic. The test removes its draft and sessions and stores no token, credential, tracker, identity or malicious HTML artifact.

## Reproduction

With the documented local services running on Node 24.20.0:

```sh
pnpm exec vitest run tests/security.test.ts
pnpm exec vitest run tests/services.test.ts -t "rejects injection, CSRF, SSRF, IDOR"
```

The latest focused runs passed: registry `1/1` in 161 ms; API security case `1 passed / 13 skipped` in 381 ms. Type checking passed. Browser XSS execution, keyboard behavior and complete product compatibility are intentionally deferred to the one final retained-Browser run, not replaced by these checks.
