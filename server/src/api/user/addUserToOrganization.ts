import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { member, user } from "../../db/postgres/schema.js";

import { randomBytes } from "crypto";
import { getIsUserAdmin, getUserIsInOrg } from "../../lib/auth-utils.js";

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

    const [userIsInOrg, isAdmin] = await Promise.all([
      getUserIsInOrg(request, organizationId),
      getIsUserAdmin(request),
    ]);

    if (!isAdmin && (!userIsInOrg || (userIsInOrg.role !== "admin" && userIsInOrg.role !== "owner"))) {
      return reply.status(401).send({ error: "Unauthorized" });
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
    console.error(String(error));
    return reply.status(500).send({ error: String(error) });
  }
}
