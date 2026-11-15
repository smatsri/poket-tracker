import type { ActiveSessionRecord, Player, Session } from "../../domain/models.ts";
import type { OperatorSettings } from "./operatorSettings.ts";

export interface CachedSessionDocument {
  session: Session;
  players: Player[];
}

export interface LocalRepository {
  readActiveSession(): Promise<ActiveSessionRecord | null>;
  saveActiveSession(record: ActiveSessionRecord): Promise<void>;
  replaceActiveSession(record: ActiveSessionRecord): Promise<void>;
  clearActiveSession(): Promise<void>;
  readPlayers(): Promise<Player[]>;
  replacePlayers(players: readonly Player[]): Promise<void>;
  readOperatorSettings(): Promise<OperatorSettings>;
  saveOperatorSettings(settings: OperatorSettings): Promise<void>;
  readClosedSessions(): Promise<CachedSessionDocument[]>;
  readClosedSession(sessionId: string): Promise<CachedSessionDocument | null>;
  replaceClosedSessions(documents: readonly CachedSessionDocument[]): Promise<void>;
  saveClosedSession(document: CachedSessionDocument): Promise<void>;
}
