import type { ApiClient, SessionDocument } from "../../data/api/client.ts";
import { ApiRequestError } from "../../data/api/errors.ts";
import { calculatePlayerResults, calculateSessionResult, rankOverallResults } from "../../domain/calculations.ts";
import type { Player, Session } from "../../domain/models.ts";
import { presentResult, type PresentedResult } from "./currentEvening.ts";
import { sessionSummaryPath } from "./sessionHistory.ts";
import { formatSessionDate } from "./transactionHistory.ts";

export const statsCopy = {
  title: "סיכומים",
  empty: "אין עדיין ערבים שהסתיימו.",
  loading: "טוען את הסיכומים…",
  sessions: "ערבים",
  transactions: "פעולות",
  players: "שחקנים",
  back: "חזרה לסיכומים",
  eveningsPlayed: "ערבים",
  progression: "התקדמות מצטברת",
  byEvening: "לפי ערב",
  bySession: "תוצאות לפי ערב",
  missingPlayer: "לשחקן הזה אין ערבים שהסתיימו.",
  networkError: "אין חיבור לשרת, ולכן אי אפשר להציג את הסיכומים.",
  loadError: "השרת לא הצליח להחזיר את הסיכומים.",
  retry: "נסו שוב",
} as const;

export interface RankedPlayerRow {
  playerId: string;
  name: string;
  href: string;
  eveningsPlayed: number;
  result: PresentedResult;
}

export interface StatisticsView {
  title: typeof statsCopy.title;
  status: "empty" | "ready";
  message: string | null;
  sessionCount: number;
  transactionCount: number;
  sessionsLabel: string;
  transactionsLabel: string;
  sessions: SessionBalancePoint[];
  players: RankedPlayerRow[];
}

export interface SessionBalancePoint {
  sessionId: string;
  date: string;
  balance: number;
}

export interface PlayerEveningRow {
  sessionId: string;
  href: string;
  date: string;
  result: PresentedResult;
}

export interface PlayerProgressPoint {
  sessionId: string;
  date: string;
  result: PresentedResult;
  cumulative: PresentedResult;
}

export interface PlayerCumulativePoint {
  sessionId: string;
  date: string;
  net: number;
  cumulative: number;
}

export interface SessionResultBar {
  sessionId: string;
  date: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SessionResultsChartModel {
  width: number;
  height: number;
  zeroY: number | null;
  plotLeft: number;
  plotRight: number;
  bars: SessionResultBar[];
}

export interface CumulativeChartPoint {
  sessionId: string;
  date: string;
  value: number;
  x: number;
  y: number;
}

export interface CumulativeChart {
  width: number;
  height: number;
  zeroY: number | null;
  plotLeft: number;
  plotRight: number;
  points: CumulativeChartPoint[];
}

export interface PlayerStatisticsView {
  playerId: string;
  name: string;
  eveningsPlayed: number;
  overall: PresentedResult;
  progression: PlayerProgressPoint[];
  evenings: PlayerEveningRow[];
}

export interface StatisticsFailureView {
  status: "error";
  message: string;
  canRetry: true;
  retryLabel: typeof statsCopy.retry;
}

export interface StatisticsLocation {
  screen: "list" | "player";
  playerId: string | null;
}

export function statsPlayerPath(playerId: string): string {
  return `/stats/${encodeURIComponent(playerId)}`;
}

export function parseStatsLocation(pathname: string): StatisticsLocation {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const list: StatisticsLocation = { screen: "list", playerId: null };
  const prefix = "/stats/";
  if (path === "/stats" || !path.startsWith(prefix)) {
    return list;
  }

  const playerId = decodeURIComponent(path.slice(prefix.length));
  if (playerId.length === 0 || playerId.includes("/")) {
    return list;
  }

  return { screen: "player", playerId };
}

export function presentStatistics(documents: readonly SessionDocument[]): StatisticsView {
  const sessionCount = documents.length;
  const transactionCount = documents.reduce((sum, document) => sum + document.session.transactions.length, 0);
  if (sessionCount === 0) {
    return {
      title: statsCopy.title,
      status: "empty",
      message: statsCopy.empty,
      sessionCount: 0,
      transactionCount: 0,
      sessionsLabel: `${statsCopy.sessions}: 0`,
      transactionsLabel: `${statsCopy.transactions}: 0`,
      sessions: [],
      players: [],
    };
  }

  return {
    title: statsCopy.title,
    status: "ready",
    message: null,
    sessionCount,
    transactionCount,
    sessionsLabel: `${statsCopy.sessions}: ${sessionCount}`,
    transactionsLabel: `${statsCopy.transactions}: ${transactionCount}`,
    sessions: sessionBalanceSeries(documents),
    players: rankOverallResults(sessionsOf(documents), playersOf(documents)).map((player) => ({
      playerId: player.playerId,
      name: player.name.length > 0 ? player.name : player.playerId,
      href: statsPlayerPath(player.playerId),
      eveningsPlayed: playerCumulativeSeries(documents, player.playerId).length,
      result: presentResult(player.netResult),
    })),
  };
}

const chartPadding = 16;

export function sessionBalanceSeries(documents: readonly SessionDocument[]): SessionBalancePoint[] {
  return [...documents].sort(oldestFirst).map((document) => ({
    sessionId: document.session.id,
    date: formatSessionDate(document.session.date),
    balance: calculateSessionResult(document.session).sessionBalance,
  }));
}

export function mapSessionResultsChart(
  points: readonly Pick<SessionBalancePoint, "sessionId" | "date" | "balance">[],
  width: number,
  height: number,
): SessionResultsChartModel {
  const scale = plotScale(points.map((point) => point.balance), width, height);
  if (points.length === 0 || scale.zeroY === null) {
    return { width, height, zeroY: null, plotLeft: scale.plotLeft, plotRight: scale.plotRight, bars: [] };
  }

  const slot = scale.innerWidth / points.length;
  const barWidth = slot / 2;
  const zeroY = scale.zeroY;

  return {
    width,
    height,
    zeroY,
    plotLeft: scale.plotLeft,
    plotRight: scale.plotRight,
    bars: points.map((point, index) => {
      const valueY = scale.yFor(point.balance);
      return {
        sessionId: point.sessionId,
        date: point.date,
        value: point.balance,
        x: chartPadding + index * slot + (slot - barWidth) / 2,
        y: Math.min(valueY, zeroY),
        width: barWidth,
        height: Math.abs(valueY - zeroY),
      };
    }),
  };
}

export function mapCumulativeChart(
  points: readonly Pick<PlayerCumulativePoint, "sessionId" | "date" | "cumulative">[],
  width: number,
  height: number,
): CumulativeChart {
  const scale = plotScale(points.map((point) => point.cumulative), width, height);
  if (points.length === 0 || scale.zeroY === null) {
    return { width, height, zeroY: null, plotLeft: scale.plotLeft, plotRight: scale.plotRight, points: [] };
  }

  return {
    width,
    height,
    zeroY: scale.zeroY,
    plotLeft: scale.plotLeft,
    plotRight: scale.plotRight,
    points: points.map((point, index) => ({
      sessionId: point.sessionId,
      date: point.date,
      value: point.cumulative,
      x: chartPadding + (points.length === 1 ? scale.innerWidth / 2 : (index / (points.length - 1)) * scale.innerWidth),
      y: scale.yFor(point.cumulative),
    })),
  };
}

function plotScale(values: readonly number[], width: number, height: number) {
  const plotLeft = chartPadding;
  const plotRight = Math.max(width - chartPadding, plotLeft);
  const innerWidth = Math.max(width - chartPadding * 2, 0);
  const innerHeight = Math.max(height - chartPadding * 2, 0);
  if (values.length === 0) {
    return {
      plotLeft,
      plotRight,
      innerWidth,
      innerHeight,
      zeroY: null as number | null,
      yFor: (_value: number) => chartPadding,
    };
  }

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const yFor = (value: number) => chartPadding + ((max - value) / span) * innerHeight;
  return { plotLeft, plotRight, innerWidth, innerHeight, zeroY: yFor(0), yFor };
}

export function playerCumulativeSeries(documents: readonly SessionDocument[], playerId: string): PlayerCumulativePoint[] {
  let cumulative = 0;
  return [...documents].sort(oldestFirst).flatMap((document) => {
    const result = calculatePlayerResults(document.session.transactions).find((player) => player.playerId === playerId);
    if (result === undefined) {
      return [];
    }

    cumulative += result.netResult;
    return [
      {
        sessionId: document.session.id,
        date: formatSessionDate(document.session.date),
        net: result.netResult,
        cumulative,
      },
    ];
  });
}

export function presentPlayerStatistics(documents: readonly SessionDocument[], playerId: string): PlayerStatisticsView | null {
  const series = playerCumulativeSeries(documents, playerId);
  if (series.length === 0) {
    return null;
  }

  const names = new Map(playersOf(documents).map((player) => [player.id, player.name]));
  const name = names.get(playerId);
  const finalCumulative = series[series.length - 1]?.cumulative ?? 0;
  return {
    playerId,
    name: name !== undefined && name.length > 0 ? name : playerId,
    eveningsPlayed: series.length,
    overall: presentResult(finalCumulative),
    progression: series.map((point) => ({
      sessionId: point.sessionId,
      date: point.date,
      result: presentResult(point.net),
      cumulative: presentResult(point.cumulative),
    })),
    evenings: [...series].reverse().map((point) => ({
      sessionId: point.sessionId,
      href: sessionSummaryPath(point.sessionId),
      date: point.date,
      result: presentResult(point.net),
    })),
  };
}

export function presentStatisticsFailure(error: unknown): StatisticsFailureView {
  const offline = error instanceof ApiRequestError && error.kind === "network";
  return {
    status: "error",
    message: offline ? statsCopy.networkError : statsCopy.loadError,
    canRetry: true,
    retryLabel: statsCopy.retry,
  };
}

export function loadStatistics(api: Pick<ApiClient, "listSessions">): Promise<SessionDocument[]> {
  return api.listSessions();
}

function sessionsOf(documents: readonly SessionDocument[]): Session[] {
  return documents.map((document) => document.session);
}

function playersOf(documents: readonly SessionDocument[]): Player[] {
  const players = new Map<string, Player>();
  for (const document of documents) {
    for (const player of document.players) {
      if (!players.has(player.id)) {
        players.set(player.id, player);
      }
    }
  }

  return [...players.values()];
}

function oldestFirst(left: SessionDocument, right: SessionDocument): number {
  return newestFirst(right, left);
}

function newestFirst(left: SessionDocument, right: SessionDocument): number {
  if (left.session.date !== right.session.date) {
    return right.session.date.localeCompare(left.session.date);
  }

  if (left.session.createdAt !== right.session.createdAt) {
    return right.session.createdAt.localeCompare(left.session.createdAt);
  }

  return right.session.id.localeCompare(left.session.id);
}
