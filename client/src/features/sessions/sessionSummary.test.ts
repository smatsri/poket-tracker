import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SessionDocument } from "../../data/api/client.ts";
import { ApiRequestError, networkError } from "../../data/api/errors.ts";
import { MemoryLocalRepository } from "../../data/local/memoryRepository.ts";
import { calculatePlayerResults, calculateSessionResult, compareRankedResults } from "../../domain/calculations.ts";
import { formatResult } from "../../domain/format.ts";
import type { Player, Transaction, TransactionType } from "../../domain/models.ts";
import { parseHistoryLocation, sessionPlayerPath, sessionTransactionsPath } from "./sessionHistory.ts";
import {
  loadSessionSummary,
  openSessionSummary,
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
  assert.equal(view.heading, view.date);
  assert.equal(view.location, undefined);
  const named = presentSessionSummary({
    ...document,
    session: { ...document.session, name: "ערב חמישי", location: "אצל דנה" },
  });
  assert.equal(named.heading, "ערב חמישי");
  assert.equal(named.location, "אצל דנה");
  assert.equal(named.canChange, false);
  assert.notEqual(named.heading, named.date);
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

  const expected = [...calculatePlayerResults(transactions)].sort((left, right) =>
    compareRankedResults(
      { netResult: left.netResult, name: [dana, noa, roi].find((item) => item.id === left.playerId)?.name ?? "", playerId: left.playerId },
      { netResult: right.netResult, name: [dana, noa, roi].find((item) => item.id === right.playerId)?.name ?? "", playerId: right.playerId },
    ),
  );
  assert.deepEqual(
    view.players.map((player) => player.playerId),
    ["p2", "p3", "p1"],
  );
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

test("summary players with the same net are ordered by Hebrew name, then player id", () => {
  const tied: SessionDocument = {
    session: {
      id: "session-tie",
      date: "2026-11-13",
      createdAt: "2026-11-13T22:00:00Z",
      transactions: [
        { ...transaction("a", "missing", "cash-out", 10, "2026-11-13T18:00:00Z"), sessionId: "session-tie" },
        { ...transaction("b", "early", "cash-out", 10, "2026-11-13T18:01:00Z"), sessionId: "session-tie" },
        { ...transaction("c", "same-b", "cash-out", 10, "2026-11-13T18:02:00Z"), sessionId: "session-tie" },
        { ...transaction("d", "same-a", "cash-out", 10, "2026-11-13T18:03:00Z"), sessionId: "session-tie" },
        { ...transaction("e", "late", "cash-out", 10, "2026-11-13T18:04:00Z"), sessionId: "session-tie" },
        { ...transaction("f", "loss", "buy-in", 5, "2026-11-13T18:05:00Z"), sessionId: "session-tie" },
      ],
    },
    players: [
      { id: "late", name: "נועה", createdAt: "2026-11-13T18:00:00Z" },
      { id: "early", name: "דנה", createdAt: "2026-11-13T18:00:00Z" },
      { id: "same-b", name: "דנה", createdAt: "2026-11-13T18:00:00Z" },
      { id: "same-a", name: "דנה", createdAt: "2026-11-13T18:00:00Z" },
      { id: "loss", name: "רועי", createdAt: "2026-11-13T18:00:00Z" },
    ],
  };

  const view = presentSessionSummary(tied);
  assert.deepEqual(
    view.players.map((player) => [player.playerId, player.name, player.net.value]),
    [
      ["missing", "שחקן לא ידוע", 10],
      ["early", "דנה", 10],
      ["same-a", "דנה", 10],
      ["same-b", "דנה", 10],
      ["late", "נועה", 10],
      ["loss", "רועי", -5],
    ],
  );
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
  assert.doesNotMatch(screen, /עריכה|מחיקה|שליח|submitEvening|deleteTransaction|updateTransaction|addTransaction|startEvening|session-name|session-location/);
  assert.match(screen, /openSessionSummary/);
  assert.match(screen, /כל הפעולות|summaryCopy.transactions/);
});

test("a warm summary cache renders before the network returns and a successful load replaces that evening", async () => {
  const repository = new MemoryLocalRepository();
  const cached: SessionDocument = {
    ...document,
    session: { ...document.session, name: "ישן", location: "בית" },
  };
  const other: SessionDocument = {
    session: { id: "session-2", date: "2026-11-12", createdAt: "2026-11-12T22:00:00Z", transactions: [] },
    players: [dana],
  };
  await repository.replaceClosedSessions([cached, other]);
  const fresh: SessionDocument = {
    ...document,
    session: { ...document.session, name: "ערב חדש", location: "אצל נועה" },
  };
  const shown: Array<{ heading?: string; location?: string; notice: string | null }> = [];
  let release: (value: SessionDocument) => void = () => undefined;
  const gate = new Promise<SessionDocument>((resolve) => {
    release = resolve;
  });
  let started = false;
  const pending = openSessionSummary(
    repository,
    {
      getSession: () => {
        started = true;
        return gate;
      },
    },
    "session-1",
    (view) => {
      if (view.status !== "ready") {
        return;
      }
      const summary = presentSessionSummary(view.document);
      shown.push({ heading: summary.heading, location: summary.location, notice: view.notice });
    },
  );

  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  assert.equal(started, true);
  assert.deepEqual(shown, [{ heading: "ישן", location: "בית", notice: null }]);

  release(fresh);
  await pending;
  assert.deepEqual(shown.at(-1), { heading: "ערב חדש", location: "אצל נועה", notice: null });
  assert.equal((await repository.readClosedSession("session-1"))?.session.name, "ערב חדש");
  assert.equal((await repository.readClosedSession("session-1"))?.session.location, "אצל נועה");
  assert.equal((await repository.readClosedSession("session-2"))?.session.id, "session-2");
  assert.equal(await repository.readActiveSession(), null);
});

test("a failed summary load keeps the cached evening and explains that the server could not be reached", async () => {
  const repository = new MemoryLocalRepository();
  const cached: SessionDocument = {
    ...document,
    session: { ...document.session, name: "ישן", location: "בית" },
  };
  await repository.saveClosedSession(cached);
  const shown: string[] = [];
  await openSessionSummary(
    repository,
    {
      getSession: async () => {
        throw networkError("offline");
      },
    },
    "session-1",
    (view) => {
      if (view.status === "ready") {
        shown.push(`${presentSessionSummary(view.document).heading}|${view.notice ?? ""}`);
      }
    },
  );

  assert.deepEqual(shown, ["ישן|", `ישן|${summaryCopy.cachedNotice}`]);
  assert.match(summaryCopy.cachedNotice, /אין חיבור/);
  assert.equal((await repository.readClosedSession("session-1"))?.session.location, "בית");
});

test("a failed summary load with an empty cache keeps the existing retryable error", async () => {
  const repository = new MemoryLocalRepository();
  const shown: Array<{ status: string; message?: string; canRetry?: boolean }> = [];
  await openSessionSummary(
    repository,
    {
      getSession: async () => {
        throw networkError("offline");
      },
    },
    "session-1",
    (view) => {
      if (view.status === "error") {
        shown.push({ status: view.status, message: view.message, canRetry: view.canRetry });
      } else {
        shown.push({ status: view.status });
      }
    },
  );

  assert.deepEqual(shown.at(-1), {
    status: "error",
    message: summaryCopy.networkError,
    canRetry: true,
  });
  assert.equal(await repository.readClosedSession("session-1"), null);
});
