import { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { experiments } from "../../db/postgres/schema.js";
import { experimentUpdateSchema, type ExperimentUpdate } from "./schemas.js";
import {
  getDuplicateExperimentMessage,
  getExperimentWithRelations,
  parseExperimentId,
  parseSiteId,
  serializeExperiment,
  timestampsForStatus,
  validateExperimentReferences,
} from "./utils.js";

export async function updateExperiment(
  request: FastifyRequest<{
    Params: { siteId: string; experimentId: string };
    Body: ExperimentUpdate;
  }>,
  reply: FastifyReply
) {
  try {
    const siteId = parseSiteId(request.params.siteId, reply);
    if (!siteId) return;

    const experimentId = parseExperimentId(request.params.experimentId, reply);
    if (!experimentId) return;

    const existing = await db.query.experiments.findFirst({
      where: and(eq(experiments.siteId, siteId), eq(experiments.experimentId, experimentId)),
    });

    if (!existing) {
      return reply.status(404).send({ error: "Experiment not found" });
    }

    const body = experimentUpdateSchema.parse(request.body);

    if (body.featureFlagId !== undefined || body.primaryGoalId !== undefined) {
      const references = await validateExperimentReferences(siteId, {
        featureFlagId: body.featureFlagId ?? existing.featureFlagId,
        primaryGoalId: body.primaryGoalId === undefined ? existing.primaryGoalId : body.primaryGoalId,
      });

      if ("error" in references) {
        return reply.status(400).send({ error: references.error });
      }
    }

    const updateData: Partial<typeof experiments.$inferInsert> = {
      ...body,
      description: body.description === undefined ? undefined : body.description || null,
      hypothesis: body.hypothesis === undefined ? undefined : body.hypothesis || null,
      primaryGoalId: body.primaryGoalId === undefined ? undefined : body.primaryGoalId,
      winningVariant: body.winningVariant === undefined ? undefined : body.winningVariant || null,
      updatedAt: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      Object.assign(updateData, timestampsForStatus(body.status, existing));
    }

    const [updated] = await db
      .update(experiments)
      .set(updateData)
      .where(and(eq(experiments.siteId, siteId), eq(experiments.experimentId, experimentId)))
      .returning({ experimentId: experiments.experimentId });

    const record = await getExperimentWithRelations(siteId, updated.experimentId);
    return reply.send({ success: true, data: record ? serializeExperiment(record) : updated });
  } catch (error) {
    const duplicateMessage = getDuplicateExperimentMessage(error);
    if (duplicateMessage) {
      return reply.status(409).send({ error: duplicateMessage });
    }
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    return reply.status(500).send({ error: "Failed to update experiment" });
  }
}
