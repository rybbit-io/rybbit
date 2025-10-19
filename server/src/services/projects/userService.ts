import { SQL, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { projectEvents } from "../../db/postgres/schema.js";
import { combineConditions, buildDateRangeFilters } from "../../api/v1/utils/index.js";

export interface ListUsersParams {
  limit: number;
  offset: number;
  from?: string;
  to?: string;
}

export interface ProjectUserRow {
  visitorId: string;
  visits: number;
  sessions: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

const visitorExpr = sql<string>`COALESCE(${projectEvents.userHash}, ${projectEvents.sessionHash}, ${projectEvents.id})`.as(
  "visitor_id"
);

export async function listUsers(projectId: string, params: ListUsersParams): Promise<ProjectUserRow[]> {
  const filters = buildFilters(projectId, params.from, params.to);

  const rows = await db
    .select({
      visitorId: visitorExpr,
      visits: sql<number>`COUNT(*)`,
      sessions: sql<number>`COUNT(DISTINCT ${projectEvents.sessionHash})`,
      firstSeen: sql<string | null>`MIN(${projectEvents.occurredAt})`,
      lastSeen: sql<string | null>`MAX(${projectEvents.occurredAt})`,
    })
    .from(projectEvents)
    .where(filters)
    .groupBy(visitorExpr)
    .orderBy(desc(sql`MAX(${projectEvents.occurredAt})`))
    .limit(params.limit)
    .offset(params.offset);

  return rows.map(row => ({
    visitorId: row.visitorId,
    visits: Number(row.visits ?? 0),
    sessions: Number(row.sessions ?? 0),
    firstSeen: row.firstSeen ? new Date(row.firstSeen).toISOString() : null,
    lastSeen: row.lastSeen ? new Date(row.lastSeen).toISOString() : null,
  }));
}

export async function countUsers(projectId: string, params: EventRangeParams): Promise<number> {
  const filters = buildFilters(projectId, params.from, params.to);

  const [row] = await db
    .select({
      total: sql<number>`COUNT(DISTINCT COALESCE(${projectEvents.userHash}, ${projectEvents.sessionHash}, ${projectEvents.id}))`,
    })
    .from(projectEvents)
    .where(filters);

  return Number(row?.total ?? 0);
}

interface EventRangeParams {
  from?: string;
  to?: string;
}

function buildFilters(projectId: string, from?: string, to?: string): SQL<unknown> {
  const conditions: SQL<unknown>[] = [
    eq(projectEvents.projectId, projectId),
    ...buildDateRangeFilters(projectEvents.occurredAt, from, to),
  ];

  const combined = combineConditions(conditions);

  if (!combined) {
    throw new Error("Failed to build filters for visitor query");
  }

  return combined;
}
