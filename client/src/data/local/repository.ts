import type { ActiveSessionRecord, Player } from "../../domain/models.ts";

export interface LocalRepository {
  readActiveSession(): Promise<ActiveSessionRecord | null>;
  saveActiveSession(record: ActiveSessionRecord): Promise<void>;
  replaceActiveSession(record: ActiveSessionRecord): Promise<void>;
  readPlayers(): Promise<Player[]>;
  replacePlayers(players: readonly Player[]): Promise<void>;
}
