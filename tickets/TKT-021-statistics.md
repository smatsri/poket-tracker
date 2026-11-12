# TKT-021 — Show cross-evening statistics

**Status:** todo  
**Issue:** #21  
**Milestone:** M4 Review  
**Depends on:** [TKT-008](TKT-008-domain-calculations.md) (#8), [TKT-019](TKT-019-session-history.md) (#19)

## Goal

Show the first-version aggregate results for all stored evenings.

## Scope

- Load the completed session list.
- Show the number of sessions and the number of transactions.
- Rank players by overall net result.
- Show each player's overall result.
- Open one player's history, listing each attended evening and that evening's net result.
- Provide an empty state when no completed sessions exist.

## Out of scope

- Charts, date filters, win-rate analysis, and other advanced analytics.
- Players who have never appeared in a transaction.

## Implementation notes

- Use the ranking rules in the data model, including the Hebrew name tie-breaker.
- This screen reads server sessions and calculates locally. It does not add an analytics endpoint.

## Acceptance criteria

- [ ] Session and transaction counts match the returned sessions.
- [ ] A player's overall result is the sum of that player's per-session nets.
- [ ] Ranking is highest to lowest, with names breaking ties.
- [ ] A player history lists only evenings that contain that player.
- [ ] The empty state appears before any session has been submitted.
