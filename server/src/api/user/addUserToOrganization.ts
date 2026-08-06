import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { member, user } from "../../db/postgres/schema.js";
import { randomBytes } from "crypto";
import { getIsUserAdmin } from "../../lib/auth-utils.js";

function generateId(len = 32) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = randomBytes(len);
  let id = "";
  for (let i = 0; i < len; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

interface AddUserToOrganization {
  Params: {
    organizationId: string;
  };
  Body: {
    email: string;
    role: string;
  };
}

export async function addUserToOrganization(request: FastifyRequest<AddUserToOrganization>, reply: FastifyReply) {
  try {
    const { organizationId } = request.params;
    const { email, role } = request.body;
    const userId = request.user?.id;

    const isAdmin = await getIsUserAdmin(request);

    let callerMembership = null;
    if (!isAdmin) {
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      callerMembership = await db.query.member.findFirst({
        where: and(eq(member.userId, userId), eq(member.organizationId, organizationId)),
      });
      if (!callerMembership || (callerMembership.role !== "admin" && callerMembership.role !== "owner")) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }

    // Validate input
    if (!email || !role) {
      return reply.status(400).send({
        error: "Missing required fields: email and role",
      });
    }

    if (role !== "admin" && role !== "member" && role !== "owner") {
      return reply.status(400).send({
        error: "Role must be either admin, member, or owner",
      });
    }

    // Only an organization owner (or a system admin) may grant the owner role.
    // Otherwise an org admin could mint an owner — an account with higher
    // privileges than their own — which is a privilege-escalation path.
    if (role === "owner" && !isAdmin && callerMembership?.role !== "owner") {
      return reply.status(403).send({ error: "Only an organization owner can assign the owner role" });
    }

    const foundUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (!foundUser) {
      return reply.status(404).send({ error: "User not found" });
    }

    // Check if user is already a member of this specific organization
    const existingMember = await db.query.member.findFirst({
      where: and(eq(member.userId, foundUser.id), eq(member.organizationId, organizationId)),
    });

    if (existingMember) {
      return reply.status(400).send({ error: "User is already a member of this organization" });
    }

    await db.insert(member).values([
      {
        userId: foundUser.id,
        organizationId: organizationId,
        role: role,
        id: generateId(),
        createdAt: new Date().toISOString(),
      },
    ]);

    return reply.status(201).send({
      message: "User added to organization successfully",
    });
  } catch (error: any) {
    request.log.error({ err: error }, "Error adding user to organization");
    return reply.status(500).send({ error: String(error) });
  }
}
