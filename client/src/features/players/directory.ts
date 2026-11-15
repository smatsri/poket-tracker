import type { ApiClient } from "../../data/api/client.ts";
import { ApiRequestError } from "../../data/api/errors.ts";
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

export interface PlayerUpdated {
  ok: true;
  player: Player;
  players: Player[];
}

export interface PlayerRemoved {
  ok: true;
  players: Player[];
}

export interface PlayerInUse {
  ok: false;
  reason: "in-use";
  message: string;
  players: Player[];
}

export type PlayerRenameResult = PlayerUpdated | PlayerRejected;
export type PlayerDeleteResult = PlayerRemoved | PlayerInUse | PlayerRejected;

export interface PlayerDirectory {
  load(): Promise<PlayerLoadResult>;
  create(name: string, options?: { confirmDuplicate?: boolean }): Promise<PlayerCreateResult>;
  rename(playerId: string, name: string): Promise<PlayerRenameResult>;
  remove(playerId: string): Promise<PlayerDeleteResult>;
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

    async rename(playerId, name) {
      const players = await repository.readPlayers();
      const normalized = normalizePlayerName(name);
      if (normalized.length === 0) {
        return { ok: false, reason: "rejected", message: "צריך להזין שם שחקן.", players };
      }
      if (normalized.length > maxNameLength) {
        return { ok: false, reason: "rejected", message: "שם השחקן יכול להכיל עד 80 תווים.", players };
      }

      try {
        const player = await api.updatePlayer(playerId, normalized);
        const next = players.some((item) => item.id === player.id)
          ? players.map((item) => (item.id === player.id ? player : item))
          : [...players, player];
        await repository.replacePlayers(next);
        return { ok: true, player, players: next };
      } catch {
        return {
          ok: false,
          reason: "rejected",
          message: "לא הצלחנו לשנות את שם השחקן. אפשר לנסות שוב.",
          players: await repository.readPlayers(),
        };
      }
    },

    async remove(playerId) {
      const players = await repository.readPlayers();
      try {
        await api.deletePlayer(playerId);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 409) {
          return {
            ok: false,
            reason: "in-use",
            message: "אי אפשר למחוק שחקן שכבר השתתף בערב.",
            players,
          };
        }
        return {
          ok: false,
          reason: "rejected",
          message: "לא הצלחנו למחוק את השחקן. אפשר לנסות שוב.",
          players: await repository.readPlayers(),
        };
      }

      const next = players.filter((player) => player.id !== playerId);
      await repository.replacePlayers(next);
      return { ok: true, players: next };
    },
  };
}
