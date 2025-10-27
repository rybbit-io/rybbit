import { and, eq, sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { funnels as funnelsTable, projects, projectFunnels, projectFunnelSteps } from "../../../db/postgres/schema.js";

export async function getFunnels(
  request: FastifyRequest<{
    Params: {
      site: string;
    };
  }>,
  reply: FastifyReply
) {
  const { site } = request.params;

  try {
    // Fetch old-style funnels for the site
    const oldFunnelRecords = await db
      .select()
      .from(funnelsTable)
      .where(eq(funnelsTable.siteId, Number(site)))
      .orderBy(funnelsTable.createdAt);

    // Transform old funnels to frontend-friendly structure
    const oldFunnels = oldFunnelRecords.map(record => {
      const data = record.data as any;
      return {
        id: record.reportId,
        name: data.name || "Unnamed Funnel",
        steps: data.steps || [],
        configuration: data.configuration || {},
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        conversionRate: data.lastResult?.conversionRate || null,
        totalVisitors: data.lastResult?.totalVisitors || null,
      };
    });

    // Fetch API v1 funnels (project-based) linked to this site
    const projectsForSite = await db
      .select()
      .from(projects)
      .where(sql`${projects.metadata}->>'siteId' = ${site}`);

    let v1Funnels: any[] = [];

    if (projectsForSite.length > 0) {
      const projectIds = projectsForSite.map(p => p.id);

      // Fetch project funnels with their steps
      const projectFunnelsData = await db
        .select({
          funnel: projectFunnels,
          step: projectFunnelSteps,
        })
        .from(projectFunnels)
        .leftJoin(projectFunnelSteps, eq(projectFunnels.id, projectFunnelSteps.funnelId))
        .where(
          and(
            sql`${projectFunnels.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`,
            eq(projectFunnels.isActive, true)
          )
        )
        .orderBy(projectFunnels.createdAt, projectFunnelSteps.stepOrder);

      // Group steps by funnel
      const funnelMap = new Map<string, any>();

      for (const row of projectFunnelsData) {
        const funnelId = row.funnel.id;

        if (!funnelMap.has(funnelId)) {
          funnelMap.set(funnelId, {
            id: `v1_${funnelId}`, // Prefix with v1_ to distinguish from old funnels
            name: row.funnel.name,
            steps: [],
            configuration: {},
            createdAt: row.funnel.createdAt,
            updatedAt: row.funnel.updatedAt,
            conversionRate: null,
            totalVisitors: null,
            isV1: true, // Flag to indicate this is an API v1 funnel
          });
        }

        if (row.step) {
          const funnel = funnelMap.get(funnelId);
          funnel.steps.push({
            type: row.step.stepType || "page",
            value: row.step.stepType === "event" ? row.step.eventName : row.step.pagePattern,
            name: row.step.name,
            hostname: null,
            eventPropertyKey: row.step.eventPropertyKey,
            eventPropertyValue: row.step.eventPropertyValue,
          });
        }
      }

      v1Funnels = Array.from(funnelMap.values());
    }

    // Merge old and v1 funnels
    const allFunnels = [...oldFunnels, ...v1Funnels];

    return reply.send({ data: allFunnels });
  } catch (error) {
    console.error("Error fetching funnels:", error);
    return reply.status(500).send({ error: "Failed to fetch funnels" });
  }
}
