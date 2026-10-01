"use client";

import { ArrowDown, Download } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";
import { GetSessionsResponse } from "../../../../api/analytics/endpoints";
import { SegmentedControl } from "../../../../components/interior/segmented-control";
import { Delta } from "../../../../components/site/Delta";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Skeleton } from "../../../../components/ui/skeleton";
import { downloadCSV } from "../../../../lib/export";
import { cn } from "../../../../lib/utils";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { RailTab, useGlobeStore } from "../globeStore";
import type { GlobeData } from "../hooks/useGlobeData";
import { formatMetric, useMetricLabels } from "../hooks/useMetricLabels";
import { usePlaceLabel } from "../hooks/usePlaceLabel";
import { isRateMetric, PlaceEntry, placeCountryCode } from "../utils/places";
import { GlobeSessions } from "./GlobeSessions";

const INITIAL_ROWS = 15;
// "Show more" adds this many: a region or city list can run to thousands of rows.
const ROWS_STEP = 100;

interface NamedEntry {
  entry: PlaceEntry;
  name: string;
  context: string;
  search: string;
}

function PlaceRow({
  item,
  data,
  maxValue,
  selected,
  onSelect,
}: {
  item: NamedEntry;
  data: GlobeData;
  maxValue: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { entry } = item;
  const rate = isRateMetric(data.metric);
  const countryCode = placeCountryCode(data.level, entry.key);
  // A rate's bar is the rate itself; a count's is its size against the largest place.
  const fraction = rate ? entry.value / 100 : maxValue > 0 ? entry.value / maxValue : 0;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex h-9 w-full items-center gap-2 px-3 text-left outline-none focus-visible:bg-neutral-50 dark:focus-visible:bg-neutral-800/30",
        selected ? "bg-neutral-100 dark:bg-neutral-800/70" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
      )}
    >
      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
        {entry.rank}
      </span>
      <span className="relative flex h-7 min-w-0 flex-1 items-center gap-2 px-1.5">
        <span
          className="absolute inset-y-0 left-0 rounded-md bg-dataviz/25 dark:bg-dataviz/20"
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
        <span className="relative flex min-w-0 flex-1 items-center gap-2">
          {countryCode && <CountryFlag country={countryCode} className="shrink-0" />}
          <span
            className="truncate text-[13px] text-neutral-900 dark:text-neutral-100"
            title={item.context ? `${item.name}, ${item.context}` : item.name}
          >
            {item.name}
          </span>
        </span>
        <span className="relative text-xs tabular-nums text-neutral-900 dark:text-neutral-100">
          {formatMetric(data.metric, entry.value)}
        </span>
      </span>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-600 dark:text-neutral-300">
        {entry.share !== null ? `${entry.share.toFixed(1)}%` : ""}
      </span>
      {data.compared && (
        <span className="flex w-[54px] shrink-0 justify-end">
          <Delta value={entry.delta} upIsGood={!rate} />
        </span>
      )}
    </button>
  );
}

interface GlobeRailProps {
  data: GlobeData;
  /** Sessions in the replay window on the map; null when the whole period is shown. */
  windowSessions: GetSessionsResponse | null;
  windowLoading: boolean;
  onSessionSelect: (session: GetSessionsResponse[number]) => void;
  /** Selects a place (or clears the selection when it is already selected). */
  onPlaceSelect: (key: string) => void;
  className?: string;
}

/**
 * The list docked beside the map: the breakdown's places ranked by the chosen
 * metric, with their share and change, or the sessions themselves. The map and
 * the list select the same place.
 */
export function GlobeRail({
  data,
  windowSessions,
  windowLoading,
  onSessionSelect,
  onPlaceSelect,
  className,
}: GlobeRailProps) {
  const t = useExtracted();
  const breakdown = useGlobeStore(state => state.breakdown);
  const railTab = useGlobeStore(state => state.railTab);
  const setRailTab = useGlobeStore(state => state.setRailTab);
  const selectedKey = useGlobeStore(state => state.selectedKey);
  const placeLabel = usePlaceLabel();
  const { metricLabels, metricNouns, levelLabels, levelPlurals } = useMetricLabels();
  const [query, setQuery] = useState("");
  const [rowLimit, setRowLimit] = useState(INITIAL_ROWS);

  const { level, metric, entries, totals } = data;
  // The sessions breakdown has no places to list.
  const tab: RailTab = breakdown === "sessions" ? "sessions" : railTab;

  const named = useMemo<NamedEntry[]>(
    () =>
      entries.map(entry => {
        const { name, context } = placeLabel(level, entry.key);
        return { entry, name, context, search: `${name} ${context} ${entry.key}`.toLowerCase() };
      }),
    [entries, level, placeLabel]
  );
  const needle = query.trim().toLowerCase();
  const matching = needle ? named.filter(item => item.search.includes(needle)) : named;
  const visible = matching.slice(0, rowLimit);
  const maxValue = entries.reduce((max, entry) => Math.max(max, entry.value), 0);

  const placeCount = totals?.places ?? entries.length;
  const additive = metric === "sessions" || metric === "pageviews";
  const hiddenCount = needle ? matching.length - visible.length : placeCount - visible.length;
  const total = totals && additive ? totals[metric] : 0;
  const hiddenValue = additive && !needle ? total - visible.reduce((sum, item) => sum + item.entry.value, 0) : 0;

  const exportCsv = () =>
    downloadCSV(
      `globe-${level}.csv`,
      named.map(({ entry, name, context }) => ({
        [levelLabels[level]]: context ? `${name}, ${context}` : name,
        code: entry.key,
        sessions: entry.row.sessions,
        users: entry.row.users,
        pageviews: entry.row.pageviews,
        bounce_rate: entry.row.bounce_rate,
      }))
    );

  return (
    <aside
      aria-label={tab === "sessions" ? t("Sessions") : levelPlurals[level]}
      className={cn("flex min-h-0 flex-col bg-white dark:bg-neutral-900", className)}
    >
      <div className="space-y-2.5 border-b border-neutral-100 p-3 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          {breakdown === "sessions" ? (
            <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t("Sessions")}</h2>
          ) : (
            <SegmentedControl<RailTab>
              aria-label={t("List")}
              size="sm"
              options={[
                {
                  value: "places",
                  ariaLabel: levelPlurals[level],
                  label: (
                    <>
                      {levelPlurals[level]}
                      {totals && (
                        <span className="font-normal tabular-nums opacity-70">{placeCount.toLocaleString()}</span>
                      )}
                    </>
                  ),
                },
                { value: "sessions", label: t("Sessions") },
              ]}
              value={tab}
              onValueChange={setRailTab}
            />
          )}
          {tab === "places" && (
            <Button
              type="button"
              variant="ghost"
              size="smIcon"
              className="text-neutral-600 dark:text-neutral-300"
              aria-label={t("Export CSV")}
              title={t("Export CSV")}
              disabled={entries.length === 0}
              onClick={exportCsv}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
        {tab === "places" && (
          <Input
            isSearch
            className="h-8 text-[13px]"
            placeholder={t("Search {places}", { places: levelPlurals[level].toLowerCase() })}
            aria-label={t("Search {places}", { places: levelPlurals[level].toLowerCase() })}
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setRowLimit(INITIAL_ROWS);
            }}
          />
        )}
      </div>

      {tab === "sessions" ? (
        <GlobeSessions windowSessions={windowSessions} windowLoading={windowLoading} onSelect={onSessionSelect} />
      ) : (
        <>
          <div className="flex h-8 shrink-0 items-center gap-2 bg-neutral-50 px-3 text-xs font-medium text-neutral-500 dark:bg-neutral-850 dark:text-neutral-400">
            <span className="w-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate pl-1.5">{levelLabels[level]}</span>
            <span className="inline-flex items-center gap-0.5 pr-1.5 text-neutral-800 dark:text-neutral-200">
              {metricLabels[metric]}
              {/* Bounce rate keeps the order by sessions, so it carries no sort arrow. */}
              {!isRateMetric(metric) && <ArrowDown className="h-3 w-3" aria-label={t("Sorted descending")} />}
            </span>
            <span className="w-10 shrink-0 text-right">{t("Share")}</span>
            {data.compared && <span className="w-[54px] shrink-0 text-right">{t("Change")}</span>}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {data.isLoading ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                {Array.from({ length: INITIAL_ROWS }, (_, index) => (
                  <div key={index} className="flex h-9 items-center gap-2 px-3">
                    <Skeleton className="h-3 w-4 rounded" />
                    <Skeleton className="h-3 flex-1 rounded" />
                    <Skeleton className="h-3 w-10 rounded" />
                  </div>
                ))}
              </div>
            ) : data.isError ? (
              <p className="px-3 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {t("The list could not be loaded. Reload the page to try again.")}
              </p>
            ) : entries.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {data.windowed ? t("No sessions in this window") : t("No sessions with a location")}
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {data.windowed ? t("Move the replay to another window") : t("Try a different date range or filter")}
                </p>
              </div>
            ) : visible.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {t("Nothing matches “{query}”", { query: query.trim() })}
              </p>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                {visible.map(item => (
                  <PlaceRow
                    key={item.entry.key}
                    item={item}
                    data={data}
                    maxValue={maxValue}
                    selected={item.entry.key === selectedKey}
                    onSelect={() => onPlaceSelect(item.entry.key)}
                  />
                ))}
              </div>
            )}
          </div>

          {!data.isLoading && hiddenCount > 0 && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-neutral-100 px-3 py-2 text-xs dark:border-neutral-800">
              <span className="min-w-0 truncate tabular-nums text-neutral-500 dark:text-neutral-400">
                {hiddenValue > 0 && total > 0
                  ? t("{count} more, {value} {metric} ({share})", {
                      count: hiddenCount.toLocaleString(),
                      value: hiddenValue.toLocaleString(),
                      metric: metricNouns[metric],
                      share: `${((hiddenValue / total) * 100).toFixed(1)}%`,
                    })
                  : t("{count} more", { count: hiddenCount.toLocaleString() })}
              </span>
              {matching.length > visible.length && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="shrink-0 text-neutral-700 dark:text-neutral-200"
                  onClick={() => setRowLimit(limit => (limit === INITIAL_ROWS ? ROWS_STEP : limit + ROWS_STEP))}
                >
                  {t("Show more")}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
