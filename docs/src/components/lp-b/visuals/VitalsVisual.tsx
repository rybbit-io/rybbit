"use client";

import { Frame } from "@/components/lp-b/primitives";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useExtracted } from "next-intl";
import { useEffect, useRef, useState } from "react";

const PERCENTILES = ["p50", "p75", "p90", "p99"] as const;
type Percentile = (typeof PERCENTILES)[number];

interface Metric {
  code: string;
  name: string;
  unit: "s" | "ms" | "";
  /** Standard Core Web Vitals thresholds: good ≤ first, poor > second. */
  thresholds: [number, number];
  values: Record<Percentile, number>;
}
const METRICS: Metric[] = [
  { code: "LCP", name: "Largest Contentful Paint", unit: "s", thresholds: [2.5, 4], values: { p50: 1.4, p75: 2.1, p90: 3.1, p99: 5.2 } },
  { code: "INP", name: "Interaction to Next Paint", unit: "ms", thresholds: [200, 500], values: { p50: 96, p75: 184, p90: 312, p99: 640 } },
  { code: "CLS", name: "Cumulative Layout Shift", unit: "", thresholds: [0.1, 0.25], values: { p50: 0.01, p75: 0.04, p90: 0.12, p99: 0.31 } },
  { code: "FCP", name: "First Contentful Paint", unit: "s", thresholds: [1.8, 3], values: { p50: 0.9, p75: 1.4, p90: 2.2, p99: 3.6 } },
  { code: "TTFB", name: "Time to First Byte", unit: "ms", thresholds: [800, 1800], values: { p50: 320, p75: 640, p90: 1100, p99: 2400 } },
];

const DEVICES = [
  { name: "Desktop", icon: Monitor, factor: 0.78 },
  { name: "Mobile", icon: Smartphone, factor: 1.32 },
  { name: "Tablet", icon: Tablet, factor: 1.04 },
];
const SLOW_PAGES = [
  { path: "/blog/clickhouse-deep-dive", factor: 1.15 },
  { path: "/pricing", factor: 0.86 },
  { path: "/docs/script", factor: 0.76 },
];

type Rating = "good" | "needs-improvement" | "poor";
function rate(value: number, [good, poor]: [number, number]): Rating {
  return value <= good ? "good" : value > poor ? "poor" : "needs-improvement";
}
// Gauge zones: good 0–55%, needs improvement 55–80%, poor 80–100% of the track.
function position(value: number, [good, poor]: [number, number]) {
  if (value <= good) return (value / good) * 55;
  if (value <= poor) return 55 + ((value - good) / (poor - good)) * 25;
  return Math.min(100, 80 + ((value - poor) / poor) * 20);
}
function format(value: number, unit: Metric["unit"]) {
  if (unit === "s") return `${value.toFixed(1)} s`;
  if (unit === "ms") return `${Math.round(value)} ms`;
  return value.toFixed(2);
}

const RATING_TEXT: Record<Rating, string> = {
  good: "text-emerald-700 dark:text-emerald-400",
  "needs-improvement": "text-amber-700 dark:text-amber-400",
  poor: "text-red-700 dark:text-red-400",
};
const RATING_DOT: Record<Rating, string> = {
  good: "bg-emerald-600 dark:bg-emerald-400",
  "needs-improvement": "bg-amber-600 dark:bg-amber-400",
  poor: "bg-red-600 dark:bg-red-400",
};
const RATING_LABEL: Record<Rating, string> = { good: "Good", "needs-improvement": "Needs work", poor: "Poor" };

const CYCLE_MS = 3600;

/**
 * Core Web Vitals from real visits, as the Performance page shows them: five
 * metrics on their threshold gauges, a percentile switch (which the demo
 * walks through on its own), and the breakdown by device and slowest pages.
 */
export function VitalsVisual() {
  const t = useExtracted();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.4 });
  const reducedMotion = useReducedMotion();
  const [percentile, setPercentile] = useState<Percentile>("p75");
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!inView || reducedMotion || !auto) return;
    const interval = setInterval(() => {
      setPercentile(p => PERCENTILES[(PERCENTILES.indexOf(p) + 1) % PERCENTILES.length]);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, [inView, reducedMotion, auto]);

  const lcp = METRICS[0];
  const lcpValue = lcp.values[percentile];
  const passing = METRICS.filter(m => rate(m.values[percentile], m.thresholds) === "good").length;

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <Frame
        label="performance · web vitals"
        right={
          <div className="flex items-center rounded-md border border-neutral-200 p-0.5 dark:border-neutral-800" role="group" aria-label={t("Percentile")}>
            {PERCENTILES.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPercentile(p);
                  setAuto(false);
                }}
                aria-pressed={percentile === p}
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors duration-300",
                  percentile === p
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        }
      >
        <div className="space-y-3.5 p-4">
          {METRICS.map(metric => {
            const value = metric.values[percentile];
            const rating = rate(value, metric.thresholds);
            return (
              <div key={metric.code}>
                <div className="flex items-baseline gap-2">
                  <span className="w-10 font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100">{metric.code}</span>
                  <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{metric.name}</span>
                  <span key={percentile} className={cn("console-rise ml-auto shrink-0 font-mono text-xs tabular-nums", RATING_TEXT[rating])}>
                    {format(value, metric.unit)}
                  </span>
                  <span className={cn("w-16 shrink-0 text-right text-[10px] font-medium", RATING_TEXT[rating])}>
                    {RATING_LABEL[rating]}
                  </span>
                </div>
                <div className="relative mt-1.5">
                  <div className="flex h-1.5 overflow-hidden rounded-full">
                    <div className="w-[55%] bg-emerald-500/20 dark:bg-emerald-500/25" />
                    <div className="w-[25%] bg-amber-500/20 dark:bg-amber-500/25" />
                    <div className="w-[20%] bg-red-500/20 dark:bg-red-500/25" />
                  </div>
                  <span
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out motion-reduce:transition-none"
                    style={{ left: `${position(value, metric.thresholds)}%` }}
                  >
                    <span className={cn("block size-2.5 rounded-full border-2 border-white dark:border-[#0f0f0f]", RATING_DOT[rating])} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex h-9 shrink-0 items-center justify-between border-t border-neutral-200 px-3 text-xs dark:border-neutral-800">
          <span className="text-neutral-500 dark:text-neutral-400">{t("Passing Core Web Vitals")}</span>
          <span className={cn("font-mono font-medium tabular-nums", passing >= 4 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
            {passing} / {METRICS.length}
          </span>
        </div>
      </Frame>

      <div className="grid gap-3 sm:grid-cols-[1fr_1.1fr]">
        <Frame label={`LCP · ${percentile} · by device`}>
          <div className="flex flex-col gap-2 p-3">
            {DEVICES.map(device => {
              const value = lcpValue * device.factor;
              const rating = rate(value, lcp.thresholds);
              const Icon = device.icon;
              return (
                <div key={device.name} className="flex items-center gap-2 text-xs">
                  <Icon className="size-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
                  <span className="w-14 text-neutral-700 dark:text-neutral-300">{device.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800/70">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", RATING_DOT[rating])}
                      style={{ width: `${Math.min(100, (value / (lcp.thresholds[1] * 1.4)) * 100)}%` }}
                    />
                  </div>
                  <span className={cn("w-12 shrink-0 text-right font-mono tabular-nums", RATING_TEXT[rating])}>
                    {format(value, "s")}
                  </span>
                </div>
              );
            })}
          </div>
        </Frame>
        <Frame label={`LCP · ${percentile} · ${t("slowest pages")}`}>
          <div className="flex flex-col gap-2 p-3">
            {SLOW_PAGES.map(page => {
              const value = lcpValue * page.factor;
              const rating = rate(value, lcp.thresholds);
              return (
                <div key={page.path} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-mono text-neutral-700 dark:text-neutral-300">{page.path}</span>
                  <span className={cn("shrink-0 font-mono tabular-nums", RATING_TEXT[rating])}>{format(value, "s")}</span>
                </div>
              );
            })}
          </div>
        </Frame>
      </div>
    </div>
  );
}
