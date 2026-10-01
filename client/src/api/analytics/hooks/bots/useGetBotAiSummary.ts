import { TimeBucket } from "@rybbit/shared";
import { type GetBotAiSummaryResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";
import { type BotPeriod, useBotFilters, useComparisonOff } from "./useBotFilters";

/**
 * Crawls and referrals per AI operator, side by side, with the named bots
 * behind each operator.
 *
 * Deliberately does not take the layer selection: layers describe how a bot was
 * caught, and every row here was caught the same way (its user agent named it).
 *
 * `bucket` asks for each bot's reads over time. Leave it out for the comparison
 * period, where only the totals are read.
 */
export function useGetBotAiSummary({
  site,
  periodTime,
  bucket,
}: {
  site?: number | string;
  periodTime?: BotPeriod;
  bucket?: TimeBucket;
}) {
  const botFilters = useBotFilters();
  const comparisonOff = useComparisonOff(periodTime);

  const query = useAnalyticsQuery<GetBotAiSummaryResponse>({
    key: "bot-ai-summary",
    path: "bots/ai-summary",
    site,
    periodTime,
    // Only bot-relevant filters go on the wire; when none apply, send no filters.
    useFilters: botFilters.length > 0,
    customFilters: botFilters,
    params: { bucket },
  });

  return comparisonOff ? { ...query, data: undefined } : query;
}
