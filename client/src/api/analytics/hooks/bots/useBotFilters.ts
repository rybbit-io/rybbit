import { Filter } from "@rybbit/shared";
import { useMemo } from "react";
import { useComparisonEnabled, useStore } from "../../../../lib/store";
import { BOT_AVAILABLE_FILTERS } from "./constants";

export type BotPeriod = "current" | "previous";

/**
 * Sessions an AI product sent. The channel filter is a session-level one on
 * the server (the session's first attributed channel), so a number counted
 * with it is the number the Sessions page lists under the same filter.
 */
export const AI_CHANNEL_FILTER: Filter = { parameter: "channel", type: "equals", value: ["AI"] };

/**
 * The store's filters the bot tables can express. The page's filter menu only
 * offers these, but the store may still hold others applied on another page;
 * sending those would silently narrow the human half of the page and not the
 * bot half.
 */
export function useBotFilters(): Filter[] {
  const filters = useStore(state => state.filters);
  return useMemo(() => filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter)), [filters]);
}

/**
 * True when a hook was asked for the comparison period and the comparison is
 * switched off. The query is disabled then, but it still holds the placeholder
 * from the period it last answered, and a delta drawn from that would compare
 * against a window nobody selected. Callers drop the data instead.
 */
export function useComparisonOff(periodTime?: BotPeriod): boolean {
  const comparisonEnabled = useComparisonEnabled();
  return periodTime === "previous" && !comparisonEnabled;
}
