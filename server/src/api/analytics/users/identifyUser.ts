import { FastifyReply, FastifyRequest } from "fastify";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { userAliases, userProfiles } from "../../../db/postgres/schema.js";
import { backfillIdentifiedUserId } from "../../../services/tracker/identifyService.js";

// Max traits size in bytes (2KB) — matches the tracker identify endpoint
const MAX_TRAITS_SIZE = 2048;

const identifyUserBodySchema = z.object({
  anonymous_id: z.string().min(1).max(255),
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
});

export interface IdentifyUserRequest {
  Params: {
    siteId: string;
  };
  Body: unknown;
}

/**
 * Manually identify an anonymous visitor from the dashboard: links the device
 * fingerprint (anonymous_id) to a user ID, exactly like the tracking script's
 * identify() call, but initiated by a dashboard user instead of the visitor.
 */
export async function identifyUser(req: FastifyRequest<IdentifyUserRequest>, res: FastifyReply) {
  const validationResult = identifyUserBodySchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).send({ error: "Invalid payload", details: validationResult.error.flatten() });
  }

  const { anonymous_id, user_id, traits } = validationResult.data;
  const siteId = Number(req.params.siteId);

  if (anonymous_id === user_id) {
    return res.status(400).send({ error: "User ID must be different from the anonymous ID" });
  }

  try {
    const filteredTraits = traits ? Object.fromEntries(Object.entries(traits).filter(([, v]) => v !== null)) : {};

    if (Object.keys(filteredTraits).length > 0) {
      await db
        .insert(userProfiles)
        .values({ siteId, userId: user_id, traits: filteredTraits })
        .onConflictDoUpdate({
          target: [userProfiles.siteId, userProfiles.userId],
          set: {
            traits: sql`${userProfiles.traits} || ${JSON.stringify(filteredTraits)}::jsonb`,
            updatedAt: sql`now()`,
          },
        });
    } else {
      // Profile shell so the user shows up in search/inventory even without traits
      await db.insert(userProfiles).values({ siteId, userId: user_id }).onConflictDoNothing();
    }

    await db
      .insert(userAliases)
      .values({ siteId, anonymousId: anonymous_id, userId: user_id })
      .onConflictDoUpdate({
        target: [userAliases.siteId, userAliases.anonymousId],
        set: { userId: user_id },
      });

    // Fire-and-forget: the ClickHouse mutation can take a while on large sites,
    // so don't hold the response on it. No backfill window — the operator is
    // explicitly asserting this device's history belongs to this user.
    backfillIdentifiedUserId(siteId, anonymous_id, user_id, null);

    return res.send({ success: true });
  } catch (error) {
    console.error("Error identifying user:", error);
    return res.status(500).send({ error: "Failed to identify user" });
  }
}
