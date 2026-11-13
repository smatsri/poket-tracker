import { DomainValidationError } from "./errors.ts";
import {
  submissionStatuses,
  transactionTypes,
  type ActiveSessionRecord,
  type Player,
  type Session,
  type SubmissionStatus,
  type Transaction,
  type TransactionType,
} from "./models.ts";

const identifierPattern = /^[A-Za-z0-9_-]+$/;
const calendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function fail(message: string): never {
  throw new DomainValidationError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${label} must be an object`);
  }

  return value;
}

function rejectUnknown(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      fail(`${label} contains unknown field ${key}`);
    }
  }
}

function requireString(value: Record<string, unknown>, field: string): string {
  const current = value[field];
  if (typeof current !== "string") {
    fail(`${field} is required`);
  }

  return current;
}

export function isIdentifier(value: string): boolean {
  return value.length >= 1 && value.length <= 64 && identifierPattern.test(value);
}

function isUtcDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isSessionDate(value: string): boolean {
  const match = calendarDatePattern.exec(value);
  if (!match) {
    return false;
  }

  return isUtcDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function isTimestamp(value: string): boolean {
  const match = timestampPattern.exec(value);
  if (!match) {
    return false;
  }

  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (!isUtcDate(Number(match[1]), Number(match[2]), Number(match[3]))) {
    return false;
  }

  if (hour > 23 || minute > 59 || second > 59) {
    return false;
  }

  const zone = match[7];
  if (zone === undefined) {
    return false;
  }

  if (zone === "Z") {
    return true;
  }

  const offsetHour = Number(zone.slice(1, 3));
  const offsetMinute = Number(zone.slice(4, 6));
  return offsetHour <= 23 && offsetMinute <= 59;
}

function requireIdentifier(value: Record<string, unknown>, field: string): string {
  const current = requireString(value, field);
  if (!isIdentifier(current)) {
    fail(`${field} must be a 1-64 character identifier`);
  }

  return current;
}

function isTransactionType(value: string): value is TransactionType {
  return transactionTypes.some((type) => type === value);
}

function isSubmissionStatus(value: string): value is SubmissionStatus {
  return submissionStatuses.some((status) => status === value);
}

export function isPositiveIntegerAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

export function validateTransaction(value: unknown): Transaction {
  const record = requireRecord(value, "Transaction");
  rejectUnknown(record, ["id", "sessionId", "playerId", "type", "amount", "timestamp"], "Transaction");

  const type = requireString(record, "type");
  if (!isTransactionType(type)) {
    fail("type must be buy-in, rebuy, or cash-out");
  }

  if (!isPositiveIntegerAmount(record.amount)) {
    fail("amount must be a positive integer");
  }

  const timestamp = requireString(record, "timestamp");
  if (!isTimestamp(timestamp)) {
    fail("timestamp must be an RFC 3339 date-time");
  }

  return {
    id: requireIdentifier(record, "id"),
    sessionId: requireIdentifier(record, "sessionId"),
    playerId: requireIdentifier(record, "playerId"),
    type,
    amount: record.amount,
    timestamp,
  };
}

export function validatePlayer(value: unknown): Player {
  const record = requireRecord(value, "Player");
  rejectUnknown(record, ["id", "name", "createdAt"], "Player");

  const name = requireString(record, "name").trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 80) {
    fail("name must contain 1-80 characters");
  }

  const createdAt = requireString(record, "createdAt");
  if (!isTimestamp(createdAt)) {
    fail("createdAt must be an RFC 3339 date-time");
  }

  return {
    id: requireIdentifier(record, "id"),
    name,
    createdAt,
  };
}

export function validateSession(value: unknown): Session {
  const record = requireRecord(value, "Session");
  rejectUnknown(record, ["id", "date", "createdAt", "transactions"], "Session");

  const id = requireIdentifier(record, "id");
  const date = requireString(record, "date");
  if (!isSessionDate(date)) {
    fail("date must be a calendar date");
  }

  const createdAt = requireString(record, "createdAt");
  if (!isTimestamp(createdAt)) {
    fail("createdAt must be an RFC 3339 date-time");
  }

  if (!Array.isArray(record.transactions)) {
    fail("transactions is required");
  }

  const transactions = record.transactions.map((transaction) => validateTransaction(transaction));
  const ids = new Set<string>();
  for (const transaction of transactions) {
    if (transaction.sessionId !== id) {
      fail("transaction sessionId must match the session id");
    }

    if (ids.has(transaction.id)) {
      fail("transaction id must be unique in the session");
    }

    ids.add(transaction.id);
  }

  return { id, date, createdAt, transactions };
}

export function validateActiveSessionRecord(value: unknown): ActiveSessionRecord {
  const record = requireRecord(value, "Active session");
  rejectUnknown(record, ["session", "status", "updatedAt"], "Active session");

  const status = requireString(record, "status");
  if (!isSubmissionStatus(status)) {
    fail("status must be draft, pending, or submitted");
  }

  const updatedAt = requireString(record, "updatedAt");
  if (!isTimestamp(updatedAt)) {
    fail("updatedAt must be an RFC 3339 date-time");
  }

  return {
    session: validateSession(record.session),
    status,
    updatedAt,
  };
}
