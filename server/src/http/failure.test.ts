import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import type { Express } from "express";
import { createApp } from "../app.js";
import { injectFailure } from "./failure.js";

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

test("an unexpected failure on the app returns INTERNAL_ERROR without internal details", async () => {
  const server = await listen(createApp());
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };

  try {
    injectFailure(new Error("SELECT * FROM secret"));
    const response = await fetch(`${server.url}/api/players`);
    const body: unknown = await response.json();
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
    await server.close();
  }
});
