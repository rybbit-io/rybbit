import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { getSitesUserHasAccessTo } from "../../lib/auth-utils.js";
import { analyticsRoute, runAnalyticsQuery } from "./utils/analyticsQuery.js";
import { resolveTimeWindow } from "./utils/timeWindow.js";

type OrgEventCountResponse = {
  event_date: string;
  pageview_count: number;
  custom_event_count: number;
  performance_count: number;
  outbound_count: number;
  error_count: number;
  button_click_count: number;
  copy_count: number;
  form_submit_count: number;
  input_change_count: number;
  event_count: number;
}[];

interface GetOrgEventCountRequest {
  Params: {
    organizationId: string;
  };
  Querystring: {
    start_date?: string;
    end_date?: string;
    time_zone?: string;
  };
}

export const buildOrgEventCountQuery = (query: GetOrgEventCountRequest["Querystring"], siteIds: number[]) => {
  const window = resolveTimeWindow(query);

  // Days are counted in the caller's timezone, the same one the window is
  // bounded by. Grouping by `toStartOfDay(timestamp)` counted UTC days instead,
  // which put the fill's day boundaries hours away from the data's — for a
  // non-UTC caller the filled rows never landed on a real row, so every day
  // appeared twice, once with its counts and once empty.
  return `
      SELECT
        ${window.bucketed("timestamp", "day")} as event_date,
        countIf(type = 'pageview') as pageview_count,
        countIf(type = 'custom_event') as custom_event_count,
        countIf(type = 'performance') as performance_count,
        countIf(type = 'outbound') as outbound_count,
        countIf(type = 'error') as error_count,
        countIf(type = 'button_click') as button_click_count,
        countIf(type = 'copy') as copy_count,
        countIf(type = 'form_submit') as form_submit_count,
        countIf(type = 'input_change') as input_change_count,
        count() as event_count
      FROM events
      WHERE site_id IN (${siteIds.map((id: number) => SqlString.escape(id)).join(", ")})
        AND type IN ('pageview', 'custom_event', 'performance', 'outbound', 'error', 'button_click', 'copy', 'form_submit', 'input_change')
        ${window.where()}
      GROUP BY event_date
      ORDER BY event_date
      ${window.fill("day")}
    `;
};

export const getOrgEventCount = analyticsRoute<GetOrgEventCountRequest>(
  "organization event count",
  async (req: FastifyRequest<GetOrgEventCountRequest>, res: FastifyReply) => {
    const { organizationId } = req.params;

    // Get all sites the user has access to
    const userSites = await getSitesUserHasAccessTo(req);

    // Filter to only sites in the requested organization
    const orgSites = userSites.filter(site => site.organizationId === organizationId);

    if (orgSites.length === 0) {
      return res.status(403).send({ error: "No access to organization or no sites found" });
    }

    const siteIds = orgSites.map((site: any) => site.siteId);

    const data = await runAnalyticsQuery<OrgEventCountResponse[number]>({
      query: buildOrgEventCountQuery(req.query, siteIds),
    });
    return res.send({ data });
  }
);
