import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getOrgMembership, isOrgAdmin } from "../../lib/access.js";
import { invalidateSitesAccessCache } from "../../lib/auth-utils.js";
import { SiteLifecycleError, siteConfigurationLifecycle } from "../../services/sites/siteConfigurationLifecycle.js";

const claimSiteSchema = z.object({
  privateLinkKey: z.string().regex(/^[a-f0-9]{12}$/i),
  organizationId: z.string().min(1).max(255),
});

/**
 * Moves an unclaimed site into one of the caller's organizations. Requires a
 * session (route guard), org admin/owner membership, and the site's private
 * link key as proof the caller had the dashboard open.
 */
export async function claimSite(
  request: FastifyRequest<{
    Params: { siteId: string };
    Body: { privateLinkKey?: unknown; organizationId?: unknown };
  }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const siteId = Number(request.params.siteId);
  if (!Number.isInteger(siteId) || siteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  const parsed = claimSiteSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "privateLinkKey and organizationId are required" });
  }
  const { privateLinkKey, organizationId } = parsed.data;

  const membership = await getOrgMembership(userId, organizationId);
  if (!isOrgAdmin(membership)) {
    return reply.status(403).send({ error: "You must be an admin of the organization to claim a site into it" });
  }

  try {
    const site = await siteConfigurationLifecycle.claim({ siteId, privateLinkKey, organizationId, userId });
    invalidateSitesAccessCache(userId);

    return reply.status(200).send({
      id: site.id,
      siteId: site.siteId,
      domain: site.domain,
      organizationId: site.organizationId,
    });
  } catch (error) {
    if (error instanceof SiteLifecycleError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    request.log.error({ err: error }, "Error claiming site");
    return reply.status(500).send({ error: "Internal server error" });
  }
}
