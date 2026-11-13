import assert from "node:assert/strict";
import test from "node:test";
import type { ActiveSessionRecord, Player } from "../../domain/models.ts";
import { MemoryLocalRepository } from "./memoryRepository.ts";

const createdAt = "2026-11-12T21:00:00Z";

const record: ActiveSessionRecord = {
  status: "pending",
  updatedAt: createdAt,
  session: {
    id: "session-001",
    date: "2026-11-12",
    createdAt,
    transactions: [
      {
        id: "tx-001",
        sessionId: "session-001",
        playerId: "avi",
        type: "cash-out",
        amount: 80,
        timestamp: "2026-11-12T19:00:00Z",
      },
    ],
  },
};

const avi: Player = { id: "avi", name: "אבי", createdAt };
const dana: Player = { id: "dana", name: "דנה", createdAt };

test("reading the current record restores the session after refresh", async () => {
  const repository = new MemoryLocalRepository();
  assert.equal(await repository.readActiveSession(), null);

  await repository.saveActiveSession(record);
  assert.deepEqual(await repository.readActiveSession(), record);
});

test("replacing players keeps only the replacement list", async () => {
  const repository = new MemoryLocalRepository();
  await repository.replacePlayers([avi, dana]);
  await repository.replacePlayers([dana]);

  assert.deepEqual(await repository.readPlayers(), [dana]);
});

test("a failed write is reported and does not claim the previous value changed", async () => {
  const repository = new MemoryLocalRepository();
  await repository.saveActiveSession(record);
  await repository.replacePlayers([avi]);

  repository.failNextWrite = true;
  await assert.rejects(() => repository.replaceActiveSession({ ...record, status: "submitted" }), /Failed to persist local data/);
  assert.equal((await repository.readActiveSession())?.status, "pending");

  repository.failNextWrite = true;
  await assert.rejects(() => repository.replacePlayers([dana]), /Failed to persist local data/);
  assert.deepEqual(await repository.readPlayers(), [avi]);
});
