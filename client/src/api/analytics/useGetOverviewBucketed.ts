import {
  UseQueryOptions,
  UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import { BACKEND_URL } from "../../lib/const";
import { TimeBucket, useStore } from "../../lib/store";
import { APIResponse } from "../types";
import { authedFetch, getStartAndEndDate } from "../utils";

type PeriodTime = "current" | "previous";

export type GetOverviewBucketedResponse = {
  time: string;
  pageviews: number;
  sessions: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
  users: number;
}[];

export function useGetOverviewBucketed({
  periodTime,
  site,
  bucket = "hour",
  props,
}: {
  periodTime?: PeriodTime;
  site?: number | string;
  bucket?: TimeBucket;
  props?: Partial<UseQueryOptions<APIResponse<GetOverviewBucketedResponse>>>;
}): UseQueryResult<APIResponse<GetOverviewBucketedResponse>> {
  const { time, previousTime, filters } = useStore();

  const timeToUse = periodTime === "previous" ? previousTime : time;

  const { startDate, endDate } = getStartAndEndDate(timeToUse);

  return useQuery({
    queryKey: ["overview-bucketed", timeToUse, bucket, site, filters],
    queryFn: () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return authedFetch(`${BACKEND_URL}/overview-bucketed/${site}`, {
        startDate,
        endDate,
        timezone,
        bucket,
        filters,
      }).then((res) => res.json());
    },
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey as [string, string, string];
      const [, , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
    staleTime: Infinity,
    ...props,
  });
}

export function useGetOverviewBucketedPastMinutes({
  pastMinutes = 24 * 60,
  pastMinutesStart,
  pastMinutesEnd,
  site,
  bucket = "hour",
  refetchInterval,
  props,
}: {
  pastMinutes?: number;
  pastMinutesStart?: number;
  pastMinutesEnd?: number;
  site?: number | string;
  bucket?: TimeBucket;
  refetchInterval?: number;
  props?: Partial<UseQueryOptions<APIResponse<GetOverviewBucketedResponse>>>;
}): UseQueryResult<APIResponse<GetOverviewBucketedResponse>> {
  const { filters } = useStore();

  // Determine if we're using a specific range or just pastMinutes
  const useRange =
    pastMinutesStart !== undefined && pastMinutesEnd !== undefined;

  return useQuery({
    queryKey: useRange
      ? [
          "overview-bucketed-past-minutes-range",
          pastMinutesStart,
          pastMinutesEnd,
          site,
          bucket,
          filters,
        ]
      : ["overview-bucketed-past-minutes", pastMinutes, site, bucket, filters],
    queryFn: () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return authedFetch(
        `${BACKEND_URL}/overview-bucketed/${site}`,
        useRange
          ? {
              timezone,
              bucket,
              pastMinutesStart,
              pastMinutesEnd,
              filters,
            }
          : {
              timezone,
              bucket,
              pastMinutes,
              filters,
            }
      ).then((res) => res.json());
    },
    refetchInterval,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey as [string, string, string];
      const [, , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
    staleTime: Infinity,
    ...props,
  });
}

/**
 * Hook to get previous time period data for comparison with last-24-hours mode
 */
export function useGetOverviewBucketedPreviousPastMinutes({
  pastMinutes = 24 * 60,
  site,
  bucket = "hour",
  refetchInterval,
  props,
}: {
  pastMinutes?: number;
  site?: number | string;
  bucket?: TimeBucket;
  refetchInterval?: number;
  props?: Partial<UseQueryOptions<APIResponse<GetOverviewBucketedResponse>>>;
}): UseQueryResult<APIResponse<GetOverviewBucketedResponse>> {
  const { filters } = useStore();

  // For the previous period, we use the pastMinutesStart/End approach
  // If pastMinutes is 24 * 60 (24 hours), then we fetch 24-48 hour data
  const pastMinutesStart = pastMinutes * 2; // e.g., 48 hours ago
  const pastMinutesEnd = pastMinutes; // e.g., 24 hours ago

  return useQuery({
    queryKey: [
      "overview-bucketed-previous-past-minutes",
      pastMinutesStart,
      pastMinutesEnd,
      site,
      bucket,
      filters,
    ],
    queryFn: () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return authedFetch(`${BACKEND_URL}/overview-bucketed/${site}`, {
        timezone,
        bucket,
        pastMinutesStart,
        pastMinutesEnd,
        filters,
      }).then((res) => res.json());
    },
    refetchInterval,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey as [string, string, string];
      const [, , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
    staleTime: Infinity,
    ...props,
  });
}
