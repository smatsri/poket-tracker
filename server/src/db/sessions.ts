import type Database from "better-sqlite3";
import type { StoredPlayer } from "./players.js";

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

export function missingPlayerIds(database: Database.Database, playerIds: string[]): string[] {
  const exists = database.prepare("SELECT 1 AS present FROM players WHERE id = ?");
  return playerIds.filter((playerId) => exists.get(playerId) === undefined);
}

export function selectSession(database: Database.Database, id: string): StoredSession | undefined {
  const session = database
    .prepare("SELECT id, date, created_at AS createdAt FROM sessions WHERE id = ?")
    .get(id) as { id: string; date: string; createdAt: string } | undefined;

  if (!session) {
    return undefined;
  }

  const transactions = database
    .prepare(
      `SELECT id, player_id AS playerId, type, amount, timestamp
       FROM transactions
       WHERE session_id = ?
       ORDER BY timestamp ASC, id ASC`,
    )
    .all(id) as StoredTransaction[];

  const players = database
    .prepare(
      `SELECT DISTINCT players.id, players.name, players.created_at AS createdAt
       FROM players
       JOIN transactions ON transactions.player_id = players.id
       WHERE transactions.session_id = ?
       ORDER BY players.name ASC, players.id ASC`,
    )
    .all(id) as StoredPlayer[];

  return { ...session, transactions, players };
}

export function selectSessions(
  database: Database.Database,
  bounds: { from?: string; to?: string },
): StoredSession[] {
  const rows = database
    .prepare(
      `SELECT id
       FROM sessions
       WHERE (? IS NULL OR date >= ?)
         AND (? IS NULL OR date <= ?)
       ORDER BY date DESC, created_at DESC, id DESC`,
    )
    .all(bounds.from ?? null, bounds.from ?? null, bounds.to ?? null, bounds.to ?? null) as Array<{ id: string }>;

  return rows.map((row) => {
    const session = selectSession(database, row.id);
    if (!session) {
      throw new Error("Stored session is missing");
    }
    return session;
  });
}

export function insertSession(
  database: Database.Database,
  session: { id: string; date: string; createdAt: string },
): void {
  database
    .prepare("INSERT INTO sessions (id, date, created_at) VALUES (?, ?, ?)")
    .run(session.id, session.date, session.createdAt);
}

export function insertTransaction(
  database: Database.Database,
  sessionId: string,
  transaction: StoredTransaction,
): void {
  database
    .prepare(
      `INSERT INTO transactions (id, session_id, player_id, type, amount, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      transaction.id,
      sessionId,
      transaction.playerId,
      transaction.type,
      transaction.amount,
      transaction.timestamp,
    );
}
