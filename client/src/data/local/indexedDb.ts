import type { ActiveSessionRecord, Player } from "../../domain/models.ts";
import type { LocalRepository } from "./repository.ts";

export const databaseName = "poker-tracker";
export const databaseVersion = 1;
export const activeSessionStore = "activeSession";
export const playersStore = "players";
export const currentSessionKey = "current";

const persistenceError = "Failed to persist local data";

export function createIndexedDbRepository(factory: IDBFactory = indexedDB): LocalRepository {
  return {
    readActiveSession(): Promise<ActiveSessionRecord | null> {
      return withDatabase(factory, async (database) => {
        const transaction = database.transaction(activeSessionStore, "readonly");
        const completed = waitForTransaction(transaction);
        const stored = await requestResult<ActiveSessionRecord | undefined>(
          transaction.objectStore(activeSessionStore).get(currentSessionKey),
        );
        await completed;
        return stored ?? null;
      });
    },

    saveActiveSession(record: ActiveSessionRecord): Promise<void> {
      return writeActiveSession(factory, record);
    },

    replaceActiveSession(record: ActiveSessionRecord): Promise<void> {
      return writeActiveSession(factory, record);
    },

    readPlayers(): Promise<Player[]> {
      return withDatabase(factory, async (database) => {
        const transaction = database.transaction(playersStore, "readonly");
        const completed = waitForTransaction(transaction);
        const players = await requestResult<Player[]>(transaction.objectStore(playersStore).getAll());
        await completed;
        return players;
      });
    },

    replacePlayers(players: readonly Player[]): Promise<void> {
      return withDatabase(factory, async (database) => {
        const transaction = database.transaction(playersStore, "readwrite");
        const completed = waitForTransaction(transaction);
        const store = transaction.objectStore(playersStore);
        store.clear();
        for (const player of players) {
          store.put(player);
        }
        await completed;
      });
    },
  };
}

function writeActiveSession(factory: IDBFactory, record: ActiveSessionRecord): Promise<void> {
  return withDatabase(factory, async (database) => {
    const transaction = database.transaction(activeSessionStore, "readwrite");
    const completed = waitForTransaction(transaction);
    transaction.objectStore(activeSessionStore).put(record, currentSessionKey);
    await completed;
  });
}

async function withDatabase<T>(factory: IDBFactory, run: (database: IDBDatabase) => Promise<T>): Promise<T> {
  const database = await openDatabase(factory);
  try {
    return await run(database);
  } finally {
    database.close();
  }
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(activeSessionStore)) {
        database.createObjectStore(activeSessionStore);
      }
      if (!database.objectStoreNames.contains(playersStore)) {
        database.createObjectStore(playersStore, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open the local database"));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(persistenceError));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error(persistenceError));
    transaction.onerror = () => reject(transaction.error ?? new Error(persistenceError));
  });
}
