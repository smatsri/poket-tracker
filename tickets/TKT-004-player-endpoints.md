# TKT-004 — Implement player list and create

**Status:** todo  
**Issue:** #4  
**Milestone:** M1 Server  
**Depends on:** [TKT-002](TKT-002-sqlite-schema.md) (#2), [TKT-003](TKT-003-validation-errors.md) (#3)

## Goal

Store the player directory and expose `GET /api/players` and `POST /api/players`.

## Scope

- Generate a player ID on the server.
- Store the normalized name and a server `createdAt` timestamp.
- Return the OpenAPI player document from creation.
- Return every player ordered by `createdAt` and then `id`.
- Allow two players to have the same normalized name.

## Out of scope

- Updating, deleting, merging, or authenticating players.
- Client-side duplicate warnings.

## Implementation notes

- Use a UUID string that also satisfies the shared identifier pattern.
- Keep SQL in the database module and coordinate the operation from the player service.
- Return `201` for creation and `200` for the list.

## Acceptance criteria

- [ ] A valid name returns `201` with `id`, normalized `name`, and `createdAt`.
- [ ] Repeating the same name returns a second player with a different ID.
- [ ] A blank name returns `400` and stores nothing.
- [ ] The list includes every stored player in the specified order.
- [ ] The response contains no fields outside the OpenAPI player schema.
