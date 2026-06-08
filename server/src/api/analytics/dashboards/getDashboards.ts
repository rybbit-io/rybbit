import { eq, desc } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { dashboards } from "../../../db/postgres/schema.js";
import { parsePositiveInteger } from "../../utils/parseParams.js";

export async function getDashboards(
  request: FastifyRequest<{
    Params: {
      siteId: string;
    };
  }>,
  reply: FastifyReply
) {
  const siteId = parsePositiveInteger(request.params.siteId, reply, "Invalid site ID");
  if (siteId === null) return;

  try {
    const siteDashboards = await db.query.dashboards.findMany({
      where: eq(dashboards.siteId, siteId),
      orderBy: [desc(dashboards.updatedAt)],
    });

    return reply.send(siteDashboards);
  } catch (error) {
    console.error("Error fetching dashboards:", error);
    return reply.status(500).send({ error: "Failed to fetch dashboards" });
  }
}
