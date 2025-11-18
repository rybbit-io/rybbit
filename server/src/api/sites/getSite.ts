import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { getUserHasAdminAccessToSite } from "../../lib/auth-utils.js";

interface GetSiteParams {
  Params: {
    id: string;
  };
}

export async function getSite(request: FastifyRequest<GetSiteParams>, reply: FastifyReply) {
  const { id } = request.params;

  try {
    // Get site info
    const site = await db.query.sites.findFirst({
      where: eq(sites.siteId, Number(id)),
    });

    if (!site) {
      return reply.status(404).send({ error: "Site not found" });
    }

    // Check if user has admin access
    const isOwner = await getUserHasAdminAccessToSite(request, site.siteId);

    return reply.status(200).send({
      id: site.id,
      siteId: site.siteId,
      name: site.name,
      domain: site.domain,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      createdBy: site.createdBy,
      organizationId: site.organizationId,
      saltUserIds: site.saltUserIds,
      public: site.public,
      blockBots: site.blockBots,
      trackIp: site.trackIp,
      isOwner: isOwner,
      // Analytics features
      sessionReplay: site.sessionReplay,
      webVitals: site.webVitals,
      trackErrors: site.trackErrors,
      trackOutbound: site.trackOutbound,
      trackUrlParams: site.trackUrlParams,
      trackInitialPageView: site.trackInitialPageView,
      trackSpaNavigation: site.trackSpaNavigation,
    });
  } catch (error) {
    console.error("Error retrieving site:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
