import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { funnels as funnelsTable } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";
import { Filter } from "../types.js";

type FunnelStep = {
  value: string;
  name?: string;
  type: "page" | "event";
};

type Funnel = {
  steps: FunnelStep[];
  name: string;
  reportId?: number; // Optional report ID for updates
};

export async function createFunnel(
  request: FastifyRequest<{
    Body: Funnel;
    Params: {
      site: string;
    };
  }>,
  reply: FastifyReply
) {
  const { steps, name, reportId } = request.body;
  const { site } = request.params;
  const userId = request.user?.id;

  // Validate request
  if (!steps || steps.length < 2) {
    return reply.status(400).send({ error: "At least 2 steps are required for a funnel" });
  }

  if (!name) {
    return reply.status(400).send({ error: "Funnel name is required" });
  }

  // Check user access to site
  const userHasAccessToSite = await getUserHasAccessToSite(request, site);
  if (!userHasAccessToSite) {
    return reply.status(403).send({ error: "Forbidden" });
  }

  try {
    let result;

    if (reportId) {
      // Check if the funnel exists and user has access to it
      const existingFunnel = await db.query.funnels.findFirst({
        where: eq(funnelsTable.reportId, reportId),
      });

      if (!existingFunnel) {
        return reply.status(404).send({ error: "Funnel not found" });
      }

      if (existingFunnel.siteId !== Number(site)) {
        return reply.status(403).send({ error: "Funnel does not belong to this site" });
      }

      // Update existing funnel
      result = await db
        .update(funnelsTable)
        .set({
          data: {
            name,
            steps,
          },
          updatedAt: new Date().toISOString(),
        })
        .where(eq(funnelsTable.reportId, reportId))
        .returning({ reportId: funnelsTable.reportId });

      if (!result || result.length === 0) {
        return reply.status(500).send({ error: "Failed to update funnel" });
      }
    } else {
      // Create new funnel
      result = await db
        .insert(funnelsTable)
        .values({
          siteId: Number(site),
          userId,
          data: {
            name,
            steps,
          },
        })
        .returning({ reportId: funnelsTable.reportId });
    }

    return reply.status(201).send({
      success: true,
      funnelId: result[0].reportId,
    });
  } catch (error) {
    console.error("Error creating funnel:", error);
    return reply.status(500).send({ error: "Failed to create funnel" });
  }
}
