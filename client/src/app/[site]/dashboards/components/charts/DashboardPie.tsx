"use client";

import type { DashboardCardMapping } from "@rybbit/shared";
import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CustomQueryRow } from "@/api/analytics/endpoints";
import { buildPieData, formatValue } from "../../utils";
import { CardLegend, cardColor, ChartEmpty, DashboardTooltip, type CardSeries } from "./shared";

type DashboardPieProps = {
  rows: CustomQueryRow[];
  mapping: DashboardCardMapping;
};

export function DashboardPie({ rows, mapping }: DashboardPieProps) {
  const slices = useMemo(() => buildPieData(rows, mapping), [rows, mapping]);
  const format = mapping.valueFormat ?? "number";

  const series: CardSeries[] = useMemo(
    () => slices.map((slice, index) => ({ key: slice.label, label: slice.label, color: cardColor(index) })),
    [slices]
  );

  const total = useMemo(() => slices.reduce((sum, slice) => sum + slice.value, 0), [slices]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const ro = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [hover, setHover] = useState<{ index: number; clientX: number; clientY: number } | null>(null);

  const arcs = useMemo(() => {
    if (size.width === 0 || size.height === 0 || total === 0) return [];
    const radius = Math.max(0, Math.min(size.width, size.height) / 2 - 6);
    const arcGen = d3
      .arc<d3.PieArcDatum<number>>()
      .innerRadius(radius * 0.62)
      .outerRadius(radius)
      .padAngle(0.012)
      .cornerRadius(2);
    const pieGen = d3
      .pie<number>()
      .sort(null)
      .value(value => value);
    return pieGen(slices.map(slice => slice.value)).map(datum => ({
      path: arcGen(datum) ?? "",
      index: datum.index,
    }));
  }, [slices, size, total]);

  if (slices.length === 0) {
    return (
      <ChartEmpty message={mapping.xColumn ? "No positive values to chart." : "Select a slice label and a value column."} />
    );
  }

  const cx = size.width / 2;
  const cy = size.height / 2;
  const multi = slices.length > 1;

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 0;
  const tooltipWidth = 220;
  const tooltipLeft = hover ? Math.min(hover.clientX + 14, viewportW - tooltipWidth - 8) : 0;
  const tooltipTop = hover ? Math.min(hover.clientY + 14, viewportH - 120) : 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={wrapperRef} className="relative min-h-0 w-full flex-1">
        {size.width > 0 && size.height > 0 && (
          <svg width={size.width} height={size.height} style={{ display: "block" }}>
            <g transform={`translate(${cx}, ${cy})`}>
              {arcs.map(arc => (
                <path
                  key={arc.index}
                  d={arc.path}
                  fill={cardColor(arc.index)}
                  opacity={hover && hover.index !== arc.index ? 0.45 : 1}
                  onMouseMove={event => setHover({ index: arc.index, clientX: event.clientX, clientY: event.clientY })}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
              <text
                textAnchor="middle"
                dy="0.35em"
                className="fill-neutral-900 dark:fill-neutral-50"
                fontSize={Math.min(22, Math.max(12, size.width / 9))}
                fontWeight={600}
              >
                {formatValue(hover ? slices[hover.index].value : total, format)}
              </text>
            </g>
          </svg>
        )}

        {hover &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              style={{ position: "fixed", left: tooltipLeft, top: tooltipTop, width: tooltipWidth, pointerEvents: "none", zIndex: 9999 }}
            >
              <DashboardTooltip
                title={slices[hover.index].label}
                items={[{ label: slices[hover.index].label, color: cardColor(hover.index), value: slices[hover.index].value }]}
              />
            </div>,
            document.body
          )}
      </div>
      {multi && <CardLegend series={series} />}
    </div>
  );
}
