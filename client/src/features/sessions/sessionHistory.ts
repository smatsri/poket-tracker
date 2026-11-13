import type { ApiClient, SessionDocument } from "../../data/api/client.ts";
import { ApiRequestError } from "../../data/api/errors.ts";
import { calculateSessionResult } from "../../domain/calculations.ts";
import type { Player } from "../../domain/models.ts";
import { presentResult, type PresentedResult } from "./currentEvening.ts";
import { formatSessionDate } from "./transactionHistory.ts";

export const historyCopy = {
  title: "היסטוריה",
  empty: "אין עדיין ערבים שהסתיימו.",
  loading: "טוען את ההיסטוריה…",
  networkError: "אין חיבור לשרת, ולכן אי אפשר להציג ערבים קודמים.",
  loadError: "השרת לא הצליח להחזיר את הערבים הקודמים.",
  retry: "נסו שוב",
  summaryTitle: "סיכום",
} as const;

export interface HistoryEntry {
  id: string;
  href: string;
  date: string;
  playerCount: number;
  transactionCount: number;
  playersLabel: string;
  transactionsLabel: string;
  result: PresentedResult;
}

export interface HistoryListView {
  title: typeof historyCopy.title;
  status: "empty" | "ready";
  message: string | null;
  entries: HistoryEntry[];
}

export interface HistoryFailureView {
  status: "error";
  message: string;
  canRetry: true;
  retryLabel: typeof historyCopy.retry;
}

export function sessionSummaryPath(sessionId: string): string {
  return `/history/${encodeURIComponent(sessionId)}`;
}

export interface HistoryLocation {
  screen: "list" | "summary" | "transactions" | "player";
  sessionId: string | null;
  playerId: string | null;
}

export function sessionTransactionsPath(sessionId: string): string {
  return `${sessionSummaryPath(sessionId)}/transactions`;
}

export function sessionPlayerPath(sessionId: string, playerId: string): string {
  return `${sessionSummaryPath(sessionId)}/players/${encodeURIComponent(playerId)}`;
}

export function parseHistoryLocation(pathname: string): HistoryLocation {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const list: HistoryLocation = { screen: "list", sessionId: null, playerId: null };
  const prefix = "/history/";
  if (path === "/history" || !path.startsWith(prefix)) {
    return list;
  }

  const parts = path.slice(prefix.length).split("/").map((part) => decodeURIComponent(part));
  const sessionId = parts[0];
  if (sessionId === undefined || sessionId.length === 0) {
    return list;
  }

  if (parts.length === 1) {
    return { screen: "summary", sessionId, playerId: null };
  }

  if (parts.length === 2 && parts[1] === "transactions") {
    return { screen: "transactions", sessionId, playerId: null };
  }

  const playerId = parts[2];
  if (parts.length === 3 && parts[1] === "players" && playerId !== undefined && playerId.length > 0) {
    return { screen: "player", sessionId, playerId };
  }

  return list;
}

export function presentSessionHistory(documents: readonly SessionDocument[]): HistoryListView {
  if (documents.length === 0) {
    return { title: historyCopy.title, status: "empty", message: historyCopy.empty, entries: [] };
  }

  return {
    title: historyCopy.title,
    status: "ready",
    message: null,
    entries: [...documents].sort(newestFirst).map(presentEntry),
  };
}

export function presentHistoryFailure(error: unknown): HistoryFailureView {
  const offline = error instanceof ApiRequestError && error.kind === "network";
  return {
    status: "error",
    message: offline ? historyCopy.networkError : historyCopy.loadError,
    canRetry: true,
    retryLabel: historyCopy.retry,
  };
}

export function loadSessionHistory(api: Pick<ApiClient, "listSessions">): Promise<SessionDocument[]> {
  return api.listSessions();
}

function presentEntry(document: SessionDocument): HistoryEntry {
  const result = calculateSessionResult(document.session);
  const playerCount = distinctPlayerCount(document.players);
  const transactionCount = document.session.transactions.length;
  return {
    id: document.session.id,
    href: sessionSummaryPath(document.session.id),
    date: formatSessionDate(document.session.date),
    playerCount,
    transactionCount,
    playersLabel: `שחקנים: ${playerCount}`,
    transactionsLabel: `פעולות: ${transactionCount}`,
    result: presentResult(result.sessionBalance),
  };
}

function distinctPlayerCount(players: readonly Player[]): number {
  return new Set(players.map((player) => player.id)).size;
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
