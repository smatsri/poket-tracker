# Poker Tracker

Poker Tracker is a personal, mobile-first web application for recording one poker evening at a time. One person operates the application and records buy-ins, rebuys, and cash-outs for every player. The interface is Hebrew and right-to-left.

The client keeps the active evening on the device and calculates every balance. When the evening is finished, the client sends the complete session to the server. The server stores and returns sessions; it does not calculate results.

Version 1.0 is implemented. It covers the live evening, history, statistics, player progression, and three historical charts. The ticket backlog in [tickets/README.md](tickets/README.md) is complete through [TKT-028](tickets/TKT-028-v1-acceptance.md).

## Start here

| Document | Purpose |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Runtime boundaries, submission flow, and locked product decisions |
| [docs/data-model.md](docs/data-model.md) | Domain entities, PostgreSQL schema, and financial formulas |
| [docs/api/openapi.yaml](docs/api/openapi.yaml) | Authoritative HTTP contract |
| [docs/development.md](docs/development.md) | Workspace layout, configuration, and local commands |
| [docs/testing.md](docs/testing.md) | Automated and manual acceptance strategy |
| [docs/roadmap-v1.0.md](docs/roadmap-v1.0.md) | Shipped Version 1.0 scope and later ideas |
| [tickets/README.md](tickets/README.md) | Completed implementation backlog |

## Source specifications

The documents above describe the shipped application and supersede the source specifications where they explicitly resolve a gap. Otherwise, the specifications remain the original product source:

- [specs/UI Screens & Functionality Specification.md](specs/UI%20Screens%20%26%20Functionality%20Specification.md)
- [specs/Visual Design Language.md](specs/Visual%20Design%20Language.md)
- [specs/poker-tracker-client-spec.md](specs/poker-tracker-client-spec.md)
- [specs/poker-tracker-server-spec.md](specs/poker-tracker-server-spec.md)

## Stack

- Client: React, TypeScript, Vite, IndexedDB, and CSS
- Server: Node.js, TypeScript, Express, PostgreSQL, pg, and Zod
- Contract: OpenAPI 3.1

```bash
npm install
npm run dev --workspace client
npm run dev --workspace server
npm run typecheck
npm test
```

The client runs at `http://localhost:5173`. The API runs at `http://localhost:3001`. Run the client and server in separate terminals. The server must be running before player creation or session submission can succeed.
