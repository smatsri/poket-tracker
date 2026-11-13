import { ApiRequestError } from "../../data/api/errors.ts";
import type { ActiveSessionRecord } from "../../domain/models.ts";

export const submissionMessages = {
  conflict: "לשרת כבר יש תוכן אחר עבור הערב הזה. הפעולות המקומיות נשמרו.",
  retryable: "לא הצלחנו לשלוח את הערב. כל הפעולות נשמרו במכשיר.",
} as const;

export type SubmissionFailure = keyof typeof submissionMessages;

export interface SubmissionActions {
  canFinish: boolean;
  canRetry: boolean;
  canMutate: boolean;
  canStartAnother: boolean;
}

export function submissionActions(record: ActiveSessionRecord | null): SubmissionActions {
  if (record === null) {
    return { canFinish: false, canRetry: false, canMutate: false, canStartAnother: true };
  }

  return {
    canFinish: record.status === "draft" && record.session.transactions.length > 0,
    canRetry: record.status === "pending",
    canMutate: record.status === "draft",
    canStartAnother: record.status === "submitted",
  };
}

export function classifySubmissionFailure(error: unknown): SubmissionFailure {
  if (error instanceof ApiRequestError && error.status === 409) {
    return "conflict";
  }

  return "retryable";
}
