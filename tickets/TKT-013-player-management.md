# TKT-013 — Load, cache, and create players

**Status:** todo  
**Milestone:** M3 Live evening  
**Depends on:** [TKT-009](TKT-009-indexeddb.md), [TKT-010](TKT-010-api-client.md), [TKT-012](TKT-012-rtl-shell.md)

## Goal

Let the user select an existing player and create a new one during an evening.

## Scope

- Load players from the server when the current evening opens.
- Replace the local player cache after a successful load.
- Use the cached list when the refresh request fails.
- Provide a Hebrew creation form with a required name.
- Warn when the normalized name matches an existing player under Hebrew base comparison, while still allowing the user to save it.
- Create the player on the server and add the returned player to the cache.
- Show a recoverable error when creation fails. Do not invent a local player ID.

## Out of scope

- Editing, deleting, or merging players.
- Offline creation.

## Implementation notes

- Normalize for comparison in the same way as the server: trim and collapse internal whitespace.
- The warning copy identifies the possible duplicate and asks for confirmation.
- Player management is available from the current evening and the transaction sheet, not from bottom navigation.

## Acceptance criteria

- [ ] A successful load displays the server players and refreshes the cache.
- [ ] After a later load failure, previously cached players remain selectable.
- [ ] A duplicate name shows a warning and can still be created as a distinct player.
- [ ] A failed creation leaves no selectable unsaved player.
- [ ] The created player can immediately be selected for a transaction.
