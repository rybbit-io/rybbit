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
import { useStore } from "../../lib/store";
import { buildApiParams } from "../utils";
import { CommonApiParams } from "./endpoints/types";

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
  useFilters?: boolean;
  // Appended to the store filters.
  additionalFilters?: Filter[];
  // Replace the store filters entirely (when non-empty).
  customFilters?: Filter[];
}

/**
 * Resolves the analytics request context (site, time period, filters) from the
 * store once and derives the wire params from it. The queryKey is built from
 * the same params object that is sent to the endpoint, so it is in sync with
 * the request by construction — a hook can no longer forget to list an input
 * and silently serve stale data.
 */
function useAnalyticsParams(options: AnalyticsContextOptions & { extraParams?: Record<string, unknown> }) {
  const { time, previousTime, site: storeSite, filters } = useStore();
  const site = options.site ?? storeSite;

  const baseTime = options.overrideTime ?? time;
  let timeToUse = options.periodTime === "previous" ? previousTime : baseTime;

  if (options.doublePastMinutesForPrevious && options.periodTime === "previous" && timeToUse.mode === "past-minutes") {
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

  const params = { ...buildApiParams(timeToUse, { filters: combinedFilters }), ...options.extraParams };
  return { site, params };
}

export interface AnalyticsQueryOptions<TData, TParams extends CommonApiParams = CommonApiParams>
  extends AnalyticsContextOptions {
  // First element(s) of the queryKey. Keep the historical name — mutations
  // invalidate by this prefix (e.g. ["users"], ["user-info", userId]).
  key: string | readonly unknown[];
  fetch: (site: number | string, params: TParams) => Promise<TData>;
  // Endpoint params beyond the shared time/filter context (bucket, parameter,
  // limit, page, ...). Spread into the wire params AND the queryKey.
  extraParams?: Omit<TParams, keyof CommonApiParams>;
  // ONLY for values that change the fetcher itself rather than its params
  // (e.g. the `lite` flag). Everything else is already in the key via params.
  keyExtras?: readonly unknown[];
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
  params: unknown,
  keyExtras?: readonly unknown[]
) => [...(Array.isArray(key) ? key : [key]), site, params, ...(keyExtras ?? [])];

export function useAnalyticsQuery<TData, TParams extends CommonApiParams = CommonApiParams>(
  options: AnalyticsQueryOptions<TData, TParams>
): UseQueryResult<TData> {
  const { site, params } = useAnalyticsParams(options);
  const queryKey = buildQueryKey(options.key, site, params, options.keyExtras);

  return useQuery<TData, Error>({
    queryKey,
    queryFn: () => options.fetch(site!, params as TParams),
    staleTime: options.staleTime ?? 60_000,
    refetchInterval: options.refetchInterval,
    placeholderData:
      (options.placeholder ?? true)
        ? (previousData, previousQuery) =>
            site !== undefined && previousQuery?.queryKey?.includes(site) ? previousData : undefined
        : undefined,
    enabled: (options.enabled ?? true) && !!site,
    ...options.props,
  });
}

export interface AnalyticsInfiniteQueryOptions<
  TPage extends { data: unknown[]; totalCount: number },
  TParams extends CommonApiParams = CommonApiParams,
> extends AnalyticsContextOptions {
  key: string | readonly unknown[];
  fetchPage: (site: number | string, params: TParams, page: number) => Promise<TPage>;
  extraParams?: Omit<TParams, keyof CommonApiParams>;
  keyExtras?: readonly unknown[];
  staleTime?: number;
  enabled?: boolean;
}

export function useAnalyticsInfiniteQuery<
  TPage extends { data: unknown[]; totalCount: number },
  TParams extends CommonApiParams = CommonApiParams,
>(options: AnalyticsInfiniteQueryOptions<TPage, TParams>): UseInfiniteQueryResult<InfiniteData<TPage>> {
  const { site, params } = useAnalyticsParams(options);
  const queryKey = [...buildQueryKey(options.key, site, params, options.keyExtras), "infinite"];

  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => options.fetchPage(site!, params as TParams, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const fetchedItemCount = allPages.reduce((acc, page) => acc + page.data.length, 0);
      return fetchedItemCount >= lastPage.totalCount ? undefined : allPages.length + 1;
    },
    staleTime: options.staleTime ?? 60_000,
    enabled: (options.enabled ?? true) && !!site,
  });
}
