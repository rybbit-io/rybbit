import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { useStore } from "../../../../lib/store";
import { type BotDimensionKey, type PaginatedBotDimensionResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { BOT_AVAILABLE_FILTERS } from "./constants";

export function useGetBotDimension({
  site,
  dimension,
  purpose,
  limit = 100,
  page = 1,
}: {
  site?: number | string;
  dimension: BotDimensionKey;
  /** A single purpose, or "ai" / "ai_crawler" for the grouped families. */
  purpose?: string;
  limit?: number;
  page?: number;
}) {
  const filters = useStore(state => state.filters);
  const { selectedLayer } = useBotsStore();
  const botFilters = filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter));

  return useAnalyticsQuery<PaginatedBotDimensionResponse>({
    key: "bot-dimension",
    path: "bots/by-dimension",
    site,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
    params: { dimension, limit, page, purpose, layer: selectedLayer || undefined },
  });
}
