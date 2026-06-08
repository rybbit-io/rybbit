import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { team, teamMember, teamSiteAccess } from "../../db/postgres/schema.js";
import { invalidateSitesAccessCache } from "../../lib/auth-utils.js";
import { findInvalidOrgMemberIds, findInvalidOrgSiteIds } from "./validation.js";

interface CreateTeamBody {
  name: string;
  memberUserIds?: string[];
  siteIds?: number[];
}

export async function createTeam(
  request: FastifyRequest<{
    Params: { organizationId: string };
    Body: CreateTeamBody;
  }>,
  reply: FastifyReply
) {
  const { organizationId } = request.params;
  const { name, memberUserIds, siteIds } = request.body;

  if (!name || !name.trim()) {
    return reply.status(400).send({ error: "Team name is required" });
  }

  try {
    // Validate memberUserIds are org members
    if (memberUserIds && memberUserIds.length > 0) {
      const invalidUserIds = await findInvalidOrgMemberIds(organizationId, memberUserIds);
      if (invalidUserIds.length > 0) {
        return reply.status(400).send({
          error: `Users not in organization: ${invalidUserIds.join(", ")}`,
        });
      }
    }

    // Validate siteIds belong to org
    if (siteIds && siteIds.length > 0) {
      const invalidSiteIds = await findInvalidOrgSiteIds(organizationId, siteIds);
      if (invalidSiteIds.length > 0) {
        return reply.status(400).send({
          error: `Sites not in organization: ${invalidSiteIds.join(", ")}`,
        });
      }
    }

    const teamId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      // Insert team
      await tx.insert(team).values({
        id: teamId,
        name: name.trim(),
        organizationId,
        createdAt: now,
        updatedAt: now,
      });

      // Insert team members
      if (memberUserIds && memberUserIds.length > 0) {
        await tx.insert(teamMember).values(
          memberUserIds.map((userId) => ({
            id: crypto.randomUUID(),
            teamId,
            userId,
            createdAt: now,
          }))
        );
      }

      // Insert team site access
      if (siteIds && siteIds.length > 0) {
        await tx.insert(teamSiteAccess).values(
          siteIds.map((siteId) => ({
            teamId,
            siteId,
          }))
        );
      }
    });

    // Invalidate cache for affected users
    if (memberUserIds) {
      for (const userId of memberUserIds) {
        invalidateSitesAccessCache(userId);
      }
    }

    return reply.status(201).send({
      id: teamId,
      name: name.trim(),
      organizationId,
      createdAt: now,
      updatedAt: now,
      members: memberUserIds || [],
      siteIds: siteIds || [],
    });
  } catch (error) {
    console.error("Error creating team:", error);
    return reply.status(500).send({ error: "Failed to create team" });
  }
}
