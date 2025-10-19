import { SQL, and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import {
  pageAggDaily,
  projectEvents,
  projectOverviewDaily,
  projectPageVisitorsDaily,
  projectVisitorsDaily,
} from "../../db/postgres/schema.js";
import { getCachedValue, setCachedValue } from "./statsCache.js";
import {
  combineConditions,
  buildDateRangeFilters,
  normalizeDateToYYYYMMDD,
} from "../../api/v1/utils/index.js";

type Granularity = "daily" | "monthly" | "yearly";

export interface OverviewParams {
  granularity: Granularity;
  from?: string;
  to?: string;
}

export interface OverviewPoint {
  period: string;
  visits: number;
  uniqueVisitors: number;
}

export async function getOverviewStats(projectId: string, params: OverviewParams): Promise<OverviewPoint[]> {
  const fromDate = normalizeDateToYYYYMMDD(params.from);
  const toDate = normalizeDateToYYYYMMDD(params.to);

  const cacheKey = JSON.stringify({ granularity: params.granularity, from: fromDate, to: toDate });
  const cached = getCachedValue<OverviewPoint[]>("overview", projectId, cacheKey);
  if (cached) {
    return cached;
  }

  const overviewConditions: SQL<unknown>[] = [
    eq(projectOverviewDaily.projectId, projectId),
    ...buildDateRangeFilters(projectOverviewDaily.eventDate, fromDate, toDate),
  ];

  const overviewCondition = combineConditions(overviewConditions)!;

  const dailyRows = await db
    .select({
      eventDate: projectOverviewDaily.eventDate,
      visits: projectOverviewDaily.visits,
      uniqueVisitors: projectOverviewDaily.uniqueVisitors,
    })
    .from(projectOverviewDaily)
    .where(overviewCondition)
    .orderBy(projectOverviewDaily.eventDate);

  const visitsByPeriod = new Map<string, number>();
  const uniqueByPeriod = new Map<string, number>();

  for (const row of dailyRows) {
    const periodKey = toPeriodStartKey(row.eventDate, params.granularity);
    const visits = Number(row.visits ?? 0);
    const uniqueVisitors = Number(row.uniqueVisitors ?? 0);

    visitsByPeriod.set(periodKey, (visitsByPeriod.get(periodKey) ?? 0) + visits);

    if (params.granularity === "daily") {
      uniqueByPeriod.set(periodKey, uniqueVisitors);
    }
  }

  if (params.granularity !== "daily") {
    const visitorConditions: SQL<unknown>[] = [
      eq(projectVisitorsDaily.projectId, projectId),
      ...buildDateRangeFilters(projectVisitorsDaily.eventDate, fromDate, toDate),
    ];

    const periodExpr =
      params.granularity === "monthly"
        ? sql`date_trunc('month', ${projectVisitorsDaily.eventDate}::timestamp)`
        : sql`date_trunc('year', ${projectVisitorsDaily.eventDate}::timestamp)`;

    const visitorCondition = combineConditions(visitorConditions)!;

    const visitorRows = await db
      .select({
        period: periodExpr,
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${projectVisitorsDaily.visitorHash})`,
      })
      .from(projectVisitorsDaily)
      .where(visitorCondition)
      .groupBy(periodExpr)
      .orderBy(periodExpr);

    for (const row of visitorRows) {
      const periodKey = normalizePeriodValue(row.period);
      uniqueByPeriod.set(periodKey, Number(row.uniqueVisitors ?? 0));
    }
  }

  const periods = Array.from(new Set([...visitsByPeriod.keys(), ...uniqueByPeriod.keys()])).sort();

  const result = periods.map(periodKey => ({
    period: periodKey,
    visits: visitsByPeriod.get(periodKey) ?? 0,
    uniqueVisitors: uniqueByPeriod.get(periodKey) ?? 0,
  }));

  setCachedValue("overview", projectId, cacheKey, result);
  return result;
}

export interface PageStatsParams {
  path?: string;
  pageUrl?: string;
  from?: string;
  to?: string;
}

export interface PageStats {
  path: string | null;
  pageUrl: string | null;
  visits: number;
  uniqueVisitors: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

export async function getPageStats(projectId: string, params: PageStatsParams): Promise<PageStats[]> {
  const fromDate = normalizeDateToYYYYMMDD(params.from);
  const toDate = normalizeDateToYYYYMMDD(params.to);

  const cacheKey = JSON.stringify({
    path: params.path ?? null,
    pageUrl: params.pageUrl ?? null,
    from: fromDate,
    to: toDate,
  });

  const cached = getCachedValue<PageStats[]>("pages", projectId, cacheKey);
  if (cached) {
    return cached;
  }

  const pageConditions: SQL<unknown>[] = [
    eq(pageAggDaily.projectId, projectId),
    ...buildDateRangeFilters(pageAggDaily.eventDate, fromDate, toDate),
  ];
  if (params.path) {
    pageConditions.push(eq(pageAggDaily.pagePath, params.path));
  }
  if (params.pageUrl) {
    pageConditions.push(eq(pageAggDaily.pageUrl, params.pageUrl));
  }

  const pageCondition = combineConditions(pageConditions)!;

  const pageRows = await db
    .select({
      pagePath: pageAggDaily.pagePath,
      pageUrl: pageAggDaily.pageUrl,
      visits: sql<number>`SUM(${pageAggDaily.visits})`,
      firstSeenAt: sql<string | null>`MIN(${pageAggDaily.firstSeenAt})`,
      lastSeenAt: sql<string | null>`MAX(${pageAggDaily.lastSeenAt})`,
    })
    .from(pageAggDaily)
    .where(pageCondition)
    .groupBy(pageAggDaily.pagePath, pageAggDaily.pageUrl)
    .orderBy(desc(sql`SUM(${pageAggDaily.visits})`))
    .limit(50);

  if (!pageRows.length) {
    setCachedValue("pages", projectId, cacheKey, []);
    return [];
  }

  const visitorConditions: SQL<unknown>[] = [
    eq(projectPageVisitorsDaily.projectId, projectId),
    ...buildDateRangeFilters(projectPageVisitorsDaily.eventDate, fromDate, toDate),
  ];
  if (params.path) {
    visitorConditions.push(eq(projectPageVisitorsDaily.pagePath, params.path));
  }
  if (params.pageUrl) {
    visitorConditions.push(eq(projectPageVisitorsDaily.pageUrl, params.pageUrl));
  }
  if (!params.path && !params.pageUrl) {
    const scopedFilters = pageRows
      .map(row => {
        const pathCondition =
          row.pagePath === null
            ? isNull(projectPageVisitorsDaily.pagePath)
            : eq(projectPageVisitorsDaily.pagePath, row.pagePath);
        const urlCondition =
          row.pageUrl === null
            ? isNull(projectPageVisitorsDaily.pageUrl)
            : eq(projectPageVisitorsDaily.pageUrl, row.pageUrl);
        return and(pathCondition, urlCondition);
      })
      .filter((condition): condition is SQL<unknown> => Boolean(condition));

    if (scopedFilters.length === 1) {
      visitorConditions.push(scopedFilters[0]);
    } else if (scopedFilters.length > 1) {
      const combined = or(...scopedFilters);
      if (combined) {
        visitorConditions.push(combined);
      }
    }
  }

  const visitorWhere = combineConditions(visitorConditions)!;

  const visitorRows = await db
    .select({
      pagePath: projectPageVisitorsDaily.pagePath,
      pageUrl: projectPageVisitorsDaily.pageUrl,
      uniqueVisitors: sql<number>`COUNT(DISTINCT ${projectPageVisitorsDaily.visitorHash})`,
    })
    .from(projectPageVisitorsDaily)
    .where(visitorWhere)
    .groupBy(projectPageVisitorsDaily.pagePath, projectPageVisitorsDaily.pageUrl);

  const uniqueMap = new Map<string, number>();
  for (const row of visitorRows) {
    uniqueMap.set(buildPageKey(row.pagePath, row.pageUrl), Number(row.uniqueVisitors ?? 0));
  }

  const result = pageRows.map(row => {
    const key = buildPageKey(row.pagePath, row.pageUrl);
    const firstSeen = row.firstSeenAt ? new Date(row.firstSeenAt).toISOString() : null;
    const lastSeen = row.lastSeenAt ? new Date(row.lastSeenAt).toISOString() : null;

    return {
      path: row.pagePath ?? null,
      pageUrl: row.pageUrl ?? null,
      visits: Number(row.visits ?? 0),
      uniqueVisitors: uniqueMap.get(key) ?? 0,
      firstSeen,
      lastSeen,
    };
  });

  setCachedValue("pages", projectId, cacheKey, result);
  return result;
}

export interface RealtimeStats {
  activeVisitors: number;
  activeSessions: number;
  topPages: Array<{ path: string | null; pageUrl: string | null; visits: number }>;
  updatedAt: string;
}

export async function getRealtimeStats(projectId: string, lookbackSeconds = 300): Promise<RealtimeStats> {
  const since = new Date(Date.now() - lookbackSeconds * 1000).toISOString();

  const filters = [eq(projectEvents.projectId, projectId), sql`${projectEvents.occurredAt} >= ${since}`];

  const [summary] = await db
    .select({
      activeVisitors: sql<number>`COUNT(DISTINCT COALESCE(${projectEvents.sessionHash}, ${projectEvents.userHash}, ${projectEvents.id}))`,
      activeSessions: sql<number>`COUNT(DISTINCT ${projectEvents.sessionHash})`,
    })
    .from(projectEvents)
    .where(and(...filters));

  const topPages = await db
    .select({
      path: projectEvents.path,
      pageUrl: projectEvents.pageUrl,
      visits: sql<number>`COUNT(*)`,
    })
    .from(projectEvents)
    .where(and(...filters))
    .groupBy(projectEvents.path, projectEvents.pageUrl)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);

  return {
    activeVisitors: Number(summary?.activeVisitors ?? 0),
    activeSessions: Number(summary?.activeSessions ?? 0),
    topPages: topPages.map(row => ({
      path: row.path ?? null,
      pageUrl: row.pageUrl ?? null,
      visits: Number(row.visits ?? 0),
    })),
    updatedAt: new Date().toISOString(),
  };
}

// Moved to utils/dates.ts

function toPeriodStartKey(dateValue: string, granularity: Granularity): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return new Date(dateValue).toISOString();
  }

  if (granularity === "daily") {
    return date.toISOString();
  }

  if (granularity === "monthly") {
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
  }

  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function normalizePeriodValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  throw new Error("Unexpected period value from aggregation query");
}

// Moved to utils/filters.ts

function buildPageKey(path: string | null, pageUrl: string | null): string {
  return `${path ?? "__null__"}|${pageUrl ?? "__null__"}`;
}
