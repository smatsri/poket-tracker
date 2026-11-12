import { z } from "zod";
import { validationError } from "./http/errors.js";

const identifierPattern = /^[A-Za-z0-9_-]+$/;
const calendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function isUtcDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isCalendarDate(value: string): boolean {
  const match = calendarDatePattern.exec(value);
  if (!match) {
    return false;
  }

  return isUtcDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function isTimestamp(value: string): boolean {
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
  if (zone === "Z") {
    return true;
  }

  const offsetHour = Number(zone.slice(1, 3));
  const offsetMinute = Number(zone.slice(4, 6));
  return offsetHour <= 23 && offsetMinute <= 59;
}

export const identifier = z.string().min(1).max(64).regex(identifierPattern);

export const calendarDate = z.string().refine(isCalendarDate);

export const timestamp = z.string().refine(isTimestamp);

export const transactionType = z.enum(["buy-in", "rebuy", "cash-out"]);

export const amount = z.number().int().positive();

export const playerName = z.string().transform(normalizePlayerName).pipe(z.string().min(1).max(80));

export const sessionId = identifier;

export const transactionInput = z.strictObject({
  id: identifier,
  playerId: identifier,
  type: transactionType,
  amount,
  timestamp,
});

export const playerCreateRequest = z.strictObject({
  name: playerName,
});

export const sessionCreateRequest = z.strictObject({
  id: identifier,
  date: calendarDate,
  transactions: z.array(transactionInput),
});

export const sessionListQuery = z
  .strictObject({
    from: calendarDate.optional(),
    to: calendarDate.optional(),
  })
  .refine((query) => query.from === undefined || query.to === undefined || query.from <= query.to);

export function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Invalid request");
  }

  return result.data;
}
