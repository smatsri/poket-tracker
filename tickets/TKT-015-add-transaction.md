# TKT-015 — Record a transaction quickly

**Status:** done  
**Issue:** #15  
**Milestone:** M3 Live evening  
**Depends on:** [TKT-013](TKT-013-player-management.md) (#13), [TKT-014](TKT-014-current-evening.md) (#14)

## Goal

Record a buy-in, rebuy, or cash-out with as few interactions as possible.

## Scope

- Open a bottom sheet from `+ הוספת פעולה`.
- Select a player, select one transaction type, enter a positive integer amount, and save.
- Use a numeric keyboard and a large amount field.
- Use clear tap targets labeled `כניסה`, `כניסה נוספת`, and `יציאה`.
- Generate the timestamp automatically.
- Add the transaction action to the player detail created by TKT-014. Opening it from that detail preselects the player. The main evening action does not preselect a player.
- After a successful save, keep the sheet open, clear the amount, retain the player and type, and focus the amount.
- Validate the required player, type, and positive integer before saving.
- Persist through the local session lifecycle before showing success.
- Update the current evening immediately after success.

## Out of scope

- Editing existing transactions and undo. Those belong to TKT-016.
- A confirmation dialog for every valid transaction.

## Implementation notes

- Reject decimals rather than rounding them.
- Keep the Hebrew validation message next to the field that failed.
- A save failure leaves the entered values in place.

## Acceptance criteria

- [x] A transaction can be saved with player, type, and amount only.
- [x] The amount field opens a numeric keyboard on a mobile browser.
- [x] Repeating a transaction for the same player and type requires only a new amount and save.
- [x] Opening the sheet from a player's details preselects that player.
- [x] Invalid input does not change the session.
- [x] The new transaction appears in balances and recent activity only after local persistence succeeds.
