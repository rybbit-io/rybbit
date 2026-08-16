import { and, eq, inArray } from "drizzle-orm";
import { FastifyRequest } from "fastify";
import NodeCache from "node-cache";
import { db } from "../db/postgres/postgres.js";
import { member, sites, user } from "../db/postgres/schema.js";
import {
  getOrgMembership,
  memberCanAccessSite,
  resolveMemberSiteGrants,
  restrictedMemberSiteIds,
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
import { hasScope, type ScopeRequirement, type ScopeStatements } from "./scopes.js";
import { siteConfig } from "./siteConfig.js";
import { logger } from "./logger/logger.js";

// The MCP gate injects fakes; the REST layer always uses better-auth.
const bearerResolverDeps: BearerResolverDeps = {
  verifyApiKey: apiKey => auth.api.verifyApiKey({ body: { key: apiKey } }),
  getOAuthSession: token => auth.api.getMcpSession({ headers: new Headers({ authorization: `Bearer ${token}` }) }),
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

// All sites of an organization, for org-owned API keys. Cached under an
// "org:"-prefixed key (org and user ids never collide, the prefix is hygiene).
async function getSitesForOrganization(organizationId: string) {
  const cacheKey = `org:${organizationId}`;

  const cached = sitesAccessCache.get<Promise<any[]>>(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    try {
      return await db.select().from(sites).where(eq(sites.organizationId, organizationId));
    } catch (error) {
      console.error("Error getting sites for organization:", error);
      sitesAccessCache.del(cacheKey);
      return [];
    }
  })();

  sitesAccessCache.set(cacheKey, promise);
  return promise;
}

export async function getSitesUserHasAccessTo(req: FastifyRequest, adminOnly = false) {
  // Organization-owned API key (attached by the auth guards): org-admin
  // authority over exactly its organization's sites, so member/team
  // restrictions and the adminOnly flag don't apply.
  if (!req.user?.id && req.apiKeyOrganizationId) {
    return getSitesForOrganization(req.apiKeyOrganizationId);
  }

  const session = req.user?.id ? null : await getSessionFromReq(req);
  const userId = req.user?.id ?? session?.user.id;

  if (!userId) {
    return [];
  }

  // Create cache key
  const cacheKey = `${userId}:${adminOnly}`;

  // Check if we have a cached promise
  const cached = sitesAccessCache.get<Promise<any[]>>(cacheKey);
  if (cached) {
    return cached;
  }

  // Create new promise and cache it
  const promise = (async () => {
    try {
      const [isAdmin, memberRecords] = await Promise.all([
        getIsUserAdmin(req),
        db
          .select({
            id: member.id,
            organizationId: member.organizationId,
            role: member.role,
            hasRestrictedSiteAccess: member.hasRestrictedSiteAccess,
          })
          .from(member)
          .where(eq(member.userId, userId)),
      ]);

      if (isAdmin) {
        const allSites = await db.select().from(sites);
        return allSites;
      }

      if (!memberRecords || memberRecords.length === 0) {
        return [];
      }

      // Two kinds of membership:
      //  - admin/owner (and any non-"member" role): every site of the org, no
      //    team gating
      //  - "member": the org's sites filtered by the shared Site Access rule
      const fullAccessOrgIds: string[] = [];
      const memberRowByOrgId = new Map<string, (typeof memberRecords)[0]>();

      for (const record of memberRecords) {
        // If adminOnly is true, skip members with "member" role
        if (adminOnly && record.role === "member") {
          continue;
        }

        if (record.role === "member") {
          memberRowByOrgId.set(record.organizationId, record);
        } else {
          fullAccessOrgIds.push(record.organizationId);
        }
      }

      const memberOrgIds = Array.from(memberRowByOrgId.keys());
      const restrictedMembers = Array.from(memberRowByOrgId.values()).filter(
        record => record.hasRestrictedSiteAccess
      );
      const restrictedOrgIds = restrictedMembers.map(record => record.organizationId);

      // A restricted membership reaches a closed set of sites, so its
      // organization is loaded by id below rather than read in full and
      // discarded — an org can hold far more sites than one member is granted.
      const restrictedOrgIdSet = new Set(restrictedOrgIds);
      const eagerOrgIds = Array.from(
        new Set([...fullAccessOrgIds, ...memberOrgIds.filter(id => !restrictedOrgIdSet.has(id))])
      );

      if (eagerOrgIds.length === 0 && restrictedOrgIds.length === 0) {
        return [];
      }

      const [eagerSites, grants] = await Promise.all([
        eagerOrgIds.length > 0
          ? db.select().from(sites).where(inArray(sites.organizationId, eagerOrgIds))
          : Promise.resolve([]),
        memberOrgIds.length > 0
          ? resolveMemberSiteGrants({
              userId,
              organizationIds: memberOrgIds,
              grantedMemberIds: restrictedMembers.map(record => record.id),
            })
          : null,
      ]);

      if (!grants) {
        return eagerSites;
      }

      const accessible = eagerSites.filter(site => {
        const memberRow = site.organizationId ? memberRowByOrgId.get(site.organizationId) : undefined;
        // No member row for the org means admin/owner authority over it.
        if (!memberRow) {
          return true;
        }
        return memberCanAccessSite(grants, site.siteId, memberRow.hasRestrictedSiteAccess);
      });

      if (restrictedOrgIds.length > 0) {
        const candidateSiteIds = restrictedMemberSiteIds(grants);
        if (candidateSiteIds.length > 0) {
          const grantedSites = await db
            .select()
            .from(sites)
            .where(and(inArray(sites.siteId, candidateSiteIds), inArray(sites.organizationId, restrictedOrgIds)));
          const seen = new Set(accessible.map(site => site.siteId));
          for (const site of grantedSites) {
            if (!seen.has(site.siteId)) {
              accessible.push(site);
            }
          }
        }
      }

      return accessible;
    } catch (error) {
      console.error("Error getting sites user has access to:", error);
      // Remove from cache on error so it can be retried
      sitesAccessCache.del(cacheKey);
      return [];
    }
  })();

  // Cache the promise
  sitesAccessCache.set(cacheKey, promise);

  return promise;
}

// Cache invalidation helper - call this when member site access changes
export function invalidateSitesAccessCache(userId: string) {
  sitesAccessCache.del(`${userId}:true`);
  sitesAccessCache.del(`${userId}:false`);
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
 * Resolve the org membership role for a bearer-authenticated user, scoped to
 * either an explicit organization or the organization owning a site.
 */
async function resolveBearerUserOrgRole(
  userId: string,
  options: { organizationId?: string; siteId?: string | number }
): Promise<{ valid: boolean; role: string | null; userId?: string }> {
  const organizationId = await resolveTargetOrganizationId(options);

  if (organizationId) {
    // Check if the bearer credential's user is a member of the organization
    const userMembership = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1);

    if (userMembership.length > 0) {
      return { valid: true, role: userMembership[0].role, userId };
    }
  }
  return { valid: false, role: null };
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
  options: { organizationId?: string; siteId?: string | number }
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
    const membership = await resolveBearerUserOrgRole(identity.userId, options);
    return { ...membership, rateLimit: identity.rateLimit, statements: identity.statements };
  }
  return { valid: false, role: null, statements: null };
}

export async function getUserIdFromRequest(req: FastifyRequest): Promise<string | null> {
  if (req.user?.id) {
    return req.user.id;
  }

  // First, check for session-based auth
  const session = await getSessionFromReq(req);
  if (session?.user?.id) {
    return session.user.id;
  }

  // Fall back to bearer auth (API key or OAuth token).
  const apiKey = resolveBearerTokenFromRequest(req);
  if (apiKey) {
    const identity =
      consumeBearerHandoff(req.headers[INTERNAL_BEARER_HANDOFF_HEADER], apiKey) ??
      (await resolveBearerIdentity(apiKey, bearerResolverDeps));
    if (identity.status === "valid" && identity.userId) {
      return identity.userId;
    }
  }

  return null;
}

// for routes that are potentially public
export async function getUserHasAccessToSitePublic(
  req: FastifyRequest,
  siteId: string | number,
  requiredScope?: ScopeRequirement
) {
  const [userSites, config] = await Promise.all([getSitesUserHasAccessTo(req), siteConfig.getConfig(siteId)]);

  // Check if user has direct access to the site
  const hasDirectAccess = userSites.some(site => site.siteId === Number(siteId));
  if (hasDirectAccess) {
    return true;
  }

  // Check if site is public
  if (config?.public) {
    return true;
  }

  // Check if a valid private key was provided in the header
  const privateKey = req.headers["x-private-key"];
  if (privateKey && typeof privateKey === "string" && config?.privateLinkKey === privateKey) {
    return true;
  }

  // Bearer-credential fallback. Scopes apply here too — without this check a
  // scoped key could reach any public-guard route on a private site.
  const result = await checkApiKey(req, { siteId });
  if (result.valid && (!requiredScope || hasScope(result.statements, requiredScope))) {
    return true;
  }

  return false;
}

export async function getUserHasAccessToSite(req: FastifyRequest, siteId: string | number) {
  const sites = await getSitesUserHasAccessTo(req);
  return sites.some(site => site.siteId === Number(siteId));
}

export async function getUserHasAdminAccessToSite(req: FastifyRequest, siteId: string | number) {
  const sites = await getSitesUserHasAccessTo(req, true);
  return sites.some(site => site.siteId === Number(siteId));
}

export async function getUserIsInOrg(req: FastifyRequest, organizationId: string): Promise<boolean> {
  const userId = req.user?.id ?? (await getSessionFromReq(req))?.user.id;
  return (await getOrgMembership(userId, organizationId)) !== null;
}
