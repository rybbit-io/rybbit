import { eq, inArray } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { member, sites, user } from "../../db/postgres/schema.js";
import { getIsUserAdmin } from "../../lib/auth-utils.js";
import { logger } from "../../lib/logger/logger.js";
import { getOrganizationSubscriptions } from "../../services/admin/subscriptionService.js";

// Define event count result type
interface EventCountResult {
  site_id: string;
  total_events: number;
}

export interface AdminOrganizationData {
  id: string;
  name: string;
  createdAt: string;
  monthlyEventCount: number;
  overMonthlyLimit: boolean;
  subscription: {
    id: string | null;
    planName: string;
    status: string;
    eventLimit: number;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
    interval?: string;
  };
  sites: {
    siteId: number;
    name: string;
    domain: string;
    createdAt: string;
    eventsLast24Hours: number;
  }[];
  members: {
    userId: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

export async function getAdminOrganizations(request: FastifyRequest, reply: FastifyReply) {
  const isAdmin = await getIsUserAdmin(request);

  if (!isAdmin) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    // Get all organizations with their basic data
    const organizationsData = await db.query.organization.findMany({
      orderBy: (organization, { desc }) => [desc(organization.createdAt)],
    });

    // Get all members for all organizations
    const allMembers = await db
      .select({
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id));

    // Create map of organization IDs to their members
    const orgMembersMap = new Map<string, any[]>();
    for (const memberData of allMembers) {
      if (!orgMembersMap.has(memberData.organizationId)) {
        orgMembersMap.set(memberData.organizationId, []);
      }
      orgMembersMap.get(memberData.organizationId)?.push({
        userId: memberData.userId,
        name: memberData.userName,
        email: memberData.userEmail,
        role: memberData.role,
        createdAt: memberData.createdAt,
      });
    }

    // Get all sites for all organizations
    const allOrgIds = organizationsData.map((org) => org.id);
    const orgSites = await db
      .select({
        siteId: sites.siteId,
        name: sites.name,
        domain: sites.domain,
        createdAt: sites.createdAt,
        organizationId: sites.organizationId,
      })
      .from(sites)
      .where(allOrgIds.length > 0 ? inArray(sites.organizationId, allOrgIds) : undefined);

    // Get event counts for the past 24 hours from ClickHouse
    const now = DateTime.now();
    const yesterday = now.minus({ hours: 24 });

    let siteEventMap = new Map<number, number>();

    try {
      const eventCountsResult = await clickhouse.query({
        query: `
          SELECT 
            site_id,
            sum(event_count) as total_events
          FROM 
            hourly_events_by_site_mv_target
          WHERE 
            event_hour >= toDateTime('${yesterday.toFormat("yyyy-MM-dd HH:mm:ss")}') AND
            event_hour <= toDateTime('${now.toFormat("yyyy-MM-dd HH:mm:ss")}')
          GROUP BY 
            site_id
        `,
        format: "JSONEachRow",
      });

      const rawEventCounts = await eventCountsResult.json();
      const eventCounts = rawEventCounts as EventCountResult[];

      for (const event of eventCounts) {
        siteEventMap.set(Number(event.site_id), event.total_events);
      }
    } catch (clickhouseError) {
      logger.warn(clickhouseError as Error, "ClickHouse query failed, continuing without event counts");
    }

    // Create map of organization IDs to their sites with event counts
    const orgSitesMap = new Map<string, any[]>();
    for (const site of orgSites) {
      if (site.organizationId) {
        if (!orgSitesMap.has(site.organizationId)) {
          orgSitesMap.set(site.organizationId, []);
        }
        orgSitesMap.get(site.organizationId)?.push({
          siteId: site.siteId,
          name: site.name,
          domain: site.domain,
          createdAt: site.createdAt,
          eventsLast24Hours: siteEventMap.get(site.siteId) || 0,
        });
      }
    }

    // Get subscription data for organizations
    const orgSubscriptionMap = await getOrganizationSubscriptions(organizationsData, true);

    // Build the final response with subscription data
    const enrichedOrganizations: AdminOrganizationData[] = organizationsData.map((org) => {
      const subscriptionData = orgSubscriptionMap.get(org.id)!; // Non-null assertion since service always returns data

      return {
        id: org.id,
        name: org.name,
        createdAt: org.createdAt,
        monthlyEventCount: org.monthlyEventCount || 0,
        overMonthlyLimit: org.overMonthlyLimit || false,
        subscription: subscriptionData,
        sites: orgSitesMap.get(org.id) || [],
        members: orgMembersMap.get(org.id) || [],
      };
    });

    return reply.status(200).send(enrichedOrganizations);
  } catch (error) {
    console.error("Get Admin Organizations Error:", error);
    return reply.status(500).send({
      error: "Failed to fetch organizations data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
