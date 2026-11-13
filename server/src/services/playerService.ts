import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import { insertPlayer, selectPlayers, type StoredPlayer } from "../db/players.js";

export async function createPlayer(name: string): Promise<StoredPlayer> {
  const player: StoredPlayer = {
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };

  await insertPlayer(getDatabase(), player);
  return player;
}

export async function listPlayers(): Promise<StoredPlayer[]> {
  return selectPlayers(getDatabase());
}
