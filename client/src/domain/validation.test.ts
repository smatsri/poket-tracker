import assert from "node:assert/strict";
import test from "node:test";
import { DomainValidationError } from "./errors.ts";
import { validateSession, validateTransaction } from "./validation.ts";

const validTransaction = {
  id: "tx-001",
  sessionId: "session-001",
  playerId: "player-001",
  type: "buy-in",
  amount: 50,
  timestamp: "2026-11-12T18:15:00Z",
};

const validSession = {
  id: "session-001",
  date: "2026-11-12",
  createdAt: "2026-11-12T21:00:00Z",
  transactions: [validTransaction],
};

function rejects(value: unknown, validate: (input: unknown) => unknown = validateTransaction): void {
  assert.throws(
    () => validate(value),
    (error: unknown) => error instanceof DomainValidationError,
  );
}

test("accepts a transaction and a session whose ids match", () => {
  assert.deepEqual(validateTransaction(validTransaction), validTransaction);
  assert.deepEqual(validateSession(validSession), validSession);
});

test("rejects missing fields", () => {
  rejects({});
  rejects({ ...validTransaction, amount: undefined });
  rejects({ ...validSession, date: undefined }, validateSession);
  rejects({ ...validSession, transactions: undefined }, validateSession);
});

test("rejects zero, negative, and decimal amounts", () => {
  rejects({ ...validTransaction, amount: 0 });
  rejects({ ...validTransaction, amount: -1 });
  rejects({ ...validTransaction, amount: 1.5 });
  rejects({ ...validTransaction, amount: "50" });
});

test("rejects bad timestamps, dates, ids, and transaction types", () => {
  rejects({ ...validTransaction, timestamp: "2026-11-12T18:15:00" });
  rejects({ ...validTransaction, timestamp: "2026-11-12T25:00:00Z" });
  rejects({ ...validTransaction, id: "bad id" });
  rejects({ ...validTransaction, type: "win" });
  rejects({ ...validSession, date: "2026-11-12T00:00:00Z" }, validateSession);
  rejects({ ...validSession, date: "2023-02-29" }, validateSession);
  rejects({ ...validSession, date: "11/12/2026" }, validateSession);
});

test("rejects a transaction whose session id differs from its parent", () => {
  rejects(
    {
      ...validSession,
      transactions: [{ ...validTransaction, sessionId: "session-999" }],
    },
    validateSession,
  );
});
