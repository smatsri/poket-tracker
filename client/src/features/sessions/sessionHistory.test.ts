import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { networkError } from "../../data/api/errors.ts";
import { MemoryLocalRepository } from "../../data/local/memoryRepository.ts";
import type { SessionDocument } from "../../data/api/client.ts";
import { calculateSessionResult } from "../../domain/calculations.ts";
import { formatResult } from "../../domain/format.ts";
import type { Player, Transaction, TransactionType } from "../../domain/models.ts";
import { matchRoute } from "../../app/routes.ts";
import {
  deleteConfirmation,
  historyCopy,
  loadArchivedSessionHistory,
  loadSessionHistory,
  openArchivedSessionHistory,
  openSessionHistory,
  parseHistoryLocation,
  presentHistoryFailure,
  presentSessionHistory,
  rememberClosedSession,
  removeClosedSession,
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
  assert.equal(newest.moneyIn, "0");
  assert.equal(newest.moneyOut, "5");
  assert.equal(newest.moneyInCount, 0);
  assert.equal(newest.cashOutCount, 1);
  assert.equal(newest.moneyInLabel, "סך שנכנס");
  assert.equal(newest.moneyOutLabel, "סך שיצא");
  assert.equal(newest.gapLabel, "פער");
  assert.equal(newest.result.value, calculateSessionResult(tied.session).sessionBalance);
  assert.equal(newest.href, sessionSummaryPath("session-d"));
  assert.equal(newest.heading, newest.date);
  assert.equal(newest.location, undefined);

  const balanced = view.entries[2];
  assert.ok(balanced !== undefined);
  assert.equal(balanced.playerCount, 1);
  assert.equal(balanced.transactionCount, 3);
  assert.equal(balanced.result.text, formatResult(0));
  assert.equal(balanced.result.tone, "neutral");
  assert.equal(balanced.moneyIn, "20");
  assert.equal(balanced.moneyOut, "20");
  assert.equal(balanced.moneyInCount, 2);
  assert.equal(balanced.cashOutCount, 1);
  assert.notEqual(balanced.moneyInCount, balanced.cashOutCount);
  assert.equal(balanced.moneyInCountLabel, "מספר כניסות: 2");
  assert.equal(balanced.cashOutCountLabel, "מספר יציאות: 1");

  const loss = view.entries[3];
  assert.ok(loss !== undefined);
  assert.equal(loss.result.text, formatResult(calculateSessionResult(older.session).sessionBalance));
  assert.equal(loss.result.tone, "negative");
  assert.equal(loss.moneyIn, "100");
  assert.equal(loss.moneyOut, "40");
  assert.equal(loss.result.value, calculateSessionResult(older.session).sessionCashOuts - calculateSessionResult(older.session).sessionBuyIns);
});

test("a history card names the biggest winner, including a tie, a loss, and an empty evening", () => {
  const unique = document("unique", "2026-11-13", "2026-11-13T22:00:00Z", [dana, noa], [
    transaction("unique", "u1", "p1", "buy-in", 50),
    transaction("unique", "u2", "p2", "cash-out", 80),
  ]);
  const tied = document(
    "tied",
    "2026-11-13",
    "2026-11-13T22:00:00Z",
    [
      { id: "same-b", name: "דנה", createdAt: "2026-11-01T18:00:00Z" },
      { id: "same-a", name: "דנה", createdAt: "2026-11-01T18:00:00Z" },
      { id: "later", name: "נועה", createdAt: "2026-11-01T18:00:00Z" },
    ],
    [
      transaction("tied", "t1", "same-b", "cash-out", 10),
      transaction("tied", "t2", "same-a", "cash-out", 10),
      transaction("tied", "t3", "later", "cash-out", 10),
    ],
  );
  const loss = document("loss", "2026-11-12", "2026-11-12T22:00:00Z", [], [
    transaction("loss", "l1", "missing", "buy-in", 40),
  ]);
  const empty = document("empty", "2026-11-11", "2026-11-11T22:00:00Z", [dana], []);
  const even = document("even", "2026-11-10", "2026-11-10T22:00:00Z", [dana], [
    transaction("even", "e1", "p1", "buy-in", 10),
    transaction("even", "e2", "p1", "cash-out", 10),
  ]);

  const view = presentSessionHistory([unique, tied, loss, empty, even]);
  const byId = new Map(view.entries.map((entry) => [entry.id, entry]));

  assert.deepEqual(
    [byId.get("unique")?.biggestWinner?.playerId, byId.get("unique")?.biggestWinner?.name, byId.get("unique")?.biggestWinner?.result.text, byId.get("unique")?.biggestWinner?.label],
    ["p2", "נועה", formatResult(80), "המרוויח הגדול"],
  );
  assert.deepEqual(
    [byId.get("tied")?.biggestWinner?.playerId, byId.get("tied")?.biggestWinner?.name, byId.get("tied")?.biggestWinner?.result.value],
    ["same-a", "דנה", 10],
  );
  assert.deepEqual(
    [byId.get("loss")?.biggestWinner?.playerId, byId.get("loss")?.biggestWinner?.name, byId.get("loss")?.biggestWinner?.result.value, byId.get("loss")?.biggestWinner?.result.tone],
    ["missing", "שחקן לא ידוע", -40, "negative"],
  );
  assert.equal(byId.get("empty")?.biggestWinner, undefined);
  assert.equal(byId.get("even")?.biggestWinner?.result.value, 0);
  assert.equal(byId.get("even")?.biggestWinner?.name, "דנה");

  const screen = readFileSync(new URL("./HistoryScreen.tsx", import.meta.url), "utf8");
  assert.match(screen, /biggestWinner\.label/);
  assert.match(screen, /biggestWinner\.name/);
  assert.match(screen, /biggestWinner\.result/);
});

test("no sessions produces the Hebrew empty state", () => {
  const view = presentSessionHistory([]);
  const named = presentSessionHistory([
    {
      session: {
        id: "session-named",
        date: "2026-11-13",
        name: "ערב חמישי",
        location: "אצל דנה",
        createdAt: "2026-11-13T23:00:00Z",
        transactions: [transaction("session-named", "n1", "p1", "buy-in", 10)],
      },
      players: [dana],
    },
  ]);
  assert.equal(named.entries[0]?.heading, "ערב חמישי");
  assert.equal(named.entries[0]?.location, "אצל דנה");
  assert.notEqual(named.entries[0]?.heading, named.entries[0]?.date);

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
  assert.deepEqual(parseHistoryLocation("/history/%"), { screen: "list", sessionId: null, playerId: null });
  assert.deepEqual(parseHistoryLocation("/history/session%201"), { screen: "summary", sessionId: "session 1", playerId: null });
  assert.deepEqual(parseHistoryLocation("/history/session%201/players/p%201"), {
    screen: "player",
    sessionId: "session 1",
    playerId: "p 1",
  });
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
  const evening = readFileSync(new URL("./evening.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /saveActiveSession|startEvening|submitEvening|addTransaction|updateTransaction|deleteTransaction/);
  assert.match(source, /openSessionHistory/);
  assert.doesNotMatch(source, /listSessions\(\{[^}]*from/);
  assert.doesNotMatch(evening, /readClosedSession|replaceClosedSessions|saveClosedSession|closedSessions/);
});

test("a warm history cache renders before the network returns and a successful load replaces it", async () => {
  const repository = new MemoryLocalRepository();
  const cached = namedDocument("session-a", "ישן", "בית");
  await repository.replaceClosedSessions([cached]);
  const fresh = namedDocument("session-a", "ערב חדש", "אצל נועה");
  const shown: Array<{ heading?: string; location?: string; notice: string | null } | { status: "error" }> = [];
  let release: (documents: SessionDocument[]) => void = () => undefined;
  const gate = new Promise<SessionDocument[]>((resolve) => {
    release = resolve;
  });
  let started = false;
  const pending = openSessionHistory(
    repository,
    {
      listSessions: () => {
        started = true;
        return gate;
      },
    },
    (view) => {
      if (view.status === "error" || view.status === "loading") {
        shown.push({ status: "error" });
        return;
      }
      shown.push({
        heading: view.entries[0]?.heading,
        location: view.entries[0]?.location,
        notice: view.notice,
      });
    },
  );

  await flush();
  assert.equal(started, true);
  assert.deepEqual(shown, [{ heading: "ישן", location: "בית", notice: null }]);

  release([fresh]);
  await pending;
  assert.deepEqual(shown.at(-1), { heading: "ערב חדש", location: "אצל נועה", notice: null });
  assert.equal((await repository.readClosedSessions())[0]?.session.name, "ערב חדש");
  assert.equal((await repository.readClosedSessions())[0]?.session.location, "אצל נועה");
  assert.equal(await repository.readActiveSession(), null);
});

test("a failed history load keeps a warm cache and explains that the server could not be reached", async () => {
  const repository = new MemoryLocalRepository();
  const cached = namedDocument("session-a", "ישן", "בית");
  await repository.replaceClosedSessions([cached]);
  const shown: string[] = [];
  await openSessionHistory(
    repository,
    {
      listSessions: async () => {
        throw networkError("offline");
      },
    },
    (view) => {
      if (view.status === "ready") {
        shown.push(`${view.entries[0]?.heading ?? ""}|${view.notice ?? ""}`);
      }
    },
  );

  assert.deepEqual(shown, ["ישן|", `ישן|${historyCopy.cachedNotice}`]);
  assert.match(historyCopy.cachedNotice, /אין חיבור/);
  assert.equal((await repository.readClosedSessions())[0]?.session.name, "ישן");
  assert.equal(await repository.readActiveSession(), null);
});

test("a failed history load with an empty cache keeps the existing retryable error", async () => {
  const repository = new MemoryLocalRepository();
  const shown: Array<{ status: string; message?: string; canRetry?: boolean }> = [];
  await openSessionHistory(
    repository,
    {
      listSessions: async () => {
        throw networkError("offline");
      },
    },
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
    message: historyCopy.networkError,
    canRetry: true,
  });
  assert.deepEqual(await repository.readClosedSessions(), []);
});

test("the archived list does not replace the default history cache", async () => {
  const repository = new MemoryLocalRepository();
  const cached = namedDocument("old", "ישן", "אצל נועה");
  const archived = namedDocument("archived", "בארכיון", "אצל דנה");
  await repository.replaceClosedSessions([cached]);
  let query: unknown;
  await openArchivedSessionHistory(
    {
      listSessions: async (next) => {
        query = next;
        return [archived];
      },
    },
    () => undefined,
  );

  assert.deepEqual(query, { archived: true });
  assert.deepEqual(await repository.readClosedSessions(), [cached]);
  assert.equal((await loadArchivedSessionHistory({ listSessions: async () => [archived] })).length, 1);
});

test("archive drops a cached evening and restore puts it back without clearing the others", async () => {
  const repository = new MemoryLocalRepository();
  const kept = namedDocument("kept", "נשאר", "אצל נועה");
  const gone = namedDocument("gone", "הולך", "אצל דנה");
  await repository.replaceClosedSessions([kept, gone]);

  await removeClosedSession(repository, "gone");
  assert.deepEqual(
    (await repository.readClosedSessions()).map((document) => document.session.id),
    ["kept"],
  );

  await rememberClosedSession(repository, gone);
  assert.deepEqual(
    (await repository.readClosedSessions()).map((document) => document.session.id),
    ["kept", "gone"],
  );
});

test("delete asks for confirmation by name, and archive or restore do not", () => {
  assert.equal(deleteConfirmation("ערב אצל נועה"), "למחוק את ערב אצל נועה? הערב והפעולות שלו יוסרו.");
  const screen = readFileSync(new URL("./HistoryScreen.tsx", import.meta.url), "utf8");
  assert.match(screen, /window\.confirm\(deleteConfirmation\(entry\.heading\)\)/);
  assert.equal(screen.match(/window\.confirm/g)?.length, 1);
  assert.match(screen, /historyCopy\.archive/);
  assert.match(screen, /historyCopy\.restore/);
  assert.doesNotMatch(screen, /session-name|session-location|<input/);
});

function namedDocument(id: string, name: string, location: string): SessionDocument {
  return {
    session: {
      id,
      date: "2026-11-13",
      name,
      location,
      createdAt: "2026-11-13T22:00:00Z",
      transactions: [],
    },
    players: [dana],
  };
}

function flush(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
