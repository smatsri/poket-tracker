import type { ApiClient, SessionDocument } from "../../data/api/client.ts";
import { ApiRequestError } from "../../data/api/errors.ts";
import type { LocalRepository } from "../../data/local/repository.ts";
import { calculateSessionResult, compareRankedResults } from "../../domain/calculations.ts";
import type { PlayerSessionResult } from "../../domain/models.ts";
import { presentPlayerResult, presentResult, type PresentedPlayerRow, type PresentedResult } from "./currentEvening.ts";
import { sessionPlayerPath, sessionTransactionsPath } from "./sessionHistory.ts";
import { presentTransactionHistory, type PresentedTransaction } from "./transactionHistory.ts";

const amountFormat = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });

export const summaryCopy = {
  title: "סיכום",
  loading: "טוען את הסיכום…",
  back: "חזרה להיסטוריה",
  backToSummary: "חזרה לסיכום",
  transactions: "כל הפעולות",
  buyIns: "כניסות",
  cashOuts: "יציאות",
  balance: "מאזן",
  players: "שחקנים",
  transactionCount: "פעולות",
  notFound: "הערב לא נמצא.",
  missingPlayer: "לשחקן הזה אין פעולות בערב הזה.",
  networkError: "אין חיבור לשרת, ולכן אי אפשר להציג את סיכום הערב.",
  cachedNotice: "אין חיבור לשרת. מוצג הסיכום שנשמר במכשיר.",
  loadError: "השרת לא הצליח להחזיר את סיכום הערב.",
  retry: "נסו שוב",
  emptyTransactions: "אין פעולות בערב הזה.",
} as const;

export interface SummaryPlayerRow extends PresentedPlayerRow {
  href: string;
}

export interface SessionSummaryView {
  canChange: false;
  sessionId: string;
  heading: string;
  date: string;
  location?: string;
  totalBuyIns: string;
  totalCashOuts: string;
  balance: PresentedResult;
  playerCount: number;
  transactionCount: number;
  playersLabel: string;
  transactionsLabel: string;
  players: SummaryPlayerRow[];
  transactions: PresentedTransaction[];
  transactionsHref: string;
  summaryHref: string;
}

export interface SessionPlayerView {
  canChange: false;
  name: string;
  net: PresentedResult;
  buyIns: string;
  cashOuts: string;
  transactions: PresentedTransaction[];
  summaryHref: string;
}

export type SummaryFailureView =
  | { status: "not-found"; message: string; backLabel: string; backHref: "/history" }
  | { status: "error"; message: string; canRetry: true; retryLabel: string; backLabel: string; backHref: "/history" };

export type SummaryScreenView =
  | { status: "loading" }
  | { status: "ready"; document: SessionDocument; notice: string | null }
  | SummaryFailureView;

export function presentSessionSummary(document: SessionDocument): SessionSummaryView {
  const result = calculateSessionResult(document.session);
  const history = presentTransactionHistory(document.session, document.players, "readonly");
  const playerCount = new Set(document.players.map((player) => player.id)).size;

  return {
    canChange: false,
    sessionId: document.session.id,
    heading: document.session.name ?? history.date,
    date: history.date,
    ...(document.session.location === undefined ? {} : { location: document.session.location }),
    totalBuyIns: amountFormat.format(result.sessionBuyIns),
    totalCashOuts: amountFormat.format(result.sessionCashOuts),
    balance: presentResult(result.sessionBalance),
    playerCount,
    transactionCount: document.session.transactions.length,
    playersLabel: `${summaryCopy.players}: ${playerCount}`,
    transactionsLabel: `${summaryCopy.transactionCount}: ${document.session.transactions.length}`,
    players: [...result.players]
      .sort((left, right) =>
        compareRankedResults(
          { netResult: left.netResult, name: storedPlayerName(left.playerId, document.players), playerId: left.playerId },
          { netResult: right.netResult, name: storedPlayerName(right.playerId, document.players), playerId: right.playerId },
        ),
      )
      .map((player) => presentSummaryPlayer(document.session.id, player, document.players)),
    transactions: history.transactions,
    transactionsHref: sessionTransactionsPath(document.session.id),
    summaryHref: `/history/${encodeURIComponent(document.session.id)}`,
  };
}

export function presentSessionPlayer(document: SessionDocument, playerId: string): SessionPlayerView | null {
  const summary = presentSessionSummary(document);
  const row = summary.players.find((player) => player.playerId === playerId);
  if (row === undefined) {
    return null;
  }

  return {
    canChange: false,
    name: row.name,
    net: row.net,
    buyIns: row.totalBuyIns,
    cashOuts: row.totalCashOuts,
    transactions: summary.transactions.filter((transaction) => transaction.playerId === playerId),
    summaryHref: summary.summaryHref,
  };
}

export function presentSummaryFailure(error: unknown): SummaryFailureView {
  if (error instanceof ApiRequestError && (error.status === 404 || error.code === "NOT_FOUND")) {
    return { status: "not-found", message: summaryCopy.notFound, backLabel: summaryCopy.back, backHref: "/history" };
  }

  const offline = error instanceof ApiRequestError && error.kind === "network";
  return {
    status: "error",
    message: offline ? summaryCopy.networkError : summaryCopy.loadError,
    canRetry: true,
    retryLabel: summaryCopy.retry,
    backLabel: summaryCopy.back,
    backHref: "/history",
  };
}

export function loadSessionSummary(api: Pick<ApiClient, "getSession">, sessionId: string): Promise<SessionDocument> {
  return api.getSession(sessionId);
}

export async function openSessionSummary(
  repository: Pick<LocalRepository, "readClosedSession" | "saveClosedSession">,
  api: Pick<ApiClient, "getSession">,
  sessionId: string,
  show: (view: SummaryScreenView) => void,
): Promise<void> {
  const cached = await repository.readClosedSession(sessionId);
  if (cached !== null) {
    show({ status: "ready", document: cached, notice: null });
  } else {
    show({ status: "loading" });
  }

  try {
    const document = await loadSessionSummary(api, sessionId);
    await repository.saveClosedSession(document);
    show({ status: "ready", document, notice: null });
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 404 || error.code === "NOT_FOUND")) {
      show(presentSummaryFailure(error));
      return;
    }
    if (cached !== null) {
      show({ status: "ready", document: cached, notice: summaryCopy.cachedNotice });
      return;
    }
    show(presentSummaryFailure(error));
  }
}

function storedPlayerName(playerId: string, players: SessionDocument["players"]): string {
  return players.find((player) => player.id === playerId)?.name ?? "";
}

function presentSummaryPlayer(sessionId: string, player: PlayerSessionResult, players: SessionDocument["players"]): SummaryPlayerRow {
  return {
    ...presentPlayerResult(player, players),
    href: sessionPlayerPath(sessionId, player.playerId),
  };
}
