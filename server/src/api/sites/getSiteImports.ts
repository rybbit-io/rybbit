import { FastifyReply, FastifyRequest } from "fastify";
import { getImportsForSite } from "../../services/import/importStatusManager.js";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { organization, sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getBestSubscription } from "../../lib/subscriptionUtils.js";
import { IS_CLOUD } from "../../lib/const.js";

const getSiteImportsRequestSchema = z
  .object({
    params: z.object({
      siteId: z.coerce.number().int().positive(),
    }),
  })
  .strict();

type GetSiteImportsRequest = {
  Params: z.infer<typeof getSiteImportsRequestSchema.shape.params>;
};

export async function getSiteImports(request: FastifyRequest<GetSiteImportsRequest>, reply: FastifyReply) {
  try {
    const parsed = getSiteImportsRequestSchema.safeParse({
      params: request.params,
    });

    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation error" });
    }

    const { siteId } = parsed.data.params;

    if (IS_CLOUD) {
      const [siteRecord] = await db
        .select({
          organizationId: sites.organizationId,
          stripeCustomerId: organization.stripeCustomerId,
        })
        .from(sites)
        .leftJoin(organization, eq(sites.organizationId, organization.id))
        .where(eq(sites.siteId, siteId))
        .limit(1);

      if (siteRecord.organizationId) {
        const subscription = await getBestSubscription(siteRecord.organizationId, siteRecord.stripeCustomerId);

        if (subscription.source === "free") {
          return reply.status(403).send({
            error: "Data import is not available on the free plan. Please upgrade to a paid plan.",
          });
        }
      }
    }

    const imports = await getImportsForSite(siteId);

    return reply.send({
      data: imports.map(
        ({ importId, platform, importedEvents, skippedEvents, invalidEvents, startedAt, completedAt }) => ({
          importId,
          platform,
          importedEvents,
          skippedEvents,
          invalidEvents,
          startedAt,
          completedAt,
        })
      ),
    });
  } catch (error) {
    console.error("Error fetching imports:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
