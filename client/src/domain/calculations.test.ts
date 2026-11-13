import assert from "node:assert/strict";
import test from "node:test";
import { calculateSessionResult, rankOverallResults } from "./calculations.ts";
import type { Player, Session, Transaction } from "./models.ts";

const createdAt = "2026-11-12T21:00:00Z";

function transaction(overrides: Partial<Transaction> & Pick<Transaction, "id" | "playerId" | "type" | "amount">): Transaction {
  return {
    sessionId: "session-001",
    timestamp: "2026-11-12T18:15:00Z",
    ...overrides,
  };
}

function session(id: string, transactions: Transaction[]): Session {
  return {
    id,
    date: "2026-11-12",
    createdAt,
    transactions,
  };
}

const players: Player[] = [
  { id: "avi", name: "אבי", createdAt },
  { id: "dana", name: "דנה", createdAt },
  { id: "noam", name: "נועם", createdAt },
  { id: "absent", name: "גל", createdAt },
];

test("buy-ins and rebuys combine, and net result is cash-outs minus that total", () => {
  const result = calculateSessionResult(
    session("session-001", [
      transaction({ id: "tx-1", playerId: "avi", type: "buy-in", amount: 100 }),
      transaction({ id: "tx-2", playerId: "avi", type: "rebuy", amount: 50 }),
      transaction({ id: "tx-3", playerId: "avi", type: "cash-out", amount: 200 }),
    ]),
  );

  assert.deepEqual(result.players, [
    { playerId: "avi", totalBuyIns: 150, totalCashOuts: 200, netResult: 50 },
  ]);
});

test("session balance equals the sum of player nets and stays non-zero", () => {
  const result = calculateSessionResult(
    session("session-001", [
      transaction({ id: "tx-1", playerId: "avi", type: "buy-in", amount: 100 }),
      transaction({ id: "tx-2", playerId: "avi", type: "rebuy", amount: 50 }),
      transaction({ id: "tx-3", playerId: "avi", type: "cash-out", amount: 200 }),
      transaction({ id: "tx-4", playerId: "dana", type: "buy-in", amount: 100 }),
    ]),
  );

  assert.equal(result.sessionBuyIns, 250);
  assert.equal(result.sessionCashOuts, 200);
  assert.equal(result.sessionBalance, -50);
  assert.equal(
    result.players.reduce((sum, player) => sum + player.netResult, 0),
    result.sessionBalance,
  );
  assert.notEqual(result.sessionBalance, 0);
});

test("players with no transactions do not appear in that session's results", () => {
  const result = calculateSessionResult(
    session("session-001", [transaction({ id: "tx-1", playerId: "avi", type: "buy-in", amount: 100 })]),
  );
  const present = new Set(result.players.map((player) => player.playerId));

  assert.equal(present.has("avi"), true);
  assert.equal(present.has("absent"), false);
  assert.equal(result.players.length, 1);
});

test("overall results sum per-session nets and rank from highest to lowest", () => {
  const ranked = rankOverallResults(
    [
      session("session-001", [
        transaction({ id: "tx-1", playerId: "avi", type: "buy-in", amount: 100 }),
        transaction({ id: "tx-2", playerId: "dana", type: "cash-out", amount: 40 }),
        transaction({ id: "tx-3", playerId: "noam", type: "buy-in", amount: 20 }),
      ]),
      session("session-002", [
        transaction({ id: "tx-4", sessionId: "session-002", playerId: "avi", type: "cash-out", amount: 30 }),
        transaction({ id: "tx-5", sessionId: "session-002", playerId: "dana", type: "buy-in", amount: 10 }),
        transaction({ id: "tx-6", sessionId: "session-002", playerId: "noam", type: "cash-out", amount: 20 }),
      ]),
    ],
    players,
  );

  assert.deepEqual(
    ranked.map((player) => [player.playerId, player.netResult]),
    [
      ["dana", 30],
      ["noam", 0],
      ["avi", -70],
    ],
  );
});

test("ranking ties are broken by player name using Hebrew locale comparison", () => {
  const ranked = rankOverallResults(
    [
      session("session-001", [
        transaction({ id: "tx-1", playerId: "dana", type: "cash-out", amount: 10 }),
        transaction({ id: "tx-2", playerId: "avi", type: "cash-out", amount: 10 }),
      ]),
    ],
    players,
  );

  assert.deepEqual(
    ranked.map((player) => player.name),
    ["אבי", "דנה"],
  );
});
