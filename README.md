# Poker Tracker

Poker Tracker is a personal, mobile-first web application for recording one poker evening at a time. One person operates the application and records buy-ins, rebuys, and cash-outs for every player. The interface is Hebrew and right-to-left.

The client keeps the active evening on the device and calculates every balance. When the evening is finished, the client sends the complete session to the server. The server stores and returns sessions; it does not calculate results.

This repository currently contains the source specifications, the implementation documentation, and the local ticket backlog. Application code is added by the tickets, starting with [TKT-001](tickets/TKT-001-scaffold-workspaces.md).

## Start here

| Document | Purpose |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Runtime boundaries, submission flow, and locked product decisions |
| [docs/data-model.md](docs/data-model.md) | Domain entities, SQLite schema, and financial formulas |
| [docs/api/openapi.yaml](docs/api/openapi.yaml) | Authoritative HTTP contract |
| [docs/development.md](docs/development.md) | Workspace layout, configuration, and implementation order |
| [docs/testing.md](docs/testing.md) | Automated and manual acceptance strategy |
| [tickets/README.md](tickets/README.md) | Prioritized implementation backlog |

## Source specifications

The documents above supersede the source specifications where they explicitly resolve a gap. Otherwise, the specifications remain the product source:

- [specs/UI Screens & Functionality Specification.md](specs/UI%20Screens%20%26%20Functionality%20Specification.md)
- [specs/Visual Design Language.md](specs/Visual%20Design%20Language.md)
- [specs/poker-tracker-client-spec.md](specs/poker-tracker-client-spec.md)
- [specs/poker-tracker-server-spec.md](specs/poker-tracker-server-spec.md)

## Target stack

- Client: React, TypeScript, Vite, IndexedDB, and CSS
- Server: Node.js, TypeScript, Express, SQLite, better-sqlite3, and Zod
- Contract: OpenAPI 3.1

No application commands exist until TKT-001. That ticket must provide:

```bash
npm install
npm run dev --workspace client
npm run dev --workspace server
npm run typecheck
npm test
```

The client runs at `http://localhost:5173`. The API runs at `http://localhost:3001`.
