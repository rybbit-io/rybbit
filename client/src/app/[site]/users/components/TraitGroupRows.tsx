"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import { TraitGroupStats } from "@/api/analytics/endpoints";
import { TraitGroupSelector, useGetUsersInfinite, UsersNarrowing } from "@/api/analytics/hooks/useGetUsers";
import { Delta } from "@/components/site/Delta";
import { Skeleton } from "@/components/ui/skeleton";
import { percentDelta } from "@/lib/delta";
import { BuiltInColumn, columnId, METRIC_COLUMNS, TableColumn } from "../columns";
import { UserRow } from "./UserRow";

const GROUP_PAGE_SIZE = 10;

export interface TraitGroupView {
  /** Stable across refetches: the value, or a fixed id for the two catch-all groups. */
  id: string;
  label: ReactNode;
  /** The label as plain text, for the expand button's accessible name. */
  name: string;
  stats: TraitGroupStats;
  /** Users in the comparison period. Undefined when there is nothing to compare with. */
  previousUsers?: number;
  /** The group's share of its population, as a sentence: "13.1% of identified". */
  shareLabel: string;
  /** Bar length against the largest group, 0 to 1. Omitted for the catch-all groups. */
  bar?: number;
  /** What to ask the users list for. Null when the group cannot be listed. */
  selector: TraitGroupSelector | null;
}

const isMetric = (column: TableColumn): column is { kind: "builtIn"; id: BuiltInColumn } =>
  column.kind === "builtIn" && METRIC_COLUMNS.includes(column.id);

function GroupUsers({
  selector,
  total,
  columns,
  narrowing,
  sortBy,
  sortOrder,
  site,
  privateKey,
}: {
  selector: TraitGroupSelector;
  total: number;
  columns: TableColumn[];
  narrowing: Omit<UsersNarrowing, "traitGroup">;
  sortBy: string;
  sortOrder: string;
  site: string;
  privateKey: string | null;
}) {
  const t = useExtracted();
  const { data, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useGetUsersInfinite({
    ...narrowing,
    traitGroup: selector,
    pageSize: GROUP_PAGE_SIZE,
    sortBy,
    sortOrder,
  });
  const span = columns.length + 1;

  if (data === undefined && !isError) {
    return Array.from({ length: Math.min(total, 3) }).map((_, index) => (
      <tr key={index} className="border-b border-b-neutral-100 dark:border-b-neutral-800">
        <td colSpan={span} className="py-2.5 pl-9 pr-3">
          <Skeleton className="h-5 w-full rounded" />
        </td>
      </tr>
    ));
  }

  const users = data?.pages.flatMap(page => page.data) ?? [];
  const listed = data?.pages[0]?.totalCount ?? 0;
  const remaining = Math.max(listed - users.length, 0);

  if (isError || users.length === 0) {
    return (
      <tr className="border-b border-b-neutral-100 dark:border-b-neutral-800">
        <td colSpan={span} className="py-2 pl-9 pr-3 text-xs text-neutral-500 dark:text-neutral-400">
          {isError ? t("Could not load these users. Try again in a moment.") : t("No users found")}
        </td>
      </tr>
    );
  }

  return (
    <>
      {users.map(user => (
        <UserRow
          key={user.identified_user_id || user.user_id}
          user={user}
          columns={columns}
          site={site}
          privateKey={privateKey}
          indented
        />
      ))}
      {hasNextPage && (
        <tr className="border-b border-b-neutral-100 dark:border-b-neutral-800">
          <td colSpan={span} className="py-1.5 pl-9 pr-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:underline disabled:opacity-50 dark:text-neutral-300"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {t("Show {count} more", { count: Math.min(remaining, GROUP_PAGE_SIZE).toLocaleString() })}
              <ChevronDown className="h-3 w-3" />
            </button>
            {remaining > GROUP_PAGE_SIZE && (
              <span className="ml-2 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {t("{count} left", { count: remaining.toLocaleString() })}
              </span>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * One group of the trait breakdown: a summary row (users, change, share, and
 * per-user averages under the count columns) and, when open, the group's users.
 */
export function TraitGroupRows({
  group,
  open,
  onToggle,
  columns,
  narrowing,
  sortBy,
  sortOrder,
  site,
  privateKey,
}: {
  group: TraitGroupView;
  open: boolean;
  onToggle: () => void;
  columns: TableColumn[];
  narrowing: Omit<UsersNarrowing, "traitGroup">;
  sortBy: string;
  sortOrder: string;
  site: string;
  privateKey: string | null;
}) {
  const t = useExtracted();
  const { stats, selector } = group;

  // The summary spans the columns before the counts, then lines its averages
  // up under them. Whatever follows the counts is left empty.
  const firstMetric = columns.findIndex(isMetric);
  const metrics = columns.filter(isMetric);
  const leadSpan = 1 + (firstMetric === -1 ? columns.length : firstMetric);
  const trailingSpan = firstMetric === -1 ? 0 : columns.length - firstMetric - metrics.length;

  const average = (id: BuiltInColumn) => {
    const total = id === "sessions" ? stats.sessions : id === "pageviews" ? stats.pageviews : stats.events;
    return stats.users > 0 ? (total / stats.users).toFixed(1) : "–";
  };
  const expandable = selector !== null && stats.users > 0;

  return (
    <>
      <tr className="border-b border-b-neutral-100 bg-neutral-50 dark:border-b-neutral-800 dark:bg-neutral-850/60">
        <td colSpan={leadSpan} className="py-1.5 pl-3 pr-2">
          <div className="@container">
            <div className="flex min-w-0 items-center gap-2">
              {expandable ? (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={
                    open ? t("Collapse {group}", { group: group.name }) : t("Expand {group}", { group: group.name })
                  }
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  onClick={onToggle}
                >
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="h-5 w-5 shrink-0" />
              )}
              <span
                className="min-w-0 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50"
                title={group.name}
              >
                {group.label}
              </span>
              <span className="whitespace-nowrap text-sm tabular-nums text-neutral-700 dark:text-neutral-200">
                {stats.users === 1
                  ? t("{count} user", { count: stats.users.toLocaleString() })
                  : t("{count} users", { count: stats.users.toLocaleString() })}
              </span>
              <Delta value={percentDelta(stats.users, group.previousUsers)} />
              <span className="ml-auto flex shrink-0 items-center gap-2">
                {group.bar !== undefined && (
                  <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200 @lg:block dark:bg-neutral-800">
                    <span
                      className="block h-full rounded-full bg-dataviz"
                      style={{ width: `${Math.min(group.bar, 1) * 100}%` }}
                    />
                  </span>
                )}
                <span className="hidden whitespace-nowrap text-xs tabular-nums text-neutral-500 @md:inline dark:text-neutral-400">
                  {group.shareLabel}
                </span>
                {metrics.length > 0 && (
                  <span className="hidden whitespace-nowrap pl-2 text-[11px] uppercase tracking-wide text-neutral-500 @sm:inline dark:text-neutral-400">
                    {t("Avg / user")}
                  </span>
                )}
              </span>
            </div>
          </div>
        </td>
        {metrics.map(column => (
          <td
            key={columnId(column)}
            className="px-2 text-right text-sm tabular-nums text-neutral-700 dark:text-neutral-200"
          >
            {average(column.id)}
          </td>
        ))}
        {trailingSpan > 0 && <td colSpan={trailingSpan} />}
      </tr>
      {expandable && open && (
        <GroupUsers
          selector={selector}
          total={stats.users}
          columns={columns}
          narrowing={narrowing}
          sortBy={sortBy}
          sortOrder={sortOrder}
          site={site}
          privateKey={privateKey}
        />
      )}
    </>
  );
}
