import { calculateSessionResult } from "../../domain/calculations.ts";
import { formatResult } from "../../domain/format.ts";
import type { ActiveSessionRecord, Player, PlayerSessionResult, SubmissionStatus } from "../../domain/models.ts";
import { historyAccess, presentTransactionHistory, type PresentedTransaction } from "./transactionHistory.ts";

const amountFormat = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });

export { formatSessionDate, transactionTypeLabels } from "./transactionHistory.ts";
export type { PresentedTransaction };

export const statusLabels = {
  draft: "פתוח",
  pending: "ממתין לשליחה",
  submitted: "נשלח",
} as const;

export function canCorrectTransactions(status: SubmissionStatus): boolean {
  return historyAccess(status) === "draft";
}

export interface PresentedResult {
  value: number;
  text: string;
  tone: "positive" | "negative" | "neutral";
}

export interface PresentedPlayerRow {
  playerId: string;
  name: string;
  totalBuyIns: string;
  totalCashOuts: string;
  net: PresentedResult;
}

export interface EmptyEveningView {
  kind: "empty";
  canStart: true;
  canRecord: false;
}

export interface FailedEveningView {
  kind: "error";
  canStart: false;
  canRecord: false;
  message: string;
}

export interface ActiveEveningView {
  kind: "active";
  canStart: boolean;
  canRecord: boolean;
  title: "ערב נוכחי";
  date: string;
  statusLabel: string;
  totalBuyIns: string;
  totalCashOuts: string;
  balance: PresentedResult;
  players: PresentedPlayerRow[];
  recent: PresentedTransaction[];
  history: PresentedTransaction[];
}

export type CurrentEveningView = EmptyEveningView | ActiveEveningView;

export function presentEveningLoadFailure(): FailedEveningView {
  return {
    kind: "error",
    canStart: false,
    canRecord: false,
    message: "לא הצלחנו לטעון את הערב.",
  };
}

export function presentCurrentEvening(
  record: ActiveSessionRecord | null,
  players: readonly Player[],
): CurrentEveningView {
  if (record === null) {
    return { kind: "empty", canStart: true, canRecord: false };
  }

  const result = calculateSessionResult(record.session);
  const names = new Map(players.map((player) => [player.id, player.name]));
  const history = presentTransactionHistory(record.session, players, historyAccess(record.status));

  return {
    kind: "active",
    canStart: record.status === "submitted",
    canRecord: history.canCorrect,
    title: "ערב נוכחי",
    date: history.date,
    statusLabel: statusLabels[record.status],
    totalBuyIns: amountFormat.format(result.sessionBuyIns),
    totalCashOuts: amountFormat.format(result.sessionCashOuts),
    balance: presentResult(result.sessionBalance),
    players: result.players.map((player) => presentPlayerResult(player, names)),
    recent: history.transactions.slice(0, 5),
    history: history.transactions,
  };
}

export function presentPlayerEvening(
  record: ActiveSessionRecord,
  playerId: string,
  players: readonly Player[],
): { name: string; net: PresentedResult; buyIns: string; cashOuts: string; transactions: PresentedTransaction[] } | null {
  const view = presentCurrentEvening(record, players);
  if (view.kind !== "active") {
    return null;
  }

  const row = view.players.find((player) => player.playerId === playerId);
  if (row === undefined) {
    return null;
  }

  return {
    name: row.name,
    net: row.net,
    buyIns: row.totalBuyIns,
    cashOuts: row.totalCashOuts,
    transactions: view.history.filter((transaction) => transaction.playerId === playerId),
  };
}

export function presentPlayerResult(player: PlayerSessionResult, names: ReadonlyMap<string, string>): PresentedPlayerRow {
  return {
    playerId: player.playerId,
    name: names.get(player.playerId) ?? player.playerId,
    totalBuyIns: amountFormat.format(player.totalBuyIns),
    totalCashOuts: amountFormat.format(player.totalCashOuts),
    net: presentResult(player.netResult),
  };
}

export function presentResult(value: number): PresentedResult {
  return {
    value,
    text: formatResult(value),
    tone: value > 0 ? "positive" : value < 0 ? "negative" : "neutral",
  };
}

