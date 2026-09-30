import { claimExpiryIso } from "../../services/sites/claimExpiry.js";
import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { organization, sites } from "../../db/postgres/schema.js";
import { getUserHasAdminAccessToSite } from "../../lib/auth-utils.js";
import { getBestSubscription, siteRequiresPlan } from "../../lib/subscriptionUtils.js";

/**
 * Whether the site is switched off until its organization starts a plan. Sites from before
 * the free plan ended never need one, so only newer sites pay for the subscription lookup.
 */
async function getSiteRequiresPlan(site: { organizationId: string | null; createdAt: string | null }) {
  if (!site.organizationId || !siteRequiresPlan({ status: "free" }, site.createdAt)) {
    return false;
  }
  const [org] = await db
    .select({ stripeCustomerId: organization.stripeCustomerId })
    .from(organization)
    .where(eq(organization.id, site.organizationId))
    .limit(1);
  const subscription = await getBestSubscription(site.organizationId, org?.stripeCustomerId ?? null);
  return siteRequiresPlan(subscription, site.createdAt);
}

interface GetSiteParams {
  Params: {
    siteId: string;
  };
}

export async function getSite(request: FastifyRequest<GetSiteParams>, reply: FastifyReply) {
  const { siteId } = request.params;

  try {
    // Get site info
    const site = await db.query.sites.findFirst({
      where: eq(sites.siteId, Number(siteId)),
    });

    if (!site) {
      return reply.status(404).send({ error: "Site not found" });
    }

    const [isOwner, requiresPlan] = await Promise.all([
      getUserHasAdminAccessToSite(request, site.siteId),
      getSiteRequiresPlan(site),
    ]);

    return reply.status(200).send({
      id: site.id,
      siteId: site.siteId,
      name: site.name,
      type: site.type || "web",
      domain: site.domain || "",
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      createdBy: site.createdBy,
      organizationId: site.organizationId,
      claimExpiresAt: claimExpiryIso(site.claimExpiresAt),
      saltUserIds: site.saltUserIds,
      public: site.public,
      embedEnabled: site.embedEnabled,
      blockBots: site.blockBots,
      firstPartyProxy: site.firstPartyProxy,
      trackIp: site.trackIp,
      isOwner: isOwner,
      requiresPlan,
      // Analytics features
      sessionReplay: site.sessionReplay,
      webVitals: site.webVitals,
      trackErrors: site.trackErrors,
      trackOutbound: site.trackOutbound,
      trackUrlParams: site.trackUrlParams,
      trackInitialPageView: site.trackInitialPageView,
      trackSpaNavigation: site.trackSpaNavigation,
      trackButtonClicks: site.trackButtonClicks,
      trackCopy: site.trackCopy,
      trackFormInteractions: site.trackFormInteractions,
    });
  } catch (error) {
    request.log.error({ err: error }, "Error retrieving site");
    return reply.status(500).send({ error: "Internal server error" });
  }
}
