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
  name?: string;
  location?: string;
  note?: string;
  createdAt: string;
  archivedAt?: string;
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
  const sessions = await database.query<{
    id: string;
    date: string;
    name: string | null;
    location: string | null;
    note: string | null;
    createdAt: string;
    archivedAt: string | null;
  }>(
    `SELECT id, "date", name, location, note, created_at AS "createdAt", archived_at AS "archivedAt" FROM sessions WHERE id = $1`,
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

  return storedSession(session, transactions.rows, players.rows);
}

function storedSession(
  session: {
    id: string;
    date: string;
    name: string | null;
    location: string | null;
    note: string | null;
    createdAt: string;
    archivedAt: string | null;
  },
  transactions: StoredTransaction[],
  players: StoredPlayer[],
): StoredSession {
  return {
    id: session.id,
    date: session.date,
    createdAt: session.createdAt,
    transactions,
    players,
    ...(session.name === null ? {} : { name: session.name }),
    ...(session.location === null ? {} : { location: session.location }),
    ...(session.note === null ? {} : { note: session.note }),
    ...(session.archivedAt === null ? {} : { archivedAt: session.archivedAt }),
  };
}

export async function selectSessions(
  database: Sql,
  bounds: { from?: string; to?: string; archived?: boolean },
): Promise<StoredSession[]> {
  const rows = await database.query<{ id: string }>(
    `SELECT id
     FROM sessions
     WHERE ($1::text IS NULL OR "date" >= $1)
       AND ($2::text IS NULL OR "date" <= $2)
       AND (
         ($3::boolean IS TRUE AND archived_at IS NOT NULL)
         OR ($3::boolean IS NOT TRUE AND archived_at IS NULL)
       )
     ORDER BY "date" DESC, created_at DESC, id DESC`,
    [bounds.from ?? null, bounds.to ?? null, bounds.archived === true],
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
  session: { id: string; date: string; createdAt: string; name?: string; location?: string; note?: string },
): Promise<void> {
  await database.query(
    `INSERT INTO sessions (id, "date", created_at, name, location, note) VALUES ($1, $2, $3, $4, $5, $6)`,
    [session.id, session.date, session.createdAt, session.name ?? null, session.location ?? null, session.note ?? null],
  );
}

export async function setSessionArchived(database: Sql, id: string, archivedAt: string | null): Promise<void> {
  await database.query(`UPDATE sessions SET archived_at = $2 WHERE id = $1`, [id, archivedAt]);
}

export async function deleteSessionRows(database: Sql, id: string): Promise<void> {
  await database.query(`DELETE FROM transactions WHERE session_id = $1`, [id]);
  await database.query(`DELETE FROM sessions WHERE id = $1`, [id]);
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
