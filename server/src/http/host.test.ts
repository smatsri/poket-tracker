import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { after, before, describe, test } from "node:test";
import type { Express } from "express";
import express from "express";
import { createApp } from "../app.js";
import { httpHost, httpPort } from "../config.js";
import { closeDatabase, getDatabase, openTestDatabase } from "../db/database.js";
import { openHttpServer, stopServer } from "./server.js";

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

describe("production host", { concurrency: false }, () => {
  let url = "";
  let directory = "";
  let closeServer: () => Promise<void> = async () => undefined;

  before(async () => {
    directory = await mkdtemp(join(tmpdir(), "poker-client-"));
    await mkdir(join(directory, "assets"));
    await writeFile(join(directory, "index.html"), "<!doctype html><title>מעקב פוקר</title>");
    await writeFile(join(directory, "assets", "app.js"), "console.log('built');");
    const server = await listen(createApp({ clientDist: directory }));
    url = server.url;
    closeServer = server.close;
  });

  after(async () => {
    await closeServer();
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  });

  test("GET /health returns 200 without a database", async () => {
    assert.throws(() => getDatabase(), /Database is not open/);

    const response = await fetch(`${url}/health`);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
    assert.throws(() => getDatabase(), /Database is not open/);
  });

  test("refreshing history and stats returns the application shell", async () => {
    for (const path of ["/history", "/stats", "/history/session-001", "/stats/player-ada"]) {
      const response = await fetch(`${url}${path}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /html/);
      assert.match(await response.text(), /מעקב פוקר/);
    }

    const asset = await fetch(`${url}/assets/app.js`);
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), "console.log('built');");
  });

  test("the served shell can call /api on the same origin", async () => {
    await openTestDatabase();

    const shell = await fetch(`${url}/`);
    const players = await fetch(`${url}/api/players`);
    const shellOrigin = new URL(shell.url).origin;
    const apiOrigin = new URL(players.url).origin;

    assert.equal(shell.status, 200);
    assert.match(await shell.text(), /מעקב פוקר/);
    assert.equal(players.status, 200);
    assert.equal(shellOrigin, apiOrigin);
    assert.deepEqual(await players.json(), { players: [] });
  });
});

test("the process binds 0.0.0.0 and uses PORT", async () => {
  assert.equal(httpHost, "0.0.0.0");
  assert.equal(httpPort({}), 3001);
  assert.equal(httpPort({ PORT: "8080" }), 8080);

  const server = openHttpServer(express(), 0);
  await once(server, "listening");
  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.ok(address && typeof address !== "string");
    assert.equal(address.address, "0.0.0.0");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("SIGTERM closes the HTTP server before the database", async () => {
  const events: string[] = [];
  let release: () => void = () => undefined;
  const handlerEntered = new Promise<void>((resolve) => {
    release = resolve;
  });
  const app = express();
  app.get("/slow", (_req, res) => {
    release();
    setTimeout(() => {
      events.push("response");
      res.status(204).end();
    }, 30);
  });

  const server = openHttpServer(app, 0);
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const pending = fetch(`http://127.0.0.1:${address.port}/slow`);
  await handlerEntered;
  const stopped = stopServer(server, async () => {
    events.push("database");
  });
  await pending;
  await stopped;

  assert.deepEqual(events, ["response", "database"]);
});
