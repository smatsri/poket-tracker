import { DomainValidationError } from "./errors.ts";

const grouping = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });
const minusSign = "\u2212";

export function formatResult(value: number): string {
  if (!Number.isInteger(value)) {
    throw new DomainValidationError("result must be an integer");
  }

  const grouped = grouping.format(Math.abs(value));
  if (value > 0) {
    return `+${grouped}`;
  }

  if (value < 0) {
    return `${minusSign}${grouped}`;
  }

  return grouped;
}
