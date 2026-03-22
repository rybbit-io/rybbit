import { FastifyReply, FastifyRequest } from "fastify";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { userProfiles, userAliases } from "../../db/postgres/schema.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { userIdService } from "../userId/userIdService.js";
import { getIpAddress } from "../../utils.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

const logger = createServiceLogger("identify-service");

// Max traits size in bytes (2KB)
const MAX_TRAITS_SIZE = 2048;

// Validation schema for identify requests
const identifyPayloadSchema = z.object({
  site_id: z.string().min(1),
  user_id: z.string().min(1).max(255),
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

async function backfillIdentifiedUserId(
  siteId: number,
  anonymousId: string,
  userId: string
) {
  try {
    const tables = ["events", "session_replay_events", "session_replay_metadata"];
    for (const table of tables) {
      await clickhouse.command({
        query: `ALTER TABLE ${table} UPDATE identified_user_id = {userId: String} WHERE site_id = {siteId: UInt16} AND user_id = {anonymousId: String} AND identified_user_id = '' AND timestamp >= now() - INTERVAL {days: UInt16} DAY`,
        query_params: { userId, siteId, anonymousId, days: BACKFILL_DAYS },
      });
    }
    logger.info({ siteId, anonymousId, userId }, "Backfilled identified_user_id in ClickHouse");
  } catch (error) {
    logger.error({ siteId, anonymousId, userId, error }, "Error backfilling identified_user_id");
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

    const { site_id, user_id, traits, is_new_identify } = validationResult.data;

    // Get site configuration
    const siteConfiguration = await siteConfig.getConfig(site_id);
    if (!siteConfiguration) {
      return reply.status(404).send({
        success: false,
        error: "Site not found",
      });
    }

    const siteId = siteConfiguration.siteId;

    // Compute anonymous_id from request (same logic as tracking)
    const ipAddress = getIpAddress(request);
    const userAgent = request.headers["user-agent"] || "";
    const anonymousId = await userIdService.generateUserId(ipAddress, userAgent, siteId);

    // Create alias if this is a new identify call (links anonymous_id to user_id)
    if (is_new_identify) {
      try {
        // Check if alias already exists
        const existingAlias = await db
          .select()
          .from(userAliases)
          .where(and(eq(userAliases.siteId, siteId), eq(userAliases.anonymousId, anonymousId)))
          .limit(1);

        if (existingAlias.length === 0) {
          // Create new alias
          await db.insert(userAliases).values({
            siteId,
            anonymousId,
            userId: user_id,
          });
          // Fire-and-forget: backfill identified_user_id on past anonymous events
          backfillIdentifiedUserId(siteId, anonymousId, user_id);
        } else if (existingAlias[0].userId !== user_id) {
          // Update alias to point to new user
          await db
            .update(userAliases)
            .set({ userId: user_id })
            .where(and(eq(userAliases.siteId, siteId), eq(userAliases.anonymousId, anonymousId)));
        }
      } catch (error) {
        // Handle unique constraint violation gracefully (race condition)
        logger.debug({ siteId, anonymousId, userId: user_id, error }, "Alias may already exist");
      }
    }

    // Update or create user profile with traits
    if (traits && Object.keys(traits).length > 0) {
      try {
        const existingProfile = await db
          .select()
          .from(userProfiles)
          .where(and(eq(userProfiles.siteId, siteId), eq(userProfiles.userId, user_id)))
          .limit(1);

        if (existingProfile.length > 0) {
          // Merge new traits with existing (new traits override old)
          // Traits with null values are removed from the result
          const merged = {
            ...((existingProfile[0].traits as Record<string, unknown>) || {}),
            ...traits,
          };
          const mergedTraits = Object.fromEntries(Object.entries(merged).filter(([_, value]) => value !== null));

          await db
            .update(userProfiles)
            .set({
              traits: mergedTraits,
              updatedAt: new Date().toISOString(),
            })
            .where(and(eq(userProfiles.siteId, siteId), eq(userProfiles.userId, user_id)));
        } else {
          // Create new profile (filter out null values)
          const filteredTraits = Object.fromEntries(Object.entries(traits).filter(([_, value]) => value !== null));
          await db.insert(userProfiles).values({
            siteId,
            userId: user_id,
            traits: filteredTraits,
          });
        }
      } catch (error) {
        logger.error({ siteId, userId: user_id, error }, "Error updating user profile");
        // Don't fail the request if profile update fails
      }
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
