import { FilterParams, TimeBucket } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { analyticsRoute, QuerySpec, runAnalyticsQuery } from "./utils/analyticsQuery.js";
import { buildFilteredSessionsCTE } from "./utils/sessionFilters.js";
import { resolveTimeWindow, TimeBucketToFn, TimeWindowParams } from "./utils/timeWindow.js";

/**
 * The Pages report: one row per path (or per section), with the entry and exit
 * counts, time on page and entry bounce rate that the main dashboard only shows
 * on separate tabs.
 *
 * Every figure comes from the same per-pageview pass: each pageview knows the
 * session's previous and next pageview, so a view with no previous one is the
 * session's entry, a view with no next one is its exit, and a view with neither
 * is a bounce. Time on page is the gap to the next view, so exit views have no
 * time on page and are left out of the average instead of counting as 0s.
 */

/** A path's section is its first segment: "/docs" and "/docs/script" are both in "/docs"; "/" is its own. */
export const sectionOf = (column: string) => `extract(${column}, '^/?[^/]*')`;

// Same 30-minute cap as the other time-on-page figures, so one tab left open
// overnight does not swamp a page's average.
const MAX_TIME_ON_PAGE_SECONDS = 1800;
const timeOnPage = `least(greatest(dateDiff('second', timestamp_ms, next_view), 0), ${MAX_TIME_ON_PAGE_SECONDS})`;

const SORT_COLUMNS = {
  pageviews: "pageviews",
  sessions: "sessions",
  entries: "entries",
  exits: "exits",
  time_on_page: "time_on_page_seconds",
  bounce_rate: "bounce_rate",
} as const;

export type PagesSort = keyof typeof SORT_COLUMNS;

// The section list is only used whole (the "only section losing traffic" check
// needs every section), so it is capped rather than paginated.
export const MAX_SECTIONS = 500;
export const MAX_TREND_KEYS = 50;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform(value => value || undefined);

export const pagesQuerySchema = z
  .object({
    group: z.enum(["page", "section"]).default("page"),
    section: optionalText(2048),
    mode: z.enum(["all", "entry", "exit"]).default("all"),
    sort: z.enum(Object.keys(SORT_COLUMNS) as [PagesSort, ...PagesSort[]]).default("pageviews"),
    order: z.enum(["asc", "desc"]).default("desc"),
    search: optionalText(200),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
  })
  // A section row is a rollup of all its pages, so it cannot be narrowed by a
  // search or nested in another section.
  .refine(query => query.group === "page" || (!query.section && !query.search), {
    message: "section and search only apply to page rows",
  });

export type PagesQuery = z.infer<typeof pagesQuerySchema>;

const keyListSchema = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (!raw) return [];
    try {
      return z.array(z.string().max(2048)).max(MAX_TREND_KEYS).parse(JSON.parse(raw));
    } catch {
      ctx.addIssue({ code: "custom", message: `Expected a JSON array of at most ${MAX_TREND_KEYS} strings` });
      return z.NEVER;
    }
  });

export const trendsQuerySchema = z
  .object({
    bucket: z.enum(Object.keys(TimeBucketToFn) as [TimeBucket, ...TimeBucket[]]).default("day"),
    paths: keyListSchema,
    sections: keyListSchema,
  })
  .refine(query => query.paths.length + query.sections.length > 0, { message: "Pass paths or sections" })
  .refine(query => query.paths.length + query.sections.length <= MAX_TREND_KEYS, {
    message: `At most ${MAX_TREND_KEYS} paths and sections in total`,
  });

export type TrendsQuery = z.infer<typeof trendsQuerySchema>;

type WindowParams = TimeWindowParams & Pick<FilterParams, "filters">;

/** The filtered-sessions CTE and the join that applies it, built the way every session-scoped report builds them. */
function sessionScope(params: WindowParams, siteId: number) {
  const timeStatement = resolveTimeWindow(params).where();
  const filteredSessionsCTE = buildFilteredSessionsCTE(params.filters, siteId, timeStatement);
  return {
    timeStatement,
    filteredSessionsCTE,
    sessionJoin: filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "",
  };
}

const withClause = (...ctes: (string | null | undefined)[]) => {
  const present = ctes.filter(Boolean);
  return present.length ? `WITH ${present.join(",\n")}` : "";
};

/**
 * One row per pageview with the session's previous and next pageview beside
 * it. `restrictTo` keeps only sessions that viewed a matching page, which keeps
 * the window small for a single section without cutting any session short.
 */
function pageViewsCTE(siteId: number, scope: ReturnType<typeof sessionScope>, restrictTo?: string) {
  const restriction = restrictTo
    ? `AND session_id IN (
          SELECT session_id
          FROM events
          WHERE site_id = {siteId:Int32}
            AND type = 'pageview'
            ${scope.timeStatement}
            AND ${restrictTo}
        )`
    : "";

  return `PageViews AS (
      SELECT
        session_id,
        pathname,
        page_title,
        timestamp_ms,
        lagInFrame(toNullable(timestamp_ms)) OVER (
          PARTITION BY session_id ORDER BY timestamp_ms ROWS BETWEEN 1 PRECEDING AND CURRENT ROW
        ) AS previous_view,
        leadInFrame(toNullable(timestamp_ms)) OVER (
          PARTITION BY session_id ORDER BY timestamp_ms ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING
        ) AS next_view
      FROM events
      ${scope.sessionJoin}
      WHERE site_id = {siteId:Int32}
        AND type = 'pageview'
        ${scope.timeStatement}
        ${restriction}
    )`;
}

export interface PageRow {
  /** "section" rows roll up two or more pages; a section with one page is listed as that page. */
  kind: "page" | "section";
  /** The path for a page row, the section for a section row. */
  key: string;
  /** The page's most recent non-empty title; empty for sections and untitled pages. */
  title: string;
  section: string;
  pages: number;
  pageviews: number;
  sessions: number;
  entries: number;
  exits: number;
  bounced_entries: number;
  /** Average seconds to the next pageview, over views that were not the session's last. */
  time_on_page_seconds: number | null;
  /** Share of the sessions that entered here and viewed nothing else, 0–100. */
  bounce_rate: number | null;
}

export const buildPagesQuery = (params: WindowParams, query: PagesQuery, siteId: number): QuerySpec => {
  const scope = sessionScope(params, siteId);
  const sectionFilter = query.section ? `${sectionOf("pathname")} = {section:String}` : undefined;
  const pageHaving = [
    query.group === "page" && query.mode === "entry" ? "entry_views > 0" : "",
    query.group === "page" && query.mode === "exit" ? "exit_views > 0" : "",
    query.search
      ? "(positionCaseInsensitiveUTF8(pathname, {search:String}) > 0 OR positionCaseInsensitiveUTF8(title, {search:String}) > 0)"
      : "",
  ].filter(Boolean);
  const sectionHaving = query.mode === "entry" ? "HAVING entries > 0" : query.mode === "exit" ? "HAVING exits > 0" : "";

  const pageStats = `PageStats AS (
      SELECT
        pathname,
        ${sectionOf("pathname")} AS section,
        argMaxIf(page_title, timestamp_ms, page_title != '') AS title,
        count() AS page_views,
        uniqExactState(session_id) AS session_state,
        countIf(previous_view IS NULL) AS entry_views,
        countIf(next_view IS NULL) AS exit_views,
        countIf(previous_view IS NULL AND next_view IS NULL) AS bounced_views,
        sumIf(${timeOnPage}, next_view IS NOT NULL) AS timed_seconds,
        countIf(next_view IS NOT NULL) AS timed_views
      FROM PageViews
      ${sectionFilter ? `WHERE ${sectionFilter}` : ""}
      GROUP BY pathname
      ${pageHaving.length ? `HAVING ${pageHaving.join(" AND ")}` : ""}
    )`;

  const rows =
    query.group === "section"
      ? `SELECT
          if(count() = 1, 'page', 'section') AS kind,
          if(count() = 1, any(pathname), section) AS key,
          if(count() = 1, any(title), '') AS title,
          section,
          count() AS pages,
          sum(page_views) AS pageviews,
          uniqExactMerge(session_state) AS sessions,
          sum(entry_views) AS entries,
          sum(exit_views) AS exits,
          sum(bounced_views) AS bounced_entries,
          sum(timed_seconds) / nullIf(sum(timed_views), 0) AS time_on_page_seconds,
          sum(bounced_views) * 100 / nullIf(sum(entry_views), 0) AS bounce_rate,
          count() OVER () AS total_count
        FROM PageStats
        GROUP BY section
        ${sectionHaving}`
      : `SELECT
          'page' AS kind,
          pathname AS key,
          title,
          section,
          1 AS pages,
          page_views AS pageviews,
          finalizeAggregation(session_state) AS sessions,
          entry_views AS entries,
          exit_views AS exits,
          bounced_views AS bounced_entries,
          timed_seconds / nullIf(timed_views, 0) AS time_on_page_seconds,
          bounced_views * 100 / nullIf(entry_views, 0) AS bounce_rate,
          count() OVER () AS total_count
        FROM PageStats`;

  const offset = (query.page - 1) * query.limit;

  return {
    query: `
      ${withClause(scope.filteredSessionsCTE, pageViewsCTE(siteId, scope, sectionFilter), pageStats)}
      ${rows}
      ORDER BY ${SORT_COLUMNS[query.sort]} ${query.order === "asc" ? "ASC" : "DESC"} NULLS LAST, ${
        // Ties break the way the section list does, so a section's place there is its place here.
        query.group === "section" ? "section" : "key"
      } ASC
      LIMIT ${query.limit}${offset > 0 ? ` OFFSET ${offset}` : ""}
    `,
    params: {
      siteId,
      ...(query.section ? { section: query.section } : {}),
      ...(query.search ? { search: query.search } : {}),
    },
  };
};

export interface PagesSummary {
  pageviews: number;
  /** Sessions with at least one pageview; each of them has exactly one entry page. */
  sessions: number;
  /** Distinct paths viewed. */
  pages: number;
  bounced_sessions: number;
  bounce_rate: number | null;
  time_on_page_seconds: number | null;
  views_per_session: number | null;
}

export const buildPagesSummaryQuery = (params: WindowParams, siteId: number): QuerySpec => {
  const scope = sessionScope(params, siteId);
  return {
    query: `
      ${withClause(scope.filteredSessionsCTE, pageViewsCTE(siteId, scope))}
      SELECT
        count() AS pageviews,
        uniqExact(session_id) AS sessions,
        uniqExact(pathname) AS pages,
        countIf(previous_view IS NULL AND next_view IS NULL) AS bounced_sessions,
        bounced_sessions * 100 / nullIf(sessions, 0) AS bounce_rate,
        sumIf(${timeOnPage}, next_view IS NOT NULL) / nullIf(countIf(next_view IS NOT NULL), 0) AS time_on_page_seconds,
        pageviews / nullIf(sessions, 0) AS views_per_session
      FROM PageViews
    `,
    params: { siteId },
  };
};

export interface SectionViews {
  section: string;
  pageviews: number;
  pages: number;
}

/** Views and page count per section, largest first, for the whole period. */
export const buildSectionViewsQuery = (params: WindowParams, siteId: number): QuerySpec => {
  const scope = sessionScope(params, siteId);
  return {
    query: `
      ${withClause(
        scope.filteredSessionsCTE,
        `Sections AS (
          SELECT
            ${sectionOf("pathname")} AS section,
            count() AS pageviews,
            uniqExact(pathname) AS pages
          FROM events
          ${scope.sessionJoin}
          WHERE site_id = {siteId:Int32}
            AND type = 'pageview'
            ${scope.timeStatement}
          GROUP BY section
        )`
      )}
      SELECT section, pageviews, pages, count() OVER () AS total_count
      FROM Sections
      ORDER BY pageviews DESC, section ASC
      LIMIT ${MAX_SECTIONS}
    `,
    params: { siteId },
  };
};

export interface PageTrend {
  kind: "page" | "section";
  key: string;
  /** Total views in the period, the sum of `series`. */
  pageviews: number;
  series: { time: string; pageviews: number }[];
}

/**
 * Views per bucket for a batch of paths and sections in one pass. A view counts
 * toward its path and toward its section when both were asked for. Each key's
 * series is zero-filled across the window (ClickHouse fills per value of the
 * sorting prefix, here the key); a key with no views in the window is absent.
 */
export const buildPageTrendsQuery = (
  params: WindowParams,
  { bucket, paths, sections }: TrendsQuery,
  siteId: number
): QuerySpec => {
  const window = resolveTimeWindow(params);
  const scope = sessionScope(params, siteId);
  const section = sectionOf("pathname");

  return {
    query: `
      ${withClause(scope.filteredSessionsCTE)}
      SELECT key, time, pageviews
      FROM (
        SELECT
          arrayJoin(
            arrayConcat(
              if(has({paths:Array(String)}, pathname), [concat('page:', pathname)], []),
              if(has({sections:Array(String)}, ${section}), [concat('section:', ${section})], [])
            )
          ) AS key,
          ${window.bucketed("timestamp", bucket)} AS time,
          count() AS pageviews
        FROM events
        ${scope.sessionJoin}
        WHERE site_id = {siteId:Int32}
          AND type = 'pageview'
          ${scope.timeStatement}
          AND (pathname IN {paths:Array(String)} OR ${section} IN {sections:Array(String)})
        GROUP BY key, time
      )
      ORDER BY key, time ${window.fill(bucket)}
    `,
    params: { siteId, paths, sections },
  };
};

/** Groups trend rows by key. Rows must arrive ordered by key, then time. */
export function groupTrendRows(rows: { key: string; time: string; pageviews: number }[]): PageTrend[] {
  const trends = new Map<string, PageTrend>();
  for (const row of rows) {
    const rawKey = String(row.key);
    const separator = rawKey.indexOf(":");
    let trend = trends.get(rawKey);
    if (!trend) {
      trend = {
        kind: rawKey.slice(0, separator) === "section" ? "section" : "page",
        key: rawKey.slice(separator + 1),
        pageviews: 0,
        series: [],
      };
      trends.set(rawKey, trend);
    }
    const pageviews = Number(row.pageviews) || 0;
    trend.pageviews += pageviews;
    trend.series.push({ time: String(row.time), pageviews });
  }
  return [...trends.values()];
}

// processResults turns numeric-looking strings into numbers, so a page titled
// "404" or a path section "2024" would come back as a number.
const asText = (value: unknown) => (value === null || value === undefined ? "" : String(value));

type PagesRequest<Q> = { Params: { siteId: string }; Querystring: FilterParams<Q> };

export const getPages = analyticsRoute<PagesRequest<Record<string, string | undefined>>>(
  "pages",
  async (req: FastifyRequest<PagesRequest<Record<string, string | undefined>>>, res: FastifyReply) => {
    const parsed = pagesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).send({ error: parsed.error.issues.map(issue => issue.message).join("; ") });
    }

    const siteId = Number(req.params.siteId);
    const rows = await runAnalyticsQuery<PageRow & { total_count: number }>(
      buildPagesQuery(req.query, parsed.data, siteId)
    );

    // The total rides on the rows, so a page past the end has none to carry it.
    let totalCount = rows[0]?.total_count ?? 0;
    if (rows.length === 0 && parsed.data.page > 1) {
      const [first] = await runAnalyticsQuery<{ total_count: number }>(
        buildPagesQuery(req.query, { ...parsed.data, page: 1, limit: 1 }, siteId)
      );
      totalCount = first?.total_count ?? 0;
    }

    return res.send({
      data: {
        data: rows.map(({ total_count: _, ...row }) => ({
          ...row,
          key: asText(row.key),
          title: asText(row.title),
          section: asText(row.section),
        })),
        totalCount,
      },
    });
  }
);

export const getPagesSummary = analyticsRoute<PagesRequest<object>>(
  "pages summary",
  async (req: FastifyRequest<PagesRequest<object>>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);
    const [totals, sections] = await Promise.all([
      runAnalyticsQuery<PagesSummary>(buildPagesSummaryQuery(req.query, siteId)),
      runAnalyticsQuery<SectionViews & { total_count: number }>(buildSectionViewsQuery(req.query, siteId)),
    ]);

    return res.send({
      data: {
        ...totals[0],
        sections: sections.map(({ total_count: _, ...row }) => ({ ...row, section: asText(row.section) })),
        sectionCount: sections[0]?.total_count ?? 0,
      },
    });
  }
);

export const getPageTrends = analyticsRoute<PagesRequest<Record<string, string | undefined>>>(
  "page trends",
  async (req: FastifyRequest<PagesRequest<Record<string, string | undefined>>>, res: FastifyReply) => {
    const parsed = trendsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).send({ error: parsed.error.issues.map(issue => issue.message).join("; ") });
    }

    const siteId = Number(req.params.siteId);
    const rows = await runAnalyticsQuery<{ key: string; time: string; pageviews: number }>(
      buildPageTrendsQuery(req.query, parsed.data, siteId)
    );

    return res.send({ data: groupTrendRows(rows) });
  }
);
