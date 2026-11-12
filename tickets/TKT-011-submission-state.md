# TKT-011 — Implement submission and recovery rules

**Status:** todo  
**Milestone:** M2 Client core  
**Depends on:** [TKT-009](TKT-009-indexeddb.md), [TKT-010](TKT-010-api-client.md)

## Goal

Implement the local lifecycle that protects an evening until the server confirms it.

## Scope

- Start an evening with a stable ID, the device-local calendar date, and `draft` status.
- Reject starting another evening while the current status is `draft` or `pending`.
- Allow a new evening only after an explicit action when the current status is `submitted` or there is no active record.
- Add, edit, and delete draft transactions only after the repository confirms the save.
- Before sending, persist the latest session and change its status to `pending`.
- Mark the same record `submitted` after `201` or an identical `200`.
- Leave it `pending`, with the same ID and transactions, after a network failure, `500`, or `409`.
- Require at least one transaction before submission can start.
- Cover the submission-state rows in [docs/testing.md](../docs/testing.md) through the in-memory repository.

## Out of scope

- The visible form, toast, and buttons. Later UI tickets call this module.
- Resolving a `409` by editing the server record.

## Implementation notes

- Generate session and transaction IDs with `crypto.randomUUID()`.
- Never replace the session ID during retry.
- Submission of a `submitted` session is a no-op success rather than a second local copy.

## Acceptance criteria

- [ ] Automated tests cover every submission-state row in the testing document.
- [ ] A failed repository write does not report the transaction as saved.
- [ ] An uncertain server result retains every local transaction.
- [ ] Retry uses the original session ID.
- [ ] A draft or pending evening cannot be replaced accidentally.
