import assert from "node:assert/strict";
import test from "node:test";
import type { ApiClient } from "../../data/api/client.ts";
import { ApiRequestError } from "../../data/api/errors.ts";
import { MemoryLocalRepository } from "../../data/local/memoryRepository.ts";
import type { ActiveSessionRecord, Player, Transaction } from "../../domain/models.ts";
import { presentCurrentEvening } from "../sessions/currentEvening.ts";
import { presentSessionSummary } from "../sessions/sessionSummary.ts";
import { presentStatistics } from "../sessions/statistics.ts";
import { presentTransactionHistory } from "../sessions/transactionHistory.ts";
import { createPlayerDirectory } from "./directory.ts";
import { playerDisplayName, unknownPlayerName } from "./playerName.ts";

function player(id: string, name: string): Player {
  return { id, name, createdAt: "2026-11-13T18:00:00Z" };
}

test("a stored name is shown, and a blank or missing name is unknown", () => {
  const players = [player("p1", "דנה"), player("blank", "  ")];

  assert.equal(playerDisplayName("p1", players), "דנה");
  assert.equal(playerDisplayName("blank", players), unknownPlayerName);
  assert.equal(playerDisplayName("gone", players), unknownPlayerName);
});

test("a failed player reload keeps the last cached names on the evening", async () => {
  const cached = [player("p1", "דנה")];
  const repository = new MemoryLocalRepository();
  let calls = 0;
  const api: ApiClient = {
    listPlayers: async () => {
      calls += 1;
      if (calls === 1) {
        return cached;
      }
      throw new ApiRequestError("offline", null, null, "network");
    },
    createPlayer: async () => {
      throw new Error("unused");
    },
    updatePlayer: async () => {
      throw new Error("unused");
    },
    deletePlayer: async () => {
      throw new Error("unused");
    },
    submitSession: async () => {
      throw new Error("unused");
    },
    getSession: async () => {
      throw new Error("unused");
    },
    listSessions: async () => [],
  };
  const directory = createPlayerDirectory(repository, api);
  await directory.load();
  const failed = await directory.load();
  const transaction: Transaction = {
    id: "t1",
    sessionId: "session-1",
    playerId: "p1",
    type: "buy-in",
    amount: 50,
    timestamp: "2026-11-13T18:00:00Z",
  };
  const record: ActiveSessionRecord = {
    status: "draft",
    updatedAt: "2026-11-13T18:00:00Z",
    session: { id: "session-1", date: "2026-11-13", createdAt: "2026-11-13T18:00:00Z", transactions: [transaction] },
  };

  const view = presentCurrentEvening(record, failed.players);
  assert.equal(failed.ok, false);
  assert.equal(view.kind, "active");
  if (view.kind !== "active") {
    return;
  }

  assert.equal(view.players[0]?.name, "דנה");
  assert.equal(presentTransactionHistory(record.session, failed.players, "draft").transactions[0]?.playerName, "דנה");
});

test("a renamed player is shown everywhere without changing the transaction", () => {
  const transaction: Transaction = {
    id: "t1",
    sessionId: "session-1",
    playerId: "p1",
    type: "buy-in",
    amount: 50,
    timestamp: "2026-11-13T18:00:00Z",
  };
  const renamed = player("p1", "דנה לוי");
  const record: ActiveSessionRecord = {
    status: "draft",
    updatedAt: "2026-11-13T18:00:00Z",
    session: { id: "session-1", date: "2026-11-13", createdAt: "2026-11-13T18:00:00Z", transactions: [transaction] },
  };
  const document = { session: { ...record.session, transactions: [transaction] }, players: [renamed] };

  const evening = presentCurrentEvening(record, [renamed]);
  const summary = presentSessionSummary(document);
  const statistics = presentStatistics([document]);
  assert.equal(evening.kind, "active");
  assert.equal(statistics.status, "ready");
  if (evening.kind !== "active" || statistics.status !== "ready") {
    return;
  }

  assert.equal(evening.players[0]?.name, "דנה לוי");
  assert.equal(summary.players[0]?.name, "דנה לוי");
  assert.equal(statistics.players[0]?.name, "דנה לוי");
  assert.equal(evening.history[0]?.id, "t1");
  assert.equal(summary.transactions[0]?.id, "t1");
  assert.equal(record.session.transactions[0]?.type, "buy-in");
  assert.equal(record.session.transactions[0]?.amount, 50);
});
