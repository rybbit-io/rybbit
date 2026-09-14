import { useStore } from "../../../lib/store";
import { RunCustomQueryResponse } from "../endpoints/customQuery";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

/**
 * Executes a dashboard card's SQL against the time-aware run-card endpoint.
 *
 * This is a useQuery (not a mutation) keyed on the global `time` and `bucket`,
 * so every card automatically refetches when the global DateSelector or bucket
 * changes. Pass the (possibly unsaved) SQL directly so the card editor preview
 * can reuse the same hook.
 */
export function useDashboardCard(siteId: string | number | undefined, cardId: string, sql: string, enabled = true) {
  const bucket = useStore(state => state.bucket);

  return useAnalyticsQuery<RunCustomQueryResponse>({
    key: ["dashboard-card", cardId],
    path: "dashboards/run-card",
    unwrap: false,
    site: siteId,
    useFilters: false,
    // The window is sent as camelCase JSON in the body (the server schema
    // matches); filters aren't used by card execution.
    body: ({ filters: _filters, ...window }) => ({ ...window, query: sql, bucket }),
    enabled: enabled && !!siteId && !!sql.trim(),
    props: { retry: false },
  });
}
