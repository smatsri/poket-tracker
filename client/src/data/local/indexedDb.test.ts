import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { ActiveSessionRecord, Player } from "../../domain/models.ts";
import { activeSessionStore, createIndexedDbRepository, currentSessionKey, playersStore } from "./indexedDb.ts";

const createdAt = "2026-11-12T21:00:00Z";

const record: ActiveSessionRecord = {
  status: "draft",
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
        type: "buy-in",
        amount: 100,
        timestamp: "2026-11-12T18:15:00Z",
      },
    ],
  },
};

const avi: Player = { id: "avi", name: "אבי", createdAt };
const dana: Player = { id: "dana", name: "דנה", createdAt };

test("saving and reopening the database returns the same session, transactions, and status", async () => {
  const fake = createFakeIndexedDb();
  const repository = createIndexedDbRepository(fake.factory);

  await repository.saveActiveSession(record);
  assert.deepEqual(fake.storedActiveSession(), record);

  const reopened = createIndexedDbRepository(fake.factory);
  assert.deepEqual(await reopened.readActiveSession(), record);
});

test("replacing the active session overwrites the current record", async () => {
  const repository = createIndexedDbRepository(createFakeIndexedDb().factory);
  await repository.saveActiveSession(record);

  const replacement: ActiveSessionRecord = { ...record, status: "pending", updatedAt: "2026-11-12T22:00:00Z" };
  await repository.replaceActiveSession(replacement);

  assert.deepEqual(await repository.readActiveSession(), replacement);
});

test("replacing the player cache removes players that were not in the replacement list", async () => {
  const repository = createIndexedDbRepository(createFakeIndexedDb().factory);
  await repository.replacePlayers([avi, dana]);
  await repository.replacePlayers([dana]);

  assert.deepEqual(await repository.readPlayers(), [dana]);
});

test("a failed write is reported and leaves the previous record in place", async () => {
  const fake = createFakeIndexedDb();
  const repository = createIndexedDbRepository(fake.factory);
  await repository.saveActiveSession(record);
  await repository.replacePlayers([avi, dana]);

  fake.failNextWrite();
  await assert.rejects(() => repository.saveActiveSession({ ...record, status: "pending" }), /Failed to persist local data/);
  assert.deepEqual(await repository.readActiveSession(), record);

  fake.failNextWrite();
  await assert.rejects(() => repository.replacePlayers([dana]), /Failed to persist local data/);
  assert.deepEqual(await repository.readPlayers(), [avi, dana]);
});

test("the local repository does not calculate financial results", () => {
  const directory = dirname(fileURLToPath(import.meta.url));
  const sources = readdirSync(directory).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
  for (const name of sources) {
    const source = readFileSync(join(directory, name), "utf8");
    assert.equal(source.includes("calculateSessionResult"), false, name);
    assert.equal(source.includes("netResult"), false, name);
  }
});

interface StoreState {
  keyPath: string | null;
  records: Map<string, unknown>;
}

interface DatabaseState {
  version: number;
  stores: Map<string, StoreState>;
}

interface MutableRequest<T> {
  result: T;
  error: DOMException | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onupgradeneeded?: ((event: Event) => void) | null;
}

function createFakeIndexedDb(): {
  factory: IDBFactory;
  failNextWrite(): void;
  storedActiveSession(): ActiveSessionRecord | undefined;
} {
  const databases = new Map<string, DatabaseState>();
  const failure = { pending: false };

  const factory = {
    open(name: string, version: number) {
      const request = createRequest<IDBDatabase>();
      queueMicrotask(() => {
        let database = databases.get(name);
        if (database === undefined) {
          database = { version: 0, stores: new Map() };
          databases.set(name, database);
        }

        const opened = new FakeDatabase(database, failure);
        request.result = opened as unknown as IDBDatabase;
        if (database.version < version) {
          request.onupgradeneeded?.(new Event("upgradeneeded"));
          database.version = version;
        }
        request.onsuccess?.(new Event("success"));
      });
      return request as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;

  return {
    factory,
    failNextWrite() {
      failure.pending = true;
    },
    storedActiveSession() {
      const stored = databases.get("poker-tracker")?.stores.get(activeSessionStore)?.records.get(currentSessionKey);
      return stored === undefined ? undefined : structuredClone(stored as ActiveSessionRecord);
    },
  };
}

function createRequest<T>(): MutableRequest<T> {
  return {
    result: undefined as T,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  };
}

class FakeDatabase {
  private readonly state: DatabaseState;
  private readonly failure: { pending: boolean };

  constructor(state: DatabaseState, failure: { pending: boolean }) {
    this.state = state;
    this.failure = failure;
  }

  readonly objectStoreNames = {
    contains: (name: string) => this.state.stores.has(name),
  };

  createObjectStore(name: string, parameters?: IDBObjectStoreParameters): void {
    const keyPath = typeof parameters?.keyPath === "string" ? parameters.keyPath : null;
    this.state.stores.set(name, { keyPath, records: new Map() });
  }

  transaction(storeName: string): FakeTransaction {
    const store = this.state.stores.get(storeName);
    if (store === undefined) {
      throw new Error(`Missing store ${storeName}`);
    }
    return new FakeTransaction(store, this.failure);
  }

  close(): void {}
}

class FakeTransaction {
  error: DOMException | null = null;
  oncomplete: ((event: Event) => void) | null = null;
  onabort: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private readonly store: StoreState;
  private readonly failure: { pending: boolean };
  private readonly snapshot: Map<string, unknown>;
  private aborted = false;
  private finishQueued = false;

  constructor(store: StoreState, failure: { pending: boolean }) {
    this.store = store;
    this.failure = failure;
    this.snapshot = new Map(store.records);
  }

  objectStore(name: string): FakeObjectStore {
    if (name !== activeSessionStore && name !== playersStore) {
      throw new Error(`Unexpected store ${name}`);
    }
    return new FakeObjectStore(this);
  }

  get(key: string): IDBRequest<unknown> {
    const request = bareRequest<unknown>();
    this.queue(() => {
      request.result = this.store.records.has(key) ? structuredClone(this.store.records.get(key)) : undefined;
      request.onsuccess?.(new Event("success"));
    });
    return request as unknown as IDBRequest<unknown>;
  }

  getAll(): IDBRequest<unknown[]> {
    const request = bareRequest<unknown[]>();
    this.queue(() => {
      request.result = [...this.store.records.keys()]
        .sort()
        .map((key) => structuredClone(this.store.records.get(key)));
      request.onsuccess?.(new Event("success"));
    });
    return request as unknown as IDBRequest<unknown[]>;
  }

  put(value: unknown, key?: string): IDBRequest<IDBValidKey> {
    const request = bareRequest<IDBValidKey>();
    this.queue(() => {
      if (this.aborted) {
        return;
      }
      if (this.takeFailure()) {
        this.abort();
        request.error = this.error;
        request.onerror?.(new Event("error"));
        return;
      }

      const storedKey = key ?? keyFromPath(this.store, value);
      this.store.records.set(storedKey, structuredClone(value));
      request.result = storedKey;
      request.onsuccess?.(new Event("success"));
    });
    return request as unknown as IDBRequest<IDBValidKey>;
  }

  clear(): IDBRequest<undefined> {
    const request = bareRequest<undefined>();
    this.queue(() => {
      if (this.aborted) {
        return;
      }
      if (this.takeFailure()) {
        this.abort();
        request.error = this.error;
        request.onerror?.(new Event("error"));
        return;
      }

      this.store.records.clear();
      request.onsuccess?.(new Event("success"));
    });
    return request as unknown as IDBRequest<undefined>;
  }

  private queue(work: () => void): void {
    queueMicrotask(() => {
      work();
      this.finish();
    });
  }

  private finish(): void {
    if (this.finishQueued) {
      return;
    }
    this.finishQueued = true;
    queueMicrotask(() => {
      if (this.aborted) {
        this.onabort?.(new Event("abort"));
        this.onerror?.(new Event("error"));
        return;
      }
      this.oncomplete?.(new Event("complete"));
    });
  }

  private takeFailure(): boolean {
    if (!this.failure.pending) {
      return false;
    }

    this.failure.pending = false;
    return true;
  }

  private abort(): void {
    this.aborted = true;
    this.error = new DOMException("Failed to persist local data", "AbortError");
    this.store.records.clear();
    for (const [key, value] of this.snapshot) {
      this.store.records.set(key, value);
    }
  }
}

class FakeObjectStore {
  private readonly transaction: FakeTransaction;

  constructor(transaction: FakeTransaction) {
    this.transaction = transaction;
  }

  get(key: string): IDBRequest<unknown> {
    return this.transaction.get(key);
  }

  getAll(): IDBRequest<unknown[]> {
    return this.transaction.getAll();
  }

  put(value: unknown, key?: string): IDBRequest<IDBValidKey> {
    return this.transaction.put(value, key);
  }

  clear(): IDBRequest<undefined> {
    return this.transaction.clear();
  }
}

function bareRequest<T>(): MutableRequest<T> {
  return {
    result: undefined as T,
    error: null,
    onsuccess: null,
    onerror: null,
  };
}

function keyFromPath(store: StoreState, value: unknown): string {
  if (store.keyPath === null || typeof value !== "object" || value === null || !(store.keyPath in value)) {
    throw new Error("Object store value is missing its key");
  }
  return String((value as Record<string, unknown>)[store.keyPath]);
}
