import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import { deletePlayer as deletePlayerRow, insertPlayer, playerIsReferenced, selectPlayers, updatePlayerName, type StoredPlayer } from "../db/players.js";
import { conflict, notFound } from "../http/errors.js";

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

export async function renamePlayer(id: string, name: string): Promise<StoredPlayer> {
  const player = await updatePlayerName(getDatabase(), id, name);
  if (!player) {
    throw notFound("Player not found");
  }
  return player;
}

export async function removePlayer(id: string): Promise<void> {
  const database = getDatabase();
  if (await playerIsReferenced(database, id)) {
    throw conflict("Player has transactions");
  }

  const removed = await deletePlayerRow(database, id);
  if (!removed) {
    throw notFound("Player not found");
  }
}
