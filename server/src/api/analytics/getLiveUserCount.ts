import { FastifyReply, FastifyRequest } from "fastify";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import { processResults } from "./utils.js";

export async function fetchLiveUserCount (site: string, minutes: number) {
  const query = await clickhouse.query({
    query: `SELECT COUNT(DISTINCT(session_id)) AS count FROM events WHERE timestamp > now() - interval '${minutes} minute' AND site_id = {siteId:Int32}`,
    format: "JSONEachRow",
    query_params: {
      siteId: Number(site),
      minutes: Number(minutes || 5),
    },
  });

  const result = await processResults<{ count: number }>(query);

  return result[0]?.count ?? 0;
}

export async function getLiveUserCount (
  req: FastifyRequest<{
    Params: { site: string };
    Querystring: { minutes: number };
  }>,
  res: FastifyReply
) {
  const { site } = req.params;
  const { minutes } = req.query;

  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const count = await fetchLiveUserCount(site, minutes);
  return res.send({ count });
}
