import { TimeBucket } from "@rybbit/shared";
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { useStore } from "../../../../lib/store";
import { APIResponse } from "../../../types";
import { buildApiParams } from "../../../utils";
import { fetchBotTimeSeries, GetBotTimeSeriesResponse } from "../../endpoints";
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
  const { time, filters, bucket: storeBucket, timezone } = useStore();
  const { selectedLayer } = useBotsStore();
  const bucketToUse = bucket || storeBucket;
  const botFilters = filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter));
  const params = buildApiParams(time, { filters: botFilters });

  return useQuery({
    queryKey: ["bot-time-series", time, bucketToUse, site, botFilters, selectedLayer, timezone],
    queryFn: () =>
      fetchBotTimeSeries(site, { ...params, bucket: bucketToUse, layer: selectedLayer }).then(data => ({ data })),
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const [, , , prevSite] = query.queryKey as [string, any, TimeBucket, string | number];
      return prevSite === site ? query.state.data : undefined;
    },
    staleTime: 60_000,
    enabled: !!site,
    ...props,
  });
}
