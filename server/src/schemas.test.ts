import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { ApiError } from "./http/errors.js";
import {
  parse,
  playerCreateRequest,
  sessionCreateRequest,
  sessionId,
  sessionListQuery,
  transactionInput,
} from "./schemas.js";

const validTransaction = {
  id: "tx-001",
  playerId: "player-001",
  type: "buy-in",
  amount: 50,
  timestamp: "2026-11-12T18:15:00Z",
};

function rejects(value: unknown, schema: z.ZodType = transactionInput): void {
  assert.throws(
    () => parse(schema, value),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.equal(error.message, "Invalid request");
      return true;
    },
  );
}

test("normalizes a player name by trimming and collapsing whitespace", () => {
  assert.deepEqual(parse(playerCreateRequest, { name: "  Dana   Levi  " }), {
    name: "Dana Levi",
  });
});

test("rejects a whitespace-only player name", () => {
  rejects({ name: " \t\n " }, playerCreateRequest);
});

test("checks player name length after normalization", () => {
  assert.deepEqual(parse(playerCreateRequest, { name: `${"a".repeat(80)} ` }), {
    name: "a".repeat(80),
  });
  rejects({ name: "a".repeat(81) }, playerCreateRequest);
});

test("rejects unknown fields", () => {
  rejects({ name: "Dana", nickname: "D" }, playerCreateRequest);
  rejects({ ...validTransaction, note: "extra" });
});

test("accepts identifiers that match the shared pattern", () => {
  assert.equal(parse(sessionId, "session-001"), "session-001");
  assert.equal(parse(sessionId, "6f0c8f4e-2d7a-4f7a-9c1e-0a8f5d6b7c11"), "6f0c8f4e-2d7a-4f7a-9c1e-0a8f5d6b7c11");
});

test("rejects bad identifiers", () => {
  rejects("", sessionId);
  rejects("bad id", sessionId);
  rejects("a".repeat(65), sessionId);
  rejects("id/slash", sessionId);
});

test("accepts real calendar dates and rejects impossible ones", () => {
  const session = {
    id: "session-001",
    date: "2024-02-29",
    transactions: [],
  };
  assert.equal(parse(sessionCreateRequest, session).date, "2024-02-29");

  rejects({ ...session, date: "2023-02-29" }, sessionCreateRequest);
  rejects({ ...session, date: "2026-02-31" }, sessionCreateRequest);
  rejects({ ...session, date: "2026-13-01" }, sessionCreateRequest);
  rejects({ ...session, date: "2026-11-00" }, sessionCreateRequest);
  rejects({ ...session, date: "11/12/2026" }, sessionCreateRequest);
});

test("accepts timestamps with Z or a numeric offset", () => {
  assert.equal(parse(transactionInput, validTransaction).timestamp, "2026-11-12T18:15:00Z");
  assert.equal(
    parse(transactionInput, { ...validTransaction, timestamp: "2026-11-12T18:15:00.123Z" }).timestamp,
    "2026-11-12T18:15:00.123Z",
  );
  assert.equal(
    parse(transactionInput, { ...validTransaction, timestamp: "2026-11-12T18:15:00+02:00" }).timestamp,
    "2026-11-12T18:15:00+02:00",
  );
  assert.equal(
    parse(transactionInput, { ...validTransaction, timestamp: "2026-11-12T18:15:00-05:30" }).timestamp,
    "2026-11-12T18:15:00-05:30",
  );
});

test("rejects timestamps without a timezone and impossible clock times", () => {
  rejects({ ...validTransaction, timestamp: "2026-11-12T18:15:00" });
  rejects({ ...validTransaction, timestamp: "2026-11-12T18:15:00z" });
  rejects({ ...validTransaction, timestamp: "2026-11-12T18:15:00+0000" });
  rejects({ ...validTransaction, timestamp: "2026-11-12T18:15:00 EST" });
  rejects({ ...validTransaction, timestamp: "2026-11-12T25:00:00Z" });
  rejects({ ...validTransaction, timestamp: "2026-11-12T18:15:60Z" });
  rejects({ ...validTransaction, timestamp: "2026-02-31T00:00:00Z" });
  rejects({ ...validTransaction, timestamp: "2026-11-12T18:15:00+24:00" });
});

test("rejects non-positive and non-integer amounts", () => {
  assert.equal(parse(transactionInput, validTransaction).amount, 50);
  rejects({ ...validTransaction, amount: 0 });
  rejects({ ...validTransaction, amount: -1 });
  rejects({ ...validTransaction, amount: 1.5 });
  rejects({ ...validTransaction, amount: "50" });
});

test("rejects an unsupported transaction type", () => {
  rejects({ ...validTransaction, type: "win" });
});

test("rejects a date range whose start is after its end", () => {
  assert.deepEqual(parse(sessionListQuery, { from: "2026-11-01", to: "2026-11-12" }), {
    from: "2026-11-01",
    to: "2026-11-12",
  });
  assert.deepEqual(parse(sessionListQuery, {}), {});
  rejects({ from: "2026-11-12", to: "2026-11-01" }, sessionListQuery);
  rejects({ from: "2026-02-31" }, sessionListQuery);
  rejects({ from: "2026-11-01", extra: "no" }, sessionListQuery);
});
