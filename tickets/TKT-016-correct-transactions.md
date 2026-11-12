# TKT-016 — Correct transactions before submission

**Status:** todo  
**Issue:** #16  
**Milestone:** M3 Live evening  
**Depends on:** [TKT-015](TKT-015-add-transaction.md) (#15)

## Goal

Let the user undo, edit, or delete an accidental draft transaction.

## Scope

- After a successful save, offer immediate undo for that transaction.
- Allow any draft transaction to be edited or deleted from transaction details.
- Permit changes to player, type, and amount. Keep the transaction ID and original timestamp unless the user is explicitly changing the recorded time; version 1 does not expose timestamp editing.
- Recalculate and rerender every affected balance after the repository confirms the change.
- Ask for confirmation before deletion.
- Disable these controls when the session is pending or submitted.

## Out of scope

- Changing a session that the server has already confirmed.
- Batch editing.

## Implementation notes

- Undo deletes the transaction just created and dismisses its notice.
- Editing uses the same validation rules as creation.
- A failed save keeps the previous persisted transaction.

## Acceptance criteria

- [ ] Undo removes the transaction that was just saved and updates all balances.
- [ ] Edit can change player, type, and amount without creating a new transaction ID.
- [ ] Delete requires confirmation and removes the transaction from the evening.
- [ ] A persistence failure leaves the prior transaction and balances unchanged.
- [ ] Pending and submitted sessions do not expose edit, delete, or undo.
