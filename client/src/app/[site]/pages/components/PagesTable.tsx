"use client";

import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronsUpDown, ExternalLink, Folder } from "lucide-react";
import { useExtracted } from "next-intl";
import { createContext, Fragment, ReactNode, useContext } from "react";
import { useGetSite } from "@/api/admin/hooks/useSites";
import {
  PageRow,
  PagesGroup,
  PagesMode,
  PagesSort,
  PagesSortOrder,
  useGetPages,
  useGetPagesSummary,
  useGetPageTrends,
  useGetSectionPages,
} from "@/api/analytics/hooks/useGetPages";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/pagination";
import { Delta } from "@/components/site/Delta";
import { PivotActions } from "@/components/site/PivotActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatShortDuration } from "@/lib/dateTimeUtils";
import { percentDelta } from "@/lib/delta";
import { addFilter, removeFilter, useComparisonEnabled, useStore } from "@/lib/store";
import { cn, formatter } from "@/lib/utils";
import { formatSection, getPageFilters, getRowId, getTrendKeys } from "./pageIdentity";
import { PageSparklineChart } from "./PageSparklineChart";

export const PAGE_SIZE = 25;
const SECTION_PAGE_SIZE = 10;

type ColumnId = "views" | "sessions" | "entries" | "exits" | "time" | "bounce" | "change" | "trend";

// Columns drop out as the table narrows, least important first. The widths sit
// on the header cells (the table is fixed-layout), so a hidden column leaves no
// gap and the page column takes what is left.
const COLUMN_VISIBILITY: Record<ColumnId, string> = {
  views: "",
  sessions: "hidden @[640px]:table-cell",
  entries: "hidden @[840px]:table-cell",
  exits: "hidden @[840px]:table-cell",
  time: "hidden @[920px]:table-cell",
  bounce: "hidden @[920px]:table-cell",
  change: "",
  trend: "hidden @[550px]:table-cell",
};
// The share-of-views bar is the one decoration in the row, so between 920px and
// 1000px it gives its room to the last two figures. The two ranges it shows in
// do not overlap, which keeps the result independent of CSS order.
const VIEWS_BAR = "hidden @min-[550px]:@max-[919px]:block @[1000px]:block";
const VIEWS_NUMBER =
  "min-w-12 flex-1 @min-[550px]:@max-[919px]:min-w-14 @min-[550px]:@max-[919px]:flex-none @[1000px]:min-w-14 @[1000px]:flex-none";
const COLUMN_WIDTH: Record<ColumnId, string> = {
  views: "w-[112px] @min-[550px]:@max-[919px]:w-[186px] @[1000px]:w-[186px]",
  sessions: "w-[88px]",
  entries: "w-[84px]",
  exits: "w-[116px]",
  time: "w-[86px]",
  bounce: "w-[78px]",
  change: "w-[76px] @[550px]:w-[84px]",
  trend: "w-[100px]",
};
const COLUMN_SORT: Partial<Record<ColumnId, PagesSort>> = {
  views: "pageviews",
  sessions: "sessions",
  entries: "entries",
  exits: "exits",
  time: "time_on_page",
  bounce: "bounce_rate",
};

const MUTED = "text-neutral-500 dark:text-neutral-400";
const NUMBER_CELL = "px-3 text-right tabular-nums whitespace-nowrap";

// Exact up to six digits, which is what the columns are sized for; a million and up is
// abbreviated, with the exact figure on hover.
const formatCount = (value: number) => (value >= 1_000_000 ? formatter(value) : value.toLocaleString());

function Count({ value }: { value: number }) {
  return <span title={value >= 1_000_000 ? value.toLocaleString() : undefined}>{formatCount(value)}</span>;
}

const formatShare = (share: number) => {
  const percent = share * 100;
  if (percent > 0 && percent < 0.1) return "<0.1%";
  return percent >= 99.95 ? "100%" : `${percent.toFixed(1)}%`;
};

interface TableContextValue {
  mode: PagesMode;
  sort: PagesSort;
  order: PagesSortOrder;
  /** Every pageview in the period, for each row's share. */
  totalViews: number | undefined;
  /** The largest row in view, which the bars are drawn against. */
  maxViews: number;
  showChange: boolean;
  /** Section rows indent the pages under their chevrons. */
  grouped: boolean;
  domain: string | undefined;
  expanded: ReadonlySet<string>;
  onToggleSection: (section: string) => void;
  focusSection: string | null;
  onFocusHandled: () => void;
}

const TableContext = createContext<TableContextValue | null>(null);

function useTableContext() {
  const context = useContext(TableContext);
  if (!context) throw new Error("Pages table rows must render inside PagesTable");
  return context;
}

interface RowFigures {
  /** Views over time; undefined when the row has none to plot. */
  series: { time: string; pageviews: number }[] | undefined;
  trendLoading: boolean;
  /** Views in the comparison period; undefined while unknown. */
  previousViews: number | undefined;
  changeLoading: boolean;
}

function MetricCells({ row, figures, strong }: { row: PageRow; figures: RowFigures; strong?: boolean }) {
  const { totalViews, maxViews, showChange } = useTableContext();
  const exitRate = row.sessions > 0 ? Math.round((row.exits / row.sessions) * 100) : null;

  return (
    <>
      <TableCell className={cn("px-3", strong && "font-medium")}>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800",
              VIEWS_BAR
            )}
          >
            <div
              className="h-full rounded-full bg-dataviz"
              style={{ width: `${maxViews > 0 ? Math.min((row.pageviews / maxViews) * 100, 100) : 0}%` }}
            />
          </div>
          <span className={cn("text-right tabular-nums", VIEWS_NUMBER)}>
            <Count value={row.pageviews} />
          </span>
          <span className={cn("min-w-10 text-right text-xs tabular-nums", MUTED)}>
            {totalViews ? formatShare(row.pageviews / totalViews) : ""}
          </span>
        </div>
      </TableCell>
      <TableCell className={cn(NUMBER_CELL, COLUMN_VISIBILITY.sessions)}>
        <Count value={row.sessions} />
      </TableCell>
      <TableCell className={cn(NUMBER_CELL, COLUMN_VISIBILITY.entries)}>
        <Count value={row.entries} />
      </TableCell>
      <TableCell className={cn(NUMBER_CELL, COLUMN_VISIBILITY.exits)}>
        <Count value={row.exits} />
        <span className={cn("ml-1.5 inline-block w-8 text-right text-xs", MUTED)}>
          {exitRate === null ? "" : `${exitRate}%`}
        </span>
      </TableCell>
      <TableCell className={cn(NUMBER_CELL, COLUMN_VISIBILITY.time)}>
        {row.time_on_page_seconds === null ? (
          <span className={MUTED}>—</span>
        ) : (
          formatShortDuration(row.time_on_page_seconds)
        )}
      </TableCell>
      <TableCell className={cn(NUMBER_CELL, COLUMN_VISIBILITY.bounce)}>
        {row.bounce_rate === null ? <span className={MUTED}>—</span> : `${Math.round(row.bounce_rate)}%`}
      </TableCell>
      {showChange && (
        <TableCell className={cn("px-3 text-right", COLUMN_VISIBILITY.change)}>
          {figures.changeLoading ? (
            <Skeleton className="ml-auto h-3 w-10 rounded" />
          ) : (
            <Delta value={percentDelta(row.pageviews, figures.previousViews)} />
          )}
        </TableCell>
      )}
      <TableCell className={cn("px-3", COLUMN_VISIBILITY.trend)}>
        <div className="ml-auto w-[76px]">
          <PageSparklineChart
            series={figures.series}
            label={row.kind === "section" ? formatSection(row.key) : row.title || row.key}
            isLoading={figures.trendLoading}
          />
        </div>
      </TableCell>
    </>
  );
}

function PageTableRow({ row, figures, child }: { row: PageRow; figures: RowFigures; child?: boolean }) {
  const t = useExtracted();
  const { mode, grouped, domain } = useTableContext();
  const filters = useStore(state => state.filters);

  const path = row.key;
  const pageFilters = getPageFilters(path, mode);
  const pageUrl = domain ? `https://${domain}${path}` : "";

  // The same toggle as a row on the main dashboard: click to filter, click again to clear.
  const toggleFilter = () => {
    const [filter] = pageFilters;
    const applied = filters.find(
      candidate => candidate.parameter === filter.parameter && candidate.value.some(value => value === path)
    );
    if (applied) removeFilter(applied);
    else addFilter(filter);
  };

  return (
    <TableRow className="group">
      <TableCell className={cn("py-1.5 pr-3", child ? "pl-11" : grouped ? "pl-9" : "pl-3")}>
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-[64px] flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={toggleFilter}
                title={t("Filter by {page}", { page: row.title || path })}
                className="truncate text-left text-sm font-medium text-neutral-900 hover:underline focus-visible:underline focus-visible:outline-none dark:text-neutral-100"
              >
                {row.title || path}
              </button>
              {pageUrl && (
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("Open page in a new tab")}
                  className="shrink-0 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {/* An untitled page already shows its path above; repeating it would read as two facts. */}
            <div className={cn("truncate text-xs", MUTED)} title={row.title ? path : undefined}>
              {row.title ? path : t("No page title")}
            </div>
          </div>
          <PivotActions
            filters={pageFilters}
            actions={["sessions"]}
            className="hidden shrink-0 flex-nowrap @[640px]:group-focus-within:flex @[640px]:group-hover:flex"
          />
        </div>
      </TableCell>
      <MetricCells row={row} figures={figures} />
    </TableRow>
  );
}

function SectionTableRow({ row, figures }: { row: PageRow; figures: RowFigures }) {
  const t = useExtracted();
  const { expanded, onToggleSection, focusSection, onFocusHandled } = useTableContext();
  const isOpen = expanded.has(row.key);
  const label = formatSection(row.key);

  return (
    <TableRow
      // Scrolls to the section the insight row points at, once it is on screen.
      ref={
        focusSection === row.key
          ? node => {
              if (!node) return;
              node.scrollIntoView({ block: "center", behavior: "smooth" });
              onFocusHandled();
            }
          : undefined
      }
      onClick={() => onToggleSection(row.key)}
      className="cursor-pointer bg-neutral-50 dark:bg-neutral-850/60"
    >
      <TableCell className="py-1.5 pl-2 pr-3">
        <div className="flex min-w-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-expanded={isOpen}
            aria-label={
              isOpen ? t("Collapse {section}", { section: label }) : t("Expand {section}", { section: label })
            }
            onClick={event => {
              event.stopPropagation();
              onToggleSection(row.key);
            }}
            className={cn("h-6 w-6 shrink-0 px-0", MUTED)}
          >
            {isOpen ? <ChevronDown /> : <ChevronRight />}
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</span>
              <Folder className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
            </div>
            <div className={cn("truncate text-xs tabular-nums", MUTED)}>
              {t("{count, plural, one {# page} other {# pages}}", { count: row.pages })}
            </div>
          </div>
        </div>
      </TableCell>
      <MetricCells row={row} figures={figures} strong />
    </TableRow>
  );
}

function SkeletonRows({ count, child }: { count: number; child?: boolean }) {
  const { showChange, grouped } = useTableContext();
  const bar = <Skeleton className="ml-auto h-3.5 w-10 rounded" />;

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <TableRow key={index}>
          <TableCell className={cn("py-1.5 pr-3", child ? "pl-11" : grouped ? "pl-9" : "pl-3")}>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-3/5 rounded" />
              <Skeleton className="h-3 w-2/5 rounded" />
            </div>
          </TableCell>
          <TableCell className="px-3">
            <Skeleton className="h-3.5 w-full rounded" />
          </TableCell>
          <TableCell className={cn("px-3", COLUMN_VISIBILITY.sessions)}>{bar}</TableCell>
          <TableCell className={cn("px-3", COLUMN_VISIBILITY.entries)}>{bar}</TableCell>
          <TableCell className={cn("px-3", COLUMN_VISIBILITY.exits)}>{bar}</TableCell>
          <TableCell className={cn("px-3", COLUMN_VISIBILITY.time)}>{bar}</TableCell>
          <TableCell className={cn("px-3", COLUMN_VISIBILITY.bounce)}>{bar}</TableCell>
          {showChange && <TableCell className={cn("px-3", COLUMN_VISIBILITY.change)}>{bar}</TableCell>}
          <TableCell className={cn("px-3", COLUMN_VISIBILITY.trend)}>
            <Skeleton className="ml-auto h-6 w-[76px] rounded" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

/**
 * A batch of rows with one trend request for all of them, and one more for the
 * comparison period, whose totals are each row's baseline for its change.
 */
function RowsBlock({ rows, child }: { rows: PageRow[]; child?: boolean }) {
  const { expanded, showChange } = useTableContext();
  const bucket = useStore(state => state.bucket);
  const keys = getTrendKeys(rows);

  const trends = useGetPageTrends({ ...keys, bucket });
  const previous = useGetPageTrends({ ...keys, bucket, periodTime: "previous" });

  const trendById = new Map((trends.data ?? []).map(trend => [getRowId(trend), trend]));
  const previousById = new Map((previous.data ?? []).map(trend => [getRowId(trend), trend]));

  // A key the server leaves out had no views. That only holds for an answer to
  // this batch: while the last batch's answer stands in, a missing key is unknown.
  const figuresFor = (id: string): RowFigures => {
    const trend = trendById.get(id);
    const baseline = previousById.get(id);
    const previousKnown = showChange && previous.data !== undefined && (!previous.isPlaceholderData || !!baseline);

    return {
      series: trend?.series,
      trendLoading: !trend && trends.isFetching,
      previousViews: previousKnown ? (baseline?.pageviews ?? 0) : undefined,
      changeLoading: !previousKnown && previous.isFetching,
    };
  };

  return (
    <>
      {rows.map(row => {
        const id = getRowId(row);
        const figures = figuresFor(id);

        if (row.kind === "section") {
          return (
            <Fragment key={id}>
              <SectionTableRow row={row} figures={figures} />
              {expanded.has(row.key) && <SectionPages section={row} />}
            </Fragment>
          );
        }
        return <PageTableRow key={id} row={row} figures={figures} child={child} />;
      })}
    </>
  );
}

function SectionPages({ section }: { section: PageRow }) {
  const t = useExtracted();
  const { mode, sort, order } = useTableContext();
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useGetSectionPages({
    section: section.key,
    mode,
    sort,
    order,
    limit: SECTION_PAGE_SIZE,
  });

  if (isLoading) return <SkeletonRows count={Math.min(section.pages, 3)} child />;

  const batches = data?.pages ?? [];
  if (isError || batches.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={2} className={cn("py-2 pl-11 pr-3 text-xs", MUTED)}>
          {t("Could not load the pages in {section}.", { section: formatSection(section.key) })}
        </TableCell>
      </TableRow>
    );
  }

  const loaded = batches.flatMap(batch => batch.data);
  const remaining = Math.max(batches[batches.length - 1].totalCount - loaded.length, 0);
  // Every page of the section is listed on the all-pages view, so what is not
  // shown is the section's views minus the rows above.
  const hiddenViews =
    mode === "all" ? section.pageviews - loaded.reduce((total, page) => total + page.pageviews, 0) : null;

  return (
    <>
      {batches.map((batch, index) => (
        <RowsBlock key={index} rows={batch.data} child />
      ))}
      {isFetchingNextPage && <SkeletonRows count={Math.min(remaining, 3)} child />}
      {hasNextPage && remaining > 0 && (
        <TableRow>
          {/* Spans the two columns every width keeps: a wider span would outgrow a narrow table. */}
          <TableCell colSpan={2} className="py-1.5 pl-11 pr-3">
            <div className="flex flex-wrap items-center gap-x-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                className="-ml-1.5 gap-1 font-normal text-neutral-600 dark:text-neutral-300"
              >
                <ChevronsUpDown />
                {t("Show {count, plural, one {# more page} other {# more pages}} in {section}", {
                  count: Math.min(remaining, SECTION_PAGE_SIZE),
                  section: formatSection(section.key),
                })}
              </Button>
              <span className={cn("text-xs tabular-nums", MUTED)}>
                {hiddenViews !== null && hiddenViews > 0
                  ? t("{pages} not shown, {views} views", {
                      pages: remaining.toLocaleString(),
                      views: hiddenViews.toLocaleString(),
                    })
                  : t("{pages} not shown", { pages: remaining.toLocaleString() })}
              </span>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function HeaderCell({
  column,
  label,
  title,
  align = "right",
  onSort,
}: {
  column: ColumnId;
  label: string;
  title?: string;
  align?: "left" | "right";
  onSort: (sort: PagesSort) => void;
}) {
  const { sort, order } = useTableContext();
  const sortKey = COLUMN_SORT[column];
  const sorted = sortKey !== undefined && sort === sortKey;
  const Arrow = order === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead
      scope="col"
      title={title}
      aria-sort={sorted ? (order === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        // The header is a flat band inside the card, not the rounded pill of a free-standing table.
        "whitespace-nowrap px-3 last:rounded-r-none",
        align === "right" && "text-right",
        COLUMN_WIDTH[column],
        COLUMN_VISIBILITY[column]
      )}
    >
      {sortKey ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={cn(
            "inline-flex items-center gap-1 font-medium focus-visible:underline focus-visible:outline-none",
            sorted ? "text-neutral-900 dark:text-neutral-100" : "hover:text-neutral-900 dark:hover:text-neutral-200"
          )}
        >
          {label}
          {sorted && <Arrow className="h-3 w-3" aria-hidden="true" />}
        </button>
      ) : (
        label
      )}
    </TableHead>
  );
}

export interface PagesTableProps {
  /** Section rollups, or one flat list of pages. A search always lists pages. */
  group: PagesGroup;
  mode: PagesMode;
  search: string;
  sort: PagesSort;
  order: PagesSortOrder;
  onSort: (sort: PagesSort) => void;
  /** 1-indexed. */
  page: number;
  onPageChange: (page: number) => void;
  expanded: ReadonlySet<string>;
  onExpandedChange: (expanded: Set<string>) => void;
  /** A section to scroll to when its row appears. */
  focusSection: string | null;
  onFocusHandled: () => void;
}

export function PagesTable({
  group,
  mode,
  search,
  sort,
  order,
  onSort,
  page,
  onPageChange,
  expanded,
  onExpandedChange,
  focusSection,
  onFocusHandled,
}: PagesTableProps) {
  const t = useExtracted();
  const { data: siteMetadata } = useGetSite();
  const showChange = useComparisonEnabled();

  const { data, isLoading, isPlaceholderData, isError, refetch } = useGetPages({
    group,
    mode,
    sort,
    order,
    search,
    limit: PAGE_SIZE,
    page,
  });
  const { data: summary } = useGetPagesSummary();

  const rows = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;
  const pageCount = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const sectionKeys = rows.filter(row => row.kind === "section").map(row => row.key);
  const openSections = sectionKeys.filter(key => expanded.has(key));

  const context: TableContextValue = {
    mode,
    sort,
    order,
    totalViews: summary?.pageviews,
    maxViews: rows.reduce((max, row) => Math.max(max, row.pageviews), 0),
    showChange,
    grouped: group === "section",
    domain: siteMetadata?.domain,
    expanded,
    onToggleSection: section => {
      const next = new Set(expanded);
      if (!next.delete(section)) next.add(section);
      onExpandedChange(next);
    },
    focusSection,
    onFocusHandled,
  };

  if (isError) {
    return (
      <ErrorState
        title={t("Failed to load pages")}
        message={t("There was a problem fetching the pages. Please try again later.")}
        refetch={refetch}
      />
    );
  }

  let footnote: ReactNode = null;
  if (data && totalCount > 0) {
    if (search) {
      footnote = t("{count, plural, one {# page matches} other {# pages match}}", { count: totalCount });
    } else if (group === "section") {
      footnote = summary
        ? t("{rows, plural, one {# row} other {# rows}} · {pages, plural, one {# page} other {# pages}} with traffic", {
            rows: totalCount,
            pages: summary.pages,
          })
        : t("{rows, plural, one {# row} other {# rows}}", { rows: totalCount });
    } else if (mode === "entry") {
      footnote = t("{count, plural, one {# entry page} other {# entry pages}}", { count: totalCount });
    } else if (mode === "exit") {
      footnote = t("{count, plural, one {# exit page} other {# exit pages}}", { count: totalCount });
    } else {
      footnote = t("{count, plural, one {# page} other {# pages}} with traffic", { count: totalCount });
    }
  }

  return (
    <TableContext.Provider value={context}>
      <Card>
        <div className="@container overflow-x-auto">
          <table className="w-full min-w-[340px] table-fixed caption-bottom text-sm">
            <TableHeader>
              <tr>
                <TableHead
                  scope="col"
                  className={cn("whitespace-nowrap pr-3 first:rounded-l-none", group === "section" ? "pl-9" : "pl-3")}
                >
                  {group === "section" ? t("Page / section") : t("Page")}
                </TableHead>
                <HeaderCell column="views" label={t("Views")} align="left" onSort={onSort} />
                <HeaderCell column="sessions" label={t("Sessions")} onSort={onSort} />
                <HeaderCell
                  column="entries"
                  label={t("Entries")}
                  title={t("Sessions that started on this page")}
                  onSort={onSort}
                />
                <HeaderCell
                  column="exits"
                  label={t("Exits")}
                  title={t("Sessions that ended on this page, and their share of the sessions that saw it")}
                  onSort={onSort}
                />
                <HeaderCell
                  column="time"
                  label={t("Avg time")}
                  title={t("Average time until the next page in the session. Exit views are left out.")}
                  onSort={onSort}
                />
                <HeaderCell
                  column="bounce"
                  label={t("Bounce")}
                  title={t("Entry bounce rate: sessions that started here and viewed nothing else")}
                  onSort={onSort}
                />
                {showChange && (
                  <HeaderCell
                    column="change"
                    label={t("Change")}
                    title={t("Change in views against the comparison period")}
                    onSort={onSort}
                  />
                )}
                <HeaderCell column="trend" label={t("Trend")} title={t("Views over the period")} onSort={onSort} />
              </tr>
            </TableHeader>
            {/* Dimmed while the last answer stands in for a new sort, page or period. */}
            <TableBody className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
              {isLoading || !data ? <SkeletonRows count={10} /> : <RowsBlock rows={rows} />}
            </TableBody>
          </table>
          {data && rows.length === 0 && (
            <div className={cn("px-3 py-7 text-center text-sm", MUTED)}>
              {totalCount > 0 ? (
                // The list got shorter (a live period, a filter) and this page is past its end.
                <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(1)}>
                  {t("Back to the first page")}
                </Button>
              ) : search ? (
                t("No pages match “{search}”.", { search })
              ) : mode === "entry" ? (
                t("No sessions started in the selected period.")
              ) : mode === "exit" ? (
                t("No sessions ended in the selected period.")
              ) : (
                t("No pages data found for the selected period.")
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-neutral-100 px-3 py-2 text-xs dark:border-neutral-800",
            // Nothing to count and nothing to page through: the empty message stands alone.
            data && totalCount === 0 && "hidden"
          )}
        >
          <div className={cn("min-h-6 tabular-nums leading-6", MUTED)}>{footnote}</div>
          <div className="flex items-center gap-1">
            {sectionKeys.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={openSections.length === sectionKeys.length}
                  onClick={() => onExpandedChange(new Set([...expanded, ...sectionKeys]))}
                  className="font-normal text-neutral-600 dark:text-neutral-300"
                >
                  {t("Expand all")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={openSections.length === 0}
                  onClick={() => onExpandedChange(new Set())}
                  className="font-normal text-neutral-600 dark:text-neutral-300"
                >
                  {t("Collapse all")}
                </Button>
              </>
            )}
            {pageCount > 1 && (
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={onPageChange}
                isLoading={isLoading}
                showRange={false}
                className="ml-2 w-auto"
              />
            )}
          </div>
        </div>
      </Card>
    </TableContext.Provider>
  );
}
