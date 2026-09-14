import { Filter } from "@rybbit/shared";
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { Time } from "../../components/DateSelector/types";
import { useStore, useTimezone } from "../../lib/store";
import {
  AnalyticsContext,
  AnalyticsDescriptor,
  AnalyticsRequest,
  buildAnalyticsRequest,
  fetchAnalytics,
} from "./analyticsRequest";

type PeriodTime = "current" | "previous";

export interface AnalyticsContextOptions {
  // Override the store's current site (e.g. multi-site overview cards).
  site?: number | string;
  periodTime?: PeriodTime;
  // Query a specific time range instead of the store's; ignored when
  // periodTime is "previous" (the store's comparison period wins).
  overrideTime?: Time;
  // Previous period in past-minutes mode means [2x .. 1x] minutes ago.
  doublePastMinutesForPrevious?: boolean;
  // Endpoints that are not scoped to the selected period (trait keys, saved
  // funnels) send no window and do not refetch when the date selector moves.
  useTime?: boolean;
  useFilters?: boolean;
  // Appended to the store filters.
  additionalFilters?: Filter[];
  // Replace the store filters entirely (when non-empty).
  customFilters?: Filter[];
}

/**
 * Resolves the analytics request context (site, time period, filters) from the
 * store once and derives the request from it — path plus the exact params that
 * go on the wire. The queryKey is built from that same request, so it is in
 * sync with what is sent by construction: a hook can no longer forget to list
 * an input and silently serve stale data.
 *
 * The store is read through selectors so a `selectedStat` or `bucket` change
 * does not re-render every analytics hook on the page.
 */
export function useAnalyticsContext(options: AnalyticsContextOptions = {}): {
  site: number | string;
  context: AnalyticsContext;
  /** False when the request has no window to ask for — comparison turned off. */
  hasPeriod: boolean;
} {
  const storeSite = useStore(state => state.site);
  const time = useStore(state => state.time);
  const previousTime = useStore(state => state.previousTime);
  const filters = useStore(state => state.filters);
  const timeZone = useTimezone();

  const site = options.site ?? storeSite;

  const baseTime = options.overrideTime ?? time;
  // A comparison of "none" leaves previousTime null: there is no window to ask
  // about, so the query is disabled rather than falling through to all-time.
  let timeToUse = options.periodTime === "previous" ? previousTime : baseTime;

  if (options.doublePastMinutesForPrevious && options.periodTime === "previous" && timeToUse?.mode === "past-minutes") {
    timeToUse = {
      ...timeToUse,
      pastMinutesStart: timeToUse.pastMinutesStart * 2,
      pastMinutesEnd: timeToUse.pastMinutesStart,
    };
  }

  const useFilters = options.useFilters ?? true;
  const combinedFilters = !useFilters
    ? undefined
    : options.customFilters?.length
      ? options.customFilters
      : options.additionalFilters?.length
        ? [...filters, ...options.additionalFilters]
        : filters;

  return {
    site,
    hasPeriod: timeToUse !== null,
    context: {
      time: (options.useTime ?? true) && timeToUse ? timeToUse : null,
      timeZone,
      filters: combinedFilters,
    },
  };
}

function useAnalyticsRequest(options: AnalyticsContextOptions & AnalyticsDescriptor) {
  const { site, context, hasPeriod } = useAnalyticsContext(options);
  return { site, hasPeriod, request: buildAnalyticsRequest(options, context) };
}

export interface AnalyticsQueryOptions<TData> extends AnalyticsContextOptions, AnalyticsDescriptor {
  // First element(s) of the queryKey. Keep the historical name — mutations
  // invalidate by this prefix (e.g. ["users"], ["user-info", userId]).
  key: string | readonly unknown[];
  staleTime?: number;
  refetchInterval?: number;
  enabled?: boolean;
  // Same-site placeholder policy: keep showing the previous result while a
  // changed key (time/filter tweak) refetches. Site changes still hard-reset.
  placeholder?: boolean;
  props?: Partial<UseQueryOptions<TData, Error>>;
}

const buildQueryKey = (
  key: string | readonly unknown[],
  site: number | string | undefined,
  request: AnalyticsRequest
) => [...(Array.isArray(key) ? key : [key]), site, request.path, request.params, request.body];

export function useAnalyticsQuery<TData>(options: AnalyticsQueryOptions<TData>): UseQueryResult<TData> {
  const { site, request, hasPeriod } = useAnalyticsRequest(options);

  return useQuery<TData, Error>({
    queryKey: buildQueryKey(options.key, site, request),
    queryFn: () => fetchAnalytics<TData>(site!, request),
    staleTime: options.staleTime ?? 60_000,
    refetchInterval: options.refetchInterval,
    placeholderData:
      (options.placeholder ?? true)
        ? (previousData, previousQuery) =>
            site !== undefined && previousQuery?.queryKey?.includes(site) ? previousData : undefined
        : undefined,
    enabled: (options.enabled ?? true) && !!site && hasPeriod,
    ...options.props,
  });
}

export interface AnalyticsInfiniteQueryOptions<TPage, TCursor> extends AnalyticsContextOptions, AnalyticsDescriptor {
  key: string | readonly unknown[];
  initialPageParam: TCursor;
  // Params that position the request at `cursor` (a page number, an offset, a
  // timestamp) — merged into the descriptor params for that page.
  pageParams: (cursor: TCursor) => Record<string, unknown>;
  getNextPageParam: (lastPage: TPage, allPages: TPage[]) => TCursor | undefined;
  staleTime?: number;
  refetchInterval?: number;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
}

export function useAnalyticsInfiniteQuery<TPage, TCursor = number>(
  options: AnalyticsInfiniteQueryOptions<TPage, TCursor>
): UseInfiniteQueryResult<InfiniteData<TPage>> {
  const { site, request, hasPeriod } = useAnalyticsRequest(options);

  return useInfiniteQuery<TPage, Error, InfiniteData<TPage>, readonly unknown[], TCursor>({
    queryKey: [...buildQueryKey(options.key, site, request), "infinite"],
    queryFn: ({ pageParam }) =>
      fetchAnalytics<TPage>(site!, {
        ...request,
        params: { ...request.params, ...options.pageParams(pageParam as TCursor) },
      }),
    initialPageParam: options.initialPageParam,
    getNextPageParam: options.getNextPageParam,
    staleTime: options.staleTime ?? 60_000,
    refetchInterval: options.refetchInterval,
    refetchOnWindowFocus: options.refetchOnWindowFocus,
    enabled: (options.enabled ?? true) && !!site && hasPeriod,
  });
}

/** Page-numbered pagination over an endpoint that reports a `totalCount`. */
export const nextPageByTotalCount = <TPage extends { data: unknown[]; totalCount: number }>(
  lastPage: TPage,
  allPages: TPage[]
): number | undefined => {
  const fetched = allPages.reduce((total, page) => total + page.data.length, 0);
  return fetched >= lastPage.totalCount ? undefined : allPages.length + 1;
};
