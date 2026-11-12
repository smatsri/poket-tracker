# TKT-001 — Scaffold the client and server workspaces

**Status:** todo  
**Milestone:** M0 Foundation  
**Depends on:** none

## Goal

Create the npm workspace that every later ticket builds on, with strict TypeScript and the commands documented in [docs/development.md](../docs/development.md).

## Scope

- Add a private root package with `client` and `server` workspaces.
- Create a Vite React TypeScript client and an Express TypeScript server.
- Add `dev`, `build`, `typecheck`, and `test` scripts. Root `typecheck`, `test`, and `build` run both workspaces.
- Set the client dev server to port 5173 and the server default port to 3001.
- Read `PORT`, `SQLITE_PATH`, and `CLIENT_ORIGIN` on the server, and `VITE_API_BASE_URL` on the client.
- Enable CORS for `CLIENT_ORIGIN` only.
- Export the Express app separately from the process entry so later tests can call it in-process.
- Ignore dependencies, build output, and `server/data/`.
- Document the required Node.js version as 22 or newer.

## Out of scope

- Database schema, business endpoints, visual design, and domain calculations.
- Authentication, linting frameworks, and extra runtime libraries.

## Implementation notes

- Use TypeScript `strict`. Do not use a state, routing, data-fetching, or UI component library.
- The initial client can render an empty root. The initial server can respond to unknown `/api/*` paths with the JSON error shape and `404`.
- `npm test` may succeed with no tests until TKT-007 and TKT-008 add them.

## Acceptance criteria

- [ ] `npm install` at the repository root installs both workspaces.
- [ ] `npm run typecheck` passes.
- [ ] `npm run dev --workspace client` serves the client on port 5173.
- [ ] `npm run dev --workspace server` listens on port 3001.
- [ ] An unknown API path returns JSON containing `error.code` and `error.message`.
- [ ] Generated output and local database files are ignored by git.
