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

function playerCount(): number {
  const row = getDatabase().prepare("SELECT COUNT(*) AS count FROM players").get() as { count: number };
  return row.count;
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
  let directory = "";
  let closeServer: () => Promise<void> = async () => undefined;

  before(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "poker-players-"));
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
    getDatabase().exec("DELETE FROM players");
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
    assert.equal(playerCount(), 1);
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
    assert.equal(playerCount(), 2);
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

    assert.equal(playerCount(), 0);
  });

  test("the list includes every stored player in createdAt then id order", async () => {
    const empty = await fetch(`${url}/api/players`);
    assert.equal(empty.status, 200);
    assert.deepEqual(await empty.json(), { players: [] });

    const database = getDatabase();
    insertPlayer(database, { id: "player-c", name: "Cara", createdAt: "2026-11-12T18:00:00.000Z" });
    insertPlayer(database, { id: "player-a", name: "Ada", createdAt: "2026-11-12T18:00:00.000Z" });
    insertPlayer(database, { id: "player-b", name: "Bea", createdAt: "2026-11-12T19:00:00.000Z" });

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
});
