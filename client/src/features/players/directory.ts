import type { ApiClient } from "../../data/api/client.ts";
import type { LocalRepository } from "../../data/local/repository.ts";
import type { Player } from "../../domain/models.ts";

const nameCollator = new Intl.Collator("he", { sensitivity: "base", usage: "search" });
const maxNameLength = 80;

export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function findMatchingPlayer(name: string, players: readonly Player[]): Player | undefined {
  const normalized = normalizePlayerName(name);
  if (normalized.length === 0) {
    return undefined;
  }

  return players.find((player) => nameCollator.compare(normalizePlayerName(player.name), normalized) === 0);
}

export interface PlayerLoadResult {
  ok: boolean;
  players: Player[];
  source: "server" | "cache";
}

export interface PlayerCreated {
  ok: true;
  player: Player;
  players: Player[];
}

export interface PlayerDuplicate {
  ok: false;
  reason: "duplicate";
  match: Player;
  players: Player[];
}

export interface PlayerRejected {
  ok: false;
  reason: "rejected";
  message: string;
  players: Player[];
}

export type PlayerCreateResult = PlayerCreated | PlayerDuplicate | PlayerRejected;

export interface PlayerDirectory {
  load(): Promise<PlayerLoadResult>;
  create(name: string, options?: { confirmDuplicate?: boolean }): Promise<PlayerCreateResult>;
}

export function createPlayerDirectory(repository: LocalRepository, api: ApiClient): PlayerDirectory {
  return {
    async load() {
      try {
        const players = await api.listPlayers();
        await repository.replacePlayers(players);
        return { ok: true, players, source: "server" };
      } catch {
        return { ok: false, players: await repository.readPlayers(), source: "cache" };
      }
    },

    async create(name, options = {}) {
      const players = await repository.readPlayers();
      const normalized = normalizePlayerName(name);
      if (normalized.length === 0) {
        return { ok: false, reason: "rejected", message: "צריך להזין שם שחקן.", players };
      }
      if (normalized.length > maxNameLength) {
        return { ok: false, reason: "rejected", message: "שם השחקן יכול להכיל עד 80 תווים.", players };
      }

      const match = findMatchingPlayer(normalized, players);
      if (match !== undefined && options.confirmDuplicate !== true) {
        return { ok: false, reason: "duplicate", match, players };
      }

      try {
        const player = await api.createPlayer(normalized);
        const next = [...players.filter((item) => item.id !== player.id), player];
        await repository.replacePlayers(next);
        return { ok: true, player, players: next };
      } catch {
        return {
          ok: false,
          reason: "rejected",
          message: "לא הצלחנו לשמור את השחקן. אפשר לנסות שוב.",
          players: await repository.readPlayers(),
        };
      }
    },
  };
}
