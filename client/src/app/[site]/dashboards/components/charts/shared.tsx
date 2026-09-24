"use client";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { formatter } from "@/lib/utils";
import { CARD_PALETTE } from "../../utils";

export type CardSeries = { key: string; color: string; label: string };

export type TooltipItem = { label: string; color: string; value: number };

/** Stable per-series color drawn from the dashboard card palette. */
export function cardColor(index: number): string {
  return CARD_PALETTE[index % CARD_PALETTE.length];
}

/** Map the wide-format series keys to colored, labeled series descriptors. */
export function toCardSeries(keys: string[]): CardSeries[] {
  return keys.map((key, index) => ({ key, color: cardColor(index), label: key }));
}

/** Shared tooltip body for the line and bar cards, in the app's chart-tooltip chrome. */
export function DashboardTooltip({ title, items }: { title: string; items: TooltipItem[] }) {
  return (
    <ChartTooltip>
      <div className="px-3 py-2">
        {title && (
          <div className="mb-1.5 max-w-[220px] truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">
            {title}
          </div>
        )}
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="max-w-[130px] truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {item.label}
                </span>
              </span>
              <span className="text-xs font-medium tabular-nums text-neutral-700 dark:text-neutral-200">
                {formatter(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartTooltip>
  );
}

/** Compact legend shown beneath multi-series cards. */
export function CardLegend({ series }: { series: CardSeries[] }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-2 pt-1">
      {series.map(item => (
        <span
          key={item.key}
          className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400"
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="max-w-[110px] truncate">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export function ChartEmpty({ message = "Configure chart columns to render this card" }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center px-3 text-center text-xs text-neutral-500">
      {message}
    </div>
  );
}

// ── Shared periwinkle dataviz ramp (DESIGN.md --dataviz, hue 230) ─────────────

/** Sequential periwinkle steps (low → high) for choropleth / calendar cards. */
export function dataVizSequential(isDark: boolean): string[] {
  return isDark
    ? ["#1f2452", "#3b46a0", "#6577e6", "#b3bfff"]
    : ["#e0e4ff", "#b3bfff", "#7e8ef5", "#4f5fd0"];
}

/** Endpoints for a continuous periwinkle interpolation (d3.interpolateRgb). */
export function dataVizRamp(isDark: boolean): [string, string] {
  return isDark ? ["#262c63", "#b3bfff"] : ["#e0e4ff", "#4f5fd0"];
}
