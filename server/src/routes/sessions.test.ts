import assert from "node:assert/strict";
import { createServer } from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import type { Express } from "express";
import { createApp } from "../app.js";
import { closeDatabase, getDatabase, openAppDatabase } from "../db/database.js";
import { insertPlayer } from "../db/players.js";

const sessionDocumentKeys = ["createdAt", "date", "id", "players", "transactions"];
const transactionKeys = ["amount", "id", "playerId", "timestamp", "type"];
const forbiddenTotals = ["balance", "buyIns", "cashOuts", "net", "profit", "totalBuyIns", "totalCashOuts"];

const buyIn = {
  id: "tx-001",
  playerId: "player-ada",
  type: "buy-in",
  amount: 50,
  timestamp: "2026-11-12T18:15:00Z",
};

const cashOut = {
  id: "tx-002",
  playerId: "player-bea",
  type: "cash-out",
  amount: 80,
  timestamp: "2026-11-12T19:00:00Z",
};

function sessionBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "session-001",
    date: "2026-11-12",
    transactions: [cashOut, buyIn],
    ...overrides,
  };
}

function listen(app: Express): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(app);
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Expected a TCP address"));
        return;
      }

      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()));
          }),
      });
    });
  });
}

function counts(): { sessions: number; transactions: number } {
  const database = getDatabase();
  const sessions = database.prepare("SELECT COUNT(*) AS count FROM sessions").get() as { count: number };
  const transactions = database.prepare("SELECT COUNT(*) AS count FROM transactions").get() as { count: number };
  return { sessions: sessions.count, transactions: transactions.count };
}

function assertSessionDocument(value: unknown): asserts value is {
  id: string;
  date: string;
  createdAt: string;
  transactions: Array<{ id: string; playerId: string; type: string; amount: number; timestamp: string }>;
  players: Array<{ id: string; name: string; createdAt: string }>;
} {
  assert.equal(typeof value, "object");
  assert.ok(value);
  const body = value as Record<string, unknown>;
  assert.deepEqual(Object.keys(body).sort(), sessionDocumentKeys);
  for (const field of forbiddenTotals) {
    assert.equal(Object.hasOwn(body, field), false);
  }
  assert.ok(Array.isArray(body.transactions));
  for (const transaction of body.transactions) {
    assert.deepEqual(Object.keys(transaction as object).sort(), transactionKeys);
  }
  assert.ok(Array.isArray(body.players));
  for (const player of body.players) {
    assert.deepEqual(Object.keys(player as object).sort(), ["createdAt", "id", "name"]);
  }
}

async function postSession(url: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${url}/api/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe("session submission", { concurrency: false }, () => {
  let url = "";
  let directory = "";
  let closeServer: () => Promise<void> = async () => undefined;

  before(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "poker-sessions-"));
    openAppDatabase(path.join(directory, "poker.sqlite"));
    const server = await listen(createApp());
    url = server.url;
    closeServer = server.close;
  });

  after(async () => {
    await closeServer();
    closeDatabase();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  beforeEach(() => {
    const database = getDatabase();
    database.exec("DELETE FROM transactions");
    database.exec("DELETE FROM sessions");
    database.exec("DELETE FROM players");
    insertPlayer(database, { id: "player-ada", name: "Ada", createdAt: "2026-11-12T17:00:00.000Z" });
    insertPlayer(database, { id: "player-bea", name: "Bea", createdAt: "2026-11-12T17:05:00.000Z" });
  });

  test("the first valid submission returns 201 and persists the session", async () => {
    const response = await postSession(url, sessionBody());

    assert.equal(response.status, 201);
    assertSessionDocument(response.body);
    assert.equal(response.body.id, "session-001");
    assert.equal(response.body.date, "2026-11-12");
    assert.equal(Number.isNaN(Date.parse(response.body.createdAt)), false);
    assert.deepEqual(
      response.body.transactions.map((transaction) => transaction.id),
      ["tx-001", "tx-002"],
    );
    assert.deepEqual(
      response.body.players.map((player) => player.id),
      ["player-ada", "player-bea"],
    );
    assert.deepEqual(counts(), { sessions: 1, transactions: 2 });
  });

  test("an identical retry returns 200 and preserves createdAt", async () => {
    const first = await postSession(url, sessionBody());
    assertSessionDocument(first.body);

    const retry = await postSession(url, {
      id: "session-001",
      date: "2026-11-12",
      transactions: [
        { ...buyIn, timestamp: "2026-11-12T20:15:00+02:00" },
        cashOut,
      ],
    });

    assert.equal(retry.status, 200);
    assertSessionDocument(retry.body);
    assert.equal(retry.body.createdAt, first.body.createdAt);
    assert.equal(retry.body.transactions[0]?.timestamp, "2026-11-12T18:15:00Z");
    assert.deepEqual(counts(), { sessions: 1, transactions: 2 });
  });

  test("a changed amount or date returns 409 and preserves the stored record", async () => {
    const first = await postSession(url, sessionBody());
    assertSessionDocument(first.body);

    const changedAmount = await postSession(url, sessionBody({
      transactions: [{ ...buyIn, amount: 60 }, cashOut],
    }));
    const changedDate = await postSession(url, sessionBody({ date: "2026-11-13" }));

    for (const response of [changedAmount, changedDate]) {
      assert.equal(response.status, 409);
      assert.deepEqual(response.body, {
        error: { code: "CONFLICT", message: "Session already exists with different content" },
      });
    }

    const stored = getDatabase()
      .prepare("SELECT amount FROM transactions WHERE id = ?")
      .get("tx-001") as { amount: number };
    const session = getDatabase()
      .prepare("SELECT date, created_at AS createdAt FROM sessions WHERE id = ?")
      .get("session-001") as { date: string; createdAt: string };
    assert.equal(stored.amount, 50);
    assert.equal(session.date, "2026-11-12");
    assert.equal(session.createdAt, first.body.createdAt);
    assert.deepEqual(counts(), { sessions: 1, transactions: 2 });
  });

  test("an unknown player returns 400 and leaves no session", async () => {
    const response = await postSession(url, sessionBody({
      transactions: [{ ...buyIn, playerId: "player-missing" }],
    }));

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
    assert.deepEqual(counts(), { sessions: 0, transactions: 0 });
  });

  test("a duplicate transaction id in one request returns 400 and stores nothing", async () => {
    const response = await postSession(url, sessionBody({
      transactions: [buyIn, { ...cashOut, id: "tx-001" }],
    }));

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
    assert.deepEqual(counts(), { sessions: 0, transactions: 0 });
  });

  test("reusing a stored transaction id rolls back the new session", async () => {
    const first = await postSession(url, sessionBody({ transactions: [buyIn] }));
    assert.equal(first.status, 201);

    const response = await postSession(url, {
      id: "session-002",
      date: "2026-11-13",
      transactions: [{ ...buyIn, playerId: "player-bea", amount: 20 }],
    });

    assert.equal(response.status, 409);
    assert.deepEqual(response.body, {
      error: { code: "CONFLICT", message: "Transaction ID already exists" },
    });
    const second = getDatabase().prepare("SELECT id FROM sessions WHERE id = ?").get("session-002");
    assert.equal(second, undefined);
    assert.deepEqual(counts(), { sessions: 1, transactions: 1 });
  });

  test("an empty transaction list is stored without derived totals", async () => {
    const response = await postSession(url, sessionBody({ id: "session-empty", transactions: [] }));

    assert.equal(response.status, 201);
    assertSessionDocument(response.body);
    assert.deepEqual(response.body.transactions, []);
    assert.deepEqual(response.body.players, []);
    assert.deepEqual(counts(), { sessions: 1, transactions: 0 });
  });
});
