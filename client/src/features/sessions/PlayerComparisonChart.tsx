import { formatResult } from "../../domain/format.ts";
import { mapPlayerComparisonChart, statsCopy, type RankedPlayerRow } from "./statistics.ts";

const chartWidth = 320;
const chartHeight = 160;

export function PlayerComparisonChart({ players }: { players: readonly RankedPlayerRow[] }) {
  const chart = mapPlayerComparisonChart(
    players.map((player) => ({ playerId: player.playerId, name: player.name, net: player.result.value })),
    chartWidth,
    chartHeight,
  );
  if (chart.bars.length === 0) {
    return null;
  }

  return (
    <svg className="comparison-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={statsCopy.comparison}>
      <title>{statsCopy.comparison}</title>
      {chart.zeroY !== null ? (
        <line className="comparison-chart-zero" x1={chart.plotLeft} x2={chart.plotRight} y1={chart.zeroY} y2={chart.zeroY} />
      ) : null}
      {chart.bars.map((bar) => (
        <rect
          key={bar.playerId}
          className={barClass(bar.value)}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
        >
          <title>
            {bar.name} {formatResult(bar.value)}
          </title>
        </rect>
      ))}
    </svg>
  );
}

function barClass(value: number): string {
  if (value > 0) {
    return "comparison-chart-bar-positive";
  }

  if (value < 0) {
    return "comparison-chart-bar-negative";
  }

  return "comparison-chart-bar-neutral";
}
