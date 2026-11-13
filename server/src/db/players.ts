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

export async function selectPlayers(database: Sql): Promise<StoredPlayer[]> {
  const result = await database.query<StoredPlayer>(
    `SELECT id, name, created_at AS "createdAt"
     FROM players
     ORDER BY created_at ASC, id ASC`,
  );
  return result.rows;
}
