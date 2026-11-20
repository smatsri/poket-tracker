# TKT-051 — Show the biggest winner on a history card

**Status:** done  
**Issue:** #53  
**Milestone:** M10 Follow-ups  
**Depends on:** None

## Goal

Each history card names who finished with the highest net that evening.

## Scope

- Add the top player to the history entry: display name, player id, and the existing signed result presentation.
- Choose the highest `netResult` from the evening's player results. Break a tie by Hebrew name, then by player id.
- Show a zero or negative top result. Omit the line when the evening has no player results.
- Use `שחקן לא ידוע` when the player name cannot be resolved.
- Label the line `המרוויח הגדול`.
- Calculate it on the client. Do not store it and do not add an API field.
- Update the history row in the manual MVP checklist.
- Cover a unique winner, a tie, a negative top result, and an evening with no player results in automated tests.

## Out of scope

- The visual card layout. That is TKT-052. This ticket renders the fact in the current card.
- Changing who appears on the summary, or sorting that list. That is TKT-050.
- A group-wide biggest winner on statistics.

## Implementation notes

- Product decision 3 in [docs/roadmap-m10.md](../docs/roadmap-m10.md).
- Reuse `calculatePlayerResults` and `presentResult`.
- The tie-break matches `rankOverallResults`.

## Acceptance criteria

- [x] A history card shows the player with the highest net and that signed result, under the label `המרוויח הגדול`.
- [x] A tie shows one player, chosen by Hebrew name and then player id.
- [x] A top result of zero or below is still shown.
- [x] An evening with no player results omits the line.
- [x] An unknown player is `שחקן לא ידוע`.
- [x] Automated tests cover the unique, tied, negative, and empty cases.
