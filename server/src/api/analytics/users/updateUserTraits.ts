import { FastifyReply, FastifyRequest } from "fastify";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { userProfiles } from "../../../db/postgres/schema.js";

// Max traits size in bytes (2KB) — matches the tracker identify endpoint
const MAX_TRAITS_SIZE = 2048;

const updateUserTraitsBodySchema = z.object({
  traits: z.record(z.unknown()).refine(
    traits => {
      const size = new TextEncoder().encode(JSON.stringify(traits)).length;
      return size <= MAX_TRAITS_SIZE;
    },
    { message: `Traits must be less than ${MAX_TRAITS_SIZE} bytes (2KB)` }
  ),
});

export interface UpdateUserTraitsRequest {
  Params: {
    siteId: string;
    userId: string;
  };
  Body: unknown;
}

/**
 * Replace a user's traits from the dashboard. Unlike the tracking script's
 * identify() (which merges), the dashboard editor submits the full set, so
 * the stored traits are replaced wholesale.
 */
export async function updateUserTraits(req: FastifyRequest<UpdateUserTraitsRequest>, res: FastifyReply) {
  const validationResult = updateUserTraitsBodySchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).send({ error: "Invalid payload", details: validationResult.error.flatten() });
  }

  const { userId } = req.params;
  const siteId = Number(req.params.siteId);
  const traits = Object.fromEntries(
    Object.entries(validationResult.data.traits).filter(([, v]) => v !== null && v !== undefined)
  );

  try {
    await db
      .insert(userProfiles)
      .values({ siteId, userId, traits })
      .onConflictDoUpdate({
        target: [userProfiles.siteId, userProfiles.userId],
        set: {
          traits,
          updatedAt: sql`now()`,
        },
      });

    return res.send({ success: true });
  } catch (error) {
    console.error("Error updating user traits:", error);
    return res.status(500).send({ error: "Failed to update user traits" });
  }
}
