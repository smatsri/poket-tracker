# Development

## Workspace

Version 1 uses one npm workspace with two packages:

```text
poket-tracker/
  package.json
  compose.yaml       # local PostgreSQL only
  client/
    package.json
    index.html
    src/
  server/
    package.json
    src/
  docs/
  specs/
  tickets/
```

The root package is private and lists `client` and `server` as workspaces. Use TypeScript in strict mode in both packages. The client uses Vite and React. The server uses Express, Zod, and `pg`.

Node.js 22 or newer is required. Package management is npm.

## Configuration

Server environment:

```text
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/poker
CLIENT_ORIGIN=http://localhost:5173
```

Client environment:

```text
VITE_API_BASE_URL=http://localhost:3001
```

Start local PostgreSQL with `docker compose up -d` before the server. That Compose file runs only PostgreSQL 16: port 5432, database `poker`, user `postgres`, password `postgres`, and a named volume. It does not run the client or the server. Set `DATABASE_URL` in the environment. Do not commit an env file.

The server reads `DATABASE_URL`, opens a pool, and applies numbered migrations on startup. `npm test` uses in-memory PGlite and does not need Compose or a Neon database. CORS allows only `CLIENT_ORIGIN`.

No authentication variables exist in version 1. Do not add secrets to the repository.

## Commands

Root commands:

| Command | Result |
| --- | --- |
| `npm install` | Installs both workspaces |
| `docker compose up -d` | Local PostgreSQL 16 at `localhost:5432` |
| `npm run dev --workspace client` | Vite at `http://localhost:5173` |
| `npm run dev --workspace server` | API at `http://localhost:3001` |
| `npm run typecheck` | Strict TypeScript check for both packages |
| `npm test` | Server tests and client domain tests |
| `npm run build` | Production builds for both packages |

Run the client and server in separate terminals during development. The server must be started before player creation or session submission can succeed.

Validate the contract with Redocly before changing it:

```bash
npx --yes @redocly/cli lint docs/api/openapi.yaml --config docs/api/redocly.yaml
```

## Implementation boundaries

- Follow [docs/api/openapi.yaml](api/openapi.yaml) for every request and response. When a source specification example differs, the OpenAPI document wins.
- Keep financial calculations in `client/src/domain/`.
- Keep SQL in `server/src/db/`.
- Return the error document defined in the contract. Do not return stack traces, SQL text, or driver errors.
- Add a runtime dependency only when a new ticket names it. The approved runtime dependencies are React, React DOM, Express, Zod, `pg`, and `@fontsource/heebo`. Vite, TypeScript, `tsx`, and `@electric-sql/pglite` are development dependencies.

## Current state

Milestones M0–M7 in [tickets/README.md](../tickets/README.md) are done. That work built the workspaces, the player and session API, client calculations and submission, the Hebrew evening flow, history, statistics, the Version 1.0 charts, and the contract-hardening fixes. The API stores players, sessions, and transactions in PostgreSQL. Acceptance evidence is in [TKT-022](../tickets/TKT-022-mvp-acceptance.md), [TKT-028](../tickets/TKT-028-v1-acceptance.md), and TKT-029–TKT-032. Production hosting is locked in [deployment.md](deployment.md). Later product work should reuse `GET /api/sessions` and the client calculations before adding an endpoint.

## GitHub issues

Each file in [tickets/](../tickets/) is an issue on `smatsri/poket-tracker`, and those issues are on the [poker tracker](https://github.com/users/smatsri/projects/8) project. The markdown file stays the spec. The GitHub issue body is only a link to that file.

| Ticket `**Status:**` | Issue | Board column |
| --- | --- | --- |
| `todo`, and a `Depends on` ticket is not done | open | Todo |
| `todo`, and every dependency is done | open | Ready |
| `in-progress` | open | In Progress |
| `done` | closed | Done |

When a ticket becomes `done`, update `**Status:**` in the ticket file and push a commit whose message contains `Closes #<issue>` using the number from `**Issue:**`. Closing the issue moves its project card to Done, and moving a card to Done closes the issue.

## Local API check

This sequence checks a fresh Compose database. Set `DATABASE_URL` and start the server first:

```bash
curl -s -X POST http://localhost:3001/api/players \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"David\"}"

curl -s -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"session-001\",\"date\":\"2026-11-12\",\"transactions\":[{\"id\":\"tx-001\",\"playerId\":\"PLAYER_ID\",\"type\":\"buy-in\",\"amount\":50,\"timestamp\":\"2026-11-12T18:15:00Z\"}]}"
```

Repeat the second request and expect `200` with one stored session. Change the amount and expect `409`. Replace `PLAYER_ID` with the ID returned by the first request.
