import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import type { Express } from "express";
import { createApp } from "../app.js";
import { closeDatabase, getDatabase, openTestDatabase } from "../db/database.js";
import { assertProductionPassword } from "./auth.js";

const password = "correct-horse-battery";

function basic(username: string, secret: string): string {
  return `Basic ${Buffer.from(`${username}:${secret}`).toString("base64")}`;
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

async function clientDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "poker-auth-"));
  await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "index.html"), "<!doctype html><title>מעקב פוקר</title>");
  await writeFile(join(directory, "assets", "app.js"), "console.log('built');");
  return directory;
}

test("production startup fails when APP_PASSWORD is unset", async () => {
  assert.throws(
    () => assertProductionPassword({ NODE_ENV: "production" }),
    /APP_PASSWORD is required in production/,
  );
  assert.throws(
    () => assertProductionPassword({ NODE_ENV: "production", APP_PASSWORD: "" }),
    /APP_PASSWORD is required in production/,
  );
  assert.doesNotThrow(() =>
    assertProductionPassword({ NODE_ENV: "production", APP_PASSWORD: password }),
  );
  assert.doesNotThrow(() => assertProductionPassword({ NODE_ENV: "development" }));

  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production" };
  delete env.APP_PASSWORD;
  const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stderr = await new Promise<string>((resolve, reject) => {
    let output = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 1) {
        resolve(output);
        return;
      }
      reject(new Error(`Expected exit 1, received ${code}: ${output}`));
    });
  });

  assert.match(stderr, /APP_PASSWORD is required in production/);
});

describe("operator basic auth", { concurrency: false }, () => {
  let directory = "";
  let gatedUrl = "";
  let openUrl = "";
  let closeGated: () => Promise<void> = async () => undefined;
  let closeOpen: () => Promise<void> = async () => undefined;

  after(async () => {
    await closeGated();
    await closeOpen();
    await closeDatabase();
    if (directory) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("GET /health stays public and does not open a database", async () => {
    directory = await clientDirectory();
    assert.throws(() => getDatabase(), /Database is not open/);

    const gated = await listen(
      createApp({
        clientDist: directory,
        env: { NODE_ENV: "production", APP_PASSWORD: password },
      }),
    );
    gatedUrl = gated.url;
    closeGated = gated.close;

    const response = await fetch(`${gatedUrl}/health`);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
    assert.equal(response.headers.get("www-authenticate"), null);
    assert.throws(() => getDatabase(), /Database is not open/);
  });

  test("development startup without APP_PASSWORD still serves the local API", async () => {
    await openTestDatabase();
    const open = await listen(
      createApp({
        clientDist: directory,
        env: { NODE_ENV: "development" },
      }),
    );
    openUrl = open.url;
    closeOpen = open.close;

    const response = await fetch(`${openUrl}/api/players`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("www-authenticate"), null);
    assert.deepEqual(await response.json(), { players: [] });
  });

  test("an unauthenticated request for / and /api/players receives 401", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args: unknown[]) => {
      logs.push(args.map((arg) => String(arg)).join(" "));
    };
    console.error = (...args: unknown[]) => {
      logs.push(args.map((arg) => String(arg)).join(" "));
    };

    try {
      const shell = await fetch(`${gatedUrl}/`);
      const players = await fetch(`${gatedUrl}/api/players`, {
        headers: { Authorization: "Bearer secret-token" },
      });

      assert.equal(shell.status, 401);
      assert.equal(shell.headers.get("www-authenticate"), 'Basic realm="Poker Tracker"');
      assert.equal(players.status, 401);
      assert.equal(players.headers.get("www-authenticate"), 'Basic realm="Poker Tracker"');
      assert.equal(players.headers.get("cache-control"), "no-store");
      assert.equal(logs.some((line) => /authorization/i.test(line) || line.includes(password)), false);
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });

  test("the correct Basic credentials can load the shell and call the API", async () => {
    const headers = { Authorization: basic("operator", password) };
    const shell = await fetch(`${gatedUrl}/`, { headers });
    const history = await fetch(`${gatedUrl}/history`, { headers });
    const asset = await fetch(`${gatedUrl}/assets/app.js`, { headers });
    const players = await fetch(`${gatedUrl}/api/players`, { headers });

    assert.equal(shell.status, 200);
    assert.match(await shell.text(), /מעקב פוקר/);
    assert.equal(shell.headers.get("cache-control"), "no-store");
    assert.equal(history.status, 200);
    assert.equal(history.headers.get("cache-control"), "no-store");
    assert.equal(asset.status, 200);
    assert.notEqual(asset.headers.get("cache-control"), "no-store");
    assert.equal(players.status, 200);
    assert.equal(players.headers.get("cache-control"), "no-store");
    assert.deepEqual(await players.json(), { players: [] });

    const rejected = await fetch(`${gatedUrl}/api/players`, {
      headers: { Authorization: basic("operator", "wrong-password") },
    });
    assert.equal(rejected.status, 401);
    assert.equal(rejected.headers.get("www-authenticate"), 'Basic realm="Poker Tracker"');
  });
});
