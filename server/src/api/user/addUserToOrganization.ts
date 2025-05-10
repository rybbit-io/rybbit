import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { member, user } from "../../db/postgres/schema.js";

import { randomBytes } from "crypto";
import { IS_CLOUD } from "../../lib/const.js";

function generateId(len = 32) {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = randomBytes(len);
  let id = "";
  for (let i = 0; i < len; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

interface AddUserToOrganization {
  Body: {
    email: string;
    role: string;
    organizationId: string;
  };
}

export async function addUserToOrganization(
  request: FastifyRequest<AddUserToOrganization>,
  reply: FastifyReply
) {
  try {
    const { email, role, organizationId } = request.body;

    // Validate input
    if (!email || !role || !organizationId) {
      return reply.status(400).send({
        error: "Missing required fields: email, role, and organizationId",
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

    const foundMember = await db.query.member.findMany({
      where: eq(member.userId, foundUser.id),
    });

    if (foundMember.length > 0 && IS_CLOUD) {
      return reply
        .status(400)
        .send({ error: "user is already in an organization" });
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
