"use client";

import { ChevronDown, ChevronUp, Target } from "lucide-react";
import { useExtracted } from "next-intl";
import { KeyboardEvent, useState } from "react";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { Delta } from "@/components/site/Delta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NO_DELTA_TEXT, percentDelta } from "@/lib/delta";
import { cn } from "@/lib/utils";
import { JourneyRow, pathContainsPage, pathKey } from "./journeyUtils";
import { PathActionHandlers, PathActions } from "./PathActions";
import { PathChips } from "./PathChips";

const COLLAPSED_ROWS = 12;

type ReachFilter = "all" | "reached" | "not-reached";

const TH = "h-8 px-2 text-left align-middle text-xs font-medium text-neutral-500 dark:text-neutral-400";
const TD = "p-2 align-middle";

export interface TopPathsProps {
  journeys: JourneyRow[];
  isLoading: boolean;
  steps: number;
  /**
   * Each path's sessions in the comparison period, by path key. Null while the
   * comparison is off or still loading: the column is then left out.
   */
  previousCounts: Map<string, number> | null;
  /** The selected goal's name; null hides the reach column and filter. */
  goalName: string | null;
  pinnedKey: string | null;
  onPin: (path: string[]) => void;
  pageHref: (page: string) => string | undefined;
  handlers: PathActionHandlers;
}

/** The shown paths as a table: size, share, change, goal reach, and the way to the sessions behind each. */
export function TopPaths({
  journeys,
  isLoading,
  steps,
  previousCounts,
  goalName,
  pinnedKey,
  onPin,
  pageHref,
  handlers,
}: TopPathsProps) {
  const t = useExtracted();
  const [reachFilter, setReachFilter] = useState<ReachFilter>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const hasGoal = goalName !== null && journeys.some(journey => journey.conversions !== undefined);
  const activeReachFilter = hasGoal ? reachFilter : "all";
  const matching = journeys.filter(journey => {
    if (activeReachFilter === "reached" && !journey.conversions) return false;
    if (activeReachFilter === "not-reached" && journey.conversions) return false;
    return pathContainsPage(journey.path, search);
  });
  const visible = expanded ? matching : matching.slice(0, COLLAPSED_ROWS);
  const largest = Math.max(1, ...journeys.map(journey => journey.count));
  // A row keeps its rank among all paths when the table is filtered.
  const ranks = new Map(journeys.map((journey, index) => [pathKey(journey.path), index + 1]));
  const columnCount = 5 + (previousCounts ? 1 : 0) + (hasGoal ? 1 : 0);

  const activateRow = (event: KeyboardEvent, path: string[]) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPin(path);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold leading-none tracking-tight">{t("Top paths")}</h2>
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t("Exact page sequences from session start, up to {steps} steps", { steps: String(steps) })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasGoal && (
            <SegmentedControl
              size="sm"
              aria-label={t("Filter paths by goal")}
              value={reachFilter}
              onValueChange={setReachFilter}
              options={[
                { value: "all", label: t("All paths") },
                { value: "reached", label: t("Reach {goal}", { goal: goalName }) },
                { value: "not-reached", label: t("Never reach it") },
              ]}
            />
          )}
          <div className="w-full sm:w-56">
            <Input
              isSearch
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t("Contains page, e.g. /docs/**")}
              aria-label={t("Filter paths by page")}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <table className="w-full min-w-[900px] caption-bottom text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-850">
            <tr>
              <th className={cn(TH, "w-9 pl-4")}>#</th>
              <th className={TH}>{t("Path")}</th>
              <th className={cn(TH, "w-40 text-right")}>{t("Sessions")}</th>
              <th className={cn(TH, "w-[72px] text-right")} title={t("Share of sessions with two or more pages")}>
                {t("Share")}
              </th>
              {previousCounts && (
                <th
                  className={cn(TH, "w-[84px] text-right")}
                  title={t("Change in sessions against the comparison period")}
                >
                  {t("vs prev.")}
                </th>
              )}
              {hasGoal && (
                <th className={cn(TH, "w-[132px] text-right")}>
                  <span className="inline-flex max-w-full items-center gap-1">
                    <Target className="h-3 w-3 shrink-0" />
                    <span className="truncate">{t("Reach {goal}", { goal: goalName })}</span>
                  </span>
                </th>
              )}
              {/* Wide enough for the pinned row's labelled actions, so pinning does not shift the columns. */}
              <th className={cn(TH, "w-[276px] pr-4 text-right")}>{t("Open")}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-900 [&_tr:last-child]:border-0">
            {isLoading
              ? Array.from({ length: 6 }, (_, index) => (
                  <tr key={index} className="border-b border-b-neutral-100 dark:border-b-neutral-800">
                    <td className={cn(TD, "pl-4")} colSpan={columnCount}>
                      <Skeleton className="h-5 rounded" style={{ width: `${70 - index * 7}%` }} />
                    </td>
                  </tr>
                ))
              : visible.map(journey => {
                  const key = pathKey(journey.path);
                  const rank = ranks.get(key);
                  const isPinned = key === pinnedKey;
                  const previous = previousCounts?.get(key);
                  return (
                    <tr
                      key={key}
                      tabIndex={0}
                      aria-selected={isPinned}
                      onClick={() => onPin(journey.path)}
                      onKeyDown={event => activateRow(event, journey.path)}
                      className={cn(
                        "cursor-pointer border-b border-b-neutral-100 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-neutral-400 dark:border-b-neutral-800 dark:hover:bg-neutral-800/20 dark:focus-visible:ring-neutral-500",
                        isPinned && "bg-neutral-50 dark:bg-neutral-800/50 dark:hover:bg-neutral-800/50"
                      )}
                    >
                      <td className={cn(TD, "pl-4 text-xs tabular-nums text-neutral-500 dark:text-neutral-400")}>
                        {rank}
                      </td>
                      <td className={TD}>
                        <PathChips
                          path={journey.path}
                          pageHref={pageHref}
                          className="flex-nowrap"
                          chipClassName={isPinned ? "dark:border-neutral-700" : undefined}
                        />
                      </td>
                      <td className={TD}>
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="h-1.5 w-16 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <div
                              className="h-full rounded-full bg-dataviz"
                              style={{ width: `${(journey.count / largest) * 100}%` }}
                            />
                          </div>
                          <span className="w-14 text-right font-medium tabular-nums">
                            {journey.count.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className={cn(TD, "text-right tabular-nums text-neutral-600 dark:text-neutral-300")}>
                        {`${journey.percentage.toFixed(1)}%`}
                      </td>
                      {previousCounts && (
                        <td className={cn(TD, "text-right")}>
                          {previous === undefined ? (
                            <span
                              className="text-xs text-neutral-500 dark:text-neutral-400"
                              title={t("Not among the top paths of the comparison period")}
                            >
                              {NO_DELTA_TEXT}
                            </span>
                          ) : (
                            <Delta value={percentDelta(journey.count, previous)} />
                          )}
                        </td>
                      )}
                      {hasGoal && (
                        <td className={cn(TD, "text-right tabular-nums")}>
                          {journey.conversions ? (
                            <>
                              <span className="font-medium">
                                {journey.conversions === journey.count
                                  ? "100%"
                                  : `${((journey.conversions / journey.count) * 100).toFixed(1)}%`}
                              </span>
                              <span className="ml-1.5 inline-block w-10 text-left text-xs text-neutral-500 dark:text-neutral-400">
                                {journey.conversions.toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-neutral-500 dark:text-neutral-400">0%</span>
                              <span className="ml-1.5 inline-block w-10" />
                            </>
                          )}
                        </td>
                      )}
                      <td className={cn(TD, "pr-3")}>
                        <PathActions
                          path={journey.path}
                          handlers={handlers}
                          showLabels={isPinned}
                          className={cn(
                            "flex-nowrap justify-end",
                            !isPinned && "[&_a]:text-neutral-500 [&_button]:text-neutral-500"
                          )}
                        />
                      </td>
                    </tr>
                  );
                })}
            {!isLoading && visible.length === 0 && (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400"
                >
                  {journeys.length === 0 ? t("No paths in this range.") : t("No paths match this filter.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && matching.length > 0 && (
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <span className="tabular-nums">
            {t("Showing {shown} of {total} paths", {
              shown: String(visible.length),
              total: String(journeys.length),
            })}
          </span>
          {matching.length > COLLAPSED_ROWS && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="font-normal text-neutral-600 dark:text-neutral-300"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? t("Show fewer") : t("Show all")}
              {expanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
