import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getFilterStatement, getTimeStatement, processResults } from "./utils.js";
import { FilterParams } from "@rybbit/shared";

interface GetPageTitlesRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams<{
    limit?: number;
    page?: number;
  }>;
}

// This type represents a single item in the array
export type PageTitleItem = {
  value: string;
  pathname: string;
  count: number;
  percentage: number;
  time_on_page_seconds?: number;
};

// Structure for paginated response (if/when fully paginated)
type PageTitlesPaginatedResponse = {
  data: PageTitleItem[];
  totalCount: number;
};

const getPageTitlesQuery = (request: FastifyRequest<GetPageTitlesRequest>, isCountQuery: boolean = false) => {
  const { startDate, endDate, timeZone, filters, limit, page, pastMinutesStart, pastMinutesEnd } = request.query;

  const filterStatement = getFilterStatement(filters);
  const timeStatement = getTimeStatement(request.query);

  let validatedLimit: number | null = null;
  if (!isCountQuery && limit !== undefined) {
    const parsedLimit = parseInt(String(limit), 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      validatedLimit = parsedLimit;
    }
  }
  // StandardSection usually shows a small number, e.g., 7 or 10. Let's default to 10 for non-paginated use.
  const limitStatement = !isCountQuery && validatedLimit ? `LIMIT ${validatedLimit}` : isCountQuery ? "" : "LIMIT 10";

  let validatedOffset: number | null = null;
  if (!isCountQuery && page !== undefined) {
    const parsedPage = parseInt(String(page), 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      const pageOffset = (parsedPage - 1) * (validatedLimit || 10);
      validatedOffset = pageOffset;
    }
  }
  const offsetStatement = !isCountQuery && validatedOffset ? `OFFSET ${validatedOffset}` : "";

  // For page_title, we want to count distinct sessions that viewed this title.
  // We also need a representative pathname and calculate average time on page.
  // Using argMax to get the pathname from the most recent event for that title in a session.
  const baseCteQuery = `
    EventTimes AS (
        SELECT
            session_id,
            page_title,
            pathname,
            timestamp,
            leadInFrame(timestamp) OVER (PARTITION BY session_id ORDER BY timestamp ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING) as next_timestamp
        FROM events
        WHERE
          site_id = {siteId:Int32}
          AND page_title IS NOT NULL
          AND page_title <> ''
          AND type = 'pageview'
          ${filterStatement}
          ${timeStatement}
    ),
    PageDurations AS (
        SELECT
            session_id,
            page_title,
            pathname,
            timestamp,
            next_timestamp,
            if(isNull(next_timestamp), 0, dateDiff('second', timestamp, next_timestamp)) as time_diff_seconds
        FROM EventTimes
    ),
    PageTitleStats AS (
        SELECT
            page_title as value,
            argMax(pathname, timestamp) as pathname,
            count(DISTINCT session_id) as unique_sessions,
            avg(if(time_diff_seconds < 0, 0, if(time_diff_seconds > 1800, 1800, time_diff_seconds))) as avg_time_on_page_seconds
        FROM PageDurations
        GROUP BY page_title
    )
  `;

  if (isCountQuery) {
    return `
    WITH ${baseCteQuery}
    SELECT COUNT(*) as totalCount FROM PageTitleStats;
    `;
  }

  return `
    WITH ${baseCteQuery}
    SELECT
        value,
        pathname,
        unique_sessions as count,
        ROUND(
            unique_sessions * 100.0 / SUM(unique_sessions) OVER (),
            2
        ) as percentage,
        avg_time_on_page_seconds as time_on_page_seconds
    FROM PageTitleStats
    ORDER BY count DESC
    ${limitStatement}
    ${offsetStatement}
  `;
};

export async function getPageTitles(req: FastifyRequest<GetPageTitlesRequest>, res: FastifyReply) {
  const site = req.params.site;
  const { page } = req.query;

  const isPaginatedRequest = page !== undefined; // True if page is present

  const dataQuery = getPageTitlesQuery(req, false);

  try {
    const dataResult = await clickhouse.query({
      query: dataQuery,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });
    const items = await processResults<PageTitleItem>(dataResult);

    if (isPaginatedRequest) {
      const countQuery = getPageTitlesQuery(req, true);
      const countResult = await clickhouse.query({
        query: countQuery,
        format: "JSONEachRow",
        query_params: {
          siteId: Number(site),
        },
      });
      const countData = await processResults<{ totalCount: number }>(countResult);
      const totalCount = countData.length > 0 ? countData[0].totalCount : 0;
      return res.send({ data: { data: items, totalCount } });
    } else {
      // For non-paginated (StandardSection default) use, return the simpler structure
      return res.send({ data: items });
    }
  } catch (error) {
    console.error(`Error fetching page titles:`, error);
    console.error("Failed dataQuery:", dataQuery);
    if (isPaginatedRequest) {
      const countQuery = getPageTitlesQuery(req, true);
      console.error("Failed countQuery:", countQuery);
    }
    return res.status(500).send({ error: `Failed to fetch page titles` });
  }
}
