import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { member } from "../../db/postgres/schema.js";
import { getSitesUserHasAccessTo } from "../../lib/auth-utils.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";
import { IS_CLOUD, TRIAL_EVENT_LIMIT } from "../../lib/const.js";

export async function getSites(req: FastifyRequest, reply: FastifyReply) {
  try {
    // Get sites the user has access to
    const sitesData = await getSitesUserHasAccessTo(req);

    const enhancedSitesData = await Promise.all(
      sitesData.map(async (site) => {
        let isOwner = false;
        let ownerId = "";

        if (!IS_CLOUD) {
          return {
            ...site,
            monthlyEventCount: 0,
            eventLimit: Infinity,
            overMonthlyLimit: false,
            isOwner: true,
          };
        }
        // Determine ownership if organization ID exists
        if (site.organizationId) {
          const orgOwnerResult = await db
            .select({ userId: member.userId })
            .from(member)
            .where(
              and(
                eq(member.organizationId, site.organizationId),
                eq(member.role, "owner")
              )
            )
            .limit(1);

          if (orgOwnerResult.length > 0) {
            ownerId = orgOwnerResult[0].userId;
            isOwner = ownerId === req.user?.id;
          }
        }

        const subscription = await getSubscriptionInner(ownerId);

        const monthlyEventCount = subscription?.monthlyEventCount || 0;
        const eventLimit = subscription?.eventLimit || TRIAL_EVENT_LIMIT;

        return {
          ...site,
          monthlyEventCount,
          eventLimit,
          overMonthlyLimit: monthlyEventCount > eventLimit,
          isOwner,
        };
      })
    );

    return reply.status(200).send(enhancedSitesData);
  } catch (err) {
    console.error("Error in getSites:", err);
    return reply.status(500).send(String(err));
  }
}
