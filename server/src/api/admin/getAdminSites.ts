import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { member, user } from "../../db/postgres/schema.js";
import { getIsUserAdmin } from "../../lib/auth-utils.js";
import { getOrganizationSubscriptions } from "../../services/admin/subscriptionService.js";

// Define event count result type
interface EventCountResult {
  site_id: string;
  total_events: number;
}

export async function getAdminSites(request: FastifyRequest, reply: FastifyReply) {
  const isAdmin = await getIsUserAdmin(request);

  if (!isAdmin) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  // Get all sites (including organizationId for owner lookup)
  const sitesData = await db.query.sites.findMany({
    orderBy: (sites, { desc }) => [desc(sites.createdAt)],
  });

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

  // Get organizations and their subscription data
  const organizationsData = await db.query.organization.findMany();
  const orgSubscriptionMap = await getOrganizationSubscriptions(organizationsData, false);

  // Get event counts for the past 24 hours and 30 days from Clickhouse
  const now = DateTime.now();
  const yesterday = now.minus({ hours: 24 });
  const thirtyDaysAgo = now.minus({ days: 30 });

  // Get 24h event counts
  const eventCounts24hResult = await clickhouse.query({
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

  // Get 30d event counts
  const eventCounts30dResult = await clickhouse.query({
    query: `
      SELECT 
        site_id,
        sum(event_count) as total_events
      FROM 
        hourly_events_by_site_mv_target
      WHERE 
        event_hour >= toDateTime('${thirtyDaysAgo.toFormat("yyyy-MM-dd HH:mm:ss")}') AND
        event_hour <= toDateTime('${now.toFormat("yyyy-MM-dd HH:mm:ss")}')
      GROUP BY 
        site_id
    `,
    format: "JSONEachRow",
  });

  const rawEventCounts24h = await eventCounts24hResult.json();
  const rawEventCounts30d = await eventCounts30dResult.json();

  // Create maps of site IDs to event counts
  const siteEventMap24h = new Map<number, number>();
  const siteEventMap30d = new Map<number, number>();

  // Type assertion for the events data
  const eventCounts24h = rawEventCounts24h as EventCountResult[];
  const eventCounts30d = rawEventCounts30d as EventCountResult[];

  for (const event of eventCounts24h) {
    siteEventMap24h.set(Number(event.site_id), event.total_events);
  }

  for (const event of eventCounts30d) {
    siteEventMap30d.set(Number(event.site_id), event.total_events);
  }

  // Combine all data
  const enrichedSites = sitesData.map(site => {
    const subscription = site.organizationId
      ? orgSubscriptionMap.get(site.organizationId)
      : { planName: "free", status: "free" };

    return {
      siteId: site.siteId,
      domain: site.domain,
      createdAt: site.createdAt,
      public: site.public,
      eventsLast24Hours: siteEventMap24h.get(site.siteId) || 0,
      eventsLast30Days: siteEventMap30d.get(site.siteId) || 0,
      organizationOwnerEmail: site.organizationId ? orgOwnerMap.get(site.organizationId) : null,
      subscription: {
        planName: subscription?.planName || "free",
        status: subscription?.status || "free",
      },
    };
  });

  return reply.status(200).send(enrichedSites);
}
