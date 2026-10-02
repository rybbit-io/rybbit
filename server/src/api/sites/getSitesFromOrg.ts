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

    // The organization's sites the caller can reach, each with their role on
    // it — member and team restrictions already applied.
    const [sitesData, orgInfo] = await Promise.all([
      getOrganizationSitesForCaller(req, organizationId),
      db.select().from(organization).where(eq(organization.id, organizationId)).limit(1),
    ]);

    // Query session counts for the sites
    const sessionCountMap = new Map<number, number>();

    if (sitesData.length > 0) {
      const siteIds = sitesData.map(site => site.siteId);

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
    }

    // Get subscription info
    let subscription = null;
    let monthlyEventCount = 0;
    let eventLimit = DEFAULT_EVENT_LIMIT;

    if (!IS_CLOUD) {
      // Self-hosted version has unlimited events
      eventLimit = Infinity;
    } else {
      subscription = await getSubscriptionInner(organizationId);
      monthlyEventCount = subscription?.monthlyEventCount || 0;
      eventLimit = subscription?.eventLimit || DEFAULT_EVENT_LIMIT;
    }

    // Get team info for all sites in this org
    const teamSiteMappings = await db
      .select({
        siteId: teamSiteAccess.siteId,
        teamId: team.id,
        teamName: team.name,
      })
      .from(teamSiteAccess)
      .innerJoin(team, eq(teamSiteAccess.teamId, team.id))
      .where(eq(team.organizationId, organizationId));

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
