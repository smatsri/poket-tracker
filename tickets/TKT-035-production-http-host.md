# TKT-035 — Serve the production client from Express

**Status:** done  
**Issue:** #35  
**Milestone:** M8 Production deployment  
**Depends on:** none

## Goal

One Express process serves the built React app and the existing API on the same origin.

## Scope

- Listen on `process.env.PORT` and `0.0.0.0`.
- Serve `client/dist`. Non-API requests that are not built files receive `index.html`, including `/history` and `/stats` paths.
- Treat an empty `VITE_API_BASE_URL` as same-origin `/api`. Development keeps `http://localhost:3001`.
- Add `GET /health`. It returns `200` and does not open a database connection.
- On `SIGTERM`, stop accepting connections, finish in-flight requests, and then close the database.
- Keep the development CORS allow-list for the Vite origin.

## Out of scope

- Authentication. That is [TKT-036](TKT-036-operator-basic-auth.md).
- The container image, Cloud Run, and Neon.
- Changes to screens, calculations, or IndexedDB.

## Implementation notes

- Follow the runtime section of [docs/deployment.md](../docs/deployment.md).
- `/health` must stay outside the SPA fallback and outside `/api`.

## Acceptance criteria

- [x] A production build loaded from Express can call `/api` without an absolute API origin.
- [x] Refreshing `/history` and `/stats` returns the application shell.
- [x] `GET /health` returns `200` without a database.
- [x] The process binds `0.0.0.0` and uses `PORT`.
- [x] `SIGTERM` closes the HTTP server before the database.
- [x] `npm test` and `npm run typecheck` from the repository root pass.
