import * as React from "react";
import { DateTime } from "luxon";
import type { ChartDataPoint } from "../../pdfReportTypes.js";
import { formatNumber } from "./utils.js";

export interface SessionsChartProps {
  data: ChartDataPoint[];
  startDate: string;
  endDate: string;
  timeZone: string;
}

const formatChartDate = (time: string, useHours: boolean, timeZone: string): string => {
  // ClickHouse returns format like "2024-01-15 14:00:00", need to use SQL format
  const dt = DateTime.fromSQL(time, { zone: timeZone });
  if (useHours) {
    return dt.toFormat("ha").toLowerCase();
  }
  return dt.toFormat("MMM d");
};

const isOneDayOrLess = (startDate: string, endDate: string, timeZone: string): boolean => {
  const start = DateTime.fromISO(startDate, { zone: timeZone });
  const end = DateTime.fromISO(endDate, { zone: timeZone });
  const diffDays = end.diff(start, "days").days;
  return diffDays <= 1;
};

export const SessionsChart = ({ data, startDate, endDate, timeZone }: SessionsChartProps) => {
  if (data.length === 0) return null;

  const useHours = isOneDayOrLess(startDate, endDate, timeZone);

  const width = 680;
  const height = 220;
  const margin = { top: 10, right: 15, bottom: 30, left: 45 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Get sessions values and calculate bounds
  const sessions = data.map(d => Number(d.sessions) || 0);
  const maxValue = Math.max(...sessions, 1);
  const minValue = 0;

  // Scale functions
  const xScale = (index: number) => margin.left + (index / (data.length - 1 || 1)) * chartWidth;
  const yScale = (value: number) =>
    margin.top + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;

  // Generate path for area
  const areaPath =
    data
      .map((d, i) => {
        const x = xScale(i);
        const y = yScale(Number(d.sessions) || 0);
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(" ") +
    ` L ${xScale(data.length - 1)} ${margin.top + chartHeight} L ${margin.left} ${margin.top + chartHeight} Z`;

  // Generate path for line
  const linePath = data
    .map((d, i) => {
      const x = xScale(i);
      const y = yScale(Number(d.sessions) || 0);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  // Generate Y-axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const value = minValue + ((maxValue - minValue) * i) / (yTickCount - 1);
    return { value, y: yScale(value) };
  });

  // Generate X-axis ticks (limit to ~8 ticks)
  const xTickCount = Math.min(data.length, 8);
  const xTickInterval = Math.max(1, Math.floor(data.length / xTickCount));
  const xTicks = data
    .map((d, i) => ({ label: formatChartDate(d.time, useHours, timeZone), x: xScale(i), index: i }))
    .filter((_, i) => i % xTickInterval === 0 || i === data.length - 1);

  // Generate horizontal grid lines
  const gridLines = yTicks.map(tick => tick.y);

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "24px",
      }}
    >
      <div style={{ color: "#111827", fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>
        Sessions Over Time
      </div>
      <svg width={width} height={height} style={{ display: "block" }}>
        <defs>
          <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={margin.left}
            y1={y}
            x2={width - margin.right}
            y2={y}
            stroke="#e5e7eb"
            strokeDasharray="3 3"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#sessionsGradient)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2} />

        {/* X-axis */}
        <line
          x1={margin.left}
          y1={margin.top + chartHeight}
          x2={width - margin.right}
          y2={margin.top + chartHeight}
          stroke="#e5e7eb"
        />

        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <text key={i} x={tick.x} y={margin.top + chartHeight + 18} textAnchor="middle" fontSize={10} fill="#6b7280">
            {tick.label}
          </text>
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text key={i} x={margin.left - 8} y={tick.y + 4} textAnchor="end" fontSize={10} fill="#6b7280">
            {formatNumber(tick.value)}
          </text>
        ))}
      </svg>
    </div>
  );
};
