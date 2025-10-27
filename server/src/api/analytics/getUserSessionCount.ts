import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { processResults } from "./utils.js";
import SqlString from "sqlstring";

export interface GetUserSessionCountRequest {
  Params: {
    site: string;
  };
  Querystring: {
    userId?: string;
    timeZone?: string;
  };
}

export type GetUserSessionCountResponse = {
  date: string;
  sessions: number;
}[];

export async function getUserSessionCount(req: FastifyRequest<GetUserSessionCountRequest>, res: FastifyReply) {
  const { site } = req.params;
  const { userId, timeZone = "UTC" } = req.query;

  if (!userId) {
    return res.status(400).send({ error: "userId is required" });
  }

  const query = `
    SELECT
      toDate(timestamp, ${SqlString.escape(timeZone)}) as date,
      count(DISTINCT session_id) as sessions
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND user_id = {userId:String} 
    GROUP BY date
    ORDER BY date ASC
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
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
