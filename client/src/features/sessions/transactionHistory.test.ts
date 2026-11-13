import assert from "node:assert/strict";
import test from "node:test";
import type { Player, Transaction, TransactionType } from "../../domain/models.ts";
import { historyAccess, presentTransactionHistory } from "./transactionHistory.ts";

const cache: Player[] = [
  { id: "p1", name: "דנה", createdAt: "2026-11-13T18:00:00Z" },
  { id: "p2", name: "נועה", createdAt: "2026-11-13T18:00:00Z" },
];

const sessionPlayers: Player[] = [
  { id: "p1", name: "דנה מהשרת", createdAt: "2026-11-13T18:00:00Z" },
  { id: "p2", name: "נועה מהשרת", createdAt: "2026-11-13T18:00:00Z" },
];

function transaction(id: string, playerId: string, type: TransactionType, amount: number, timestamp: string): Transaction {
  return { id, sessionId: "session-1", playerId, type, amount, timestamp };
}

const transactions = [
  transaction("t1", "p1", "buy-in", 100, "2026-11-13T18:00:00Z"),
  transaction("t2", "p1", "rebuy", 50, "2026-11-13T19:00:00Z"),
  transaction("t3", "missing", "cash-out", 80, "2026-11-13T19:00:00Z"),
  transaction("t4", "p2", "cash-out", 20, "2026-11-13T21:00:00Z"),
];

test("all transactions are visible newest first, and a missing name shows the player id", () => {
  const history = presentTransactionHistory({ date: "2026-11-13", transactions }, cache, "draft");

  assert.deepEqual(
    history.transactions.map((item) => item.id),
    ["t4", "t3", "t2", "t1"],
  );
  assert.equal(history.transactions[0]?.playerName, "נועה");
  assert.equal(history.transactions[0]?.typeLabel, "יציאה");
  assert.equal(history.transactions[0]?.amount, "20");
  assert.equal(history.transactions[1]?.playerName, "missing");
  assert.equal(history.transactions[1]?.typeLabel, "יציאה");
  assert.equal(history.canCorrect, true);
  assert.notEqual(history.date, "");
});

test("a reviewed session uses its own players and cannot change a transaction", () => {
  const history = presentTransactionHistory({ date: "2026-11-13", transactions }, sessionPlayers, historyAccess("submitted"));

  assert.equal(history.canCorrect, false);
  assert.equal(historyAccess("pending"), "readonly");
  assert.equal(history.transactions.find((item) => item.id === "t4")?.playerName, "נועה מהשרת");
  assert.equal(history.transactions.find((item) => item.playerId === "missing")?.playerName, "missing");
});

test("an empty session has an empty transaction list", () => {
  const history = presentTransactionHistory({ date: "2026-11-13", transactions: [] }, cache, "draft");

  assert.deepEqual(history.transactions, []);
  assert.equal(history.canCorrect, true);
});
