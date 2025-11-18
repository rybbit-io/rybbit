import { and, eq, inArray } from "drizzle-orm";
import { FastifyRequest } from "fastify";
import NodeCache from "node-cache";
import { db } from "../db/postgres/postgres.js";
import { member, sites, user } from "../db/postgres/schema.js";
import { auth } from "./auth.js";
import { siteConfig } from "./siteConfig.js";

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

export async function getSitesUserHasAccessTo(req: FastifyRequest, adminOnly = false) {
  const session = await getSessionFromReq(req);

  const userId = session?.user.id;

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
          .select({ organizationId: member.organizationId, role: member.role })
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

      // Extract organization IDs
      const organizationIds = memberRecords
        .filter(record => !adminOnly || record.role !== "member")
        .map(record => record.organizationId);

      // Get sites for these organizations
      const siteRecords = await db.select().from(sites).where(inArray(sites.organizationId, organizationIds));

      return siteRecords;
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

// for routes that are potentially public
export async function getUserHasAccessToSitePublic(req: FastifyRequest, siteId: string | number) {
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

  // Check if a valid API key was provided
  // Priority: 1. Authorization: Bearer header (recommended), 2. Query parameter (testing only)
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  const queryApiKey = (req.query as any)?.api_key;
  const apiKey = bearerToken || queryApiKey;

  if (apiKey && typeof apiKey === "string") {
    try {
      // Verify the API key using Better Auth
      const result = await auth.api.verifyApiKey({
        body: { key: apiKey },
      });

      if (result.valid && result.key) {
        // Get the userId from the API key
        const apiKeyUserId = result.key.userId;

        // Get the site's organization
        const siteRecords = await db
          .select({
            organizationId: sites.organizationId,
          })
          .from(sites)
          .where(eq(sites.siteId, Number(siteId)))
          .limit(1);

        if (siteRecords.length > 0 && siteRecords[0].organizationId) {
          // Check if the API key's user is a member of the organization
          const userMembership = await db
            .select()
            .from(member)
            .where(and(eq(member.userId, apiKeyUserId), eq(member.organizationId, siteRecords[0].organizationId)))
            .limit(1);

          if (userMembership.length > 0) {
            return true;
          }
        }
      }
    } catch (error) {
      console.error("Error verifying API key:", error);
      // Continue to return false if API key verification fails
    }
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

export async function getUserIsInOrg(req: FastifyRequest, organizationId: string) {
  const session = await getSessionFromReq(req);

  if (!session?.user.id) {
    return false;
  }

  // Check if user is a member of this organization
  const userMembership = await db.query.member.findFirst({
    where: and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)),
  });

  return userMembership;
}
