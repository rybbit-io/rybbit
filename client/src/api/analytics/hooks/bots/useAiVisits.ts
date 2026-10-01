import { Filter, TimeBucket } from "@rybbit/shared";
import { useMemo } from "react";
import { useStore } from "../../../../lib/store";
import { type GetOverviewBucketedResponse, type GoalsResponse, type MetricResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { AI_CHANNEL_FILTER, type BotPeriod, useBotFilters, useComparisonOff } from "./useBotFilters";

/**
 * The human half of the Bots page: visits an AI product sent back. Nothing
 * here is a bot endpoint. These are the dashboard's own overview, metric and
 * goal reads narrowed to the AI channel, so every number is one the Sessions
 * and Goals pages reproduce under the same filter.
 */

/** The page's filters plus the AI channel, and optionally one product's referrer domains. */
export function useAiVisitFilters(referrerDomains?: string[]): Filter[] {
  const botFilters = useBotFilters();
  return useMemo(() => {
    if (!referrerDomains?.length) return [...botFilters, AI_CHANNEL_FILTER];
    return [
      // A source replaces a referrer filter already on the page: it is the narrower statement.
      ...botFilters.filter(filter => !(filter.parameter === "referrer" && filter.type === "equals")),
      AI_CHANNEL_FILTER,
      { parameter: "referrer", type: "equals", value: referrerDomains },
    ];
  }, [botFilters, referrerDomains]);
}

/** Sessions from AI products per bucket, on the bucket the page's chart uses. */
export function useGetAiVisitsSeries({ bucket, enabled = true }: { bucket?: TimeBucket; enabled?: boolean } = {}) {
  const storeBucket = useStore(state => state.bucket);
  const filters = useAiVisitFilters();

  return useAnalyticsQuery<GetOverviewBucketedResponse>({
    key: "overview-bucketed",
    path: "overview/time-series",
    enabled,
    customFilters: filters,
    params: { bucket: bucket || storeBucket },
  });
}

type AiSourcesResponse = { data: MetricResponse[]; totalCount: number };

/**
 * AI-referred sessions grouped by where they came from (`referrer`) or where
 * they started (`entry_page`).
 */
export function useGetAiSources({
  parameter,
  periodTime,
  limit = 100,
}: {
  parameter: "referrer" | "entry_page";
  periodTime?: BotPeriod;
  limit?: number;
}) {
  const filters = useAiVisitFilters();
  const comparisonOff = useComparisonOff(periodTime);

  const query = useAnalyticsQuery<AiSourcesResponse>({
    key: parameter,
    path: "metric",
    periodTime,
    customFilters: filters,
    params: { parameter, limit },
  });

  return comparisonOff ? { ...query, data: undefined } : query;
}

/**
 * The site's goals with their conversions among one population: every session
 * (`site`), the sessions AI products sent (`ai`), or one product's.
 *
 * Goal conversions need `goals:read`; a viewer without it gets an error here
 * and the page simply shows no signups.
 */
export function useGetAiGoals({
  scope,
  referrerDomains,
  enabled = true,
}: {
  scope: "site" | "ai";
  referrerDomains?: string[];
  enabled?: boolean;
}) {
  const botFilters = useBotFilters();
  const aiFilters = useAiVisitFilters(referrerDomains);
  const filters = scope === "ai" ? aiFilters : botFilters;

  return useAnalyticsQuery<GoalsResponse>({
    key: "goals",
    path: "goals",
    unwrap: false,
    enabled,
    useFilters: filters.length > 0,
    customFilters: filters,
    params: { page: 1, page_size: 100, sort: "createdAt", order: "asc" },
  });
}
