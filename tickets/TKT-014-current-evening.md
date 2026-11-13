# TKT-014 — Build the current-evening screen

**Status:** done  
**Issue:** #14  
**Milestone:** M3 Live evening  
**Depends on:** [TKT-008](TKT-008-domain-calculations.md) (#8), [TKT-009](TKT-009-indexeddb.md) (#9), [TKT-011](TKT-011-submission-state.md) (#11), [TKT-012](TKT-012-rtl-shell.md) (#12)

## Goal

Make the current evening the operational home screen.

## Scope

- Show `התחלת ערב חדש` when no active session exists.
- Start a draft through the TKT-011 lifecycle.
- Show the title `ערב נוכחי`, the session date, and the Hebrew status label.
- Show total buy-ins, total cash-outs, and the session balance.
- List each player who has a transaction, with buy-ins, cash-outs, and a prominent net result.
- Show the five newest transactions, with player, type, amount, and time.
- Open a player row to that player's transactions and result for this evening.
- Link to the complete transaction history.
- Show the primary `+ הוספת פעולה` action. Its behavior is completed in TKT-015.
- Recover the visible evening from IndexedDB on startup.
- Prevent the empty-state action while a draft or pending session exists.

## Out of scope

- The transaction sheet, edit form, and server submission.
- Players who have no transaction in the session.

## Implementation notes

- Use the shared formatter and color plus sign for every result.
- Zero uses neutral text and an explicit zero value.
- Update the rendered totals from the persisted session after each successful local change.

## Acceptance criteria

- [x] The empty state can start one evening on a phone-width screen.
- [x] The overview and every player row match the domain calculations.
- [x] Recent activity shows at most five transactions, newest first.
- [x] A player row opens that player's current-evening transactions.
- [x] Reloading the page restores the same evening.
- [x] A second evening cannot be started from this screen while the current one is draft or pending.
