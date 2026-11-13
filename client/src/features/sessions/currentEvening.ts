import { calculateSessionResult } from "../../domain/calculations.ts";
import { formatResult } from "../../domain/format.ts";
import type { ActiveSessionRecord, Player, PlayerSessionResult, Transaction } from "../../domain/models.ts";

const amountFormat = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" });

export const statusLabels = {
  draft: "פתוח",
  pending: "ממתין לשליחה",
  submitted: "נשלח",
} as const;

export const transactionTypeLabels = {
  "buy-in": "כניסה",
  rebuy: "כניסה נוספת",
  "cash-out": "יציאה",
} as const;

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

export interface PresentedTransaction {
  id: string;
  playerId: string;
  playerName: string;
  typeLabel: string;
  amount: string;
  time: string;
}

export interface EmptyEveningView {
  kind: "empty";
  canStart: true;
}

export interface ActiveEveningView {
  kind: "active";
  canStart: boolean;
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

export function presentCurrentEvening(
  record: ActiveSessionRecord | null,
  players: readonly Player[],
): CurrentEveningView {
  if (record === null) {
    return { kind: "empty", canStart: true };
  }

  const result = calculateSessionResult(record.session);
  const names = new Map(players.map((player) => [player.id, player.name]));
  const ordered = newestFirst(record.session.transactions);

  return {
    kind: "active",
    canStart: record.status === "submitted",
    title: "ערב נוכחי",
    date: formatSessionDate(record.session.date),
    statusLabel: statusLabels[record.status],
    totalBuyIns: amountFormat.format(result.sessionBuyIns),
    totalCashOuts: amountFormat.format(result.sessionCashOuts),
    balance: presentResult(result.sessionBalance),
    players: result.players.map((player) => presentPlayer(player, names)),
    recent: ordered.slice(0, 5).map((transaction) => presentTransaction(transaction, names)),
    history: ordered.map((transaction) => presentTransaction(transaction, names)),
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

export function formatSessionDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return isoDate;
  }

  return dateFormat.format(new Date(year, month - 1, day));
}

function presentPlayer(player: PlayerSessionResult, names: ReadonlyMap<string, string>): PresentedPlayerRow {
  return {
    playerId: player.playerId,
    name: names.get(player.playerId) ?? player.playerId,
    totalBuyIns: amountFormat.format(player.totalBuyIns),
    totalCashOuts: amountFormat.format(player.totalCashOuts),
    net: presentResult(player.netResult),
  };
}

function presentTransaction(transaction: Transaction, names: ReadonlyMap<string, string>): PresentedTransaction {
  return {
    id: transaction.id,
    playerId: transaction.playerId,
    playerName: names.get(transaction.playerId) ?? transaction.playerId,
    typeLabel: transactionTypeLabels[transaction.type],
    amount: amountFormat.format(transaction.amount),
    time: timeFormat.format(new Date(transaction.timestamp)),
  };
}

function presentResult(value: number): PresentedResult {
  return {
    value,
    text: formatResult(value),
    tone: value > 0 ? "positive" : value < 0 ? "negative" : "neutral",
  };
}

function newestFirst(transactions: readonly Transaction[]): Transaction[] {
  return transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((left, right) => {
      const byTime = Date.parse(right.transaction.timestamp) - Date.parse(left.transaction.timestamp);
      if (byTime !== 0) {
        return byTime;
      }

      return right.index - left.index;
    })
    .map((item) => item.transaction);
}
