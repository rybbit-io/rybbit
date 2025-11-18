import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { funnels as funnelsTable } from "../../../db/postgres/schema.js";

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
    // Fetch all funnels for the site
    const funnelRecords = await db
      .select()
      .from(funnelsTable)
      .where(eq(funnelsTable.siteId, Number(site)))
      .orderBy(funnelsTable.createdAt);

    // Transform the records to a more frontend-friendly structure
    const funnels = funnelRecords.map(record => {
      const data = record.data as any;
      return {
        id: record.reportId,
        name: data.name || "Unnamed Funnel",
        steps: data.steps || [],
        configuration: data.configuration || {},
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        // Include any additional analytics data that might be stored
        conversionRate: data.lastResult?.conversionRate || null,
        totalVisitors: data.lastResult?.totalVisitors || null,
      };
    });

    return reply.send({ data: funnels });
  } catch (error) {
    console.error("Error fetching funnels:", error);
    return reply.status(500).send({ error: "Failed to fetch funnels" });
  }
}
