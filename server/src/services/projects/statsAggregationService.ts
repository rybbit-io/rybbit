import { sql as sqlClient } from "../../db/postgres/postgres.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { invalidateProjectCache } from "./statsCache.js";

const logger = createServiceLogger("project-stats-aggregator");

const pendingAggregations = new Map<string, Set<string>>();
let flushScheduled = false;

export function scheduleProjectAggregation(projectId: string, occurredAtValues: string[]): void {
  if (!occurredAtValues.length) {
    return;
  }

  let dateSet = pendingAggregations.get(projectId);
  if (!dateSet) {
    dateSet = new Set<string>();
    pendingAggregations.set(projectId, dateSet);
  }

  for (const value of occurredAtValues) {
    const normalized = normalizeDate(value);
    if (normalized) {
      dateSet.add(normalized);
    }
  }

  if (!dateSet.size) {
    return;
  }

  if (!flushScheduled) {
    flushScheduled = true;
    setImmediate(() => {
      flushScheduled = false;
      flushQueue().catch(error => {
        logger.error(error, "Failed to flush stats aggregation queue");
      });
    });
  }
}

async function flushQueue(): Promise<void> {
  const entries = Array.from(pendingAggregations.entries());
  pendingAggregations.clear();

  for (const [projectId, dates] of entries) {
    if (!dates.size) {
      continue;
    }

    try {
      const sortedDates = Array.from(dates).sort();
      for (const date of sortedDates) {
        await recomputeDailyAggregates(projectId, date);
      }
      invalidateProjectCache(projectId);
    } catch (error) {
      logger.error({ projectId, error }, "Failed to recompute aggregates for project");
    }
  }
}

export async function rebuildProjectAggregates(projectId: string, from?: string, to?: string): Promise<void> {
  const params = [projectId];
  const clauses = [`project_id = $1`];

  if (from) {
    params.push(from);
    clauses.push(`occurred_at >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    clauses.push(`occurred_at <= $${params.length}`);
  }

  const query = `
    SELECT DISTINCT DATE(occurred_at) AS event_date
    FROM project_events
    WHERE ${clauses.join(" AND ")}
    ORDER BY event_date ASC
  `;

  const dates = (await sqlClient.unsafe(query, params)) as unknown as Array<{ event_date: Date | string }>;

  if (!dates.length) {
    return;
  }

  for (const row of dates) {
    const value = row.event_date instanceof Date ? row.event_date.toISOString() : `${row.event_date}T00:00:00.000Z`;
    const normalized = normalizeDate(value);
    if (normalized) {
      await recomputeDailyAggregates(projectId, normalized);
    }
  }

  invalidateProjectCache(projectId);
}

async function recomputeDailyAggregates(projectId: string, date: string): Promise<void> {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) {
    return;
  }
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  await sqlClient.begin(async trx => {
    await trx`
      DELETE FROM project_overview_daily
      WHERE project_id = ${projectId} AND event_date = ${date}::date;
    `;

    await trx`
      INSERT INTO project_overview_daily (
        project_id,
        event_date,
        visits,
        unique_visitors,
        first_seen_at,
        last_seen_at
      )
      SELECT
        ${projectId}::text AS project_id,
        DATE(occurred_at) AS event_date,
        COUNT(*) AS visits,
        COUNT(DISTINCT COALESCE(session_hash, user_hash, id)) AS unique_visitors,
        MIN(occurred_at) AS first_seen_at,
        MAX(occurred_at) AS last_seen_at
      FROM project_events
      WHERE project_id = ${projectId}
        AND occurred_at >= ${dayStart.toISOString()}
        AND occurred_at < ${dayEnd.toISOString()}
      GROUP BY DATE(occurred_at);
    `;

    await trx`
      DELETE FROM page_agg_daily
      WHERE project_id = ${projectId} AND event_date = ${date}::date;
    `;

    await trx`
      INSERT INTO page_agg_daily (
        project_id,
        page_path,
        page_url,
        event_date,
        visits,
        unique_visitors,
        conversions,
        first_seen_at,
        last_seen_at
      )
      SELECT
        ${projectId}::text AS project_id,
        path AS page_path,
        page_url,
        DATE(occurred_at) AS event_date,
        COUNT(*) AS visits,
        COUNT(DISTINCT COALESCE(session_hash, user_hash, id)) AS unique_visitors,
        0 AS conversions,
        MIN(occurred_at) AS first_seen_at,
        MAX(occurred_at) AS last_seen_at
      FROM project_events
      WHERE project_id = ${projectId}
        AND occurred_at >= ${dayStart.toISOString()}
        AND occurred_at < ${dayEnd.toISOString()}
      GROUP BY path, page_url, DATE(occurred_at);
    `;

    await trx`
      DELETE FROM project_visitors_daily
      WHERE project_id = ${projectId} AND event_date = ${date}::date;
    `;

    await trx`
      INSERT INTO project_visitors_daily (
        project_id,
        event_date,
        visitor_hash,
        first_seen_at,
        last_seen_at
      )
      SELECT
        ${projectId}::text AS project_id,
        DATE(occurred_at) AS event_date,
        COALESCE(session_hash, user_hash, id) AS visitor_hash,
        MIN(occurred_at) AS first_seen_at,
        MAX(occurred_at) AS last_seen_at
      FROM project_events
      WHERE project_id = ${projectId}
        AND occurred_at >= ${dayStart.toISOString()}
        AND occurred_at < ${dayEnd.toISOString()}
      GROUP BY DATE(occurred_at), visitor_hash;
    `;

    await trx`
      DELETE FROM project_page_visitors_daily
      WHERE project_id = ${projectId} AND event_date = ${date}::date;
    `;

    await trx`
      INSERT INTO project_page_visitors_daily (
        project_id,
        event_date,
        page_path,
        page_url,
        visitor_hash,
        first_seen_at,
        last_seen_at
      )
      SELECT
        ${projectId}::text AS project_id,
        DATE(occurred_at) AS event_date,
        path AS page_path,
        page_url,
        COALESCE(session_hash, user_hash, id) AS visitor_hash,
        MIN(occurred_at) AS first_seen_at,
        MAX(occurred_at) AS last_seen_at
      FROM project_events
      WHERE project_id = ${projectId}
        AND occurred_at >= ${dayStart.toISOString()}
        AND occurred_at < ${dayEnd.toISOString()}
      GROUP BY DATE(occurred_at), path, page_url, visitor_hash;
    `;
  });
}

function normalizeDate(input: string): string | null {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}
