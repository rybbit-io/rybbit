import { FastifyReply, FastifyRequest } from "fastify";
import { analyticsRoute, runAnalyticsQuery } from "./utils/analyticsQuery.js";
import { effectiveUserId } from "./utils/effectiveUserId.js";

interface GetLiveUsercountRequest {
  Params: { siteId: string };
  Querystring: { minutes: number };
}

// Counts people, not sessions: the label is "users online", and a visitor whose
// session lapses and restarts inside the window is one person, not two.
export const buildLiveUsercountQuery = () =>
  `SELECT COUNT(DISTINCT ${effectiveUserId()}) AS count FROM events WHERE timestamp > now() - interval {minutes:Int32} minute AND site_id = {siteId:Int32}`;

export const getLiveUsercount = analyticsRoute<GetLiveUsercountRequest>(
  "live user count",
  async (req: FastifyRequest<GetLiveUsercountRequest>, res: FastifyReply) => {
    const { siteId } = req.params;
    const { minutes } = req.query;

    const result = await runAnalyticsQuery<{ count: number }>({
      query: buildLiveUsercountQuery(),
      params: {
        siteId: Number(siteId),
        minutes: Number(minutes || 5),
      },
    });

    return res.send({ count: result[0].count });
  }
);
