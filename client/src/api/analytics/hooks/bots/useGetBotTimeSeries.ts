import { TimeBucket } from "@rybbit/shared";
import { UseQueryOptions } from "@tanstack/react-query";
import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { useStore } from "../../../../lib/store";
import { GetBotTimeSeriesResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { type BotPeriod, useBotFilters, useComparisonOff } from "./useBotFilters";

export function useGetBotTimeSeries({
  site,
  bucket,
  purpose,
  periodTime,
  props,
}: {
  site: number | string;
  bucket?: TimeBucket;
  /** A single purpose, or "ai" / "ai_crawler" for the grouped families. */
  purpose?: string;
  periodTime?: BotPeriod;
  props?: Partial<UseQueryOptions<GetBotTimeSeriesResponse, Error>>;
}) {
  const storeBucket = useStore(state => state.bucket);
  const { selectedLayer } = useBotsStore();
  const botFilters = useBotFilters();
  const comparisonOff = useComparisonOff(periodTime);

  const query = useAnalyticsQuery<GetBotTimeSeriesResponse>({
    key: "bot-time-series",
    path: "bots/time-series",
    site,
    periodTime,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
    params: { bucket: bucket || storeBucket, purpose, layer: selectedLayer || undefined },
    props,
  });

  return comparisonOff ? { ...query, data: undefined } : query;
}
