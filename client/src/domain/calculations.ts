import type { Player, PlayerOverallResult, PlayerSessionResult, Session, SessionResult, Transaction } from "./models.ts";

function emptyPlayerResult(playerId: string): PlayerSessionResult {
  return {
    playerId,
    totalBuyIns: 0,
    totalCashOuts: 0,
    netResult: 0,
  };
}

export function calculatePlayerResults(transactions: readonly Transaction[]): PlayerSessionResult[] {
  const results = new Map<string, PlayerSessionResult>();

  for (const transaction of transactions) {
    const current = results.get(transaction.playerId) ?? emptyPlayerResult(transaction.playerId);
    if (transaction.type === "cash-out") {
      current.totalCashOuts += transaction.amount;
    } else {
      current.totalBuyIns += transaction.amount;
    }

    current.netResult = current.totalCashOuts - current.totalBuyIns;
    results.set(transaction.playerId, current);
  }

  return [...results.values()];
}

export function calculateSessionResult(session: Pick<Session, "transactions">): SessionResult {
  const players = calculatePlayerResults(session.transactions);
  const sessionBuyIns = players.reduce((sum, player) => sum + player.totalBuyIns, 0);
  const sessionCashOuts = players.reduce((sum, player) => sum + player.totalCashOuts, 0);

  return {
    sessionBuyIns,
    sessionCashOuts,
    sessionBalance: sessionCashOuts - sessionBuyIns,
    players,
  };
}

export function rankOverallResults(sessions: readonly Session[], players: readonly Player[]): PlayerOverallResult[] {
  const names = new Map(players.map((player) => [player.id, player.name]));
  const totals = new Map<string, number>();

  for (const session of sessions) {
    for (const result of calculatePlayerResults(session.transactions)) {
      totals.set(result.playerId, (totals.get(result.playerId) ?? 0) + result.netResult);
    }
  }

  return [...totals.entries()]
    .map(([playerId, netResult]) => ({
      playerId,
      name: names.get(playerId) ?? "",
      netResult,
    }))
    .sort((left, right) => {
      if (left.netResult !== right.netResult) {
        return right.netResult - left.netResult;
      }

      const byName = left.name.localeCompare(right.name, "he");
      if (byName !== 0) {
        return byName;
      }

      return left.playerId.localeCompare(right.playerId, "he");
    });
}
