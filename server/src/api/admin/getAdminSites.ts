import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { member, user } from "../../db/postgres/schema.js";
import { getIsUserAdmin } from "../../lib/auth-utils.js";

// Define event count result type
interface EventCountResult {
  site_id: string;
  total_events: number;
}

export async function getAdminSites(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const isAdmin = await getIsUserAdmin(request);

  if (!isAdmin) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  // Get all sites (including organizationId for owner lookup)
  const sitesData = await db.query.sites.findMany();

  // Get organization owners and their emails
  const orgOwners = await db
    .select({
      organizationId: member.organizationId,
      userId: member.userId,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.role, "owner"));

  // Create map of organization IDs to owner emails
  const orgOwnerMap = new Map();
  for (const owner of orgOwners) {
    orgOwnerMap.set(owner.organizationId, owner.email);
  }

  // Get event counts for the past 24 hours from Clickhouse
  const now = DateTime.now();
  const yesterday = now.minus({ hours: 24 });

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

  // Create map of site IDs to event counts
  const siteEventMap = new Map<number, number>();

  // Type assertion for the events data
  const eventCounts = rawEventCounts as EventCountResult[];
  for (const event of eventCounts) {
    siteEventMap.set(Number(event.site_id), event.total_events);
  }

  // Combine all data
  const enrichedSites = sitesData.map((site) => {
    return {
      siteId: site.siteId,
      domains: site.domains,
      createdAt: site.createdAt,
      public: site.public,
      eventsLast24Hours: siteEventMap.get(site.siteId) || 0,
      organizationOwnerEmail: site.organizationId
        ? orgOwnerMap.get(site.organizationId)
        : null,
    };
  });

  // Sort by events count in descending order
  enrichedSites.sort((a, b) => b.eventsLast24Hours - a.eventsLast24Hours);

  return reply.status(200).send(enrichedSites);
}
