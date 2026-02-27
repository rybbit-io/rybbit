import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { updateImportProgress, completeImport, getImportById } from "../../services/import/importStatusManager.js";
import { UmamiEvent, UmamiImportMapper } from "../../services/import/mappings/umami.js";
import { SimpleAnalyticsEvent, SimpleAnalyticsImportMapper } from "../../services/import/mappings/simpleAnalytics.js";
import { importQuotaManager } from "../../services/import/importQuotaManager.js";
import { db } from "../../db/postgres/postgres.js";
import { organization, sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getBestSubscription } from "../../lib/subscriptionUtils.js";
import { IS_CLOUD } from "../../lib/const.js";

const batchImportRequestSchema = z
  .object({
    params: z.object({
      siteId: z.coerce.number().int().positive(),
      importId: z.string().uuid(),
    }),
    body: z.object({
      events: z.union([
        z.array(UmamiImportMapper.umamiEventKeyOnlySchema),
        z.array(SimpleAnalyticsImportMapper.simpleAnalyticsEventKeyOnlySchema),
      ]),
      isLastBatch: z.boolean().optional(),
    }),
  })
  .strict();

type BatchImportRequest = {
  Params: z.infer<typeof batchImportRequestSchema.shape.params>;
  Body: z.infer<typeof batchImportRequestSchema.shape.body>;
};

export async function batchImportEvents(request: FastifyRequest<BatchImportRequest>, reply: FastifyReply) {
  try {
    const parsed = batchImportRequestSchema.safeParse({
      params: request.params,
      body: request.body,
    });

    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation error" });
    }

    const { siteId, importId } = parsed.data.params;
    const { events, isLastBatch } = parsed.data.body;

    const importRecord = await getImportById(importId);
    if (!importRecord) {
      return reply.status(404).send({ error: "Import not found" });
    }

    if (importRecord.siteId !== siteId) {
      return reply.status(400).send({ error: "Import does not belong to this site" });
    }

    const [siteRecord] = await db
      .select({
        organizationId: sites.organizationId,
        stripeCustomerId: organization.stripeCustomerId,
      })
      .from(sites)
      .leftJoin(organization, eq(sites.organizationId, organization.id))
      .where(eq(sites.siteId, siteId))
      .limit(1);

    if (!siteRecord || !siteRecord.organizationId) {
      return reply.status(404).send({ error: "Site not found" });
    }

    if (IS_CLOUD) {
      const subscription = await getBestSubscription(siteRecord.organizationId, siteRecord.stripeCustomerId);

      if (subscription.source === "free") {
        return reply.status(403).send({
          error: "Data import is not available on the free plan. Please upgrade to a paid plan.",
        });
      }
    }

    try {
      const quotaTracker = await importQuotaManager.getTracker(siteRecord.organizationId);

      let transformedEvents;
      if (importRecord.platform === "umami") {
        transformedEvents = UmamiImportMapper.transform(events as UmamiEvent[], siteId, importId);
      } else if (importRecord.platform === "simple_analytics") {
        transformedEvents = SimpleAnalyticsImportMapper.transform(events as SimpleAnalyticsEvent[], siteId, importId);
      } else {
        return reply.status(400).send({ error: "Unsupported platform" });
      }
      const invalidEventCount = events.length - transformedEvents.length;

      const timestamps = transformedEvents.map(e => e.timestamp);
      const allowedIndices = quotaTracker.canImportBatch(timestamps);

      const eventsWithinQuota = allowedIndices.map(i => transformedEvents[i]);
      const skippedDueToQuota = transformedEvents.length - eventsWithinQuota.length;

      if (eventsWithinQuota.length > 0) {
        await clickhouse.insert({
          table: "events",
          values: eventsWithinQuota,
          format: "JSONEachRow",
        });
      }

      await updateImportProgress(importId, eventsWithinQuota.length, skippedDueToQuota, invalidEventCount);

      if (isLastBatch) {
        await completeImport(importId);
        importQuotaManager.completeImport(siteRecord.organizationId);
      }

      return reply.send();
    } catch (insertError) {
      const errorMessage = insertError instanceof Error ? insertError.message : "Unknown error";
      console.error("Failed to insert events:", errorMessage);

      if (isLastBatch) {
        await completeImport(importId);
        importQuotaManager.completeImport(siteRecord.organizationId);
      }

      return reply.status(500).send({
        error: `Failed to insert events: ${errorMessage}`,
      });
    }
  } catch (error) {
    console.error("Error importing events", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
