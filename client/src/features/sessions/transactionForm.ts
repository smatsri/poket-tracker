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
  playerIds: string[];
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
  return { playerIds: playerId === null ? [] : [playerId], action: null, amount: String(defaultAmount) };
}

export function createDraftAfterSave(draft: CreateDraft, defaultAmount: number): CreateDraft {
  return { playerIds: draft.playerIds, action: draft.action, amount: String(defaultAmount) };
}

export function selectCreatePlayer(draft: CreateDraft, playerId: string): CreateDraft {
  if (draft.action !== "add") {
    return { ...draft, playerIds: [playerId] };
  }

  const selected = draft.playerIds.includes(playerId);
  return {
    ...draft,
    playerIds: selected ? draft.playerIds.filter((id) => id !== playerId) : [...draft.playerIds, playerId],
  };
}

export function closesSheetAfterCreate(transactionCount: number): boolean {
  return transactionCount > 1;
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
): { ok: true; values: ReadyTransaction[] } | { ok: false; errors: TransactionFieldErrors } {
  const errors: TransactionFieldErrors = {};
  if (draft.playerIds.length === 0) {
    errors.player = "צריך לבחור שחקן.";
  } else if (draft.action === "cash-out" && draft.playerIds.length > 1) {
    errors.player = "יציאה אפשרית לשחקן אחד.";
  }
  if (draft.action === null) {
    errors.type = "צריך לבחור פעולה.";
  }

  const amountError = amountErrorFor(draft.amount);
  if (amountError !== null) {
    errors.amount = amountError;
  }

  if (errors.player !== undefined || errors.type !== undefined || errors.amount !== undefined || draft.action === null) {
    return { ok: false, errors };
  }

  const amount = parsePositiveInteger(draft.amount);
  if (amount === null) {
    return { ok: false, errors: { ...errors, amount: "הסכום צריך להיות מספר שלם וחיובי." } };
  }

  const action = draft.action;
  return {
    ok: true,
    values: draft.playerIds.map((playerId) => ({
      playerId,
      type: storedTypeForAction(action, playerId, transactions),
      amount,
    })),
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
