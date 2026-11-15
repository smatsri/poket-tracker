import { calculatePlayerResults } from "../../domain/calculations.ts";
import type { Transaction, TransactionType } from "../../domain/models.ts";
import { transactionTypeLabels } from "./currentEvening.ts";

export const amountFieldProps = {
  inputMode: "numeric",
  pattern: "[0-9]*",
  autoComplete: "off",
  enterKeyHint: "done",
} as const;

export const transactionTypeChoices = (Object.keys(transactionTypeLabels) as TransactionType[]).map((type) => ({
  type,
  label: transactionTypeLabels[type],
}));

export const createActionChoices = [
  { action: "add", label: "הוספת כסף" },
  { action: "cash-out", label: "יציאה" },
] as const;

export type CreateAction = (typeof createActionChoices)[number]["action"];

export interface CreateDraft {
  playerId: string | null;
  action: CreateAction | null;
  amount: string;
}

export interface TransactionDraft {
  playerId: string | null;
  type: TransactionType | null;
  amount: string;
}

export interface TransactionFieldErrors {
  player?: string;
  type?: string;
  amount?: string;
}

export interface ReadyTransaction {
  playerId: string;
  type: TransactionType;
  amount: number;
}

export function emptyTransactionDraft(playerId: string | null = null): TransactionDraft {
  return { playerId, type: null, amount: "" };
}

export function emptyCreateDraft(playerId: string | null, defaultAmount: number): CreateDraft {
  return { playerId, action: null, amount: String(defaultAmount) };
}

export function createDraftAfterSave(draft: CreateDraft, defaultAmount: number): CreateDraft {
  return { playerId: draft.playerId, action: draft.action, amount: String(defaultAmount) };
}

export function storedTypeForAction(
  action: CreateAction,
  playerId: string,
  transactions: readonly Pick<Transaction, "playerId" | "type">[],
): TransactionType {
  if (action === "cash-out") {
    return "cash-out";
  }

  const hasMoneyIn = transactions.some(
    (transaction) => transaction.playerId === playerId && (transaction.type === "buy-in" || transaction.type === "rebuy"),
  );
  return hasMoneyIn ? "rebuy" : "buy-in";
}

export function createPlayerNet(playerId: string, transactions: readonly Transaction[]): number {
  return calculatePlayerResults(transactions).find((player) => player.playerId === playerId)?.netResult ?? 0;
}

export function draftFromTransaction(transaction: Transaction): TransactionDraft {
  return {
    playerId: transaction.playerId,
    type: transaction.type,
    amount: String(transaction.amount),
  };
}

export function editedTransaction(existing: Transaction, value: ReadyTransaction): Transaction {
  return {
    id: existing.id,
    sessionId: existing.sessionId,
    playerId: value.playerId,
    type: value.type,
    amount: value.amount,
    timestamp: existing.timestamp,
  };
}

export function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return null;
  }

  const amount = Number(trimmed);
  if (!Number.isSafeInteger(amount)) {
    return null;
  }

  return amount;
}

export function validateCreateDraft(
  draft: CreateDraft,
  transactions: readonly Pick<Transaction, "playerId" | "type">[],
): { ok: true; value: ReadyTransaction } | { ok: false; errors: TransactionFieldErrors } {
  const errors: TransactionFieldErrors = {};
  if (draft.playerId === null || draft.playerId.length === 0) {
    errors.player = "צריך לבחור שחקן.";
  }
  if (draft.action === null) {
    errors.type = "צריך לבחור פעולה.";
  }

  const amountError = amountErrorFor(draft.amount);
  if (amountError !== null) {
    errors.amount = amountError;
  }

  if (errors.player !== undefined || errors.type !== undefined || errors.amount !== undefined || draft.playerId === null || draft.action === null) {
    return { ok: false, errors };
  }

  const amount = parsePositiveInteger(draft.amount);
  if (amount === null) {
    return { ok: false, errors: { ...errors, amount: "הסכום צריך להיות מספר שלם וחיובי." } };
  }

  return {
    ok: true,
    value: {
      playerId: draft.playerId,
      type: storedTypeForAction(draft.action, draft.playerId, transactions),
      amount,
    },
  };
}

function amountErrorFor(amount: string): string | null {
  if (amount.trim().length === 0) {
    return "צריך להזין סכום.";
  }
  if (parsePositiveInteger(amount) === null) {
    return "הסכום צריך להיות מספר שלם וחיובי.";
  }
  return null;
}

export function validateTransactionDraft(
  draft: TransactionDraft,
): { ok: true; value: ReadyTransaction } | { ok: false; errors: TransactionFieldErrors } {
  const errors: TransactionFieldErrors = {};
  if (draft.playerId === null || draft.playerId.length === 0) {
    errors.player = "צריך לבחור שחקן.";
  }
  if (draft.type === null) {
    errors.type = "צריך לבחור סוג פעולה.";
  }

  const amountError = amountErrorFor(draft.amount);
  if (amountError !== null) {
    errors.amount = amountError;
  }

  if (errors.player !== undefined || errors.type !== undefined || errors.amount !== undefined || draft.playerId === null || draft.type === null) {
    return { ok: false, errors };
  }

  const amount = parsePositiveInteger(draft.amount);
  if (amount === null) {
    return { ok: false, errors: { ...errors, amount: "הסכום צריך להיות מספר שלם וחיובי." } };
  }

  return { ok: true, value: { playerId: draft.playerId, type: draft.type, amount } };
}
