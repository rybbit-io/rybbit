import { FastifyReply, FastifyRequest } from "fastify";
import { DISABLE_SIGNUP } from "../../lib/const.js";
import { SiteLifecycleError, siteConfigurationLifecycle } from "../../services/sites/siteConfigurationLifecycle.js";

/**
 * Public. Creates a site for a domain before the visitor has an account. The
 * response carries the private link key, which is the only credential for the
 * new dashboard until the site is claimed. Rate limited per IP at the route.
 */
export async function createUnclaimedSite(
  request: FastifyRequest<{ Body: { domain?: unknown } }>,
  reply: FastifyReply
) {
  if (DISABLE_SIGNUP) {
    return reply.status(403).send({ error: "Signup is disabled" });
  }

  const domain = request.body?.domain;
  if (typeof domain !== "string" || domain.trim().length === 0 || domain.length > 253) {
    return reply.status(400).send({ error: "Domain is required" });
  }

  try {
    const site = await siteConfigurationLifecycle.createUnclaimed({ domain });

    return reply.status(201).send({
      id: site.id,
      siteId: site.siteId,
      domain: site.domain,
      privateLinkKey: site.privateLinkKey,
      claimExpiresAt: site.claimExpiresAt,
    });
  } catch (error) {
    if (error instanceof SiteLifecycleError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    request.log.error({ err: error }, "Error creating unclaimed site");
    return reply.status(500).send({ error: "Internal server error" });
  }
}
