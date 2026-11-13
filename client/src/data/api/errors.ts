export type ApiErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";

export type ApiFailureKind = "network" | "http" | "unexpected";

export class ApiRequestError extends Error {
  readonly status: number | null;
  readonly code: ApiErrorCode | null;
  readonly kind: ApiFailureKind;

  constructor(message: string, status: number | null, code: ApiErrorCode | null, kind: ApiFailureKind) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.kind = kind;
  }
}

export function networkError(message: string): ApiRequestError {
  return new ApiRequestError(message, null, null, "network");
}

export function unexpectedError(message: string, status: number | null = null): ApiRequestError {
  return new ApiRequestError(message, status, null, "unexpected");
}
