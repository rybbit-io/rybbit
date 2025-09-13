import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { agentRegions } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";

export async function getRegions(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const session = await getSessionFromReq(request);
  const userId = session?.user?.id;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    // Get all enabled regions
    const regions = await db
      .select({
        code: agentRegions.code,
        name: agentRegions.name,
        enabled: agentRegions.enabled,
        isHealthy: agentRegions.isHealthy,
        lastHealthCheck: agentRegions.lastHealthCheck,
      })
      .from(agentRegions)
      .where(eq(agentRegions.enabled, true))
      .orderBy(agentRegions.code);

    // Format response
    const formattedRegions = regions.map(region => ({
      code: region.code,
      name: region.name,
      isHealthy: region.isHealthy ?? true,
      lastHealthCheck: region.lastHealthCheck,
      isLocal: region.code === 'local',
    }));

    return reply.send({
      regions: formattedRegions,
    });
  } catch (error) {
    console.error("Error fetching regions:", error);
    return reply.status(500).send({ error: "Failed to fetch regions" });
  }
}