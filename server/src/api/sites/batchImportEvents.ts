import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import {
  updateImportProgress,
  completeImport,
  getImportById,
  withOrganizationImportLock,
} from "../../services/import/importStatusManager.js";
import { UmamiEvent, UmamiImportMapper } from "../../services/import/mappers/umami.js";
import { SimpleAnalyticsEvent, SimpleAnalyticsImportMapper } from "../../services/import/mappers/simpleAnalytics.js";
import { PlausibleEvent, PlausibleImportMapper } from "../../services/import/mappers/plausible.js";
import { ImportQuotaTracker } from "../../services/import/importQuotaTracker.js";
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
        z.array(PlausibleImportMapper.plausibleEventKeyOnlySchema),
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
    const organizationId = siteRecord.organizationId;

    if (IS_CLOUD) {
      const subscription = await getBestSubscription(organizationId, siteRecord.stripeCustomerId);

      if (subscription.source === "free") {
        return reply.status(403).send({
          error: "Data import is not available on the free plan. Please upgrade to a paid plan.",
        });
      }
    }

    let transformedEvents;
    if (importRecord.platform === "umami") {
      transformedEvents = UmamiImportMapper.transform(events as UmamiEvent[], siteId, importId);
    } else if (importRecord.platform === "simple_analytics") {
      transformedEvents = SimpleAnalyticsImportMapper.transform(events as SimpleAnalyticsEvent[], siteId, importId);
    } else if (importRecord.platform === "plausible") {
      transformedEvents = PlausibleImportMapper.transform(events as PlausibleEvent[], siteId, importId);
    } else {
      return reply.status(400).send({ error: "Unsupported platform" });
    }
    const invalidEventCount = events.length - transformedEvents.length;

    try {
      await withOrganizationImportLock(organizationId, async () => {
        const currentImport = await getImportById(importId);
        if (!currentImport || currentImport.completedAt !== null) {
          throw new Error("IMPORT_ALREADY_COMPLETED");
        }

        // Recompute from ClickHouse while holding the cross-worker lock. The
        // tracker is discarded on failure, so reservations cannot leak.
        const quotaTracker = await ImportQuotaTracker.create(organizationId);
        const timestamps = transformedEvents.map(event => event.timestamp);
        const allowedIndices = quotaTracker.canImportBatch(timestamps);
        const eventsWithinQuota = allowedIndices.map(index => transformedEvents[index]);
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
        }
      });

      return reply.send();
    } catch (insertError) {
      const errorMessage = insertError instanceof Error ? insertError.message : "Unknown error";
      console.error("Failed to insert events:", errorMessage);

      if (errorMessage === "IMPORT_ALREADY_COMPLETED") {
        return reply.status(409).send({ error: "Import is already complete" });
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
