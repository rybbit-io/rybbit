import { FastifyReply, FastifyRequest } from "fastify";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { userProfiles, userAliases } from "../../db/postgres/schema.js";
import { identityBackfillQueue } from "./identityBackfillQueue.js";
import { userIdService } from "../userId/userIdService.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { resolveSiteIngestionContext } from "./siteIngestionContext.js";

const logger = createServiceLogger("identify-service");

// Max traits size in bytes (2KB)
const MAX_TRAITS_SIZE = 2048;

// Validation schema for identify requests
const identifyPayloadSchema = z.object({
  site_id: z.string().min(1),
  anonymous_id: z.string().min(1).max(255).optional(),
  user_id: z.string().min(1).max(255),
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
// Queues the assignment rather than mutating immediately. Each mutation
// submission takes the MergeTree parts lock, and at production identify rates
// that lock was being taken every ~12 seconds per table, stalling concurrent
// inserts and selects. The queue collapses an interval's worth of identities
// into one mutation per table; see identityBackfillQueue.ts.
export function backfillIdentifiedUserId(
  siteId: number,
  anonymousId: string,
  userId: string,
  days: number | null = BACKFILL_DAYS
) {
  identityBackfillQueue.enqueue({ siteId, anonymousId, userId }, days);
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

    const ingestionContext = await resolveSiteIngestionContext(request, {
      site_id,
      ip_address,
      user_agent,
    });
    if (!ingestionContext) {
      return reply.status(404).send({
        success: false,
        error: "Site not found",
      });
    }

    const { site, ipAddress, userAgent, lookupAsn, receivedAt, trustedServerSideIngestion } = ingestionContext;
    const siteId = site.siteId;

    if (!trustedServerSideIngestion && (ip_address !== undefined || user_agent !== undefined)) {
      logger.warn(
        {
          siteId,
          ignoredIpAddressOverride: ip_address !== undefined,
          ignoredUserAgentOverride: user_agent !== undefined,
        },
        "Ignored untrusted identity overrides; an ingest:write bearer is required"
      );
    }

    const anonymousId = anonymous_id
      ? await userIdService.generateUserIdFromClientId(anonymous_id, siteId, {
          saltUserIds: site.saltUserIds,
          receivedAt,
        })
      : await userIdService.generateUserId(ipAddress, userAgent, siteId, {
          saltUserIds: site.saltUserIds,
          lookupAsn,
          receivedAt,
        });

    // Create alias if this is a new identify call (links anonymous_id to user_id)
    if (is_new_identify) {
      // Ensure a user_profiles row exists at identify time so the user is
      // discoverable via search/inventory queries even when no traits are set,
      // and so createdAt reflects identification time rather than first setTraits.
      try {
        await db.insert(userProfiles).values({ siteId, userId: user_id }).onConflictDoNothing();
      } catch (error) {
        logger.error({ siteId, userId: user_id, err: error }, "Error creating user profile shell");
      }

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
        logger.debug({ siteId, anonymousId, userId: user_id, err: error }, "Alias may already exist");
      }
    }

    // Atomic upsert: merge non-null traits and remove keys explicitly set to null.
    if (traits && Object.keys(traits).length > 0) {
      try {
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

        await db
          .insert(userProfiles)
          .values({ siteId, userId: user_id, traits: filteredTraits })
          .onConflictDoUpdate({
            target: [userProfiles.siteId, userProfiles.userId],
            set: {
              traits: traitsExpr,
              updatedAt: sql`now()`,
            },
          });
      } catch (error) {
        logger.error({ siteId, userId: user_id, err: error }, "Error updating user profile");
      }
    }

    return reply.status(200).send({
      success: true,
    });
  } catch (error) {
    logger.error({ err: error }, "Error handling identify");
    return reply.status(500).send({
      success: false,
      error: "Failed to process identify",
    });
  }
}
