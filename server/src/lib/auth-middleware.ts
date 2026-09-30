import { FastifyRequest, FastifyReply, type RouteOptions } from "fastify";
import { PERMISSIONS, roleHasPermission, type OrgRole, type Permission } from "@rybbit/shared";
import {
  getSessionFromReq,
  checkApiKey,
  getIsUserAdmin,
  getSiteIsPubliclyReadable,
  getUserOrgRole,
  getUserSiteRole,
  type BearerAuthResult,
} from "./auth-utils.js";
import { hasScope, scopeToString, type ScopeRequirement } from "./scopes.js";
import { siteConfig } from "./siteConfig.js";

type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

/**
 * Who may call a route. Every /api route declares one in `config.access`;
 * {@link assertRouteAccessDeclared} refuses to register a route without it.
 * - a permission on a site (:siteId) or organization (:organizationId),
 *   enforced by {@link requireSitePermission} / {@link requireOrgPermission}
 * - "authenticated": any signed-in user or credential (user-level surfaces)
 * - "system-admin": Better Auth system admins only
 * - "public": no guard — tracking, webhooks, signed links, and handlers that
 *   authenticate the caller themselves
 */
export type RouteAccess =
  | { level: "site"; permission: Permission; allowPublic: boolean }
  | { level: "org"; permission: Permission }
  | "authenticated"
  | "system-admin"
  | "public";

declare module "fastify" {
  interface FastifyContextConfig {
    access?: RouteAccess;
  }
}

/** onRoute hook: a route that doesn't say who may call it never registers. */
export function assertRouteAccessDeclared(route: RouteOptions): void {
  const access = (route.config as { access?: RouteAccess } | undefined)?.access;
  if (!access) {
    throw new Error(`Route ${route.method} ${route.url} does not declare config.access`);
  }
  if (typeof access === "object" && !(access.permission in PERMISSIONS)) {
    throw new Error(`Route ${route.method} ${route.url} declares unknown permission "${access.permission}"`);
  }
}

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
  // Later handlers (e.g. expandSegmentParam) may need to check a scope the
  // route itself does not require, without re-verifying the credential.
  request.bearerAuth = true;
  request.bearerStatements = apiKeyResult.statements;
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

  if (!siteId || String(siteId).length <= 4) {
    return;
  }

  const numericId = await siteConfig.resolveSiteId(siteId);
  if (numericId !== null) {
    params.siteId = String(numericId);
    return;
  }

  // A digit-only identifier is already in the shape the handlers expect; leave
  // it alone and let the access check below produce the 404/403, as before.
  if (!/^\d+$/.test(siteId)) {
    return reply.status(404).send({ error: "Site not found" });
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

const sendInsufficientRole = (reply: FastifyReply, permission: Permission) =>
  reply.status(403).send({ error: "Insufficient role", required: PERMISSIONS[permission].minRole });

export interface SitePermissionOptions {
  /**
   * Also admit callers with no role on the site when the site is public or the
   * request carries its private link key. Only for read permissions.
   */
  allowPublic?: boolean;
}

/**
 * Requires a permission on the site named by the :siteId param. The caller's
 * role on that site — from their membership, their site grants and teams, or
 * admin authority for org-owned keys and system-admin sessions — must hold the
 * permission, and a bearer credential must also carry the permission's scope.
 */
export function requireSitePermission(permission: Permission, options: SitePermissionOptions = {}): AuthMiddleware {
  const scope = PERMISSIONS[permission].scope;
  // Reads (every viewer permission) may use the short-lived per-worker role
  // cache; anything a viewer can't do re-reads the role, so revoking access
  // takes effect immediately for writes and admin actions.
  const fresh = PERMISSIONS[permission].minRole !== "viewer";
  return async (request, reply) => {
    const siteId = getSiteIdFromParams(request);
    if (!siteId) {
      return reply.status(400).send({ error: "Site ID required" });
    }

    // Bearer credential first. A key whose role or scope falls short falls
    // through to the session, so a browser tab holding both still works.
    let scopeDenied = false;
    const apiKeyResult = await checkApiKey(request, { siteId, fresh });
    if (apiKeyResult.valid && roleHasPermission(apiKeyResult.role, permission)) {
      if (bearerScopeOk(apiKeyResult, scope)) {
        attachApiKeyUser(request, reply, apiKeyResult);
        request.accessRole = apiKeyResult.role as OrgRole;
        return;
      }
      scopeDenied = true;
    }

    const role = await getUserSiteRole(request, siteId, { fresh });
    if (roleHasPermission(role, permission)) {
      const session = await getSessionFromReq(request);
      if (session?.user) request.user = session.user;
      request.accessRole = role!;
      return;
    }

    if (options.allowPublic && (await getSiteIsPubliclyReadable(request, siteId))) {
      const session = await getSessionFromReq(request);
      if (session?.user) request.user = session.user;
      return;
    }

    if (apiKeyResult.rateLimited) {
      return sendRateLimited(reply, apiKeyResult);
    }
    if (scopeDenied) {
      return sendInsufficientScope(reply, scope);
    }
    if (role || (apiKeyResult.valid && apiKeyResult.role)) {
      return sendInsufficientRole(reply, permission);
    }
    return reply.status(403).send({ error: "Forbidden" });
  };
}

/**
 * Requires a permission in the organization named by the :organizationId
 * param, held by the caller's organization role (system-admin sessions act as
 * admin in every organization); bearer credentials also need the scope.
 */
export function requireOrgPermission(permission: Permission): AuthMiddleware {
  const scope = PERMISSIONS[permission].scope;
  return async (request, reply) => {
    const params = request.params as Record<string, string>;
    const organizationId = params.organizationId;

    if (!organizationId) {
      return reply.status(400).send({ error: "Organization ID required" });
    }

    let scopeDenied = false;
    const apiKeyResult = await checkApiKey(request, { organizationId });
    if (apiKeyResult.valid && roleHasPermission(apiKeyResult.role, permission)) {
      if (bearerScopeOk(apiKeyResult, scope)) {
        attachApiKeyUser(request, reply, apiKeyResult);
        request.accessRole = apiKeyResult.role as OrgRole;
        return;
      }
      scopeDenied = true;
    }

    const session = await getSessionFromReq(request);
    if (session?.user?.id) {
      const role = await getUserOrgRole(request, organizationId);
      if (roleHasPermission(role, permission)) {
        request.user = session.user;
        request.accessRole = role!;
        return;
      }
      if (apiKeyResult.rateLimited) {
        return sendRateLimited(reply, apiKeyResult);
      }
      if (scopeDenied) {
        return sendInsufficientScope(reply, scope);
      }
      if (role) {
        return sendInsufficientRole(reply, permission);
      }
      return reply.status(403).send({ error: "You are not a member of this organization" });
    }

    if (apiKeyResult.rateLimited) {
      return sendRateLimited(reply, apiKeyResult);
    }
    if (scopeDenied) {
      return sendInsufficientScope(reply, scope);
    }
    if (apiKeyResult.valid) {
      return sendInsufficientRole(reply, permission);
    }
    return reply.status(401).send({ error: "Unauthorized" });
  };
}
