import { z } from "zod";
import { siteIdsInOrganization } from "../../lib/access.js";
import { getSitesUserHasAccessTo } from "../../lib/auth-utils.js";
import { buildSiteCardsQueries as buildLiteSiteCardsQueries } from "./lite/siteCardsQuery.js";
import { hasLiteDatetimeRange } from "./lite/utils.js";
import { analyticsRoute, runAnalyticsQuery } from "./utils/analyticsQuery.js";
import { validateHttpTimeParams } from "./utils/query-validation.js";
import { TimeWindowParams } from "./utils/timeWindow.js";
import { buildSiteCardsQueries } from "./siteCardsQuery.js";

const minutesSchema = z
  .union([z.string().trim().min(1), z.number()])
  .pipe(z.coerce.number().finite().nonnegative())
  .optional();

const timeFields = z
  .object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    start_datetime: z.string().optional(),
    end_datetime: z.string().optional(),
    time_zone: z.string().optional(),
    past_minutes_start: minutesSchema,
    past_minutes_end: minutesSchema,
  })
  .strict();

function validateWindow(params: TimeWindowParams, ctx: z.RefinementCtx) {
  const error = validateHttpTimeParams(params);
  if (error) ctx.addIssue({ code: "custom", message: error });
  if (params.start_date && params.end_date && params.start_date > params.end_date) {
    ctx.addIssue({ code: "custom", message: "start_date must not be after end_date" });
  }
}

// The homepage has no dimension filters. Reject them instead of silently
// answering an unfiltered question.
const querySchema = timeFields
  .extend({
    bucket: z
      .enum(["minute", "five_minutes", "ten_minutes", "fifteen_minutes", "hour", "day", "week", "month", "year"])
      .default("hour"),
  })
  .superRefine(validateWindow);
const bodySchema = z
  .object({
    siteIds: z.array(z.number().int().positive().max(2_147_483_647)).min(1).max(20),
    comparison: timeFields.superRefine(validateWindow).nullable(),
  })
  .strict();

interface TotalsRow {
  site_id: number;
  current_sessions: number;
  current_users: number;
  previous_sessions: number;
  previous_users: number;
}

interface SeriesRow {
  time: string;
  // processResults only coerces top-level values; UInt64s in tuples are strings.
  site_sessions: [number, number | string][];
}

function createSiteCardsHandler(lite: boolean) {
  return analyticsRoute<{
    Params: { organizationId: string };
    Querystring: unknown;
    Body: unknown;
  }>("site cards", async (req, res) => {
    const query = querySchema.safeParse(req.query);
    const body = bodySchema.safeParse(req.body);
    if (!query.success || !body.success) {
      return res.status(400).send({ error: "Invalid site card parameters" });
    }

    // The raw path supports exact windows; hourly MVs cannot represent them.
    if (
      lite &&
      (hasLiteDatetimeRange(query.data) || (body.data.comparison && hasLiteDatetimeRange(body.data.comparison)))
    ) {
      return res.status(400).send({ error: "Exact datetime windows require the standard site card endpoint" });
    }

    const siteIds = [...new Set(body.data.siteIds)];
    const { organizationId } = req.params;
    const [accessibleSites, orgSiteIds] = await Promise.all([
      getSitesUserHasAccessTo(req),
      siteIdsInOrganization(siteIds, organizationId),
    ]);
    const accessibleIds = new Set(accessibleSites.map(site => site.siteId));
    if (orgSiteIds.length !== siteIds.length || siteIds.some(id => !accessibleIds.has(id))) {
      return res.status(403).send({ error: "Forbidden" });
    }

    const queries = (lite ? buildLiteSiteCardsQueries : buildSiteCardsQueries)({
      siteIds,
      current: query.data,
      comparison: body.data.comparison,
      bucket: query.data.bucket,
    });
    const [totals, series] = await Promise.all([
      runAnalyticsQuery<TotalsRow>(queries.totals),
      runAnalyticsQuery<SeriesRow>(queries.series),
    ]);
    const totalsBySite = new Map(totals.map(row => [row.site_id, row]));
    const buckets = series.map(row => ({ time: row.time, counts: new Map(row.site_sessions) }));
    const data = Object.fromEntries(
      siteIds.map(siteId => {
        const total = totalsBySite.get(siteId);
        return [
          siteId,
          {
            current: { sessions: total?.current_sessions ?? 0, users: total?.current_users ?? 0 },
            previous:
              body.data.comparison === null
                ? null
                : {
                    sessions: total?.previous_sessions ?? 0,
                    users: total?.previous_users ?? 0,
                  },
            series: buckets
              .filter(({ counts }) => queries.fillMissingBuckets || counts.has(siteId))
              .map(({ time, counts }) => ({ time, sessions: Number(counts.get(siteId) ?? 0) })),
          },
        ];
      })
    );
    return res.send({ data });
  });
}

export const getSiteCards = createSiteCardsHandler(false);
export const getSiteCardsLite = createSiteCardsHandler(true);
