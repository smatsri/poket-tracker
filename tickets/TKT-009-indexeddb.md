# TKT-009 — Persist the active session in IndexedDB

**Status:** todo  
**Milestone:** M2 Client core  
**Depends on:** [TKT-008](TKT-008-domain-calculations.md)

## Goal

Make the active evening and cached player directory durable on the device.

## Scope

- Create the `poker-tracker` IndexedDB database.
- Store one `activeSession` record under the key `current`.
- Store cached players in the `players` store.
- Provide repository operations to read, save, and replace the active session.
- Provide operations to replace and read the cached player list.
- Expose an in-memory repository double with the same contract for tests.

## Out of scope

- Choosing when a session is pending or submitted. TKT-011 owns those transitions.
- Rendering the recovered session.

## Implementation notes

- Database version 1 uses the stores defined in [docs/data-model.md](../docs/data-model.md).
- Save the full session and status together. Do not split transactions across stores in version 1.
- Surface persistence failures to the caller. Do not swallow a failed transaction write.
- The repository has no financial calculations.

## Acceptance criteria

- [ ] Saving and reopening the database returns the same session, transactions, and status.
- [ ] Replacing the player cache removes players that were not in the replacement list.
- [ ] A failed write is reported to the caller and does not claim success.
- [ ] The in-memory double supports the submission tests without a browser.
- [ ] Refresh recovery can be satisfied by reading the `current` record.
