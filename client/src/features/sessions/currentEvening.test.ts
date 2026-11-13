import assert from "node:assert/strict";
import test from "node:test";
import { calculateSessionResult } from "../../domain/calculations.ts";
import { formatResult } from "../../domain/format.ts";
import type { ActiveSessionRecord, Player, Transaction, TransactionType } from "../../domain/models.ts";
import { readFileSync } from "node:fs";
import { canCorrectTransactions, presentCurrentEvening, presentEveningLoadFailure, presentPlayerEvening } from "./currentEvening.ts";

const players: Player[] = [
  { id: "p1", name: "דנה", createdAt: "2026-11-13T18:00:00Z" },
  { id: "p2", name: "נועה", createdAt: "2026-11-13T18:00:00Z" },
  { id: "p3", name: "רועי", createdAt: "2026-11-13T18:00:00Z" },
];

function transaction(id: string, playerId: string, type: TransactionType, amount: number, timestamp: string): Transaction {
  return { id, sessionId: "session-1", playerId, type, amount, timestamp };
}

function record(status: ActiveSessionRecord["status"], transactions: Transaction[]): ActiveSessionRecord {
  return {
    status,
    updatedAt: "2026-11-13T22:00:00Z",
    session: {
      id: "session-1",
      date: "2026-11-13",
      createdAt: "2026-11-13T18:00:00Z",
      transactions,
    },
  };
}

const transactions = [
  transaction("t1", "p1", "buy-in", 100, "2026-11-13T18:00:00Z"),
  transaction("t2", "p1", "rebuy", 50, "2026-11-13T19:00:00Z"),
  transaction("t3", "p2", "buy-in", 40, "2026-11-13T19:30:00Z"),
  transaction("t4", "p2", "cash-out", 50, "2026-11-13T20:00:00Z"),
  transaction("t5", "p1", "cash-out", 80, "2026-11-13T20:30:00Z"),
  transaction("t6", "p1", "cash-out", 20, "2026-11-13T21:00:00Z"),
  transaction("t7", "p2", "rebuy", 10, "2026-11-13T21:30:00Z"),
];

test("a failed read shows a load error and hides the start action", () => {
  const failed = presentEveningLoadFailure();
  assert.equal(failed.kind, "error");
  assert.equal(failed.canStart, false);
  assert.equal(failed.message, "לא הצלחנו לטעון את הערב.");

  const source = readFileSync(new URL("./CurrentEveningScreen.tsx", import.meta.url), "utf8");
  const errorBranch = source.slice(source.indexOf("if (loadError)"), source.indexOf('if (view.kind === "empty")'));
  assert.match(errorBranch, /presentEveningLoadFailure/);
  assert.doesNotMatch(errorBranch, /startEvening|התחלת ערב/);
  const start = source.slice(source.indexOf("async function startEvening"), source.indexOf("const editing"));
  assert.match(start, /if \(loadError \|\|/);
  assert.ok(start.indexOf("loadError") < start.indexOf("evening.startEvening"));
});

test("a missing active evening still shows the empty state and its start action", () => {
  const empty = presentCurrentEvening(null, players);
  assert.equal(empty.kind, "empty");
  assert.equal(empty.canStart, true);
  const source = readFileSync(new URL("./CurrentEveningScreen.tsx", import.meta.url), "utf8");
  const emptyBranch = source.slice(source.indexOf('if (view.kind === "empty")'), source.indexOf("if (transactionId"));
  assert.match(emptyBranch, /התחלת ערב חדש/);
  assert.match(emptyBranch, /startEvening/);
});

test("the empty state can start an evening and a draft or pending evening cannot", () => {
  assert.equal(presentCurrentEvening(null, players).canStart, true);
  assert.equal(presentCurrentEvening(null, players).canRecord, false);
  assert.equal(presentCurrentEvening(record("draft", transactions), players).canStart, false);
  assert.equal(presentCurrentEvening(record("draft", transactions), players).canRecord, true);
  assert.equal(presentCurrentEvening(record("pending", transactions), players).canStart, false);
  assert.equal(presentCurrentEvening(record("pending", transactions), players).canRecord, false);
  assert.equal(presentCurrentEvening(record("submitted", transactions), players).canStart, true);
  assert.equal(presentCurrentEvening(record("submitted", transactions), players).canRecord, false);
  assert.equal(canCorrectTransactions("draft"), true);
  assert.equal(canCorrectTransactions("pending"), false);
  assert.equal(canCorrectTransactions("submitted"), false);
});

test("the overview and every player row match the domain calculations", () => {
  const view = presentCurrentEvening(record("draft", transactions), players);
  assert.equal(view.kind, "active");
  if (view.kind !== "active") {
    return;
  }

  const result = calculateSessionResult({ transactions });
  assert.equal(view.title, "ערב נוכחי");
  assert.equal(view.statusLabel, "פתוח");
  assert.equal(view.balance.value, result.sessionBalance);
  assert.equal(view.balance.text, formatResult(result.sessionBalance));
  assert.equal(view.balance.tone, "negative");
  assert.deepEqual(
    view.players.map((player) => [player.playerId, player.name, player.net.value, player.net.text, player.net.tone]),
    result.players.map((player) => {
      const tone = player.netResult > 0 ? "positive" : player.netResult < 0 ? "negative" : "neutral";
      return [player.playerId, players.find((item) => item.id === player.playerId)?.name, player.netResult, formatResult(player.netResult), tone];
    }),
  );
  assert.equal(view.players.find((player) => player.playerId === "p2")?.net.text, "0");
  assert.equal(view.players.find((player) => player.playerId === "p2")?.net.tone, "neutral");
  assert.equal(view.players.some((player) => player.playerId === "p3"), false);
});

test("recent activity shows at most five transactions, newest first", () => {
  const view = presentCurrentEvening(record("draft", transactions), players);
  assert.equal(view.kind, "active");
  if (view.kind !== "active") {
    return;
  }

  assert.deepEqual(
    view.recent.map((item) => item.id),
    ["t7", "t6", "t5", "t4", "t3"],
  );
  assert.deepEqual(
    view.history.map((item) => item.id),
    ["t7", "t6", "t5", "t4", "t3", "t2", "t1"],
  );
  assert.equal(view.recent[0]?.playerName, "נועה");
  assert.equal(view.recent[0]?.typeLabel, "כניסה נוספת");
});

test("the full history keeps every transaction and shows a missing name as the player id", () => {
  const withUnknown = [...transactions, transaction("t8", "gone", "buy-in", 15, "2026-11-13T17:00:00Z")];
  const view = presentCurrentEvening(record("draft", withUnknown), players);
  assert.equal(view.kind, "active");
  if (view.kind !== "active") {
    return;
  }

  assert.equal(view.history.at(-1)?.playerName, "gone");
  assert.equal(view.history.length, withUnknown.length);
});

test("an empty draft history is empty and a submitted history cannot be corrected", () => {
  const empty = presentCurrentEvening(record("draft", []), players);
  const submitted = presentCurrentEvening(record("submitted", transactions), players);
  assert.equal(empty.kind, "active");
  assert.equal(submitted.kind, "active");
  if (empty.kind !== "active" || submitted.kind !== "active") {
    return;
  }

  assert.deepEqual(empty.history, []);
  assert.equal(empty.canRecord, true);
  assert.equal(submitted.canRecord, false);
  assert.equal(submitted.history.length, transactions.length);
});

test("a player row opens that player's current-evening transactions", () => {
  const detail = presentPlayerEvening(record("draft", transactions), "p1", players);
  assert.equal(detail?.name, "דנה");
  assert.equal(detail?.net.value, -50);
  assert.deepEqual(
    detail?.transactions.map((item) => item.id),
    ["t6", "t5", "t2", "t1"],
  );
  assert.equal(presentPlayerEvening(record("draft", transactions), "p3", players), null);
});
