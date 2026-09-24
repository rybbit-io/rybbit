import { FastifyReply, FastifyRequest } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../../../db/postgres/postgres.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { effectiveUserId } from "../utils/effectiveUserId.js";

export interface GetUserTraitKeysRequest {
  Params: { siteId: string };
}

export interface GetUserTraitValuesRequest {
  Params: { siteId: string };
  Querystring: { key: string; limit?: string; offset?: string };
}

export interface GetUserTraitValueUsersRequest {
  Params: { siteId: string };
  Querystring: { key: string; value: string; limit?: string; offset?: string };
}

export const getUserTraitKeys = analyticsRoute<GetUserTraitKeysRequest>(
  "user trait keys",
  async (req: FastifyRequest<GetUserTraitKeysRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    const result = await db.execute<{ key: string; user_count: number }>(sql`
      SELECT key, COUNT(*)::int AS user_count
      FROM user_profiles,
           LATERAL jsonb_object_keys(COALESCE(traits, '{}'::jsonb)) AS key
      WHERE site_id = ${siteId}
      GROUP BY key
      ORDER BY user_count DESC
    `);

    return res.send({
      keys: (result as any[]).map((row) => ({
        key: row.key,
        userCount: row.user_count,
      })),
    });
  }
);

export const getUserTraitValues = analyticsRoute<GetUserTraitValuesRequest>(
  "user trait values",
  async (req: FastifyRequest<GetUserTraitValuesRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);
    const { key, limit: limitStr = "1000", offset: offsetStr = "0" } = req.query;

    if (!key) {
      return res.status(400).send({ error: "key query parameter is required" });
    }

    const limit = parseInt(limitStr, 10);
    const offset = parseInt(offsetStr, 10);

    const [valuesResult, countResult] = await Promise.all([
      db.execute<{ value: string; user_count: number }>(sql`
        SELECT traits->>${key} AS value, COUNT(*)::int AS user_count
        FROM user_profiles
        WHERE site_id = ${siteId} AND traits ? ${key}
        GROUP BY value
        ORDER BY user_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      db.execute<{ total: number }>(sql`
        SELECT COUNT(DISTINCT traits->>${key})::int AS total
        FROM user_profiles
        WHERE site_id = ${siteId} AND traits ? ${key}
      `),
    ]);

    const total = (countResult as any[])[0]?.total ?? 0;

    return res.send({
      values: (valuesResult as any[]).map((row) => ({
        value: row.value,
        userCount: row.user_count,
      })),
      total,
      hasMore: offset + limit < total,
    });
  }
);

// Session counts + metadata from ClickHouse for a set of identified users.
// Use events.identified_user_id to avoid conflict with the argMax alias
export const buildTraitValueUsersQuery = () => `
      SELECT
        ${effectiveUserId("events")} AS effective_user_id,
        argMax(events.user_id, timestamp) AS user_id,
        argMax(events.identified_user_id, timestamp) AS identified_user_id,
        argMax(country, timestamp) AS country,
        argMax(region, timestamp) AS region,
        argMax(city, timestamp) AS city,
        argMax(browser, timestamp) AS browser,
        argMax(operating_system, timestamp) AS operating_system,
        argMax(device_type, timestamp) AS device_type,
        count(DISTINCT session_id) AS sessions
      FROM events
      WHERE site_id = {siteId:Int32}
        AND events.identified_user_id IN ({userIds:Array(String)})
      GROUP BY effective_user_id
    `;

export const getUserTraitValueUsers = analyticsRoute<GetUserTraitValueUsersRequest>(
  "trait value users",
  async (req: FastifyRequest<GetUserTraitValueUsersRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);
    const { key, value, limit: limitStr = "50", offset: offsetStr = "0" } = req.query;

    if (!key || value === undefined) {
      return res.status(400).send({ error: "key and value query parameters are required" });
    }

    const limit = parseInt(limitStr, 10);
    const offset = parseInt(offsetStr, 10);

    // Step 1: Find matching user IDs and their traits from Postgres
    const [profilesResult, countResult] = await Promise.all([
      db.execute<{ user_id: string; traits: Record<string, unknown> | null }>(sql`
        SELECT user_id, traits
        FROM user_profiles
        WHERE site_id = ${siteId} AND traits->>${key} = ${value}
        ORDER BY user_id
        LIMIT ${limit} OFFSET ${offset}
      `),
      db.execute<{ total: number }>(sql`
        SELECT COUNT(*)::int AS total
        FROM user_profiles
        WHERE site_id = ${siteId} AND traits->>${key} = ${value}
      `),
    ]);

    const profiles = profilesResult as any[];
    const total = (countResult as any[])[0]?.total ?? 0;

    if (profiles.length === 0) {
      return res.send({ users: [], total, hasMore: offset + limit < total });
    }

    const userIds = profiles.map((p: any) => p.user_id);

    // Step 2: Get session counts + metadata from ClickHouse
    const chData = await runAnalyticsQuery<{
      effective_user_id: string;
      user_id: string;
      identified_user_id: string;
      country: string;
      region: string;
      city: string;
      browser: string;
      operating_system: string;
      device_type: string;
      sessions: number;
    }>({
      query: buildTraitValueUsersQuery(),
      params: {
        siteId,
        userIds,
      },
    });

    // Step 3: Build lookup from ClickHouse data keyed by identified_user_id,
    // then iterate Postgres profiles so every profile is returned even if
    // ClickHouse has no matching events (zero-session fallback).
    const chLookup = new Map(
      chData.map((row) => [row.identified_user_id, row])
    );

    const users = profiles.map((p: any) => {
      const ch = chLookup.get(p.user_id);
      return {
        user_id: ch?.user_id ?? p.user_id,
        identified_user_id: p.user_id,
        traits: p.traits ?? null,
        country: ch?.country ?? "",
        region: ch?.region ?? "",
        city: ch?.city ?? "",
        browser: ch?.browser ?? "",
        operating_system: ch?.operating_system ?? "",
        device_type: ch?.device_type ?? "",
        sessions: ch?.sessions ?? 0,
      };
    });

    return res.send({
      users,
      total,
      hasMore: offset + limit < total,
    });
  }
);
