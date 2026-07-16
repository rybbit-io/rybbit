import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { member, organization, sites } from "../../db/postgres/schema.js";
import { IS_CLOUD } from "../../lib/const.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";
import { applySiteMove } from "./applySiteMove.js";

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
    const targetMembership = await db.query.member.findFirst({
      where: and(eq(member.userId, userId), eq(member.organizationId, targetOrganizationId)),
    });
    if (!targetMembership) {
      return reply.status(403).send({ error: "You are not a member of the target organization" });
    }
    if (targetMembership.role !== "admin" && targetMembership.role !== "owner") {
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

    // Enforce the target organization's site limit on cloud.
    if (IS_CLOUD) {
      const subscription = await getSubscriptionInner(targetOrganizationId);
      const siteLimit = subscription?.siteLimit ?? null;
      if (siteLimit !== null) {
        const existingSites = await db
          .select({ siteId: sites.siteId })
          .from(sites)
          .where(eq(sites.organizationId, targetOrganizationId));
        if (existingSites.length >= siteLimit) {
          return reply.status(403).send({
            error: `The target organization has reached its limit of ${siteLimit} website${
              siteLimit === 1 ? "" : "s"
            }. Please upgrade it to add more.`,
          });
        }
      }
    }

    await applySiteMove(siteId, sourceOrganizationId, targetOrganizationId);

    return reply.status(200).send({ success: true, organizationId: targetOrganizationId });
  } catch (error) {
    console.error("Error moving site:", error);
    return reply.status(500).send({ error: "Failed to move site" });
  }
}
