import type { Sql } from "./sql.js";

export interface StoredPlayer {
  id: string;
  name: string;
  createdAt: string;
}

export async function insertPlayer(database: Sql, player: StoredPlayer): Promise<void> {
  await database.query("INSERT INTO players (id, name, created_at) VALUES ($1, $2, $3)", [
    player.id,
    player.name,
    player.createdAt,
  ]);
}

export async function updatePlayerName(database: Sql, id: string, name: string): Promise<StoredPlayer | undefined> {
  const result = await database.query<StoredPlayer>(
    `UPDATE players
     SET name = $2
     WHERE id = $1
     RETURNING id, name, created_at AS "createdAt"`,
    [id, name],
  );
  return result.rows[0];
}

export async function playerIsReferenced(database: Sql, id: string): Promise<boolean> {
  const result = await database.query("SELECT 1 AS present FROM transactions WHERE player_id = $1 LIMIT 1", [id]);
  return result.rows.length > 0;
}

export async function deletePlayer(database: Sql, id: string): Promise<boolean> {
  const result = await database.query<{ id: string }>("DELETE FROM players WHERE id = $1 RETURNING id", [id]);
  return result.rows.length > 0;
}

export async function selectPlayers(database: Sql): Promise<StoredPlayer[]> {
  const result = await database.query<StoredPlayer>(
    `SELECT id, name, created_at AS "createdAt"
     FROM players
     ORDER BY created_at ASC, id ASC`,
  );
  return result.rows;
}
