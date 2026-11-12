# Development

## Workspace

Version 1 uses one npm workspace with two packages:

```text
poket-tracker/
  package.json
  client/
    package.json
    index.html
    src/
  server/
    package.json
    src/
    data/              # local SQLite files, not committed
  docs/
  specs/
  tickets/
```

The root package is private and lists `client` and `server` as workspaces. Use TypeScript in strict mode in both packages. The client uses Vite and React. The server uses Express, Zod, and better-sqlite3.

Node.js 22 or newer is required. Package management is npm.

## Configuration

Server environment:

```text
PORT=3001
SQLITE_PATH=data/poker.sqlite
CLIENT_ORIGIN=http://localhost:5173
```

Client environment:

```text
VITE_API_BASE_URL=http://localhost:3001
```

Paths in `SQLITE_PATH` are relative to `server/`. The server creates the data directory and applies the schema on startup. CORS allows only `CLIENT_ORIGIN`.

No authentication variables exist in version 1. Do not add secrets to the repository.

## Commands

TKT-001 introduces these root commands:

| Command | Result |
| --- | --- |
| `npm install` | Installs both workspaces |
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
- Add a dependency only when a ticket names it. The approved runtime dependencies are React, React DOM, Express, Zod, better-sqlite3, and `@fontsource/heebo`. Vite and TypeScript are development dependencies.

## Recommended order

The ticket index in [tickets/README.md](../tickets/README.md) is the execution plan.

1. Scaffold both workspaces and their commands.
2. Initialize SQLite, then add validation, players, session submission, and session retrieval.
3. Lock the server behavior with integration tests.
4. Build client domain calculations, IndexedDB recovery, the API layer, and submission state.
5. Build the Hebrew shell, then the live evening flow, and then history and statistics.
6. Run the manual MVP checklist in [docs/testing.md](testing.md).

Server and client-core work can proceed in parallel after the workspace scaffold. The live submission interface needs both sides. History and statistics need session retrieval.

## GitHub issues

Each file in [tickets/](../tickets/) is an issue on `smatsri/poket-tracker`, and those issues are on the [poker tracker](https://github.com/users/smatsri/projects/8) project. The markdown file stays the spec.

| `**Status:**` | Issue | Board column |
| --- | --- | --- |
| `todo` | open | Todo |
| `in-progress` | open | In Progress |
| `done` | closed | Done |

After editing the status line, run:

```bash
node scripts/sync-github-issues.mjs
```

That command needs the GitHub CLI on `PATH`, signed in with the `repo` and `project` scopes. Closing an issue from GitHub moves its card to Done, and moving a card to Done closes the issue.

## Local API check

After the server tickets are complete, this sequence should work against a fresh database:

```bash
curl -s -X POST http://localhost:3001/api/players \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"David\"}"

curl -s -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"session-001\",\"date\":\"2026-11-12\",\"transactions\":[{\"id\":\"tx-001\",\"playerId\":\"PLAYER_ID\",\"type\":\"buy-in\",\"amount\":50,\"timestamp\":\"2026-11-12T18:15:00Z\"}]}"
```

Repeat the second request and expect `200` with one stored session. Change the amount and expect `409`. Replace `PLAYER_ID` with the ID returned by the first request.
