import { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { experiments, featureFlags } from "../../db/postgres/schema.js";
import { hasScope, scopeToString } from "../../lib/scopes.js";
import { invalidateFeatureFlagDefinitions } from "../../services/featureFlags/definitions.js";
import { experimentUpdateSchema, type ExperimentUpdate } from "./schemas.js";
import {
  getDuplicateExperimentMessage,
  getExperimentVariantKeys,
  getExperimentWithRelations,
  parseExperimentId,
  parseSiteId,
  experimentUpdateError,
  flagUpdateForStatusChange,
  serializeExperiment,
  timestampsForStatus,
  validateExperimentReferences,
} from "./utils.js";

const FLAGS_WRITE = { resource: "flags", action: "write" } as const;

/** The experiment or its flag changed between the handler's read and its write. */
class ExperimentConflictError extends Error {}

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

    const updateError = experimentUpdateError(existing, body);
    if (updateError) {
      return reply.status(400).send({ error: updateError });
    }

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

    const isCompleting = body.status === "completed" && existing.status !== "completed";

    let flag: typeof featureFlags.$inferSelect | undefined;
    if (body.status !== undefined && body.status !== existing.status) {
      flag = await db.query.featureFlags.findFirst({
        where: and(
          eq(featureFlags.siteId, siteId),
          eq(featureFlags.flagId, body.featureFlagId ?? existing.featureFlagId)
        ),
      });
      if (!flag) {
        return reply.status(400).send({ error: "Feature flag not found" });
      }
    }

    const winner = body.winningVariant?.trim();
    if (isCompleting && flag) {
      if (!winner) {
        return reply.status(400).send({ error: "Choose the winning variant to roll out" });
      }
      if (!getExperimentVariantKeys(flag).includes(winner)) {
        return reply.status(400).send({ error: `Variant "${winner}" is not part of this experiment's flag` });
      }
    }

    const flagUpdate =
      flag && body.status ? flagUpdateForStatusChange(existing.status, body.status, flag, winner) : null;

    // The route guard only checked experiments:write. A lifecycle change also
    // switches or rolls out the flag, so a scoped bearer credential must hold
    // flags:write too, or it could change serving the flag endpoint would deny it.
    if (flagUpdate && request.bearerAuth && !hasScope(request.bearerStatements ?? null, FLAGS_WRITE)) {
      return reply.status(403).send({ error: "Insufficient scope", required: scopeToString(FLAGS_WRITE) });
    }

    // Validation above ran against `existing` and `flag`. Only write if neither
    // changed since (status and flag version as optimistic locks), so a
    // concurrent edit, lifecycle change or delete rolls the whole update back.
    const updated = await db.transaction(async tx => {
      if (flag && flagUpdate) {
        const flagRows = await tx
          .update(featureFlags)
          .set({ ...flagUpdate, version: flag.version + 1, updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(featureFlags.siteId, siteId),
              eq(featureFlags.flagId, flag.flagId),
              eq(featureFlags.version, flag.version)
            )
          )
          .returning({ flagId: featureFlags.flagId });
        if (flagRows.length === 0) throw new ExperimentConflictError();
      }

      const [row] = await tx
        .update(experiments)
        .set(updateData)
        .where(
          and(
            eq(experiments.siteId, siteId),
            eq(experiments.experimentId, experimentId),
            eq(experiments.status, existing.status)
          )
        )
        .returning({ experimentId: experiments.experimentId });
      if (!row) throw new ExperimentConflictError();
      return row;
    });

    if (flagUpdate) {
      await invalidateFeatureFlagDefinitions(siteId);
    }

    const record = await getExperimentWithRelations(siteId, updated.experimentId);
    return reply.send({ success: true, data: record ? serializeExperiment(record) : updated });
  } catch (error) {
    if (error instanceof ExperimentConflictError) {
      return reply
        .status(409)
        .send({ error: "This experiment or its feature flag changed while saving. Reload and try again." });
    }
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
