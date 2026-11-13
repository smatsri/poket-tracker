# TKT-019 — Browse previous evenings

**Status:** done  
**Issue:** #19  
**Milestone:** M4 Review  
**Depends on:** [TKT-006](TKT-006-read-sessions.md) (#6), [TKT-010](TKT-010-api-client.md) (#10), [TKT-012](TKT-012-rtl-shell.md) (#12)

## Goal

Show completed evenings from the server, newest first.

## Scope

- Load `GET /api/sessions` when History opens.
- Show each session's date, number of players, number of transactions, and client-calculated overall result.
- Order the list newest first.
- Open the selected session's summary.
- Show an empty state when the server returns no sessions.
- Show a recoverable error when the request fails, without deleting the active local evening.

## Out of scope

- Date filters, search, and offline access to the full historical library.
- Editing a completed session.

## Implementation notes

- Count distinct players returned for the session.
- The overall result is the client-calculated session balance, displayed with sign and color.
- Do not use the locally submitted copy as a second competing list. After submission, history comes from the server response.

## Acceptance criteria

- [x] Completed sessions appear newest first with the four required facts.
- [x] Choosing a session opens its summary route.
- [x] No sessions produces the Hebrew empty state.
- [x] A failed load explains the failure and can be retried.
- [x] Opening history does not change the active draft or pending session.
