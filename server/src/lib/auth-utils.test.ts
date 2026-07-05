import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Better-auth pulls in email, stripe, and env config at import time — stub the
// session API so getIsUserAdmin sees no session and auth never initializes.
vi.mock("./auth.js", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => null),
      verifyApiKey: vi.fn(async () => ({ valid: false })),
    },
  },
}));

// Replace the postgres-js connection with an in-memory PGlite database so the
// real drizzle queries in auth-utils run against real SQL.
vi.mock("../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../db/postgres/schema.js");
  const client = new PGlite();
  const db = drizzle(client, { schema });
  return { db, sql: client };
});

import { db, sql } from "../db/postgres/postgres.js";
import { member, memberSiteAccess, sites, team, teamMember, teamSiteAccess } from "../db/postgres/schema.js";
import { getSitesUserHasAccessTo, invalidateSitesAccessCache } from "./auth-utils.js";
import { filterSitesByMemberAccess } from "./siteAccess.js";

// Only the tables getSitesUserHasAccessTo touches. Column names must match the
// drizzle schema exactly (unnamed columns use their TS property name verbatim).
const DDL = `
CREATE TABLE "member" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "userId" text NOT NULL,
  "role" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "has_restricted_site_access" boolean NOT NULL DEFAULT false
);
CREATE TABLE "member_site_access" (
  "id" serial PRIMARY KEY,
  "member_id" text NOT NULL,
  "site_id" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "created_by" text
);
CREATE TABLE "team" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "organizationId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp
);
CREATE TABLE "teamMember" (
  "id" text PRIMARY KEY,
  "teamId" text NOT NULL,
  "userId" text NOT NULL,
  "createdAt" timestamp
);
CREATE TABLE "team_site_access" (
  "id" serial PRIMARY KEY,
  "team_id" text NOT NULL,
  "site_id" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE "sites" (
  "id" text,
  "site_id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "type" text,
  "domain" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "created_by" text,
  "organization_id" text,
  "public" boolean DEFAULT false,
  "embed_enabled" boolean DEFAULT false,
  "saltUserIds" boolean DEFAULT false,
  "blockBots" boolean DEFAULT true NOT NULL,
  "excluded_ips" jsonb DEFAULT '[]',
  "excluded_countries" jsonb DEFAULT '[]',
  "excluded_paths" jsonb DEFAULT '[]',
  "excluded_hostnames" jsonb DEFAULT '[]',
  "excluded_user_agents" jsonb DEFAULT '[]',
  "sessionReplay" boolean DEFAULT false,
  "webVitals" boolean DEFAULT false,
  "trackErrors" boolean DEFAULT false,
  "trackOutbound" boolean DEFAULT true,
  "trackUrlParams" boolean DEFAULT true,
  "trackInitialPageView" boolean DEFAULT true,
  "trackSpaNavigation" boolean DEFAULT true,
  "trackIp" boolean DEFAULT false,
  "trackButtonClicks" boolean DEFAULT false,
  "trackCopy" boolean DEFAULT false,
  "trackFormInteractions" boolean DEFAULT false,
  "api_key" text,
  "private_link_key" text,
  "tags" jsonb DEFAULT '[]'
);
`;

const ORG = "org_1";
const NOW = "2026-01-01 00:00:00";

function reqFor(userId: string) {
  return { user: { id: userId }, headers: {} } as any;
}

async function siteIdsFor(userId: string): Promise<number[]> {
  invalidateSitesAccessCache(userId);
  const result = await getSitesUserHasAccessTo(reqFor(userId));
  return result.map((s: { siteId: number }) => s.siteId).sort((a: number, b: number) => a - b);
}

beforeAll(async () => {
  await (sql as any).exec(DDL);
});

beforeEach(async () => {
  await (sql as any).exec(
    `TRUNCATE "member", "member_site_access", "team", "teamMember", "team_site_access", "sites"`
  );

  // Org with 13 sites:
  //   1-11 gated by team "bbc", 12 gated by team "other", 13 not team-gated
  await db.insert(sites).values(
    Array.from({ length: 13 }, (_, i) => ({
      id: `hex${i + 1}`, // explicit: the schema default needs pgcrypto, absent in PGlite
      siteId: i + 1,
      name: `site-${i + 1}`,
      domain: `site${i + 1}.example.com`,
      organizationId: ORG,
    }))
  );
  await db.insert(team).values([
    { id: "team_bbc", name: "BBC", organizationId: ORG, createdAt: NOW },
    { id: "team_other", name: "Other", organizationId: ORG, createdAt: NOW },
  ]);
  await db.insert(teamSiteAccess).values([
    ...Array.from({ length: 11 }, (_, i) => ({ teamId: "team_bbc", siteId: i + 1 })),
    { teamId: "team_other", siteId: 12 },
  ]);

  // Peer: member role, on team BBC
  await db.insert(member).values({
    id: "member_peer",
    organizationId: ORG,
    userId: "user_peer",
    role: "member",
    createdAt: NOW,
    hasRestrictedSiteAccess: false,
  });
  await db.insert(teamMember).values({ id: "tm_1", teamId: "team_bbc", userId: "user_peer" });

  // An owner for the admin-path sanity check
  await db.insert(member).values({
    id: "member_owner",
    organizationId: ORG,
    userId: "user_owner",
    role: "owner",
    createdAt: NOW,
    hasRestrictedSiteAccess: false,
  });
});

describe("getSitesUserHasAccessTo — team-based access", () => {
  it("unrestricted member on a team sees their team's sites plus non-gated sites", async () => {
    expect(await siteIdsFor("user_peer")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]);
  });

  it("owner sees every site regardless of team gating", async () => {
    expect(await siteIdsFor("user_owner")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it("restricted member keeps team-granted sites in addition to explicit site grants", async () => {
    // Grant site 13 (not team-gated) explicitly — the reported bug: this wipes
    // out the member's team-based access instead of adding to it.
    await db.update(member).set({ hasRestrictedSiteAccess: true }).where(eq(member.id, "member_peer"));
    await db.insert(memberSiteAccess).values({ memberId: "member_peer", siteId: 13 });

    expect(await siteIdsFor("user_peer")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]);
  });

  it("explicitly granted site stays accessible even when gated by a team the member is not on", async () => {
    // Grant site 12 (gated by team "other") — currently the team filter deletes
    // the granted site too, leaving the member with access to nothing.
    await db.update(member).set({ hasRestrictedSiteAccess: true }).where(eq(member.id, "member_peer"));
    await db.insert(memberSiteAccess).values({ memberId: "member_peer", siteId: 12 });

    expect(await siteIdsFor("user_peer")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("restricted member with no team and no grants sees nothing", async () => {
    await db.delete(teamMember);
    await db.update(member).set({ hasRestrictedSiteAccess: true }).where(eq(member.id, "member_peer"));

    expect(await siteIdsFor("user_peer")).toEqual([]);
  });
});

// Shared filter used by getSitesFromOrg, getMyOrganizations, and weekly reports
describe("filterSitesByMemberAccess", () => {
  const orgSites = Array.from({ length: 13 }, (_, i) => ({ siteId: i + 1 }));

  async function filteredIdsFor(restricted: boolean): Promise<number[]> {
    const result = await filterSitesByMemberAccess(orgSites, ORG, "user_peer", "member_peer", restricted);
    return result.map(s => s.siteId).sort((a, b) => a - b);
  }

  it("unrestricted member on a team sees their team's sites plus non-gated sites", async () => {
    expect(await filteredIdsFor(false)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]);
  });

  it("restricted member keeps team-granted sites in addition to explicit site grants", async () => {
    await db.insert(memberSiteAccess).values({ memberId: "member_peer", siteId: 13 });
    expect(await filteredIdsFor(true)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]);
  });

  it("explicitly granted site stays accessible even when gated by a team the member is not on", async () => {
    await db.insert(memberSiteAccess).values({ memberId: "member_peer", siteId: 12 });
    expect(await filteredIdsFor(true)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("restricted member with no team and no grants sees nothing", async () => {
    await db.delete(teamMember);
    expect(await filteredIdsFor(true)).toEqual([]);
  });
});
