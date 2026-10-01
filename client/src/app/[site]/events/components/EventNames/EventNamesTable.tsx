"use client";

import { Filter } from "@rybbit/shared";
import { useMeasure } from "@uidotdev/usehooks";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, TriangleAlert } from "lucide-react";
import { useExtracted } from "next-intl";
import { Fragment, ReactNode, useState } from "react";

import { EventTrendBucket, Goal, SavedFunnel } from "@/api/analytics/endpoints";
import { Delta } from "@/components/site/Delta";
import { PivotActions } from "@/components/site/PivotActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDateTimeFormat } from "@/hooks/useDateTimeFormat";
import { percentDelta } from "@/lib/delta";
import { addFilter, getTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";
import { EventNameRow, EventNameSortKey, SortDirection } from "../../utils/eventNameRows";
import { formatShare } from "../../utils/properties";
import { funnelsForEvent, goalsForEvent } from "../../utils/usedIn";
import { COLUMN, visibleColumnCount } from "./columns";
import { EventPropertyBreakdown } from "./EventPropertyBreakdown";
import { EventSparkline } from "./EventSparkline";
import { UsedIn } from "./UsedIn";

const eventFilter = (eventName: string): Filter[] => [{ parameter: "event_name", type: "equals", value: [eventName] }];

export interface EventNamesSort {
  key: EventNameSortKey;
  direction: SortDirection;
}

interface EventNamesTableProps {
  rows: EventNameRow[];
  /** The largest count among every name, so bars keep their scale when the list is cut or searched. */
  maxCount: number;
  sort: EventNamesSort;
  onSort: (key: EventNameSortKey) => void;
  trendBucket: EventTrendBucket;
  /** Undefined while loading, or when the viewer may not read them. */
  goals: Goal[] | undefined;
  funnels: SavedFunnel[] | undefined;
  isLoadingUsedIn: boolean;
  canCreateGoal: boolean;
  /** Names that used to fire daily and have stopped. */
  silentEvents: ReadonlySet<string>;
  /** The comparison is on: draw the change column. */
  showChange: boolean;
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: EventNameSortKey;
  sort: EventNamesSort;
  onSort: (key: EventNameSortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  const Arrow = sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 whitespace-nowrap hover:text-neutral-900 dark:hover:text-neutral-100",
        align === "right" && "flex-row-reverse",
        active && "text-neutral-900 dark:text-neutral-100"
      )}
    >
      {label}
      {active && <Arrow className="h-3 w-3" aria-hidden="true" />}
    </button>
  );
}

export function EventNamesTable({
  rows,
  maxCount,
  sort,
  onSort,
  trendBucket,
  goals,
  funnels,
  isLoadingUsedIn,
  canCreateGoal,
  silentEvents,
  showChange,
}: EventNamesTableProps) {
  const t = useExtracted();
  const { formatRelative, formatDateTime } = useDateTimeFormat();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [containerRef, { width: containerWidth }] = useMeasure<HTMLDivElement>();
  const timezone = getTimezone();

  const trendLabels: Record<EventTrendBucket, string> = {
    hour: t("Events per hour"),
    day: t("Events per day"),
    week: t("Events per week"),
    month: t("Events per month"),
  };

  const header = (key: EventNameSortKey, label: string, align: "left" | "right" = "left"): ReactNode => (
    <SortHeader label={label} sortKey={key} sort={sort} onSort={onSort} align={align} />
  );
  const ariaSort = (key: EventNameSortKey) =>
    sort.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined;

  return (
    <div ref={containerRef} className="@container">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
            <TableHead className="rounded-none pl-3 first:rounded-none" aria-sort={ariaSort("name")}>
              {header("name", t("Event"))}
            </TableHead>
            <TableHead className="w-[120px] @min-[480px]:w-[196px]" aria-sort={ariaSort("count")}>
              {header("count", t("Events"))}
            </TableHead>
            <TableHead className={cn("w-[72px] text-right", COLUMN.users)} aria-sort={ariaSort("users")}>
              {header("users", t("Users"), "right")}
            </TableHead>
            <TableHead className={cn("w-[84px] text-right", COLUMN.perUser)} aria-sort={ariaSort("perUser")}>
              {header("perUser", t("Per user"), "right")}
            </TableHead>
            <TableHead className={cn("w-[112px] pl-4", COLUMN.trend)}>{t("Trend")}</TableHead>
            {showChange && (
              <TableHead className={cn("w-[84px]", COLUMN.change)} aria-sort={ariaSort("change")}>
                {header("change", t("Change"))}
              </TableHead>
            )}
            <TableHead className={cn("w-[112px]", COLUMN.lastSeen)} aria-sort={ariaSort("lastSeen")}>
              {header("lastSeen", t("Last seen"))}
            </TableHead>
            <TableHead className={cn("w-[232px]", COLUMN.usedIn)}>{t("Used in")}</TableHead>
            <TableHead className={cn("w-[84px] rounded-none pr-3 text-right last:rounded-none", COLUMN.people)}>
              {t("People")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => {
            const isOpen = expanded === row.eventName;
            const isSilent = silentEvents.has(row.eventName);
            const eventGoals = goalsForEvent(goals, row.eventName);
            const eventFunnels = funnelsForEvent(funnels, row.eventName);
            const lastSeen = row.lastSeen?.setZone(timezone) ?? null;
            const peak = Math.max(...row.trend, 0);
            const usedIn = (
              <UsedIn
                eventName={row.eventName}
                goals={eventGoals}
                funnels={eventFunnels}
                isLoading={isLoadingUsedIn}
                canCreateGoal={canCreateGoal}
              />
            );

            return (
              <Fragment key={row.eventName}>
                <TableRow
                  className={cn(
                    "group h-11",
                    isOpen &&
                      "border-b-0 bg-neutral-50 hover:bg-neutral-50 dark:bg-neutral-850/50 dark:hover:bg-neutral-850/50"
                  )}
                >
                  <TableCell className="pl-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={
                          isOpen
                            ? t("Hide the properties of {name}", { name: row.eventName })
                            : t("Show the properties of {name}", { name: row.eventName })
                        }
                        onClick={() => setExpanded(isOpen ? null : row.eventName)}
                        className="shrink-0 cursor-pointer text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                        ) : (
                          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                        )}
                      </button>
                      <button
                        type="button"
                        title={t("Filter by {name}", { name: row.eventName })}
                        onClick={() => addFilter(eventFilter(row.eventName)[0])}
                        className="min-w-0 cursor-pointer truncate text-left font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                      >
                        {row.eventName}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="min-w-11 text-right font-medium tabular-nums" title={row.count.toLocaleString()}>
                        {row.count.toLocaleString()}
                      </span>
                      <div className="relative hidden h-1.5 min-w-0 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800 @min-[480px]:block">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-dataviz"
                          style={{ width: `${maxCount > 0 ? (row.count / maxCount) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-11 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                        {formatShare(row.share)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", COLUMN.users)}>
                    {row.users.toLocaleString()}
                  </TableCell>
                  <TableCell
                    className={cn("text-right tabular-nums text-neutral-600 dark:text-neutral-300", COLUMN.perUser)}
                  >
                    {row.perUser.toFixed(2)}
                  </TableCell>
                  <TableCell className={cn("pl-4", COLUMN.trend)}>
                    <EventSparkline
                      values={row.trend}
                      muted={isSilent}
                      label={t("{metric}, peak {peak}", {
                        metric: trendLabels[trendBucket],
                        peak: peak.toLocaleString(),
                      })}
                    />
                  </TableCell>
                  {showChange && (
                    <TableCell className={COLUMN.change}>
                      <Delta value={percentDelta(row.count, row.previousCount)} />
                    </TableCell>
                  )}
                  <TableCell className={cn("whitespace-nowrap text-xs tabular-nums", COLUMN.lastSeen)}>
                    {lastSeen ? (
                      <span
                        title={formatDateTime(lastSeen, {
                          dateStyle: "medium",
                          timeStyle: "medium",
                          timeZone: timezone,
                        })}
                        className={cn(
                          "inline-flex items-center gap-1",
                          isSilent
                            ? "font-medium text-yellow-600 dark:text-yellow-400"
                            : "text-neutral-600 dark:text-neutral-300"
                        )}
                      >
                        {isSilent && <TriangleAlert className="h-3 w-3" aria-hidden="true" />}
                        {formatRelative(lastSeen)}
                      </span>
                    ) : (
                      <span className="text-neutral-400 dark:text-neutral-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className={COLUMN.usedIn}>{usedIn}</TableCell>
                  <TableCell className={cn("pr-3", COLUMN.people)}>
                    <PivotActions
                      filters={eventFilter(row.eventName)}
                      showLabels={false}
                      className="flex-nowrap justify-end opacity-60 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                    />
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-neutral-50 hover:bg-neutral-50 dark:bg-neutral-850/50 dark:hover:bg-neutral-850/50">
                    <TableCell colSpan={visibleColumnCount(containerWidth, showChange)} className="p-0">
                      <div className="space-y-3 px-3 pb-3.5 pt-1 md:pl-9">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {t.rich("Properties sent with <name></name>, as a share of its events.", {
                              name: () => (
                                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                                  {row.eventName}
                                </span>
                              ),
                            })}
                          </div>
                          <PivotActions
                            filters={eventFilter(row.eventName)}
                            actions={["sessions", "users", "replays", "segment"]}
                          />
                        </div>
                        {/* The column that holds these is hidden at this width. */}
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 @min-[1120px]:hidden">
                          <span className="shrink-0">{t("Used in")}</span>
                          {usedIn}
                        </div>
                        <EventPropertyBreakdown eventName={row.eventName} eventCount={row.count} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function EventNamesTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div>
      <div className="h-8 bg-neutral-50 dark:bg-neutral-850" />
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex h-11 items-center gap-4 border-b border-neutral-100 px-3 last:border-b-0 dark:border-neutral-800"
        >
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 rounded" style={{ width: `${28 - index * 2}%` }} />
          <Skeleton className="ml-auto h-4 w-40 rounded" />
          <Skeleton className="hidden h-4 w-64 rounded md:block" />
        </div>
      ))}
    </div>
  );
}
