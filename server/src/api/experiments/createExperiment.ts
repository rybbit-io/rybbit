import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { experiments } from "../../db/postgres/schema.js";
import { experimentBodySchema, type ExperimentBody } from "./schemas.js";
import {
  getDuplicateExperimentMessage,
  getExperimentWithRelations,
  parseSiteId,
  serializeExperiment,
  timestampsForStatus,
  validateExperimentReferences,
} from "./utils.js";

export async function createExperiment(
  request: FastifyRequest<{
    Params: { siteId: string };
    Body: ExperimentBody;
  }>,
  reply: FastifyReply
) {
  try {
    const siteId = parseSiteId(request.params.siteId, reply);
    if (!siteId) return;

    const body = experimentBodySchema.parse(request.body);
    const references = await validateExperimentReferences(siteId, body);

    if ("error" in references) {
      return reply.status(400).send({ error: references.error });
    }

    const [created] = await db
      .insert(experiments)
      .values({
        siteId,
        featureFlagId: body.featureFlagId,
        primaryGoalId: body.primaryGoalId ?? null,
        name: body.name,
        description: body.description || null,
        hypothesis: body.hypothesis || null,
        status: body.status,
        winningVariant: body.winningVariant || null,
        ...timestampsForStatus(body.status),
      })
      .returning({ experimentId: experiments.experimentId });

    const record = await getExperimentWithRelations(siteId, created.experimentId);
    return reply.status(201).send({ success: true, data: record ? serializeExperiment(record) : created });
  } catch (error) {
    const duplicateMessage = getDuplicateExperimentMessage(error);
    if (duplicateMessage) {
      return reply.status(409).send({ error: duplicateMessage });
    }
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    return reply.status(500).send({ error: "Failed to create experiment" });
  }
}
