import assert from "node:assert/strict";
import test from "node:test";
import type { ApiClient } from "../../data/api/client.ts";
import { ApiRequestError } from "../../data/api/errors.ts";
import { MemoryLocalRepository } from "../../data/local/memoryRepository.ts";
import type { Player } from "../../domain/models.ts";
import { createPlayerDirectory, findMatchingPlayer } from "./directory.ts";

function player(id: string, name: string): Player {
  return { id, name, createdAt: "2026-11-13T18:00:00Z" };
}

function api(handlers: {
  list?: () => Promise<Player[]>;
  create?: (name: string) => Promise<Player>;
}): ApiClient & { created: string[] } {
  const created: string[] = [];
  return {
    created,
    listPlayers: handlers.list ?? (async () => []),
    createPlayer: async (name) => {
      created.push(name);
      if (handlers.create === undefined) {
        throw new Error("create was not expected");
      }
      return handlers.create(name);
    },
    submitSession: async () => {
      throw new Error("unused");
    },
    getSession: async () => {
      throw new Error("unused");
    },
    listSessions: async () => [],
  };
}

test("a successful load displays the server players and refreshes the cache", async () => {
  const repository = new MemoryLocalRepository();
  await repository.replacePlayers([player("old", "ישן")]);
  const serverPlayers = [player("p1", "דנה"), player("p2", "נועה")];
  const directory = createPlayerDirectory(repository, api({ list: async () => serverPlayers }));

  const loaded = await directory.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.source, "server");
  assert.deepEqual(loaded.players, serverPlayers);
  assert.deepEqual(await repository.readPlayers(), serverPlayers);
});

test("after a later load failure, previously cached players remain available", async () => {
  const repository = new MemoryLocalRepository();
  const cached = [player("p1", "דנה")];
  let calls = 0;
  const directory = createPlayerDirectory(
    repository,
    api({
      list: async () => {
        calls += 1;
        if (calls === 1) {
          return cached;
        }
        throw new ApiRequestError("offline", null, null, "network");
      },
    }),
  );

  assert.equal((await directory.load()).ok, true);
  const failed = await directory.load();
  assert.equal(failed.ok, false);
  assert.equal(failed.source, "cache");
  assert.deepEqual(failed.players, cached);
  assert.deepEqual(await repository.readPlayers(), cached);
});

test("a duplicate name warns and can still be created as a distinct player", async () => {
  const repository = new MemoryLocalRepository();
  await repository.replacePlayers([player("p1", "דנה לוי")]);
  const directory = createPlayerDirectory(
    repository,
    api({
      create: async (name) => player("p2", name),
    }),
  );

  const warned = await directory.create("  דנה    לוי ");
  assert.equal(warned.ok, false);
  if (warned.ok || warned.reason !== "duplicate") {
    assert.fail("expected a duplicate warning");
  }
  assert.equal(warned.match.id, "p1");
  assert.deepEqual(await repository.readPlayers(), [player("p1", "דנה לוי")]);

  const created = await directory.create("  דנה    לוי ", { confirmDuplicate: true });
  assert.equal(created.ok, true);
  if (!created.ok) {
    assert.fail("expected the confirmed name to be created");
  }
  assert.equal(created.player.id, "p2");
  assert.equal(created.player.name, "דנה לוי");
  assert.deepEqual(
    created.players.map((item) => item.id),
    ["p1", "p2"],
  );
  assert.equal(findMatchingPlayer("דָּנָה לוי", created.players)?.id, "p1");
  assert.equal(findMatchingPlayer("dana levi", [player("p3", "Dana Levi")])?.id, "p3");
  assert.equal(findMatchingPlayer("דני", created.players), undefined);
});

test("a failed creation leaves no selectable unsaved player", async () => {
  const repository = new MemoryLocalRepository();
  await repository.replacePlayers([player("p1", "דנה")]);
  const directory = createPlayerDirectory(
    repository,
    api({
      create: async () => {
        throw new ApiRequestError("nope", 500, "INTERNAL_ERROR", "http");
      },
    }),
  );

  const failed = await directory.create("נועה");
  assert.equal(failed.ok, false);
  if (failed.ok || failed.reason !== "rejected") {
    assert.fail("expected a rejected creation");
  }
  assert.deepEqual(failed.players, [player("p1", "דנה")]);
  assert.deepEqual(await repository.readPlayers(), [player("p1", "דנה")]);

  const blank = await directory.create("   ");
  assert.equal(blank.ok, false);
  assert.deepEqual(await repository.readPlayers(), [player("p1", "דנה")]);
});

test("the created player is added to the cache and can be selected", async () => {
  const repository = new MemoryLocalRepository();
  const directory = createPlayerDirectory(
    repository,
    api({
      create: async (name) => player("server-id", name),
    }),
  );

  const created = await directory.create("  רועי  ");
  assert.equal(created.ok, true);
  if (!created.ok) {
    assert.fail("expected a created player");
  }
  assert.equal(created.player.id, "server-id");
  assert.equal(created.player.name, "רועי");
  assert.deepEqual(await repository.readPlayers(), [created.player]);
  assert.equal(created.players.find((item) => item.id === "server-id")?.name, "רועי");
});
