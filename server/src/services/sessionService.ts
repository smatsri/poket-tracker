import type Database from "better-sqlite3";
import { selectSession, insertSession, insertTransaction, missingPlayerIds, type StoredSession, type StoredTransaction } from "../db/sessions.js";
import { getDatabase } from "../db/database.js";
import { conflict, validationError } from "../http/errors.js";
import type { sessionCreateRequest } from "../schemas.js";
import type { z } from "zod";

type SessionSubmission = z.output<typeof sessionCreateRequest>;

export interface SubmitResult {
  status: 200 | 201;
  session: StoredSession;
}

function sameInstant(left: string, right: string): boolean {
  return Date.parse(left) === Date.parse(right);
}

function sameTransactionSet(stored: StoredTransaction[], submitted: SessionSubmission["transactions"]): boolean {
  if (stored.length !== submitted.length) {
    return false;
  }

  const byId = new Map(stored.map((transaction) => [transaction.id, transaction]));
  return submitted.every((transaction) => {
    const existing = byId.get(transaction.id);
    return (
      existing !== undefined &&
      existing.playerId === transaction.playerId &&
      existing.type === transaction.type &&
      existing.amount === transaction.amount &&
      sameInstant(existing.timestamp, transaction.timestamp)
    );
  });
}

function constraintTarget(error: unknown): "sessions.id" | "transactions.id" | undefined {
  if (typeof error !== "object" || error === null || !("code" in error) || !("message" in error)) {
    return undefined;
  }

  const code = (error as { code: unknown }).code;
  if (code !== "SQLITE_CONSTRAINT_PRIMARYKEY" && code !== "SQLITE_CONSTRAINT_UNIQUE") {
    return undefined;
  }

  const message = String((error as { message: unknown }).message);
  if (message.includes("transactions.id")) {
    return "transactions.id";
  }
  if (message.includes("sessions.id")) {
    return "sessions.id";
  }
  return undefined;
}

function isForeignKeyConstraint(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "SQLITE_CONSTRAINT_FOREIGNKEY"
  );
}

function runSubmit(database: Database.Database, submission: SessionSubmission): SubmitResult {
  const submit = database.transaction((input: SessionSubmission): SubmitResult => {
    const existing = selectSession(database, input.id);
    if (existing) {
      if (existing.date === input.date && sameTransactionSet(existing.transactions, input.transactions)) {
        return { status: 200, session: existing };
      }
      throw conflict("Session already exists with different content");
    }

    const playerIds = [...new Set(input.transactions.map((transaction) => transaction.playerId))];
    if (missingPlayerIds(database, playerIds).length > 0) {
      throw validationError("Invalid request");
    }

    const createdAt = new Date().toISOString();
    insertSession(database, { id: input.id, date: input.date, createdAt });
    for (const transaction of input.transactions) {
      insertTransaction(database, input.id, transaction);
    }

    const stored = selectSession(database, input.id);
    if (!stored) {
      throw new Error("Stored session is missing");
    }
    return { status: 201, session: stored };
  });

  return submit.immediate(submission);
}

export function submitSession(submission: SessionSubmission): SubmitResult {
  const database = getDatabase();
  try {
    return runSubmit(database, submission);
  } catch (error) {
    if (constraintTarget(error) === "sessions.id") {
      return runSubmit(database, submission);
    }
    if (constraintTarget(error) === "transactions.id") {
      throw conflict("Transaction ID already exists");
    }
    if (isForeignKeyConstraint(error)) {
      throw validationError("Invalid request");
    }
    throw error;
  }
}
