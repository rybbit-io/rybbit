import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { buildApiParams } from "../../utils";
import { runDashboardCard } from "../endpoints/dashboards";

/**
 * Executes a dashboard card's SQL against the time-aware run-card endpoint.
 *
 * This is a useQuery (not a mutation) keyed on the global `time` and `bucket`,
 * so every card automatically refetches when the global DateSelector or bucket
 * changes. Pass the (possibly unsaved) SQL directly so the card editor preview
 * can reuse the same hook.
 */
export function useDashboardCard(
  siteId: string | number | undefined,
  cardId: string,
  sql: string,
  enabled = true
) {
  const time = useStore(state => state.time);
  const bucket = useStore(state => state.bucket);
  const apiParams = buildApiParams(time);

  return useQuery({
    queryKey: ["dashboard-card", siteId, cardId, sql, apiParams, bucket],
    queryFn: () => runDashboardCard(siteId!, { query: sql, bucket, ...apiParams }),
    enabled: enabled && !!siteId && !!sql.trim(),
    retry: false,
  });
}
