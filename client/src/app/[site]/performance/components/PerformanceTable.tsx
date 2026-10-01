"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, SquareArrowOutUpRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode, useState } from "react";
import { Delta } from "@/components/site/Delta";
import { PivotActions } from "@/components/site/PivotActions";
import { Button } from "@/components/ui/button";
import { CardLoader } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { percentDelta } from "@/lib/delta";
import { cn } from "@/lib/utils";
import { useGetSite } from "../../../../api/admin/hooks/useSites";
import { PerformanceByDimensionItem } from "../../../../api/analytics/endpoints";
import { useSubdivisions } from "../../../../lib/geo";
import { addFilter, removeFilter, useStore } from "../../../../lib/store";
import { getCountryName } from "../../../../lib/utils";
import { Browser } from "../../components/shared/icons/Browser";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { DeviceIcon } from "../../components/shared/icons/Device";
import { OperatingSystem } from "../../components/shared/icons/OperatingSystem";
import { PercentileLevel, PerformanceMetric, usePerformanceStore } from "../performanceStore";
import {
  formatMetric,
  formatShare,
  getMetricRating,
  getPerformanceThresholds,
  getRatingSplit,
  METRIC_LABELS_SHORT,
  METRIC_RATINGS,
  MetricRating,
  PASSING_GOOD_SHARE,
  PERFORMANCE_METRICS,
  RATING_TEXT_CLASS,
} from "../utils/performanceUtils";
import {
  DEFAULT_PERFORMANCE_SORT,
  PERFORMANCE_PAGE_SIZE,
  PerformanceDimension,
  PerformanceSort,
  usePerformanceRows,
} from "../utils/usePerformanceRows";
import { MetricTooltip } from "./shared/MetricTooltip";
import { RatingMark, useRatingLabels } from "./shared/RatingMark";

const isMeasured = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const HEAD_BUTTON =
  "inline-flex items-center gap-1 rounded-sm hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:hover:text-neutral-100";

type SortColumn = PerformanceMetric | "loads";

function SortHeader({
  active,
  desc,
  onSort,
  children,
  className,
}: {
  active: boolean;
  desc: boolean;
  onSort: () => void;
  children: ReactNode;
  className?: string;
}) {
  const Arrow = desc ? ArrowDown : ArrowUp;
  return (
    <TableHead
      aria-sort={active ? (desc ? "descending" : "ascending") : undefined}
      className={cn("text-right", active && "text-neutral-900 dark:text-neutral-100", className)}
    >
      <button type="button" className={HEAD_BUTTON} onClick={onSort}>
        {children}
        {active && <Arrow className="h-3 w-3" aria-hidden="true" />}
      </button>
    </TableHead>
  );
}

/** How one row's loads split across the three ratings, and the way from that row to the people behind it. */
function MetricPopover({
  metric,
  percentile,
  dimension,
  value,
  name,
  row,
  current,
  previous,
}: {
  metric: PerformanceMetric;
  percentile: PercentileLevel;
  dimension: PerformanceDimension;
  /** The row's raw dimension value, as the filter takes it. */
  value: string;
  /** The row as the table prints it: a path, a country name. */
  name: string;
  row: PerformanceByDimensionItem;
  current: number;
  previous: number | null | undefined;
}) {
  const t = useExtracted();
  const ratingLabels = useRatingLabels();
  const thresholds = getPerformanceThresholds(metric);
  const rating = getMetricRating(metric, current);
  const split = getRatingSplit(row, metric);
  const good = formatMetric(metric, thresholds.good);
  const poor = formatMetric(metric, thresholds.needs_improvement);
  const ranges: Record<MetricRating, string> = {
    good: t("up to {limit}", { limit: good }),
    needs_improvement: t("{from} to {to}", { from: good, to: poor }),
    poor: t("over {limit}", { limit: poor }),
  };
  const loads = (split?.count ?? row.event_count).toLocaleString();
  const now = formatMetric(metric, current);

  return (
    <>
      <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium" title={name}>
            {t("{metric} on {name}", { metric: METRIC_LABELS_SHORT[metric], name })}
          </div>
          <div className="mt-0.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {isMeasured(previous)
              ? t("{loads} loads · {percentile} {value} · was {previous}", {
                  loads,
                  percentile,
                  value: now,
                  previous: formatMetric(metric, previous),
                })
              : t("{loads} loads · {percentile} {value}", { loads, percentile, value: now })}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 pt-0.5 text-xs font-medium",
            RATING_TEXT_CLASS[rating]
          )}
        >
          <RatingMark rating={rating} />
          {ratingLabels[rating]}
        </span>
      </div>
      {split && (
        <div className="border-t border-neutral-100 px-1 py-1.5 dark:border-neutral-700">
          {METRIC_RATINGS.map(key => (
            <div
              key={key}
              className={cn(
                "flex h-7 items-center gap-2 rounded-md px-2 text-xs",
                key === rating && "bg-neutral-100 dark:bg-neutral-700"
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <RatingMark rating={key} />
                <span className="truncate text-neutral-800 dark:text-neutral-100">{ratingLabels[key]}</span>
              </span>
              <span className="w-24 shrink-0 whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                {ranges[key]}
              </span>
              <span className="w-12 shrink-0 text-right tabular-nums text-neutral-700 dark:text-neutral-200">
                {split[key].toLocaleString()}
              </span>
              <span className="w-12 shrink-0 text-right font-medium tabular-nums text-neutral-900 dark:text-neutral-50">
                {formatShare((split[key] / split.count) * 100)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-neutral-100 px-1.5 py-1.5 dark:border-neutral-700">
        <PivotActions
          filters={[{ parameter: dimension, type: "equals", value: [value] }]}
          actions={["sessions", "replays", "segment"]}
        />
      </div>
    </>
  );
}

function MetricCell(props: {
  metric: PerformanceMetric;
  percentile: PercentileLevel;
  dimension: PerformanceDimension;
  value: string;
  name: string;
  row: PerformanceByDimensionItem;
  previousRow: PerformanceByDimensionItem | undefined;
}) {
  const { metric, percentile, row, previousRow } = props;
  const ratingLabels = useRatingLabels();
  const current = row[`${metric}_${percentile}`];
  if (!isMeasured(current)) return <span className="text-neutral-400 dark:text-neutral-500">—</span>;

  const rating = getMetricRating(metric, current);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "-mr-1.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded px-1.5 py-1 tabular-nums hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 data-[state=open]:ring-2 data-[state=open]:ring-neutral-900 dark:hover:bg-neutral-800 dark:data-[state=open]:ring-neutral-50",
            rating === "good" ? "text-neutral-800 dark:text-neutral-200" : cn("font-medium", RATING_TEXT_CLASS[rating])
          )}
        >
          <RatingMark rating={rating} label={ratingLabels[rating]} />
          {formatMetric(metric, current)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[372px] max-w-[calc(100vw-2rem)] p-0">
        <MetricPopover {...props} current={current} previous={previousRow?.[`${metric}_${percentile}`]} />
      </PopoverContent>
    </Popover>
  );
}

/** Share of good loads as a bar, with a tick at the 75% a metric needs to pass. */
function GoodShare({ share }: { share: number | null }) {
  if (share === null) return <span className="text-neutral-400 dark:text-neutral-500">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 min-w-0 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-dataviz" style={{ width: `${share}%` }} />
        <div
          className="absolute -top-1 h-3.5 w-px bg-neutral-400 dark:bg-neutral-300"
          style={{ left: `${PASSING_GOOD_SHARE}%` }}
        />
      </div>
      <span
        className={cn(
          "w-11 shrink-0 text-right tabular-nums",
          share < PASSING_GOOD_SHARE
            ? "font-medium text-neutral-900 dark:text-neutral-50"
            : "text-neutral-700 dark:text-neutral-200"
        )}
      >
        {formatShare(share)}
      </span>
    </div>
  );
}

export function PerformanceTable({ dimension }: { dimension: PerformanceDimension }) {
  const t = useExtracted();
  const filters = useStore(state => state.filters);
  const { data: siteMetadata } = useGetSite();
  const { data: subdivisions } = useSubdivisions();
  const { selectedPercentile: percentile, selectedPerformanceMetric: selectedMetric } = usePerformanceStore();
  const ratingLabels = useRatingLabels();
  const [pageIndex, setPageIndex] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("loads");
  const [sortDesc, setSortDesc] = useState(true);

  // Sorted on the server. A metric column sorts by the percentile on screen.
  const sortId = (column: SortColumn) => (column === "loads" ? DEFAULT_PERFORMANCE_SORT.by : `${column}_${percentile}`);
  const sort: PerformanceSort = { by: sortId(sortColumn), desc: sortDesc };
  const onSort = (column: SortColumn) => {
    setSortDesc(column === sortColumn ? !sortDesc : true);
    setSortColumn(column);
    setPageIndex(0);
  };

  const { rows, totalCount, previousByValue, hasPrevious, isLoading, isFetching } = usePerformanceRows({
    dimension,
    page: pageIndex + 1,
    sort,
  });
  const totalPages = Math.ceil(totalCount / PERFORMANCE_PAGE_SIZE);
  // A filter or a shorter period can leave fewer pages than the one on screen.
  if (!isFetching && totalPages > 0 && pageIndex > totalPages - 1) setPageIndex(totalPages - 1);

  const toggleFilter = (value: string) => {
    const existing = filters.find(filter => filter.parameter === dimension && filter.value.some(v => v === value));
    if (existing) removeFilter(existing);
    else addFilter({ parameter: dimension, value: [value], type: "equals" });
  };

  const regionName = (code: string) =>
    subdivisions?.features.find(feature => feature.properties.iso_3166_2 === code)?.properties.name ?? code.slice(3);

  const nameOf = (value: string): string => {
    if (dimension === "country") return getCountryName(value) || value;
    if (dimension === "region") return `${value.split("-")[0]} › ${regionName(value)}`;
    return value;
  };

  const iconOf = (value: string): ReactNode => {
    switch (dimension) {
      case "country":
        return <CountryFlag country={value} />;
      case "region":
        return <CountryFlag country={value.split("-")[0]} />;
      case "device_type":
        return <DeviceIcon deviceType={value} />;
      case "browser":
        return <Browser browser={value} />;
      case "operating_system":
        return <OperatingSystem os={value} />;
      default:
        return null;
    }
  };

  const dimensionLabel: Record<PerformanceDimension, string> = {
    pathname: t("Page"),
    country: t("Country"),
    region: t("Region"),
    device_type: t("Device type"),
    browser: t("Browser"),
    operating_system: t("Operating system"),
  };
  const selectedShort = METRIC_LABELS_SHORT[selectedMetric];
  const columnCount = PERFORMANCE_METRICS.length + (hasPrevious ? 5 : 4);
  const firstRow = pageIndex * PERFORMANCE_PAGE_SIZE + 1;

  return (
    <>
      {isFetching && <CardLoader />}
      <Table className="min-w-[1020px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
            <TableHead className="min-w-[200px] rounded-none pl-4 first:rounded-none">
              {dimensionLabel[dimension]}
            </TableHead>
            {PERFORMANCE_METRICS.map(metric => (
              <SortHeader
                key={metric}
                active={sortColumn === metric}
                desc={sortDesc}
                onSort={() => onSort(metric)}
                className={cn("w-[84px]", metric === selectedMetric && "text-neutral-900 dark:text-neutral-100")}
              >
                <MetricTooltip metric={metric}>
                  <span>{METRIC_LABELS_SHORT[metric]}</span>
                </MetricTooltip>
              </SortHeader>
            ))}
            <TableHead className="w-[168px] pl-4">{t("Good {metric} loads", { metric: selectedShort })}</TableHead>
            {hasPrevious && (
              <TableHead className="w-[88px] whitespace-nowrap text-right">
                {t("{metric} change", { metric: selectedShort })}
              </TableHead>
            )}
            <SortHeader
              active={sortColumn === "loads"}
              desc={sortDesc}
              onSort={() => onSort("loads")}
              className="w-[76px]"
            >
              {t("Loads")}
            </SortHeader>
            <TableHead className="w-[72px] rounded-none pr-4 last:rounded-none">
              <span className="sr-only">{t("Open in")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index} className="h-9">
                <TableCell className="py-0 pl-4">
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                {Array.from({ length: columnCount - 1 }).map((_, cell) => (
                  <TableCell key={cell} className="py-0">
                    <Skeleton className="ml-auto h-4 w-12" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
              <TableCell colSpan={columnCount} className="py-10 text-center text-neutral-500 dark:text-neutral-400">
                {t("No performance data available")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map(row => {
              const value = String(row[dimension]);
              const name = nameOf(value);
              const previousRow = previousByValue.get(value);
              const split = getRatingSplit(row, selectedMetric);
              const key = `${selectedMetric}_${percentile}` as const;

              return (
                <TableRow key={value} className="group h-9">
                  <TableCell className="max-w-0 py-0 pl-4">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-2 text-neutral-900 hover:underline dark:text-neutral-100"
                        title={t("Filter by {name}", { name })}
                        onClick={() => toggleFilter(value)}
                      >
                        {iconOf(value)}
                        <span className="truncate">{name}</span>
                      </button>
                      {dimension === "pathname" && siteMetadata?.domain && (
                        <a
                          href={`https://${siteMetadata.domain}${value}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t("Open page in a new tab")}
                          className="shrink-0 text-neutral-500 hover:text-neutral-900 focus-visible:opacity-100 dark:text-neutral-400 dark:hover:text-neutral-100 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  {PERFORMANCE_METRICS.map(metric => (
                    <TableCell key={metric} className="py-0 text-right">
                      <MetricCell
                        metric={metric}
                        percentile={percentile}
                        dimension={dimension}
                        value={value}
                        name={name}
                        row={row}
                        previousRow={previousRow}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="py-0 pl-4">
                    <GoodShare share={split ? split.goodShare : null} />
                  </TableCell>
                  {hasPrevious && (
                    <TableCell className="py-0 text-right">
                      <Delta value={percentDelta(row[key], previousRow?.[key])} upIsGood={false} />
                    </TableCell>
                  )}
                  <TableCell className="py-0 text-right tabular-nums text-neutral-700 dark:text-neutral-200">
                    {row.event_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-0 pr-4">
                    <PivotActions
                      filters={[{ parameter: dimension, type: "equals", value: [value] }]}
                      actions={["sessions", "replays"]}
                      showLabels={false}
                      className="flex-nowrap justify-end"
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-500 dark:border-neutral-850 dark:text-neutral-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {METRIC_RATINGS.map(rating => (
              <span key={rating} className="inline-flex items-center gap-1.5">
                <RatingMark rating={rating} />
                {ratingLabels[rating]}
              </span>
            ))}
            <span>
              {t("Rated at {percentile}. The tick on each bar is the 75% of good loads needed to pass.", {
                percentile,
              })}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="tabular-nums">
              {t("{from}–{to} of {total}", {
                from: firstRow.toLocaleString(),
                to: (firstRow + rows.length - 1).toLocaleString(),
                total: totalCount.toLocaleString(),
              })}
            </span>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="smIcon"
                aria-label={t("Previous page")}
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(index => Math.max(0, index - 1))}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="smIcon"
                aria-label={t("Next page")}
                disabled={pageIndex >= totalPages - 1}
                onClick={() => setPageIndex(index => index + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
