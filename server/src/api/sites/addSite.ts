import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { IS_CLOUD } from "../../lib/const.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";

export async function addSite(
  request: FastifyRequest<{
    Params: {
      organizationId: string;
    };
    Body: {
      domain: string;
      name: string;
      public?: boolean;
      saltUserIds?: boolean;
      blockBots?: boolean;
      excludedIPs?: string[];
      excludedCountries?: string[];
      sessionReplay?: boolean;
      webVitals?: boolean;
      trackErrors?: boolean;
      trackOutbound?: boolean;
      trackUrlParams?: boolean;
      trackInitialPageView?: boolean;
      trackSpaNavigation?: boolean;
      trackIp?: boolean;
      trackButtonClicks?: boolean;
      trackCopy?: boolean;
      trackFormInteractions?: boolean;
      tags?: string[];
    };
  }>,
  reply: FastifyReply
) {
  const { organizationId } = request.params;
  const {
    domain,
    name,
    public: isPublic,
    saltUserIds,
    blockBots,
    excludedIPs,
    excludedCountries,
    sessionReplay,
    webVitals,
    trackErrors,
    trackOutbound,
    trackUrlParams,
    trackInitialPageView,
    trackSpaNavigation,
    trackIp,
    trackButtonClicks,
    trackCopy,
    trackFormInteractions,
    tags,
  } = request.body;

  // Strip protocol and trailing slash before validation
  const cleanedDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  // Validate domain format using regex
  const domainRegex = /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+\p{L}{2,}$/u;
  if (!domainRegex.test(cleanedDomain)) {
    return reply.status(400).send({
      error: "Invalid domain format. Must be a valid domain like example.com or sub.example.com",
    });
  }

  try {
    const userId = request.user?.id;

    if (IS_CLOUD) {
      const subscription = await getSubscriptionInner(organizationId);

      if (sessionReplay && !subscription?.planName.includes("pro")) {
        return reply.status(403).send({
          error: "Session replay requires a Pro subscription",
        });
      }

      const standardFeatures = { webVitals, trackErrors, trackButtonClicks, trackCopy, trackFormInteractions };
      const requestedStandard = Object.entries(standardFeatures).filter(([, v]) => v);
      if (requestedStandard.length > 0 && subscription?.status !== "active") {
        return reply.status(403).send({
          error: `The following features require an active subscription: ${requestedStandard.map(([k]) => k).join(", ")}`,
        });
      }

      // Enforce site limit
      const siteLimit = subscription?.siteLimit ?? null;
      if (siteLimit !== null) {
        const existingSites = await db
          .select({ siteId: sites.siteId })
          .from(sites)
          .where(eq(sites.organizationId, organizationId));
        if (existingSites.length >= siteLimit) {
          return reply.status(403).send({
            error: `You have reached the limit of ${siteLimit} website${siteLimit === 1 ? "" : "s"} for your plan. Please upgrade to add more.`,
          });
        }
      }
    }

    const id = randomBytes(6).toString("hex");

    // Create the new site
    const newSite = await db
      .insert(sites)
      .values({
        id,
        domain: cleanedDomain,
        name,
        createdBy: userId,
        organizationId,
        public: isPublic || false,
        saltUserIds: saltUserIds || false,
        blockBots: blockBots === undefined ? true : blockBots,
        ...(excludedIPs !== undefined && { excludedIPs }),
        ...(excludedCountries !== undefined && { excludedCountries }),
        ...(sessionReplay !== undefined && { sessionReplay }),
        ...(webVitals !== undefined && { webVitals }),
        ...(trackErrors !== undefined && { trackErrors }),
        ...(trackOutbound !== undefined && { trackOutbound }),
        ...(trackUrlParams !== undefined && { trackUrlParams }),
        ...(trackInitialPageView !== undefined && { trackInitialPageView }),
        ...(trackSpaNavigation !== undefined && { trackSpaNavigation }),
        ...(trackIp !== undefined && { trackIp }),
        ...(trackButtonClicks !== undefined && { trackButtonClicks }),
        ...(trackCopy !== undefined && { trackCopy }),
        ...(trackFormInteractions !== undefined && { trackFormInteractions }),
        ...(tags !== undefined && { tags }),
      })
      .returning();

    return reply.status(201).send(newSite[0]);
  } catch (error) {
    console.error("Error adding site:", error);
    return reply.status(500).send({
      error: "Internal server error",
    });
  }
}
