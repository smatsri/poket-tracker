import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { networkError } from "../../data/api/errors.ts";
import type { SessionDocument } from "../../data/api/client.ts";
import { calculateSessionResult } from "../../domain/calculations.ts";
import { formatResult } from "../../domain/format.ts";
import type { Player, Transaction, TransactionType } from "../../domain/models.ts";
import { matchRoute } from "../../app/routes.ts";
import {
  historyCopy,
  loadSessionHistory,
  parseHistoryLocation,
  presentHistoryFailure,
  presentSessionHistory,
  sessionSummaryPath,
} from "./sessionHistory.ts";

const dana: Player = { id: "p1", name: "דנה", createdAt: "2026-11-01T18:00:00Z" };
const noa: Player = { id: "p2", name: "נועה", createdAt: "2026-11-01T18:00:00Z" };

function transaction(sessionId: string, id: string, playerId: string, type: TransactionType, amount: number): Transaction {
  return { id, sessionId, playerId, type, amount, timestamp: "2026-11-13T20:00:00Z" };
}

function document(
  id: string,
  date: string,
  createdAt: string,
  players: Player[],
  transactions: Transaction[],
): SessionDocument {
  return { session: { id, date, createdAt, transactions }, players };
}

test("completed sessions are newest first and show date, players, transactions, and the session balance", () => {
  const older = document("session-a", "2026-11-12", "2026-11-12T22:00:00Z", [dana], [
    transaction("session-a", "a1", "p1", "buy-in", 100),
    transaction("session-a", "a2", "p1", "cash-out", 40),
  ]);
  const newerSameDay = document("session-b", "2026-11-13", "2026-11-13T23:00:00Z", [dana, noa], [
    transaction("session-b", "b1", "p1", "buy-in", 50),
    transaction("session-b", "b2", "p2", "cash-out", 80),
  ]);
  const earlierSameDay = document("session-c", "2026-11-13", "2026-11-13T18:00:00Z", [dana, dana], [
    transaction("session-c", "c1", "p1", "buy-in", 10),
    transaction("session-c", "c2", "p1", "rebuy", 10),
    transaction("session-c", "c3", "p1", "cash-out", 20),
  ]);
  const tied = document("session-d", "2026-11-13", "2026-11-13T23:00:00Z", [noa], [
    transaction("session-d", "d1", "p2", "cash-out", 5),
  ]);

  const view = presentSessionHistory([older, earlierSameDay, newerSameDay, tied]);
  assert.equal(view.status, "ready");
  assert.deepEqual(
    view.entries.map((entry) => entry.id),
    ["session-d", "session-b", "session-c", "session-a"],
  );

  const newest = view.entries[0];
  assert.ok(newest !== undefined);
  const balance = calculateSessionResult(tied.session).sessionBalance;
  assert.equal(newest.date.includes("2026") || newest.date.includes("13"), true);
  assert.equal(newest.playerCount, 1);
  assert.equal(newest.transactionCount, 1);
  assert.equal(newest.playersLabel, "שחקנים: 1");
  assert.equal(newest.transactionsLabel, "פעולות: 1");
  assert.equal(newest.result.value, balance);
  assert.equal(newest.result.text, formatResult(balance));
  assert.equal(newest.result.tone, "positive");
  assert.equal(newest.href, sessionSummaryPath("session-d"));

  const balanced = view.entries[2];
  assert.ok(balanced !== undefined);
  assert.equal(balanced.playerCount, 1);
  assert.equal(balanced.transactionCount, 3);
  assert.equal(balanced.result.text, formatResult(0));
  assert.equal(balanced.result.tone, "neutral");

  const loss = view.entries[3];
  assert.ok(loss !== undefined);
  assert.equal(loss.result.text, formatResult(calculateSessionResult(older.session).sessionBalance));
  assert.equal(loss.result.tone, "negative");
});

test("no sessions produces the Hebrew empty state", () => {
  const view = presentSessionHistory([]);
  assert.equal(view.status, "empty");
  assert.equal(view.message, historyCopy.empty);
  assert.deepEqual(view.entries, []);
});

test("a failed load explains the failure and stays retryable", () => {
  const offline = presentHistoryFailure(networkError("failed"));
  assert.match(offline.message, /אין חיבור/);
  assert.equal(offline.canRetry, true);
  assert.equal(offline.retryLabel, "נסו שוב");

  const server = presentHistoryFailure(new Error("HTTP 500"));
  assert.match(server.message, /השרת לא הצליח/);
  assert.equal(server.canRetry, true);
});

test("choosing a session opens its summary route and history stays the active section", () => {
  assert.equal(sessionSummaryPath("session 1"), "/history/session%201");
  assert.deepEqual(parseHistoryLocation("/history"), { screen: "list", sessionId: null, playerId: null });
  assert.deepEqual(parseHistoryLocation("/history/session-1"), { screen: "summary", sessionId: "session-1", playerId: null });
  assert.equal(matchRoute("/history/session-1").id, "history");
  assert.equal(matchRoute("/history/session-1").label, "היסטוריה");
});

test("loading history reads the server list and does not write the active evening", async () => {
  const stored = document("session-a", "2026-11-13", "2026-11-13T22:00:00Z", [dana], []);
  let calls = 0;
  const loaded = await loadSessionHistory({
    listSessions: async () => {
      calls += 1;
      return [stored];
    },
  });

  assert.equal(calls, 1);
  assert.deepEqual(loaded, [stored]);
  const source = readFileSync(new URL("./HistoryScreen.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /saveActiveSession|startEvening|submitEvening|addTransaction|updateTransaction|deleteTransaction/);
  assert.match(source, /loadSessionHistory/);
  assert.doesNotMatch(source, /listSessions\(\{[^}]*from/);
});
