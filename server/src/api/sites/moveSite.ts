import { higherRole, roleHasPermission } from "@rybbit/shared";
import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { organization, sites } from "../../db/postgres/schema.js";
import { effectiveOrgRole, getOrgMembership } from "../../lib/access.js";
import { getIsUserAdmin } from "../../lib/auth-utils.js";
import { withOrganizationSiteLock } from "../../services/sites/withOrganizationSiteLock.js";
import { applySiteMove, invalidateSiteMoveAccess, lockSiteOwnership } from "./applySiteMove.js";
import { getPlanSiteLimit, targetSiteLimitError } from "./siteLimit.js";

const moveSiteSchema = z.object({
  organizationId: z.string().min(1),
});

/**
 * Moves a site to a different organization.
 *
 * The `adminSite` middleware guarantees the caller is an admin/owner of the
 * site's current organization. Here we additionally require admin/owner access
 * to the target organization before reassigning ownership.
 */
export async function moveSite(
  request: FastifyRequest<{ Params: { siteId: string }; Body: { organizationId: string } }>,
  reply: FastifyReply
) {
  const siteId = parseInt(request.params.siteId, 10);
  if (isNaN(siteId) || siteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID: must be a positive integer" });
  }

  const validation = moveSiteSchema.safeParse(request.body);
  if (!validation.success) {
    return reply.status(400).send({ error: "Invalid request data", details: validation.error.flatten() });
  }

  const targetOrganizationId = validation.data.organizationId;
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    const site = await db.query.sites.findFirst({ where: eq(sites.siteId, siteId) });
    if (!site) {
      return reply.status(404).send({ error: "Site not found" });
    }

    const sourceOrganizationId = site.organizationId;
    if (sourceOrganizationId === targetOrganizationId) {
      return reply.status(400).send({ error: "Site is already in this organization" });
    }

    // Caller must be an admin/owner of the target organization. This runs BEFORE the
    // org-existence check so a caller without target-org access gets the same 403
    // whether or not the org exists — no org-ID existence oracle.
    const targetMembership = await getOrgMembership(userId, targetOrganizationId);
    if (!targetMembership) {
      return reply.status(403).send({ error: "You are not a member of the target organization" });
    }
    if (!roleHasPermission(targetMembership.role, "sites:create")) {
      return reply.status(403).send({ error: "You must be an admin or owner of the target organization" });
    }

    // Target organization must exist. Only reachable by target-org admins/owners
    // (a membership row for a nonexistent org shouldn't exist, but guard against
    // stale rows) so the 404 can't be used to probe org IDs.
    const targetOrg = await db.query.organization.findFirst({
      where: eq(organization.id, targetOrganizationId),
    });
    if (!targetOrg) {
      return reply.status(404).send({ error: "Target organization not found" });
    }

    // Resolved before the transaction: it must not wait on a second connection.
    const [isSystemAdmin, siteLimit] = await Promise.all([
      request.bearerAuth ? false : getIsUserAdmin(request),
      getPlanSiteLimit(targetOrganizationId),
    ]);

    const failure = await withOrganizationSiteLock(targetOrganizationId, async tx => {
      // The route guard checked the caller against the site's organization as
      // it was when the request arrived; check again against the one it is in
      // now, holding the site row so a concurrent move can't slip between.
      const current = await lockSiteOwnership(tx, siteId);
      if (!current || current.organizationId !== sourceOrganizationId) {
        return { status: 409, error: "The site moved while this request was in flight; reload and try again" };
      }
      const sourceRole = sourceOrganizationId
        ? higherRole(
            effectiveOrgRole(await getOrgMembership(userId, sourceOrganizationId, tx)),
            isSystemAdmin ? "admin" : null
          )
        : null;
      if (!roleHasPermission(sourceRole, "sites:transfer")) {
        return { status: 403, error: "Forbidden" };
      }

      const limitError = await targetSiteLimitError(tx, targetOrganizationId, siteLimit);
      if (limitError) return { status: 403, error: limitError };

      if (!(await applySiteMove(siteId, sourceOrganizationId, targetOrganizationId, tx))) {
        return { status: 409, error: "The site moved while this request was in flight; reload and try again" };
      }
      return null;
    });

    if (failure) return reply.status(failure.status).send({ error: failure.error });
    await invalidateSiteMoveAccess(sourceOrganizationId, targetOrganizationId);
    return reply.status(200).send({ success: true, organizationId: targetOrganizationId });
  } catch (error) {
    request.log.error({ err: error }, "Error moving site");
    return reply.status(500).send({ error: "Failed to move site" });
  }
}
