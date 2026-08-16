import { TimeBucket } from "@rybbit/shared";
import { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { useStore } from "../../../../lib/store";
import { GetBotTimeSeriesResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { BOT_AVAILABLE_FILTERS } from "./constants";

export function useGetBotTimeSeries({
  site,
  bucket,
  props,
}: {
  site: number | string;
  bucket?: TimeBucket;
  props?: Partial<UseQueryOptions<GetBotTimeSeriesResponse, Error>>;
}): UseQueryResult<GetBotTimeSeriesResponse> {
  const filters = useStore(state => state.filters);
  const storeBucket = useStore(state => state.bucket);
  const { selectedLayer } = useBotsStore();
  const botFilters = filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter));

  return useAnalyticsQuery<GetBotTimeSeriesResponse>({
    key: "bot-time-series",
    path: "bots/time-series",
    site,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
    params: { bucket: bucket || storeBucket, layer: selectedLayer || undefined },
    props,
  });
}
