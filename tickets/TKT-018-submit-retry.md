# TKT-018 — Submit the evening and retry safely

**Status:** done  
**Issue:** #18  
**Milestone:** M3 Live evening  
**Depends on:** [TKT-006](TKT-006-read-sessions.md) (#6), [TKT-011](TKT-011-submission-state.md) (#11), [TKT-014](TKT-014-current-evening.md) (#14), [TKT-016](TKT-016-correct-transactions.md) (#16)

## Goal

Finish an evening, show its submission state, and recover from failure without losing or duplicating data.

## Scope

- Add `סיום הערב` to a draft that has at least one transaction.
- Let the user review the calculated summary before confirming submission.
- Persist `pending` before the request and show `ממתין לשליחה` while it is in flight or unresolved.
- Move to the read-only submitted summary after `201` or identical `200`.
- On network failure or `500`, keep the local evening and show a retry action.
- On `409`, keep the local ID and transactions and explain that the server has different content for this evening.
- Disable new-evening and transaction mutation controls while pending.
- Retry with the same session ID and current local content.

## Out of scope

- A workflow that rewrites the conflicting server session.
- Background synchronization.

## Implementation notes

- The review uses client calculations only.
- Confirmation of finish is required once; individual transactions still do not require confirmation.
- A pending evening remains pending after refresh until retry succeeds.

## Acceptance criteria

- [x] A draft with no transactions cannot be submitted.
- [x] Successful submission shows the submitted evening and the server contains one copy.
- [x] Stopping the server during submission leaves every transaction recoverable.
- [x] Retry after the server returns does not create a second session.
- [x] A conflict response does not discard local data or generate a new session ID.
- [x] The pending screen cannot accidentally start another evening.
