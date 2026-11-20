# TKT-050 — Sort the summary by profit

**Status:** done  
**Issue:** #52  
**Milestone:** M10 Follow-ups  
**Depends on:** None

## Goal

The summary lists players from the highest net result to the lowest.

## Scope

- Order summary players by `netResult` descending.
- Break a tie by Hebrew name, then by player id, with the same comparison the overall ranking already uses.
- Keep the current-evening player list in its current order.
- Leave statistics ranking as it is.
- Cover a strict profit order and a tie with an automated test.

## Out of scope

- Sorting the live evening, the transaction list, or history.
- A new server field for profit. The client already calculates net result.

## Implementation notes

- Product decision 2 in [docs/roadmap-m10.md](../docs/roadmap-m10.md).
- Reuse the comparison in `rankOverallResults` rather than a second tie-break rule.
- An unknown player name sorts as `שחקן לא ידוע` only for display. The tie-break uses the stored name, or an empty name when none is stored, then the player id.

## Acceptance criteria

- [x] Summary players appear from the highest net to the lowest.
- [x] Two equal nets appear by Hebrew name, then by player id.
- [x] The current-evening screen keeps its existing player order.
- [x] An automated test covers a reordered list and a tie.
