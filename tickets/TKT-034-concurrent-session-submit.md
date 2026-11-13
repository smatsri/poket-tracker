# TKT-034 — Prove concurrent session submits on Postgres

**Status:** todo  
**Issue:** #34  
**Milestone:** M8 Production deployment  
**Depends on:** [TKT-033](TKT-033-postgresql-access.md) (#33)

## Goal

Two overlapping submits of one new session id end in one stored session, with the HTTP results already defined for a sequential retry.

## Scope

- Run the server suite, including this race, against an empty PostgreSQL database when `DATABASE_URL` is set.
- Identical parallel bodies: one `201`, one `200`, and one stored session.
- Different parallel bodies: one success, one `409`, and the stored body matches the winner. No partial transaction rows remain.
- Leave the local PGlite suite as the default for `npm test` without `DATABASE_URL`.
- Add the CI command that starts a Postgres service container and runs this suite. The workflow that deploys is [TKT-039](TKT-039-github-actions-deploy.md).

## Out of scope

- Running this race on PGlite or on Neon.
- Changing the idempotency comparison or the OpenAPI contract.

## Implementation notes

- PGlite serializes connections, so a local pass is not evidence for this race. The test must use two real PostgreSQL connections.
- Follow the concurrency row in [docs/deployment.md](../docs/deployment.md).

## Acceptance criteria

- [ ] Identical overlapping submits store one session and return `201` and `200`.
- [ ] Conflicting overlapping submits store one unchanged winner and return `409` for the loser.
- [ ] Neither case leaves a session without its transactions, or transactions without their session.
- [ ] `npm test` with no `DATABASE_URL` still passes on PGlite.
- [ ] The same suite passes against the empty Postgres service.
