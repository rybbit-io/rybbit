import { FastifyReply, FastifyRequest } from "fastify";
import { importQuotaManager } from "../../services/import/importQuotaManager.js";
import { createImport } from "../../services/import/importStatusManager.js";
import { DateTime } from "luxon";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { importPlatforms, organization, sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getBestSubscription } from "../../lib/subscriptionUtils.js";
import { IS_CLOUD } from "../../lib/const.js";

const createSiteImportRequestSchema = z
  .object({
    params: z.object({
      siteId: z.coerce.number().int().positive(),
    }),
    body: z.object({
      platform: z.enum(importPlatforms),
    }),
  })
  .strict();

type CreateSiteImportRequest = {
  Params: z.infer<typeof createSiteImportRequestSchema.shape.params>;
  Body: z.infer<typeof createSiteImportRequestSchema.shape.body>;
};

export async function createSiteImport(request: FastifyRequest<CreateSiteImportRequest>, reply: FastifyReply) {
  try {
    const parsed = createSiteImportRequestSchema.safeParse({
      params: request.params,
      body: request.body,
    });

    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation error" });
    }

    const { siteId } = parsed.data.params;
    const { platform } = parsed.data.body;

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

    if (!importQuotaManager.startImport(organizationId)) {
      return reply.status(429).send({ error: "Only 1 concurrent import allowed per organization" });
    }

    try {
      const quotaTracker = await importQuotaManager.getTracker(organizationId);
      const oldestAllowedMonth = quotaTracker.getOldestAllowedMonth();

      const earliestAllowedDate = DateTime.fromFormat(oldestAllowedMonth + "01", "yyyyMMdd", {
        zone: "utc",
      }).toFormat("yyyy-MM-dd");
      const latestAllowedDate = DateTime.utc().toFormat("yyyy-MM-dd");

      const importRecord = await createImport({
        siteId,
        organizationId,
        platform,
      });

      return reply.send({
        data: {
          importId: importRecord.importId,
          allowedDateRange: {
            earliestAllowedDate,
            latestAllowedDate,
          },
        },
      });
    } catch (error) {
      importQuotaManager.completeImport(organizationId);
      console.error("Error creating import:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  } catch (error) {
    console.error("Error creating import:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
