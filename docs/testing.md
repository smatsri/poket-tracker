# Testing

Version 1 uses automated tests for domain rules and server integrity, plus a manual mobile checklist for Hebrew, RTL, and the live evening flow.

## Server automation

Use Node's built-in test runner from the server package. Each test gets its own temporary SQLite file and closes it before exit. Tests call the Express application in-process, so they do not depend on a fixed port.

Required coverage:

| Case | Expected result |
| --- | --- |
| Create a player with a valid name | `201`, server-generated ID, trimmed name, `createdAt` |
| Create a player with a blank or whitespace-only name | `400` and `VALIDATION_ERROR` |
| Create two players with the same trimmed name | Both succeed with different IDs |
| List players | Returns the stored players and their timestamps |
| Submit a valid session | `201`, one database transaction, stored `createdAt`, and referenced players |
| Submit the same body again | `200`, one session row, and unchanged transactions |
| Retry the same session with one amount changed | `409`, stored data unchanged |
| Use an existing session ID with a different transaction set | `409` |
| Reference an unknown player | `400`, no session row |
| Repeat a transaction ID inside one request | `400`, no session row |
| Reuse a stored transaction ID in a new session | `409`, the new session is absent |
| Use amount `0`, a negative amount, or a non-integer | `400` |
| Use an unsupported transaction type, bad ID, bad date, or offset-free timestamp | `400` |
| Request a missing session | `404` and `NOT_FOUND` |
| List without dates | All sessions, newest date first |
| List with inclusive `from` and `to` | Only sessions inside the range |
| Reverse or malformed date bounds | `400` |
| Force a failure after session insertion and before the final transaction insert | No session row and no transaction rows |
| Unexpected failure | `500`, `INTERNAL_ERROR`, and no stack trace or SQL in the body |
| Insert loses a race on an existing session id | Identical body returns `200`; a different body returns `409`; one session row remains |

The atomicity case can use a transaction ID collision discovered during the insert. The assertion is the absence of a partial session, not the specific collision technique.

## Client automation

Use Node's built-in test runner for pure domain tests. Do not add a test framework for version 1.

Required calculation and validation coverage:

- Buy-ins and rebuys combine into total buy-ins.
- Net result equals cash-outs minus total buy-ins.
- Session balance equals the sum of player nets and is allowed to be non-zero.
- Players with no transactions in a session do not appear in that session's results.
- Overall statistics sum per-session nets and rank from highest to lowest.
- Validation rejects missing fields, non-positive amounts, decimal amounts, bad timestamps, and a transaction whose session ID differs from its parent.

Required submission-state coverage, using an in-memory repository double:

- A transaction is not reported as saved when persistence fails.
- Refresh state is restored from the persisted active session.
- Submission moves `draft` to `pending` before the request starts.
- `201` and identical `200` move `pending` to `submitted`.
- A network failure, `500`, or `409` stays `pending` and retains the original session ID and transactions.
- Starting an evening is rejected while the active status is `draft` or `pending`.
- Starting an evening after `submitted` creates a new session ID.
- A second save started before the first settles does not create another transaction or another player.
- A failed read of the active evening does not offer to start an evening.
- An invalid percent-encoding in a history or statistics path does not throw and uses the list fallback.

An in-memory IndexedDB double covers the repository contract. The browser store is verified by the manual restart check below. A browser automation dependency is not part of version 1.

## Manual MVP checklist

Run this on a phone-sized viewport, 360px wide, in a Chromium browser. The server and client are local.

1. Start an evening from the empty state and confirm the Hebrew empty and active screens read naturally from right to left.
2. Create a player, create a second player with the same name, and confirm a duplicate warning appears without blocking the distinct saved player.
3. Record a buy-in, rebuy, and cash-out in a few taps. Confirm the numeric keyboard, the retained player and type, and the cleared amount. A second tap during the save does not record a duplicate.
4. Confirm player totals, the session balance, and the five-item recent activity update immediately.
5. Refresh and restart the browser. Confirm the same evening and transactions return.
6. Edit and delete a draft transaction. Confirm every derived balance changes.
7. Use undo immediately after saving a transaction.
8. Finish the evening and confirm the server has one session and the summary is read-only.
9. Stop the server, retry from the pending state, and confirm nothing was discarded. Start the server, retry, and confirm there is still one server session.
10. Change the local pending payload to conflict with the stored session in a test database and confirm `409` retains the local ID and local transactions.
11. Open history, open a past evening, and compare its summary with the transaction list.
12. Confirm statistics count sessions and transactions and rank each player's overall result.
13. Confirm the primary action, touch targets, safe area, and bottom navigation remain usable at 360px width.
14. Confirm positive and negative values have both color and an explicit sign.

## Manual Version 1.0 checklist

Run this on a phone-sized viewport, 360px wide, in a Chromium browser, after at least two completed evenings with mixed wins and losses. Compare every figure with the stored session transactions. Open the real screens for the chart items; a single static screenshot is not enough.

1. The group overview shows the completed-evening count, the transaction count, each ranked player's evenings played, and ranking by cumulative net.
2. A player's history shows evenings played, a chronological cumulative progression, and a final cumulative equal to that player's overall result.
3. The cumulative-result chart is readable at 360px, and its points match the progression list and the overall result.
4. The results-by-session chart is readable at 360px, and each value matches that evening's session balance (cash-outs minus buy-ins).
5. The player-comparison chart is readable at 360px, and each value matches the overall net in the ranking list. Players with no transactions stay excluded.
6. History and an opened past evening still match the transaction list (MVP checklist item 11).
7. Statistics still count sessions and transactions and rank each player's overall result (MVP checklist item 12).

## Traceability

Every must-have and all ten acceptance criteria in the UI specification are mapped to tickets in [tickets/README.md](../tickets/README.md). Those tickets are done. A later ticket is not complete until its own acceptance criteria and the relevant rows of this document pass.
