import { getDatabase } from "../db/database.js";
import {
  insertSession,
  insertTransaction,
  missingPlayerIds,
  selectSession,
  selectSessions,
  type StoredSession,
  type StoredTransaction,
} from "../db/sessions.js";
import type { Database } from "../db/sql.js";
import { conflict, notFound, validationError } from "../http/errors.js";
import type { sessionCreateRequest, sessionListQuery } from "../schemas.js";
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

function postgresError(error: unknown): { code: string; constraint: string } | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = (error as { code: unknown }).code;
  if (code !== "23505" && code !== "23503") {
    return undefined;
  }

  const constraint =
    "constraint" in error && typeof (error as { constraint: unknown }).constraint === "string"
      ? (error as { constraint: string }).constraint
      : "";
  const message = "message" in error ? String((error as { message: unknown }).message) : "";
  return { code, constraint: constraint || message };
}

function constraintTarget(error: unknown): "sessions_pkey" | "transactions_pkey" | undefined {
  const info = postgresError(error);
  if (!info || info.code !== "23505") {
    return undefined;
  }
  if (info.constraint.includes("sessions_pkey")) {
    return "sessions_pkey";
  }
  if (info.constraint.includes("transactions_pkey")) {
    return "transactions_pkey";
  }
  return undefined;
}

function isForeignKeyConstraint(error: unknown): boolean {
  return postgresError(error)?.code === "23503";
}

async function runSubmit(database: Database, submission: SessionSubmission): Promise<SubmitResult> {
  return database.transaction(async (sql) => {
    const existing = await selectSession(sql, submission.id);
    if (existing) {
      if (existing.date === submission.date && sameTransactionSet(existing.transactions, submission.transactions)) {
        return { status: 200, session: existing };
      }
      throw conflict("Session already exists with different content");
    }

    const playerIds = [...new Set(submission.transactions.map((transaction) => transaction.playerId))];
    if ((await missingPlayerIds(sql, playerIds)).length > 0) {
      throw validationError("Invalid request");
    }

    const createdAt = new Date().toISOString();
    await insertSession(sql, { id: submission.id, date: submission.date, createdAt });
    for (const transaction of submission.transactions) {
      await insertTransaction(sql, submission.id, transaction);
    }

    const stored = await selectSession(sql, submission.id);
    if (!stored) {
      throw new Error("Stored session is missing");
    }
    return { status: 201, session: stored };
  });
}

export async function submitSession(submission: SessionSubmission): Promise<SubmitResult> {
  const database = getDatabase();
  try {
    return await runSubmit(database, submission);
  } catch (error) {
    if (constraintTarget(error) === "sessions_pkey") {
      return runSubmit(database, submission);
    }
    if (constraintTarget(error) === "transactions_pkey") {
      throw conflict("Transaction ID already exists");
    }
    if (isForeignKeyConstraint(error)) {
      throw validationError("Invalid request");
    }
    throw error;
  }
}

export async function getSession(id: string): Promise<StoredSession> {
  const session = await selectSession(getDatabase(), id);
  if (!session) {
    throw notFound("Session not found");
  }
  return session;
}

export async function listSessions(query: z.output<typeof sessionListQuery>): Promise<StoredSession[]> {
  return selectSessions(getDatabase(), query);
}
