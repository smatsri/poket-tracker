import type { ActiveSessionRecord, Player } from "../../domain/models.ts";
import type { LocalRepository } from "./repository.ts";

export class MemoryLocalRepository implements LocalRepository {
  private activeSession: ActiveSessionRecord | null = null;
  private players: Player[] = [];
  failNextWrite = false;

  async readActiveSession(): Promise<ActiveSessionRecord | null> {
    return clone(this.activeSession);
  }

  async saveActiveSession(record: ActiveSessionRecord): Promise<void> {
    this.rejectIfFailing();
    this.activeSession = clone(record);
  }

  async replaceActiveSession(record: ActiveSessionRecord): Promise<void> {
    await this.saveActiveSession(record);
  }

  async readPlayers(): Promise<Player[]> {
    return clone(this.players);
  }

  async replacePlayers(players: readonly Player[]): Promise<void> {
    this.rejectIfFailing();
    this.players = clone([...players]);
  }

  private rejectIfFailing(): void {
    if (!this.failNextWrite) {
      return;
    }

    this.failNextWrite = false;
    throw new Error("Failed to persist local data");
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
