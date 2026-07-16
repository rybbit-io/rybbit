import { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import SqlString from "sqlstring";
import { UAParser as userAgentParser } from "ua-parser-js";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getLocation } from "../../db/geolocation/geolocation.js";
import { db } from "../../db/postgres/postgres.js";
import { featureFlags, userProfiles } from "../../db/postgres/schema.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { getRequestUserAgent } from "../../services/tracker/requestIdentity.js";
import { processResults } from "../analytics/utils/utils.js";
import { getDeviceType } from "../../utils.js";
import { resolveClientIp } from "../../services/tracker/resolveClientIp.js";
import { evaluateFeatureFlagsForSite } from "../../services/featureFlags/evaluator.js";
import {
  evaluateFeatureFlagsSchema,
  featureFlagBodySchema,
  featureFlagUpdateSchema,
  type EvaluateFeatureFlagsBody,
  type FeatureFlagBody,
  type FeatureFlagUpdateBody,
} from "./schemas.js";

type FeatureFlagStatsRow = {
  flag_key: string;
  flag_value: string;
  sessions: number;
  events: number;
  exposures: number;
};

function parseSiteId(siteIdParam: string, reply: FastifyReply): number | null {
  const siteId = parseInt(siteIdParam, 10);
  if (isNaN(siteId) || siteId <= 0) {
    reply.status(400).send({ error: "Invalid site ID" });
    return null;
  }
  return siteId;
}

function getDuplicateKeyMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    return "A feature flag with this key already exists";
  }
  return null;
}

async function getFeatureFlagStats(siteId: number, keys: string[]) {
  if (keys.length === 0) return {};

  const escapedKeys = keys.map(key => SqlString.escape(key)).join(", ");

  try {
    const result = await clickhouse.query({
      query: `
        SELECT
          flag_key,
          flag_value,
          uniq(session_id) AS sessions,
          count() AS events,
          countIf(type = 'custom_event' AND event_name = 'feature_flag_exposure') AS exposures
        FROM (
          SELECT
            session_id,
            type,
            event_name,
            arrayJoin(mapKeys(feature_flags)) AS flag_key,
            feature_flags[flag_key] AS flag_value
          FROM events
          WHERE site_id = ${SqlString.escape(siteId)}
            AND length(mapKeys(feature_flags)) > 0
        )
        WHERE flag_key IN (${escapedKeys})
        GROUP BY flag_key, flag_value
        ORDER BY flag_key ASC, sessions DESC
      `,
      format: "JSONEachRow",
    });

    const rows = await processResults<FeatureFlagStatsRow>(result);
    const stats: Record<string, FeatureFlagStatsRow[]> = {};

    for (const row of rows) {
      stats[row.flag_key] ??= [];
      stats[row.flag_key].push(row);
    }

    return stats;
  } catch {
    return {};
  }
}

export async function getFeatureFlags(
  request: FastifyRequest<{
    Params: { siteId: string };
  }>,
  reply: FastifyReply
) {
  const siteId = parseSiteId(request.params.siteId, reply);
  if (!siteId) return;

  const rows = await db.query.featureFlags.findMany({
    where: eq(featureFlags.siteId, siteId),
    orderBy: (table, { asc }) => [asc(table.key)],
  });

  const stats = await getFeatureFlagStats(
    siteId,
    rows.map(flag => flag.key)
  );

  return reply.send({
    data: rows.map(flag => ({
      ...flag,
      stats: stats[flag.key] ?? [],
    })),
  });
}

export async function createFeatureFlag(
  request: FastifyRequest<{
    Params: { siteId: string };
    Body: FeatureFlagBody;
  }>,
  reply: FastifyReply
) {
  try {
    const siteId = parseSiteId(request.params.siteId, reply);
    if (!siteId) return;

    const body = featureFlagBodySchema.parse(request.body);

    const [created] = await db
      .insert(featureFlags)
      .values({
        siteId,
        key: body.key,
        description: body.description || null,
        enabled: body.enabled,
        runtime: body.runtime,
        flagType: body.flagType,
        payload: body.payload,
        variants: body.variants,
        rolloutPercentage: body.rolloutPercentage,
        rules: body.rules,
        conditionSets: body.conditionSets,
      })
      .returning();

    return reply.status(201).send({ success: true, data: created });
  } catch (error) {
    const duplicateMessage = getDuplicateKeyMessage(error);
    if (duplicateMessage) {
      return reply.status(409).send({ error: duplicateMessage });
    }
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    return reply.status(500).send({ error: "Failed to create feature flag" });
  }
}

export async function updateFeatureFlag(
  request: FastifyRequest<{
    Params: { siteId: string; flagId: string };
    Body: FeatureFlagUpdateBody;
  }>,
  reply: FastifyReply
) {
  try {
    const siteId = parseSiteId(request.params.siteId, reply);
    if (!siteId) return;

    const flagId = parseInt(request.params.flagId, 10);
    if (isNaN(flagId) || flagId <= 0) {
      return reply.status(400).send({ error: "Invalid feature flag ID" });
    }

    const body = featureFlagUpdateSchema.parse(request.body);
    const updateData: Partial<typeof featureFlags.$inferInsert> = {
      ...body,
      description: body.description === undefined ? undefined : body.description || null,
      updatedAt: new Date().toISOString(),
    };

    if (body.key === undefined) delete updateData.key;
    if (body.enabled === undefined) delete updateData.enabled;
    if (body.runtime === undefined) delete updateData.runtime;
    if (body.flagType === undefined) delete updateData.flagType;
    if (body.payload === undefined) delete updateData.payload;
    if (body.variants === undefined) delete updateData.variants;
    if (body.rolloutPercentage === undefined) delete updateData.rolloutPercentage;
    if (body.rules === undefined) delete updateData.rules;
    if (body.conditionSets === undefined) delete updateData.conditionSets;

    updateData.version = (
      await db.query.featureFlags.findFirst({
        columns: { version: true },
        where: and(eq(featureFlags.siteId, siteId), eq(featureFlags.flagId, flagId)),
      })
    )?.version;

    if (updateData.version === undefined) {
      return reply.status(404).send({ error: "Feature flag not found" });
    }
    updateData.version += 1;

    const [updated] = await db
      .update(featureFlags)
      .set(updateData)
      .where(and(eq(featureFlags.siteId, siteId), eq(featureFlags.flagId, flagId)))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: "Feature flag not found" });
    }

    return reply.send({ success: true, data: updated });
  } catch (error) {
    const duplicateMessage = getDuplicateKeyMessage(error);
    if (duplicateMessage) {
      return reply.status(409).send({ error: duplicateMessage });
    }
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    return reply.status(500).send({ error: "Failed to update feature flag" });
  }
}

export async function deleteFeatureFlag(
  request: FastifyRequest<{
    Params: { siteId: string; flagId: string };
  }>,
  reply: FastifyReply
) {
  const siteId = parseSiteId(request.params.siteId, reply);
  if (!siteId) return;

  const flagId = parseInt(request.params.flagId, 10);
  if (isNaN(flagId) || flagId <= 0) {
    return reply.status(400).send({ error: "Invalid feature flag ID" });
  }

  const [deleted] = await db
    .delete(featureFlags)
    .where(and(eq(featureFlags.siteId, siteId), eq(featureFlags.flagId, flagId)))
    .returning({ flagId: featureFlags.flagId });

  if (!deleted) {
    return reply.status(404).send({ error: "Feature flag not found" });
  }

  return reply.send({ success: true });
}

function parseQuery(querystring?: string) {
  if (!querystring) return {};
  const params = new URLSearchParams(querystring.startsWith("?") ? querystring.slice(1) : querystring);
  return Object.fromEntries(params.entries());
}

export async function evaluateFeatureFlags(
  request: FastifyRequest<{
    Params: { siteId: string };
    Body: EvaluateFeatureFlagsBody;
  }>,
  reply: FastifyReply
) {
  return evaluateFeatureFlagsForRuntime(request, reply, "client");
}

export async function evaluateServerFeatureFlags(
  request: FastifyRequest<{
    Params: { siteId: string };
    Body: EvaluateFeatureFlagsBody;
  }>,
  reply: FastifyReply
) {
  return evaluateFeatureFlagsForRuntime(request, reply, "server");
}

async function evaluateFeatureFlagsForRuntime(
  request: FastifyRequest<{
    Params: { siteId: string };
    Body: EvaluateFeatureFlagsBody;
  }>,
  reply: FastifyReply,
  runtime: "client" | "server"
) {
  try {
    const body = evaluateFeatureFlagsSchema.parse(request.body);
    const site = await siteConfig.getConfig(request.params.siteId);

    if (!site) {
      return reply.status(404).send({ error: "Site not found" });
    }

    const ipAddress = resolveClientIp(request);
    const [locationByIp, profile] = await Promise.all([
      getLocation([ipAddress]).catch(() => ({}) as Awaited<ReturnType<typeof getLocation>>),
      body.identifiedUserId
        ? db.query.userProfiles.findFirst({
            where: and(eq(userProfiles.siteId, site.siteId), eq(userProfiles.userId, body.identifiedUserId)),
          })
        : Promise.resolve(undefined),
    ]);

    const location = locationByIp[ipAddress];
    const ua = userAgentParser(getRequestUserAgent(request));
    const deviceType = getDeviceType(body.screenWidth || 0, body.screenHeight || 0, ua);

    const assignments = await evaluateFeatureFlagsForSite(
      site.siteId,
      {
        anonymousId: body.anonymousId,
        identifiedUserId: body.identifiedUserId,
        hostname: body.hostname,
        pathname: body.pathname,
        query: body.query ?? parseQuery(body.querystring),
        referrer: body.referrer,
        language: body.language,
        country: location?.countryIso,
        region: location?.region ? `${location.countryIso}-${location.region}` : undefined,
        city: location?.city,
        deviceType,
        traits: profile?.traits ?? {},
      },
      { runtime }
    );

    return reply.send({
      flags: assignments,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    return reply.status(500).send({ error: "Failed to evaluate feature flags" });
  }
}
