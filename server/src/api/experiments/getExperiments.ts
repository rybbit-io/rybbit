import { FastifyReply, FastifyRequest } from "fastify";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { experiments, featureFlags, goals } from "../../db/postgres/schema.js";
import { parseSiteId, serializeExperiment } from "./utils.js";

export async function getExperiments(
  request: FastifyRequest<{
    Params: { siteId: string };
  }>,
  reply: FastifyReply
) {
  const siteId = parseSiteId(request.params.siteId, reply);
  if (!siteId) return;

  const rows = await db
    .select({
      experiment: experiments,
      featureFlag: featureFlags,
      primaryGoal: goals,
    })
    .from(experiments)
    .innerJoin(featureFlags, eq(experiments.featureFlagId, featureFlags.flagId))
    .leftJoin(goals, eq(experiments.primaryGoalId, goals.goalId))
    .where(eq(experiments.siteId, siteId))
    .orderBy(desc(experiments.updatedAt));

  return reply.send({
    data: rows.map(serializeExperiment),
  });
}
