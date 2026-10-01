import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { type GetBotOverviewResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { type BotPeriod, useBotFilters, useComparisonOff } from "./useBotFilters";

export function useGetBotOverview({ site, periodTime }: { site?: number | string; periodTime?: BotPeriod }) {
  const { selectedLayer } = useBotsStore();
  const botFilters = useBotFilters();
  const comparisonOff = useComparisonOff(periodTime);

  const query = useAnalyticsQuery<GetBotOverviewResponse>({
    key: "bot-overview",
    path: "bots/overview",
    site,
    periodTime,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
    params: { layer: selectedLayer || undefined },
  });

  return comparisonOff ? { ...query, data: undefined } : query;
}
