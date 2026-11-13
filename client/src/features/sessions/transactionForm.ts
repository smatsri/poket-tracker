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

export function draftAfterSave(draft: TransactionDraft): TransactionDraft {
  return { playerId: draft.playerId, type: draft.type, amount: "" };
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

  if (draft.amount.trim().length === 0) {
    errors.amount = "צריך להזין סכום.";
  } else if (parsePositiveInteger(draft.amount) === null) {
    errors.amount = "הסכום צריך להיות מספר שלם וחיובי.";
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
