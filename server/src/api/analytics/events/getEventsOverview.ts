import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { effectiveUserId } from "../utils/effectiveUserId.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { getTimeStatement } from "../utils/timeWindow.js";

export type GetEventsOverviewResponse = {
  /** Custom events in the period. */
  events: number;
  /** Users who fired at least one custom event. */
  users_with_events: number;
  /** Every user active in the period, the base for `users_with_events`. */
  users: number;
  /** Every session in the period, the base for events per session. */
  sessions: number;
  /** Sessions that hold at least one custom event. */
  sessions_with_events: number;
  /** Distinct custom event names. */
  event_names: number;
  /** Events the script records on its own: outbound, button, copy, form and input events. */
  autocaptured: number;
};

export interface GetEventsOverviewRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams;
}

// The types the tracking script captures without a `track()` call.
export const AUTOCAPTURED_EVENT_TYPES = ["outbound", "button_click", "copy", "form_submit", "input_change"] as const;

export const buildEventsOverviewQuery = (query: GetEventsOverviewRequest["Querystring"], siteId: number) => {
  const timeStatement = getTimeStatement(query);
  const filterStatement = getFilterStatement(query.filters, siteId, timeStatement, {
    sessionLevelParams: ["channel"],
  });
  const user = effectiveUserId();
  const autocaptured = AUTOCAPTURED_EVENT_TYPES.map(type => `'${type}'`).join(", ");

  return `
    SELECT
      countIf(type = 'custom_event') AS events,
      uniqExactIf(${user}, type = 'custom_event') AS users_with_events,
      uniqExact(${user}) AS users,
      uniqExact(session_id) AS sessions,
      uniqExactIf(session_id, type = 'custom_event') AS sessions_with_events,
      uniqExactIf(event_name, type = 'custom_event' AND event_name != '') AS event_names,
      countIf(type IN (${autocaptured})) AS autocaptured
    FROM events
    WHERE
      site_id = {siteId:Int32}
      ${timeStatement}
      ${filterStatement}
  `;
};

// The events page's stat band: one pass over the period's events. The client
// asks again for the comparison period.
export const getEventsOverview = analyticsRoute<GetEventsOverviewRequest>(
  "events overview",
  async (req: FastifyRequest<GetEventsOverviewRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    const data = await runAnalyticsQuery<GetEventsOverviewResponse>({
      query: buildEventsOverviewQuery(req.query, siteId),
      params: { siteId },
    });

    return res.send({ data: data[0] });
  }
);
