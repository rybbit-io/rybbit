import { eq, desc } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { dashboards } from "../../../db/postgres/schema.js";

export async function getDashboards(
  request: FastifyRequest<{
    Params: {
      siteId: string;
    };
  }>,
  reply: FastifyReply
) {
  const siteId = parseInt(request.params.siteId, 10);
  if (isNaN(siteId) || siteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  try {
    const siteDashboards = await db.query.dashboards.findMany({
      where: eq(dashboards.siteId, siteId),
      orderBy: [desc(dashboards.updatedAt)],
    });

    return reply.send(siteDashboards);
  } catch (error) {
    request.log.error({ err: error }, "Error fetching dashboards");
    return reply.status(500).send({ error: "Failed to fetch dashboards" });
  }
}
