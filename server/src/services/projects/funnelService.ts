import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { projectEvents, projectFunnelSteps, projectFunnels } from "../../db/postgres/schema.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { buildDateRangeFilters } from "../../api/v1/utils/index.js";

const logger = createServiceLogger("project-funnels");

export interface FunnelStepInput {
  key: string;
  name: string;
  order?: number;
  pagePattern?: string;
}

export interface FunnelInput {
  name: string;
  description?: string;
  isActive?: boolean;
  steps: FunnelStepInput[];
}

export interface FunnelRecord {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps: Array<{
    id: string;
    key: string;
    name: string;
    order: number;
    pagePattern: string | null;
  }>;
}

export async function listFunnels(projectId: string): Promise<FunnelRecord[]> {
  const funnels = await db
    .select()
    .from(projectFunnels)
    .where(eq(projectFunnels.projectId, projectId))
    .orderBy(asc(projectFunnels.createdAt));

  if (!funnels.length) {
    return [];
  }

  const funnelIds = funnels.map(f => f.id);
  const steps = await db
    .select()
    .from(projectFunnelSteps)
    .where(inArray(projectFunnelSteps.funnelId, funnelIds))
    .orderBy(asc(projectFunnelSteps.stepOrder));

  const stepsByFunnel = steps.reduce<Record<string, FunnelRecord["steps"]>>((acc, step) => {
    if (!acc[step.funnelId]) {
      acc[step.funnelId] = [];
    }
    acc[step.funnelId].push(mapStepRecord(step));
    return acc;
  }, {});

  return funnels.map(funnel => mapFunnelRecord(funnel, stepsByFunnel[funnel.id] ?? []));
}

export async function getFunnel(projectId: string, funnelId: string): Promise<FunnelRecord | null> {
  const funnel = await db
    .select()
    .from(projectFunnels)
    .where(and(eq(projectFunnels.id, funnelId), eq(projectFunnels.projectId, projectId)))
    .limit(1);

  if (!funnel[0]) {
    return null;
  }

  const steps = await db
    .select()
    .from(projectFunnelSteps)
    .where(eq(projectFunnelSteps.funnelId, funnelId))
    .orderBy(asc(projectFunnelSteps.stepOrder));

  return mapFunnelRecord(funnel[0], steps.map(mapStepRecord));
}

type NormalisedFunnelStep = FunnelStepInput & { order: number };

export async function createFunnel(projectId: string, input: FunnelInput): Promise<FunnelRecord> {
  const steps = input.steps ?? [];

  if (!steps.length) {
    throw new Error("A funnel requires at least one step");
  }

  return db.transaction(async tx => {
    const [funnel] = await tx
      .insert(projectFunnels)
      .values({
        projectId,
        name: input.name,
        description: input.description,
        isActive: input.isActive ?? true,
      })
      .returning();

    const orderedSteps = normaliseSteps(steps);

    const insertedSteps = await tx
      .insert(projectFunnelSteps)
      .values(
        orderedSteps.map(step => ({
          funnelId: funnel.id,
          stepOrder: step.order,
          stepKey: step.key,
          name: step.name,
          pagePattern: step.pagePattern,
        }))
      )
      .returning();

    return mapFunnelRecord(funnel, insertedSteps.map(mapStepRecord));
  });
}

export async function updateFunnel(projectId: string, funnelId: string, input: Partial<FunnelInput>) {
  return db.transaction(async tx => {
    const [existing] = await tx
      .select()
      .from(projectFunnels)
      .where(and(eq(projectFunnels.id, funnelId), eq(projectFunnels.projectId, projectId)))
      .limit(1);

    if (!existing) {
      return null;
    }

    let updatedAt = existing.updatedAt;

    if (input.name || input.description || input.isActive !== undefined) {
      updatedAt = new Date().toISOString();
      await tx
        .update(projectFunnels)
        .set({
          name: input.name ?? existing.name,
          description: input.description ?? existing.description,
          isActive: input.isActive ?? existing.isActive,
          updatedAt,
        })
        .where(eq(projectFunnels.id, funnelId));
    }

    let steps = await tx
      .select()
      .from(projectFunnelSteps)
      .where(eq(projectFunnelSteps.funnelId, funnelId))
      .orderBy(asc(projectFunnelSteps.stepOrder));

    if (input.steps) {
      await tx.delete(projectFunnelSteps).where(eq(projectFunnelSteps.funnelId, funnelId));
      const orderedSteps = normaliseSteps(input.steps);
      steps = await tx
        .insert(projectFunnelSteps)
        .values(
          orderedSteps.map(step => ({
            funnelId,
            stepOrder: step.order,
            stepKey: step.key,
            name: step.name,
            pagePattern: step.pagePattern,
          }))
        )
        .returning();
    }

    const updatedFunnel = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      isActive: input.isActive ?? existing.isActive,
      updatedAt,
    };

    return mapFunnelRecord(updatedFunnel, steps.map(mapStepRecord));
  });
}

export async function deleteFunnel(projectId: string, funnelId: string): Promise<boolean> {
  const deleted = await db
    .delete(projectFunnels)
    .where(and(eq(projectFunnels.id, funnelId), eq(projectFunnels.projectId, projectId)))
    .returning({ id: projectFunnels.id });
  return !!deleted.length;
}

export interface FunnelStatsRequest {
  from?: string;
  to?: string;
}

export interface FunnelStepStats {
  stepKey: string;
  name: string;
  visits: number;
  conversions: number;
  dropOff: number;
  conversionRate: number;
  order: number;
}

export interface FunnelStats {
  funnelId: string;
  totalVisitors: number;
  steps: FunnelStepStats[];
}

export async function getFunnelStats(
  projectId: string,
  funnelId: string,
  params: FunnelStatsRequest
): Promise<FunnelStats | null> {
  const funnel = await getFunnel(projectId, funnelId);

  if (!funnel) {
    return null;
  }

  if (!funnel.steps.length) {
    return {
      funnelId,
      totalVisitors: 0,
      steps: [],
    };
  }

  const filters = [
    eq(projectEvents.projectId, projectId),
    eq(projectEvents.funnelId, funnelId),
    ...buildDateRangeFilters(projectEvents.occurredAt, params.from, params.to),
  ];

  const stats = await db
    .select({
      stepKey: projectEvents.stepKey,
      visitors: sql<number>`COUNT(DISTINCT COALESCE(${projectEvents.sessionHash}, ${projectEvents.userHash}, ${projectEvents.id}))`,
    })
    .from(projectEvents)
    .where(and(...filters))
    .groupBy(projectEvents.stepKey);

  const visitorsByStep = new Map<string, number>();
  stats.forEach(row => {
    if (row.stepKey) {
      visitorsByStep.set(row.stepKey, Number(row.visitors ?? 0));
    }
  });

  let previousVisitors = funnel.steps.length ? visitorsByStep.get(funnel.steps[0].key) ?? 0 : 0;
  let totalVisitors = previousVisitors;

  const stepStats = funnel.steps.map((step, index) => {
    const visits = visitorsByStep.get(step.key) ?? 0;
    if (index === 0) {
      previousVisitors = visits;
      totalVisitors = visits;
    }
    const nextVisitors = index === funnel.steps.length - 1 ? visits : visitorsByStep.get(funnel.steps[index + 1].key) ?? 0;
    const conversions = nextVisitors;
    const dropOff = Math.max(visits - conversions, 0);
    const conversionRate = visits > 0 ? Number(((conversions / visits) * 100).toFixed(2)) : 0;
    return {
      stepKey: step.key,
      name: step.name,
      visits,
      conversions,
      dropOff,
      conversionRate,
      order: step.order,
    };
  });

  return {
    funnelId,
    totalVisitors,
    steps: stepStats,
  };
}

export function normaliseSteps(steps: FunnelStepInput[]): NormalisedFunnelStep[] {
  const seenKeys = new Set<string>();

  const ordered = steps
    .map((step, index) => ({
      key: step.key,
      name: step.name,
      order: step.order ?? index,
      pagePattern: step.pagePattern,
    }))
    .sort((a, b) => a.order - b.order)
    .map((step, index) => ({
      ...step,
      order: index,
    }));

  for (const step of ordered) {
    if (seenKeys.has(step.key)) {
      throw new Error(`Duplicate step key detected: ${step.key}`);
    }
    seenKeys.add(step.key);
  }

  return ordered;
}

// Helper functions to eliminate duplication

function mapStepRecord(step: typeof projectFunnelSteps.$inferSelect): FunnelRecord["steps"][number] {
  return {
    id: step.id,
    key: step.stepKey,
    name: step.name,
    order: step.stepOrder,
    pagePattern: step.pagePattern ?? null,
  };
}

function mapFunnelRecord(
  funnel: typeof projectFunnels.$inferSelect,
  steps: FunnelRecord["steps"]
): FunnelRecord {
  return {
    id: funnel.id,
    projectId: funnel.projectId,
    name: funnel.name,
    description: funnel.description ?? null,
    isActive: funnel.isActive,
    createdAt: funnel.createdAt,
    updatedAt: funnel.updatedAt,
    steps,
  };
}
