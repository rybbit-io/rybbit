import { isAdminRole, permissionsForRole } from "@rybbit/shared";
import { eq } from "drizzle-orm";
import { FastifyRequest, FastifyReply } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { organization, team, teamSiteAccess } from "../../db/postgres/schema.js";
import { DEFAULT_EVENT_LIMIT, IS_CLOUD, LITE_DASHBOARD } from "../../lib/const.js";
import { getOrganizationSitesForCaller } from "../../lib/auth-utils.js";
import { processResults } from "../analytics/utils/utils.js";
import { siteRequiresPlan } from "../../lib/subscriptionUtils.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";
import { buildSiteSessionCountsQuery } from "./siteSessionCountsQuery.js";

/** Sessions in the last 24 hours for each of these sites. */
async function getSessionCountMap(siteIds: number[]): Promise<Map<number, number>> {
  const sessionCountMap = new Map<number, number>();
  if (siteIds.length === 0) {
    return sessionCountMap;
  }

  const sessionCountsResult = await clickhouse.query({
    query: buildSiteSessionCountsQuery(LITE_DASHBOARD),
    query_params: { siteIds },
    format: "JSONEachRow",
  });
  const sessionCounts = await processResults(sessionCountsResult);

  if (Array.isArray(sessionCounts)) {
    sessionCounts.forEach((row: any) => {
      if (row && typeof row.site_id === "number" && typeof row.total_sessions === "number") {
        sessionCountMap.set(Number(row.site_id), row.total_sessions);
      }
    });
  }
  return sessionCountMap;
}

export async function getSitesFromOrg(
  req: FastifyRequest<{
    Params: {
      organizationId: string;
    };
  }>,
  res: FastifyReply
) {
  try {
    const { organizationId } = req.params;

    // Four independent reads. The session counts need the site list, so they
    // chain onto it instead of waiting for the subscription lookup (which can
    // call Stripe).
    const [{ sitesData, sessionCountMap }, orgInfo, subscription, teamSiteMappings] = await Promise.all([
      // The organization's sites the caller can reach, each with their role on
      // it — member and team restrictions already applied.
      getOrganizationSitesForCaller(req, organizationId).then(async sitesData => ({
        sitesData,
        sessionCountMap: await getSessionCountMap(sitesData.map(site => site.siteId)),
      })),
      db.select().from(organization).where(eq(organization.id, organizationId)).limit(1),
      // Self-hosted instances have no plan and unlimited events.
      IS_CLOUD ? getSubscriptionInner(organizationId) : null,
      // Team info for all sites in this org
      db
        .select({
          siteId: teamSiteAccess.siteId,
          teamId: team.id,
          teamName: team.name,
        })
        .from(teamSiteAccess)
        .innerJoin(team, eq(teamSiteAccess.teamId, team.id))
        .where(eq(team.organizationId, organizationId)),
    ]);

    const monthlyEventCount = subscription?.monthlyEventCount || 0;
    const eventLimit = IS_CLOUD ? subscription?.eventLimit || DEFAULT_EVENT_LIMIT : Infinity;

    const siteTeamMap = new Map<number, { id: string; name: string }[]>();
    for (const mapping of teamSiteMappings) {
      const existing = siteTeamMap.get(mapping.siteId) || [];
      existing.push({ id: mapping.teamId, name: mapping.teamName });
      siteTeamMap.set(mapping.siteId, existing);
    }

    // Enhance sites data with session counts and subscription info.
    // apiKey and privateLinkKey are secrets (ingestion auth / private-link
    // dashboard access) and must not be exposed to org members here — the
    // client reads them from the admin-gated per-site endpoints instead.
    const enhancedSitesData = sitesData.map(({ apiKey, privateLinkKey, accessRole, ...site }) => ({
      ...site,
      type: site.type || "web",
      domain: site.domain || "",
      sessionsLast24Hours: sessionCountMap.get(site.siteId) || 0,
      isOwner: isAdminRole(accessRole),
      // The caller's role on this site and what it allows (a bearer
      // credential's scopes may narrow that further).
      role: accessRole,
      permissions: permissionsForRole(accessRole),
      teams: siteTeamMap.get(site.siteId) || [],
      requiresPlan: siteRequiresPlan(subscription, site.createdAt),
    }));

    // Sort by sessions descending
    enhancedSitesData.sort((a, b) => b.sessionsLast24Hours - a.sessionsLast24Hours);

    return res.status(200).send({
      organization: orgInfo[0] || null,
      // The caller's role in the organization, from the route guard.
      role: req.accessRole ?? null,
      permissions: permissionsForRole(req.accessRole),
      sites: enhancedSitesData,
      subscription: {
        monthlyEventCount,
        eventLimit,
        overMonthlyLimit: monthlyEventCount > eventLimit,
        planName: subscription?.planName || "free",
        status: subscription?.status || "free",
      },
    });
  } catch (err) {
    req.log.error({ err: err }, "Error in getSitesFromOrg");
    return res.status(500).send({ error: String(err) });
  }
}
