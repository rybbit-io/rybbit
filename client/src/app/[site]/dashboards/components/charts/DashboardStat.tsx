"use client";

import type { DashboardCardMapping } from "@rybbit/shared";
import NumberFlow from "@number-flow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CustomQueryRow } from "@/api/analytics/endpoints";
import { formatValue, getStatValue } from "../../utils";
import { ChartEmpty } from "./shared";

type DashboardStatProps = {
  rows: CustomQueryRow[];
  mapping: DashboardCardMapping;
};

/** Single big-number KPI, sized to fill the card. */
export function DashboardStat({ rows, mapping }: DashboardStatProps) {
  const stat = useMemo(() => getStatValue(rows, mapping), [rows, mapping]);
  const format = mapping.valueFormat ?? "number";

  // Scale the figure to the card: track size, derive a font size from it.
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!stat) {
    return <ChartEmpty message="No numeric value to display. Return a single number, e.g. SELECT count() AS total." />;
  }

  const text = formatValue(stat.value, format);
  // Fit width (≈0.62em per char) and clamp to height; keep within sane bounds.
  const byWidth = size.width > 0 ? (size.width * 0.9) / Math.max(text.length, 1) / 0.62 : 48;
  const byHeight = size.height > 0 ? size.height * (stat.label ? 0.4 : 0.55) : 48;
  const fontSize = Math.max(20, Math.min(byWidth, byHeight, 96));

  return (
    <div ref={ref} className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
      <div
        className="font-semibold leading-none tabular-nums text-neutral-900 dark:text-neutral-50"
        style={{ fontSize }}
        aria-label={stat.label ? `${stat.label}: ${text}` : text}
      >
        {format === "number" ? (
          <NumberFlow respectMotionPreference={false} value={stat.value} format={{ notation: "compact" }} />
        ) : (
          text
        )}
      </div>
      {stat.label && (
        <span className="max-w-full truncate text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</span>
      )}
    </div>
  );
}
