import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { Session } from "../../domain/models.ts";
import { createApiClient } from "./client.ts";
import { ApiRequestError } from "./errors.ts";

const baseUrl = "http://localhost:3001";
const createdAt = "2026-11-12T22:00:00Z";

const session: Session = {
  id: "session-001",
  date: "2026-11-12",
  createdAt,
  transactions: [
    {
      id: "tx-001",
      sessionId: "session-001",
      playerId: "player-001",
      type: "buy-in",
      amount: 50,
      timestamp: "2026-11-12T18:15:00Z",
    },
  ],
};

const wireSession = {
  id: "session-001",
  date: "2026-11-12",
  createdAt,
  transactions: [
    {
      id: "tx-001",
      playerId: "player-001",
      type: "buy-in",
      amount: 50,
      timestamp: "2026-11-12T18:15:00Z",
    },
  ],
  players: [{ id: "player-001", name: "אבי", createdAt }],
};

test("each contract operation calls fetch with only the write-schema fields", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const client = createApiClient(baseUrl, async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    const path = String(url);
    if (path.endsWith("/api/players") && init?.method === "POST") {
      return json(201, { id: "player-001", name: "אבי", createdAt });
    }
    if (path.endsWith("/api/players")) {
      return json(200, { players: [{ id: "player-001", name: "אבי", createdAt }] });
    }
    if (path.endsWith("/api/sessions/session-001")) {
      return json(200, wireSession);
    }
    if (path.includes("/api/sessions?")) {
      return json(200, { sessions: [wireSession] });
    }
    return json(201, wireSession);
  });

  assert.deepEqual(await client.listPlayers(), [{ id: "player-001", name: "אבי", createdAt }]);
  assert.deepEqual(await client.createPlayer("  אבי  "), { id: "player-001", name: "אבי", createdAt });
  const submitted = await client.submitSession(session);
  assert.equal(submitted.status, 201);
  assert.equal(submitted.session.transactions[0]?.sessionId, "session-001");
  assert.deepEqual(await client.getSession("session-001"), {
    session,
    players: wireSession.players,
  });
  assert.equal((await client.listSessions({ from: "2026-11-01", to: "2026-11-12" })).length, 1);

  assert.deepEqual(
    calls.map((call) => call.url),
    [
      `${baseUrl}/api/players`,
      `${baseUrl}/api/players`,
      `${baseUrl}/api/sessions`,
      `${baseUrl}/api/sessions/session-001`,
      `${baseUrl}/api/sessions?from=2026-11-01&to=2026-11-12`,
    ],
  );
  assert.deepEqual(JSON.parse(String(calls[1]?.init.body)), { name: "  אבי  " });
  assert.deepEqual(JSON.parse(String(calls[2]?.init.body)), {
    id: "session-001",
    date: "2026-11-12",
    transactions: [
      {
        id: "tx-001",
        playerId: "player-001",
        type: "buy-in",
        amount: 50,
        timestamp: "2026-11-12T18:15:00Z",
      },
    ],
  });
  assert.equal(header(calls[0]?.init, "content-type"), undefined);
  assert.equal(header(calls[2]?.init, "content-type"), "application/json");
  assert.equal(header(calls[2]?.init, "accept"), "application/json");
});

test("network failure and abort are distinguishable from HTTP statuses", async () => {
  const offline = createApiClient(baseUrl, async () => {
    throw new TypeError("Failed to fetch");
  });
  const aborted = createApiClient(baseUrl, async () => {
    throw new DOMException("The operation was aborted", "AbortError");
  });

  const network = await rejected(offline.listPlayers());
  const abort = await rejected(aborted.getSession("session-001"));
  assert.equal(network.kind, "network");
  assert.equal(network.status, null);
  assert.equal(network.message, "Failed to fetch");
  assert.equal(abort.kind, "network");
  assert.match(abort.message, /aborted/);
});

test("400, 404, 409, and 500 preserve status, code, and message", async () => {
  const cases = [
    { status: 400, code: "VALIDATION_ERROR", message: "Invalid session data" },
    { status: 404, code: "NOT_FOUND", message: "Session not found" },
    { status: 409, code: "CONFLICT", message: "Session already exists with different content" },
    { status: 500, code: "INTERNAL_ERROR", message: "Unexpected server error" },
  ] as const;

  for (const item of cases) {
    const client = createApiClient(baseUrl, async (_url, init) => {
      assert.equal(JSON.parse(String(init?.body)).id, "session-001");
      return json(item.status, { error: { code: item.code, message: item.message } });
    });
    const error = await rejected(client.submitSession(session));
    assert.equal(error.kind, "http");
    assert.equal(error.status, item.status);
    assert.equal(error.code, item.code);
    assert.equal(error.message, item.message);
    assert.equal("sessionId" in error, false);
  }
});

test("an unexpected response is distinct from a classified HTTP error", async () => {
  const client = createApiClient(baseUrl, async () => json(418, { teapot: true }, "I'm a teapot"));
  const error = await rejected(client.listPlayers());
  assert.equal(error.kind, "unexpected");
  assert.equal(error.status, 418);

  const malformed = createApiClient(baseUrl, async () => json(200, { players: [{ id: "bad id", name: "אבי", createdAt }] }));
  const invalid = await rejected(malformed.listPlayers());
  assert.equal(invalid.kind, "unexpected");
});

test("only the API layer calls fetch", () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const files = sourceFiles(sourceRoot).filter((file) => !relative(sourceRoot, file).startsWith(`data${separator()}api`));
  for (const file of files) {
    assert.equal(/\bfetch\s*\(/.test(readFileSync(file, "utf8")), false, relative(sourceRoot, file));
  }
});

function json(status: number, body: unknown, statusText = ""): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "content-type": "application/json" },
  });
}

function header(init: RequestInit | undefined, name: string): string | undefined {
  const headers = init?.headers;
  if (headers === undefined || headers instanceof Headers || Array.isArray(headers)) {
    return undefined;
  }
  return headers[name];
}

async function rejected(promise: Promise<unknown>): Promise<ApiRequestError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof ApiRequestError);
    return error;
  }
  assert.fail("expected the request to fail");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return name.endsWith(".ts") || name.endsWith(".tsx") ? [path] : [];
  });
}

function separator(): string {
  return join("a", "b").slice(1, -1);
}
