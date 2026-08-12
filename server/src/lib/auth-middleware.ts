import { FastifyRequest, FastifyReply } from "fastify";
import {
  getSessionFromReq,
  checkApiKey,
  getUserHasAccessToSite,
  getUserHasAdminAccessToSite,
  getUserHasAccessToSitePublic,
  getIsUserAdmin,
  getUserIsInOrg,
  type BearerAuthResult,
} from "./auth-utils.js";
import { hasScope, scopeToString, type ScopeRequirement } from "./scopes.js";
import { resolveNumericSiteId } from "../utils.js";
import { db } from "../db/postgres/postgres.js";

type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

/**
 * Scope requirement for a route. Scopes constrain BEARER credentials only —
 * cookie sessions always bypass them (the check sits inside the bearer branch
 * of each guard, which sessions never reach).
 * - a ScopeRequirement: the bearer credential must grant it (null statements =
 *   legacy/unrestricted credentials always pass; write implies read).
 * - "deny-scoped": scoped credentials are rejected outright; unrestricted
 *   credentials and sessions pass. For surfaces with no taxonomy resource
 *   (account settings, billing). Organization-owned keys are also rejected
 *   here — these surfaces are inherently user-centric.
 * - undefined: route is scope-exempt; any valid bearer credential passes.
 */
export type RouteScope = ScopeRequirement | "deny-scoped";

const bearerScopeOk = (result: BearerAuthResult, scope?: RouteScope): boolean => {
  if (!scope) return true;
  if (scope === "deny-scoped") return result.statements === null && !result.organizationId;
  return hasScope(result.statements, scope);
};

const sendInsufficientScope = (reply: FastifyReply, scope: RouteScope) =>
  reply.status(403).send({
    error: "Insufficient scope",
    ...(scope === "deny-scoped" ? {} : { required: scopeToString(scope) }),
  });

const getSiteIdFromParams = (request: FastifyRequest): string | undefined => {
  const params = request.params as Record<string, string> | undefined;
  return params?.siteId;
};

const getOrganizationIdFromParams = (request: FastifyRequest): string | undefined => {
  const params = request.params as Record<string, string> | undefined;
  return params?.organizationId;
};

/**
 * Report the remaining budget on every bearer-authenticated response, not just
 * on rejections — a client can only pace itself if it can see the budget before
 * it runs out. `RateLimit-*` describes whichever tier is closest to exhaustion
 * (per the IETF draft); the per-tier `X-RateLimit-*` headers always describe
 * both, so a client never has to guess which one it just read.
 */
const applyRateLimitHeaders = (reply: FastifyReply, apiKeyResult: BearerAuthResult) => {
  const limit = apiKeyResult.rateLimit;
  if (!limit) {
    return;
  }

  reply.header("X-RateLimit-Burst-Limit", limit.burstLimit);
  reply.header("X-RateLimit-Burst-Remaining", limit.burstRemaining);
  reply.header("X-RateLimit-Burst-Reset", limit.burstResetSeconds);

  const dailyEnabled = limit.dailyLimit > 0;
  if (dailyEnabled) {
    reply.header("X-RateLimit-Daily-Limit", limit.dailyLimit);
    reply.header("X-RateLimit-Daily-Remaining", limit.dailyRemaining);
    reply.header("X-RateLimit-Daily-Reset", limit.dailyResetSeconds);
  }

  // When the limiter named a binding tier, report that one — otherwise a
  // request denied on the daily quota (both tiers at zero, so neither ratio is
  // smaller) would advertise a 10-second reset next to a Retry-After of hours.
  const dailyIsTighter = limit.scope
    ? limit.scope === "daily"
    : dailyEnabled && limit.dailyRemaining / limit.dailyLimit < limit.burstRemaining / limit.burstLimit;
  reply.header("RateLimit-Limit", dailyIsTighter ? limit.dailyLimit : limit.burstLimit);
  reply.header("RateLimit-Remaining", dailyIsTighter ? limit.dailyRemaining : limit.burstRemaining);
  reply.header("RateLimit-Reset", dailyIsTighter ? limit.dailyResetSeconds : limit.burstResetSeconds);
};

const sendRateLimited = (reply: FastifyReply, apiKeyResult: BearerAuthResult) => {
  const limit = apiKeyResult.rateLimit;
  applyRateLimitHeaders(reply, apiKeyResult);
  if (limit) {
    reply.header("Retry-After", limit.retryAfterSeconds);
  }
  return reply.status(429).send({
    error: "Rate limit exceeded",
    // Naming the tier is the difference between "back off for two seconds" and
    // "you are done until tomorrow" — a client cannot tell them apart from a
    // bare 429.
    ...(limit?.scope
      ? {
          scope: limit.scope,
          limit: limit.scope === "daily" ? limit.dailyLimit : limit.burstLimit,
          retryAfter: limit.retryAfterSeconds,
        }
      : {}),
  });
};

// Attach the authenticated bearer principal. User keys become request.user
// like a session; org keys have no user (handlers that attribute a creator
// record null) — they set apiKeyOrganizationId instead, which the site-access
// resolver (getSitesUserHasAccessTo) maps to the org's full site set.
const attachApiKeyUser = (request: FastifyRequest, reply: FastifyReply, apiKeyResult: BearerAuthResult) => {
  applyRateLimitHeaders(reply, apiKeyResult);
  if (apiKeyResult.userId) {
    request.user = { id: apiKeyResult.userId };
  } else if (apiKeyResult.organizationId) {
    request.apiKeyOrganizationId = apiKeyResult.organizationId;
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
 * Requires valid session or API key. Attaches the authenticated user id to the request.
 */
export function requireAuth(scope?: RouteScope): AuthMiddleware {
  return async (request, reply) => {
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
      if (!bearerScopeOk(apiKeyResult, scope)) {
        return sendInsufficientScope(reply, scope!);
      }
      attachApiKeyUser(request, reply, apiKeyResult);
      return;
    }

    if (apiKeyResult.rateLimited) {
      return sendRateLimited(reply, apiKeyResult);
    }

    return reply.status(401).send({ error: "Unauthorized" });
  };
}

/**
 * Requires system admin role. Session-only; bearer credentials never apply.
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
export function requireSiteAccess(scope?: RouteScope): AuthMiddleware {
  return async (request, reply) => {
    const siteId = getSiteIdFromParams(request);
    if (!siteId) {
      return reply.status(400).send({ error: "Site ID required" });
    }

    // Check API key first.
    let scopeDenied = false;
    const apiKeyResult = await checkApiKey(request, { siteId });
    if (apiKeyResult.valid) {
      if (bearerScopeOk(apiKeyResult, scope)) {
        attachApiKeyUser(request, reply, apiKeyResult);
        return;
      }
      scopeDenied = true;
    }

    // Check session-based access
    const hasAccess = await getUserHasAccessToSite(request, siteId);
    if (hasAccess) {
      const session = await getSessionFromReq(request);
      if (session?.user) request.user = session.user;
      return;
    }

    if (apiKeyResult.rateLimited) {
      return sendRateLimited(reply, apiKeyResult);
    }
    if (scopeDenied) {
      return sendInsufficientScope(reply, scope!);
    }

    return reply.status(403).send({ error: "Forbidden" });
  };
}

/**
 * Requires admin/owner access to site.
 */
export function requireSiteAdminAccess(scope?: RouteScope): AuthMiddleware {
  return async (request, reply) => {
    const siteId = getSiteIdFromParams(request);
    if (!siteId) {
      return reply.status(400).send({ error: "Site ID required" });
    }

    // Check API key with admin/owner role first.
    let scopeDenied = false;
    const apiKeyResult = await checkApiKey(request, { siteId });
    if (apiKeyResult.valid && (apiKeyResult.role === "admin" || apiKeyResult.role === "owner")) {
      if (bearerScopeOk(apiKeyResult, scope)) {
        attachApiKeyUser(request, reply, apiKeyResult);
        return;
      }
      scopeDenied = true;
    }

    // Better Auth system admins have account-wide authority and do not need
    // an admin/owner membership in the organization that owns the site.
    const isSystemAdmin = await getIsUserAdmin(request);
    if (isSystemAdmin) {
      const session = await getSessionFromReq(request);
      if (session?.user) request.user = session.user;
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
      return sendRateLimited(reply, apiKeyResult);
    }
    if (scopeDenied) {
      return sendInsufficientScope(reply, scope!);
    }

    return reply.status(403).send({ error: "Forbidden" });
  };
}

/**
 * Allows public site access, private key, or authenticated access.
 */
export function allowPublicSiteAccess(scope?: RouteScope): AuthMiddleware {
  const requirement = scope && scope !== "deny-scoped" ? scope : undefined;
  return async (request, reply) => {
    const siteId = getSiteIdFromParams(request);
    if (!siteId) {
      return reply.status(400).send({ error: "Site ID required" });
    }

    let scopeDenied = false;
    const apiKeyResult = await checkApiKey(request, { siteId });
    if (apiKeyResult.valid) {
      if (bearerScopeOk(apiKeyResult, scope)) {
        attachApiKeyUser(request, reply, apiKeyResult);
        return;
      }
      scopeDenied = true;
    }

    // Public/private-link/session access. The scope threads into this helper's
    // own bearer fallback; a public site stays readable regardless (anonymous
    // baseline).
    const hasAccess = await getUserHasAccessToSitePublic(request, siteId, requirement);
    if (hasAccess) {
      const session = await getSessionFromReq(request);
      if (session?.user) request.user = session.user;
      return;
    }

    if (apiKeyResult.rateLimited) {
      return sendRateLimited(reply, apiKeyResult);
    }
    if (scopeDenied) {
      return sendInsufficientScope(reply, scope!);
    }

    return reply.status(403).send({ error: "Forbidden" });
  };
}

/**
 * Requires membership in organization.
 */
export function requireOrgMember(scope?: RouteScope): AuthMiddleware {
  return async (request, reply) => {
    const params = request.params as Record<string, string>;
    const organizationId = params.organizationId;

    if (!organizationId) {
      return reply.status(400).send({ error: "Organization ID required" });
    }

    let scopeDenied = false;
    const apiKeyResult = await checkApiKey(request, { organizationId });
    if (apiKeyResult.valid) {
      if (bearerScopeOk(apiKeyResult, scope)) {
        attachApiKeyUser(request, reply, apiKeyResult);
        return;
      }
      scopeDenied = true;
    }

    const isMember = await getUserIsInOrg(request, organizationId);
    if (isMember) {
      const session = await getSessionFromReq(request);
      if (session?.user) request.user = session.user;
      return;
    }

    if (apiKeyResult.rateLimited) {
      return sendRateLimited(reply, apiKeyResult);
    }
    if (scopeDenied) {
      return sendInsufficientScope(reply, scope!);
    }

    return reply.status(403).send({ error: "Forbidden" });
  };
}

/**
 * Requires org admin/owner access via session or API key.
 * Extracts organizationId from request params (orgId).
 * Use for endpoints that create resources in an org (like addSite).
 */
export function requireOrgAdminFromParams(scope?: RouteScope): AuthMiddleware {
  return async (request, reply) => {
    const params = request.params as Record<string, string>;
    const organizationId = params.organizationId;

    if (!organizationId) {
      return reply.status(400).send({ error: "Organization ID required in path" });
    }

    // Check API key first - must have admin/owner role
    let scopeDenied = false;
    const apiKeyResult = await checkApiKey(request, { organizationId });
    if (apiKeyResult.valid && (apiKeyResult.role === "admin" || apiKeyResult.role === "owner")) {
      if (bearerScopeOk(apiKeyResult, scope)) {
        attachApiKeyUser(request, reply, apiKeyResult);
        return;
      }
      scopeDenied = true;
    }

    // Check session-based access - must be admin/owner of org
    const session = await getSessionFromReq(request);
    if (!session?.user?.id) {
      if (apiKeyResult.rateLimited) {
        return sendRateLimited(reply, apiKeyResult);
      }
      if (scopeDenied) {
        return sendInsufficientScope(reply, scope!);
      }
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Check org membership and role
    const member = await db.query.member.findFirst({
      where: (member, { and, eq }) =>
        and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)),
    });

    if (!member) {
      return reply.status(403).send({ error: "You are not a member of this organization" });
    }

    if (member.role !== "admin" && member.role !== "owner") {
      return reply.status(403).send({ error: "You must be an admin or owner" });
    }

    request.user = session.user;
  };
}
