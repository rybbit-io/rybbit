import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { useStore } from "../../../../lib/store";
import {
  type BotDimensionKey,
  type BotDimensionParams,
  fetchBotDimension,
  type PaginatedBotDimensionResponse,
} from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { BOT_AVAILABLE_FILTERS } from "./constants";

export function useGetBotDimension({
  site,
  dimension,
  limit = 100,
  page = 1,
}: {
  site?: number | string;
  dimension: BotDimensionKey;
  limit?: number;
  page?: number;
}) {
  const { filters } = useStore();
  const { selectedLayer } = useBotsStore();
  const botFilters = filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter));

  return useAnalyticsQuery<{ data: PaginatedBotDimensionResponse }, BotDimensionParams>({
    key: "bot-dimension",
    site,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
    extraParams: { dimension, limit, page, layer: selectedLayer },
    fetch: (site, params) => fetchBotDimension(site, params).then(data => ({ data })),
  });
}
