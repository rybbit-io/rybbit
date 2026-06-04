"use client";

import type { DashboardCardMapping } from "@rybbit/shared";
import * as d3 from "d3";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CustomQueryRow } from "@/api/analytics/endpoints";
import { useStore } from "@/lib/store";
import { formatter } from "@/lib/utils";
import { buildChartAxis, buildWideData } from "../../utils";
import { CardLegend, ChartEmpty, DashboardTooltip, toCardSeries } from "./shared";

type DashboardBarChartProps = {
  rows: CustomQueryRow[];
  mapping: DashboardCardMapping;
};

const MARGIN = { top: 10, right: 15, bottom: 30, left: 40 };
const Y_TICKS = 5;
const GROUP_GAP = 2;

/** Path for a rectangle with only the top two corners rounded. */
function topRoundedRect(x: number, y: number, width: number, height: number, radius: number): string {
  if (height <= 0 || width <= 0) return "";
  const r = Math.max(0, Math.min(radius, width / 2, height));
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
}

export function DashboardBarChart({ rows, mapping }: DashboardBarChartProps) {
  const bucket = useStore(state => state.bucket);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const wide = useMemo(() => buildWideData(rows, mapping), [rows, mapping]);
  const axis = useMemo(
    () => buildChartAxis(wide ? wide.data.map(entry => String(entry[wide.indexBy])) : [], bucket),
    [wide, bucket]
  );

  const series = useMemo(() => (wide ? toCardSeries(wide.keys) : []), [wide]);
  const categories = useMemo(
    () => (wide ? wide.data.map(entry => String(entry[wide.indexBy] ?? "")) : []),
    [wide]
  );

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [hover, setHover] = useState<{ index: number; clientX: number; clientY: number } | null>(null);

  const W = size.width;
  const H = size.height;
  const plotLeft = MARGIN.left;
  const plotRight = W - MARGIN.right;
  const plotTop = MARGIN.top;
  const plotBottom = H - MARGIN.bottom;
  const plotW = Math.max(0, plotRight - plotLeft);
  const plotH = Math.max(0, plotBottom - plotTop);

  const max = useMemo(() => {
    if (!wide) return 1;
    let value = 0;
    for (const entry of wide.data) {
      for (const item of series) {
        const candidate = Number(entry[item.key]) || 0;
        if (candidate > value) value = candidate;
      }
    }
    return value || 1;
  }, [wide, series]);

  const xScale = useMemo(
    () => d3.scaleBand<string>().domain(categories).range([plotLeft, plotRight]).padding(0.2),
    [categories, plotLeft, plotRight]
  );
  const yScale = useMemo(
    () => d3.scaleLinear().domain([0, max * 1.05]).range([plotBottom, plotTop]),
    [max, plotBottom, plotTop]
  );

  const bandWidth = xScale.bandwidth();
  const barWidth =
    series.length > 0 ? (bandWidth - GROUP_GAP * (series.length - 1)) / series.length : bandWidth;

  const yTicks = useMemo(() => yScale.ticks(Y_TICKS), [yScale]);
  // Thin x labels so they never collide (~one per 48px of plot width).
  const labelStride = useMemo(() => {
    if (categories.length <= 1 || plotW <= 0) return 1;
    return Math.max(1, Math.ceil(categories.length / Math.max(1, Math.floor(plotW / 48))));
  }, [categories.length, plotW]);

  const tickColor = isDark ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-500))";
  const gridColor = isDark ? "hsl(var(--neutral-800))" : "hsl(var(--neutral-100))";
  const hoverColor = isDark ? "hsl(var(--neutral-700))" : "hsl(var(--neutral-200))";

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    if (!categories.length || plotW <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const step = plotW / categories.length;
    const index = Math.max(0, Math.min(categories.length - 1, Math.floor(x / step)));
    setHover({ index, clientX: event.clientX, clientY: event.clientY });
  };
  const handleMouseLeave = () => setHover(null);

  const tooltipOffset = 14;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 0;
  const tooltipWidth = 220;
  const tooltipLeft = hover ? Math.min(hover.clientX + tooltipOffset, viewportW - tooltipWidth - 8) : 0;
  const tooltipTop = hover ? Math.min(hover.clientY + tooltipOffset, viewportH - 120) : 0;

  if (!wide || categories.length === 0 || series.length === 0) {
    return <ChartEmpty />;
  }

  const multi = series.length > 1;

  return (
    <div className="flex h-full flex-col">
      <div ref={wrapperRef} className="relative min-h-0 w-full flex-1">
        {W > 0 && H > 0 && (
          <svg width={W} height={H} style={{ display: "block" }}>
            {yTicks.map((tick, i) => (
              <line
                key={`yg-${i}`}
                x1={plotLeft}
                x2={plotRight}
                y1={yScale(tick)}
                y2={yScale(tick)}
                stroke={gridColor}
                strokeWidth={1}
              />
            ))}

            {hover && (
              <rect
                x={xScale(categories[hover.index]) ?? plotLeft}
                y={plotTop}
                width={bandWidth}
                height={plotH}
                fill={hoverColor}
                opacity={0.25}
                pointerEvents="none"
              />
            )}

            {wide.data.map((entry, index) => {
              const band = xScale(categories[index]) ?? plotLeft;
              const dimmed = hover !== null && hover.index !== index;
              return (
                <g key={`bar-${categories[index]}-${index}`} opacity={dimmed ? 0.45 : 1}>
                  {series.map((item, seriesIndex) => {
                    const value = Number(entry[item.key]) || 0;
                    const y = yScale(value);
                    const height = plotBottom - y;
                    const x = band + seriesIndex * (barWidth + GROUP_GAP);
                    return (
                      <path
                        key={item.key}
                        d={topRoundedRect(x, y, barWidth, height, 3)}
                        fill={item.color}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* X axis */}
            <line x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} stroke={gridColor} strokeWidth={1} />
            {categories.map((category, i) => {
              if (i % labelStride !== 0) return null;
              const cx = (xScale(category) ?? plotLeft) + bandWidth / 2;
              return (
                <text
                  key={`xt-${category}-${i}`}
                  x={cx}
                  y={plotBottom + 15}
                  dy="0.71em"
                  textAnchor="middle"
                  fontSize={11}
                  fill={tickColor}
                >
                  {axis.format(category)}
                </text>
              );
            })}

            {/* Y axis */}
            <line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBottom} stroke={gridColor} strokeWidth={1} />
            {yTicks.map((tick, i) => (
              <g key={`yt-${i}`} transform={`translate(${plotLeft}, ${yScale(tick)})`}>
                <line x2={-5} stroke={tickColor} />
                <text x={-5 - 5} dy="0.32em" textAnchor="end" fontSize={11} fill={tickColor}>
                  {formatter(tick)}
                </text>
              </g>
            ))}

            {plotW > 0 && plotH > 0 && (
              <rect
                x={plotLeft}
                y={plotTop}
                width={plotW}
                height={plotH}
                fill="transparent"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
          </svg>
        )}

        {hover &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              style={{
                position: "fixed",
                left: tooltipLeft,
                top: tooltipTop,
                width: tooltipWidth,
                pointerEvents: "none",
                zIndex: 9999,
              }}
            >
              <DashboardTooltip
                title={axis.format(categories[hover.index])}
                items={series.map(item => ({
                  label: item.label,
                  color: item.color,
                  value: Number(wide.data[hover.index]?.[item.key]) || 0,
                }))}
              />
            </div>,
            document.body
          )}
      </div>
      {multi && <CardLegend series={series} />}
    </div>
  );
}
