import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { randomBytes } from "crypto";
import { db } from "../../db/postgres/postgres.js";
import { member } from "../../db/postgres/schema.js";
import { auth } from "../../lib/auth.js";
import { canAssignRole, isOrgRole, ORG_ROLES, roleHasPermission } from "@rybbit/shared";
import { getOrgMembership } from "../../lib/access.js";
import { getMemberLimitError, getPlanMemberLimit, memberLimitError } from "../../lib/memberLimits.js";
import { withOrganizationSiteLock } from "../../services/sites/withOrganizationSiteLock.js";
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

interface CreateUserInOrganization {
  Params: {
    organizationId: string;
  };
  Body: {
    email: string;
    name?: string;
    password: string;
    role: string;
  };
}

/**
 * Creates a new user and adds them to the organization.
 *
 * Unlike better-auth's `admin.createUser` (which requires the requester to be a
 * system-level admin), this endpoint authorizes organization owners/admins to
 * create users for their own organization. User creation is performed via
 * better-auth's internal adapter so password hashing and account linking match
 * the admin plugin exactly.
 */
export async function createUserInOrganization(request: FastifyRequest<CreateUserInOrganization>, reply: FastifyReply) {
  try {
    const { organizationId } = request.params;
    const { email: rawEmail, name, password, role } = request.body;
    const userId = request.user?.id;

    // Authorization: system admin OR owner/admin of this organization
    const isAdmin = await getIsUserAdmin(request);
    let callerMembership = null;
    if (!isAdmin) {
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      callerMembership = await getOrgMembership(userId, organizationId);
      if (!roleHasPermission(callerMembership?.role, "members:manage")) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }

    // Validate input
    if (!rawEmail || !password || !role) {
      return reply.status(400).send({ error: "Missing required fields: email, password and role" });
    }

    const email = rawEmail.toLowerCase();

    if (!isOrgRole(role)) {
      return reply.status(400).send({ error: `Role must be one of: ${ORG_ROLES.join(", ")}` });
    }

    // Nobody but a system admin creates a user with a role above their own (only
    // owners make owners) — minting an account with higher privileges than an
    // org admin's own is a privilege-escalation path.
    if (!isAdmin && !canAssignRole(callerMembership?.role, role)) {
      return reply.status(403).send({ error: "You cannot assign a role above your own" });
    }

    if (password.length < 8) {
      return reply.status(400).send({ error: "Password must be at least 8 characters long" });
    }

    const ctx = await auth.$context;

    if (await ctx.internalAdapter.findUserByEmail(email)) {
      return reply.status(400).send({ error: "A user with this email already exists" });
    }

    // Checked before the account is created, so a full organization usually
    // never leaves behind a user who belongs nowhere; re-checked under the
    // organization's lock when the membership is written.
    const earlyLimitError = await getMemberLimitError(organizationId);
    if (earlyLimitError) {
      return reply.status(403).send({ error: earlyLimitError });
    }

    // Create the user + credential account (mirrors better-auth's admin createUser)
    const createdUser = await ctx.internalAdapter.createUser(
      {
        email,
        name: name || email,
        emailVerified: false,
      },
      { method: "admin" }
    );

    if (!createdUser) {
      return reply.status(500).send({ error: "Failed to create user" });
    }

    const hashedPassword = await ctx.password.hash(password);
    await ctx.internalAdapter.linkAccount({
      accountId: createdUser.id,
      providerId: "credential",
      password: hashedPassword,
      userId: createdUser.id,
    });

    // Add the new user to the organization, re-counting under the
    // organization's row lock so concurrent creates can't both take the last
    // seat. The loser's just-created account is removed again.
    const memberLimit = await getPlanMemberLimit(organizationId);
    const limitReached = await withOrganizationSiteLock(organizationId, async tx => {
      const limitError = await memberLimitError(organizationId, memberLimit, tx);
      if (limitError) return limitError;
      await tx.insert(member).values([
        {
          userId: createdUser.id,
          organizationId: organizationId,
          role: role,
          id: generateId(),
          createdAt: new Date().toISOString(),
        },
      ]);
      return null;
    });
    if (limitReached) {
      await ctx.internalAdapter.deleteUser(createdUser.id);
      return reply.status(403).send({ error: limitReached });
    }

    return reply.status(201).send({ message: "User created and added to organization successfully" });
  } catch (error: any) {
    request.log.error({ err: error }, "Error creating user in organization");
    return reply.status(500).send({ error: String(error) });
  }
}
