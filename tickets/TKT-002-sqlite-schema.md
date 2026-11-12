# TKT-002 — Initialize SQLite and enforce the schema

**Status:** done  
**Issue:** #2  
**Milestone:** M1 Server  
**Depends on:** [TKT-001](TKT-001-scaffold-workspaces.md) (#1)

## Goal

Open a durable SQLite database on startup and enforce the schema and foreign keys from [docs/data-model.md](../docs/data-model.md).

## Scope

- Add better-sqlite3 as the database dependency.
- Create the data directory and database file from `SQLITE_PATH`.
- Apply the players, sessions, and transactions schema idempotently.
- Enable foreign key enforcement on every connection.
- Keep SQL and connection setup in `server/src/db/`.

## Out of scope

- HTTP endpoints and request validation.
- Seed data, migrations beyond the initial schema, and database hosting.

## Implementation notes

- Run `PRAGMA foreign_keys = ON` for the connection used by the application.
- Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- Close the connection on process shutdown.

## Acceptance criteria

- [x] Starting the server creates the configured SQLite file when it does not exist.
- [x] Starting the server twice neither duplicates tables nor fails.
- [x] Inserting a transaction with an unknown `player_id` or `session_id` fails.
- [x] A transaction type outside `buy-in`, `rebuy`, and `cash-out` fails at the database.
- [x] An amount below 1 fails at the database.
- [x] The schema contains no profit, balance, or statistics columns.
