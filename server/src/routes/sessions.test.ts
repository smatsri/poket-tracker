import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import type { Express } from "express";
import { Client } from "pg";
import { createApp } from "../app.js";
import { closeDatabase, getDatabase, openTestDatabase } from "../db/database.js";
import { insertPlayer } from "../db/players.js";
import { insertSession, insertTransaction, type StoredTransaction } from "../db/sessions.js";

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

async function counts(): Promise<{ sessions: number; transactions: number }> {
  const database = getDatabase();
  const sessions = await database.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM sessions");
  const transactions = await database.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM transactions");
  return {
    sessions: Number(sessions.rows[0]?.count),
    transactions: Number(transactions.rows[0]?.count),
  };
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

function forceSessionLookupMiss(): { restore: () => void; lookups: () => number } {
  let lookups = 0;
  let missed = false;
  getDatabase().setQueryInterceptor((sql) => {
    if (!sql.includes("FROM sessions WHERE id = $1")) {
      return undefined;
    }

    lookups += 1;
    if (!missed) {
      missed = true;
      return { rows: [] };
    }
    return undefined;
  });
  return {
    restore: () => {
      getDatabase().setQueryInterceptor(undefined);
    },
    lookups: () => lookups,
  };
}

async function postSession(url: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${url}/api/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

const onPostgres = Boolean(process.env.DATABASE_URL);

describe("session submission", { concurrency: false }, () => {
  let url = "";
  let closeServer: () => Promise<void> = async () => undefined;

  before(async () => {
    await openTestDatabase();
    const server = await listen(createApp());
    url = server.url;
    closeServer = server.close;
  });

  after(async () => {
    await closeServer();
    await closeDatabase();
  });

  beforeEach(async () => {
    const database = getDatabase();
    database.setQueryInterceptor(undefined);
    await database.exec("DELETE FROM transactions");
    await database.exec("DELETE FROM sessions");
    await database.exec("DELETE FROM players");
    await insertPlayer(database, { id: "player-ada", name: "Ada", createdAt: "2026-11-12T17:00:00.000Z" });
    await insertPlayer(database, { id: "player-bea", name: "Bea", createdAt: "2026-11-12T17:05:00.000Z" });
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
    assert.deepEqual(await counts(), { sessions: 1, transactions: 2 });
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
    assert.deepEqual(await counts(), { sessions: 1, transactions: 2 });
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

    const stored = await getDatabase().query<{ amount: number }>(
      "SELECT amount FROM transactions WHERE id = $1",
      ["tx-001"],
    );
    const session = await getDatabase().query<{ date: string; createdAt: string }>(
      `SELECT "date", created_at AS "createdAt" FROM sessions WHERE id = $1`,
      ["session-001"],
    );
    assert.equal(Number(stored.rows[0]?.amount), 50);
    assert.equal(session.rows[0]?.date, "2026-11-12");
    assert.equal(session.rows[0]?.createdAt, first.body.createdAt);
    assert.deepEqual(await counts(), { sessions: 1, transactions: 2 });
  });

  test("an existing session id with a different transaction set returns 409", async () => {
    const first = await postSession(url, sessionBody());
    assertSessionDocument(first.body);

    const response = await postSession(url, sessionBody({ transactions: [buyIn] }));

    assert.equal(response.status, 409);
    assert.deepEqual(response.body, {
      error: { code: "CONFLICT", message: "Session already exists with different content" },
    });
    const ids = await getDatabase().query<{ id: string }>(
      "SELECT id FROM transactions WHERE session_id = $1 ORDER BY id",
      ["session-001"],
    );
    assert.deepEqual(
      ids.rows.map((row) => row.id),
      ["tx-001", "tx-002"],
    );
    assert.deepEqual(await counts(), { sessions: 1, transactions: 2 });
  });

  test("invalid session fields return 400 and store nothing", async () => {
    const bodies = [
      sessionBody({ transactions: [{ ...buyIn, amount: 0 }] }),
      sessionBody({ transactions: [{ ...buyIn, amount: -5 }] }),
      sessionBody({ transactions: [{ ...buyIn, amount: 1.5 }] }),
      sessionBody({ transactions: [{ ...buyIn, type: "win" }] }),
      sessionBody({ id: "bad id" }),
      sessionBody({ date: "2026-02-31" }),
      sessionBody({ transactions: [{ ...buyIn, timestamp: "2026-11-12T18:15:00" }] }),
    ];

    for (const body of bodies) {
      const response = await postSession(url, body);
      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        error: { code: "VALIDATION_ERROR", message: "Invalid request" },
      });
      assert.deepEqual(await counts(), { sessions: 0, transactions: 0 });
    }
  });

  test("an unknown player returns 400 and leaves no session", async () => {
    const response = await postSession(url, sessionBody({
      transactions: [{ ...buyIn, playerId: "player-missing" }],
    }));

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
    assert.deepEqual(await counts(), { sessions: 0, transactions: 0 });
  });

  test("a duplicate transaction id in one request returns 400 and stores nothing", async () => {
    const response = await postSession(url, sessionBody({
      transactions: [buyIn, { ...cashOut, id: "tx-001" }],
    }));

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
    assert.deepEqual(await counts(), { sessions: 0, transactions: 0 });
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
    const second = await getDatabase().query("SELECT id FROM sessions WHERE id = $1", ["session-002"]);
    assert.equal(second.rows.length, 0);
    assert.deepEqual(await counts(), { sessions: 1, transactions: 1 });
  });

  async function seedSession(
    session: { id: string; date: string; createdAt: string },
    transactions: StoredTransaction[] = [],
  ): Promise<void> {
    const database = getDatabase();
    await insertSession(database, session);
    for (const transaction of transactions) {
      await insertTransaction(database, session.id, transaction);
    }
  }

  async function getJson(path: string): Promise<{ status: number; body: unknown }> {
    const before = await counts();
    const response = await fetch(`${url}${path}`);
    const body: unknown = await response.json();
    assert.deepEqual(await counts(), before);
    return { status: response.status, body };
  }

  test("a stored session is returned with ordered transactions and distinct players", async () => {
    await seedSession({ id: "session-001", date: "2026-11-12", createdAt: "2026-11-12T22:00:00.000Z" }, [
      { id: "tx-b", playerId: "player-bea", type: "cash-out", amount: 80, timestamp: "2026-11-12T19:00:00Z" },
      { id: "tx-c", playerId: "player-ada", type: "rebuy", amount: 20, timestamp: "2026-11-12T18:15:00Z" },
      { id: "tx-a", playerId: "player-ada", type: "buy-in", amount: 50, timestamp: "2026-11-12T18:15:00Z" },
    ]);

    const response = await getJson("/api/sessions/session-001");
    assert.equal(response.status, 200);
    assertSessionDocument(response.body);
    assert.deepEqual(
      response.body.transactions.map((transaction) => transaction.id),
      ["tx-a", "tx-c", "tx-b"],
    );
    assert.deepEqual(
      response.body.players.map((player) => ({ id: player.id, name: player.name })),
      [
        { id: "player-ada", name: "Ada" },
        { id: "player-bea", name: "Bea" },
      ],
    );
  });

  test("an empty session returns an empty players array", async () => {
    await seedSession({ id: "session-empty", date: "2026-11-12", createdAt: "2026-11-12T22:00:00.000Z" });

    const response = await getJson("/api/sessions/session-empty");
    assert.equal(response.status, 200);
    assertSessionDocument(response.body);
    assert.deepEqual(response.body.transactions, []);
    assert.deepEqual(response.body.players, []);
  });

  test("an unknown session returns 404 and NOT_FOUND", async () => {
    const response = await getJson("/api/sessions/session-missing");
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, {
      error: { code: "NOT_FOUND", message: "Session not found" },
    });
  });

  test("a malformed session id returns 400", async () => {
    const response = await getJson("/api/sessions/bad%20id");
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
  });

  test("the unfiltered list returns every session newest date first", async () => {
    await seedSession({ id: "session-c", date: "2026-11-13", createdAt: "2026-11-13T10:00:00.000Z" });
    await seedSession({ id: "session-m", date: "2026-11-12", createdAt: "2026-11-12T20:00:00.000Z" });
    await seedSession({ id: "session-a", date: "2026-11-12", createdAt: "2026-11-12T20:00:00.000Z" });
    await seedSession({ id: "session-z", date: "2026-11-12", createdAt: "2026-11-12T18:00:00.000Z" });

    const response = await getJson("/api/sessions");
    assert.equal(response.status, 200);
    const body = response.body as { sessions: unknown[] };
    assert.deepEqual(Object.keys(body), ["sessions"]);
    assert.equal(body.sessions.length, 4);
    for (const session of body.sessions) {
      assertSessionDocument(session);
    }
    assert.deepEqual(
      body.sessions.map((session) => (session as { id: string }).id),
      ["session-c", "session-m", "session-a", "session-z"],
    );
  });

  test("from and to bounds are inclusive and either bound may be omitted", async () => {
    await seedSession({ id: "session-11", date: "2026-11-11", createdAt: "2026-11-11T10:00:00.000Z" });
    await seedSession({ id: "session-12", date: "2026-11-12", createdAt: "2026-11-12T10:00:00.000Z" });
    await seedSession({ id: "session-13", date: "2026-11-13", createdAt: "2026-11-13T10:00:00.000Z" });
    await seedSession({ id: "session-14", date: "2026-11-14", createdAt: "2026-11-14T10:00:00.000Z" });

    const both = await getJson("/api/sessions?from=2026-11-12&to=2026-11-13");
    const fromOnly = await getJson("/api/sessions?from=2026-11-13");
    const toOnly = await getJson("/api/sessions?to=2026-11-12");

    assert.equal(both.status, 200);
    assert.equal(fromOnly.status, 200);
    assert.equal(toOnly.status, 200);
    assert.deepEqual(
      (both.body as { sessions: Array<{ id: string }> }).sessions.map((session) => session.id),
      ["session-13", "session-12"],
    );
    assert.deepEqual(
      (fromOnly.body as { sessions: Array<{ id: string }> }).sessions.map((session) => session.id),
      ["session-14", "session-13"],
    );
    assert.deepEqual(
      (toOnly.body as { sessions: Array<{ id: string }> }).sessions.map((session) => session.id),
      ["session-12", "session-11"],
    );
  });

  test("a reversed or invalid date range returns 400", async () => {
    await seedSession({ id: "session-12", date: "2026-11-12", createdAt: "2026-11-12T10:00:00.000Z" });

    const reversed = await getJson("/api/sessions?from=2026-11-13&to=2026-11-12");
    const invalid = await getJson("/api/sessions?from=2026-02-31");

    for (const response of [reversed, invalid]) {
      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        error: { code: "VALIDATION_ERROR", message: "Invalid request" },
      });
    }
    assert.deepEqual(await counts(), { sessions: 1, transactions: 0 });
  });

  test("an identical submission that loses the session-id insert returns 200 and keeps one session", async () => {
    const first = await postSession(url, sessionBody());
    assert.equal(first.status, 201);
    assertSessionDocument(first.body);

    const conflict = forceSessionLookupMiss();
    try {
      const retry = await postSession(url, sessionBody());
      assert.equal(retry.status, 200);
      assertSessionDocument(retry.body);
      assert.equal(retry.body.createdAt, first.body.createdAt);
      assert.equal(conflict.lookups(), 2);
      assert.deepEqual(await counts(), { sessions: 1, transactions: 2 });
    } finally {
      conflict.restore();
    }
  });

  test("a different submission that loses the session-id insert returns 409 and keeps the stored session", async () => {
    const first = await postSession(url, sessionBody());
    assert.equal(first.status, 201);
    assertSessionDocument(first.body);

    const conflict = forceSessionLookupMiss();
    try {
      const response = await postSession(url, sessionBody({
        transactions: [{ ...buyIn, amount: 60 }, cashOut],
      }));
      assert.equal(response.status, 409);
      assert.deepEqual(response.body, {
        error: { code: "CONFLICT", message: "Session already exists with different content" },
      });
      assert.equal(conflict.lookups(), 2);
      const stored = await getDatabase().query<{ amount: number }>(
        "SELECT amount FROM transactions WHERE id = $1",
        ["tx-001"],
      );
      const session = await getDatabase().query<{ date: string; createdAt: string }>(
        `SELECT "date", created_at AS "createdAt" FROM sessions WHERE id = $1`,
        ["session-001"],
      );
      assert.equal(Number(stored.rows[0]?.amount), 50);
      assert.equal(session.rows[0]?.date, "2026-11-12");
      assert.equal(session.rows[0]?.createdAt, first.body.createdAt);
      assert.deepEqual(await counts(), { sessions: 1, transactions: 2 });
    } finally {
      conflict.restore();
    }
  });

  test("an empty transaction list is stored without derived totals", async () => {
    const response = await postSession(url, sessionBody({ id: "session-empty", transactions: [] }));

    assert.equal(response.status, 201);
    assertSessionDocument(response.body);
    assert.deepEqual(response.body.transactions, []);
    assert.deepEqual(response.body.players, []);
    assert.deepEqual(await counts(), { sessions: 1, transactions: 0 });
  });

  test(
    "identical overlapping submits store one session and return 201 and 200",
    { skip: onPostgres ? false : "requires PostgreSQL" },
    async () => {
      const body = sessionBody({ id: "session-overlap" });
      const [first, second] = await overlappingPosts(url, [body, body]);
      const statuses = [first.status, second.status].sort();

      assert.deepEqual(statuses, [200, 201]);
      assertSessionDocument(first.body);
      assertSessionDocument(second.body);
      assert.equal(first.body.createdAt, second.body.createdAt);
      assert.deepEqual(
        first.body.transactions.map((transaction) => transaction.id),
        ["tx-001", "tx-002"],
      );
      await assertStoredSession(url, "session-overlap", first.status === 201 ? first.body : second.body);
      await assertNoPartialRows(["tx-001", "tx-002"]);
    },
  );

  test(
    "conflicting overlapping submits keep the winner and return 409",
    { skip: onPostgres ? false : "requires PostgreSQL" },
    async () => {
      const winnerBody = sessionBody({ id: "session-overlap" });
      const loserBody = sessionBody({
        id: "session-overlap",
        transactions: [{ ...buyIn, amount: 90 }, cashOut],
      });
      const [first, second] = await overlappingPosts(url, [winnerBody, loserBody]);
      const responses = [first, second];
      const winner = responses.find((response) => response.status === 201);
      const loser = responses.find((response) => response.status === 409);

      assert.ok(winner);
      assert.ok(loser);
      assert.equal(responses.every((response) => response.status === 201 || response.status === 409), true);
      assertSessionDocument(winner.body);
      const storedBuyIn = winner.body.transactions.find((transaction) => transaction.id === "tx-001");
      assert.ok(storedBuyIn);
      assert.deepEqual(loser.body, {
        error: { code: "CONFLICT", message: "Session already exists with different content" },
      });
      await assertStoredSession(url, "session-overlap", winner.body);
      await assertNoPartialRows(["tx-001", "tx-002"]);
      const amount = await getDatabase().query<{ amount: number }>(
        "SELECT amount FROM transactions WHERE id = $1",
        ["tx-001"],
      );
      assert.equal(Number(amount.rows[0]?.amount), storedBuyIn.amount);
    },
  );
});

async function assertStoredSession(url: string, id: string, expected: unknown): Promise<void> {
  const response = await fetch(`${url}/api/sessions/${id}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), expected);
}

async function assertNoPartialRows(transactionIds: string[]): Promise<void> {
  const database = getDatabase();
  const orphans = await database.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM transactions
     WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE sessions.id = transactions.session_id)`,
  );
  const bareSessions = await database.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM sessions
     WHERE NOT EXISTS (
       SELECT 1 FROM transactions WHERE transactions.session_id = sessions.id
     )`,
  );
  assert.equal(Number(orphans.rows[0]?.count), 0);
  assert.equal(Number(bareSessions.rows[0]?.count), 0);
  assert.deepEqual(await counts(), { sessions: 1, transactions: transactionIds.length });
}

async function overlappingPosts(
  url: string,
  bodies: [Record<string, unknown>, Record<string, unknown>],
): Promise<[{ status: number; body: unknown }, { status: number; body: unknown }]> {
  let arrivals = 0;
  let release: () => void = () => undefined;
  const bothEntered = new Promise<void>((resolve) => {
    release = resolve;
  });

  getDatabase().setQueryInterceptor(async (sql) => {
    if (!sql.includes("FROM sessions WHERE id = $1") || arrivals >= 2) {
      return undefined;
    }

    arrivals += 1;
    if (arrivals >= 2) {
      await assertTwoOpenTransactions();
      release();
    }
    await bothEntered;
    return { rows: [] };
  });

  try {
    return await Promise.all([postSession(url, bodies[0]), postSession(url, bodies[1])]);
  } finally {
    release();
    getDatabase().setQueryInterceptor(undefined);
  }
}

async function assertTwoOpenTransactions(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString);
  const client = new Client({ connectionString, application_name: "poker-overlap-watch" });
  await client.connect();
  try {
    const waiting = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM pg_stat_activity
       WHERE datname = current_database()
         AND application_name = $1
         AND state = 'idle in transaction'`,
      [`poker-test-${process.pid}`],
    );
    assert.ok(
      Number(waiting.rows[0]?.count) >= 2,
      "overlapping submits did not hold two PostgreSQL connections",
    );
  } finally {
    await client.end();
  }
}
