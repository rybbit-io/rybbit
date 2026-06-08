import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { member, sites } from "../../db/postgres/schema.js";

/** Returns the subset of userIds that are NOT members of the organization. */
export async function findInvalidOrgMemberIds(organizationId: string, memberUserIds: string[]): Promise<string[]> {
  if (memberUserIds.length === 0) return [];
  const orgMembers = await db
    .select({ userId: member.userId })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), inArray(member.userId, memberUserIds)));
  const validUserIds = new Set(orgMembers.map((m) => m.userId));
  return memberUserIds.filter((id) => !validUserIds.has(id));
}

/** Returns the subset of siteIds that do NOT belong to the organization. */
export async function findInvalidOrgSiteIds(organizationId: string, siteIds: number[]): Promise<number[]> {
  if (siteIds.length === 0) return [];
  const orgSites = await db
    .select({ siteId: sites.siteId })
    .from(sites)
    .where(and(eq(sites.organizationId, organizationId), inArray(sites.siteId, siteIds)));
  const validSiteIds = new Set(orgSites.map((s) => s.siteId));
  return siteIds.filter((id) => !validSiteIds.has(id));
}
