# TKT-010 — Add the HTTP API layer

**Status:** todo  
**Issue:** #10  
**Milestone:** M2 Client core  
**Depends on:** [TKT-001](TKT-001-scaffold-workspaces.md) (#1), [TKT-008](TKT-008-domain-calculations.md) (#8)

## Goal

Isolate all HTTP communication behind one client API layer that follows the OpenAPI contract.

## Scope

- Read the base URL from `VITE_API_BASE_URL`.
- Implement list players, create player, submit session, get session, and list sessions.
- Send nested transactions without a redundant `sessionId`.
- Classify failures as network failure, `400`, `404`, `409`, `500`, or unexpected response.
- Parse successful player and session documents into domain objects, restoring `sessionId` on each transaction.

## Out of scope

- React components and retry policy. TKT-011 decides how classified failures change local state.
- A generated SDK or data-fetching library.

## Implementation notes

- Only `client/src/data/api/` may call `fetch`.
- Treat an unreachable server and an aborted request as network failures.
- Do not convert a `409` into a new session ID.
- Preserve the response body message for display, while using the status and `error.code` for control flow.

## Acceptance criteria

- [ ] Each contract operation has one function and no component needs to call `fetch`.
- [ ] A successful session response becomes domain transactions carrying their parent session ID.
- [ ] Network failure, `400`, `404`, `409`, and `500` are distinguishable by the caller.
- [ ] Request bodies contain only fields allowed by the OpenAPI write schemas.
