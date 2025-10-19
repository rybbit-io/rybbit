// @ts-nocheck
import { clickhouse } from "../db/clickhouse/clickhouse.js";
import { db } from "../db/postgres/postgres.js";
import {
  pageAggDaily,
  projectOverviewDaily,
  projectPageVisitorsDaily,
  projectVisitorsDaily,
  projects,
} from "../db/postgres/schema.js";
import { and, eq, gte, inArray, lte } from "drizzle-orm";

type DailyAggregate = {
  eventDate: string;
  visits: number;
  uniqueVisitors: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
};

type PageAggregate = {
  eventDate: string;
  pagePath: string | null;
  hostname: string | null;
  visits: number;
  uniqueVisitors: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
};

type VisitorAggregate = {
  eventDate: string;
  visitorHash: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
};

type PageVisitorAggregate = {
  eventDate: string;
  pagePath: string | null;
  hostname: string | null;
  visitorHash: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
};

type RawDailyAggregateRow = {
  event_date: string;
  visits: string | number;
  unique_visitors: string | number;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

type RawPageAggregateRow = {
  event_date: string;
  pathname: string | null;
  hostname: string | null;
  visits: string | number;
  unique_visitors: string | number;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

type RawVisitorRow = {
  event_date: string;
  visitor_key: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

type RawPageVisitorRow = RawVisitorRow & {
  pathname: string | null;
  hostname: string | null;
};

const VISITOR_KEY_EXPR = `
  if(user_id != '',
     user_id,
     if(session_id != '',
        concat('sess:', session_id),
        concat('evt:', toString(cityHash64(concat(toString(toUnixTimestamp(timestamp)), ':', hostname, ':', pathname)))))
  )
`;

async function main() {
  const [, , targetProjectId, fromArg, toArg] = process.argv;
  const projectIds =
    targetProjectId && targetProjectId !== "all"
      ? await resolveProjectIds([targetProjectId])
      : await resolveProjectIds();

  if (!projectIds.length) {
    console.log("No projects found for backfill");
    return;
  }

  for (const projectId of projectIds) {
    const siteId = Number(projectId);
    if (!Number.isFinite(siteId)) {
      console.warn(`Skipping project ${projectId}: unable to derive numeric site_id for ClickHouse`);
      continue;
    }

    const range = await fetchRange(siteId, fromArg, toArg);
    if (!range) {
      console.log(`Skipping ${projectId}: no events found in ClickHouse`);
      continue;
    }

    console.log(`Backfilling aggregates for ${projectId} (${range.from} → ${range.toInclusive})`);

    const results = await Promise.all([
      fetchDailyAggregates(siteId, range.from, range.toExclusive),
      fetchPageAggregates(siteId, range.from, range.toExclusive),
      fetchVisitorAggregates(siteId, range.from, range.toExclusive),
      fetchPageVisitors(siteId, range.from, range.toExclusive),
    ]);
    const [dailyRows, pageRows, visitorRows, pageVisitorRows] = results as [
      DailyAggregate[],
      PageAggregate[],
      VisitorAggregate[],
      PageVisitorAggregate[]
    ];

    if (!dailyRows.length) {
      console.log(`No aggregated data returned for ${projectId}, skipping`);
      continue;
    }

    const [minDate, maxDate] = getDateBounds(dailyRows.map(row => row.eventDate));

    await db.transaction(async trx => {
      await trx.delete(projectOverviewDaily).where(
        and(
          eq(projectOverviewDaily.projectId, projectId),
          gte(projectOverviewDaily.eventDate, minDate),
          lte(projectOverviewDaily.eventDate, maxDate)
        )
      );

      await trx.insert(projectOverviewDaily).values(
        dailyRows.map(row => ({
          projectId,
          eventDate: row.eventDate,
          visits: row.visits,
          uniqueVisitors: row.uniqueVisitors,
          firstSeenAt: row.firstSeenAt,
          lastSeenAt: row.lastSeenAt,
        }))
      );

      await trx.delete(pageAggDaily).where(
        and(eq(pageAggDaily.projectId, projectId), gte(pageAggDaily.eventDate, minDate), lte(pageAggDaily.eventDate, maxDate))
      );

      if (pageRows.length) {
        await batchInsert(trx, pageAggDaily, pageRows.map(row => ({
          projectId,
          eventDate: row.eventDate,
          pagePath: row.pagePath,
          pageUrl: row.hostname && row.hostname.length ? buildPageUrl(row.hostname, row.pagePath) : null,
          visits: row.visits,
          uniqueVisitors: row.uniqueVisitors,
          conversions: 0,
          firstSeenAt: row.firstSeenAt,
          lastSeenAt: row.lastSeenAt,
        })));
      }

      await trx.delete(projectVisitorsDaily).where(
        and(
          eq(projectVisitorsDaily.projectId, projectId),
          gte(projectVisitorsDaily.eventDate, minDate),
          lte(projectVisitorsDaily.eventDate, maxDate)
        )
      );

      if (visitorRows.length) {
        await batchInsert(trx, projectVisitorsDaily, visitorRows.map(row => ({
          projectId,
          eventDate: row.eventDate,
          visitorHash: row.visitorHash,
          firstSeenAt: row.firstSeenAt,
          lastSeenAt: row.lastSeenAt,
        })));
      }

      await trx.delete(projectPageVisitorsDaily).where(
        and(
          eq(projectPageVisitorsDaily.projectId, projectId),
          gte(projectPageVisitorsDaily.eventDate, minDate),
          lte(projectPageVisitorsDaily.eventDate, maxDate)
        )
      );

      if (pageVisitorRows.length) {
        await batchInsert(trx, projectPageVisitorsDaily, pageVisitorRows.map(row => ({
          projectId,
          eventDate: row.eventDate,
          pagePath: row.pagePath,
          pageUrl: row.hostname && row.hostname.length ? buildPageUrl(row.hostname, row.pagePath) : null,
          visitorHash: row.visitorHash,
          firstSeenAt: row.firstSeenAt,
          lastSeenAt: row.lastSeenAt,
        })));
      }
    });
  }

  console.log("Backfill complete");
}

async function resolveProjectIds(filterIds?: string[]): Promise<string[]> {
  if (filterIds?.length) {
    const rows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(inArray(projects.id, filterIds));
    return rows.map(row => row.id);
  }

  const rows = await db.select({ id: projects.id }).from(projects);
  return rows.map(row => row.id);
}

async function fetchRange(siteId: number, fromArg?: string, toArg?: string) {
  if (fromArg && toArg) {
    const from = normalizeDate(fromArg);
    const toInclusive = normalizeDate(toArg);
    if (!from || !toInclusive) {
      throw new Error(`Invalid date range provided: from=${fromArg}, to=${toArg}`);
    }
    const toExclusive = addDays(toInclusive, 1);
    return { from, toInclusive, toExclusive };
  }

  const result = await clickhouse.query({
    query: `
      SELECT
        min(timestamp) AS min_ts,
        max(timestamp) AS max_ts
      FROM events
      WHERE site_id = {siteId:UInt32}
    `,
    format: "JSONEachRow",
    query_params: { siteId },
  });

  const rows = await result.json<{ min_ts: string | null; max_ts: string | null }[]>();
  const [row] = rows ?? [];
  if (!row?.min_ts || !row?.max_ts) {
    return null;
  }

  const from = normalizeDate(row.min_ts);
  const toInclusive = normalizeDate(row.max_ts);
  if (!from || !toInclusive) {
    return null;
  }

  const toExclusive = addDays(toInclusive, 1);
  return { from, toInclusive, toExclusive };
}

async function fetchDailyAggregates(siteId: number, from: string, toExclusive: string): Promise<DailyAggregate[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        toDate(timestamp) AS event_date,
        count() AS visits,
        uniqExact(${VISITOR_KEY_EXPR}) AS unique_visitors,
        min(timestamp) AS first_seen_at,
        max(timestamp) AS last_seen_at
      FROM events
      WHERE
        site_id = {siteId:UInt32}
        AND timestamp >= parseDateTimeBestEffort({fromTs:String})
        AND timestamp < parseDateTimeBestEffort({toTs:String})
      GROUP BY event_date
      ORDER BY event_date
    `,
    format: "JSONEachRow",
    query_params: {
      siteId,
      fromTs: from,
      toTs: toExclusive,
    },
  });

  const rows = await result.json<RawDailyAggregateRow[]>();
  return rows.flatMap<DailyAggregate>(row => {
    if (!row || !row.event_date) {
      return [];
    }
    return [
      {
        eventDate: row.event_date,
        visits: Number(row.visits ?? 0),
        uniqueVisitors: Number(row.unique_visitors ?? 0),
        firstSeenAt: toIso(row.first_seen_at),
        lastSeenAt: toIso(row.last_seen_at),
      },
    ];
  });
}

async function fetchPageAggregates(siteId: number, from: string, toExclusive: string): Promise<PageAggregate[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        toDate(timestamp) AS event_date,
        nullIf(pathname, '') AS pathname,
        nullIf(hostname, '') AS hostname,
        count() AS visits,
        uniqExact(${VISITOR_KEY_EXPR}) AS unique_visitors,
        min(timestamp) AS first_seen_at,
        max(timestamp) AS last_seen_at
      FROM events
      WHERE
        site_id = {siteId:UInt32}
        AND timestamp >= parseDateTimeBestEffort({fromTs:String})
        AND timestamp < parseDateTimeBestEffort({toTs:String})
      GROUP BY event_date, pathname, hostname
      ORDER BY event_date, pathname, hostname
    `,
    format: "JSONEachRow",
    query_params: {
      siteId,
      fromTs: from,
      toTs: toExclusive,
    },
  });

  const rows = await result.json<RawPageAggregateRow[]>();
  return rows.flatMap<PageAggregate>(row => {
    if (!row || !row.event_date) {
      return [];
    }
    const pagePath = row.pathname && row.pathname.length ? row.pathname : null;
    const hostname = row.hostname && row.hostname.length ? row.hostname : null;
    return [
      {
        eventDate: row.event_date,
        pagePath,
        hostname,
        visits: Number(row.visits ?? 0),
        uniqueVisitors: Number(row.unique_visitors ?? 0),
        firstSeenAt: toIso(row.first_seen_at),
        lastSeenAt: toIso(row.last_seen_at),
      },
    ];
  });
}

async function fetchVisitorAggregates(siteId: number, from: string, toExclusive: string): Promise<VisitorAggregate[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        event_date,
        visitor_key,
        min(timestamp) AS first_seen_at,
        max(timestamp) AS last_seen_at
      FROM (
        SELECT
          toDate(timestamp) AS event_date,
          timestamp,
          ${VISITOR_KEY_EXPR} AS visitor_key
        FROM events
        WHERE
          site_id = {siteId:UInt32}
          AND timestamp >= parseDateTimeBestEffort({fromTs:String})
          AND timestamp < parseDateTimeBestEffort({toTs:String})
      )
      GROUP BY event_date, visitor_key
    `,
    format: "JSONEachRow",
    query_params: {
      siteId,
      fromTs: from,
      toTs: toExclusive,
    },
  });

  const rows = await result.json<RawVisitorRow[]>();
  return rows.flatMap<VisitorAggregate>(row => {
    if (!row || !row.event_date) {
      return [];
    }
    return [
      {
        eventDate: row.event_date,
        visitorHash: row.visitor_key,
        firstSeenAt: toIso(row.first_seen_at),
        lastSeenAt: toIso(row.last_seen_at),
      },
    ];
  });
}

async function fetchPageVisitors(siteId: number, from: string, toExclusive: string): Promise<PageVisitorAggregate[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        event_date,
        pathname,
        hostname,
        visitor_key,
        min(timestamp) AS first_seen_at,
        max(timestamp) AS last_seen_at
      FROM (
        SELECT
          toDate(timestamp) AS event_date,
          nullIf(pathname, '') AS pathname,
          nullIf(hostname, '') AS hostname,
          timestamp,
          ${VISITOR_KEY_EXPR} AS visitor_key
        FROM events
        WHERE
          site_id = {siteId:UInt32}
          AND timestamp >= parseDateTimeBestEffort({fromTs:String})
          AND timestamp < parseDateTimeBestEffort({toTs:String})
      )
      GROUP BY event_date, pathname, hostname, visitor_key
    `,
    format: "JSONEachRow",
    query_params: {
      siteId,
      fromTs: from,
      toTs: toExclusive,
    },
  });

  const rows = await result.json<RawPageVisitorRow[]>();
  return rows.flatMap<PageVisitorAggregate>(row => {
    if (!row || !row.event_date) {
      return [];
    }
    const pagePath = row.pathname && row.pathname.length ? row.pathname : null;
    const hostname = row.hostname && row.hostname.length ? row.hostname : null;
    return [
      {
        eventDate: row.event_date,
        pagePath,
        hostname,
        visitorHash: row.visitor_key,
        firstSeenAt: toIso(row.first_seen_at),
        lastSeenAt: toIso(row.last_seen_at),
      },
    ];
  });
}

function normalizeDate(value: string): string | null {
  const isoInput = value.endsWith("Z") ? value : `${value}Z`;
  const date = new Date(isoInput);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().replace(/T.*/, "T00:00:00.000Z");
}

function addDays(dateIso: string, days: number): string {
  const date = new Date(dateIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().replace(/T.*/, "T00:00:00.000Z");
}

function toIso(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const iso = value.endsWith("Z") ? value : `${value}Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildPageUrl(hostname: string | null | undefined, pathname: string | null | undefined): string | null {
  if (!hostname) {
    return null;
  }
  const path = pathname ?? "";
  const safePath = path.length === 0 ? "/" : path.startsWith("/") ? path : `/${path}`;
  return `https://${hostname}${safePath}`;
}

async function batchInsert<TTable, TValue extends Record<string, unknown>>(
  trx: any,
  table: TTable,
  values: TValue[],
  chunkSize = 1000
) {
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    await trx.insert(table).values(chunk);
  }
}

function getDateBounds(dates: string[]): [string, string] {
  let min = dates[0];
  let max = dates[0];
  for (let i = 1; i < dates.length; i += 1) {
    const current = dates[i];
    if (current < min) {
      min = current;
    }
    if (current > max) {
      max = current;
    }
  }
  return [min, max];
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

