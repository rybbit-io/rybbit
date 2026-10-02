"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, BookmarkPlus, Rewind, Video } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { GetSessionsResponse, SessionSort, SessionView, SessionViewCounts } from "@/api/analytics/endpoints";
import { NothingFound } from "@/components/NothingFound";
import { Pagination } from "@/components/pagination";
import { ControlButton } from "@/components/site/ControlButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDateTimeFormat } from "@/hooks/useDateTimeFormat";
import { useCanOnSite } from "@/hooks/usePermissions";
import { SESSION_PAGE_FILTERS } from "@/lib/filterGroups";
import { getFilteredFilters, useStore, useTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SegmentDialog } from "../../components/SubHeader/Filters/SegmentDialog";
import { groupSessionsByDay, relativeDay } from "../sessionDays";
import { ledgerGrid, SessionLedgerRow, STACKED_ONLY, WIDE_ONLY_BLOCK, WIDE_ONLY_FLEX } from "./SessionLedgerRow";

export interface SessionSortState {
  by: SessionSort;
  order: "asc" | "desc";
}

export const PAGE_SIZE_OPTIONS = [20, 50, 100];

const VIEW_ORDER: SessionView[] = ["all", "identified", "replay", "converted", "bounced", "errors"];

/**
 * Saves the page's current filters as a segment. The saved views and the
 * ranges are not filters, so they are not part of what is saved. Hidden for
 * anyone who cannot write segments, and on a private link.
 */
function SaveSegmentButton() {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const privateKey = useStore(state => state.privateKey);
  const canWriteSegments = useCanOnSite("segments:write", site);
  const [open, setOpen] = useState(false);

  if (privateKey || !canWriteSegments) return null;

  return (
    <>
      <Button
        type="button"
        variant="accent"
        size="sm"
        className="shrink-0 gap-1.5"
        aria-label={t("Save as segment")}
        onClick={() => setOpen(true)}
      >
        <BookmarkPlus />
        {/* The label gives way to the view tabs when the ledger is narrow. */}
        <span className="hidden @min-[640px]:inline">{t("Save as segment")}</span>
      </Button>
      <SegmentDialog
        open={open}
        onOpenChange={setOpen}
        siteId={site}
        initialFilters={getFilteredFilters(SESSION_PAGE_FILTERS)}
        availableFilters={SESSION_PAGE_FILTERS}
        applyOnCreate={false}
      />
    </>
  );
}

function SortHeader({
  label,
  column,
  sort,
  onSortChange,
  className,
}: {
  label: string;
  column: SessionSort;
  sort: SessionSortState;
  onSortChange: (sort: SessionSortState) => void;
  className?: string;
}) {
  const t = useExtracted();
  const active = sort.by === column;
  const Icon = sort.order === "asc" ? ArrowUp : ArrowDown;

  return (
    <div className={cn("flex min-w-0 justify-end", className)}>
      <button
        type="button"
        aria-pressed={active}
        title={
          !active
            ? t("Sort by {column}", { column: label })
            : sort.order === "asc"
              ? t("Sorted by {column}, lowest first", { column: label })
              : t("Sorted by {column}, highest first", { column: label })
        }
        // A new column starts at its largest; the active one flips.
        onClick={() => onSortChange({ by: column, order: active && sort.order === "desc" ? "asc" : "desc" })}
        className={cn(
          "flex min-w-0 items-center gap-0.5 rounded font-medium hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:hover:text-neutral-100",
          active && "text-neutral-900 dark:text-neutral-100"
        )}
      >
        <span className="truncate">{label}</span>
        {active && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      </button>
    </div>
  );
}

function LedgerSkeleton({
  rows,
  showGoals,
  groupedByDay,
}: {
  rows: number;
  showGoals: boolean;
  groupedByDay: boolean;
}) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="border-b border-neutral-100 dark:border-neutral-800">
          <div className={cn("flex flex-col gap-2 px-3 py-2.5", STACKED_ONLY)}>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="ml-auto h-3 w-12 rounded" />
            </div>
            <Skeleton className="ml-6 h-3 w-48 rounded" />
            <Skeleton className="ml-6 h-3 w-36 rounded" />
          </div>
          <div className={cn("h-9", ledgerGrid(showGoals, groupedByDay))}>
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
              <Skeleton className={cn("h-3 rounded", index % 2 ? "w-20" : "w-24")} />
            </div>
            <Skeleton className="h-4 w-[76px] rounded" />
            <Skeleton className={cn("h-3 rounded", index % 3 === 0 ? "w-40" : index % 3 === 1 ? "w-56" : "w-32")} />
            <Skeleton className="ml-auto h-3 w-4 rounded" />
            <Skeleton className="ml-auto h-3 w-4 rounded" />
            <div className={WIDE_ONLY_BLOCK} />
            <Skeleton className="ml-auto h-3 w-10 rounded" />
            <Skeleton className={cn("ml-2 h-3 w-20 rounded", WIDE_ONLY_BLOCK)} />
            {showGoals && <div className={WIDE_ONLY_BLOCK} />}
            <div />
            <Skeleton className="ml-auto h-3 w-10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export interface SessionsLedgerProps {
  sessions: GetSessionsResponse;
  isLoading: boolean;
  /** A refetch is replacing the rows on screen. */
  isRefreshing: boolean;
  isError: boolean;
  view: SessionView;
  onViewChange: (view: SessionView) => void;
  /** Sessions per view with the ranges applied; undefined until the summary loads. */
  counts: SessionViewCounts | undefined;
  /** Sessions per day (YYYY-MM-DD) for the current view. */
  dayCounts: Map<string, number>;
  /** The site has a Replay page. */
  showReplay: boolean;
  /** A range is narrowing the list, which changes what the empty state suggests. */
  narrowed: boolean;
  sort: SessionSortState;
  onSortChange: (sort: SessionSortState) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/**
 * The sessions ledger: saved views across the top, one aligned row per
 * session with sortable columns, day headings while it is in start order, and
 * a real total underneath.
 */
export function SessionsLedger({
  sessions,
  isLoading,
  isRefreshing,
  isError,
  view,
  onViewChange,
  counts,
  dayCounts,
  showReplay,
  narrowed,
  sort,
  onSortChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: SessionsLedgerProps) {
  const t = useExtracted();
  const zone = useTimezone();
  const { formatDateTime } = useDateTimeFormat();

  // Until the summary says otherwise, assume the site has goals: the column is
  // only removed once it is known to be empty for good.
  const showGoals = counts ? counts.converted !== null : true;
  const total = counts?.[view] ?? undefined;
  const groupedByDay = sort.by === "started";

  const viewLabels: Record<SessionView, string> = {
    all: t("All"),
    identified: t("Identified"),
    replay: t("Has replay"),
    converted: t("Converted"),
    bounced: t("Bounced"),
    errors: t("With errors"),
  };
  const views = VIEW_ORDER.filter(
    candidate => (candidate !== "replay" || showReplay) && (candidate !== "converted" || showGoals)
  );

  const sortLabels: Record<Exclude<SessionSort, "ended">, string> = {
    started: t("Started"),
    duration: t("Duration"),
    pageviews: t("Pages"),
    events: t("Events"),
    errors: t("Errors"),
  };
  const sortLabel = sort.by === "ended" ? t("Started") : sortLabels[sort.by];

  const dayHeading = (day: string, count: number | undefined): ReactNode => {
    const relative = relativeDay(day, zone);
    const date = formatDateTime(DateTime.fromISO(day, { zone }), {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: zone,
    });

    return (
      <div className="flex h-7 items-center justify-between gap-3 border-b border-neutral-100 px-3 text-xs dark:border-neutral-800">
        <span className="truncate font-medium text-neutral-700 dark:text-neutral-200">
          {relative ? (
            <>
              {relative === "today" ? t("Today") : t("Yesterday")}{" "}
              <span className="font-normal text-neutral-500 dark:text-neutral-400">{date}</span>
            </>
          ) : (
            date
          )}
        </span>
        {count !== undefined && (
          <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
            {relative === "today"
              ? t("{count, plural, one {# session so far} other {# sessions so far}}", { count })
              : t("{count, plural, one {# session} other {# sessions}}", { count })}
          </span>
        )}
      </div>
    );
  };

  const row = (session: GetSessionsResponse[number]) => (
    <SessionLedgerRow
      key={session.session_id}
      session={session}
      showGoals={showGoals}
      showReplay={showReplay}
      groupedByDay={groupedByDay}
    />
  );

  const emptyDescription: ReactNode =
    view === "identified" ? (
      <>
        {t("No identified visitors match.")}{" "}
        <Link
          href="https://www.rybbit.io/docs/identify-users"
          target="_blank"
          className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-200"
        >
          {t("Learn how to identify users")}
        </Link>
      </>
    ) : view !== "all" || narrowed ? (
      t("Nothing matches this view. Try another view or a wider range.")
    ) : (
      t("Try a different date range or filter")
    );

  return (
    // The container its rows and header size themselves against (see SessionLedgerRow).
    <div className="@container overflow-hidden rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
        <div className="min-w-0 overflow-x-auto [scrollbar-width:none]">
          <Tabs value={view} onValueChange={next => onViewChange(next as SessionView)}>
            <TabsList className="h-8">
              {views.map(candidate => (
                <TabsTrigger key={candidate} value={candidate} className="gap-1.5 px-2.5 text-[13px]">
                  {viewLabels[candidate]}
                  {counts && (
                    <span className="font-normal tabular-nums text-neutral-500 dark:text-neutral-400">
                      {(counts[candidate] ?? 0).toLocaleString()}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <SaveSegmentButton />
      </div>

      {/* The stacked layout has no column headers to sort by. */}
      <div className={cn("flex border-b border-neutral-100 px-3 py-2 dark:border-neutral-800", STACKED_ONLY)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ControlButton icon={<ArrowUpDown />} label={t("Sort")} value={sortLabel} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={sort.by}
              onValueChange={next => onSortChange({ by: next as SessionSort, order: "desc" })}
            >
              {(Object.keys(sortLabels) as (keyof typeof sortLabels)[]).map(column => (
                <DropdownMenuRadioItem key={column} value={column}>
                  {sortLabels[column]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sort.order}
              onValueChange={next => onSortChange({ by: sort.by, order: next === "asc" ? "asc" : "desc" })}
            >
              <DropdownMenuRadioItem value="desc">{t("Highest or newest first")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="asc">{t("Lowest or oldest first")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className={cn(
          "h-8 border-b border-neutral-100 bg-neutral-50 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-850 dark:text-neutral-400",
          ledgerGrid(showGoals, groupedByDay)
        )}
      >
        <div />
        <div className="truncate">{t("User")}</div>
        <div className="truncate">{t("Device")}</div>
        <div className="truncate">{t("Entry and exit page")}</div>
        <SortHeader label={t("Pages")} column="pageviews" sort={sort} onSortChange={onSortChange} />
        <SortHeader label={t("Events")} column="events" sort={sort} onSortChange={onSortChange} />
        <SortHeader
          label={t("Errors")}
          column="errors"
          sort={sort}
          onSortChange={onSortChange}
          className={WIDE_ONLY_FLEX}
        />
        <SortHeader label={t("Duration")} column="duration" sort={sort} onSortChange={onSortChange} />
        <div className={cn("truncate pl-2", WIDE_ONLY_BLOCK)}>{t("Source")}</div>
        {showGoals && <div className={cn("truncate", WIDE_ONLY_BLOCK)}>{t("Goal")}</div>}
        <div className="flex justify-center">
          {showReplay && <Video className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="sr-only">{t("Replay")}</span>
        </div>
        <SortHeader label={t("Started")} column="started" sort={sort} onSortChange={onSortChange} />
      </div>

      {isLoading ? (
        <LedgerSkeleton rows={Math.min(pageSize, 20)} showGoals={showGoals} groupedByDay={groupedByDay} />
      ) : isError ? (
        <div className="p-3">
          <Alert variant="destructive">
            <AlertDescription>{t("Sessions could not be loaded. Please try again.")}</AlertDescription>
          </Alert>
        </div>
      ) : sessions.length === 0 ? (
        <NothingFound
          icon={<Rewind className="h-10 w-10" />}
          title={t("No sessions found")}
          description={emptyDescription}
        />
      ) : (
        <div className={cn("transition-opacity", isRefreshing && "opacity-60")}>
          {groupedByDay
            ? groupSessionsByDay(sessions, zone).map(group => (
                <div key={group.day}>
                  {dayHeading(group.day, dayCounts.get(group.day))}
                  {group.sessions.map(row)}
                </div>
              ))
            : sessions.map(row)}
        </div>
      )}

      {!isLoading && !isError && (sessions.length > 0 || page > 1) && (
        <div className="px-3 py-2">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={total}
            pageCount={total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : undefined}
            // Without a total yet, a full page is the only sign there may be more.
            hasNextPage={total !== undefined ? undefined : sessions.length === pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            itemName={t("sessions")}
          />
        </div>
      )}
    </div>
  );
}
