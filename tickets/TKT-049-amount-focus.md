# TKT-049 — Leave the amount field unfocused after a save

**Status:** todo  
**Issue:** #51  
**Milestone:** M10 Follow-ups  
**Depends on:** None

## Goal

Adding an action must not move focus to the amount field or open the number keyboard.

## Scope

- After a successful save for one player, keep the sheet open and return the amount to the operator's default, without focusing the amount field.
- Open the number keyboard only when the operator taps the amount.
- Keep a successful save for several players closing the sheet.
- Leave a failed save unchanged, including focus.
- Update architecture decision 11 and manual MVP checklist item 3 so they describe the unfocused amount.
- Cover the unfocused-after-save rule with an automated test.

## Out of scope

- Changing the default amount, the currency label, or the stored transaction type.
- Removing `inputMode` from the amount field. A tap may still open the number keyboard.
- The edit sheet's focus behavior, beyond not introducing a new focus jump.

## Implementation notes

- Product decision 1 in [docs/roadmap-m10.md](../docs/roadmap-m10.md).
- The current create sheet calls `focus()` after a single-player save. That call is the keyboard.

## Acceptance criteria

- [ ] A successful one-player save leaves the sheet open, resets the amount to the default, and does not focus the amount field.
- [ ] A successful save for several players still closes the sheet.
- [ ] A failed save does not change the evening and does not focus the amount field.
- [ ] Tapping the amount still opens the numeric keyboard.
- [ ] Architecture decision 11 and the manual checklist match this behavior.
- [ ] An automated test covers the decision not to focus after a successful create.
