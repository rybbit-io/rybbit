import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { organization, sites } from "../../db/postgres/schema.js";
import { applySiteMove } from "../sites/applySiteMove.js";

const adminMoveSiteSchema = z.object({
  organizationId: z.string().min(1),
});

/**
 * Moves a site to any organization. Restricted to system admins via the
 * `adminOnly` middleware, so it intentionally skips the per-organization
 * admin/owner and site-limit checks that the org-scoped move endpoint enforces.
 */
export async function adminMoveSite(
  request: FastifyRequest<{ Params: { siteId: string }; Body: { organizationId: string } }>,
  reply: FastifyReply
) {
  const siteId = parseInt(request.params.siteId, 10);
  if (isNaN(siteId) || siteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID: must be a positive integer" });
  }

  const validation = adminMoveSiteSchema.safeParse(request.body);
  if (!validation.success) {
    return reply.status(400).send({ error: "Invalid request data", details: validation.error.flatten() });
  }

  const targetOrganizationId = validation.data.organizationId;

  try {
    const site = await db.query.sites.findFirst({ where: eq(sites.siteId, siteId) });
    if (!site) {
      return reply.status(404).send({ error: "Site not found" });
    }

    if (site.organizationId === targetOrganizationId) {
      return reply.status(400).send({ error: "Site is already in this organization" });
    }

    const targetOrg = await db.query.organization.findFirst({
      where: eq(organization.id, targetOrganizationId),
    });
    if (!targetOrg) {
      return reply.status(404).send({ error: "Target organization not found" });
    }

    await applySiteMove(siteId, site.organizationId, targetOrganizationId);

    return reply.status(200).send({ success: true, organizationId: targetOrganizationId });
  } catch (error) {
    request.log.error({ err: error }, "Error moving site (admin)");
    return reply.status(500).send({ error: "Failed to move site" });
  }
}
