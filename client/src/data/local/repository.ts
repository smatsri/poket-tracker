import type { ActiveSessionRecord, Player } from "../../domain/models.ts";
import type { OperatorSettings } from "./operatorSettings.ts";

export interface LocalRepository {
  readActiveSession(): Promise<ActiveSessionRecord | null>;
  saveActiveSession(record: ActiveSessionRecord): Promise<void>;
  replaceActiveSession(record: ActiveSessionRecord): Promise<void>;
  clearActiveSession(): Promise<void>;
  readPlayers(): Promise<Player[]>;
  replacePlayers(players: readonly Player[]): Promise<void>;
  readOperatorSettings(): Promise<OperatorSettings>;
  saveOperatorSettings(settings: OperatorSettings): Promise<void>;
}
