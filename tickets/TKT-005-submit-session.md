# TKT-005 — Submit a session atomically and idempotently

**Status:** done  
**Issue:** #5  
**Milestone:** M1 Server  
**Depends on:** [TKT-002](TKT-002-sqlite-schema.md) (#2), [TKT-003](TKT-003-validation-errors.md) (#3), [TKT-004](TKT-004-player-endpoints.md) (#4)

## Goal

Implement `POST /api/sessions` so a complete evening is stored once, retries are safe, and partial writes cannot remain.

## Scope

- Accept the session ID, calendar date, and transaction list defined by the contract.
- Require every referenced player to exist.
- Insert the session and its transactions in one SQLite transaction.
- Assign `createdAt` on the first successful insert.
- Return the complete stored session document, including transactions and distinct referenced players.
- Return `201` for the first save.
- Return `200` and the unchanged stored session for an identical retry.
- Return `409` when an existing session ID is submitted with a different date or transaction set.
- Return `409` when a transaction ID already belongs to another stored session.
- Roll back all writes on every failure.

## Out of scope

- Session listing and editing.
- Calculating buy-ins, cash-outs, or net results.

## Implementation notes

- Compare timestamps by UTC instant and compare transactions as a set. Array order must not change the result.
- Use an immediate database transaction so concurrent identical retries cannot insert duplicates.
- Duplicate transaction IDs inside one request are validation failures and store nothing.
- An empty transaction list is valid for this endpoint.

## Acceptance criteria

- [x] The first valid submission returns `201` and persists the session and every transaction.
- [x] Repeating that exact body returns `200`, does not add rows, and preserves `createdAt`.
- [x] Changing any transaction field or the session date returns `409` and preserves the stored record.
- [x] An unknown player returns `400` and leaves no session.
- [x] A failure during transaction insertion leaves neither a session row nor transaction rows.
- [x] The response does not include derived financial totals.
