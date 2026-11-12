import type { ErrorRequestHandler } from "express";

export const errorCodes = ["VALIDATION_ERROR", "NOT_FOUND", "CONFLICT", "INTERNAL_ERROR"] as const;

export type ErrorCode = (typeof errorCodes)[number];

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function validationError(message: string): ApiError {
  return new ApiError(400, "VALIDATION_ERROR", message);
}

export function notFound(message: string): ApiError {
  return new ApiError(404, "NOT_FOUND", message);
}

export function conflict(message: string): ApiError {
  return new ApiError(409, "CONFLICT", message);
}

export function errorDocument(code: ErrorCode, message: string): {
  error: { code: ErrorCode; message: string };
} {
  return {
    error: {
      code,
      message,
    },
  };
}

function isJsonParseError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    "type" in err &&
    (err as { type?: unknown }).type === "entity.parse.failed"
  );
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json(errorDocument(err.code, err.message));
    return;
  }

  if (isJsonParseError(err)) {
    res.status(400).json(errorDocument("VALIDATION_ERROR", "Invalid JSON"));
    return;
  }

  console.error(err);
  res.status(500).json(errorDocument("INTERNAL_ERROR", "Unexpected server error"));
};
