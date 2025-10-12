import { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DateTime } from "luxon";
import { db } from "../../db/postgres/postgres.js";
import { user } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";

// Schema for account settings that can be updated
const updateAccountSettingsSchema = z.object({
  sendAutoEmailReports: z.boolean().optional(),
  // Add more settings here in the future
});

export type UpdateAccountSettingsRequest = z.infer<typeof updateAccountSettingsSchema>;

export const updateAccountSettings = async (
  request: FastifyRequest<{ Body: UpdateAccountSettingsRequest }>,
  reply: FastifyReply
) => {
  try {
    const session = await getSessionFromReq(request);

    if (!session?.user.id) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Validate request body
    const validation = updateAccountSettingsSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({ error: "Invalid request body", details: validation.error });
    }

    const settings = validation.data;

    // Build update object with only provided fields
    const updateData: Partial<typeof user.$inferInsert> = {};

    if (settings.sendAutoEmailReports !== undefined) {
      updateData.sendAutoEmailReports = settings.sendAutoEmailReports;
    }

    // If no fields to update, return early
    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({ error: "No settings provided to update" });
    }

    // Update user settings
    const [updatedUser] = await db
      .update(user)
      .set({
        ...updateData,
        updatedAt: DateTime.now().toISO(),
      })
      .where(eq(user.id, session.user.id))
      .returning();

    if (!updatedUser) {
      return reply.status(404).send({ error: "User not found" });
    }

    return reply.send({
      success: true,
      settings: {
        sendAutoEmailReports: updatedUser.sendAutoEmailReports,
        // Add more settings here as they're added
      },
    });
  } catch (error) {
    console.error("Error updating account settings:", error);
    return reply.status(500).send({ error: "Failed to update account settings" });
  }
};
