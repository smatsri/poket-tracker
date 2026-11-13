import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SessionDocument } from "../../data/api/client.ts";
import { networkError } from "../../data/api/errors.ts";
import { calculatePlayerResults, rankOverallResults } from "../../domain/calculations.ts";
import { formatResult } from "../../domain/format.ts";
import type { Player, Transaction, TransactionType } from "../../domain/models.ts";
import { matchRoute } from "../../app/routes.ts";
import {
  loadStatistics,
  parseStatsLocation,
  presentPlayerStatistics,
  presentStatistics,
  presentStatisticsFailure,
  statsCopy,
  statsPlayerPath,
} from "./statistics.ts";

const dana: Player = { id: "dana", name: "דנה", createdAt: "2026-11-01T18:00:00Z" };
const avi: Player = { id: "avi", name: "אבי", createdAt: "2026-11-01T18:00:00Z" };
const absent: Player = { id: "absent", name: "גל", createdAt: "2026-11-01T18:00:00Z" };

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

const older = document("session-a", "2026-11-12", "2026-11-12T22:00:00Z", [dana, absent], [
  transaction("session-a", "a1", "dana", "buy-in", 100),
  transaction("session-a", "a2", "dana", "cash-out", 40),
]);
const newer = document("session-b", "2026-11-13", "2026-11-13T22:00:00Z", [dana, avi], [
  transaction("session-b", "b1", "dana", "cash-out", 30),
  transaction("session-b", "b2", "avi", "cash-out", 30),
  transaction("session-b", "b3", "avi", "buy-in", 10),
]);

test("session and transaction counts match the returned sessions", () => {
  const view = presentStatistics([older, newer]);
  assert.equal(view.sessionCount, 2);
  assert.equal(view.transactionCount, older.session.transactions.length + newer.session.transactions.length);
  assert.equal(view.sessionsLabel, "ערבים: 2");
  assert.equal(view.transactionsLabel, "פעולות: 5");
});

test("overall results sum per-session nets and rank from highest to lowest, with names breaking ties", () => {
  const view = presentStatistics([older, newer]);
  const ranked = rankOverallResults([older.session, newer.session], [dana, avi, absent]);
  assert.deepEqual(
    view.players.map((player) => [player.playerId, player.name, player.result.value, player.result.text, player.href]),
    ranked.map((player) => [player.playerId, player.name, player.netResult, formatResult(player.netResult), statsPlayerPath(player.playerId)]),
  );
  assert.deepEqual(
    view.players.map((player) => player.playerId),
    ["avi", "dana"],
  );
  assert.equal(view.players.some((player) => player.playerId === "absent"), false);

  const tied = document("session-c", "2026-11-14", "2026-11-14T22:00:00Z", [dana, avi], [
    transaction("session-c", "c1", "dana", "cash-out", 10),
    transaction("session-c", "c2", "avi", "cash-out", 10),
  ]);
  assert.deepEqual(
    presentStatistics([tied]).players.map((player) => player.name),
    ["אבי", "דנה"],
  );

  const danaNets = [older, newer].map(
    (item) => calculatePlayerResults(item.session.transactions).find((player) => player.playerId === "dana")?.netResult ?? 0,
  );
  assert.equal(
    view.players.find((player) => player.playerId === "dana")?.result.value,
    danaNets.reduce((sum, value) => sum + value, 0),
  );
});

test("a player history lists only evenings that contain that player, newest first", () => {
  const history = presentPlayerStatistics([older, newer], "avi");
  assert.ok(history !== null);
  if (history === null) {
    return;
  }

  assert.equal(history.name, "אבי");
  assert.deepEqual(
    history.evenings.map((evening) => evening.sessionId),
    ["session-b"],
  );
  assert.equal(history.evenings[0]?.result.value, 20);
  assert.equal(history.overall.value, 20);

  const danaHistory = presentPlayerStatistics([older, newer], "dana");
  assert.deepEqual(
    danaHistory?.evenings.map((evening) => [evening.sessionId, evening.result.value]),
    [
      ["session-b", 30],
      ["session-a", -60],
    ],
  );
  assert.equal(presentPlayerStatistics([older, newer], "absent"), null);
});

test("no completed sessions produces the Hebrew empty state", () => {
  const view = presentStatistics([]);
  assert.equal(view.status, "empty");
  assert.equal(view.message, statsCopy.empty);
  assert.equal(view.sessionCount, 0);
  assert.equal(view.transactionCount, 0);
  assert.deepEqual(view.players, []);
});

test("statistics load the server session list and a player route stays in סיכומים", async () => {
  let calls = 0;
  const loaded = await loadStatistics({
    listSessions: async () => {
      calls += 1;
      return [newer];
    },
  });
  assert.equal(calls, 1);
  assert.equal(loaded.length, 1);
  assert.deepEqual(parseStatsLocation("/stats"), { screen: "list", playerId: null });
  assert.deepEqual(parseStatsLocation("/stats/avi"), { screen: "player", playerId: "avi" });
  assert.equal(matchRoute("/stats/avi").id, "stats");

  const offline = presentStatisticsFailure(networkError("offline"));
  assert.match(offline.message, /אין חיבור/);
  assert.equal(offline.canRetry, true);

  const source = readFileSync(new URL("./StatisticsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /loadStatistics/);
  assert.doesNotMatch(source, /saveActiveSession|startEvening|submitEvening|addTransaction|updateTransaction|deleteTransaction/);
});
