# TKT-006 — Retrieve one session and list sessions

**Status:** done  
**Issue:** #6  
**Milestone:** M1 Server  
**Depends on:** [TKT-005](TKT-005-submit-session.md) (#5)

## Goal

Expose completed sessions for history and summary screens.

## Scope

- Implement `GET /api/sessions/{sessionId}`.
- Implement `GET /api/sessions` with optional inclusive `from` and `to` dates.
- Include transactions and distinct referenced players in every session document.
- Order a session's transactions by timestamp and then ID.
- Order players by name and then ID.
- Order the session list by date, `createdAt`, and ID, all descending.
- Return `404` with `NOT_FOUND` for an unknown session.
- Return `400` for a malformed date or a range whose start is after its end.

## Out of scope

- Pagination, text search, and update or delete operations.
- Derived totals in the response.

## Implementation notes

- Load transactions and players without SQL in the route.
- A session with an empty transaction list returns an empty `players` array.
- No date parameters means all sessions.

## Acceptance criteria

- [x] A stored session is returned with its transactions and distinct players.
- [x] An unknown session returns `404` and `NOT_FOUND`.
- [x] The unfiltered list returns all sessions, newest date first.
- [x] `from` and `to` bounds are inclusive.
- [x] A reversed or invalid date range returns `400`.
- [x] No endpoint in this ticket can change stored data.
