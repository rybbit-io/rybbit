import { type PaginatedBotAiPagesResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { useBotFilters } from "./useBotFilters";

/**
 * Pages AI systems read, with the visits that landed on each and its human
 * pageviews. `purpose: "ai_agent"` keeps and ranks the pages agents opened.
 */
export function useGetBotAiPages({
  site,
  purpose = "ai",
  limit = 50,
}: {
  site?: number | string;
  purpose?: "ai" | "ai_agent";
  limit?: number;
}) {
  const botFilters = useBotFilters();

  return useAnalyticsQuery<PaginatedBotAiPagesResponse>({
    key: "bot-ai-pages",
    path: "bots/ai-pages",
    site,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
    params: { purpose, limit, page: 1 },
  });
}
