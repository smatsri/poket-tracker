export const transactionTypes = ["buy-in", "rebuy", "cash-out"] as const;

export type TransactionType = (typeof transactionTypes)[number];

export const submissionStatuses = ["draft", "pending", "submitted"] as const;

export type SubmissionStatus = (typeof submissionStatuses)[number];

export interface Player {
  id: string;
  name: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  sessionId: string;
  playerId: string;
  type: TransactionType;
  amount: number;
  timestamp: string;
}

export interface Session {
  id: string;
  date: string;
  createdAt: string;
  transactions: Transaction[];
}

export interface ActiveSessionRecord {
  session: Session;
  status: SubmissionStatus;
  updatedAt: string;
}

export interface PlayerSessionResult {
  playerId: string;
  totalBuyIns: number;
  totalCashOuts: number;
  netResult: number;
}

export interface SessionResult {
  sessionBuyIns: number;
  sessionCashOuts: number;
  sessionBalance: number;
  players: PlayerSessionResult[];
}

export interface PlayerOverallResult {
  playerId: string;
  name: string;
  netResult: number;
}
