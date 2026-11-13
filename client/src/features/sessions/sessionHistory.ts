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

export function parseHistoryLocation(pathname: string): { screen: "list" | "summary"; sessionId: string | null } {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (path === "/history" || path.length === 0) {
    return { screen: "list", sessionId: null };
  }

  const prefix = "/history/";
  if (!path.startsWith(prefix)) {
    return { screen: "list", sessionId: null };
  }

  const sessionId = decodeURIComponent(path.slice(prefix.length));
  if (sessionId.length === 0 || sessionId.includes("/")) {
    return { screen: "list", sessionId: null };
  }

  return { screen: "summary", sessionId };
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
