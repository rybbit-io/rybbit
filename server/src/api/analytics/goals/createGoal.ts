import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";
import { z } from "zod";
import { GoalBody, goalBodySchema } from "./goalSchema.js";

export async function createGoal(
  request: FastifyRequest<{
    Params: { siteId: string };
    Body: GoalBody;
  }>,
  reply: FastifyReply
) {
  try {
    // Get siteId from URL params
    const siteId = parseInt(request.params.siteId, 10);
    if (isNaN(siteId) || siteId <= 0) {
      return reply.status(400).send({ error: "Invalid site ID" });
    }

    // Validate the request body
    const validatedData = goalBodySchema.parse(request.body);
    const { name, goalType, config } = validatedData;

    // Check user access to site
    const userHasAccessToSite = await getUserHasAccessToSite(request, siteId.toString());
    if (!userHasAccessToSite) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    // Insert the goal into the database
    const result = await db
      .insert(goals)
      .values({
        siteId,
        name: name || null, // Use null if name is not provided
        goalType,
        config,
      })
      .returning({ goalId: goals.goalId });

    if (!result || result.length === 0) {
      return reply.status(500).send({ error: "Failed to create goal" });
    }

    return reply.status(201).send({
      success: true,
      goalId: result[0].goalId,
    });
  } catch (error) {
    console.error("Error creating goal:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: "Validation error",
        details: error.errors,
      });
    }

    return reply.status(500).send({ error: "Failed to create goal" });
  }
}
