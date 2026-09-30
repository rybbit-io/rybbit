import { eq } from "drizzle-orm";
import { FastifyRequest } from "fastify";
import NodeCache from "node-cache";
import { db } from "../db/postgres/postgres.js";
import { sites, user } from "../db/postgres/schema.js";
import { higherRole, isAdminRole, PERMISSIONS, roleHasPermission, type OrgRole, type Permission } from "@rybbit/shared";
import {
  effectiveOrgRole,
  getOrgMembership,
  resolveUserSites,
  resolveUserSiteRole,
  siteIdsInOrganization,
  type AccessibleSite,
} from "./access.js";
import type { RateLimitDecision } from "./apiRateLimit.js";
import { consumeRateLimitForIdentity } from "./apiRateLimitPolicy.js";
import { auth } from "./auth.js";
import { IS_CLOUD } from "./const.js";
import {
  consumeBearerHandoff,
  extractBearerToken,
  INTERNAL_BEARER_HANDOFF_HEADER,
  resolveBearerIdentity,
  type BearerResolverDeps,
} from "./bearerAuth.js";
import { type ScopeStatements } from "./scopes.js";
import { siteConfig } from "./siteConfig.js";
import { logger } from "./logger/logger.js";

// The MCP gate injects fakes; the REST layer always uses better-auth.
const bearerResolverDeps: BearerResolverDeps = {
  verifyApiKey: apiKey => auth.api.verifyApiKey({ body: { key: apiKey } }),
  getOAuthSession: token => auth.api.verifyRybbitOAuthToken({ body: { token } }),
};

// Several guards resolve the same credential more than once per HTTP request:
// a guard runs checkApiKey and then its session fallback (or the handler's
// getUserIdFromRequest) runs it again. Budget is denominated in API requests,
// not in internal resolutions, so the charge is memoized on the request object
// and every later resolution reuses that one decision.
const REQUEST_RATE_LIMIT = Symbol.for("rybbit.rateLimitDecision");

type RateLimitedRequest = FastifyRequest & { [REQUEST_RATE_LIMIT]?: RateLimitDecision };

function getRequestRateLimit(req: FastifyRequest): RateLimitDecision | undefined {
  return (req as RateLimitedRequest)[REQUEST_RATE_LIMIT];
}

function setRequestRateLimit(req: FastifyRequest, decision: RateLimitDecision): void {
  (req as RateLimitedRequest)[REQUEST_RATE_LIMIT] = decision;
}

/**
 * Whether this request was refused by the rate limiter. For handlers that
 * resolve credentials without a guard and would otherwise report a throttled
 * request as unauthenticated.
 */
export function wasRateLimited(req: FastifyRequest): RateLimitDecision | undefined {
  const decision = getRequestRateLimit(req);
  return decision && !decision.allowed ? decision : undefined;
}

/**
 * Per-request resolver dependencies. Rate limiting is cloud-only: self-hosted
 * instances have no plans, no shared infrastructure to protect, and must not
 * gain a Redis dependency on the authentication path.
 */
function resolverDepsFor(req: FastifyRequest): BearerResolverDeps {
  if (!IS_CLOUD) {
    return bearerResolverDeps;
  }
  return {
    ...bearerResolverDeps,
    consumeRateLimit: async identity => {
      const memoized = getRequestRateLimit(req);
      if (memoized) {
        return memoized;
      }
      const decision = await consumeRateLimitForIdentity(identity);
      setRequestRateLimit(req, decision);
      return decision;
    },
  };
}

function resolveBearerTokenFromRequest(req: FastifyRequest): string | null {
  // Priority: Authorization: Bearer header (recommended), then ?api_key= (testing).
  const bearerToken = extractBearerToken(req.headers["authorization"]);
  if (bearerToken) {
    return bearerToken;
  }
  const queryApiKey = (req.query as any)?.api_key;
  return typeof queryApiKey === "string" ? queryApiKey : null;
}

export function mapHeaders(headers: any) {
  const entries = Object.entries(headers);
  const map = new Map();
  for (const [headerKey, headerValue] of entries) {
    if (headerValue != null) {
      map.set(headerKey, headerValue);
    }
  }
  return map;
}

export async function getSessionFromReq(req: FastifyRequest) {
  const headers = new Headers(req.headers as any);
  const session = await auth!.api.getSession({ headers });
  return session;
}

export async function getIsUserAdmin(req: FastifyRequest) {
  const session = await getSessionFromReq(req);
  const userId = session?.user.id;

  if (!userId) {
    return false;
  }

  const userRecord = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
  return userRecord.length > 0 && userRecord[0].role === "admin";
}

const sitesAccessCache = new NodeCache({
  stdTTL: 15,
  checkperiod: 30,
  useClones: false, // Don't clone objects for better performance with promises
});

// All sites of an organization, for org-owned API keys, which act with admin
// authority over exactly that organization. Cached under an "org:"-prefixed
// key (org and user ids never collide, the prefix is hygiene).
async function getSitesForOrganization(organizationId: string): Promise<AccessibleSite[]> {
  const cacheKey = `org:${organizationId}`;

  const cached = sitesAccessCache.get<Promise<AccessibleSite[]>>(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    try {
      const orgSites = await db.select().from(sites).where(eq(sites.organizationId, organizationId));
      return orgSites.map(site => ({ ...site, accessRole: "admin" as const }));
    } catch (error) {
      console.error("Error getting sites for organization:", error);
      sitesAccessCache.del(cacheKey);
      return [];
    }
  })();

  sitesAccessCache.set(cacheKey, promise);
  return promise;
}

// Cache keys for one user's site list. A browser session may carry
// system-admin authority; a bearer credential for the same user never does,
// so the two are cached apart.
const sessionSitesKey = (userId: string) => `${userId}:session`;
const bearerSitesKey = (userId: string) => `${userId}:bearer`;

function cachedSites(cacheKey: string, load: () => Promise<AccessibleSite[]>): Promise<AccessibleSite[]> {
  const cached = sitesAccessCache.get<Promise<AccessibleSite[]>>(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    try {
      return await load();
    } catch (error) {
      console.error("Error getting sites user has access to:", error);
      // Remove from cache on error so it can be retried
      sitesAccessCache.del(cacheKey);
      return [];
    }
  })();

  sitesAccessCache.set(cacheKey, promise);
  return promise;
}

/** The sites a user reaches through a bearer credential: memberships only. */
function getBearerUserSites(userId: string): Promise<AccessibleSite[]> {
  return cachedSites(bearerSitesKey(userId), () => resolveUserSites(userId));
}

/**
 * The sites a browser session reaches: its memberships, plus admin authority
 * over every site when the user is a Better Auth system admin.
 */
function getSessionUserSites(req: FastifyRequest, userId: string): Promise<AccessibleSite[]> {
  return cachedSites(sessionSitesKey(userId), async () => {
    const [isSystemAdmin, memberSites] = await Promise.all([getIsUserAdmin(req), resolveUserSites(userId)]);
    if (!isSystemAdmin) {
      return memberSites;
    }
    const memberRoleBySite = new Map(memberSites.map(site => [site.siteId, site.accessRole]));
    const allSites = await db.select().from(sites);
    return allSites.map(site => ({
      ...site,
      accessRole: higherRole(memberRoleBySite.get(site.siteId), "admin") ?? "admin",
    }));
  });
}

/**
 * Every site the caller can reach, each with the role they hold on it.
 * `adminOnly` narrows to sites where that role is admin or owner. `fresh`
 * skips this worker's short-lived cache — for listings, where a site created,
 * deleted or granted moments ago (possibly through another worker) must show.
 */
export async function getSitesUserHasAccessTo(req: FastifyRequest, adminOnly = false): Promise<AccessibleSite[]> {
  let accessible: AccessibleSite[];

  // Organization-owned API key (attached by the auth guards).
  if (!req.user?.id && req.apiKeyOrganizationId) {
    accessible = await getSitesForOrganization(req.apiKeyOrganizationId);
  } else {
    const session = req.user?.id ? null : await getSessionFromReq(req);
    const userId = req.user?.id ?? session?.user.id;
    if (!userId) {
      return [];
    }
    accessible = req.bearerAuth ? await getBearerUserSites(userId) : await getSessionUserSites(req, userId);
  }

  return adminOnly ? accessible.filter(site => isAdminRole(site.accessRole)) : accessible;
}

/** Drop an organization-owned key's cached site list (after a site leaves or joins the organization). */
export function invalidateOrganizationSitesCache(organizationId: string) {
  sitesAccessCache.del(`org:${organizationId}`);
}

// Cache invalidation helper - call this when member site access changes
export function invalidateSitesAccessCache(userId: string) {
  sitesAccessCache.del(sessionSitesKey(userId));
  sitesAccessCache.del(bearerSitesKey(userId));
}

/**
 * Resolve the organization a request is targeting: an explicit organization
 * param, or the organization owning the site param.
 */
async function resolveTargetOrganizationId(options: {
  organizationId?: string;
  siteId?: string | number;
}): Promise<string | null> {
  if (options.organizationId) {
    return options.organizationId;
  }

  if (options.siteId) {
    const siteRecords = await db
      .select({
        organizationId: sites.organizationId,
      })
      .from(sites)
      .where(eq(sites.siteId, Number(options.siteId)))
      .limit(1);

    if (siteRecords.length > 0 && siteRecords[0].organizationId) {
      return siteRecords[0].organizationId;
    }
  }

  return null;
}

/**
 * Resolve the role a bearer-authenticated user holds for a request: on the
 * named site (the same per-site rule as their browser session, so a personal
 * key or OAuth token is held to member and team site restrictions), or else in
 * the named organization.
 */
async function resolveBearerUserRole(
  userId: string,
  options: { organizationId?: string; siteId?: string | number; fresh?: boolean }
): Promise<{ valid: boolean; role: string | null; userId?: string }> {
  const denied = { valid: false, role: null };

  if (options.siteId !== undefined && options.siteId !== null && options.siteId !== "") {
    const siteId = Number(options.siteId);
    if (!Number.isInteger(siteId)) {
      return denied;
    }
    if (options.fresh) {
      // Decided on this one site, straight from the database.
      const [role, inOrganization] = await Promise.all([
        resolveUserSiteRole(userId, siteId),
        options.organizationId ? siteIdsInOrganization([siteId], options.organizationId) : null,
      ]);
      if (!role || (inOrganization && inOrganization.length === 0)) {
        return denied;
      }
      return { valid: true, role, userId };
    }
    const findSite = (list: AccessibleSite[]) => list.find(site => site.siteId === siteId);
    let site = findSite(await getBearerUserSites(userId));
    if (!site) {
      // Never let a cached miss deny a grant made in the last few seconds.
      invalidateSitesAccessCache(userId);
      site = findSite(await getBearerUserSites(userId));
    }
    if (!site || (options.organizationId && site.organizationId !== options.organizationId)) {
      return denied;
    }
    return { valid: true, role: site.accessRole, userId };
  }

  if (options.organizationId) {
    const role = effectiveOrgRole(await getOrgMembership(userId, options.organizationId));
    if (role) {
      return { valid: true, role, userId };
    }
  }

  return denied;
}

export interface BearerAuthResult {
  valid: boolean;
  role: string | null;
  userId?: string;
  /** Set instead of userId when the credential is an organization-owned key. */
  organizationId?: string;
  rateLimited?: boolean;
  /** Budget state for this request, when a bearer credential was resolved. */
  rateLimit?: RateLimitDecision;
  /**
   * Scope statements carried by the credential. null = unrestricted (legacy
   * key with no permissions, or OAuth token with no custom scopes). Guards
   * enforce these; this function only carries them.
   */
  statements: ScopeStatements | null;
}

/**
 * Verify a bearer credential (API key, or an OAuth access token from the MCP
 * plugin) from the request and check organization membership.
 * Returns rateLimited flag when the key is rejected due to rate limiting.
 */
export async function checkApiKey(
  req: FastifyRequest,
  // fresh: resolve the user's site role from the database rather than this
  // worker's short-lived cache — for permissions that change something.
  options: { organizationId?: string; siteId?: string | number; fresh?: boolean }
): Promise<BearerAuthResult> {
  const apiKey = resolveBearerTokenFromRequest(req);
  if (!apiKey) {
    return { valid: false, role: null, statements: null };
  }

  // Reuse the MCP gate's verification when this is an in-process proxy call, so
  // a tool call doesn't verify (and rate-limit) the key a second time. The
  // gate's charge covers this call; recording it here keeps a second resolution
  // within the same request from charging again.
  const handoffIdentity = consumeBearerHandoff(req.headers[INTERNAL_BEARER_HANDOFF_HEADER], apiKey);
  if (handoffIdentity?.rateLimit) {
    setRequestRateLimit(req, handoffIdentity.rateLimit);
  }
  const identity = handoffIdentity ?? (await resolveBearerIdentity(apiKey, resolverDepsFor(req)));

  if (identity.status === "rate_limited") {
    return { valid: false, role: null, rateLimited: true, rateLimit: identity.rateLimit, statements: null };
  }
  if (identity.status === "valid" && identity.organizationId) {
    // Organization-owned key: valid only against its own organization (or a
    // site belonging to it). It acts with org-admin authority — creation is
    // restricted to org admins/owners, and scopes narrow it further.
    const targetOrganizationId = await resolveTargetOrganizationId(options);
    if (targetOrganizationId && targetOrganizationId === identity.organizationId) {
      return {
        valid: true,
        role: "admin",
        organizationId: identity.organizationId,
        rateLimit: identity.rateLimit,
        statements: identity.statements,
      };
    }
    return { valid: false, role: null, rateLimit: identity.rateLimit, statements: null };
  }
  if (identity.status === "valid" && identity.userId) {
    const membership = await resolveBearerUserRole(identity.userId, options);
    return { ...membership, rateLimit: identity.rateLimit, statements: identity.statements };
  }
  return { valid: false, role: null, statements: null };
}

export interface RequestIdentity {
  userId: string | null;
  // Set for organization-owned API keys, which authenticate as the org itself
  // and carry no user id.
  organizationId: string | null;
}

const ANONYMOUS_IDENTITY: RequestIdentity = { userId: null, organizationId: null };

/**
 * Resolve who a request is acting as: a person (dashboard session, personal
 * API key, OAuth token) or an organization (org-owned API key). Resolves the
 * bearer credential exactly once — the MCP proxy's bearer handoff is single
 * use, so a second resolution would fall through to a fresh key verification
 * and charge the caller again.
 */
export async function getRequestIdentity(req: FastifyRequest): Promise<RequestIdentity> {
  if (req.user?.id) {
    return { userId: req.user.id, organizationId: null };
  }

  // First, check for session-based auth
  const session = await getSessionFromReq(req);
  if (session?.user?.id) {
    return { userId: session.user.id, organizationId: null };
  }

  // Fall back to bearer auth (API key or OAuth token).
  const apiKey = resolveBearerTokenFromRequest(req);
  if (apiKey) {
    const identity =
      consumeBearerHandoff(req.headers[INTERNAL_BEARER_HANDOFF_HEADER], apiKey) ??
      (await resolveBearerIdentity(apiKey, bearerResolverDeps));
    if (identity.status === "valid") {
      return { userId: identity.userId ?? null, organizationId: identity.organizationId ?? null };
    }
  }

  return ANONYMOUS_IDENTITY;
}

export async function getUserIdFromRequest(req: FastifyRequest): Promise<string | null> {
  return (await getRequestIdentity(req)).userId;
}

/**
 * Whether anyone may read the site without a role on it: it is public, or the
 * request carries its current private link key.
 */
export async function getSiteIsPubliclyReadable(req: FastifyRequest, siteId: string | number): Promise<boolean> {
  const config = await siteConfig.getConfig(siteId);

  if (config?.public) {
    return true;
  }

  const privateKey = req.headers["x-private-key"];
  if (privateKey && typeof privateKey === "string" && config?.privateLinkKey === privateKey) {
    // Another worker may have revoked the key since this one cached it.
    const fresh = await siteConfig.reload(siteId);
    return fresh?.privateLinkKey === privateKey;
  }

  return false;
}

/**
 * One organization's sites the caller can reach, each with their role on it,
 * read straight from the database (no cache) — for listings, where a site
 * created, deleted, moved or granted moments ago, possibly through another
 * worker, must show correctly, and for raw-data access that must not outlive
 * a revoked grant. Loads only that organization.
 */
export async function getOrganizationSitesForCaller(
  req: FastifyRequest,
  organizationId: string
): Promise<AccessibleSite[]> {
  if (!req.user?.id && req.apiKeyOrganizationId) {
    if (req.apiKeyOrganizationId !== organizationId) {
      return [];
    }
    invalidateOrganizationSitesCache(organizationId);
    return getSitesForOrganization(organizationId);
  }

  const userId = req.user?.id ?? (await getSessionFromReq(req))?.user.id;
  if (!userId) {
    return [];
  }
  const [memberSites, isSystemAdmin] = await Promise.all([
    resolveUserSites(userId, { organizationId }),
    req.bearerAuth ? false : getIsUserAdmin(req),
  ]);
  if (!isSystemAdmin) {
    return memberSites;
  }
  const memberRoleBySite = new Map(memberSites.map(site => [site.siteId, site.accessRole]));
  const orgSites = await db.select().from(sites).where(eq(sites.organizationId, organizationId));
  return orgSites.map(site => ({
    ...site,
    accessRole: higherRole(memberRoleBySite.get(site.siteId), "admin") ?? "admin",
  }));
}

/**
 * The role the caller holds on one site, straight from the database: the
 * `fresh` path of {@link getUserSiteRole}. Reads only that site's
 * organization, membership and grants.
 */
async function resolveCallerSiteRole(req: FastifyRequest, siteId: number): Promise<OrgRole | null> {
  if (!req.user?.id && req.apiKeyOrganizationId) {
    const [inOrganization] = await siteIdsInOrganization([siteId], req.apiKeyOrganizationId);
    return inOrganization === undefined ? null : "admin";
  }

  const userId = req.user?.id ?? (await getSessionFromReq(req))?.user.id;
  if (!userId) {
    return null;
  }
  const [role, isSystemAdmin] = await Promise.all([
    resolveUserSiteRole(userId, siteId),
    req.bearerAuth ? false : getIsUserAdmin(req),
  ]);
  if (!isSystemAdmin) {
    return role;
  }
  // System admins act as admin on every existing site.
  const [site] = await db.select({ siteId: sites.siteId }).from(sites).where(eq(sites.siteId, siteId)).limit(1);
  return site ? (higherRole(role, "admin") ?? "admin") : null;
}

/**
 * The role the caller holds on a site, or null when they cannot reach it.
 * `fresh` reads it from the database instead of this worker's short-lived
 * cache, so a demotion, removal or site move made moments ago (possibly on
 * another worker) already applies; it looks at that one site only.
 */
export async function getUserSiteRole(
  req: FastifyRequest,
  siteId: string | number,
  { fresh = false }: { fresh?: boolean } = {}
): Promise<OrgRole | null> {
  if (fresh) {
    const id = Number(siteId);
    return Number.isInteger(id) ? resolveCallerSiteRole(req, id) : null;
  }
  const find = (accessible: AccessibleSite[]) =>
    accessible.find(site => site.siteId === Number(siteId))?.accessRole ?? null;
  const role = find(await getSitesUserHasAccessTo(req));
  if (role) return role;

  // A claim may have committed in another worker while this one still holds
  // the user's pre-claim site list. Never let a cached miss deny a new grant.
  const userId = req.user?.id ?? (await getSessionFromReq(req))?.user.id;
  if (!userId) return null;
  invalidateSitesAccessCache(userId);
  return find(await getSitesUserHasAccessTo(req));
}

/**
 * Whether the caller's role on the site holds the permission (roles only;
 * scopes are the guards' job). Like the route guards, anything beyond reading
 * is decided on the role as it stands now, not this worker's cached copy.
 */
export async function getUserHasSitePermission(
  req: FastifyRequest,
  siteId: string | number,
  permission: Permission
): Promise<boolean> {
  const fresh = PERMISSIONS[permission].minRole !== "viewer";
  return roleHasPermission(await getUserSiteRole(req, siteId, { fresh }), permission);
}

export async function getUserHasAccessToSite(req: FastifyRequest, siteId: string | number) {
  return (await getUserSiteRole(req, siteId)) !== null;
}

export async function getUserHasAdminAccessToSite(req: FastifyRequest, siteId: string | number) {
  return isAdminRole(await getUserSiteRole(req, siteId));
}

/**
 * The role the caller holds in an organization: their membership role, admin
 * for a system-admin browser session, admin for the organization's own API
 * key. Null when they are not in it.
 */
export async function getUserOrgRole(req: FastifyRequest, organizationId: string): Promise<OrgRole | null> {
  if (!req.user?.id && req.apiKeyOrganizationId) {
    return req.apiKeyOrganizationId === organizationId ? "admin" : null;
  }
  const userId = req.user?.id ?? (await getSessionFromReq(req))?.user.id;
  if (!userId) {
    return null;
  }
  const [membership, isSystemAdmin] = await Promise.all([
    getOrgMembership(userId, organizationId),
    req.bearerAuth ? false : getIsUserAdmin(req),
  ]);
  return higherRole(effectiveOrgRole(membership), isSystemAdmin ? "admin" : null);
}

/** Whether the caller's organization role holds the permission (roles only; scopes are the guards' job). */
export async function getUserHasOrgPermission(
  req: FastifyRequest,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  return roleHasPermission(await getUserOrgRole(req, organizationId), permission);
}
