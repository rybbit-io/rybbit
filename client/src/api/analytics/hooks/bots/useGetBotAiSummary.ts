import { useStore } from "../../../../lib/store";
import { type GetBotAiSummaryResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { BOT_AVAILABLE_FILTERS } from "./constants";

/**
 * Crawls and referrals per AI operator, side by side.
 *
 * Deliberately does not take the layer selection: layers describe how a bot was
 * caught, and every row here was caught the same way (its user agent named it).
 */
export function useGetBotAiSummary({ site }: { site?: number | string }) {
  const filters = useStore(state => state.filters);
  const botFilters = filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter));

  return useAnalyticsQuery<GetBotAiSummaryResponse>({
    key: "bot-ai-summary",
    path: "bots/ai-summary",
    site,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
  });
}
