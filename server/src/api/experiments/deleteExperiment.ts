import { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { experiments } from "../../db/postgres/schema.js";
import { parseExperimentId, parseSiteId } from "./utils.js";

export async function deleteExperiment(
  request: FastifyRequest<{
    Params: { siteId: string; experimentId: string };
  }>,
  reply: FastifyReply
) {
  const siteId = parseSiteId(request.params.siteId, reply);
  if (!siteId) return;

  const experimentId = parseExperimentId(request.params.experimentId, reply);
  if (!experimentId) return;

  const [deleted] = await db
    .delete(experiments)
    .where(and(eq(experiments.siteId, siteId), eq(experiments.experimentId, experimentId)))
    .returning({ experimentId: experiments.experimentId });

  if (!deleted) {
    return reply.status(404).send({ error: "Experiment not found" });
  }

  return reply.send({ success: true });
}
