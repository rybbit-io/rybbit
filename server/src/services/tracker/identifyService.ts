import { FastifyReply, FastifyRequest } from "fastify";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { userProfiles, userAliases } from "../../db/postgres/schema.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { userIdService } from "../userId/userIdService.js";
import { resolveClientIp } from "./resolveClientIp.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

const logger = createServiceLogger("identify-service");

// Max traits size in bytes (2KB)
const MAX_TRAITS_SIZE = 2048;

// Validation schema for identify requests
const identifyPayloadSchema = z.object({
  site_id: z.string().min(1),
  anonymous_id: z.string().min(1).max(255).optional(),
  user_id: z.string().trim().min(1).max(255),
  ip_address: z.string().ip().optional(),
  user_agent: z.string().max(512).optional(),
  traits: z
    .record(z.unknown())
    .optional()
    .refine(
      traits => {
        if (!traits) return true;
        const size = new TextEncoder().encode(JSON.stringify(traits)).length;
        return size <= MAX_TRAITS_SIZE;
      },
      { message: `Traits must be less than ${MAX_TRAITS_SIZE} bytes (2KB)` }
    ),
  is_new_identify: z.boolean().default(true),
});

// Backfill window limits partition scanning to recent data only.
// Anonymous events older than this are unlikely to belong to the identifying user.
const BACKFILL_DAYS = 30;

// days: null backfills the device's full history — only for explicit admin
// actions (dashboard identify), where the operator asserts the whole history
// belongs to this user and the unbounded partition scan is a one-off.
export async function backfillIdentifiedUserId(
  siteId: number,
  anonymousId: string,
  userId: string,
  days: number | null = BACKFILL_DAYS
) {
  try {
    // session_replay_metadata has no `timestamp` column; its time column is
    // `start_time`. Using `timestamp` there throws ClickHouse error 47
    // (UNKNOWN_IDENTIFIER), so map each table to its actual time column.
    const tables: Array<{ name: string; timeColumn: string }> = [
      { name: "events", timeColumn: "timestamp" },
      { name: "session_replay_events", timeColumn: "timestamp" },
      { name: "session_replay_metadata", timeColumn: "start_time" },
    ];
    for (const { name, timeColumn } of tables) {
      await clickhouse.command({
        query: `ALTER TABLE ${name} UPDATE identified_user_id = {userId: String} WHERE site_id = {siteId: UInt16} AND user_id = {anonymousId: String} AND identified_user_id = ''${
          days !== null ? ` AND ${timeColumn} >= now() - INTERVAL {days: UInt16} DAY` : ""
        }`,
        query_params: { userId, siteId, anonymousId, ...(days !== null ? { days } : {}) },
      });
    }
    logger.info({ siteId, anonymousId, userId }, "Backfilled identified_user_id in ClickHouse");
  } catch (error) {
    logger.error({ siteId, anonymousId, userId, error }, "Error backfilling identified_user_id");
    throw error;
  }
}

export async function handleIdentify(request: FastifyRequest, reply: FastifyReply) {
  try {
    const validationResult = identifyPayloadSchema.safeParse(request.body);

    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid payload",
        details: validationResult.error.flatten(),
      });
    }

    const { site_id, anonymous_id, user_id, traits, is_new_identify, ip_address, user_agent } = validationResult.data;

    // Get site configuration
    const siteConfiguration = await siteConfig.getConfig(site_id);
    if (!siteConfiguration) {
      return reply.status(404).send({
        success: false,
        error: "Site not found",
      });
    }

    const siteId = siteConfiguration.siteId;

    const anonymousId = anonymous_id
      ? await userIdService.generateUserIdFromClientId(anonymous_id, siteId)
      : await userIdService.generateUserId(
          ip_address || resolveClientIp(request),
          user_agent || request.headers["user-agent"] || "",
          siteId
        );

    await db.transaction(async tx => {
      if (is_new_identify) {
        // Keep profile and alias creation atomic. The conflict update also handles
        // simultaneous identify calls for the same anonymous visitor.
        await tx.insert(userProfiles).values({ siteId, userId: user_id }).onConflictDoNothing();
        await tx
          .insert(userAliases)
          .values({ siteId, anonymousId, userId: user_id })
          .onConflictDoUpdate({
            target: [userAliases.siteId, userAliases.anonymousId],
            set: { userId: user_id },
          });
      }

      // Atomic upsert: merge non-null traits and remove keys explicitly set to null.
      if (traits && Object.keys(traits).length > 0) {
        const filteredTraits = Object.fromEntries(Object.entries(traits).filter(([_, v]) => v !== null));
        const nullKeys = Object.entries(traits)
          .filter(([_, v]) => v === null)
          .map(([k]) => k);

        // When nullKeys is empty, drizzle serializes [] as `()` which is invalid
        // Postgres array literal syntax. Skip the subtract clause in that case.
        const traitsExpr =
          nullKeys.length > 0
            ? sql`(${userProfiles.traits} - ${nullKeys}::text[]) || ${JSON.stringify(filteredTraits)}::jsonb`
            : sql`${userProfiles.traits} || ${JSON.stringify(filteredTraits)}::jsonb`;

        await tx
          .insert(userProfiles)
          .values({ siteId, userId: user_id, traits: filteredTraits })
          .onConflictDoUpdate({
            target: [userProfiles.siteId, userProfiles.userId],
            set: {
              traits: traitsExpr,
              updatedAt: sql`now()`,
            },
          });
      }
    });

    if (is_new_identify) {
      // Await the mutation so failures are visible and a retried identify call
      // re-runs the idempotent `identified_user_id = ''` backfill.
      await backfillIdentifiedUserId(siteId, anonymousId, user_id);
    }

    return reply.status(200).send({
      success: true,
    });
  } catch (error) {
    logger.error(error, "Error handling identify");
    return reply.status(500).send({
      success: false,
      error: "Failed to process identify",
    });
  }
}
