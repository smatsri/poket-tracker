import type Database from "better-sqlite3";

export interface StoredPlayer {
  id: string;
  name: string;
  createdAt: string;
}

export function insertPlayer(database: Database.Database, player: StoredPlayer): void {
  database
    .prepare("INSERT INTO players (id, name, created_at) VALUES (?, ?, ?)")
    .run(player.id, player.name, player.createdAt);
}

export function selectPlayers(database: Database.Database): StoredPlayer[] {
  return database
    .prepare(
      `SELECT id, name, created_at AS createdAt
       FROM players
       ORDER BY created_at ASC, id ASC`,
    )
    .all() as StoredPlayer[];
}
