import { useStore } from "../../../lib/store";
import { RunCustomQueryResponse } from "../endpoints/customQuery";
import { runDashboardCard, RunDashboardCardBody } from "../endpoints/dashboards";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

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
  const bucket = useStore(state => state.bucket);

  return useAnalyticsQuery<RunCustomQueryResponse, RunDashboardCardBody>({
    key: ["dashboard-card", cardId],
    site: siteId,
    useFilters: false,
    extraParams: { query: sql, bucket },
    enabled: enabled && !!siteId && !!sql.trim(),
    props: { retry: false },
    fetch: (site, params) => runDashboardCard(site, params),
  });
}
