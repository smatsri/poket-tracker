import { mapCumulativeChart, statsCopy, type PlayerProgressPoint } from "./statistics.ts";

const chartWidth = 320;
const chartHeight = 160;

export function CumulativeChart({ progression }: { progression: readonly PlayerProgressPoint[] }) {
  const chart = mapCumulativeChart(
    progression.map((point) => ({
      sessionId: point.sessionId,
      date: point.date,
      cumulative: point.cumulative.value,
    })),
    chartWidth,
    chartHeight,
  );
  if (chart.points.length === 0) {
    return null;
  }

  const last = progression[progression.length - 1];
  const label = last === undefined ? statsCopy.progression : `${statsCopy.progression}: ${last.cumulative.text}`;

  return (
    <svg className="cumulative-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={label}>
      <title>{label}</title>
      {chart.zeroY !== null ? (
        <line className="cumulative-chart-zero" x1={chart.plotLeft} x2={chart.plotRight} y1={chart.zeroY} y2={chart.zeroY} />
      ) : null}
      {chart.points.length > 1 ? (
        <polyline className="cumulative-chart-line" points={chart.points.map((point) => `${point.x},${point.y}`).join(" ")} />
      ) : null}
      {chart.points.map((point) => (
        <circle key={point.sessionId} cx={point.x} cy={point.y} r="4">
          <title>
            {point.date} {point.value}
          </title>
        </circle>
      ))}
    </svg>
  );
}
