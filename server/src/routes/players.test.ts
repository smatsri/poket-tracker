import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import type { Express } from "express";
import { createApp } from "../app.js";
import { closeDatabase, getDatabase, openTestDatabase } from "../db/database.js";
import { insertPlayer } from "../db/players.js";

const identifierPattern = /^[A-Za-z0-9_-]+$/;

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

async function playerCount(): Promise<number> {
  const result = await getDatabase().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM players");
  return Number(result.rows[0]?.count);
}

function assertPlayerDocument(value: unknown): asserts value is {
  id: string;
  name: string;
  createdAt: string;
} {
  assert.equal(typeof value, "object");
  assert.ok(value);
  assert.deepEqual(Object.keys(value).sort(), ["createdAt", "id", "name"]);

  const player = value as { id: string; name: string; createdAt: string };
  assert.match(player.id, identifierPattern);
  assert.equal(player.id.length <= 64, true);
  assert.equal(Number.isNaN(Date.parse(player.createdAt)), false);
}

describe("player endpoints", { concurrency: false }, () => {
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
    await database.exec("DELETE FROM transactions");
    await database.exec("DELETE FROM sessions");
    await database.exec("DELETE FROM players");
  });

  test("a valid name returns 201 with id, normalized name, and createdAt", async () => {
    const response = await fetch(`${url}/api/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "  Dana   Levi  " }),
    });

    assert.equal(response.status, 201);
    const body: unknown = await response.json();
    assertPlayerDocument(body);
    assert.equal(body.name, "Dana Levi");
    assert.equal(await playerCount(), 1);
  });

  test("repeating the same name returns a second player with a different id", async () => {
    const first = await fetch(`${url}/api/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Dana Levi" }),
    });
    const second = await fetch(`${url}/api/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Dana Levi" }),
    });

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    const firstBody: unknown = await first.json();
    const secondBody: unknown = await second.json();
    assertPlayerDocument(firstBody);
    assertPlayerDocument(secondBody);
    assert.equal(firstBody.name, "Dana Levi");
    assert.equal(secondBody.name, "Dana Levi");
    assert.notEqual(firstBody.id, secondBody.id);
    assert.equal(await playerCount(), 2);
  });

  test("a blank name returns 400 and stores nothing", async () => {
    for (const name of ["", "   "]) {
      const response = await fetch(`${url}/api/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json()) as { error: { code: string; message: string } };

      assert.equal(response.status, 400);
      assert.deepEqual(body, {
        error: { code: "VALIDATION_ERROR", message: "Invalid request" },
      });
    }

    assert.equal(await playerCount(), 0);
  });

  test("the list includes every stored player in createdAt then id order", async () => {
    const empty = await fetch(`${url}/api/players`);
    assert.equal(empty.status, 200);
    assert.deepEqual(await empty.json(), { players: [] });

    const database = getDatabase();
    await insertPlayer(database, { id: "player-c", name: "Cara", createdAt: "2026-11-12T18:00:00.000Z" });
    await insertPlayer(database, { id: "player-a", name: "Ada", createdAt: "2026-11-12T18:00:00.000Z" });
    await insertPlayer(database, { id: "player-b", name: "Bea", createdAt: "2026-11-12T19:00:00.000Z" });

    const response = await fetch(`${url}/api/players`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { players: unknown[] };
    assert.deepEqual(Object.keys(body), ["players"]);
    assert.equal(body.players.length, 3);
    for (const player of body.players) {
      assertPlayerDocument(player);
    }

    assert.deepEqual(
      body.players.map((player) => {
        const stored = player as { id: string; name: string; createdAt: string };
        return { id: stored.id, name: stored.name, createdAt: stored.createdAt };
      }),
      [
        { id: "player-a", name: "Ada", createdAt: "2026-11-12T18:00:00.000Z" },
        { id: "player-c", name: "Cara", createdAt: "2026-11-12T18:00:00.000Z" },
        { id: "player-b", name: "Bea", createdAt: "2026-11-12T19:00:00.000Z" },
      ],
    );
  });

  test("rename keeps the id and a delete is refused once a transaction exists", async () => {
    const created = await fetch(`${url}/api/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "  Dana   Levi  " }),
    });
    assert.equal(created.status, 201);
    const player = (await created.json()) as { id: string; name: string; createdAt: string };
    assertPlayerDocument(player);

    const renamed = await fetch(`${url}/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "  Dana   Cohen " }),
    });
    assert.equal(renamed.status, 200);
    const renamedPlayer = (await renamed.json()) as { id: string; name: string; createdAt: string };
    assertPlayerDocument(renamedPlayer);
    assert.equal(renamedPlayer.id, player.id);
    assert.equal(renamedPlayer.name, "Dana Cohen");
    assert.equal(renamedPlayer.createdAt, player.createdAt);

    const submitted = await fetch(`${url}/api/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "session-001",
        date: "2026-11-12",
        transactions: [
          {
            id: "tx-001",
            playerId: player.id,
            type: "buy-in",
            amount: 50,
            timestamp: "2026-11-12T18:15:00Z",
          },
        ],
      }),
    });
    assert.equal(submitted.status, 201);

    const again = await fetch(`${url}/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Dana Levi" }),
    });
    assert.equal(again.status, 200);

    const session = await fetch(`${url}/api/sessions/session-001`);
    assert.equal(session.status, 200);
    const stored = (await session.json()) as {
      players: Array<{ id: string; name: string }>;
      transactions: Array<{ id: string; playerId: string; type: string; amount: number }>;
    };
    assert.equal(stored.players[0]?.name, "Dana Levi");
    assert.deepEqual(stored.transactions, [
      { id: "tx-001", playerId: player.id, type: "buy-in", amount: 50, timestamp: "2026-11-12T18:15:00Z" },
    ]);

    const refused = await fetch(`${url}/api/players/${player.id}`, { method: "DELETE" });
    assert.equal(refused.status, 409);
    const refusedBody = (await refused.json()) as { error: { code: string } };
    assert.equal(refusedBody.error.code, "CONFLICT");
    const remaining = await fetch(`${url}/api/players`);
    const remainingBody = (await remaining.json()) as { players: Array<{ id: string }> };
    assert.equal(remainingBody.players.some((item) => item.id === player.id), true);

    const spare = await fetch(`${url}/api/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Guest" }),
    });
    const guest = (await spare.json()) as { id: string };
    const removed = await fetch(`${url}/api/players/${guest.id}`, { method: "DELETE" });
    assert.equal(removed.status, 204);
    const after = await fetch(`${url}/api/players`);
    const afterBody = (await after.json()) as { players: Array<{ id: string }> };
    assert.equal(afterBody.players.some((item) => item.id === guest.id), false);
    assert.equal(afterBody.players.some((item) => item.id === player.id), true);
  });
});
