import type { ApiClient } from "../../data/api/client.ts";
import type { LocalRepository } from "../../data/local/repository.ts";
import type { ActiveSessionRecord, Transaction, TransactionType } from "../../domain/models.ts";
import { validateTransaction } from "../../domain/validation.ts";

export class EveningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EveningError";
  }
}

export interface NewTransaction {
  playerId: string;
  type: TransactionType;
  amount: number;
  timestamp?: string;
}

export interface EveningService {
  readCurrent(): Promise<ActiveSessionRecord | null>;
  startEvening(): Promise<ActiveSessionRecord>;
  addTransaction(input: NewTransaction): Promise<Transaction>;
  updateTransaction(transaction: Transaction): Promise<Transaction>;
  deleteTransaction(transactionId: string): Promise<void>;
  submitEvening(): Promise<ActiveSessionRecord>;
}

export interface EveningClock {
  now(): Date;
  newId(): string;
}

const defaultClock: EveningClock = {
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
};

export function createEveningService(
  repository: LocalRepository,
  api: ApiClient,
  clock: EveningClock = defaultClock,
): EveningService {
  return {
    readCurrent: () => repository.readActiveSession(),

    async startEvening() {
      const current = await repository.readActiveSession();
      if (current?.status === "draft" || current?.status === "pending") {
        throw new EveningError("Finish the current evening before starting another");
      }

      const now = clock.now();
      const timestamp = now.toISOString();
      const record: ActiveSessionRecord = {
        status: "draft",
        updatedAt: timestamp,
        session: {
          id: clock.newId(),
          date: localCalendarDate(now),
          createdAt: timestamp,
          transactions: [],
        },
      };
      await repository.saveActiveSession(record);
      return record;
    },

    async addTransaction(input) {
      const current = await requireDraft(repository);
      const transaction = validateTransaction({
        id: clock.newId(),
        sessionId: current.session.id,
        playerId: input.playerId,
        type: input.type,
        amount: input.amount,
        timestamp: input.timestamp ?? clock.now().toISOString(),
      });
      await repository.saveActiveSession(withTransaction(current, [...current.session.transactions, transaction], clock));
      return transaction;
    },

    async updateTransaction(transaction) {
      const current = await requireDraft(repository);
      const index = current.session.transactions.findIndex((item) => item.id === transaction.id);
      if (index < 0) {
        throw new EveningError("Transaction was not found in the current evening");
      }

      const replacement = validateTransaction({
        ...transaction,
        id: transaction.id,
        sessionId: current.session.id,
      });
      const transactions = current.session.transactions.slice();
      transactions[index] = replacement;
      await repository.saveActiveSession(withTransaction(current, transactions, clock));
      return replacement;
    },

    async deleteTransaction(transactionId) {
      const current = await requireDraft(repository);
      if (!current.session.transactions.some((transaction) => transaction.id === transactionId)) {
        throw new EveningError("Transaction was not found in the current evening");
      }

      await repository.saveActiveSession(
        withTransaction(
          current,
          current.session.transactions.filter((transaction) => transaction.id !== transactionId),
          clock,
        ),
      );
    },

    async submitEvening() {
      const current = await repository.readActiveSession();
      if (current === null) {
        throw new EveningError("There is no evening to submit");
      }
      if (current.status === "submitted") {
        return current;
      }
      if (current.session.transactions.length === 0) {
        throw new EveningError("An evening needs at least one transaction before it can be submitted");
      }

      const pending = withStatus(current, "pending", clock);
      await repository.saveActiveSession(pending);

      const result = await api.submitSession(pending.session);
      if (result.session.id !== pending.session.id) {
        throw new EveningError("The server confirmed a different session id");
      }

      const submitted = withStatus({ ...pending, session: result.session }, "submitted", clock);
      await repository.saveActiveSession(submitted);
      return submitted;
    },
  };
}

async function requireDraft(repository: LocalRepository): Promise<ActiveSessionRecord> {
  const current = await repository.readActiveSession();
  if (current === null || current.status !== "draft") {
    throw new EveningError("Transactions can only change while the evening is open");
  }

  return current;
}

function withTransaction(record: ActiveSessionRecord, transactions: Transaction[], clock: EveningClock): ActiveSessionRecord {
  return {
    ...record,
    updatedAt: clock.now().toISOString(),
    session: {
      ...record.session,
      transactions,
    },
  };
}

function withStatus(record: ActiveSessionRecord, status: ActiveSessionRecord["status"], clock: EveningClock): ActiveSessionRecord {
  return {
    ...record,
    status,
    updatedAt: clock.now().toISOString(),
  };
}

function localCalendarDate(now: Date): string {
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
