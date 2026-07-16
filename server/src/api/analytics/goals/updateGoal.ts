import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { GoalBody, goalBodySchema } from "./goalSchema.js";

export async function updateGoal(
  request: FastifyRequest<{
    Params: { siteId: string; goalId: string };
    Body: GoalBody;
  }>,
  reply: FastifyReply
) {
  try {
    const siteId = parseInt(request.params.siteId, 10);
    const goalId = parseInt(request.params.goalId, 10);

    if (isNaN(siteId) || siteId <= 0) {
      return reply.status(400).send({ error: "Invalid site ID" });
    }

    if (isNaN(goalId) || goalId <= 0) {
      return reply.status(400).send({ error: "Invalid goal ID" });
    }

    // Validate the request body
    const validatedData = goalBodySchema.parse(request.body);
    const { name, goalType, config } = validatedData;

    // Check if the goal exists
    const existingGoal = await db.query.goals.findFirst({
      where: eq(goals.goalId, goalId),
    });

    if (!existingGoal) {
      return reply.status(404).send({ error: "Goal not found" });
    }

    // Check if the goal belongs to the specified site
    if (existingGoal.siteId !== siteId) {
      return reply.status(403).send({ error: "Goal does not belong to the specified site" });
    }

    // Check user access to site
    const userHasAccessToSite = await getUserHasAccessToSite(request, siteId.toString());
    if (!userHasAccessToSite) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    // Update the goal
    const result = await db
      .update(goals)
      .set({
        name: name || null, // Use null if name is not provided
        goalType,
        config,
      })
      .where(eq(goals.goalId, goalId))
      .returning({ goalId: goals.goalId });

    if (!result || result.length === 0) {
      return reply.status(500).send({ error: "Failed to update goal" });
    }

    return reply.send({
      success: true,
      goalId: result[0].goalId,
    });
  } catch (error) {
    console.error("Error updating goal:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: "Validation error",
        details: error.errors,
      });
    }

    return reply.status(500).send({ error: "Failed to update goal" });
  }
}
