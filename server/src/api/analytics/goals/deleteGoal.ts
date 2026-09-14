import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";
import { eq } from "drizzle-orm";

export async function deleteGoal(
  request: FastifyRequest<{
    Params: {
      siteId: string;
      goalId: string;
    };
  }>,
  reply: FastifyReply
) {
  const { siteId, goalId } = request.params;
  const parsedSiteId = parseInt(siteId, 10);
  const parsedGoalId = parseInt(goalId, 10);

  if (isNaN(parsedSiteId) || parsedSiteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  if (isNaN(parsedGoalId) || parsedGoalId <= 0) {
    return reply.status(400).send({ error: "Invalid goal ID" });
  }

  try {
    // Get the goal to check the site ID
    const goalToDelete = await db.query.goals.findFirst({
      where: eq(goals.goalId, parsedGoalId),
    });

    if (!goalToDelete) {
      return reply.status(404).send({ error: "Goal not found" });
    }

    if (goalToDelete.siteId !== parsedSiteId) {
      return reply.status(403).send({ error: "Goal does not belong to the specified site" });
    }

    // Check user access to the site
    const userHasAccessToSite = await getUserHasAccessToSite(request, parsedSiteId.toString());

    if (!userHasAccessToSite) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    // Delete the goal
    const result = await db.delete(goals).where(eq(goals.goalId, parsedGoalId)).returning({ deleted: goals.goalId });

    if (!result || result.length === 0) {
      return reply.status(500).send({ error: "Failed to delete goal" });
    }

    return reply.send({ success: true });
  } catch (error) {
    request.log.error({ err: error }, "Error deleting goal");
    return reply.status(500).send({ error: "Failed to delete goal" });
  }
}
