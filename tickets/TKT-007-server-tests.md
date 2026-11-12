# TKT-007 — Cover server integrity with automated tests

**Status:** todo  
**Milestone:** M1 Server  
**Depends on:** [TKT-004](TKT-004-player-endpoints.md), [TKT-005](TKT-005-submit-session.md), [TKT-006](TKT-006-read-sessions.md)

## Goal

Lock the server acceptance cases in [docs/testing.md](../docs/testing.md) into repeatable tests.

## Scope

- Run tests with Node's built-in test runner through `npm test`.
- Give every test an isolated temporary SQLite database.
- Call the exported Express application in-process.
- Cover players, validation, atomic session creation, idempotent retry, conflicts, retrieval, date filtering, and safe `500` responses.

## Out of scope

- Browser tests and client calculations.
- A new test framework or hosted test database.

## Implementation notes

- Close every database handle before the test finishes.
- Assert both the HTTP response and the relevant rows for rollback and idempotency cases.
- Trigger the internal-error case through a controlled failure seam rather than by damaging the database file.

## Acceptance criteria

- [ ] `npm test` from the repository root runs the server suite.
- [ ] Every server row in [docs/testing.md](../docs/testing.md) has an automated assertion.
- [ ] Tests do not depend on a shared database file or a manually started port.
- [ ] A failed assertion reports the behavior that broke rather than leaving a background process running.
