import { formatResult } from "../../domain/format.ts";
import { mapSessionResultsChart, statsCopy, type SessionBalancePoint } from "./statistics.ts";

const chartWidth = 320;
const chartHeight = 160;

export function SessionResultsChart({ sessions }: { sessions: readonly SessionBalancePoint[] }) {
  const chart = mapSessionResultsChart(sessions, chartWidth, chartHeight);
  if (chart.bars.length === 0) {
    return null;
  }

  return (
    <svg className="session-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={statsCopy.bySession}>
      <title>{statsCopy.bySession}</title>
      {chart.zeroY !== null ? (
        <line className="session-chart-zero" x1={chart.plotLeft} x2={chart.plotRight} y1={chart.zeroY} y2={chart.zeroY} />
      ) : null}
      {chart.bars.map((bar) => (
        <rect
          key={bar.sessionId}
          className={barClass(bar.value)}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
        >
          <title>
            {bar.date} {formatResult(bar.value)}
          </title>
        </rect>
      ))}
    </svg>
  );
}

function barClass(value: number): string {
  if (value > 0) {
    return "session-chart-bar-positive";
  }

  if (value < 0) {
    return "session-chart-bar-negative";
  }

  return "session-chart-bar-neutral";
}
