# TKT-042 — Open the summary after a confirmed close

**Status:** done  
**Issue:** #43  
**Milestone:** M9 Evening usability  
**Depends on:** None

## Goal

Land on the evening's summary after a confirmed close, and make starting the next evening the first action when none is open.

## Scope

- After `201` or an identical `200`, open `/history/{sessionId}` for that evening.
- Clear the local active-session record only after that confirmation, so the current-evening screen shows its empty state.
- Leave a pending evening, a network or `500` failure, and a `409` on the current-evening screen with the existing retry and conflict behavior. Do not clear the local record in those cases.
- On the empty screen, keep `התחלת ערב חדש` as the first action, above the player directory, visible at 360px wide without scrolling past that directory.
- Keep player creation available before an evening starts.
- Cover the confirmed navigation, the pending stay, and the empty-state action with automated tests.

## Out of scope

- Changing submit idempotency, the `409` copy, or the summary contents.
- A session name or location. That is TKT-045.

## Implementation notes

- Product decisions 2 and 3 in [docs/roadmap-m9.md](../docs/roadmap-m9.md).
- This replaces the TKT-018 outcome that left the submitted evening on the current-evening screen. Pending and conflict behavior from TKT-018 stays.
- The summary route reads the server copy, so it is only opened after the server has confirmed the session.

## Acceptance criteria

- [x] A confirmed submit opens that evening's read-only summary.
- [x] Returning to the current evening after that confirmation shows the empty state, and `התחלת ערב חדש` is visible at 360px without scrolling past the player directory.
- [x] A pending submit stays on the current evening with its transactions, and offers retry.
- [x] A `409` still keeps the local id and transactions and does not open the summary.
- [x] A second evening still cannot be started while the current one is draft or pending.
