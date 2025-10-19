import { SQL, and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { projectEvents, projectFunnelSteps, projectFunnels } from "../../db/postgres/schema.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { hashIdentifier, hashSecret, ProjectRecord } from "./projectService.js";
import { scheduleProjectAggregation } from "./statsAggregationService.js";

const logger = createServiceLogger("project-events");

export interface EventInput {
  timestamp: string;
  page_url?: string;
  path?: string;
  referrer?: string;
  session_id?: string;
  anon_id?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
  funnel_id?: string;
  step?: string;
  country?: string;
  city?: string;
  device?: string;
  idempotency_key?: string;
}

export interface EventIngestionResult {
  accepted: number;
  total: number;
  skipped: number;
  errors: Array<{ index: number; reason: string }>;
}

const MAX_BATCH = 500;

export interface ListEventsParams {
  limit: number;
  offset: number;
  from?: string;
  to?: string;
}

export interface ProjectEventRow {
  id: string;
  occurredAt: string;
  pageUrl: string | null;
  path: string | null;
  referrer: string | null;
  funnelId: string | null;
  stepKey: string | null;
  metadata: Record<string, unknown>;
}

export async function ingestEvents(
  project: ProjectRecord,
  payloads: EventInput[]
): Promise<EventIngestionResult> {
  if (payloads.length === 0) {
    return { accepted: 0, total: 0, skipped: 0, errors: [] };
  }

  if (payloads.length > MAX_BATCH) {
    throw new Error(`Payload exceeds maximum batch size of ${MAX_BATCH} events`);
  }

  const funnelIds = new Set<string>();
  const stepPairs: Array<{ funnelId: string; step: string }> = [];

  payloads.forEach(payload => {
    if (payload.funnel_id) {
      funnelIds.add(payload.funnel_id);
      if (payload.step) {
        stepPairs.push({ funnelId: payload.funnel_id, step: payload.step });
      }
    }
  });

  const validFunnels = await getValidFunnelIds(project.id, Array.from(funnelIds));
  const validSteps = await getValidFunnelSteps(
    project.id,
    stepPairs.map(({ funnelId }) => funnelId),
    stepPairs.map(({ step }) => step)
  );

  const nowIso = new Date().toISOString();

  const rows = payloads.map((payload, index) => {
    const occurredAt = new Date(payload.timestamp);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new Error(`Invalid timestamp at index ${index}`);
    }

    const funnelId = payload.funnel_id && validFunnels.has(payload.funnel_id) ? payload.funnel_id : null;
    const stepKey =
      funnelId && payload.step && validSteps.has(`${funnelId}:${payload.step}`) ? payload.step : null;

    const metadata = payload.metadata ?? {};
    return {
      projectId: project.id,
      occurredAt: occurredAt.toISOString(),
      sessionHash: hashIdentifier(payload.session_id),
      userHash: hashIdentifier(payload.user_id ?? payload.anon_id),
      pageUrl: payload.page_url,
      path: payload.path,
      referrer: payload.referrer,
      country: payload.country,
      city: payload.city,
      device: payload.device,
      funnelId,
      stepKey,
      metadata,
      idempotencyKey:
        payload.idempotency_key ??
        hashSecret(
          [
            payload.timestamp,
            payload.page_url,
            payload.path,
            payload.session_id ?? payload.anon_id ?? "",
            payload.funnel_id ?? "",
            payload.step ?? "",
          ].join("|")
        ),
      createdAt: nowIso,
    };
  });

  try {
    const inserted = await db
      .insert(projectEvents)
      .values(rows)
      .onConflictDoNothing({
        target: [projectEvents.projectId, projectEvents.idempotencyKey],
      })
      .returning({ id: projectEvents.id });

    const accepted = inserted.length;
    const skipped = rows.length - accepted;

    if (accepted > 0) {
      scheduleProjectAggregation(
        project.id,
        rows.map(row => row.occurredAt)
      );
    }

    return { accepted, total: rows.length, skipped, errors: [] };
  } catch (error) {
    logger.error(error, "Failed to insert events");
    throw error;
  }
}

async function getValidFunnelIds(projectId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) {
    return new Set();
  }

  const rows = await db
    .select({ id: projectFunnels.id })
    .from(projectFunnels)
    .where(and(eq(projectFunnels.projectId, projectId), inArray(projectFunnels.id, ids)));

  return new Set(rows.map(row => row.id));
}

async function getValidFunnelSteps(projectId: string, funnelIds: string[], steps: string[]): Promise<Set<string>> {
  if (!funnelIds.length || !steps.length) {
    return new Set();
  }

  const rows = await db
    .select({ funnelId: projectFunnelSteps.funnelId, stepKey: projectFunnelSteps.stepKey })
    .from(projectFunnelSteps)
    .innerJoin(projectFunnels, eq(projectFunnelSteps.funnelId, projectFunnels.id))
    .where(
      and(eq(projectFunnels.projectId, projectId), inArray(projectFunnelSteps.funnelId, funnelIds), inArray(projectFunnelSteps.stepKey, steps))
    );

  return new Set(rows.map(row => `${row.funnelId}:${row.stepKey}`));
}

export async function listEvents(
  projectId: string,
  params: ListEventsParams
): Promise<ProjectEventRow[]> {
  const filters: SQL<unknown>[] = [eq(projectEvents.projectId, projectId)];
  if (params.from) {
    filters.push(sql`${projectEvents.occurredAt} >= ${params.from}`);
  }

  if (params.to) {
    filters.push(sql`${projectEvents.occurredAt} <= ${params.to}`);
  }

  let condition: SQL<unknown> | undefined;
  for (const clause of filters) {
    condition = condition ? and(condition, clause) : clause;
  }
  const finalCondition = condition ?? eq(projectEvents.projectId, projectId);

  const rows = await db
    .select({
      id: projectEvents.id,
      occurredAt: projectEvents.occurredAt,
      pageUrl: projectEvents.pageUrl,
      path: projectEvents.path,
      referrer: projectEvents.referrer,
      funnelId: projectEvents.funnelId,
      stepKey: projectEvents.stepKey,
      metadata: projectEvents.metadata,
    })
    .from(projectEvents)
    .where(finalCondition)
    .orderBy(desc(projectEvents.occurredAt))
    .limit(params.limit)
    .offset(params.offset);

  return rows.map(row => ({
    id: row.id,
    occurredAt: row.occurredAt,
    pageUrl: row.pageUrl ?? null,
    path: row.path ?? null,
    referrer: row.referrer ?? null,
    funnelId: row.funnelId ?? null,
    stepKey: row.stepKey ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}
