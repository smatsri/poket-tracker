export interface Migration {
  id: string;
  sql: string;
}

export const migrations: readonly Migration[] = [
  {
    id: "001",
    sql: `
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  "date" TEXT NOT NULL CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  created_at TEXT NOT NULL
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  type TEXT NOT NULL CHECK (type IN ('buy-in', 'rebuy', 'cash-out')),
  amount INTEGER NOT NULL CHECK (amount >= 1),
  "timestamp" TEXT NOT NULL
);

CREATE INDEX idx_transactions_session_id ON transactions(session_id);
CREATE INDEX idx_transactions_player_id ON transactions(player_id);
`,
  },
];
