# TKT-043 — Shorten the add-action sheet

**Status:** done  
**Issue:** #44  
**Milestone:** M9 Evening usability  
**Depends on:** None

## Goal

Record money in or money out with a default amount, two choices, and the player's current result in view.

## Scope

- On create, offer `הוספת כסף` and `יציאה`.
- Store the first `הוספת כסף` for a player in the evening as `buy-in`, and each later one as `rebuy`. Store `יציאה` as `cash-out`.
- Keep the stored type visible on the edit sheet, and still allow a correction to change it.
- Show each player's current-evening net beside the name in the create sheet. A player with no transactions shows zero.
- Add a local operator setting for the default amount and the currency label. Start at 50 and `₪`. Let the operator change both.
- Prefill the create amount with the default, including after a successful single save. Keep the selected player and action selected. The amount for one action can still be changed before saving.
- Show the currency label with formatted amounts. Keep amounts as positive integers, with no currency code on transactions or sessions.
- Keep the amount, the action choice, and save visible while the player list scrolls inside the sheet.
- Update architecture decision 9 and the local-only section of the data model to describe the display label and the setting.
- Cover the stored-type rule, the default prefill, and the net shown on a player row with automated tests.

## Out of scope

- Selecting several players in one save. That is TKT-044.
- A server setting, a per-session default, or converting currencies.
- Merging `buy-in` and `rebuy` into one stored type.

## Implementation notes

- Product decisions 4, 5, and 6 in [docs/roadmap-m9.md](../docs/roadmap-m9.md).
- This replaces the TKT-015 create labels `כניסה` and `כניסה נוספת`, and the outcome that cleared the amount to empty. Repeat-save still keeps the player and the action.
- Buy-in and rebuy continue to sum as money in. Session balance math does not change.
- Persist the setting locally. Do not send it to the server.

## Acceptance criteria

- [x] Create offers `הוספת כסף` and `יציאה`, and a first add for a player is stored as `buy-in` while a later add is stored as `rebuy`.
- [x] The edit sheet shows the stored type and can change it.
- [x] The create sheet shows the player's current-evening net, or zero when that player has no transactions.
- [x] A new amount starts at the saved default, the default survives reload, and changing it does not change a transaction already saved.
- [x] Amounts stay positive integers, and the currency label appears on formatted amounts without being stored on a transaction.
- [x] On a phone-width sheet, the amount, the action, and save stay visible while the player list scrolls.
- [x] Automated tests cover the type rule, the default, and the net on the player row.
