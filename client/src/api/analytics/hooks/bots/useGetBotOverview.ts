import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { useStore } from "../../../../lib/store";
import { type BotOverviewParams, fetchBotOverview, type GetBotOverviewResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { BOT_AVAILABLE_FILTERS } from "./constants";

export function useGetBotOverview({ site }: { site?: number | string }) {
  const { filters } = useStore();
  const { selectedLayer } = useBotsStore();
  const botFilters = filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter));

  return useAnalyticsQuery<{ data: GetBotOverviewResponse }, BotOverviewParams>({
    key: "bot-overview",
    site,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
    extraParams: { layer: selectedLayer },
    fetch: (site, params) => fetchBotOverview(site, params).then(data => ({ data })),
  });
}
