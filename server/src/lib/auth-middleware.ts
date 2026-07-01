import { FastifyRequest, FastifyReply } from "fastify";
import {
  getSessionFromReq,
  checkApiKey,
  getUserHasAccessToSite,
  getUserHasAdminAccessToSite,
  getUserHasAccessToSitePublic,
  getIsUserAdmin,
  getUserIsInOrg,
} from "./auth-utils.js";
import { resolveNumericSiteId } from "../utils.js";
import { db } from "../db/postgres/postgres.js";

type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
type ApiKeyResult = Awaited<ReturnType<typeof checkApiKey>>;

const getSiteIdFromParams = (request: FastifyRequest): string | undefined => {
  const params = request.params as Record<string, string> | undefined;
  return params?.siteId;
};

const getOrganizationIdFromParams = (request: FastifyRequest): string | undefined => {
  const params = request.params as Record<string, string> | undefined;
  return params?.organizationId;
};

const attachApiKeyUser = (request: FastifyRequest, apiKeyResult: ApiKeyResult) => {
  if (apiKeyResult.userId) {
    request.user = { id: apiKeyResult.userId };
  }
};

/**
 * Resolves string site IDs to numeric IDs and updates request params.
 * Should be first in preHandler chain for routes with site params.
 */
export const resolveSiteId: AuthMiddleware = async (request, reply) => {
  const params = request.params as Record<string, string>;
  const siteId = getSiteIdFromParams(request);

  if (siteId && String(siteId).length > 4) {
    const numericId = await resolveNumericSiteId(siteId);
    if (!numericId) {
      return reply.status(404).send({ error: "Site not found" });
    }
    params.siteId = String(numericId);
  }
};

/**
 * Requires valid session or scoped API key. Attaches the authenticated user id to the request.
 */
export const requireAuth: AuthMiddleware = async (request, reply) => {
  const session = await getSessionFromReq(request);
  if (session?.user) {
    request.user = session.user;
    return;
  }

  // API keys are validated in the relevant site/org scope when one is present.
  const organizationId = getOrganizationIdFromParams(request);
  const siteId = getSiteIdFromParams(request);
  const apiKeyResult = await checkApiKey(request, { organizationId, siteId });
  if (apiKeyResult.valid) {
    attachApiKeyUser(request, apiKeyResult);
    return;
  }

  if (apiKeyResult.rateLimited) {
    return reply.status(429).send({ error: "Rate limit exceeded" });
  }

  return reply.status(401).send({ error: "Unauthorized" });
};

/**
 * Requires system admin role.
 */
export const requireAdmin: AuthMiddleware = async (request, reply) => {
  const isAdmin = await getIsUserAdmin(request);
  if (!isAdmin) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const session = await getSessionFromReq(request);
  if (session?.user) request.user = session.user;
};

/**
 * Requires access to site (via session or API key).
 */
export const requireSiteAccess: AuthMiddleware = async (request, reply) => {
  const siteId = getSiteIdFromParams(request);
  if (!siteId) {
    return reply.status(400).send({ error: "Site ID required" });
  }

  // Check API key first.
  const apiKeyResult = await checkApiKey(request, { siteId });
  if (apiKeyResult.valid) {
    attachApiKeyUser(request, apiKeyResult);
    return;
  }

  // Check session-based access
  const hasAccess = await getUserHasAccessToSite(request, siteId);
  if (hasAccess) {
    const session = await getSessionFromReq(request);
    if (session?.user) request.user = session.user;
    return;
  }

  if (apiKeyResult.rateLimited) {
    return reply.status(429).send({ error: "Rate limit exceeded" });
  }

  return reply.status(403).send({ error: "Forbidden" });
};

/**
 * Requires admin/owner access to site.
 */
export const requireSiteAdminAccess: AuthMiddleware = async (request, reply) => {
  const siteId = getSiteIdFromParams(request);
  if (!siteId) {
    return reply.status(400).send({ error: "Site ID required" });
  }

  // Check API key with admin/owner role first.
  const apiKeyResult = await checkApiKey(request, { siteId });
  if (apiKeyResult.valid && (apiKeyResult.role === "admin" || apiKeyResult.role === "owner")) {
    attachApiKeyUser(request, apiKeyResult);
    return;
  }

  // Check session-based admin access
  const hasAdminAccess = await getUserHasAdminAccessToSite(request, siteId);
  if (hasAdminAccess) {
    const session = await getSessionFromReq(request);
    if (session?.user) request.user = session.user;
    return;
  }

  if (apiKeyResult.rateLimited) {
    return reply.status(429).send({ error: "Rate limit exceeded" });
  }

  return reply.status(403).send({ error: "Forbidden" });
};

/**
 * Allows public site access, private key, or authenticated access.
 */
export const allowPublicSiteAccess: AuthMiddleware = async (request, reply) => {
  const siteId = getSiteIdFromParams(request);
  if (!siteId) {
    return reply.status(400).send({ error: "Site ID required" });
  }

  const apiKeyResult = await checkApiKey(request, { siteId });
  if (apiKeyResult.valid) {
    attachApiKeyUser(request, apiKeyResult);
    return;
  }

  const hasAccess = await getUserHasAccessToSitePublic(request, siteId);
  if (hasAccess) {
    const session = await getSessionFromReq(request);
    if (session?.user) request.user = session.user;
    return;
  }

  if (apiKeyResult.rateLimited) {
    return reply.status(429).send({ error: "Rate limit exceeded" });
  }

  return reply.status(403).send({ error: "Forbidden" });
};

/**
 * Requires membership in organization.
 */
export const requireOrgMember: AuthMiddleware = async (request, reply) => {
  const params = request.params as Record<string, string>;
  const organizationId = params.organizationId;

  if (!organizationId) {
    return reply.status(400).send({ error: "Organization ID required" });
  }

  const apiKeyResult = await checkApiKey(request, { organizationId });
  if (apiKeyResult.valid) {
    attachApiKeyUser(request, apiKeyResult);
    return;
  }

  const isMember = await getUserIsInOrg(request, organizationId);
  if (isMember) {
    const session = await getSessionFromReq(request);
    if (session?.user) request.user = session.user;
    return;
  }

  if (apiKeyResult.rateLimited) {
    return reply.status(429).send({ error: "Rate limit exceeded" });
  }

  return reply.status(403).send({ error: "Forbidden" });
};

/**
 * Requires org admin/owner access via session or API key.
 * Extracts organizationId from request params (orgId).
 * Use for endpoints that create resources in an org (like addSite).
 */
export const requireOrgAdminFromParams: AuthMiddleware = async (request, reply) => {
  const params = request.params as Record<string, string>;
  const organizationId = params.organizationId;

  if (!organizationId) {
    return reply.status(400).send({ error: "Organization ID required in path" });
  }

  // Check API key first - must have admin/owner role
  const apiKeyResult = await checkApiKey(request, { organizationId });
  if (apiKeyResult.valid && (apiKeyResult.role === "admin" || apiKeyResult.role === "owner")) {
    attachApiKeyUser(request, apiKeyResult);
    return;
  }

  // Check session-based access - must be admin/owner of org
  const session = await getSessionFromReq(request);
  if (!session?.user?.id) {
    if (apiKeyResult.rateLimited) {
      return reply.status(429).send({ error: "Rate limit exceeded" });
    }
    return reply.status(401).send({ error: "Unauthorized" });
  }

  // Check org membership and role
  const member = await db.query.member.findFirst({
    where: (member, { and, eq }) => and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)),
  });

  if (!member) {
    return reply.status(403).send({ error: "You are not a member of this organization" });
  }

  if (member.role !== "admin" && member.role !== "owner") {
    return reply.status(403).send({ error: "You must be an admin or owner" });
  }

  request.user = session.user;
};
