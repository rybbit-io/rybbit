import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";
import { eq } from "drizzle-orm";

export async function deleteGoal(
  request: FastifyRequest<{
    Params: {
      goalId: string;
    };
  }>,
  reply: FastifyReply
) {
  const { goalId } = request.params;

  try {
    // Get the goal to check the site ID
    const goalToDelete = await db.query.goals.findFirst({
      where: eq(goals.goalId, parseInt(goalId, 10)),
    });

    if (!goalToDelete) {
      return reply.status(404).send({ error: "Goal not found" });
    }

    // Check user access to the site
    const userHasAccessToSite = await getUserHasAccessToSite(request, goalToDelete.siteId.toString());

    if (!userHasAccessToSite) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    // Delete the goal
    const result = await db
      .delete(goals)
      .where(eq(goals.goalId, parseInt(goalId, 10)))
      .returning({ deleted: goals.goalId });

    if (!result || result.length === 0) {
      return reply.status(500).send({ error: "Failed to delete goal" });
    }

    return reply.send({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return reply.status(500).send({ error: "Failed to delete goal" });
  }
}
