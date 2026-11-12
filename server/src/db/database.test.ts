import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type Database from "better-sqlite3";
import { openDatabase } from "./database.js";

function temporaryDatabasePath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "poker-schema-"));
  return path.join(directory, "poker.sqlite");
}

function withDatabase(run: (database: Database.Database, filePath: string) => void): void {
  const filePath = temporaryDatabasePath();
  const database = openDatabase(filePath);

  try {
    run(database, filePath);
  } finally {
    database.close();
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
  }
}

function insertPlayer(database: Database.Database, id = "player-1"): void {
  database
    .prepare("INSERT INTO players (id, name, created_at) VALUES (?, ?, ?)")
    .run(id, "Ada", "2026-11-12T18:00:00Z");
}

function insertSession(database: Database.Database, id = "session-1"): void {
  database
    .prepare("INSERT INTO sessions (id, date, created_at) VALUES (?, ?, ?)")
    .run(id, "2026-11-12", "2026-11-12T18:00:00Z");
}

function insertTransaction(
  database: Database.Database,
  values: {
    id?: string;
    sessionId?: string;
    playerId?: string;
    type?: string;
    amount?: number;
  } = {},
): void {
  database
    .prepare(
      `INSERT INTO transactions (id, session_id, player_id, type, amount, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      values.id ?? "tx-1",
      values.sessionId ?? "session-1",
      values.playerId ?? "player-1",
      values.type ?? "buy-in",
      values.amount ?? 1,
      "2026-11-12T18:15:00Z",
    );
}

test("creates the sqlite file and applies the schema twice", () => {
  const filePath = temporaryDatabasePath();
  assert.equal(fs.existsSync(filePath), false);

  const first = openDatabase(filePath);
  assert.equal(fs.existsSync(filePath), true);
  first.close();

  const second = openDatabase(filePath);
  try {
    const tables = second
      .prepare(
        `SELECT name
         FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      )
      .all() as Array<{ name: string }>;

    assert.deepEqual(
      tables.map((table) => table.name),
      ["players", "sessions", "transactions"],
    );
  } finally {
    second.close();
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
  }
});

test("rejects a transaction with an unknown player or session", () => {
  withDatabase((database) => {
    insertPlayer(database);
    insertSession(database);

    assert.throws(() => insertTransaction(database, { playerId: "missing-player" }));
    assert.throws(() => insertTransaction(database, { id: "tx-2", sessionId: "missing-session" }));
  });
});

test("rejects a transaction type outside buy-in, rebuy, and cash-out", () => {
  withDatabase((database) => {
    insertPlayer(database);
    insertSession(database);

    assert.throws(() => insertTransaction(database, { type: "tip" }));
  });
});

test("rejects an amount below 1", () => {
  withDatabase((database) => {
    insertPlayer(database);
    insertSession(database);

    assert.throws(() => insertTransaction(database, { amount: 0 }));
    assert.throws(() => insertTransaction(database, { id: "tx-2", amount: -5 }));
  });
});

test("stores no profit, balance, or statistics columns", () => {
  withDatabase((database) => {
    const forbidden = new Set(["profit", "balance", "statistics"]);

    for (const table of ["players", "sessions", "transactions"]) {
      const columns = database.pragma(`table_info(${table})`) as Array<{ name: string }>;
      const names = columns.map((column) => column.name);

      assert.ok(names.length > 0);
      for (const name of names) {
        assert.equal(forbidden.has(name), false);
      }
    }
  });
});
