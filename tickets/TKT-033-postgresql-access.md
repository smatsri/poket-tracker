# TKT-033 — Replace SQLite with PostgreSQL

**Status:** todo  
**Issue:** #33  
**Milestone:** M8 Production deployment  
**Depends on:** none

## Goal

The existing player and session API runs on PostgreSQL, with the same responses and submit rules as [docs/architecture.md](../docs/architecture.md).

## Scope

- Add `pg` as the server database dependency and remove `better-sqlite3`.
- Read the pooled connection string from `DATABASE_URL`.
- Apply numbered SQL migrations and record them in `schema_migrations`.
- Keep players, sessions, and transactions. Store dates and timestamps as `TEXT` and amounts as `INTEGER`.
- Submit a session and its transactions in one database transaction. Roll the whole submit back when any insert fails.
- Map `23505` on `sessions_pkey` to the existing identical-retry path, `23505` on `transactions_pkey` to `409`, and `23503` to `400`.
- Run the schema, atomic-insert, rollback, idempotent-retry, and constraint-mapping tests on PGlite during `npm test`.
- Add a Compose file that starts only local PostgreSQL 16 for `npm run dev`: port 5432, database `poker`, a named volume. Document the local `DATABASE_URL` in [docs/development.md](../docs/development.md). Do not commit an env file.
- Update [docs/architecture.md](../docs/architecture.md), [docs/data-model.md](../docs/data-model.md), and [docs/development.md](../docs/development.md) so they describe PostgreSQL.

## Out of scope

- Overlapping submits of the same session id. That is [TKT-034](TKT-034-concurrent-session-submit.md).
- Serving the built client, authentication, the production image, and cloud accounts. The Compose file does not run the client or the server.
- An ORM, a data-model redesign, and changes to the OpenAPI contract.

## Implementation notes

- Follow [docs/deployment.md](../docs/deployment.md). The pool uses a small max, a short idle timeout, TLS, and an error listener.
- `CREATE TABLE IF NOT EXISTS` does not change an existing table. Migrations are the schema path.
- PGlite is a development dependency. It does not replace the CI Postgres run in TKT-034. Local `npm run dev` uses the Compose database through `DATABASE_URL=postgres://postgres:postgres@localhost:5432/poker`.

## Acceptance criteria

- [ ] `POST /api/sessions` inserts the session and every transaction, or inserts none of them.
- [ ] An identical retry returns `200` and the stored session. Different content for the same session id returns `409` and leaves the stored session unchanged.
- [ ] A duplicate transaction id returns `409`. An unknown player id returns `400`.
- [ ] Applying migrations twice does not duplicate tables or fail.
- [ ] The schema has no profit, balance, or statistics columns.
- [ ] `npm test` from the repository root passes without `better-sqlite3` and without a running Neon database.
- [ ] Compose starts only PostgreSQL. The development doc gives the local `DATABASE_URL`. The client and server are not services in that file.
