import { TimeBucket } from "@rybbit/shared";
import { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";
import { nextPageByTotalCount, useAnalyticsInfiniteQuery, useAnalyticsQuery } from "../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

export type PagesGroup = "page" | "section";
export type PagesMode = "all" | "entry" | "exit";
export type PagesSort = "pageviews" | "sessions" | "entries" | "exits" | "time_on_page" | "bounce_rate";
export type PagesSortOrder = "asc" | "desc";

export interface PageRow {
  /** A section row rolls up two or more pages; a section with one page is listed as that page. */
  kind: "page" | "section";
  /** The path of a page row, the first path segment of a section row ("/docs"). */
  key: string;
  /** The page's most recent title; empty for sections and untitled pages. */
  title: string;
  section: string;
  pages: number;
  pageviews: number;
  sessions: number;
  entries: number;
  exits: number;
  bounced_entries: number;
  /** Average seconds to the next pageview. Exit views have none and are left out. */
  time_on_page_seconds: number | null;
  /** Share of the sessions that started here and viewed nothing else, 0–100. */
  bounce_rate: number | null;
}

export interface PagesResponse {
  data: PageRow[];
  totalCount: number;
}

export interface SectionViews {
  section: string;
  pageviews: number;
  pages: number;
}

export interface PagesSummary {
  pageviews: number;
  /** Sessions with at least one pageview. */
  sessions: number;
  /** Distinct paths viewed. */
  pages: number;
  bounced_sessions: number;
  bounce_rate: number | null;
  time_on_page_seconds: number | null;
  views_per_session: number | null;
  /** Views per section, largest first, capped by the server. */
  sections: SectionViews[];
  /** How many sections exist; above `sections.length` when the list was capped. */
  sectionCount: number;
}

export interface PageTrend {
  kind: "page" | "section";
  key: string;
  /** Views in the whole period: the sum of `series`. */
  pageviews: number;
  series: { time: string; pageviews: number }[];
}

export interface PagesListOptions {
  mode: PagesMode;
  sort: PagesSort;
  order: PagesSortOrder;
}

/** The page list, or the section rollups when `group` is "section". */
export function useGetPages({
  group,
  mode,
  sort,
  order,
  search,
  limit,
  page,
}: PagesListOptions & {
  group: PagesGroup;
  search?: string;
  limit: number;
  page: number;
}): UseQueryResult<PagesResponse> {
  return useAnalyticsQuery<PagesResponse>({
    key: "pages",
    path: "pages",
    params: { group, mode, sort, order, search: search || undefined, limit, page },
  });
}

/** The pages inside one section, loaded a page at a time. */
export function useGetSectionPages({
  section,
  mode,
  sort,
  order,
  limit,
}: PagesListOptions & { section: string; limit: number }): UseInfiniteQueryResult<InfiniteData<PagesResponse>> {
  return useAnalyticsInfiniteQuery<PagesResponse>({
    key: "pages",
    path: "pages",
    params: { group: "page", section, mode, sort, order, limit },
    initialPageParam: 1,
    pageParams: page => ({ page }),
    getNextPageParam: nextPageByTotalCount,
  });
}

export function useGetPagesSummary({ periodTime }: { periodTime?: PeriodTime } = {}): UseQueryResult<PagesSummary> {
  return useAnalyticsQuery<PagesSummary>({
    key: "pages-summary",
    path: "pages/summary",
    periodTime,
  });
}

/**
 * Views over time for a batch of rows in one request. Asked for the previous
 * period, each trend's `pageviews` is the row's baseline for its change.
 */
export function useGetPageTrends({
  paths,
  sections,
  bucket,
  periodTime,
}: {
  paths: string[];
  sections: string[];
  bucket: TimeBucket;
  periodTime?: PeriodTime;
}): UseQueryResult<PageTrend[]> {
  return useAnalyticsQuery<PageTrend[]>({
    key: "page-trends",
    path: "pages/trends",
    periodTime,
    enabled: paths.length + sections.length > 0,
    params: { bucket, paths, sections },
  });
}
