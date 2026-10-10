import { assignableRoles, higherRole, permissionsForRole } from "@rybbit/shared";
import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { eq } from "drizzle-orm";
import { member, organization } from "../../db/postgres/schema.js";
import { effectiveOrgRole } from "../../lib/access.js";
import { getIsUserAdmin } from "../../lib/auth-utils.js";

export const getUserOrganizations = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const userOrganizations = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        createdAt: organization.createdAt,
        metadata: organization.metadata,
        role: member.role,
        hasRestrictedSiteAccess: member.hasRestrictedSiteAccess,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, userId));

    // The same role the organization guards use: a system-admin browser
    // session acts as admin in every organization it belongs to.
    const isSystemAdmin = !request.bearerAuth && (await getIsUserAdmin(request));

    return reply.send(
      userOrganizations.map(({ hasRestrictedSiteAccess, ...org }) => {
        // A member restricted to specific sites is a viewer at the organization
        // level; their role applies on the sites they were granted.
        const orgRole = higherRole(
          effectiveOrgRole({ role: org.role, hasRestrictedSiteAccess }),
          isSystemAdmin ? "admin" : null
        );
        return {
          ...org,
          // What the caller's role allows in the organization. Site grants and
          // teams can add to it on individual sites (see each site's permissions).
          permissions: permissionsForRole(orgRole),
          // Roles the caller may give when inviting or editing members.
          assignableRoles: assignableRoles(orgRole),
        };
      })
    );
  } catch (error) {
    request.log.error({ err: error }, "Error fetching user organizations");
    return reply.status(500).send("Failed to fetch user organizations");
  }
};
