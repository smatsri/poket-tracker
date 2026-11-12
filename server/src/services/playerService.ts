import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import { insertPlayer, selectPlayers, type StoredPlayer } from "../db/players.js";

export function createPlayer(name: string): StoredPlayer {
  const player: StoredPlayer = {
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };

  insertPlayer(getDatabase(), player);
  return player;
}

export function listPlayers(): StoredPlayer[] {
  return selectPlayers(getDatabase());
}
