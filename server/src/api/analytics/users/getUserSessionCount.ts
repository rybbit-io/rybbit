import { FastifyReply, FastifyRequest } from "fastify";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { matchesUser } from "../utils/effectiveUserId.js";
import SqlString from "sqlstring";

export interface GetUserSessionCountRequest {
  Params: {
    siteId: string;
  };
  Querystring: {
    user_id?: string;
    time_zone?: string;
    filters?: string;
  };
}

export type GetUserSessionCountResponse = {
  date: string;
  sessions: number;
}[];

export const buildUserSessionCountQuery = (query: GetUserSessionCountRequest["Querystring"], siteId: number) => {
  const { time_zone: timeZone = "UTC", filters } = query;

  // The calendar spans the user's full history, so dimension filters apply
  // but no time range does.
  const filterStatement = getFilterStatement(filters ?? "", siteId);

  return `
    SELECT
      toDate(timestamp, ${SqlString.escape(timeZone)}) as date,
      count(DISTINCT session_id) as sessions
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND ${matchesUser("{userId:String}")}
      ${filterStatement}
    GROUP BY date
    ORDER BY date ASC
  `;
};

export const getUserSessionCount = analyticsRoute<GetUserSessionCountRequest>(
  "user session count",
  async (req: FastifyRequest<GetUserSessionCountRequest>, res: FastifyReply) => {
    const { siteId } = req.params;
    const { user_id: userId } = req.query;

    if (!userId) {
      return res.status(400).send({ error: "user_id is required" });
    }

    const data = await runAnalyticsQuery<GetUserSessionCountResponse[number]>({
      query: buildUserSessionCountQuery(req.query, Number(siteId)),
      params: {
        siteId: Number(siteId),
        userId,
      },
    });

    return res.send({
      data,
    });
  }
);
