import type { StoredPlayer } from "./players.js";
import type { Sql } from "./sql.js";

export interface StoredTransaction {
  id: string;
  playerId: string;
  type: "buy-in" | "rebuy" | "cash-out";
  amount: number;
  timestamp: string;
}

export interface StoredSession {
  id: string;
  date: string;
  createdAt: string;
  transactions: StoredTransaction[];
  players: StoredPlayer[];
}

export async function missingPlayerIds(database: Sql, playerIds: string[]): Promise<string[]> {
  const missing: string[] = [];
  for (const playerId of playerIds) {
    const result = await database.query("SELECT 1 AS present FROM players WHERE id = $1", [playerId]);
    if (result.rows.length === 0) {
      missing.push(playerId);
    }
  }
  return missing;
}

export async function selectSession(database: Sql, id: string): Promise<StoredSession | undefined> {
  const sessions = await database.query<{ id: string; date: string; createdAt: string }>(
    `SELECT id, "date", created_at AS "createdAt" FROM sessions WHERE id = $1`,
    [id],
  );
  const session = sessions.rows[0];
  if (!session) {
    return undefined;
  }

  const transactions = await database.query<StoredTransaction>(
    `SELECT id, player_id AS "playerId", type, amount, "timestamp"
     FROM transactions
     WHERE session_id = $1
     ORDER BY "timestamp" ASC, id ASC`,
    [id],
  );

  const players = await database.query<StoredPlayer>(
    `SELECT DISTINCT players.id, players.name, players.created_at AS "createdAt"
     FROM players
     JOIN transactions ON transactions.player_id = players.id
     WHERE transactions.session_id = $1
     ORDER BY players.name ASC, players.id ASC`,
    [id],
  );

  return { ...session, transactions: transactions.rows, players: players.rows };
}

export async function selectSessions(
  database: Sql,
  bounds: { from?: string; to?: string },
): Promise<StoredSession[]> {
  const rows = await database.query<{ id: string }>(
    `SELECT id
     FROM sessions
     WHERE ($1::text IS NULL OR "date" >= $1)
       AND ($2::text IS NULL OR "date" <= $2)
     ORDER BY "date" DESC, created_at DESC, id DESC`,
    [bounds.from ?? null, bounds.to ?? null],
  );

  const sessions: StoredSession[] = [];
  for (const row of rows.rows) {
    const session = await selectSession(database, row.id);
    if (!session) {
      throw new Error("Stored session is missing");
    }
    sessions.push(session);
  }
  return sessions;
}

export async function insertSession(
  database: Sql,
  session: { id: string; date: string; createdAt: string },
): Promise<void> {
  await database.query(`INSERT INTO sessions (id, "date", created_at) VALUES ($1, $2, $3)`, [
    session.id,
    session.date,
    session.createdAt,
  ]);
}

export async function insertTransaction(
  database: Sql,
  sessionId: string,
  transaction: StoredTransaction,
): Promise<void> {
  await database.query(
    `INSERT INTO transactions (id, session_id, player_id, type, amount, "timestamp")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      transaction.id,
      sessionId,
      transaction.playerId,
      transaction.type,
      transaction.amount,
      transaction.timestamp,
    ],
  );
}
