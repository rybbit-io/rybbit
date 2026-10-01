"use client";

import { useExtracted } from "next-intl";
import { cn, formatter } from "../../../../lib/utils";
import type { GlobeMetric, PlaceLevel } from "../globeStore";
import { useMetricLabels } from "../hooks/useMetricLabels";
import type { ColorScale } from "../utils/colorScale";
import type { MapTone } from "../utils/mapStyles";
import { onlineDotStyle } from "../utils/mapTypes";

const formatTick = (metric: GlobeMetric, value: number) =>
  metric === "bounce_rate" ? `${Math.round(value)}%` : formatter(value);

function OnlineSwatch({ tone }: { tone: MapTone }) {
  const dot = onlineDotStyle(tone);
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" className="shrink-0">
      <circle cx="7" cy="7" r="6" fill={dot.haloFill} stroke={dot.haloStroke} strokeWidth="0.75" />
      <circle cx="7" cy="7" r="2.6" fill={dot.fill} stroke={dot.stroke} strokeWidth="0.5" />
    </svg>
  );
}

interface MapLegendProps {
  /** Null in the sessions breakdown, which has no colour scale. */
  scale: ColorScale | null;
  level: PlaceLevel;
  metric: GlobeMetric;
  showOnline: boolean;
  /** The basemap's tone: the swatches are shown over the same ground the map draws them on. */
  tone: MapTone;
  className?: string;
}

/**
 * What the map's colours mean: the scale for the chosen metric, with ticks
 * placed on the same curve the fills use, and the online-now marker.
 */
export function MapLegend({ scale, level, metric, showOnline, tone, className }: MapLegendProps) {
  const t = useExtracted();
  const { metricLabels, levelLabels } = useMetricLabels();
  const hasScale = !!scale && scale.ticks.length > 0;
  const ground = tone === "dark" ? "bg-neutral-950" : "bg-neutral-100";

  if (!hasScale && !showOnline) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-100 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      {hasScale && (
        <div className="w-[216px] max-w-full">
          <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
            {t("{metric} by {level}", { metric: metricLabels[metric], level: levelLabels[level].toLowerCase() })}
          </div>
          {/* The fills are translucent, so the bar sits on the basemap's ground like they do. */}
          <div className={cn("mt-1.5 h-2 overflow-hidden rounded-sm", ground)}>
            <div
              className="h-full"
              style={{ background: `linear-gradient(to right, ${scale.range[0]}, ${scale.range[1]})` }}
            />
          </div>
          <div className="relative mt-1 h-4 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
            {scale.ticks.map(tick => (
              <span
                key={tick.value}
                className={cn(
                  "absolute whitespace-nowrap",
                  tick.position >= 1 ? "-translate-x-full" : tick.position > 0 && "-translate-x-1/2"
                )}
                style={{ left: `${(tick.position * 100).toFixed(1)}%` }}
              >
                {formatTick(metric, tick.value)}
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-600 dark:text-neutral-300",
          hasScale && "mt-2 border-t border-neutral-100 pt-2 dark:border-neutral-800"
        )}
      >
        {hasScale && level !== "city" && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-[3px] ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700",
                ground
              )}
            />
            {t("No sessions")}
          </span>
        )}
        {hasScale && level === "city" && (
          <span>
            {metric === "bounce_rate"
              ? t("Circles sized by sessions")
              : t("Circles sized by {metric}", { metric: metricLabels[metric].toLowerCase() })}
          </span>
        )}
        {showOnline && (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("inline-flex rounded-full", tone === "dark" ? "bg-neutral-800" : "bg-neutral-100")}>
              <OnlineSwatch tone={tone} />
            </span>
            {t("Online now, sized by sessions")}
          </span>
        )}
      </div>
    </div>
  );
}
