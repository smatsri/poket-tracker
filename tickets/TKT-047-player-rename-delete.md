# TKT-047 — Rename a player and delete an unused one

**Status:** done  
**Issue:** #48  
**Milestone:** M9 Evening usability  
**Depends on:** None

## Goal

Correct a player's name, and remove a player who has never been part of an evening.

## Scope

- Add a player update that changes only the name. Use the create-name validation.
- Add a player delete that succeeds only when no transaction references that player. Otherwise return `409` and leave the player in place.
- From the player directory, offer rename, and offer delete with a confirmation. Explain a `409` in Hebrew.
- Refresh the local player cache from the server result.
- Show the new name on the current evening, history, the summary, and statistics without rewriting transactions.
- Document the routes in OpenAPI and the data model, including the foreign-key rule.
- Cover rename, delete of an unused player, and a refused delete with automated tests.

## Out of scope

- Merging two players.
- Deleting or reassigning a player who has transactions.
- Editing a player's id.

## Implementation notes

- Product decision 10 in [docs/roadmap-m9.md](../docs/roadmap-m9.md).
- Transactions reference `player_id`. The name stays on `players` only.
- Update [docs/data-model.md](../docs/data-model.md) and [docs/api/openapi.yaml](../docs/api/openapi.yaml) in this ticket.
- TKT-013 left edit and delete out of scope. This ticket is that follow-up.

## Acceptance criteria

- [x] Renaming a player updates the directory and every evening that already references that player.
- [x] A renamed player's transactions keep their ids, types, and amounts.
- [x] A player with no transactions can be deleted and disappears from the directory.
- [x] A player with any transaction cannot be deleted, the server returns `409`, and the player remains selectable.
- [x] Automated tests cover rename, a successful delete, and a refused delete.
