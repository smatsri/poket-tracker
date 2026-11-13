import type { Player, Session, SubmissionStatus, Transaction } from "../../domain/models.ts";

const amountFormat = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" });

export const transactionTypeLabels = {
  "buy-in": "כניסה",
  rebuy: "כניסה נוספת",
  "cash-out": "יציאה",
} as const;

export interface PresentedTransaction {
  id: string;
  playerId: string;
  playerName: string;
  typeLabel: string;
  amount: string;
  time: string;
}

export interface TransactionHistoryView {
  date: string;
  transactions: PresentedTransaction[];
  canCorrect: boolean;
}

export function historyAccess(status: SubmissionStatus): "draft" | "readonly" {
  return status === "draft" ? "draft" : "readonly";
}

export function presentTransactionHistory(
  session: Pick<Session, "date" | "transactions">,
  players: readonly Player[],
  access: "draft" | "readonly",
): TransactionHistoryView {
  const names = new Map(players.map((player) => [player.id, player.name]));
  return {
    date: formatSessionDate(session.date),
    transactions: newestFirst(session.transactions).map((transaction) => presentTransaction(transaction, names)),
    canCorrect: access === "draft",
  };
}

export function formatSessionDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return isoDate;
  }

  return dateFormat.format(new Date(year, month - 1, day));
}

export function presentTransaction(transaction: Transaction, names: ReadonlyMap<string, string>): PresentedTransaction {
  return {
    id: transaction.id,
    playerId: transaction.playerId,
    playerName: names.get(transaction.playerId) ?? transaction.playerId,
    typeLabel: transactionTypeLabels[transaction.type],
    amount: amountFormat.format(transaction.amount),
    time: timeFormat.format(new Date(transaction.timestamp)),
  };
}

export function newestFirst(transactions: readonly Transaction[]): Transaction[] {
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
