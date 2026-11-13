import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createSingleFlight } from "./singleFlight.ts";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("a second transaction save started before the first settles does not create a second transaction", async () => {
  const flight = createSingleFlight();
  const pending = deferred();
  let calls = 0;
  const evening = {
    addTransaction: async () => {
      calls += 1;
      await pending.promise;
      return { id: "tx-1" };
    },
  };

  const save = () => flight(() => evening.addTransaction());
  const first = save();
  const second = save();
  assert.equal(calls, 1);
  pending.resolve();
  await first;
  await second;
  assert.equal(calls, 1);

  await save();
  assert.equal(calls, 2);

  const source = readFileSync(new URL("./sessions/TransactionSheet.tsx", import.meta.url), "utf8");
  const guard = source.indexOf("flight.current");
  const create = source.indexOf("addTransaction");
  assert.ok(guard !== -1 && create !== -1 && guard < create);
  assert.match(source, /useRef\(createSingleFlight\(\)\)/);
});

test("a second player save started before the first settles does not create a second player", async () => {
  const flight = createSingleFlight();
  const pending = deferred();
  let calls = 0;
  const directory = {
    create: async () => {
      calls += 1;
      await pending.promise;
      return { id: "player-1" };
    },
  };

  const save = () => flight(() => directory.create());
  const first = save();
  const second = save();
  assert.equal(calls, 1);
  pending.resolve();
  await first;
  await second;
  assert.equal(calls, 1);

  await assert.rejects(() =>
    flight(async () => {
      calls += 1;
      throw new Error("save failed");
    }),
  );
  await flight(async () => {
    calls += 1;
  });
  assert.equal(calls, 3);

  const source = readFileSync(new URL("./players/PlayerPanel.tsx", import.meta.url), "utf8");
  const guard = source.indexOf("flight.current");
  const create = source.indexOf("directory.create");
  assert.ok(guard !== -1 && create !== -1 && guard < create);
  assert.match(source, /useRef\(createSingleFlight\(\)\)/);
});
