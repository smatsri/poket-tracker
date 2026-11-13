import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";
import { applyMigrations } from "./migrate.js";
import type { Database, QueryInterceptor, QueryResult, Sql } from "./sql.js";

interface Executor {
  query<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(text: string): Promise<void>;
}

let appDatabase: Database | undefined;

export async function openAppDatabase(connectionString: string): Promise<Database> {
  if (appDatabase) {
    throw new Error("Database is already open");
  }

  appDatabase = await createPoolDatabase(connectionString);
  return appDatabase;
}

export async function openTestDatabase(): Promise<Database> {
  if (appDatabase) {
    throw new Error("Database is already open");
  }

  appDatabase = await createPgliteDatabase();
  return appDatabase;
}

export async function createPgliteDatabase(): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pglite = new PGlite("memory://");
  await pglite.waitReady;

  const database = createDatabase({
    executor: {
      async query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
        const result = await pglite.query<T>(text, params);
        return { rows: result.rows };
      },
      async exec(text: string): Promise<void> {
        await pglite.exec(text);
      },
    },
    async transaction(run, wrap) {
      return pglite.transaction(async (tx) =>
        run(
          wrap({
            async query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
              const result = await tx.query<T>(text, params);
              return { rows: result.rows };
            },
            async exec(text: string): Promise<void> {
              await tx.exec(text);
            },
          }),
        ),
      );
    },
    close: () => pglite.close(),
  });

  await applyMigrations(database);
  return database;
}

export function getDatabase(): Database {
  if (!appDatabase) {
    throw new Error("Database is not open");
  }

  return appDatabase;
}

export async function closeDatabase(): Promise<void> {
  if (!appDatabase) {
    return;
  }

  const database = appDatabase;
  appDatabase = undefined;
  await database.close();
}

function createPoolDatabase(connectionString: string): Promise<Database> {
  const pool = new Pool(poolConfig(connectionString));
  pool.on("error", (error: Error) => {
    console.error("PostgreSQL pool error", error);
  });

  const database = createDatabase({
    executor: pgExecutor(pool),
    async transaction(run, wrap) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        try {
          const result = await run(wrap(pgExecutor(client)));
          await client.query("COMMIT");
          return result;
        } catch (error) {
          try {
            await client.query("ROLLBACK");
          } catch (rollbackError) {
            console.error("PostgreSQL rollback failed", rollbackError);
          }
          throw error;
        }
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  });

  return applyMigrations(database).then(() => database);
}

function createDatabase(handlers: {
  executor: Executor;
  transaction<T>(run: (sql: Sql) => Promise<T>, wrap: (executor: Executor) => Sql): Promise<T>;
  close(): Promise<void>;
}): Database {
  let interceptor: QueryInterceptor | undefined;

  const wrap = (executor: Executor): Sql => ({
    async query<T>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
      const intercepted = interceptor?.(text, params);
      if (intercepted) {
        return { rows: intercepted.rows as T[] };
      }

      const result = await executor.query<T & QueryResultRow>(text, params);
      return { rows: result.rows };
    },
    exec(text: string): Promise<void> {
      return executor.exec(text);
    },
  });

  return {
    query: (text, params) => wrap(handlers.executor).query(text, params),
    exec: (text) => handlers.executor.exec(text),
    transaction: (run) => handlers.transaction(run, wrap),
    setQueryInterceptor(next: QueryInterceptor | undefined): void {
      interceptor = next;
    },
    close: handlers.close,
  };
}

function pgExecutor(client: Pool | PoolClient): Executor {
  return {
    async query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
      const result = await client.query<T>(text, params);
      return { rows: result.rows };
    },
    async exec(text: string): Promise<void> {
      await client.query(text);
    },
  };
}

function poolConfig(connectionString: string): PoolConfig {
  return {
    connectionString,
    max: 3,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    ssl: tlsOptions(connectionString),
  };
}

function tlsOptions(connectionString: string): PoolConfig["ssl"] {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode === "disable") {
    return false;
  }
  if (sslmode === "allow" || sslmode === "prefer" || sslmode === "require") {
    return { rejectUnauthorized: false };
  }
  if (sslmode === "verify-ca" || sslmode === "verify-full") {
    return { rejectUnauthorized: true };
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return false;
  }

  return { rejectUnauthorized: true };
}
