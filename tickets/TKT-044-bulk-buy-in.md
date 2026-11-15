# TKT-044 — Add the same amount for several players

**Status:** done  
**Issue:** #45  
**Milestone:** M9 Evening usability  
**Depends on:** [TKT-043](TKT-043-add-action-sheet.md) (#44)

## Goal

Record the opening buy-in for several players in one action.

## Scope

- On `הוספת כסף`, allow more than one player and one shared amount.
- Write one transaction per selected player in a single local save.
- Apply the TKT-043 type rule to each player: `buy-in` when that player has no money-in transaction yet, otherwise `rebuy`.
- Prefill the shared amount from the default.
- Keep cash-out on one player.
- Leave the evening unchanged when validation fails or the save fails.
- Cover a mixed selection, a cash-out refusal, and a failed save with automated tests.

## Out of scope

- Different amounts in the same action.
- Editing several transactions at once.
- A new transaction shape. Each player still gets a normal transaction.

## Implementation notes

- Product decision 7 in [docs/roadmap-m9.md](../docs/roadmap-m9.md).
- Reuse the create sheet from TKT-043.
- After a successful bulk save, close the sheet so the updated evening is visible.

## Acceptance criteria

- [x] One amount and three selected players create three transactions in one save.
- [x] A selected player with no money in yet is stored as `buy-in`, and a selected player who already has money in is stored as `rebuy`.
- [x] Cash-out cannot be saved for more than one player.
- [x] An invalid amount or a failed save adds no transactions.
- [x] Automated tests cover the mixed types, the single-player cash-out, and the unchanged evening after failure.
