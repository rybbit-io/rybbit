import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Rows the mocked Drizzle builder hands back, keyed by the table each query reads.
 * `team_site_access` is read twice with different meanings — once joined to `team`
 * (every site gated by any team in the scoped orgs) and once unjoined (the sites of
 * the teams this user belongs to) — so the mock tracks innerJoin as well as the table.
 */
const state = vi.hoisted(() => ({
  member: [] as unknown[],
  sites: [] as unknown[],
  member_site_access: [] as unknown[],
  team_site_access_joined: [] as unknown[],
  team_site_access: [] as unknown[],
  teamMember: [] as unknown[],
  /** Every table a query touched, in call order — lets tests assert queries are skipped. */
  queriedTables: [] as string[],
}));

vi.mock("../db/postgres/postgres.js", async () => {
  const { getTableName } = await import("drizzle-orm");

  // Drizzle query builders are thenable: access.ts awaits `.limit(1)` in one place and
  // `.where(...)` in the others, so every link in the chain resolves to the same rows.
  function chain() {
    let table = "";
    let joined = false;
    const builder: any = {
      from: (t: any) => {
        table = getTableName(t);
        return builder;
      },
      innerJoin: () => {
        joined = true;
        return builder;
      },
      where: () => builder,
      limit: () => builder,
      then: (resolve: any, reject: any) => {
        const key = table === "team_site_access" && joined ? "team_site_access_joined" : table;
        state.queriedTables.push(key);
        return Promise.resolve((state as any)[key] ?? []).then(resolve, reject);
      },
    };
    return builder;
  }

  return { db: { select: () => chain() } };
});

import {
  filterSitesByMemberAccess,
  getOrgMembership,
  isOrgAdmin,
  isOrgOwner,
  memberCanAccessSite,
  MemberSiteGrants,
  resolveMemberSiteGrants,
  restrictedMemberSiteIds,
  siteIdsInOrganization,
} from "./access.js";

function grants(overrides: Partial<Record<keyof MemberSiteGrants, number[]>> = {}): MemberSiteGrants {
  return {
    explicitSiteIds: new Set(overrides.explicitSiteIds ?? []),
    teamGatedSiteIds: new Set(overrides.teamGatedSiteIds ?? []),
    userTeamSiteIds: new Set(overrides.userTeamSiteIds ?? []),
  };
}

/** All subsets of `universe`, as arrays — used to enumerate every possible grant shape. */
function subsets(universe: number[]): number[][] {
  return Array.from({ length: 1 << universe.length }, (_, mask) => universe.filter((_, i) => mask & (1 << i)));
}

beforeEach(() => {
  state.member = [];
  state.sites = [];
  state.member_site_access = [];
  state.team_site_access_joined = [];
  state.team_site_access = [];
  state.teamMember = [];
  state.queriedTables.length = 0;
});

describe("memberCanAccessSite", () => {
  it("honours an explicit grant even for a site gated behind a team the member is not on", () => {
    const g = grants({ explicitSiteIds: [1], teamGatedSiteIds: [1] });

    expect(memberCanAccessSite(g, 1, true)).toBe(true);
    expect(memberCanAccessSite(g, 1, false)).toBe(true);
  });

  it("grants sites reached through the member's own teams regardless of the restriction flag", () => {
    const g = grants({ userTeamSiteIds: [2], teamGatedSiteIds: [2] });

    expect(memberCanAccessSite(g, 2, true)).toBe(true);
    expect(memberCanAccessSite(g, 2, false)).toBe(true);
  });

  it("denies a restricted member every site they hold no grant for", () => {
    const g = grants({ explicitSiteIds: [1], userTeamSiteIds: [2], teamGatedSiteIds: [3] });

    expect(memberCanAccessSite(g, 3, true)).toBe(false);
    // Ungated too: restricted access is grant-driven, not gating-driven.
    expect(memberCanAccessSite(g, 99, true)).toBe(false);
  });

  it("gives an unrestricted member every site no team gates, and withholds the gated ones", () => {
    const g = grants({ teamGatedSiteIds: [3] });

    expect(memberCanAccessSite(g, 99, false)).toBe(true);
    expect(memberCanAccessSite(g, 3, false)).toBe(false);
  });
});

describe("restrictedMemberSiteIds cross-checks memberCanAccessSite", () => {
  // The contract access.ts documents: the enumeration must return exactly the sites the
  // restricted branch of the predicate admits. Checked over every grant shape drawable
  // from a four-site universe (4096 combinations) so a change to either side that the
  // other does not mirror fails here.
  const universe = [1, 2, 3, 4];
  const shapes = subsets(universe);

  it("enumerates exactly the sites the restricted predicate admits, for every grant shape", () => {
    let checked = 0;

    for (const explicitSiteIds of shapes) {
      for (const teamGatedSiteIds of shapes) {
        for (const userTeamSiteIds of shapes) {
          const g = grants({ explicitSiteIds, teamGatedSiteIds, userTeamSiteIds });

          const enumerated = [...restrictedMemberSiteIds(g)].sort((a, b) => a - b);
          const predicated = universe.filter(siteId => memberCanAccessSite(g, siteId, true));

          expect(enumerated).toEqual(predicated);
          checked++;
        }
      }
    }

    expect(checked).toBe(shapes.length ** 3);
  });

  it("never repeats a site id, even when the explicit and team grants overlap", () => {
    const ids = restrictedMemberSiteIds(grants({ explicitSiteIds: [1, 2], userTeamSiteIds: [2, 3] }));

    expect([...ids].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(ids).toHaveLength(new Set(ids).size);
  });

  it("ignores teamGatedSiteIds, which only matter to the unrestricted branch", () => {
    expect(restrictedMemberSiteIds(grants({ teamGatedSiteIds: [1, 2, 3] }))).toEqual([]);
  });
});

describe("getOrgMembership", () => {
  it("returns the membership row when the user belongs to the organization", async () => {
    state.member = [
      { id: "m_1", userId: "u_1", organizationId: "org_1", role: "member", hasRestrictedSiteAccess: true },
    ];

    await expect(getOrgMembership("u_1", "org_1")).resolves.toMatchObject({ id: "m_1", role: "member" });
  });

  it("returns null when the organization has no row for the user", async () => {
    await expect(getOrgMembership("u_1", "org_1")).resolves.toBeNull();
  });

  it("short-circuits without querying when either identifier is missing", async () => {
    state.member = [
      { id: "m_1", userId: "u_1", organizationId: "org_1", role: "owner", hasRestrictedSiteAccess: false },
    ];

    await expect(getOrgMembership(undefined, "org_1")).resolves.toBeNull();
    await expect(getOrgMembership("u_1", null)).resolves.toBeNull();
    await expect(getOrgMembership("", "")).resolves.toBeNull();
    expect(state.queriedTables).toEqual([]);
  });
});

describe("isOrgAdmin / isOrgOwner", () => {
  const membership = (role: string) => ({
    id: "m_1",
    userId: "u_1",
    organizationId: "org_1",
    role,
    hasRestrictedSiteAccess: false,
  });

  it("treats admin and owner as admin, and nothing else", () => {
    expect(isOrgAdmin(membership("admin"))).toBe(true);
    expect(isOrgAdmin(membership("owner"))).toBe(true);
    expect(isOrgAdmin(membership("member"))).toBe(false);
    expect(isOrgAdmin(membership("Owner"))).toBe(false);
  });

  it("treats only owner as owner", () => {
    expect(isOrgOwner(membership("owner"))).toBe(true);
    expect(isOrgOwner(membership("admin"))).toBe(false);
  });

  it("treats a missing membership as neither", () => {
    for (const missing of [null, undefined]) {
      expect(isOrgAdmin(missing)).toBe(false);
      expect(isOrgOwner(missing)).toBe(false);
    }
  });
});

describe("siteIdsInOrganization", () => {
  it("returns only the ids the organization still owns", async () => {
    state.sites = [{ siteId: 1 }, { siteId: 3 }];

    await expect(siteIdsInOrganization([1, 2, 3], "org_1")).resolves.toEqual([1, 3]);
  });

  it("skips the query entirely for an empty id list", async () => {
    await expect(siteIdsInOrganization([], "org_1")).resolves.toEqual([]);
    expect(state.queriedTables).toEqual([]);
  });
});

describe("resolveMemberSiteGrants", () => {
  it("collects explicit grants, team-gated sites and the user's own team sites", async () => {
    state.member_site_access = [{ siteId: 1 }, { siteId: 1 }, { siteId: 2 }];
    state.team_site_access_joined = [{ siteId: 2 }, { siteId: 3 }];
    state.teamMember = [{ teamId: "t_1" }];
    state.team_site_access = [{ siteId: 3 }];

    const resolved = await resolveMemberSiteGrants({
      userId: "u_1",
      organizationIds: ["org_1"],
      grantedMemberIds: ["m_1"],
    });

    expect(resolved.explicitSiteIds).toEqual(new Set([1, 2]));
    expect(resolved.teamGatedSiteIds).toEqual(new Set([2, 3]));
    expect(resolved.userTeamSiteIds).toEqual(new Set([3]));
  });

  it("skips the explicit-grant query when no member ids are supplied", async () => {
    state.member_site_access = [{ siteId: 42 }];

    const resolved = await resolveMemberSiteGrants({
      userId: "u_1",
      organizationIds: ["org_1"],
      grantedMemberIds: [],
    });

    expect(resolved.explicitSiteIds).toEqual(new Set());
    expect(state.queriedTables).not.toContain("member_site_access");
  });

  it("skips the team-site query when the user is on no team", async () => {
    state.teamMember = [];
    state.team_site_access = [{ siteId: 7 }];

    const resolved = await resolveMemberSiteGrants({
      userId: "u_1",
      organizationIds: ["org_1"],
      grantedMemberIds: [],
    });

    expect(resolved.userTeamSiteIds).toEqual(new Set());
    expect(state.queriedTables).not.toContain("team_site_access");
  });

  it("returns empty grants without querying when there is nothing to scope by", async () => {
    const resolved = await resolveMemberSiteGrants({ userId: "u_1", organizationIds: [], grantedMemberIds: [] });

    expect(resolved.explicitSiteIds).toEqual(new Set());
    expect(resolved.teamGatedSiteIds).toEqual(new Set());
    expect(resolved.userTeamSiteIds).toEqual(new Set());
    expect(state.queriedTables).toEqual([]);
  });

  it("still loads explicit grants when only member ids are scoped, leaving the org-scoped sets empty", async () => {
    state.member_site_access = [{ siteId: 5 }];
    state.team_site_access_joined = [{ siteId: 6 }];

    const resolved = await resolveMemberSiteGrants({
      userId: "u_1",
      organizationIds: [],
      grantedMemberIds: ["m_1"],
    });

    expect(resolved.explicitSiteIds).toEqual(new Set([5]));
    expect(resolved.teamGatedSiteIds).toEqual(new Set());
    expect(state.queriedTables).toEqual(["member_site_access"]);
  });
});

describe("filterSitesByMemberAccess", () => {
  it("keeps only granted sites for a restricted member and asks for their explicit grants", async () => {
    state.member_site_access = [{ siteId: 1 }];
    state.team_site_access_joined = [{ siteId: 2 }];
    state.teamMember = [{ teamId: "t_1" }];
    state.team_site_access = [{ siteId: 2 }];

    const kept = await filterSitesByMemberAccess(
      [{ siteId: 1 }, { siteId: 2 }, { siteId: 3 }],
      "org_1",
      "u_1",
      "m_1",
      true
    );

    expect(kept).toEqual([{ siteId: 1 }, { siteId: 2 }]);
    expect(state.queriedTables).toContain("member_site_access");
  });

  it("keeps ungated sites for an unrestricted member and does not load explicit grants", async () => {
    state.member_site_access = [{ siteId: 99 }];
    state.team_site_access_joined = [{ siteId: 2 }];

    const kept = await filterSitesByMemberAccess(
      [{ siteId: 1 }, { siteId: 2 }, { siteId: 3 }],
      "org_1",
      "u_1",
      "m_1",
      false
    );

    expect(kept).toEqual([{ siteId: 1 }, { siteId: 3 }]);
    expect(state.queriedTables).not.toContain("member_site_access");
  });

  it("preserves the caller's own row shape and ordering", async () => {
    state.team_site_access_joined = [{ siteId: 2 }];

    const kept = await filterSitesByMemberAccess(
      [
        { siteId: 3, domain: "c.example" },
        { siteId: 1, domain: "a.example" },
        { siteId: 2, domain: "b.example" },
      ],
      "org_1",
      "u_1",
      "m_1",
      false
    );

    expect(kept).toEqual([
      { siteId: 3, domain: "c.example" },
      { siteId: 1, domain: "a.example" },
    ]);
  });
});
