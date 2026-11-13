# TKT-030 — Show a failed evening load instead of an empty evening

**Status:** todo  
**Issue:** #30  
**Milestone:** M7 Contract hardening  
**Depends on:** none

## Goal

A failed read of the active evening is shown as a load error, not as an evening that does not exist.

## Scope

- When `readCurrent` fails, the current-evening screen shows an error and does not offer to start an evening.
- When `readCurrent` returns null, the empty evening and its start action stay as they are.
- Cover the choice with an automated test. Do not add a browser test framework.
- The new client row in [docs/testing.md](../docs/testing.md) passes.

## Out of scope

- Retrying a pending submission.
- Player-list load notes in the player panel.
- Starting an evening while one is draft or pending.

## Implementation notes

- This is locked decision 15 in [docs/architecture.md](../docs/architecture.md).
- A storage failure must not reach `startEvening`.

## Acceptance criteria

- [ ] A failed read shows a load error and hides the start action.
- [ ] A missing active evening still shows the empty state and its start action.
- [ ] `npm test` from the repository root passes.
