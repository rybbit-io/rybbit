import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { processResults } from "../analytics/utils/utils.js";

interface EmbedStats {
  count: number;
  series: { time: string; users: number }[];
  topCountries: { country: string; users: number }[];
}

type CacheEntry = { data: EmbedStats; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;
const ALLOWED_MINUTES = new Set([30, 1440, 10080]);

function bucketExpr(minutes: number) {
  if (minutes === 30) return "toStartOfMinute(timestamp)";
  if (minutes === 1440) return "toStartOfHour(timestamp)";
  return "toStartOfDay(timestamp)";
}

export async function getEmbedStats(
  req: FastifyRequest<{
    Params: { siteId: string };
    Querystring: { minutes?: string; chart?: string; countries?: string };
  }>,
  res: FastifyReply
) {
  const { siteId } = req.params;
  const minutesNum = Number(req.query.minutes ?? 30);
  if (!ALLOWED_MINUTES.has(minutesNum)) {
    return res.status(400).send({ error: "Invalid minutes. Allowed: 30, 1440, 10080" });
  }
  const includeChart = req.query.chart === "true";
  const includeCountries = req.query.countries === "true";

  const config = await siteConfig.getConfig(siteId);
  if (!config) return res.status(404).send({ error: "Site not found" });
  if (!config.embedEnabled) return res.status(403).send({ error: "Embed widget is not enabled for this site" });

  const cacheKey = `${siteId}:${minutesNum}:${includeChart}:${includeCountries}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    res.header("Cache-Control", "public, max-age=60");
    return res.send(cached.data);
  }

  const numericId = Number(siteId);

  const countResult = await clickhouse.query({
    query: `SELECT COUNT(DISTINCT(session_id)) AS count FROM events
            WHERE timestamp > now() - interval {minutes:Int32} minute
              AND site_id = {siteId:Int32}`,
    format: "JSONEachRow",
    query_params: { siteId: numericId, minutes: minutesNum },
  });
  const countRows = await processResults<{ count: number }>(countResult);
  const count = Number(countRows[0]?.count ?? 0);

  let series: { time: string; users: number }[] = [];
  if (includeChart) {
    const seriesResult = await clickhouse.query({
      query: `SELECT toString(${bucketExpr(minutesNum)}) AS time,
                     COUNT(DISTINCT session_id) AS users
              FROM events
              WHERE timestamp > now() - interval {minutes:Int32} minute
                AND site_id = {siteId:Int32}
              GROUP BY time
              ORDER BY time`,
      format: "JSONEachRow",
      query_params: { siteId: numericId, minutes: minutesNum },
    });
    const rows = await processResults<{ time: string; users: number }>(seriesResult);
    series = rows.map(r => ({ time: r.time, users: Number(r.users) }));
  }

  let topCountries: { country: string; users: number }[] = [];
  if (includeCountries) {
    const countriesResult = await clickhouse.query({
      query: `SELECT country,
                     COUNT(DISTINCT session_id) AS users
              FROM events
              WHERE timestamp > now() - interval {minutes:Int32} minute
                AND site_id = {siteId:Int32}
                AND country != ''
              GROUP BY country
              ORDER BY users DESC
              LIMIT 5`,
      format: "JSONEachRow",
      query_params: { siteId: numericId, minutes: minutesNum },
    });
    const rows = await processResults<{ country: string; users: number }>(countriesResult);
    topCountries = rows.map(r => ({ country: r.country, users: Number(r.users) }));
  }

  const data: EmbedStats = { count, series, topCountries };
  cache.set(cacheKey, { data, expiresAt: now + CACHE_TTL_MS });

  res.header("Cache-Control", "public, max-age=60");
  return res.send(data);
}
