# TKT-029 — Ignore a second save while one is in progress

**Status:** todo  
**Issue:** #29  
**Milestone:** M7 Contract hardening  
**Depends on:** none

## Goal

A second tap cannot create another transaction or another player while the first save is still in progress.

## Scope

- Guard the transaction sheet save and the player create save.
- Set the guard before the first await. Do not rely on a re-render to disable the control.
- Cover an overlapping second call with an automated test. Do not add a browser test framework.
- The new client row in [docs/testing.md](../docs/testing.md) and manual MVP checklist item 3 pass.

## Out of scope

- Changing what a successful save keeps on screen.
- Server idempotency.
- A recovery action for `409`.

## Implementation notes

- This is locked decision 11 in [docs/architecture.md](../docs/architecture.md).
- The transaction guard must not call `addTransaction` again. The player guard must not call `create` again.
- A save that fails still allows a later save.

## Acceptance criteria

- [ ] A second transaction save started before the first settles does not create a second transaction.
- [ ] A second player save started before the first settles does not create a second player.
- [ ] After the in-progress save settles, another save can run.
- [ ] `npm test` from the repository root passes.
