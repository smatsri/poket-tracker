import assert from "node:assert/strict";
import test from "node:test";
import { createEphemeralDatabase } from "./database.js";
import { applyMigrations } from "./migrate.js";
import type { Database } from "./sql.js";

async function withDatabase(run: (database: Database) => Promise<void>): Promise<void> {
  const database = await createEphemeralDatabase();
  try {
    await run(database);
  } finally {
    await database.close();
  }
}

async function insertPlayer(database: Database, id = "player-1"): Promise<void> {
  await database.query("INSERT INTO players (id, name, created_at) VALUES ($1, $2, $3)", [
    id,
    "Ada",
    "2026-11-12T18:00:00Z",
  ]);
}

async function insertSession(database: Database, id = "session-1"): Promise<void> {
  await database.query(`INSERT INTO sessions (id, "date", created_at) VALUES ($1, $2, $3)`, [
    id,
    "2026-11-12",
    "2026-11-12T18:00:00Z",
  ]);
}

async function insertTransaction(
  database: Database,
  values: {
    id?: string;
    sessionId?: string;
    playerId?: string;
    type?: string;
    amount?: number;
  } = {},
): Promise<void> {
  await database.query(
    `INSERT INTO transactions (id, session_id, player_id, type, amount, "timestamp")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      values.id ?? "tx-1",
      values.sessionId ?? "session-1",
      values.playerId ?? "player-1",
      values.type ?? "buy-in",
      values.amount ?? 1,
      "2026-11-12T18:15:00Z",
    ],
  );
}

async function tableNames(database: Database): Promise<string[]> {
  const tables = await database.query<{ name: string }>(
    `SELECT table_name AS name
     FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );
  return tables.rows.map((table) => table.name);
}

test("applies migrations twice without duplicating tables", async () => {
  await withDatabase(async (database) => {
    await applyMigrations(database);

    assert.deepEqual(await tableNames(database), [
      "players",
      "schema_migrations",
      "sessions",
      "transactions",
    ]);

    const versions = await database.query<{ id: string }>("SELECT id FROM schema_migrations ORDER BY id");
    assert.deepEqual(
      versions.rows.map((row) => row.id),
      ["001"],
    );
  });
});

test("rejects a transaction with an unknown player or session", async () => {
  await withDatabase(async (database) => {
    await insertPlayer(database);
    await insertSession(database);

    await assert.rejects(() => insertTransaction(database, { playerId: "missing-player" }));
    await assert.rejects(() => insertTransaction(database, { id: "tx-2", sessionId: "missing-session" }));
  });
});

test("rejects a transaction type outside buy-in, rebuy, and cash-out", async () => {
  await withDatabase(async (database) => {
    await insertPlayer(database);
    await insertSession(database);

    await assert.rejects(() => insertTransaction(database, { type: "tip" }));
  });
});

test("rejects an amount below 1", async () => {
  await withDatabase(async (database) => {
    await insertPlayer(database);
    await insertSession(database);

    await assert.rejects(() => insertTransaction(database, { amount: 0 }));
    await assert.rejects(() => insertTransaction(database, { id: "tx-2", amount: -5 }));
  });
});

test("stores no profit, balance, or statistics columns", async () => {
  await withDatabase(async (database) => {
    const forbidden = new Set(["profit", "balance", "statistics"]);

    for (const table of ["players", "sessions", "transactions"]) {
      const columns = await database.query<{ name: string }>(
        `SELECT column_name AS name
         FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = $1`,
        [table],
      );
      const names = columns.rows.map((column) => column.name);

      assert.ok(names.length > 0);
      for (const name of names) {
        assert.equal(forbidden.has(name), false);
      }
    }
  });
});
