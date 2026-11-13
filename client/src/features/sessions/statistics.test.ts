import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SessionDocument } from "../../data/api/client.ts";
import { networkError } from "../../data/api/errors.ts";
import { calculatePlayerResults, calculateSessionResult, rankOverallResults } from "../../domain/calculations.ts";
import { formatResult } from "../../domain/format.ts";
import type { Player, Transaction, TransactionType } from "../../domain/models.ts";
import { matchRoute } from "../../app/routes.ts";
import {
  loadStatistics,
  parseStatsLocation,
  playerCumulativeSeries,
  mapCumulativeChart,
  mapPlayerComparisonChart,
  mapSessionResultsChart,
  presentPlayerStatistics,
  sessionBalanceSeries,
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
    view.players.map((player) => [player.playerId, player.eveningsPlayed, player.result.value]),
    [
      ["avi", 1, 20],
      ["dana", 2, -30],
    ],
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

test("player progression counts evenings and accumulates nets oldest first", () => {
  assert.equal(presentPlayerStatistics([], "dana"), null);
  assert.equal(playerCumulativeSeries([], "dana").length, 0);
  assert.equal(presentPlayerStatistics([older, newer], "absent"), null);

  const aviHistory = presentPlayerStatistics([newer], "avi");
  assert.ok(aviHistory !== null);
  if (aviHistory === null) {
    return;
  }
  assert.equal(aviHistory.eveningsPlayed, 1);
  assert.deepEqual(
    aviHistory.progression.map((point) => [point.sessionId, point.result.value, point.cumulative.value]),
    [["session-b", 20, 20]],
  );
  assert.equal(aviHistory.progression[0]?.cumulative.value, aviHistory.overall.value);

  const danaHistory = presentPlayerStatistics([newer, older], "dana");
  assert.ok(danaHistory !== null);
  if (danaHistory === null) {
    return;
  }
  const series = playerCumulativeSeries([newer, older], "dana");
  assert.equal(danaHistory.eveningsPlayed, 2);
  assert.deepEqual(
    series.map((point) => [point.sessionId, point.net, point.cumulative]),
    [
      ["session-a", -60, -60],
      ["session-b", 30, -30],
    ],
  );
  assert.deepEqual(
    danaHistory.progression.map((point) => [point.sessionId, point.cumulative.value]),
    series.map((point) => [point.sessionId, point.cumulative]),
  );
  assert.equal(danaHistory.overall.value, series[series.length - 1]?.cumulative);
  assert.equal(
    danaHistory.overall.value,
    series.reduce((sum, point) => sum + point.net, 0),
  );
  assert.deepEqual(
    danaHistory.evenings.map((evening) => evening.sessionId),
    ["session-b", "session-a"],
  );

  const source = readFileSync(new URL("./StatisticsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /eveningsPlayed/);
  assert.match(source, /player\.progression/);
  assert.match(source, /statsCopy\.missingPlayer/);
});

test("cumulative chart points follow the chronological series", () => {
  const empty = mapCumulativeChart([], 320, 160);
  assert.deepEqual(empty.points, []);
  assert.equal(empty.zeroY, null);

  const single = mapCumulativeChart([{ sessionId: "session-b", date: "13 בנובמבר 2026", cumulative: 20 }], 100, 50);
  assert.equal(single.points.length, 1);
  assert.equal(single.points[0]?.value, 20);
  assert.equal(single.points[0]?.x, 50);
  assert.equal(single.points[0]?.y, 16);
  assert.equal(single.zeroY, 34);

  const series = playerCumulativeSeries([newer, older], "dana");
  const chart = mapCumulativeChart(series, 100, 50);
  assert.deepEqual(
    chart.points.map((point) => [point.sessionId, point.value]),
    [
      ["session-a", -60],
      ["session-b", -30],
    ],
  );
  assert.deepEqual(
    chart.points.map((point) => [point.x, point.y]),
    [
      [16, 34],
      [84, 25],
    ],
  );
  assert.equal(chart.points[chart.points.length - 1]?.value, series[series.length - 1]?.cumulative);
  assert.ok((chart.points[0]?.y ?? 0) > (chart.points[1]?.y ?? 0));

  const source = readFileSync(new URL("./StatisticsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /CumulativeChart progression=\{player\.progression\}/);
  const chartSource = readFileSync(new URL("./CumulativeChart.tsx", import.meta.url), "utf8");
  assert.match(chartSource, /mapCumulativeChart/);
  assert.doesNotMatch(chartSource, /fetch\(|\/api\//);
});

test("session results chart maps chronological session balances", () => {
  const empty = mapSessionResultsChart([], 320, 160);
  assert.deepEqual(empty.bars, []);
  assert.equal(empty.zeroY, null);
  assert.deepEqual(presentStatistics([]).sessions, []);

  const view = presentStatistics([newer, older]);
  const expected = [older, newer].map((item) => ({
    sessionId: item.session.id,
    balance: calculateSessionResult(item.session).sessionBalance,
  }));
  assert.deepEqual(
    view.sessions.map((point) => [point.sessionId, point.balance]),
    expected.map((point) => [point.sessionId, point.balance]),
  );
  assert.deepEqual(
    sessionBalanceSeries([newer, older]).map((point) => [point.sessionId, point.balance]),
    expected.map((point) => [point.sessionId, point.balance]),
  );
  assert.equal(view.sessions[0]?.balance, -60);
  assert.equal(view.sessions[1]?.balance, 50);

  const sameDay = document("session-late", "2026-11-13", "2026-11-13T23:00:00Z", [avi], [
    transaction("session-late", "d1", "avi", "buy-in", 10),
  ]);
  assert.deepEqual(
    sessionBalanceSeries([sameDay, newer]).map((point) => point.sessionId),
    ["session-b", "session-late"],
  );

  const chart = mapSessionResultsChart(view.sessions, 100, 50);
  assert.deepEqual(
    chart.bars.map((bar) => [bar.sessionId, bar.value]),
    view.sessions.map((point) => [point.sessionId, point.balance]),
  );
  assert.ok((chart.bars[0]?.x ?? 0) < (chart.bars[1]?.x ?? 0));
  assert.equal(chart.bars[0]?.y, chart.zeroY);
  assert.ok((chart.bars[0]?.height ?? 0) > 0);
  assert.equal((chart.bars[1]?.y ?? 0) + (chart.bars[1]?.height ?? 0), chart.zeroY);
  assert.ok((chart.bars[1]?.y ?? 0) < (chart.zeroY ?? 0));

  const loss = mapSessionResultsChart([{ sessionId: "session-a", date: "12 בנובמבר 2026", balance: -60 }], 100, 50);
  assert.equal(loss.zeroY, 16);
  assert.equal(loss.bars[0]?.x, 33);
  assert.equal(loss.bars[0]?.y, 16);
  assert.equal(loss.bars[0]?.width, 34);
  assert.equal(loss.bars[0]?.height, 18);

  const source = readFileSync(new URL("./StatisticsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /SessionResultsChart sessions=\{view\.sessions\}/);
  assert.match(source, /view\.sessionCount/);
  assert.match(source, /view\.players\.map/);
  const chartSource = readFileSync(new URL("./SessionResultsChart.tsx", import.meta.url), "utf8");
  assert.match(chartSource, /mapSessionResultsChart/);
  assert.doesNotMatch(chartSource, /fetch\(|\/api\//);
  const css = readFileSync(new URL("../../styles/global.css", import.meta.url), "utf8");
  assert.match(css, /\.session-chart \{[^}]*width:\s*100%/s);
});

test("player comparison chart uses the ranked overall nets", () => {
  const empty = mapPlayerComparisonChart([], 320, 160);
  assert.deepEqual(empty.bars, []);
  assert.equal(empty.zeroY, null);

  const view = presentStatistics([older, newer]);
  assert.equal(view.players.some((player) => player.playerId === "absent"), false);
  const chart = mapPlayerComparisonChart(
    view.players.map((player) => ({ playerId: player.playerId, name: player.name, net: player.result.value })),
    100,
    50,
  );
  assert.deepEqual(
    chart.bars.map((bar) => [bar.playerId, bar.name, bar.value]),
    view.players.map((player) => [player.playerId, player.name, player.result.value]),
  );
  assert.deepEqual(
    chart.bars.map((bar) => [bar.playerId, bar.value]),
    [
      ["avi", 20],
      ["dana", -30],
    ],
  );
  assert.ok((chart.bars[0]?.x ?? 0) < (chart.bars[1]?.x ?? 0));
  assert.equal((chart.bars[0]?.y ?? 0) + (chart.bars[0]?.height ?? 0), chart.zeroY);
  assert.equal(chart.bars[1]?.y, chart.zeroY);

  const tied = document("session-c", "2026-11-14", "2026-11-14T22:00:00Z", [dana, avi], [
    transaction("session-c", "c1", "dana", "cash-out", 10),
    transaction("session-c", "c2", "avi", "cash-out", 10),
  ]);
  const tiedView = presentStatistics([tied]);
  const tiedChart = mapPlayerComparisonChart(
    tiedView.players.map((player) => ({ playerId: player.playerId, name: player.name, net: player.result.value })),
    100,
    50,
  );
  assert.deepEqual(
    tiedChart.bars.map((bar) => bar.name),
    ["אבי", "דנה"],
  );
  assert.deepEqual(
    tiedChart.bars.map((bar) => bar.value),
    tiedView.players.map((player) => player.result.value),
  );

  const gain = mapPlayerComparisonChart([{ playerId: "avi", name: "אבי", net: 20 }], 100, 50);
  assert.equal(gain.zeroY, 34);
  assert.equal(gain.bars[0]?.x, 33);
  assert.equal(gain.bars[0]?.y, 16);
  assert.equal(gain.bars[0]?.width, 34);
  assert.equal(gain.bars[0]?.height, 18);

  const source = readFileSync(new URL("./StatisticsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /PlayerComparisonChart players=\{view\.players\}/);
  assert.match(source, /view\.players\.map/);
  const chartSource = readFileSync(new URL("./PlayerComparisonChart.tsx", import.meta.url), "utf8");
  assert.match(chartSource, /mapPlayerComparisonChart/);
  assert.match(chartSource, /player\.result\.value/);
  assert.doesNotMatch(chartSource, /fetch\(|\/api\//);
  const css = readFileSync(new URL("../../styles/global.css", import.meta.url), "utf8");
  assert.match(css, /\.comparison-chart \{[^}]*width:\s*100%/s);
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
  assert.deepEqual(parseStatsLocation("/stats/%"), { screen: "list", playerId: null });
  assert.deepEqual(parseStatsLocation("/stats/%D7%93%D7%A0%D7%94"), { screen: "player", playerId: "דנה" });
  assert.equal(matchRoute("/stats/avi").id, "stats");

  const offline = presentStatisticsFailure(networkError("offline"));
  assert.match(offline.message, /אין חיבור/);
  assert.equal(offline.canRetry, true);

  const source = readFileSync(new URL("./StatisticsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /loadStatistics/);
  assert.doesNotMatch(source, /saveActiveSession|startEvening|submitEvening|addTransaction|updateTransaction|deleteTransaction/);
});
