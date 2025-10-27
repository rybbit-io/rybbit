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
  const [sites, config] = await Promise.all([
    getSitesUserHasAccessTo(req),
    siteConfig.getConfig(siteId),
  ]);

  // Check if user has direct access to the site
  const hasDirectAccess = sites.some(site => site.siteId === Number(siteId));
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
