import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SessionDocument } from "../../data/api/client.ts";
import { ApiRequestError, networkError } from "../../data/api/errors.ts";
import { calculatePlayerResults, calculateSessionResult } from "../../domain/calculations.ts";
import { formatResult } from "../../domain/format.ts";
import type { Player, Transaction, TransactionType } from "../../domain/models.ts";
import { parseHistoryLocation, sessionPlayerPath, sessionTransactionsPath } from "./sessionHistory.ts";
import {
  loadSessionSummary,
  presentSessionPlayer,
  presentSessionSummary,
  presentSummaryFailure,
  summaryCopy,
} from "./sessionSummary.ts";

const dana: Player = { id: "p1", name: "דנה", createdAt: "2026-11-13T18:00:00Z" };
const noa: Player = { id: "p2", name: "נועה", createdAt: "2026-11-13T18:00:00Z" };
const roi: Player = { id: "p3", name: "רועי", createdAt: "2026-11-13T18:00:00Z" };

function transaction(id: string, playerId: string, type: TransactionType, amount: number, timestamp: string): Transaction {
  return { id, sessionId: "session-1", playerId, type, amount, timestamp };
}

const transactions = [
  transaction("t1", "p1", "buy-in", 100, "2026-11-13T18:00:00Z"),
  transaction("t2", "p1", "rebuy", 50, "2026-11-13T19:00:00Z"),
  transaction("t3", "p2", "buy-in", 40, "2026-11-13T19:30:00Z"),
  transaction("t4", "p2", "cash-out", 90, "2026-11-13T20:00:00Z"),
  transaction("t5", "p3", "buy-in", 20, "2026-11-13T20:30:00Z"),
  transaction("t6", "p3", "cash-out", 20, "2026-11-13T21:00:00Z"),
];

const document: SessionDocument = {
  session: { id: "session-1", date: "2026-11-13", createdAt: "2026-11-13T22:00:00Z", transactions },
  players: [dana, noa, roi, dana],
};

test("summary totals and player results come from the client formulas", () => {
  const view = presentSessionSummary(document);
  const result = calculateSessionResult(document.session);
  assert.equal(view.canChange, false);
  assert.equal(view.totalBuyIns, new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(result.sessionBuyIns));
  assert.equal(view.totalCashOuts, new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(result.sessionCashOuts));
  assert.equal(view.balance.value, result.sessionBalance);
  assert.equal(view.balance.text, formatResult(result.sessionBalance));
  assert.equal(view.playerCount, 3);
  assert.equal(view.transactionCount, transactions.length);
  assert.equal(view.transactionsHref, sessionTransactionsPath("session-1"));
  assert.equal(view.transactions.length, transactions.length);
  assert.deepEqual(
    view.transactions.map((item) => item.id),
    ["t6", "t5", "t4", "t3", "t2", "t1"],
  );

  const expected = calculatePlayerResults(transactions);
  assert.deepEqual(
    view.players.map((player) => [player.playerId, player.name, player.net.value, player.net.text, player.net.tone, player.href]),
    expected.map((player) => {
      const name = [dana, noa, roi].find((item) => item.id === player.playerId)?.name;
      const tone = player.netResult > 0 ? "positive" : player.netResult < 0 ? "negative" : "neutral";
      return [player.playerId, name, player.netResult, formatResult(player.netResult), tone, sessionPlayerPath("session-1", player.playerId)];
    }),
  );
  assert.equal(view.players.find((player) => player.playerId === "p1")?.net.tone, "negative");
  assert.equal(view.players.find((player) => player.playerId === "p2")?.net.tone, "positive");
  assert.equal(view.players.find((player) => player.playerId === "p3")?.net.tone, "neutral");
  assert.match(view.players.find((player) => player.playerId === "p2")?.net.text ?? "", /^\+/);
  assert.match(view.players.find((player) => player.playerId === "p1")?.net.text ?? "", /^−/);
  assert.equal(view.players.find((player) => player.playerId === "p3")?.net.text, "0");
});

test("a player page lists only that player's transactions and stays read-only", () => {
  const player = presentSessionPlayer(document, "p1");
  assert.ok(player !== null);
  if (player === null) {
    return;
  }

  assert.equal(player.canChange, false);
  assert.equal(player.name, "דנה");
  assert.deepEqual(
    player.transactions.map((item) => item.id),
    ["t2", "t1"],
  );
  assert.equal(presentSessionPlayer(document, "missing"), null);
});

test("an unknown session is not found and other load failures can return to history", () => {
  const missing = presentSummaryFailure(new ApiRequestError("Session not found", 404, "NOT_FOUND", "http"));
  assert.equal(missing.status, "not-found");
  assert.equal(missing.message, summaryCopy.notFound);
  assert.equal(missing.backHref, "/history");

  const offline = presentSummaryFailure(networkError("offline"));
  assert.equal(offline.status, "error");
  if (offline.status !== "error") {
    return;
  }
  assert.match(offline.message, /אין חיבור/);
  assert.equal(offline.canRetry, true);
  assert.equal(offline.backHref, "/history");
});

test("summary routes open the transaction history and one player, including a direct visit", () => {
  assert.deepEqual(parseHistoryLocation("/history/session-1"), { screen: "summary", sessionId: "session-1", playerId: null });
  assert.deepEqual(parseHistoryLocation("/history/session-1/transactions"), {
    screen: "transactions",
    sessionId: "session-1",
    playerId: null,
  });
  assert.deepEqual(parseHistoryLocation("/history/session-1/players/p1"), { screen: "player", sessionId: "session-1", playerId: "p1" });
});

test("loading a summary reads that session and the screen does not offer changes", async () => {
  let requested = "";
  const loaded = await loadSessionSummary(
    {
      getSession: async (sessionId) => {
        requested = sessionId;
        return document;
      },
    },
    "session-1",
  );
  assert.equal(requested, "session-1");
  assert.equal(loaded.session.id, "session-1");

  const screen = readFileSync(new URL("./HistoryScreen.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(screen, /עריכה|מחיקה|שליח|submitEvening|deleteTransaction|updateTransaction|addTransaction|startEvening/);
  assert.match(screen, /loadSessionSummary/);
  assert.match(screen, /כל הפעולות|summaryCopy.transactions/);
});
