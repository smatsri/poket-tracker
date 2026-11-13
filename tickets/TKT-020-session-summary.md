# TKT-020 — Review a submitted evening

**Status:** done  
**Issue:** #20  
**Milestone:** M4 Review  
**Depends on:** [TKT-008](TKT-008-domain-calculations.md) (#8), [TKT-019](TKT-019-session-history.md) (#19)

## Goal

Show the outcome of one completed evening without allowing changes.

## Scope

- Load `GET /api/sessions/{sessionId}` for the selected evening.
- Show the date, total buy-ins, total cash-outs, overall difference, player count, and transaction count.
- List each player's result with both sign and color.
- Link to the read-only full transaction history.
- Open a player's transactions within that evening.
- Show `404` and load failures with a path back to history.

## Out of scope

- Edit, delete, and resubmit controls.
- Server-side totals. The screen calculates from returned transactions.

## Implementation notes

- Reuse the current-evening result presentation where possible, but this screen is read-only.
- A direct visit to a known submitted summary route must work after refresh.

## Acceptance criteria

- [x] Every displayed total can be traced to the documented client formulas.
- [x] The screen has no control that changes the session.
- [x] The transaction history and a single player's transactions can be opened.
- [x] An unknown session shows a not-found state.
- [x] Positive, negative, and zero results remain distinguishable without relying only on color.
