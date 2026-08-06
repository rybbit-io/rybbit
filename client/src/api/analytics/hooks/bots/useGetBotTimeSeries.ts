import { TimeBucket } from "@rybbit/shared";
import { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { useStore } from "../../../../lib/store";
import { APIResponse } from "../../../types";
import { type BotTimeSeriesParams, fetchBotTimeSeries, GetBotTimeSeriesResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { BOT_AVAILABLE_FILTERS } from "./constants";

export function useGetBotTimeSeries({
  site,
  bucket,
  props,
}: {
  site: number | string;
  bucket?: TimeBucket;
  props?: Partial<UseQueryOptions<APIResponse<GetBotTimeSeriesResponse>>>;
}): UseQueryResult<APIResponse<GetBotTimeSeriesResponse>> {
  const { filters, bucket: storeBucket } = useStore();
  const { selectedLayer } = useBotsStore();
  const bucketToUse = bucket || storeBucket;
  const botFilters = filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter));

  return useAnalyticsQuery<APIResponse<GetBotTimeSeriesResponse>, BotTimeSeriesParams>({
    key: "bot-time-series",
    site,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
    extraParams: { bucket: bucketToUse, layer: selectedLayer },
    props,
    fetch: (site, params) => fetchBotTimeSeries(site, params).then(data => ({ data })),
  });
}
