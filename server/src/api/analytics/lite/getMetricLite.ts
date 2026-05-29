import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getMetric } from "../getMetric.js";
import { processResults } from "../utils/utils.js";
import { getLiteSessionFilter, getLiteTimeStatement, hasLiteFilters } from "./utils.js";

// Lite metric supports only dimensions backed by MVs:
//   - pathname → pathname_hourly_mv_target
//   - country → country_hourly_mv_target
//   - device_type → device_type_hourly_mv_target
// Other parameters return 400 — the simplified dashboard hides those sections.
type LiteMetricParameter = "pathname" | "country" | "device_type";

type LiteMetricItem = {
  value: string;
  hostname?: string;
  count: number; // sessions
  percentage: number;
  pageviews: number;
  pageviews_percentage: number;
  // count() OVER () — total distinct values across all pages, computed before
  // LIMIT/OFFSET so it's stable per page. Stripped from the response items.
  total_count?: number;
};

export async function getMetricLite(
  req: FastifyRequest<{
    Params: { siteId: string };
    Querystring: FilterParams<{ parameter: LiteMetricParameter; limit?: number; page?: number }>;
  }>,
  res: FastifyReply
) {
  const site = Number(req.params.siteId);
  const { parameter } = req.query;
  const limit = Math.min(Number(req.query.limit) || 250, 500);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const offsetStatement = page > 1 ? `OFFSET ${(page - 1) * limit}` : "";
  const filtersPresent = hasLiteFilters(req.query.filters);

  // Pull totalCount off the window column and drop it from the returned rows so
  // items match the standard /metric shape.
  const sendMetric = (data: LiteMetricItem[]) => {
    const totalCount = data.length > 0 ? (data[0].total_count ?? data.length) : 0;
    const items = data.map(({ total_count, ...rest }) => rest);
    return res.send({ data: { data: items, totalCount } });
  };

  // Filtered country/device_type lists can be served from sessions_mv_target
  // (it carries both columns per session), as long as every active filter
  // targets a session column. pathname isn't on the session rollup — and no
  // dimensioned MV pairs pathname with another dimension — so any filtered
  // pathname list falls back to the raw-events query.
  if (filtersPresent) {
    const filter = getLiteSessionFilter(req.query.filters);
    const sessionFastPath = filter.supported && (parameter === "country" || parameter === "device_type");
    if (!sessionFastPath) {
      return getMetric(req as unknown as Parameters<typeof getMetric>[0], res);
    }

    const sessionsTime = getLiteTimeStatement(req.query, "start_time");
    const nonEmpty = parameter === "device_type" ? `AND ${parameter} <> ''` : "";
    const query = `
      SELECT
        value,
        pageviews,
        count,
        round(count * 100.0 / sum(count) OVER (), 2) AS percentage,
        round(pageviews * 100.0 / sum(pageviews) OVER (), 2) AS pageviews_percentage,
        count() OVER () AS total_count
      FROM (
        SELECT
          ${parameter} AS value,
          sum(session_pageviews) AS pageviews,
          count() AS count
        FROM (
          SELECT
            session_id,
            any(${parameter}) AS ${parameter},
            sum(pageviews) AS session_pageviews
          FROM sessions_mv_target
          WHERE site_id = {siteId:Int32}
            ${sessionsTime}
            ${nonEmpty}
            ${filter.sql}
          GROUP BY session_id
        )
        GROUP BY ${parameter}
      )
      ORDER BY count DESC
      LIMIT ${limit}
      ${offsetStatement}
    `;

    try {
      const result = await clickhouse.query({
        query,
        format: "JSONEachRow",
        query_params: { siteId: site },
      });
      const data = await processResults<LiteMetricItem>(result);
      return sendMetric(data);
    } catch (error) {
      console.error("Error fetching lite metric:", error);
      return res.status(500).send({ error: "Failed to fetch metric" });
    }
  }

  const timeStatement = getLiteTimeStatement(req.query, "event_hour");

  // Percentages are computed in an outer pass so the window function
  // operates on already-grouped rows. `sum(sum(...)) OVER ()` is illegal
  // in ClickHouse — aggregates can't nest.
  let query: string;
  if (parameter === "pathname") {
    query = `
      SELECT
        value,
        hostname,
        pageviews,
        count,
        round(count * 100.0 / sum(count) OVER (), 2) AS percentage,
        round(pageviews * 100.0 / sum(pageviews) OVER (), 2) AS pageviews_percentage,
        count() OVER () AS total_count
      FROM (
        SELECT
          pathname AS value,
          any(hostname) AS hostname,
          sum(pageviews) AS pageviews,
          uniqMerge(sessions) AS count
        FROM pathname_hourly_mv_target
        WHERE site_id = {siteId:Int32}
          ${timeStatement}
        GROUP BY pathname
      )
      ORDER BY count DESC
      LIMIT ${limit}
      ${offsetStatement}
    `;
  } else if (parameter === "country") {
    query = `
      SELECT
        value,
        pageviews,
        count,
        round(count * 100.0 / sum(count) OVER (), 2) AS percentage,
        round(pageviews * 100.0 / sum(pageviews) OVER (), 2) AS pageviews_percentage,
        count() OVER () AS total_count
      FROM (
        SELECT
          country AS value,
          sum(pageviews) AS pageviews,
          uniqMerge(sessions) AS count
        FROM country_hourly_mv_target
        WHERE site_id = {siteId:Int32}
          ${timeStatement}
        GROUP BY country
      )
      ORDER BY count DESC
      LIMIT ${limit}
      ${offsetStatement}
    `;
  } else if (parameter === "device_type") {
    query = `
      SELECT
        value,
        pageviews,
        count,
        round(count * 100.0 / sum(count) OVER (), 2) AS percentage,
        round(pageviews * 100.0 / sum(pageviews) OVER (), 2) AS pageviews_percentage,
        count() OVER () AS total_count
      FROM (
        SELECT
          device_type AS value,
          sum(pageviews) AS pageviews,
          uniqMerge(sessions) AS count
        FROM device_type_hourly_mv_target
        WHERE site_id = {siteId:Int32}
          AND device_type <> ''
          ${timeStatement}
        GROUP BY device_type
      )
      ORDER BY count DESC
      LIMIT ${limit}
      ${offsetStatement}
    `;
  } else {
    return res.status(400).send({ error: "Lite mode does not support this parameter" });
  }

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: { siteId: site },
    });
    const data = await processResults<LiteMetricItem>(result);
    return sendMetric(data);
  } catch (error) {
    console.error("Error fetching lite metric:", error);
    return res.status(500).send({ error: "Failed to fetch metric" });
  }
}

/**
# === fill these in ===                                                                                                                                         
  export BASE_URL="https://opgg.rybbit.com/api"                                                                                                            
  export API_KEY="DviIHftQUGJgjWUSfYORHeDJEoGZoTCUsAGJLgJKHVvZJJMFZmUDDygCdSGYfiIV"                                                                                                                       
  export SITE_ID="1"                                                                                                                                              
  export START="2026-04-22"   # 30-day range                                                                                                                      
  export END="2026-04-25"                                         
  export TZ="UTC"                                                                                                                                                 
  # =====================                                         
                                                                                                                                                                  
  # Common curl flags: silent, drop body, print only timing                                                                                                       
  TIMING='-o /dev/null -s -w "%{time_total}s  http_%{http_code}  size=%{size_download}\n"'
                                                                                                                                                                  
  bench() {                                                       
    local label="$1"; local url="$2"                                                                                                                              
    echo -n "$label: "                                                                                                                                            
    eval curl $TIMING -H "\"Authorization: Bearer $API_KEY\"" "\"$url\""
  }                                                                                                                                                               
                                                                  
  # Warm caches once (ClickHouse mark cache, OS page cache) so first-run noise                                                                                    
  # doesn't dominate. Then measure 3x and take the best.          
  warmup() { curl -s -o /dev/null -H "Authorization: Bearer $API_KEY" "$1"; }                                                                                     
                                                                                                                                                                  
  OVERVIEW_STD="$BASE_URL/sites/$SITE_ID/overview?start_date=$START&end_date=$END&time_zone=$TZ"                                                                  
  OVERVIEW_LITE="$BASE_URL/sites/$SITE_ID/overview-lite?start_date=$START&end_date=$END&time_zone=$TZ"                                                            
                                                                                                                                                                  
  BUCKETED_STD="$BASE_URL/sites/$SITE_ID/overview-bucketed?start_date=$START&end_date=$END&time_zone=$TZ&bucket=day"                                              
  BUCKETED_LITE="$BASE_URL/sites/$SITE_ID/overview-bucketed-lite?start_date=$START&end_date=$END&time_zone=$TZ&bucket=day"                                        
                                                                                                                                                                  
  METRIC_PATHS_STD="$BASE_URL/sites/$SITE_ID/metric?start_date=$START&end_date=$END&time_zone=$TZ&parameter=pathname&limit=100"                                   
  METRIC_PATHS_LITE="$BASE_URL/sites/$SITE_ID/metric-lite?start_date=$START&end_date=$END&time_zone=$TZ&parameter=pathname&limit=100"                             
                                                                                                                                                                  
  METRIC_COUNTRY_STD="$BASE_URL/sites/$SITE_ID/metric?start_date=$START&end_date=$END&time_zone=$TZ&parameter=country&limit=100"                                  
  METRIC_COUNTRY_LITE="$BASE_URL/sites/$SITE_ID/metric-lite?start_date=$START&end_date=$END&time_zone=$TZ&parameter=country&limit=100"                            
                                                                                                                                                                  
  for url in "$OVERVIEW_STD" "$OVERVIEW_LITE" "$BUCKETED_STD" "$BUCKETED_LITE" \                                                                                  
             "$METRIC_PATHS_STD" "$METRIC_PATHS_LITE" "$METRIC_COUNTRY_STD" "$METRIC_COUNTRY_LITE"; do                                                            
    warmup "$url"                                                                                                                                                 
  done                                                                                                                                                            
                                                                                                                                                                  
  echo ""                                                                                                                                                         
  echo "=== overview (single value) ==="                          
  for i in 1 2 3; do bench "  std  run$i" "$OVERVIEW_STD";  done
  for i in 1 2 3; do bench "  lite run$i" "$OVERVIEW_LITE"; done                                                                                                  
                                                                                                                                                                  
  echo ""                                                                                                                                                         
  echo "=== overview-bucketed (chart) ==="                                                                                                                        
  for i in 1 2 3; do bench "  std  run$i" "$BUCKETED_STD";  done  
  for i in 1 2 3; do bench "  lite run$i" "$BUCKETED_LITE"; done                                                                                                  
  
  echo ""                                                                                                                                                         
  echo "=== metric pathname ==="                                  
  for i in 1 2 3; do bench "  std  run$i" "$METRIC_PATHS_STD";  done                                                                                              
  for i in 1 2 3; do bench "  lite run$i" "$METRIC_PATHS_LITE"; done                                                                                              
  
  echo ""                                                                                                                                                         
  echo "=== metric country ==="                                   
  for i in 1 2 3; do bench "  std  run$i" "$METRIC_COUNTRY_STD";  done
  for i in 1 2 3; do bench "  lite run$i" "$METRIC_COUNTRY_LITE"; done  
 */
