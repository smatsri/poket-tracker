# TKT-032 — Cover a concurrent session-id conflict

**Status:** todo  
**Issue:** #32  
**Milestone:** M7 Contract hardening  
**Depends on:** none

## Goal

A submission that loses the insert on `sessions.id` returns the same result as a sequential retry.

## Scope

- Add a server test where the first insert reports a `sessions.id` primary-key conflict.
- An identical payload returns `200` and leaves one session.
- A different payload returns `409` and leaves the stored session unchanged.
- The new server row in [docs/testing.md](../docs/testing.md) passes.

## Out of scope

- Binding the server to localhost.
- Sorting stored timestamps by UTC instant.
- Changing the idempotency comparison.

## Implementation notes

- Produce the conflict through the existing submit path. Do not delete the retry branch to make the test pass.
- One Node process does not hit this branch by itself. The test has to force the primary-key error.

## Acceptance criteria

- [ ] An identical colliding submission returns `200` and does not insert a second session.
- [ ] A different colliding submission returns `409` and preserves the stored session.
- [ ] `npm test` from the repository root passes.
