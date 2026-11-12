import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import express, { type Express } from "express";
import { createApp } from "../app.js";
import { conflict, errorHandler, notFound } from "./errors.js";
import { parse, playerCreateRequest, sessionCreateRequest } from "../schemas.js";

const validTransaction = {
  id: "tx-001",
  playerId: "player-001",
  type: "buy-in",
  amount: 50,
  timestamp: "2026-11-12T18:15:00Z",
};

function validationApp(): Express {
  const app = express();
  app.use(express.json());

  app.post("/api/players", (req, res) => {
    res.status(201).json(parse(playerCreateRequest, req.body));
  });

  app.post("/api/sessions", (req, res) => {
    res.status(201).json(parse(sessionCreateRequest, req.body));
  });

  app.get("/api/missing", () => {
    throw notFound("Session not found");
  });

  app.post("/api/conflict", () => {
    throw conflict("Session already exists with different content");
  });

  app.get("/api/boom", () => {
    throw new Error("SELECT * FROM secret");
  });

  app.get("/api/syntax", () => {
    throw new SyntaxError("SELECT * FROM secret");
  });

  app.use(errorHandler);
  return app;
}

async function listen(app: Express): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected a TCP address");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

let appUrl = "";
let validationUrl = "";
let closeServers: Array<() => Promise<void>> = [];

before(async () => {
  const appServer = await listen(createApp());
  const validationServer = await listen(validationApp());
  appUrl = appServer.url;
  validationUrl = validationServer.url;
  closeServers = [appServer.close, validationServer.close];
});

after(async () => {
  await Promise.all(closeServers.map((close) => close()));
});

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function errorBody(response: Response): Promise<{ error: { code: string; message: string } }> {
  return (await response.json()) as { error: { code: string; message: string } };
}

test("invalid JSON produces VALIDATION_ERROR", async () => {
  const logged: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };

  try {
    const response = await fetch(`${appUrl}/api/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await errorBody(response), {
      error: { code: "VALIDATION_ERROR", message: "Invalid JSON" },
    });
    assert.deepEqual(logged, []);
  } finally {
    console.error = original;
  }
});

test("an unknown API path still returns NOT_FOUND", async () => {
  const response = await fetch(`${appUrl}/api/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await errorBody(response), {
    error: { code: "NOT_FOUND", message: "Not found" },
  });
});

test("unknown fields, bad ids, and bad dates produce 400", async () => {
  const unknownField = await postJson(`${validationUrl}/api/players`, {
    name: "Dana",
    nickname: "D",
  });
  assert.equal(unknownField.status, 400);
  assert.equal((await errorBody(unknownField)).error.code, "VALIDATION_ERROR");

  const badId = await postJson(`${validationUrl}/api/sessions`, {
    id: "bad id",
    date: "2026-11-12",
    transactions: [],
  });
  assert.equal(badId.status, 400);
  assert.equal((await errorBody(badId)).error.code, "VALIDATION_ERROR");

  const badDate = await postJson(`${validationUrl}/api/sessions`, {
    id: "session-001",
    date: "2026-02-31",
    transactions: [],
  });
  assert.equal(badDate.status, 400);
  assert.equal((await errorBody(badDate)).error.code, "VALIDATION_ERROR");
});

test("a timestamp without a timezone produces 400", async () => {
  const response = await postJson(`${validationUrl}/api/sessions`, {
    id: "session-001",
    date: "2026-11-12",
    transactions: [{ ...validTransaction, timestamp: "2026-11-12T18:15:00" }],
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await errorBody(response), {
    error: { code: "VALIDATION_ERROR", message: "Invalid request" },
  });
});

test("amounts of 0, negative numbers, and decimals produce 400", async () => {
  for (const amount of [0, -5, 1.5]) {
    const response = await postJson(`${validationUrl}/api/sessions`, {
      id: "session-001",
      date: "2026-11-12",
      transactions: [{ ...validTransaction, amount }],
    });
    assert.equal(response.status, 400);
    assert.equal((await errorBody(response)).error.code, "VALIDATION_ERROR");
  }
});

test("a padded player name is normalized", async () => {
  const response = await postJson(`${validationUrl}/api/players`, { name: "  Dana   Levi  " });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { name: "Dana Levi" });
});

test("a whitespace-only name produces 400", async () => {
  const response = await postJson(`${validationUrl}/api/players`, { name: "   " });
  assert.equal(response.status, 400);
  assert.deepEqual(await errorBody(response), {
    error: { code: "VALIDATION_ERROR", message: "Invalid request" },
  });
});

test("NOT_FOUND and CONFLICT keep their status and code", async () => {
  const missing = await fetch(`${validationUrl}/api/missing`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await errorBody(missing), {
    error: { code: "NOT_FOUND", message: "Session not found" },
  });

  const conflicting = await fetch(`${validationUrl}/api/conflict`, { method: "POST" });
  assert.equal(conflicting.status, 409);
  assert.deepEqual(await errorBody(conflicting), {
    error: { code: "CONFLICT", message: "Session already exists with different content" },
  });
});

test("an unexpected thrown error returns INTERNAL_ERROR without internal details", async () => {
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };

  try {
    const response = await fetch(`${validationUrl}/api/boom`);
    const body = await errorBody(response);
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
    });
    assert.equal(serialized.includes("SELECT"), false);
    assert.equal(serialized.includes("secret"), false);
    assert.equal(serialized.includes("Error:"), false);
    assert.equal(logged.length, 1);
    assert.match(String(logged[0]?.[0]), /SELECT \* FROM secret/);
  } finally {
    console.error = original;
  }
});

test("a SyntaxError from application code stays an internal error", async () => {
  const original = console.error;
  console.error = () => undefined;

  try {
    const response = await fetch(`${validationUrl}/api/syntax`);
    assert.equal(response.status, 500);
    assert.deepEqual(await errorBody(response), {
      error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
    });
  } finally {
    console.error = original;
  }
});
