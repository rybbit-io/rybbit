import { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { experiments, featureFlags } from "../../db/postgres/schema.js";
import { hasScope, scopeToString } from "../../lib/scopes.js";
import { invalidateFeatureFlagDefinitions } from "../../services/featureFlags/definitions.js";
import { experimentBodySchema, type ExperimentBody } from "./schemas.js";
import {
  ExperimentRequestError,
  flagUpdateForStatusChange,
  getDuplicateExperimentMessage,
  getExperimentWithRelations,
  lockExperimentFlag,
  parseSiteId,
  serializeExperiment,
  timestampsForStatus,
  validateExperimentReferences,
} from "./utils.js";

const FLAGS_WRITE = { resource: "flags", action: "write" } as const;

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

    // Starting an experiment switches its flag on, like the draft-to-running update does.
    // A scoped bearer credential needs flags:write for that, as it does on update.
    const canWriteFlags = !request.bearerAuth || hasScope(request.bearerStatements ?? null, FLAGS_WRITE);

    const { created, flagChanged } = await db.transaction(async tx => {
      const flag = await lockExperimentFlag(tx, siteId, body.featureFlagId);

      const flagUpdate = body.status === "running" ? flagUpdateForStatusChange("draft", "running", flag) : null;
      if (flagUpdate) {
        if (!canWriteFlags) {
          throw new ExperimentRequestError(`Insufficient scope: requires ${scopeToString(FLAGS_WRITE)}`, 403);
        }
        await tx
          .update(featureFlags)
          .set({ ...flagUpdate, version: flag.version + 1, updatedAt: new Date().toISOString() })
          .where(and(eq(featureFlags.siteId, siteId), eq(featureFlags.flagId, flag.flagId)));
      }

      const [row] = await tx
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
      return { created: row, flagChanged: !!flagUpdate };
    });

    if (flagChanged) {
      await invalidateFeatureFlagDefinitions(siteId);
    }

    const record = await getExperimentWithRelations(siteId, created.experimentId);
    return reply.status(201).send({ success: true, data: record ? serializeExperiment(record) : created });
  } catch (error) {
    if (error instanceof ExperimentRequestError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
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
