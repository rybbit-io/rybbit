import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { useStore } from "../../../../lib/store";
import { type GetBotOverviewResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { BOT_AVAILABLE_FILTERS } from "./constants";

export function useGetBotOverview({ site }: { site?: number | string }) {
  const filters = useStore(state => state.filters);
  const { selectedLayer } = useBotsStore();
  const botFilters = filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter));

  return useAnalyticsQuery<GetBotOverviewResponse>({
    key: "bot-overview",
    path: "bots/overview",
    site,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
    params: { layer: selectedLayer || undefined },
  });
}
