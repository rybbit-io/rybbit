import { and, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { db } from "../../db/postgres/postgres.js";
import { member, memberSiteAccess, organization, sites, user } from "../../db/postgres/schema.js";
import { siteIdsInOrganization } from "../../lib/access.js";
import { invalidateSitesAccessCache } from "../../lib/auth-utils.js";
import { APPSUMO_TIER_LIMITS, getStripePrices } from "../../lib/const.js";

const organizationOptionsQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  limit: z.coerce.number().int().min(1).max(50).optional().default(25),
});

export async function getAdminOrganizationOptions(
  request: FastifyRequest<{ Querystring: { search?: string; limit?: number } }>,
  reply: FastifyReply
) {
  const parsed = organizationOptionsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid query", details: parsed.error.flatten() });
  }

  const { search, limit } = parsed.data;

  try {
    const rows = search
      ? await db
          .selectDistinct({ id: organization.id, name: organization.name, createdAt: organization.createdAt })
          .from(organization)
          .leftJoin(sites, eq(sites.organizationId, organization.id))
          .leftJoin(member, eq(member.organizationId, organization.id))
          .leftJoin(user, eq(user.id, member.userId))
          .where(
            or(
              ilike(organization.name, `%${search}%`),
              ilike(organization.id, `%${search}%`),
              ilike(sites.domain, `%${search}%`),
              ilike(user.email, `%${search}%`)
            )
          )
          .orderBy(desc(organization.createdAt))
          .limit(limit)
      : await db
          .select({ id: organization.id, name: organization.name, createdAt: organization.createdAt })
          .from(organization)
          .orderBy(desc(organization.createdAt))
          .limit(limit);

    return reply.send({ items: rows.map(({ id, name }) => ({ id, name })) });
  } catch (error) {
    request.log.error({ err: error }, "Failed to search admin organization options");
    return reply.status(500).send({ error: "Failed to search organizations" });
  }
}

export async function getAdminSubscriptionPlans(_request: FastifyRequest, reply: FastifyReply) {
  const stripePlans = getStripePrices().map(plan => ({
    name: plan.name,
    type: "stripe" as const,
    eventLimit: plan.limits.events,
    interval: plan.interval,
  }));
  const appsumoPlans = Object.entries(APPSUMO_TIER_LIMITS).map(([tier, eventLimit]) => ({
    name: `appsumo-${tier}`,
    type: "appsumo" as const,
    eventLimit,
    interval: "lifetime",
  }));

  return reply.send([...stripePlans, ...appsumoPlans]);
}

const nullablePositiveInteger = z.number().int().positive().nullable();
const subscriptionOverrideSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }),
  z.object({ mode: z.literal("preset"), planOverride: z.string().min(1) }),
  z.object({
    mode: z.literal("custom"),
    customPlan: z.object({
      events: z.number().int().positive(),
      members: nullablePositiveInteger,
      websites: nullablePositiveInteger,
    }),
  }),
]);

export async function updateAdminSubscriptionOverride(
  request: FastifyRequest<{ Params: { organizationId: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const parsed = subscriptionOverrideSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid subscription override", details: parsed.error.flatten() });
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, request.params.organizationId),
    columns: { id: true },
  });
  if (!org) {
    return reply.status(404).send({ error: "Organization not found" });
  }

  const value = parsed.data;
  if (value.mode === "preset") {
    const validStripePlan = getStripePrices().some(plan => plan.name === value.planOverride);
    const validAppsumoPlan = /^appsumo-[1-7]$/.test(value.planOverride);
    if (!validStripePlan && !validAppsumoPlan) {
      return reply.status(400).send({ error: "Unknown subscription override" });
    }
  }

  try {
    const update =
      value.mode === "none"
        ? { planOverride: null, customPlan: null }
        : value.mode === "preset"
          ? { planOverride: value.planOverride, customPlan: null }
          : { planOverride: null, customPlan: value.customPlan };

    await db.update(organization).set(update).where(eq(organization.id, org.id));
    return reply.send({ success: true, ...update });
  } catch (error) {
    request.log.error({ err: error }, "Failed to update subscription override");
    return reply.status(500).send({ error: "Failed to update subscription override" });
  }
}

async function findAdminMember(organizationId: string, memberId: string) {
  const rows = await db
    .select({
      memberId: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      memberRole: member.role,
      hasRestrictedSiteAccess: member.hasRestrictedSiteAccess,
      name: user.name,
      email: user.email,
      systemRole: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(eq(member.id, memberId), eq(member.organizationId, organizationId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAdminOrganizationMember(
  request: FastifyRequest<{ Params: { organizationId: string; memberId: string } }>,
  reply: FastifyReply
) {
  try {
    const found = await findAdminMember(request.params.organizationId, request.params.memberId);
    if (!found) {
      return reply.status(404).send({ error: "Member not found" });
    }

    const [accessRows, organizationSites] = await Promise.all([
      db
        .select({ siteId: memberSiteAccess.siteId })
        .from(memberSiteAccess)
        .where(eq(memberSiteAccess.memberId, found.memberId)),
      db
        .select({ siteId: sites.siteId, name: sites.name, domain: sites.domain })
        .from(sites)
        .where(eq(sites.organizationId, found.organizationId))
        .orderBy(sites.name),
    ]);

    return reply.send({
      user: {
        id: found.userId,
        name: found.name,
        email: found.email,
        role: found.systemRole,
        banned: found.banned ?? false,
        banReason: found.banReason,
        banExpires: found.banExpires,
      },
      membership: {
        id: found.memberId,
        role: found.memberRole,
        hasRestrictedSiteAccess: found.hasRestrictedSiteAccess,
        siteIds: accessRows.map(row => row.siteId),
      },
      sites: organizationSites,
    });
  } catch (error) {
    request.log.error({ err: error }, "Failed to load admin organization member");
    return reply.status(500).send({ error: "Failed to load member" });
  }
}

const updateMemberSchema = z
  .object({
    role: z.enum(["owner", "admin", "member"]),
    hasRestrictedSiteAccess: z.boolean(),
    siteIds: z.array(z.number().int().positive()).max(500),
  })
  .superRefine((value, ctx) => {
    if (value.role === "member" && value.hasRestrictedSiteAccess && value.siteIds.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["siteIds"], message: "Select at least one site" });
    }
  });

async function isLastOwner(organizationId: string, memberId: string) {
  const result = await db
    .select({ value: count() })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.role, "owner"), ne(member.id, memberId)));
  return Number(result[0]?.value ?? 0) === 0;
}

export async function updateAdminOrganizationMember(
  request: FastifyRequest<{ Params: { organizationId: string; memberId: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const parsed = updateMemberSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid member settings", details: parsed.error.flatten() });
  }

  try {
    const found = await findAdminMember(request.params.organizationId, request.params.memberId);
    if (!found) {
      return reply.status(404).send({ error: "Member not found" });
    }

    const value = parsed.data;
    if (
      found.memberRole === "owner" &&
      value.role !== "owner" &&
      (await isLastOwner(found.organizationId, found.memberId))
    ) {
      return reply.status(400).send({ error: "An organization must have at least one owner" });
    }

    const restricted = value.role === "member" && value.hasRestrictedSiteAccess;
    const requestedSiteIds = restricted ? [...new Set(value.siteIds)] : [];
    const validSiteIds = new Set(await siteIdsInOrganization(requestedSiteIds, found.organizationId));
    if (requestedSiteIds.some(siteId => !validSiteIds.has(siteId))) {
      return reply.status(400).send({ error: "All selected sites must belong to this organization" });
    }

    await db.transaction(async tx => {
      await tx
        .update(member)
        .set({ role: value.role, hasRestrictedSiteAccess: restricted })
        .where(eq(member.id, found.memberId));
      await tx.delete(memberSiteAccess).where(eq(memberSiteAccess.memberId, found.memberId));
      if (restricted) {
        await tx.insert(memberSiteAccess).values(
          requestedSiteIds.map(siteId => ({
            memberId: found.memberId,
            siteId,
            createdBy: request.user?.id ?? null,
          }))
        );
      }
    });

    invalidateSitesAccessCache(found.userId);
    return reply.send({ success: true });
  } catch (error) {
    request.log.error({ err: error }, "Failed to update admin organization member");
    return reply.status(500).send({ error: "Failed to update member" });
  }
}

export async function deleteAdminOrganizationMember(
  request: FastifyRequest<{ Params: { organizationId: string; memberId: string } }>,
  reply: FastifyReply
) {
  try {
    const found = await findAdminMember(request.params.organizationId, request.params.memberId);
    if (!found) {
      return reply.status(404).send({ error: "Member not found" });
    }
    if (found.memberRole === "owner" && (await isLastOwner(found.organizationId, found.memberId))) {
      return reply.status(400).send({ error: "An organization must have at least one owner" });
    }

    await db.delete(member).where(eq(member.id, found.memberId));
    invalidateSitesAccessCache(found.userId);
    return reply.send({ success: true });
  } catch (error) {
    request.log.error({ err: error }, "Failed to remove admin organization member");
    return reply.status(500).send({ error: "Failed to remove member" });
  }
}
