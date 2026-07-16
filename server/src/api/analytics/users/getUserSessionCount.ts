import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { processResults } from "../utils/utils.js";
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

export async function getUserSessionCount(req: FastifyRequest<GetUserSessionCountRequest>, res: FastifyReply) {
  const { siteId } = req.params;
  const { user_id: userId, time_zone: timeZone = "UTC", filters } = req.query;

  if (!userId) {
    return res.status(400).send({ error: "user_id is required" });
  }

  // The calendar spans the user's full history, so dimension filters apply
  // but no time range does.
  const filterStatement = getFilterStatement(filters ?? "", Number(siteId));

  const query = `
    SELECT
      toDate(timestamp, ${SqlString.escape(timeZone)}) as date,
      count(DISTINCT session_id) as sessions
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND (user_id = {userId:String} OR identified_user_id = {userId:String})
      ${filterStatement}
    GROUP BY date
    ORDER BY date ASC
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(siteId),
        userId,
      },
    });

    const data = await processResults<GetUserSessionCountResponse[number]>(result);

    return res.send({
      data,
    });
  } catch (error) {
    console.error("Error fetching user session count:", error);
    return res.status(500).send({ error: "Failed to fetch user session count" });
  }
}
