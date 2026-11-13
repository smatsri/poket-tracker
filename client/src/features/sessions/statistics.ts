import type { ApiClient, SessionDocument } from "../../data/api/client.ts";
import { ApiRequestError } from "../../data/api/errors.ts";
import { calculatePlayerResults, rankOverallResults } from "../../domain/calculations.ts";
import type { Player, Session } from "../../domain/models.ts";
import { presentResult, type PresentedResult } from "./currentEvening.ts";
import { sessionSummaryPath } from "./sessionHistory.ts";
import { formatSessionDate } from "./transactionHistory.ts";

export const statsCopy = {
  title: "סיכומים",
  empty: "אין עדיין ערבים שהסתיימו.",
  loading: "טוען את הסיכומים…",
  sessions: "ערבים",
  transactions: "פעולות",
  players: "שחקנים",
  back: "חזרה לסיכומים",
  missingPlayer: "לשחקן הזה אין ערבים שהסתיימו.",
  networkError: "אין חיבור לשרת, ולכן אי אפשר להציג את הסיכומים.",
  loadError: "השרת לא הצליח להחזיר את הסיכומים.",
  retry: "נסו שוב",
} as const;

export interface RankedPlayerRow {
  playerId: string;
  name: string;
  href: string;
  result: PresentedResult;
}

export interface StatisticsView {
  title: typeof statsCopy.title;
  status: "empty" | "ready";
  message: string | null;
  sessionCount: number;
  transactionCount: number;
  sessionsLabel: string;
  transactionsLabel: string;
  players: RankedPlayerRow[];
}

export interface PlayerEveningRow {
  sessionId: string;
  href: string;
  date: string;
  result: PresentedResult;
}

export interface PlayerStatisticsView {
  playerId: string;
  name: string;
  overall: PresentedResult;
  evenings: PlayerEveningRow[];
}

export interface StatisticsFailureView {
  status: "error";
  message: string;
  canRetry: true;
  retryLabel: typeof statsCopy.retry;
}

export interface StatisticsLocation {
  screen: "list" | "player";
  playerId: string | null;
}

export function statsPlayerPath(playerId: string): string {
  return `/stats/${encodeURIComponent(playerId)}`;
}

export function parseStatsLocation(pathname: string): StatisticsLocation {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const list: StatisticsLocation = { screen: "list", playerId: null };
  const prefix = "/stats/";
  if (path === "/stats" || !path.startsWith(prefix)) {
    return list;
  }

  const playerId = decodeURIComponent(path.slice(prefix.length));
  if (playerId.length === 0 || playerId.includes("/")) {
    return list;
  }

  return { screen: "player", playerId };
}

export function presentStatistics(documents: readonly SessionDocument[]): StatisticsView {
  const sessionCount = documents.length;
  const transactionCount = documents.reduce((sum, document) => sum + document.session.transactions.length, 0);
  if (sessionCount === 0) {
    return {
      title: statsCopy.title,
      status: "empty",
      message: statsCopy.empty,
      sessionCount: 0,
      transactionCount: 0,
      sessionsLabel: `${statsCopy.sessions}: 0`,
      transactionsLabel: `${statsCopy.transactions}: 0`,
      players: [],
    };
  }

  return {
    title: statsCopy.title,
    status: "ready",
    message: null,
    sessionCount,
    transactionCount,
    sessionsLabel: `${statsCopy.sessions}: ${sessionCount}`,
    transactionsLabel: `${statsCopy.transactions}: ${transactionCount}`,
    players: rankOverallResults(sessionsOf(documents), playersOf(documents)).map((player) => ({
      playerId: player.playerId,
      name: player.name.length > 0 ? player.name : player.playerId,
      href: statsPlayerPath(player.playerId),
      result: presentResult(player.netResult),
    })),
  };
}

export function presentPlayerStatistics(documents: readonly SessionDocument[], playerId: string): PlayerStatisticsView | null {
  const names = new Map(playersOf(documents).map((player) => [player.id, player.name]));
  const evenings = [...documents]
    .sort(newestFirst)
    .flatMap((document) => {
      const result = calculatePlayerResults(document.session.transactions).find((player) => player.playerId === playerId);
      if (result === undefined) {
        return [];
      }

      return [
        {
          sessionId: document.session.id,
          href: sessionSummaryPath(document.session.id),
          date: formatSessionDate(document.session.date),
          result: presentResult(result.netResult),
        },
      ];
    });

  if (evenings.length === 0) {
    return null;
  }

  const name = names.get(playerId);
  return {
    playerId,
    name: name !== undefined && name.length > 0 ? name : playerId,
    overall: presentResult(evenings.reduce((sum, evening) => sum + evening.result.value, 0)),
    evenings,
  };
}

export function presentStatisticsFailure(error: unknown): StatisticsFailureView {
  const offline = error instanceof ApiRequestError && error.kind === "network";
  return {
    status: "error",
    message: offline ? statsCopy.networkError : statsCopy.loadError,
    canRetry: true,
    retryLabel: statsCopy.retry,
  };
}

export function loadStatistics(api: Pick<ApiClient, "listSessions">): Promise<SessionDocument[]> {
  return api.listSessions();
}

function sessionsOf(documents: readonly SessionDocument[]): Session[] {
  return documents.map((document) => document.session);
}

function playersOf(documents: readonly SessionDocument[]): Player[] {
  const players = new Map<string, Player>();
  for (const document of documents) {
    for (const player of document.players) {
      if (!players.has(player.id)) {
        players.set(player.id, player);
      }
    }
  }

  return [...players.values()];
}

function newestFirst(left: SessionDocument, right: SessionDocument): number {
  if (left.session.date !== right.session.date) {
    return right.session.date.localeCompare(left.session.date);
  }

  if (left.session.createdAt !== right.session.createdAt) {
    return right.session.createdAt.localeCompare(left.session.createdAt);
  }

  return right.session.id.localeCompare(left.session.id);
}
