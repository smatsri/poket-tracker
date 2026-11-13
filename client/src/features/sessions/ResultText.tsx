import type { PresentedResult } from "./currentEvening.ts";

export function ResultText({ result, prominent = false }: { result: PresentedResult; prominent?: boolean }) {
  return (
    <span dir="ltr" className={`money money-${result.tone}${prominent ? " money-prominent" : ""}`}>
      {result.text}
    </span>
  );
}
