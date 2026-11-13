import assert from "node:assert/strict";
import test from "node:test";
import type { ApiClient, SubmittedSession } from "../../data/api/client.ts";
import { ApiRequestError } from "../../data/api/errors.ts";
import { MemoryLocalRepository } from "../../data/local/memoryRepository.ts";
import type { Session } from "../../domain/models.ts";
import { createEveningService, EveningError, type EveningClock } from "./evening.ts";

const now = new Date(2026, 10, 13, 0, 30);

function clock(): EveningClock & { ids: string[] } {
  const ids = ["session-001", "tx-001", "session-002"];
  return {
    ids,
    now: () => now,
    newId: () => {
      const next = ids.shift();
      if (next === undefined) {
        throw new Error("Test ran out of ids");
      }
      return next;
    },
  };
}

function api(submit: (session: Session) => Promise<SubmittedSession> | SubmittedSession): ApiClient & { calls: Session[] } {
  const calls: Session[] = [];
  return {
    calls,
    listPlayers: async () => [],
    createPlayer: async () => {
      throw new Error("unused");
    },
    getSession: async () => {
      throw new Error("unused");
    },
    listSessions: async () => [],
    submitSession: async (session) => {
      calls.push(structuredClone(session));
      return submit(session);
    },
  };
}

function confirmed(session: Session, status: 200 | 201): SubmittedSession {
  return {
    status,
    players: [],
    session: { ...session, createdAt: "2026-11-13T20:00:00Z" },
  };
}

test("a transaction is not reported as saved when persistence fails", async () => {
  const repository = new MemoryLocalRepository();
  const service = createEveningService(repository, api(() => { throw new Error("unused"); }), clock());
  await service.startEvening();
  repository.failNextWrite = true;

  await assert.rejects(
    () => service.addTransaction({ playerId: "player-001", type: "buy-in", amount: 50 }),
    /Failed to persist local data/,
  );
  assert.deepEqual((await repository.readActiveSession())?.session.transactions, []);
});

test("refresh state is restored from the persisted active session", async () => {
  const repository = new MemoryLocalRepository();
  const ids = clock();
  const writer = createEveningService(repository, api(() => { throw new Error("unused"); }), ids);
  await writer.startEvening();
  await writer.addTransaction({ playerId: "player-001", type: "rebuy", amount: 20 });

  const restored = await createEveningService(repository, api(() => { throw new Error("unused"); }), ids).readCurrent();
  assert.equal(restored?.status, "draft");
  assert.equal(restored?.session.id, "session-001");
  assert.equal(restored?.session.transactions[0]?.id, "tx-001");
});

test("submission moves draft to pending before the request starts", async () => {
  const repository = new MemoryLocalRepository();
  const client = api(async () => {
    assert.equal((await repository.readActiveSession())?.status, "pending");
    return confirmed((await repository.readActiveSession())!.session, 201);
  });
  const service = createEveningService(repository, client, clock());
  await service.startEvening();
  await service.addTransaction({ playerId: "player-001", type: "buy-in", amount: 50 });

  assert.equal((await service.submitEvening()).status, "submitted");
});

test("201 and identical 200 move pending to submitted", async () => {
  for (const status of [201, 200] as const) {
    const repository = new MemoryLocalRepository();
    const client = api((session) => confirmed(session, status));
    const service = createEveningService(repository, client, clock());
    await service.startEvening();
    await service.addTransaction({ playerId: "player-001", type: "cash-out", amount: 80 });

    const submitted = await service.submitEvening();
    assert.equal(submitted.status, "submitted");
    assert.equal(submitted.session.createdAt, "2026-11-13T20:00:00Z");
    assert.equal((await repository.readActiveSession())?.status, "submitted");
  }
});

test("a network failure, 500, or 409 stays pending and retains the original session", async () => {
  const failures = [
    new ApiRequestError("Failed to fetch", null, null, "network"),
    new ApiRequestError("Unexpected server error", 500, "INTERNAL_ERROR", "http"),
    new ApiRequestError("Session already exists with different content", 409, "CONFLICT", "http"),
  ];

  for (const failure of failures) {
    const repository = new MemoryLocalRepository();
    const client = api(() => {
      throw failure;
    });
    const service = createEveningService(repository, client, clock());
    await service.startEvening();
    const transaction = await service.addTransaction({ playerId: "player-001", type: "buy-in", amount: 50 });

    await assert.rejects(() => service.submitEvening(), (error: unknown) => error === failure);
    const retained = await repository.readActiveSession();
    assert.equal(retained?.status, "pending");
    assert.equal(retained?.session.id, "session-001");
    assert.deepEqual(retained?.session.transactions, [transaction]);
    assert.deepEqual(client.calls.map((session) => session.id), ["session-001"]);
  }
});

test("starting an evening is rejected while the active status is draft or pending", async () => {
  const repository = new MemoryLocalRepository();
  const service = createEveningService(repository, api(() => { throw new Error("unused"); }), clock());
  const draft = await service.startEvening();
  await assert.rejects(() => service.startEvening(), EveningError);
  assert.equal((await repository.readActiveSession())?.session.id, draft.session.id);

  repository.failNextWrite = false;
  await service.addTransaction({ playerId: "player-001", type: "buy-in", amount: 50 });
  const client = api(() => {
    throw new ApiRequestError("Failed to fetch", null, null, "network");
  });
  const pendingService = createEveningService(repository, client, clock());
  await assert.rejects(() => pendingService.submitEvening());
  await assert.rejects(() => pendingService.startEvening(), EveningError);
  assert.equal((await repository.readActiveSession())?.status, "pending");
  assert.equal((await repository.readActiveSession())?.session.id, draft.session.id);
});

test("starting an evening after submitted creates a new session id", async () => {
  const repository = new MemoryLocalRepository();
  const ids = clock();
  const service = createEveningService(repository, api((session) => confirmed(session, 201)), ids);
  await service.startEvening();
  await service.addTransaction({ playerId: "player-001", type: "buy-in", amount: 50 });
  await service.submitEvening();

  const next = await service.startEvening();
  assert.equal(next.status, "draft");
  assert.equal(next.session.id, "session-002");
  assert.equal(next.session.date, "2026-11-13");
  assert.deepEqual(next.session.transactions, []);
});

test("retry uses the original session id", async () => {
  const repository = new MemoryLocalRepository();
  let attempts = 0;
  const client = api((session) => {
    attempts += 1;
    if (attempts === 1) {
      throw new ApiRequestError("Failed to fetch", null, null, "network");
    }
    return confirmed(session, 200);
  });
  const service = createEveningService(repository, client, clock());
  await service.startEvening();
  await service.addTransaction({ playerId: "player-001", type: "buy-in", amount: 50 });
  await assert.rejects(() => service.submitEvening());
  const submitted = await service.submitEvening();

  assert.deepEqual(client.calls.map((session) => session.id), ["session-001", "session-001"]);
  assert.equal(submitted.session.id, "session-001");
  assert.equal(submitted.status, "submitted");
});

test("submitting a submitted evening does not send it again", async () => {
  const repository = new MemoryLocalRepository();
  const client = api((session) => confirmed(session, 201));
  const service = createEveningService(repository, client, clock());
  await service.startEvening();
  await service.addTransaction({ playerId: "player-001", type: "buy-in", amount: 50 });
  await service.submitEvening();
  await service.submitEvening();

  assert.equal(client.calls.length, 1);
});

test("edit and delete replace the saved transaction only after the repository confirms", async () => {
  const repository = new MemoryLocalRepository();
  const service = createEveningService(repository, api(() => { throw new Error("unused"); }), clock());
  await service.startEvening();
  const transaction = await service.addTransaction({ playerId: "player-001", type: "buy-in", amount: 50 });

  repository.failNextWrite = true;
  await assert.rejects(
    () => service.updateTransaction({ ...transaction, amount: 80 }),
    /Failed to persist local data/,
  );
  assert.equal((await repository.readActiveSession())?.session.transactions[0]?.amount, 50);

  const updated = await service.updateTransaction({ ...transaction, amount: 80 });
  assert.equal(updated.amount, 80);
  assert.equal(updated.id, transaction.id);

  repository.failNextWrite = true;
  await assert.rejects(() => service.deleteTransaction(transaction.id), /Failed to persist local data/);
  assert.equal((await repository.readActiveSession())?.session.transactions.length, 1);

  await service.deleteTransaction(transaction.id);
  assert.deepEqual((await repository.readActiveSession())?.session.transactions, []);
});

test("an evening without transactions cannot be submitted", async () => {
  const repository = new MemoryLocalRepository();
  const client = api(() => { throw new Error("unused"); });
  const service = createEveningService(repository, client, clock());
  await service.startEvening();

  await assert.rejects(() => service.submitEvening(), EveningError);
  assert.equal((await repository.readActiveSession())?.status, "draft");
  assert.equal(client.calls.length, 0);
});
