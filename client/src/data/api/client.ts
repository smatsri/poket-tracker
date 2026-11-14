import { validatePlayer, validateSession } from "../../domain/validation.ts";
import type { Player, Session, Transaction } from "../../domain/models.ts";
import { ApiRequestError, networkError, unexpectedError, type ApiErrorCode } from "./errors.ts";

export interface SessionDocument {
  session: Session;
  players: Player[];
}

export interface SubmittedSession extends SessionDocument {
  status: 200 | 201;
}

export interface SessionListQuery {
  from?: string;
  to?: string;
}

export interface ApiClient {
  listPlayers(): Promise<Player[]>;
  createPlayer(name: string): Promise<Player>;
  submitSession(session: Session): Promise<SubmittedSession>;
  getSession(sessionId: string): Promise<SessionDocument>;
  listSessions(query?: SessionListQuery): Promise<SessionDocument[]>;
}

const httpStatuses = [400, 404, 409, 500] as const;
const errorCodes = ["VALIDATION_ERROR", "NOT_FOUND", "CONFLICT", "INTERNAL_ERROR"] as const;

export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch): ApiClient {
  const origin = baseUrl.replace(/\/$/, "");

  return {
    listPlayers: async () => {
      const body = await send(origin, fetchImpl, "/api/players", { method: "GET" }, [200]);
      return readPlayers(body);
    },

    createPlayer: async (name) => {
      const body = await send(
        origin,
        fetchImpl,
        "/api/players",
        { method: "POST", body: JSON.stringify({ name }) },
        [201],
      );
      return readPlayer(body);
    },

    submitSession: async (session) => {
      const response = await sendRaw(origin, fetchImpl, "/api/sessions", {
        method: "POST",
        body: JSON.stringify(sessionRequestBody(session)),
      });
      if (response.status !== 200 && response.status !== 201) {
        throw await failureFrom(response);
      }

      return {
        status: response.status,
        ...(await readSessionDocument(response)),
      };
    },

    getSession: async (sessionId) => {
      const body = await send(origin, fetchImpl, `/api/sessions/${encodeURIComponent(sessionId)}`, { method: "GET" }, [200]);
      return readSessionDocument(body);
    },

    listSessions: async (query = {}) => {
      const body = await send(origin, fetchImpl, `/api/sessions${queryString(query)}`, { method: "GET" }, [200]);
      return readSessionList(body);
    },
  };
}

function sessionRequestBody(session: Session): {
  id: string;
  date: string;
  transactions: Array<Omit<Transaction, "sessionId">>;
} {
  return {
    id: session.id,
    date: session.date,
    transactions: session.transactions.map((transaction) => ({
      id: transaction.id,
      playerId: transaction.playerId,
      type: transaction.type,
      amount: transaction.amount,
      timestamp: transaction.timestamp,
    })),
  };
}

function queryString(query: SessionListQuery): string {
  const params = new URLSearchParams();
  if (query.from !== undefined) {
    params.set("from", query.from);
  }
  if (query.to !== undefined) {
    params.set("to", query.to);
  }

  const text = params.toString();
  return text.length === 0 ? "" : `?${text}`;
}

async function send(
  origin: string,
  fetchImpl: typeof fetch,
  path: string,
  init: RequestInit,
  expected: readonly number[],
): Promise<Response> {
  const response = await sendRaw(origin, fetchImpl, path, init);
  if (!expected.includes(response.status)) {
    throw await failureFrom(response);
  }

  return response;
}

async function sendRaw(origin: string, fetchImpl: typeof fetch, path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchImpl(`${origin}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        ...init.headers,
      },
    });
  } catch (error) {
    throw networkError(error instanceof Error ? error.message : "Network request failed");
  }
}

async function failureFrom(response: Response): Promise<ApiRequestError> {
  const parsed = await readErrorBody(response);
  if (httpStatuses.some((status) => status === response.status)) {
    return new ApiRequestError(parsed.message, response.status, parsed.code, "http");
  }

  return unexpectedError(parsed.message, response.status);
}

async function readErrorBody(response: Response): Promise<{ message: string; code: ApiErrorCode | null }> {
  try {
    const body: unknown = await response.json();
    if (!isRecord(body) || !isRecord(body.error) || typeof body.error.message !== "string" || body.error.message.length === 0) {
      return { message: fallbackMessage(response), code: null };
    }

    return {
      message: body.error.message,
      code: knownErrorCode(body.error.code),
    };
  } catch {
    return { message: fallbackMessage(response), code: null };
  }
}

function knownErrorCode(value: unknown): ApiErrorCode | null {
  if (typeof value === "string" && errorCodes.some((candidate) => candidate === value)) {
    return value as ApiErrorCode;
  }

  return null;
}

function fallbackMessage(response: Response): string {
  return response.statusText.length > 0 ? response.statusText : "Request failed";
}

async function readPlayers(response: Response): Promise<Player[]> {
  const body = await readJson(response);
  if (!isRecord(body) || !Array.isArray(body.players) || Object.keys(body).some((key) => key !== "players")) {
    throw unexpectedError("Player list response did not match the contract", response.status);
  }

  return body.players.map((player) => readPlayerValue(player));
}

async function readPlayer(response: Response): Promise<Player> {
  return readPlayerValue(await readJson(response));
}

function readPlayerValue(value: unknown): Player {
  try {
    return validatePlayer(value);
  } catch {
    throw unexpectedError("Player response did not match the contract");
  }
}

async function readSessionList(response: Response): Promise<SessionDocument[]> {
  const body = await readJson(response);
  if (!isRecord(body) || !Array.isArray(body.sessions) || Object.keys(body).some((key) => key !== "sessions")) {
    throw unexpectedError("Session list response did not match the contract", response.status);
  }

  return body.sessions.map((session) => parseSessionDocument(session));
}

async function readSessionDocument(response: Response): Promise<SessionDocument> {
  return parseSessionDocument(await readJson(response));
}

function parseSessionDocument(value: unknown): SessionDocument {
  if (!isRecord(value) || typeof value.id !== "string" || !Array.isArray(value.transactions) || !Array.isArray(value.players)) {
    throw unexpectedError("Session response did not match the contract");
  }

  if (Object.keys(value).some((key) => !["id", "date", "createdAt", "transactions", "players"].includes(key))) {
    throw unexpectedError("Session response did not match the contract");
  }

  try {
    const transactions = value.transactions.map((transaction) => {
      if (!isRecord(transaction)) {
        throw unexpectedError("Session response did not match the contract");
      }

      return {
        ...transaction,
        sessionId: value.id,
      };
    });

    return {
      session: validateSession({
        id: value.id,
        date: value.date,
        createdAt: value.createdAt,
        transactions,
      }),
      players: value.players.map((player) => validatePlayer(player)),
    };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    throw unexpectedError("Session response did not match the contract");
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw unexpectedError("Response was not JSON", response.status);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
