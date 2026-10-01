"use client";

import { ListFilterPlus, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import type { GeoBreakdownTotals } from "../../../../api/analytics/hooks/useGetGeoBreakdown";
import { useGetOverview } from "../../../../api/analytics/hooks/useGetOverview";
import { Delta } from "../../../../components/site/Delta";
import { PivotActions } from "../../../../components/site/PivotActions";
import { Button } from "../../../../components/ui/button";
import { addFilter } from "../../../../lib/store";
import { cn } from "../../../../lib/utils";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import type { GlobeMetric, PlaceLevel } from "../globeStore";
import { formatMetric, useMetricLabels } from "../hooks/useMetricLabels";
import { usePlaceGoalRate } from "../hooks/usePlaceGoalRate";
import { usePlaceLabel } from "../hooks/usePlaceLabel";
import { isRateMetric, PlaceEntry, placeCountryCode, placeFilter } from "../utils/places";

function Figure({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400" title={label}>
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-50">{value}</div>
      {sub != null && (
        <div className="truncate text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">{sub}</div>
      )}
    </div>
  );
}

export interface PlaceCardProps {
  entry: PlaceEntry;
  level: PlaceLevel;
  metric: GlobeMetric;
  totals: GeoBreakdownTotals | null;
  /** How many places the level has, for "4 of 148". */
  placeCount: number;
  /** Sessions online in the place's country now; undefined when the online layer is off or the level is finer. */
  online?: number;
  /** True when the figures are for one replay window: no comparison, no site-wide context. */
  windowed: boolean;
  /**
   * A pinned card is the selection: it stays put, loads the goal rate and
   * offers the pivots. Unpinned, it follows the pointer and only reads.
   */
  pinned?: boolean;
  onClose?: () => void;
  className?: string;
}

/**
 * One place in full: its figure for the chosen metric against the total and
 * the comparison period, its users and bounce rate, and (pinned) how it
 * converts and the doors to the people behind it.
 */
export function PlaceCard({
  entry,
  level,
  metric,
  totals,
  placeCount,
  online,
  windowed,
  pinned = false,
  onClose,
  className,
}: PlaceCardProps) {
  const t = useExtracted();
  const label = usePlaceLabel()(level, entry.key);
  const { metricNouns, metricLabels } = useMetricLabels();
  const filter = placeFilter(level, entry.key);
  const countryCode = placeCountryCode(level, entry.key);
  const rate = isRateMetric(metric);

  // The site's own bounce rate, for context. Not for a replay window, which it does not describe.
  const overview = useGetOverview({});
  const siteBounce = windowed ? totals?.bounce_rate : overview.data?.bounce_rate;
  const goal = usePlaceGoalRate([filter], pinned && !windowed);

  const share = entry.share !== null ? `${entry.share.toFixed(1)}%` : null;
  const context = [
    share && t("{share} of all {metric}", { share, metric: metricNouns[metric] }),
    entry.previous !== null && t("{value} before", { value: formatMetric(metric, entry.previous) }),
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "w-[328px] max-w-full rounded-lg border border-neutral-100 bg-white text-neutral-900 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50",
        className
      )}
      role={pinned ? "region" : "tooltip"}
      aria-label={pinned ? label.name : undefined}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        {countryCode && <CountryFlag country={countryCode} className="h-[14px] w-5 shrink-0 rounded-[2px]" />}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{label.name}</div>
          {label.context && (
            <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{label.context}</div>
          )}
        </div>
        <span className="ml-auto shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
          {t("{rank} of {total}", { rank: entry.rank.toLocaleString(), total: placeCount.toLocaleString() })}
        </span>
        {pinned && onClose && (
          <Button
            type="button"
            variant="ghost"
            size="smIcon"
            className="-mr-1.5 h-6 w-6 shrink-0 text-neutral-500 dark:text-neutral-400"
            aria-label={t("Close")}
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="px-3 pb-3 pt-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold tabular-nums">{formatMetric(metric, entry.value)}</span>
          <span className="text-xs text-neutral-600 dark:text-neutral-300">
            {rate ? metricLabels[metric].toLowerCase() : metricNouns[metric]}
          </span>
          <Delta value={entry.delta} upIsGood={!rate} />
        </div>
        {context.length > 0 && (
          <div className="mt-0.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{context.join(", ")}</div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
        {metric !== "sessions" && <Figure label={t("Sessions")} value={entry.row.sessions.toLocaleString()} />}
        {metric !== "users" && (
          <Figure
            label={t("Users")}
            value={entry.row.users.toLocaleString()}
            sub={
              totals && totals.users > 0
                ? t("{share} of all", { share: `${((entry.row.users / totals.users) * 100).toFixed(1)}%` })
                : undefined
            }
          />
        )}
        {metric !== "bounce_rate" && (
          <Figure
            label={t("Bounce rate")}
            value={`${entry.row.bounce_rate.toFixed(1)}%`}
            sub={
              typeof siteBounce === "number"
                ? windowed
                  ? t("all places {rate}", { rate: `${siteBounce.toFixed(1)}%` })
                  : t("site {rate}", { rate: `${siteBounce.toFixed(1)}%` })
                : undefined
            }
          />
        )}
        {goal && (
          <Figure
            label={t("{goal} rate", { goal: goal.name })}
            value={`${goal.rate.toFixed(2)}%`}
            sub={t("site {rate}", { rate: `${goal.siteRate.toFixed(2)}%` })}
          />
        )}
      </div>

      {typeof online === "number" && online > 0 && (
        <div className="flex items-center gap-1.5 border-t border-neutral-100 px-3 py-2 text-xs tabular-nums text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 dark:bg-neutral-50" />
          {level === "country"
            ? t("{count} online now", { count: online.toLocaleString() })
            : t("{count} online now in {country}", { count: online.toLocaleString(), country: countryCode })}
        </div>
      )}

      {pinned && (
        <div className="flex items-center justify-between gap-1 border-t border-neutral-100 px-1.5 py-1.5 dark:border-neutral-800">
          <PivotActions filters={[filter]} actions={["sessions", "users", "segment"]} />
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="shrink-0 text-neutral-600 dark:text-neutral-300"
            aria-label={t("Filter by {place}", { place: label.name })}
            title={t("Filter by {place}", { place: label.name })}
            onClick={() => addFilter(filter)}
          >
            <ListFilterPlus />
          </Button>
        </div>
      )}
    </div>
  );
}
