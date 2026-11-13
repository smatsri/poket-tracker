# TKT-022 — Verify the MVP acceptance criteria

**Status:** done  
**Issue:** #22  
**Milestone:** M5 Acceptance  
**Depends on:** [TKT-007](TKT-007-server-tests.md) (#7), [TKT-017](TKT-017-transaction-history.md) (#17), [TKT-018](TKT-018-submit-retry.md) (#18), [TKT-020](TKT-020-session-summary.md) (#20), [TKT-021](TKT-021-statistics.md) (#21)

## Goal

Prove that the first version is usable under the UI specification's acceptance criteria.

## Scope

- Run `npm run typecheck` and `npm test`.
- Execute the complete manual checklist in [docs/testing.md](../docs/testing.md) at a 360px viewport.
- Record the result of each checklist item and any defect found.
- Fix defects that prevent a checklist item from passing, then rerun the affected item.

## Out of scope

- New features or deferred enhancements listed in [tickets/README.md](README.md).
- Deployment and cloud hosting.

## Implementation notes

- Use one fresh local database for the happy path and a separate controlled database for the `409` case.
- Verify behavior through the browser, including refresh and browser restart. A single static screenshot does not complete this ticket.
- Check the current evening, history, summary, and statistics after the same submission so their results agree.

## Acceptance criteria

- [x] Automated typecheck and tests pass.
- [x] All 14 manual checklist items pass.
- [x] All 10 UI acceptance criteria in the backlog index have passing evidence.
- [x] The happy-path submission exists once on the server and agrees across history, summary, and statistics.
- [x] No checklist failure is left unresolved.

## Checklist evidence

Ran at a 360px viewport against a fresh database, `data/tkt-022-happy.sqlite`. The conflict check used a separate copy, `data/tkt-022-conflict.sqlite`. `npm run typecheck` and `npm test` passed first: 80 client tests and 49 server tests.

1. Pass. The empty state and the active evening are Hebrew, `dir="rtl"`, and the navigation starts from the right.
2. Pass. A duplicate name warned with "כבר קיים שחקן" and still saved a second player with a different id.
3. Pass. Buy-in, rebuy, and cash-out kept the selected player and type, cleared the amount, and the amount field uses `inputmode="numeric"`.
4. Pass. Totals, the session balance, and recent activity updated on each save. Recent activity stays newest first.
5. Pass. Refresh and a new tab restored the same evening and transactions.
6. Pass. Editing the cash-out from 80 to 120, then deleting the rebuy, changed the buy-ins, cash-outs, balance, and player result.
7. Pass. Undo immediately after the cash-out removed it and restored the previous totals.
8. Pass. The submitted evening is read-only. The server stored session `77b274ea-9ff4-44c1-abf6-3b87fc5fb657` once: buy-ins 140, cash-outs 120, balance −20, player results +20 and −40.
9. Pass. With the server stopped, submission and retry stayed pending and kept every transaction. After the server returned, retry stored that one session.
10. Pass. A pending local cash-out of 121 against the stored cash-out of 120 returned the conflict explanation. The local id and transactions remained, and the stored amount stayed 120.
11. Pass. History, the summary, and the transaction list show the same date, counts, totals, and three transactions.
12. Pass. Statistics show 1 evening, 3 transactions, and rank +20 above −40.
13. Pass. The primary action is 44px tall, navigation items are about 60px, and the fixed navigation leaves the actions reachable. Safe-area padding is applied with `env(safe-area-inset-bottom)`.
14. Pass. Positive values use `#249B45` and `+`. Negative values use `#D94B4B` and `−`.
