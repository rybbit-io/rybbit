import { db } from "../../db/postgres/postgres.js";
import { featureFlags, type FeatureFlagRuntime } from "../../db/postgres/schema.js";
import { redis } from "../../db/redis/redis.js";

const FEATURE_FLAG_CACHE_PREFIX = "feature-flags:definitions";
const FEATURE_FLAG_CACHE_TTL_SECONDS = 300;

export type FeatureFlagDefinition = typeof featureFlags.$inferSelect;

const inFlightLoads = new Map<number, Promise<FeatureFlagDefinition[]>>();
const cacheGenerations = new Map<number, number>();

function getCacheKey(siteId: number) {
  return `${FEATURE_FLAG_CACHE_PREFIX}:${siteId}`;
}

async function loadFeatureFlagDefinitions(siteId: number): Promise<FeatureFlagDefinition[]> {
  const cacheKey = getCacheKey(siteId);

  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as FeatureFlagDefinition[];
    }
  } catch {
    // Redis is an optimization; fall back to Postgres when it is unavailable.
  }

  const generation = cacheGenerations.get(siteId) ?? 0;
  const rows = await db.query.featureFlags.findMany({
    where: (table, { eq }) => eq(table.siteId, siteId),
    orderBy: (table, { asc }) => [asc(table.key)],
  });

  if ((cacheGenerations.get(siteId) ?? 0) === generation) {
    try {
      await redis.set(cacheKey, JSON.stringify(rows), "EX", FEATURE_FLAG_CACHE_TTL_SECONDS);
    } catch {
      // The database result is still valid when Redis is unavailable.
    }
  }

  return rows;
}

export function getFeatureFlagDefinitions(siteId: number): Promise<FeatureFlagDefinition[]> {
  const existingLoad = inFlightLoads.get(siteId);
  if (existingLoad) return existingLoad;

  const load = loadFeatureFlagDefinitions(siteId).finally(() => {
    if (inFlightLoads.get(siteId) === load) {
      inFlightLoads.delete(siteId);
    }
  });
  inFlightLoads.set(siteId, load);
  return load;
}

export async function getFeatureFlagDefinitionsForRuntime(
  siteId: number,
  runtime: FeatureFlagRuntime
): Promise<FeatureFlagDefinition[]> {
  return (await getFeatureFlagDefinitions(siteId)).filter(
    definition => definition.runtime === "both" || definition.runtime === runtime
  );
}

export async function hasFeatureFlagsForRuntime(siteId: number, runtime: FeatureFlagRuntime): Promise<boolean> {
  return (await getFeatureFlagDefinitionsForRuntime(siteId, runtime)).length > 0;
}

export async function invalidateFeatureFlagDefinitions(siteId: number): Promise<void> {
  cacheGenerations.set(siteId, (cacheGenerations.get(siteId) ?? 0) + 1);
  inFlightLoads.delete(siteId);

  try {
    await redis.del(getCacheKey(siteId));
  } catch {
    // Postgres remains the source of truth; the cache entry also has a bounded TTL.
  }
}
