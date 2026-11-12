# TKT-017 — Show full transaction history

**Status:** todo  
**Issue:** #17  
**Milestone:** M3 Live evening  
**Depends on:** [TKT-014](TKT-014-current-evening.md) (#14), [TKT-016](TKT-016-correct-transactions.md) (#16)

## Goal

Show every transaction in the active or reviewed session.

## Scope

- Show the session date and the complete transaction list, newest first.
- Show player name, Hebrew transaction type, amount, and time for each row.
- Open transaction details from a row.
- For a draft session, connect details to the edit and delete behavior from TKT-016.
- For a submitted session, show details as read-only.
- Provide an empty state when the session has no transactions.

## Out of scope

- Filters and search. The UI specification defers them.
- Editing submitted transactions.

## Implementation notes

- Resolve player names from the session players when viewing server data and from the player cache when viewing the active draft.
- If a cached name is unavailable, show the player ID rather than dropping the transaction.

## Acceptance criteria

- [ ] All transactions are visible in newest-first order.
- [ ] Draft details can reach edit and delete, and successful changes update the list and balances.
- [ ] Submitted details cannot change the transaction.
- [ ] The current-evening recent activity links to this complete list.
- [ ] An empty session shows an empty state rather than a broken list.
