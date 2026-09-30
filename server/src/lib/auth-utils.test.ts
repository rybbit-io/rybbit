import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Better-auth pulls in email, stripe, and env config at import time — stub the
// session API so getIsUserAdmin sees no session and auth never initializes.
vi.mock("./auth.js", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => null),
      verifyApiKey: vi.fn(async () => ({ valid: false })),
      verifyRybbitOAuthToken: vi.fn(async () => null),
    },
  },
}));

// The bearer resolver charges every verification against the rate limiter,
// which would reach for Redis (and a plan lookup) on each of these tests. Stub
// it out — the limiter has its own tests, and these are about scope carrying
// and org resolution.
vi.mock("./apiRateLimitPolicy.js", () => ({
  consumeRateLimitForIdentity: vi.fn(async () => ({
    allowed: true,
    wouldHaveDenied: false,
    scope: null,
    burstLimit: 50,
    burstRemaining: 49,
    burstResetSeconds: 1,
    dailyLimit: 5_000,
    dailyRemaining: 4_999,
    dailyResetSeconds: 3_600,
    retryAfterSeconds: 0,
  })),
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
import { auth } from "./auth.js";
import {
  checkApiKey,
  getSitesUserHasAccessTo,
  getUserHasAccessToSite,
  getUserHasAdminAccessToSite,
  getRequestIdentity,
  getUserIdFromRequest,
  getOrganizationSitesForCaller,
  getUserHasSitePermission,
  getUserOrgRole,
  getUserSiteRole,
  invalidateSitesAccessCache,
} from "./auth-utils.js";
import {
  filterSitesByMemberAccess,
  getOrgMembership,
  grantsInOrganization,
  isOrgAdmin,
  isOrgOwner,
  memberCanAccessSite,
  resolveMemberSiteGrants,
  resolveUserSiteRole,
  restrictedMemberSiteIds,
  siteIdsInOrganization,
} from "./access.js";
import { INTERNAL_BEARER_HANDOFF_HEADER, registerBearerHandoff, releaseBearerHandoff } from "./bearerAuth.js";

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
  "role" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "created_by" text
);
CREATE TABLE "team" (
  "memberCount" integer NOT NULL DEFAULT 0,
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "organizationId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp
);
CREATE TABLE "teamMember" (
  "membershipKey" text UNIQUE,
  "id" text PRIMARY KEY,
  "teamId" text NOT NULL,
  "userId" text NOT NULL,
  "createdAt" timestamp
);
CREATE TABLE "team_site_access" (
  "id" serial PRIMARY KEY,
  "team_id" text NOT NULL,
  "site_id" integer NOT NULL,
  "role" text,
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
  "first_party_proxy" boolean DEFAULT false,
  "excluded_ips" jsonb DEFAULT '[]',
  "excluded_countries" jsonb DEFAULT '[]',
  "excluded_paths" jsonb DEFAULT '[]',
  "excluded_hostnames" jsonb DEFAULT '[]',
  "excluded_user_agents" jsonb DEFAULT '[]',
  "excluded_asns" jsonb DEFAULT '[]',
  "excluded_query_params" jsonb DEFAULT '[]',
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
  "tags" jsonb DEFAULT '[]',
  "detected_platform" text,
  "claim_expires_at" timestamp
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
  await (sql as any).exec(`TRUNCATE "member", "member_site_access", "team", "teamMember", "team_site_access", "sites"`);

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
  await db
    .insert(teamSiteAccess)
    .values([
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

describe("getOrgMembership", () => {
  it("returns the membership row with the role and restriction flag", async () => {
    const membership = await getOrgMembership("user_peer", ORG);

    expect(membership).toMatchObject({
      id: "member_peer",
      userId: "user_peer",
      organizationId: ORG,
      role: "member",
      hasRestrictedSiteAccess: false,
    });
    expect(isOrgAdmin(membership)).toBe(false);
    expect(isOrgOwner(membership)).toBe(false);
  });

  it("classifies owners as both admin and owner", async () => {
    const membership = await getOrgMembership("user_owner", ORG);

    expect(isOrgAdmin(membership)).toBe(true);
    expect(isOrgOwner(membership)).toBe(true);
  });

  it("returns null for a non-member, and for a missing user or organization", async () => {
    expect(await getOrgMembership("user_stranger", ORG)).toBeNull();
    expect(await getOrgMembership("user_peer", "org_other")).toBeNull();
    expect(await getOrgMembership(undefined, ORG)).toBeNull();
    expect(await getOrgMembership("user_peer", undefined)).toBeNull();
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

// Every write into memberSiteAccess passes its ids through this — an invitation
// accepted after one of its sites moved organizations must not become a grant.
describe("siteIdsInOrganization", () => {
  it("keeps only the ids the organization currently owns", async () => {
    await db.insert(sites).values({
      id: "hex_moved",
      siteId: 700,
      name: "moved-site",
      domain: "moved.example.com",
      organizationId: "org_elsewhere",
    });

    expect((await siteIdsInOrganization([1, 700, 13], ORG)).sort((a, b) => a - b)).toEqual([1, 13]);
  });

  it("drops ids for sites that no longer exist", async () => {
    expect(await siteIdsInOrganization([1, 9999], ORG)).toEqual([1]);
  });

  it("returns nothing for an empty list without querying", async () => {
    expect(await siteIdsInOrganization([], ORG)).toEqual([]);
  });
});

// restrictedMemberSiteIds lets the resolver load a restricted member's sites by
// id instead of reading a whole organization. It is only safe while it names
// exactly the ids the predicate would admit.
describe("restrictedMemberSiteIds matches the restricted branch of memberCanAccessSite", () => {
  const universe = Array.from({ length: 13 }, (_, i) => i + 1);

  async function grantsFor(restricted: boolean) {
    return grantsInOrganization(
      await resolveMemberSiteGrants({
        userId: "user_peer",
        organizationIds: [ORG],
        grantedMemberIds: restricted ? ["member_peer"] : [],
      }),
      ORG
    );
  }

  it("enumerates exactly the sites the predicate admits, for a member on a team", async () => {
    await db.insert(memberSiteAccess).values({ memberId: "member_peer", siteId: 12 });
    const grants = await grantsFor(true);

    const enumerated = restrictedMemberSiteIds(grants).sort((a, b) => a - b);
    const admitted = universe.filter(siteId => memberCanAccessSite(grants, siteId, true));

    expect(enumerated).toEqual(admitted);
    expect(enumerated.length).toBeGreaterThan(0);
  });

  it("enumerates nothing when the predicate admits nothing", async () => {
    await db.delete(teamMember);
    const grants = await grantsFor(true);

    expect(restrictedMemberSiteIds(grants)).toEqual([]);
    expect(universe.filter(siteId => memberCanAccessSite(grants, siteId, true))).toEqual([]);
  });
});

// The policy used to be written out twice — once inside getSitesUserHasAccessTo
// and once in filterSitesByMemberAccess — with nothing forcing them to move
// together. They now share one rule; this is the test that keeps them there.
describe("the two Site Access entry points agree", () => {
  const orgSites = Array.from({ length: 13 }, (_, i) => ({ siteId: i + 1 }));

  async function bothAnswersFor(restricted: boolean): Promise<{ resolver: number[]; filter: number[] }> {
    await db.update(member).set({ hasRestrictedSiteAccess: restricted }).where(eq(member.id, "member_peer"));

    const filtered = await filterSitesByMemberAccess(orgSites, ORG, "user_peer", "member_peer", restricted);
    return {
      resolver: await siteIdsFor("user_peer"),
      filter: filtered.map(s => s.siteId).sort((a, b) => a - b),
    };
  }

  it("agree for an unrestricted member on a team", async () => {
    const { resolver, filter } = await bothAnswersFor(false);
    expect(resolver).toEqual(filter);
  });

  it("agree for an unrestricted member on no team", async () => {
    await db.delete(teamMember);
    const { resolver, filter } = await bothAnswersFor(false);
    expect(resolver).toEqual(filter);
  });

  it("agree for a restricted member whose grant is not team-gated", async () => {
    await db.insert(memberSiteAccess).values({ memberId: "member_peer", siteId: 13 });
    const { resolver, filter } = await bothAnswersFor(true);
    expect(resolver).toEqual(filter);
  });

  it("agree for a restricted member granted a site gated by another team", async () => {
    await db.insert(memberSiteAccess).values({ memberId: "member_peer", siteId: 12 });
    const { resolver, filter } = await bothAnswersFor(true);
    expect(resolver).toEqual(filter);
  });

  it("agree for a restricted member with no team and no grants", async () => {
    await db.delete(teamMember);
    const { resolver, filter } = await bothAnswersFor(true);
    expect(resolver).toEqual([]);
    expect(filter).toEqual([]);
  });

  it("agree when no site in the organization is team-gated", async () => {
    await db.delete(teamSiteAccess);
    const { resolver, filter } = await bothAnswersFor(false);
    expect(resolver).toEqual(filter);
  });
});

describe("checkApiKey — scope carrying", () => {
  const request = (token = "rb_key") => ({ headers: { authorization: `Bearer ${token}` }, query: {} }) as any;

  beforeEach(async () => {
    vi.mocked(auth.api.verifyApiKey).mockReset();
    vi.mocked(auth.api.verifyRybbitOAuthToken as any).mockReset();
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue({ valid: false } as any);
    vi.mocked(auth.api.verifyRybbitOAuthToken as any).mockResolvedValue(null);
    await db.delete(member).where(eq(member.organizationId, "org_scope"));
    await db
      .insert(member)
      .values({ id: "m_scope", organizationId: "org_scope", userId: "user_scope", role: "member", createdAt: NOW });
  });

  it("carries API key permissions as statements", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
      valid: true,
      key: { referenceId: "user_scope", permissions: { goals: ["read"] } },
    } as any);

    const result = await checkApiKey(request(), { organizationId: "org_scope" });

    expect(result.valid).toBe(true);
    expect(result.role).toBe("member");
    expect(result.statements).toEqual({ goals: ["read"] });
  });

  it("legacy keys (null permissions) carry null statements", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
      valid: true,
      key: { referenceId: "user_scope", permissions: null },
    } as any);

    const result = await checkApiKey(request(), { organizationId: "org_scope" });

    expect(result.valid).toBe(true);
    expect(result.statements).toBeNull();
  });

  it("carries OAuth token scopes as statements via the fallback", async () => {
    vi.mocked(auth.api.verifyRybbitOAuthToken as any).mockResolvedValue({
      userId: "user_scope",
      scopes: "openid goals:read",
      accessTokenExpiresAt: new Date(Date.now() + 3600_000),
    });

    const result = await checkApiKey(request("oauth_token"), { organizationId: "org_scope" });

    expect(result.valid).toBe(true);
    expect(result.statements).toEqual({ goals: ["read"] });
  });

  it("OAuth tokens without custom scopes are unrestricted", async () => {
    vi.mocked(auth.api.verifyRybbitOAuthToken as any).mockResolvedValue({
      userId: "user_scope",
      scopes: "openid",
      accessTokenExpiresAt: new Date(Date.now() + 3600_000),
    });

    const result = await checkApiKey(request("oauth_token"), { organizationId: "org_scope" });

    expect(result.valid).toBe(true);
    expect(result.statements).toBeNull();
  });

  it("reuses a valid handoff without re-verifying the key (no double rate-limit)", async () => {
    const nonce = registerBearerHandoff("rb_key", {
      status: "valid",
      userId: "user_scope",
      statements: { goals: ["read"] },
    });
    const req = {
      headers: { authorization: "Bearer rb_key", [INTERNAL_BEARER_HANDOFF_HEADER]: nonce },
      query: {},
    } as any;

    const result = await checkApiKey(req, { organizationId: "org_scope" });

    expect(result.valid).toBe(true);
    expect(result.role).toBe("member");
    expect(result.statements).toEqual({ goals: ["read"] });
    // The whole point: the proxied call did not hit better-auth again.
    expect(auth.api.verifyApiKey).not.toHaveBeenCalled();
    releaseBearerHandoff(nonce);
  });

  it("ignores a handoff whose token does not match the request and verifies normally", async () => {
    const nonce = registerBearerHandoff("some_other_token", {
      status: "valid",
      userId: "user_scope",
      statements: null,
    });
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
      valid: true,
      key: { referenceId: "user_scope", permissions: null },
    } as any);
    const req = {
      headers: { authorization: "Bearer rb_key", [INTERNAL_BEARER_HANDOFF_HEADER]: nonce },
      query: {},
    } as any;

    const result = await checkApiKey(req, { organizationId: "org_scope" });

    expect(result.valid).toBe(true);
    // Forged/mismatched handoff falls through to real verification.
    expect(auth.api.verifyApiKey).toHaveBeenCalledTimes(1);
    releaseBearerHandoff(nonce);
  });
});

describe("checkApiKey — organization-owned keys", () => {
  const request = (token = "rb_org_key") => ({ headers: { authorization: `Bearer ${token}` }, query: {} }) as any;

  // A key minted by the "org" configuration: referenceId is an org id.
  const orgKeyVerification = (referenceId: string, permissions: unknown = null) =>
    ({ valid: true, key: { referenceId, permissions, configId: "org" } }) as any;

  beforeEach(async () => {
    vi.mocked(auth.api.verifyApiKey).mockReset();
    vi.mocked(auth.api.verifyRybbitOAuthToken as any).mockReset();
    vi.mocked(auth.api.verifyRybbitOAuthToken as any).mockResolvedValue(null);
    await db.insert(sites).values([
      { id: "hex_org_a", siteId: 501, name: "org-a-site", domain: "a.example.com", organizationId: "org_a" },
      { id: "hex_org_b", siteId: 502, name: "org-b-site", domain: "b.example.com", organizationId: "org_b" },
    ]);
  });

  it("acts as org admin against its own organization", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(orgKeyVerification("org_a"));

    const result = await checkApiKey(request(), { organizationId: "org_a" });

    expect(result.valid).toBe(true);
    expect(result.role).toBe("admin");
    expect(result.organizationId).toBe("org_a");
    expect(result.userId).toBeUndefined();
    expect(result.statements).toBeNull();
  });

  it("grants access to a site belonging to its organization", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(orgKeyVerification("org_a"));

    const result = await checkApiKey(request(), { siteId: 501 });

    expect(result.valid).toBe(true);
    expect(result.role).toBe("admin");
  });

  it("rejects a different organization", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(orgKeyVerification("org_a"));

    const result = await checkApiKey(request(), { organizationId: "org_b" });

    expect(result.valid).toBe(false);
    expect(result.role).toBeNull();
  });

  it("rejects a site belonging to a different organization", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(orgKeyVerification("org_a"));

    const result = await checkApiKey(request(), { siteId: 502 });

    expect(result.valid).toBe(false);
  });

  it("rejects requests with no org or site context", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(orgKeyVerification("org_a"));

    const result = await checkApiKey(request(), {});

    expect(result.valid).toBe(false);
  });

  it("carries scoped permissions as statements", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(orgKeyVerification("org_a", { analytics: ["read"] }));

    const result = await checkApiKey(request(), { organizationId: "org_a" });

    expect(result.valid).toBe(true);
    expect(result.statements).toEqual({ analytics: ["read"] });
  });

  it("never resolves to a user id", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(orgKeyVerification("org_a"));

    expect(await getUserIdFromRequest(request())).toBeNull();
  });

  it("resolves to its organization id with a single key verification", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(orgKeyVerification("org_a"));

    expect(await getRequestIdentity(request())).toEqual({ userId: null, organizationId: "org_a" });
    expect(auth.api.verifyApiKey).toHaveBeenCalledTimes(1);
  });

  it("keys from the default configuration still resolve through user membership", async () => {
    await db.delete(member).where(eq(member.organizationId, "org_a"));
    await db
      .insert(member)
      .values({ id: "m_default", organizationId: "org_a", userId: "user_default", role: "member", createdAt: NOW });
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
      valid: true,
      key: { referenceId: "user_default", permissions: null, configId: "default" },
    } as any);

    const result = await checkApiKey(request("rb_user_key"), { organizationId: "org_a" });

    expect(result.valid).toBe(true);
    expect(result.role).toBe("member");
    expect(result.userId).toBe("user_default");
    expect(result.organizationId).toBeUndefined();
  });
});

describe("per-site roles", () => {
  it("attaches the caller's role to every site they can reach", async () => {
    invalidateSitesAccessCache("user_peer");
    invalidateSitesAccessCache("user_owner");
    const peerSites = await getSitesUserHasAccessTo(reqFor("user_peer"));
    const ownerSites = await getSitesUserHasAccessTo(reqFor("user_owner"));

    expect(new Set(peerSites.map(site => site.accessRole))).toEqual(new Set(["member"]));
    expect(new Set(ownerSites.map(site => site.accessRole))).toEqual(new Set(["owner"]));
  });

  it("answers a site role for reachable sites and null otherwise", async () => {
    invalidateSitesAccessCache("user_peer");
    expect(await getUserSiteRole(reqFor("user_peer"), 1)).toBe("member");
    expect(await getUserSiteRole(reqFor("user_peer"), 12)).toBeNull();
    expect(await getUserSiteRole(reqFor("user_owner"), 12)).toBe("owner");
  });

  it("holds editors and viewers to site grants and teams like members", async () => {
    await db.insert(member).values([
      { id: "member_editor", organizationId: ORG, userId: "user_editor", role: "editor", createdAt: NOW },
      {
        id: "member_viewer",
        organizationId: ORG,
        userId: "user_viewer",
        role: "viewer",
        createdAt: NOW,
        hasRestrictedSiteAccess: true,
      },
    ]);
    await db.insert(memberSiteAccess).values({ memberId: "member_viewer", siteId: 5 });

    // Unrestricted, on no team: only the site no team gates.
    expect(await siteIdsFor("user_editor")).toEqual([13]);
    expect(await getUserSiteRole(reqFor("user_editor"), 13)).toBe("editor");
    expect(await siteIdsFor("user_viewer")).toEqual([5]);
    expect(await getUserSiteRole(reqFor("user_viewer"), 5)).toBe("viewer");
  });

  it("gives a membership with an unknown role no access at all", async () => {
    await db.insert(member).values({
      id: "member_odd",
      organizationId: ORG,
      userId: "user_odd",
      role: "superuser",
      createdAt: NOW,
    });

    expect(await siteIdsFor("user_odd")).toEqual([]);
  });

  it("filters to admin-role sites when asked", async () => {
    invalidateSitesAccessCache("user_peer");
    expect(await getSitesUserHasAccessTo(reqFor("user_peer"), true)).toEqual([]);
    expect((await getSitesUserHasAccessTo(reqFor("user_owner"), true)).length).toBe(13);
  });
});

describe("per-site roles from grants and teams", () => {
  it("gives a restricted member the role their grant carries", async () => {
    await db.insert(member).values({
      id: "member_client",
      organizationId: ORG,
      userId: "user_client",
      role: "viewer",
      createdAt: NOW,
      hasRestrictedSiteAccess: true,
    });
    await db.insert(memberSiteAccess).values([
      { memberId: "member_client", siteId: 5, role: "editor" },
      { memberId: "member_client", siteId: 6, role: null },
    ]);

    invalidateSitesAccessCache("user_client");
    expect(await getUserSiteRole(reqFor("user_client"), 5)).toBe("editor");
    // A grant without a role of its own carries the organization role.
    expect(await getUserSiteRole(reqFor("user_client"), 6)).toBe("viewer");
    expect(await getUserSiteRole(reqFor("user_client"), 7)).toBeNull();
  });

  it("raises a team member's role on the team's sites only", async () => {
    await db.update(teamSiteAccess).set({ role: "editor" }).where(eq(teamSiteAccess.teamId, "team_bbc"));

    invalidateSitesAccessCache("user_peer");
    expect(await getUserSiteRole(reqFor("user_peer"), 1)).toBe("editor");
    expect(await getUserSiteRole(reqFor("user_peer"), 13)).toBe("member");
  });

  it("never lowers a role below the member's organization role", async () => {
    await db.update(teamSiteAccess).set({ role: "viewer" }).where(eq(teamSiteAccess.teamId, "team_bbc"));
    await db.update(member).set({ role: "editor" }).where(eq(member.id, "member_peer"));

    invalidateSitesAccessCache("user_peer");
    // The team grant says viewer; the member's own role is higher and stands.
    expect(await getUserSiteRole(reqFor("user_peer"), 1)).toBe("editor");
  });

  it("ignores a grant naming a role grants cannot carry", async () => {
    await db.insert(member).values({
      id: "member_forged",
      organizationId: ORG,
      userId: "user_forged",
      role: "viewer",
      createdAt: NOW,
      hasRestrictedSiteAccess: true,
    });
    await db.insert(memberSiteAccess).values({ memberId: "member_forged", siteId: 5, role: "owner" });

    expect(await siteIdsFor("user_forged")).toEqual([]);
  });

  it("ignores a grant its organization wrote for a site that has since moved away", async () => {
    // user_client is a viewer in both organizations; ORG's editor grant on
    // site 5 was written (or raced in) after site 5 moved to org_new.
    await db.insert(member).values([
      {
        id: "m_client_old",
        organizationId: ORG,
        userId: "user_client2",
        role: "viewer",
        createdAt: NOW,
        hasRestrictedSiteAccess: true,
      },
      { id: "m_client_new", organizationId: "org_new", userId: "user_client2", role: "viewer", createdAt: NOW },
    ]);
    await db.insert(memberSiteAccess).values({ memberId: "m_client_old", siteId: 5, role: "editor" });
    await db.update(sites).set({ organizationId: "org_new" }).where(eq(sites.siteId, 5));

    invalidateSitesAccessCache("user_client2");
    expect(await getUserSiteRole(reqFor("user_client2"), 5)).toBe("viewer");
  });

  it("treats a restricted member as a viewer across the organization", async () => {
    await db.insert(member).values({
      id: "member_restricted_editor",
      organizationId: ORG,
      userId: "user_restricted_editor",
      role: "editor",
      createdAt: NOW,
      hasRestrictedSiteAccess: true,
    });
    await db.insert(memberSiteAccess).values({ memberId: "member_restricted_editor", siteId: 5 });

    expect(await getUserOrgRole(reqFor("user_restricted_editor"), ORG)).toBe("viewer");
    invalidateSitesAccessCache("user_restricted_editor");
    expect(await getUserSiteRole(reqFor("user_restricted_editor"), 5)).toBe("editor");
  });
});

describe("getUserHasSitePermission", () => {
  it("decides anything beyond reading on the current role, not a cached one", async () => {
    invalidateSitesAccessCache("user_owner");
    expect(await getUserSiteRole(reqFor("user_owner"), 13)).toBe("owner"); // warms the cache

    // Demoted elsewhere (another worker): nothing invalidates this cache.
    await db.update(member).set({ role: "viewer" }).where(eq(member.id, "member_owner"));

    expect(await getUserHasSitePermission(reqFor("user_owner"), 13, "gsc:write")).toBe(false);
    expect(await getUserHasSitePermission(reqFor("user_owner"), 13, "analytics:read")).toBe(true);
  });
});

describe("resolving one site agrees with resolving the list", () => {
  it("gives every user the same role on every site either way", async () => {
    // A spread of shapes: owner, unrestricted member on a team (team role
    // raised to editor), restricted viewer with a raised and a plain grant, an
    // unknown role, a stale grant from an organization the site has left.
    await db.update(teamSiteAccess).set({ role: "editor" }).where(eq(teamSiteAccess.teamId, "team_bbc"));
    await db.insert(member).values([
      {
        id: "m_v",
        organizationId: ORG,
        userId: "user_v",
        role: "viewer",
        createdAt: NOW,
        hasRestrictedSiteAccess: true,
      },
      { id: "m_odd", organizationId: ORG, userId: "user_odd2", role: "superuser", createdAt: NOW },
      { id: "m_other", organizationId: "org_other", userId: "user_v", role: "viewer", createdAt: NOW },
    ]);
    await db.insert(memberSiteAccess).values([
      { memberId: "m_v", siteId: 3, role: "editor" },
      { memberId: "m_v", siteId: 13, role: null },
      { memberId: "m_other", siteId: 4, role: "editor" },
    ]);

    for (const userId of ["user_owner", "user_peer", "user_v", "user_odd2", "user_nobody"]) {
      invalidateSitesAccessCache(userId);
      const listed = await getSitesUserHasAccessTo(reqFor(userId));
      for (let siteId = 1; siteId <= 13; siteId++) {
        const fromList = listed.find(site => site.siteId === siteId)?.accessRole ?? null;
        expect(await resolveUserSiteRole(userId, siteId), `${userId} on site ${siteId}`).toBe(fromList);
      }
    }
  });
});

describe("getOrganizationSitesForCaller", () => {
  it("returns only that organization's sites the caller reaches, with their roles", async () => {
    await db.insert(sites).values({
      id: "hex_other_org",
      siteId: 700,
      name: "other",
      domain: "other.example.com",
      organizationId: "org_other",
    });
    await db
      .insert(member)
      .values({
        id: "m_owner_other",
        organizationId: "org_other",
        userId: "user_owner",
        role: "owner",
        createdAt: NOW,
      });

    const peerSites = await getOrganizationSitesForCaller(reqFor("user_peer"), ORG);
    expect(peerSites.map(site => site.siteId).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]);
    const ownerSites = await getOrganizationSitesForCaller(reqFor("user_owner"), ORG);
    expect(ownerSites).toHaveLength(13);
    expect(ownerSites.every(site => site.organizationId === ORG && site.accessRole === "owner")).toBe(true);
  });
});

describe("getUserOrgRole", () => {
  it("reads the membership role", async () => {
    expect(await getUserOrgRole(reqFor("user_peer"), ORG)).toBe("member");
    expect(await getUserOrgRole(reqFor("user_owner"), ORG)).toBe("owner");
    expect(await getUserOrgRole(reqFor("user_nobody"), ORG)).toBeNull();
  });

  it("treats an organization key as admin of its own organization only", async () => {
    const orgKey = (organizationId: string) =>
      ({ headers: {}, query: {}, apiKeyOrganizationId: organizationId }) as any;

    expect(await getUserOrgRole(orgKey(ORG), ORG)).toBe("admin");
    expect(await getUserOrgRole(orgKey("org_other"), ORG)).toBeNull();
  });
});

// A personal key or OAuth token must reach exactly the sites its user's
// browser session reaches — the guards trust checkApiKey before they consult
// the session, so a key that ignored member/team restrictions would be a way
// around them.
describe("checkApiKey — user credentials honour site restrictions", () => {
  const request = () => ({ headers: { authorization: "Bearer rb_user_key" }, query: {} }) as any;
  const userKey = (userId: string) =>
    ({ valid: true, key: { referenceId: userId, permissions: null, configId: "default" } }) as any;

  beforeEach(async () => {
    vi.mocked(auth.api.verifyApiKey).mockReset();
    vi.mocked(auth.api.verifyRybbitOAuthToken as any).mockReset();
    vi.mocked(auth.api.verifyRybbitOAuthToken as any).mockResolvedValue(null);
    await db.insert(member).values({
      id: "member_restricted",
      organizationId: ORG,
      userId: "user_restricted",
      role: "member",
      createdAt: NOW,
      hasRestrictedSiteAccess: true,
    });
    await db.insert(memberSiteAccess).values({ memberId: "member_restricted", siteId: 13 });
    await db.insert(sites).values({
      id: "hex_elsewhere",
      siteId: 900,
      name: "elsewhere",
      domain: "elsewhere.example.com",
      organizationId: "org_elsewhere",
    });
  });

  it("admits a restricted member's key on a granted site", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(userKey("user_restricted"));

    const result = await checkApiKey(request(), { siteId: 13 });

    expect(result.valid).toBe(true);
    expect(result.role).toBe("member");
  });

  it("rejects a restricted member's key on an ungranted site in the same organization", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(userKey("user_restricted"));

    const result = await checkApiKey(request(), { siteId: 1 });

    expect(result.valid).toBe(false);
    expect(result.role).toBeNull();
  });

  it("rejects an unrestricted member's key on a site gated by a team they are not on", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(userKey("user_peer"));

    expect((await checkApiKey(request(), { siteId: 12 })).valid).toBe(false);
    expect((await checkApiKey(request(), { siteId: 1 })).valid).toBe(true);
  });

  it("lets an owner's key reach every site of the organization", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(userKey("user_owner"));

    expect((await checkApiKey(request(), { siteId: 12 })).valid).toBe(true);
  });

  it("rejects a site outside the organization named alongside it", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(userKey("user_owner"));

    expect((await checkApiKey(request(), { organizationId: ORG, siteId: 900 })).valid).toBe(false);
  });

  it("still validates org-level requests on membership alone", async () => {
    vi.mocked(auth.api.verifyApiKey).mockResolvedValue(userKey("user_restricted"));

    expect((await checkApiKey(request(), { organizationId: ORG })).valid).toBe(true);
  });
});

// Handlers re-check access internally through getSitesUserHasAccessTo (goals,
// funnels, gsc, custom SQL). The guards attach apiKeyOrganizationId for org
// keys; the resolver must map it to the org's full site set or every such
// handler 403s after the guard passed.
describe("getSitesUserHasAccessTo — organization-owned keys", () => {
  const orgKeyRequest = (organizationId: string) =>
    ({ headers: {}, query: {}, apiKeyOrganizationId: organizationId }) as any;

  const ALL_ORG_SITES = Array.from({ length: 13 }, (_, i) => i + 1);

  it("returns every site of the key's organization, ignoring team gating", async () => {
    const result = await getSitesUserHasAccessTo(orgKeyRequest(ORG));
    expect(result.map((s: { siteId: number }) => s.siteId).sort((a: number, b: number) => a - b)).toEqual(
      ALL_ORG_SITES
    );
  });

  it("passes internal re-checks for the org's sites and only those", async () => {
    await db.insert(sites).values({
      id: "hex_foreign",
      siteId: 601,
      name: "foreign-site",
      domain: "foreign.example.com",
      organizationId: "org_foreign",
    });

    expect(await getUserHasAccessToSite(orgKeyRequest(ORG), 1)).toBe(true);
    expect(await getUserHasAccessToSite(orgKeyRequest(ORG), 601)).toBe(false);
  });

  it("passes admin-level re-checks (org keys act as org admin)", async () => {
    expect(await getUserHasAdminAccessToSite(orgKeyRequest(ORG), 1)).toBe(true);
  });

  it("an attached user takes precedence over a stray org marker", async () => {
    const req = { user: { id: "user_peer" }, headers: {}, query: {}, apiKeyOrganizationId: "org_foreign" } as any;
    invalidateSitesAccessCache("user_peer");
    const result = await getSitesUserHasAccessTo(req);
    // user_peer is team-gated: sees BBC sites + non-gated site 13, not org_foreign's.
    expect(result.map((s: { siteId: number }) => s.siteId).sort((a: number, b: number) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13,
    ]);
  });
});

it("does not expose unclaimed sites through organization membership", async () => {
  await db.insert(sites).values({
    id: "unclaimedhex",
    siteId: 99,
    name: "Unclaimed",
    domain: "unclaimed.dev",
    organizationId: null,
    privateLinkKey: "aaaaaaaaaaaa",
    claimExpiresAt: "2100-01-01T00:00:00Z",
  });
  expect(await siteIdsFor("user_owner")).not.toContain(99);
  expect(await siteIdsFor("user_peer")).not.toContain(99);
  expect(await getOrgMembership("user_owner", null)).toBeNull();
});

it("refreshes cached session access after another worker claims a site", async () => {
  invalidateSitesAccessCache("user_owner");
  await getSitesUserHasAccessTo(reqFor("user_owner"));
  await getSitesUserHasAccessTo(reqFor("user_owner"), true);
  await db.insert(sites).values({
    id: "claimedhex",
    siteId: 99,
    name: "Claimed",
    domain: "claimed.dev",
    organizationId: ORG,
  });
  expect(await getUserHasAccessToSite(reqFor("user_owner"), 99)).toBe(true);
  expect(await getUserHasAdminAccessToSite(reqFor("user_owner"), 99)).toBe(true);
});
