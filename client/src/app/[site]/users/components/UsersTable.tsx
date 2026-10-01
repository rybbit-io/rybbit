"use client";

import { useDebounce } from "@uidotdev/usehooks";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, ChevronUp, Tags } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode, useState } from "react";
import { TraitBreakdown } from "@/api/analytics/endpoints";
import { useGetUsers, UsersNarrowing } from "@/api/analytics/hooks/useGetUsers";
import { useGetUserTraitBreakdown, useGetUserTraitKeys } from "@/api/analytics/hooks/useGetUserTraits";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  BuiltInColumn,
  columnId,
  columnWidth,
  SORTABLE_COLUMNS,
  TableColumn,
  tableMinWidth,
  visibleColumns,
} from "../columns";
import { useColumnSelection } from "../useColumnSelection";
import { ColumnPicker } from "./ColumnPicker";
import { TraitGroupRows, TraitGroupView } from "./TraitGroupRows";
import { UserRow } from "./UserRow";

type SearchField = "name" | "username" | "email" | "user_id";
type SortColumn = "last_seen" | "first_seen" | "sessions" | "pageviews" | "events";
interface Sort {
  column: SortColumn;
  descending: boolean;
}

const RIGHT_ALIGNED: readonly BuiltInColumn[] = ["sessions", "pageviews", "events"];
const DEFAULT_PAGE_SIZE = 50;

const isSortable = (id: BuiltInColumn): id is SortColumn => SORTABLE_COLUMNS.includes(id);

const formatShare = (part: number, whole: number) =>
  (whole > 0 ? part / whole : 0).toLocaleString(undefined, { style: "percent", maximumFractionDigits: 1 });

function SortHeader({
  label,
  direction,
  alignRight,
  onSort,
}: {
  label: string;
  direction: "asc" | "desc" | null;
  alignRight: boolean;
  onSort: () => void;
}) {
  const Icon = direction === "desc" ? ChevronDown : direction === "asc" ? ChevronUp : ChevronsUpDown;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap hover:text-neutral-900 dark:hover:text-neutral-100",
        alignRight && "flex-row-reverse",
        direction && "text-neutral-900 dark:text-neutral-100"
      )}
      onClick={onSort}
    >
      {label}
      <Icon
        className={cn(
          "h-3 w-3 shrink-0",
          direction ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 dark:text-neutral-500"
        )}
        aria-hidden="true"
      />
    </button>
  );
}

function SkeletonRows({ rows, span }: { rows: number; span: number }) {
  return Array.from({ length: rows }).map((_, index) => (
    <tr key={index} className="border-b border-b-neutral-100 dark:border-b-neutral-800">
      <td colSpan={span} className="px-3 py-2.5">
        <Skeleton className="h-6 w-full rounded" />
      </td>
    </tr>
  ));
}

function MessageRow({ span, children }: { span: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={span} className="px-3 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
        {children}
      </td>
    </tr>
  );
}

/**
 * The users in the period: one table, flat and paged, or grouped by a trait
 * when `breakdown` names one. Search, the quick filters and the sort apply to
 * both shapes.
 */
export function UsersTable({
  breakdown,
  narrowing,
  ready,
  comparisonEnabled,
}: {
  /** The trait key the table is grouped by, or null for the flat list. */
  breakdown: string | null;
  narrowing: Pick<UsersNarrowing, "identifiedOnly" | "newOnly" | "minSessions">;
  /** False while a quick filter is still waiting for the figure it filters by. */
  ready: boolean;
  comparisonEnabled: boolean;
}) {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const privateKey = useStore(state => state.privateKey);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const search = useDebounce(searchTerm, 300).trim();
  const [sort, setSort] = useState<Sort>({ column: "last_seen", descending: true });
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageState, setPageState] = useState({ scope: "", page: 1 });
  const [expandedState, setExpandedState] = useState<{ key: string | null; open: Record<string, boolean> }>({
    key: null,
    open: {},
  });

  const { data: traitKeys, isError: isKeysError } = useGetUserTraitKeys();
  const { selection, setSelection } = useColumnSelection(site, traitKeys?.keys);
  const columns = visibleColumns(selection);
  const span = columns.length + 1;

  const fullNarrowing: Omit<UsersNarrowing, "traitGroup"> = { ...narrowing, search, searchField };
  const sortBy = sort.column;
  const sortOrder = sort.descending ? "desc" : "asc";

  // Anything that changes which users are listed sends the pager back to page one.
  const scope = JSON.stringify([fullNarrowing, sortBy, sortOrder, pageSize]);
  const page = pageState.scope === scope ? pageState.page : 1;

  const list = useGetUsers({
    ...fullNarrowing,
    page,
    pageSize,
    sortBy,
    sortOrder,
    enabled: ready && !breakdown,
  });
  const groups = useGetUserTraitBreakdown({ traitKey: breakdown, narrowing: fullNarrowing, enabled: ready });
  // Disabled while the comparison is off, which leaves every group's delta undrawn.
  const previousGroups = useGetUserTraitBreakdown({
    traitKey: breakdown,
    periodTime: "previous",
    narrowing: fullNarrowing,
    enabled: ready && comparisonEnabled,
  });

  // While a newly picked trait loads, the last trait's groups are still in hand; they are not this trait's.
  const current = breakdown && groups.data?.key === breakdown ? groups.data : undefined;
  const previous =
    comparisonEnabled && previousGroups.data?.key === breakdown && !previousGroups.data?.limited
      ? previousGroups.data
      : undefined;

  const columnLabels: Record<BuiltInColumn, string> = {
    last_seen: t("Last seen"),
    first_seen: t("First seen"),
    sessions: t("Sessions"),
    pageviews: t("Pageviews"),
    events: t("Events"),
    source: t("First source"),
    location: t("Location"),
    device: t("Device"),
  };

  const toggleSort = (column: SortColumn) =>
    setSort(previousSort => ({
      column,
      descending: previousSort.column === column ? !previousSort.descending : true,
    }));

  const groupViews = current ? buildGroupViews(current, previous) : [];
  const open = expandedState.key === breakdown ? expandedState.open : {};
  // The first group starts open, so the table shows people without a click.
  const isOpen = (id: string, index: number) => open[id] ?? index === 0;
  const anyOpen = groupViews.some((group, index) => group.selector !== null && isOpen(group.id, index));
  const setOpen = (next: Record<string, boolean>) => setExpandedState({ key: breakdown, open: next });

  function buildGroupViews(data: TraitBreakdown, before: TraitBreakdown | undefined): TraitGroupView[] {
    const identified = data.totals?.identified ?? 0;
    const everyone = data.totals?.users ?? 0;
    const largest = data.groups[0]?.users ?? 0;

    const usersBefore = (value: string) => {
      if (!before) return undefined;
      const match = before.groups.find(group => group.value === value);
      if (match) return match.users;
      // Past the listed values the group may be folded into "other": unknown, not zero.
      return before.other ? undefined : 0;
    };

    const views: TraitGroupView[] = data.groups.map(group => ({
      id: `value:${group.value}`,
      label:
        group.value === "" ? (
          <span className="font-normal italic text-neutral-500 dark:text-neutral-400">{t("empty")}</span>
        ) : (
          group.value
        ),
      name: group.value === "" ? t("empty") : group.value,
      stats: group,
      previousUsers: usersBefore(group.value),
      shareLabel: t("{percent} of identified", { percent: formatShare(group.users, identified) }),
      bar: largest > 0 ? group.users / largest : 0,
      selector: { key: data.key, value: group.value },
    }));

    if (data.other) {
      const name = t("{count} other values", { count: data.other.values.toLocaleString() });
      views.push({
        id: "other",
        label: name,
        name,
        stats: data.other,
        shareLabel: t("{percent} of identified", { percent: formatShare(data.other.users, identified) }),
        selector: null,
      });
    }
    if (data.none && data.none.users > 0) {
      const name = t("No {trait}", { trait: data.key });
      views.push({
        id: "none",
        label: name,
        name,
        stats: data.none,
        previousUsers: before?.none?.users,
        shareLabel: t("{percent} of all users", { percent: formatShare(data.none.users, everyone) }),
        selector: { key: data.key, missing: true },
      });
    }
    return views;
  }

  const isGrouped = !!breakdown;
  // "Nothing in hand yet" rather than the queries' loading flags: those are false while a query waits to be
  // enabled (the site not resolved yet), and the table would report an empty period it has not asked about.
  const isLoadingKeys = traitKeys === undefined && !isKeysError;
  const isLoadingRows = isGrouped ? !current && !groups.isError : list.data === undefined && !list.isError;
  const isLoading = !ready || isLoadingKeys || isLoadingRows;
  const isError = isGrouped ? groups.isError : list.isError;
  const users = list.data?.data ?? [];
  const total = isGrouped ? current?.totals?.users : list.data?.totalCount;
  const searchLimited = isGrouped ? current?.searchLimited : list.data?.searchLimited;

  const summary =
    total === undefined || isLoading
      ? null
      : isGrouped
        ? t("{users} users in {groups} groups", {
            users: total.toLocaleString(),
            groups: groupViews.length.toLocaleString(),
          })
        : total === 1
          ? t("{count} user", { count: total.toLocaleString() })
          : t("{count} users", { count: total.toLocaleString() });

  const isNarrowed = !!(narrowing.identifiedOnly || narrowing.newOnly || narrowing.minSessions);
  const emptyMessage = search
    ? t("No users match this search")
    : isNarrowed
      ? t("No users match these filters")
      : t("No users in this period");

  let body: ReactNode;
  if (isError) {
    body = (
      <MessageRow span={span}>
        <ErrorState
          title={t("Failed to load users")}
          message={t("There was a problem fetching the users. Please try again later.")}
          refetch={isGrouped ? groups.refetch : list.refetch}
        />
      </MessageRow>
    );
  } else if (isLoading) {
    body = <SkeletonRows rows={isGrouped ? 6 : 12} span={span} />;
  } else if (isGrouped && current?.limited) {
    body = (
      <MessageRow span={span}>
        <span className="mx-auto block max-w-md">
          {t(
            "More than {limit} identified users were active in this period, which is too many to group by a trait here. Shorten the period or add a filter.",
            { limit: current.limit.toLocaleString() }
          )}
        </span>
      </MessageRow>
    );
  } else if (isGrouped) {
    body =
      groupViews.length === 0 ? (
        <MessageRow span={span}>{emptyMessage}</MessageRow>
      ) : (
        groupViews.map((group, index) => (
          <TraitGroupRows
            key={group.id}
            group={group}
            open={isOpen(group.id, index)}
            onToggle={() => setOpen({ ...open, [group.id]: !isOpen(group.id, index) })}
            columns={columns}
            narrowing={fullNarrowing}
            sortBy={sortBy}
            sortOrder={sortOrder}
            site={site}
            privateKey={privateKey}
          />
        ))
      );
  } else {
    body =
      users.length === 0 ? (
        <MessageRow span={span}>{emptyMessage}</MessageRow>
      ) : (
        users.map(user => (
          <UserRow
            key={user.identified_user_id || user.user_id}
            user={user}
            columns={columns}
            site={site}
            privateKey={privateKey}
          />
        ))
      );
  }

  const renderHeader = (column: TableColumn) => {
    if (column.kind === "trait") {
      return (
        <span className="inline-flex max-w-full items-center gap-1" title={column.key}>
          <Tags className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{column.key}</span>
        </span>
      );
    }
    const { id } = column;
    if (!isSortable(id)) return columnLabels[id];
    return (
      <SortHeader
        label={columnLabels[id]}
        direction={sort.column === id ? (sort.descending ? "desc" : "asc") : null}
        alignRight={RIGHT_ALIGNED.includes(id)}
        onSort={() => toggleSort(id)}
      />
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-100 bg-white text-neutral-950 dark:border-neutral-850 dark:bg-neutral-900 dark:text-neutral-50">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
        <div className="flex w-full sm:w-auto">
          <Select value={searchField} onValueChange={value => setSearchField(value as SearchField)}>
            <SelectTrigger className="h-8 w-[112px] shrink-0 rounded-r-none border-r-0 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t("Name")}</SelectItem>
              <SelectItem value="username">{t("Username")}</SelectItem>
              <SelectItem value="email">{t("Email")}</SelectItem>
              <SelectItem value="user_id">{t("User ID")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            // Names, usernames and emails are traits, which only identified users have. Ids cover everyone.
            placeholder={searchField === "user_id" ? t("Search by user ID…") : t("Search identified users…")}
            aria-label={t("Search users")}
            className="h-8 min-w-0 flex-1 rounded-l-none text-[13px] sm:w-64 sm:flex-none"
            type="search"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
          {summary && (
            <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400" aria-live="polite">
              {summary}
            </span>
          )}
          {isGrouped && anyOpen && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 font-normal text-neutral-700 dark:text-neutral-300"
              onClick={() => setOpen(Object.fromEntries(groupViews.map(group => [group.id, false])))}
            >
              <ChevronsDownUp />
              {t("Collapse all")}
            </Button>
          )}
          <ColumnPicker
            selection={selection}
            onChange={setSelection}
            traitKeys={traitKeys?.keys.map(item => item.key) ?? []}
            columnLabels={columnLabels}
          />
        </div>
      </div>

      {searchLimited && (
        <div className="border-b border-neutral-100 px-3 py-1.5 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {t(
            "More than 10,000 profiles match this search. Showing the most recently updated; type more to narrow it down."
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full table-fixed caption-bottom text-sm" style={{ minWidth: tableMinWidth(columns) }}>
          <colgroup>
            <col />
            {columns.map(column => (
              <col key={columnId(column)} style={{ width: columnWidth(column) }} />
            ))}
          </colgroup>
          <thead className="bg-neutral-50 dark:bg-neutral-850">
            <tr>
              <th
                scope="col"
                className="h-8 pl-3 pr-2 text-left align-middle text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                {t("User")}
              </th>
              {columns.map(column => (
                <th
                  key={columnId(column)}
                  scope="col"
                  aria-sort={
                    column.kind === "builtIn" && sort.column === column.id
                      ? sort.descending
                        ? "descending"
                        : "ascending"
                      : undefined
                  }
                  className={cn(
                    "h-8 px-2 text-left align-middle text-xs font-medium text-neutral-500 dark:text-neutral-400",
                    column.kind === "builtIn" && RIGHT_ALIGNED.includes(column.id) && "text-right"
                  )}
                >
                  {renderHeader(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-900 [&_tr:last-child]:border-0">{body}</tbody>
        </table>
      </div>

      {!isGrouped && !isError && (
        <div className="border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
          <Pagination
            page={page}
            pageSize={pageSize}
            pageCount={Math.max(Math.ceil((list.data?.totalCount ?? 0) / pageSize), 1)}
            totalItems={list.data?.totalCount ?? 0}
            onPageChange={next => setPageState({ scope, page: next })}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
            itemName={t("users")}
          />
        </div>
      )}
    </div>
  );
}
