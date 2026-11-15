import { formatResult } from "../../domain/format.ts";

export interface OperatorSettings {
  defaultAmount: number;
  currencyLabel: string;
}

export const initialOperatorSettings: OperatorSettings = {
  defaultAmount: 50,
  currencyLabel: "₪",
};

const maxLabelLength = 12;

export function parseOperatorSettings(value: unknown): OperatorSettings | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const amount = "defaultAmount" in value ? value.defaultAmount : undefined;
  const label = "currencyLabel" in value ? value.currencyLabel : undefined;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 1) {
    return null;
  }
  if (typeof label !== "string" || label.trim().length === 0 || label.trim().length > maxLabelLength) {
    return null;
  }

  return { defaultAmount: amount, currencyLabel: label.trim() };
}

export function formatGroupedAmount(amount: number, label: string): string {
  return `${new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(amount)} ${label}`;
}

export function formatSignedAmount(value: number, label: string): string {
  return `${formatResult(value)} ${label}`;
}
