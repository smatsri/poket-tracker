import { formatSignedAmount } from "../../data/local/operatorSettings.ts";
import { useOperatorSettings } from "../settings/OperatorSettings.tsx";
import type { PresentedResult } from "./currentEvening.ts";

export function ResultText({ result, prominent = false }: { result: PresentedResult; prominent?: boolean }) {
  const { settings } = useOperatorSettings();
  return (
    <span dir="ltr" className={`money money-${result.tone}${prominent ? " money-prominent" : ""}`}>
      {formatSignedAmount(result.value, settings.currencyLabel)}
    </span>
  );
}

export function MoneyText({ value, prominent = false }: { value: string; prominent?: boolean }) {
  const { settings } = useOperatorSettings();
  return (
    <span dir="ltr" className={`money${prominent ? " money-prominent" : ""}`}>
      {value} {settings.currencyLabel}
    </span>
  );
}
