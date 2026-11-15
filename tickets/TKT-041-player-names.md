# TKT-041 — Keep player names visible

**Status:** done  
**Issue:** #42  
**Milestone:** M9 Evening usability  
**Depends on:** None

## Goal

Show a player's stored name wherever that player appears, including after refresh and a failed reload.

## Scope

- Trace each surface that renders a player: the current evening, the transaction list, the create and edit sheets, history, the summary, and statistics.
- Resolve names from the server player list, the session document's players, or the local player cache.
- Keep the last cached names when a later player load fails.
- When no name can be resolved, show `שחקן לא ידוע`.
- Cover a known name, a failed reload that still has a cache, and an unknown player with automated tests.

## Out of scope

- Renaming or deleting a player. That is TKT-047.
- Embedding a copy of the name on each transaction.

## Implementation notes

- Product decision 1 in [docs/roadmap-m9.md](../docs/roadmap-m9.md).
- The current evening and transaction history fall back to the player id when the name map misses. That fallback is the defect to remove.
- History and the summary already receive players on the session document. Confirm those paths before changing them.

## Acceptance criteria

- [x] A player with a stored name still shows that name after refresh and after moving between the evening, history, and statistics.
- [x] A failed player reload keeps the names from the last successful load.
- [x] A player whose name cannot be resolved shows `שחקן לא ידוע` on every surface listed above.
- [x] Automated tests cover a resolved name, a cached name after a failed load, and an unknown player.
