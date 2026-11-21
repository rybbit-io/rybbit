import type { SiteGrantRole } from "@rybbit/shared";
import { describe, expect, it } from "vitest";

import { AccessMember, AccessTeam, accessBySite, initials, teamMemberEffects } from "./siteAccess";

const site = (siteId: number) => ({ siteId, name: `site-${siteId}.dev`, domain: `site-${siteId}.dev` });

function member(
  userId: string,
  role: string,
  restrictedTo?: { siteIds: number[]; siteRole?: SiteGrantRole | null }
): AccessMember {
  return {
    userId,
    role,
    user: { id: userId, name: userId, email: `${userId}@example.com` },
    siteAccess: {
      hasRestrictedSiteAccess: !!restrictedTo,
      siteIds: restrictedTo?.siteIds ?? [],
      siteRole: restrictedTo?.siteRole ?? null,
    },
  };
}

function team(id: string, userIds: string[], siteIds: number[], role: SiteGrantRole | null = null): AccessTeam {
  return {
    id,
    name: id,
    members: userIds.map(userId => ({ userId, userName: userId, userEmail: `${userId}@example.com` })),
    sites: siteIds.map(siteId => ({ siteId, domain: `site-${siteId}.dev`, name: `site-${siteId}.dev`, role })),
  };
}

const sites = [site(1), site(2), site(3)];
const siteAccess = (access: ReturnType<typeof accessBySite>, siteId: number) =>
  access.find(entry => entry.site.siteId === siteId)!;
const broadIds = (access: ReturnType<typeof accessBySite>, siteId: number) =>
  siteAccess(access, siteId).broad.map(person => person.userId);
const scoped = (access: ReturnType<typeof accessBySite>, siteId: number) =>
  siteAccess(access, siteId).scoped.map(entry => ({
    userId: entry.member.userId,
    role: entry.role,
    sources: entry.sources,
  }));

describe("accessBySite", () => {
  it("lets owners and admins reach every site on their own role, even when a team holds it or lists them", () => {
    const members = [member("admin", "admin"), member("owner", "owner")];
    const access = accessBySite(sites, members, [team("growth", ["admin"], [1], "editor")]);

    for (const { siteId } of sites) {
      expect(broadIds(access, siteId)).toEqual(["owner", "admin"]);
      expect(scoped(access, siteId)).toEqual([]);
    }
    expect(access.every(entry => entry.broadReachesEverySite)).toBe(true);
  });

  it("opens a site in no team to every unrestricted member, and closes a site in a team to members outside it", () => {
    const access = accessBySite(sites, [member("owner", "owner"), member("ann", "member")], [team("docs", [], [3])]);

    expect(broadIds(access, 1)).toEqual(["owner", "ann"]);
    // ann reaches sites 1 and 2 but not 3, so "all-site access" would overstate what she has.
    expect(siteAccess(access, 1).broadReachesEverySite).toBe(false);
    expect(broadIds(access, 3)).toEqual(["owner"]);
    expect(siteAccess(access, 3).broadReachesEverySite).toBe(true);
  });

  it("raises a member to the team's role on its sites", () => {
    const access = accessBySite(sites, [member("tom", "member")], [team("growth", ["tom"], [1, 2], "editor")]);

    expect(scoped(access, 1)).toEqual([
      { userId: "tom", role: "editor", sources: [{ type: "team", teamId: "growth", teamName: "growth" }] },
    ]);
    expect(scoped(access, 2)[0].role).toBe("editor");
    expect(scoped(access, 3)).toEqual([]);
    // tom is unrestricted and site 3 is in no team, so he reaches it on his own role.
    expect(broadIds(access, 3)).toEqual(["tom"]);
  });

  it("never lowers a role: an editor in an Editor team, or in a Member team, stays an editor", () => {
    const members = [member("eve", "editor")];

    for (const role of ["editor", "member", null] as const) {
      const access = accessBySite(sites, members, [team("growth", ["eve"], [1], role)]);
      expect(scoped(access, 1)[0].role).toBe("editor");
    }
  });

  it("gives a restricted member only the sites granted to them directly, with the grant's role", () => {
    const access = accessBySite(sites, [member("sam", "viewer", { siteIds: [2], siteRole: "member" })], []);

    expect(scoped(access, 2)).toEqual([{ userId: "sam", role: "member", sources: [{ type: "direct" }] }]);
    expect(broadIds(access, 1)).toEqual([]);
    expect(scoped(access, 1)).toEqual([]);
  });

  it("reads each direct grant's own role when a member's grants carry different roles", () => {
    const sam = member("sam", "viewer", { siteIds: [1, 2] });
    // The members endpoint reports siteRole null when grants differ, and lists each grant separately.
    sam.siteAccess.siteGrants = [
      { siteId: 1, role: "editor" },
      { siteId: 2, role: "member" },
    ];
    const access = accessBySite(sites, [sam], []);

    expect(scoped(access, 1)).toEqual([{ userId: "sam", role: "editor", sources: [{ type: "direct" }] }]);
    expect(scoped(access, 2)).toEqual([{ userId: "sam", role: "member", sources: [{ type: "direct" }] }]);
  });

  it("ignores direct grants left on a member who is no longer restricted", () => {
    const unrestricted = {
      ...member("sam", "viewer"),
      siteAccess: { hasRestrictedSiteAccess: false, siteIds: [2], siteRole: "editor" as const },
    };
    const access = accessBySite(sites, [unrestricted], []);

    expect(scoped(access, 2)).toEqual([]);
    expect(broadIds(access, 2)).toEqual(["sam"]);
  });

  it("combines every grant for a member in two teams, taking the highest role and naming both teams", () => {
    const access = accessBySite(
      sites,
      [member("aiko", "member")],
      [team("growth", ["aiko"], [1, 2], "editor"), team("platform", ["aiko"], [2, 3])]
    );

    expect(scoped(access, 1)[0].role).toBe("editor");
    expect(scoped(access, 2)).toEqual([
      {
        userId: "aiko",
        role: "editor",
        sources: [
          { type: "team", teamId: "growth", teamName: "growth" },
          { type: "team", teamId: "platform", teamName: "platform" },
        ],
      },
    ]);
    expect(scoped(access, 3)[0].role).toBe("member");
    // Every site in a team is one of hers, so her access really does span the organization.
    expect(siteAccess(access, 3).broad).toEqual([]);
  });

  it("leaves a site held only by an empty team to owners and admins", () => {
    const members = [member("owner", "owner"), member("ann", "member"), member("sam", "viewer", { siteIds: [1] })];
    const access = accessBySite(sites, members, [team("docs", [], [3], "member")]);
    const docs = siteAccess(access, 3);

    expect(docs.teams.map(entry => entry.id)).toEqual(["docs"]);
    expect(docs.broad.map(person => person.userId)).toEqual(["owner"]);
    expect(docs.scoped).toEqual([]);
  });
});

describe("teamMemberEffects", () => {
  const members = [
    member("owner", "owner"),
    member("tom", "member"),
    member("eve", "editor"),
    member("sam", "viewer", { siteIds: [3] }),
  ];
  const growth = team("growth", ["owner", "tom", "eve"], [1, 2], "editor");

  it("reports each member's resulting role on the team's sites and how much else they reach", () => {
    const teams = [growth];
    const access = accessBySite(sites, members, teams);

    expect(teamMemberEffects(growth, access, members)).toEqual([
      {
        userId: "owner",
        name: "owner",
        orgRole: "owner",
        hasEverySite: true,
        roles: [{ role: "owner", sites: 2 }],
        otherSitesReached: 1,
        otherSites: 1,
      },
      {
        userId: "tom",
        name: "tom",
        orgRole: "member",
        hasEverySite: false,
        roles: [{ role: "editor", sites: 2 }],
        otherSitesReached: 1,
        otherSites: 1,
      },
      {
        userId: "eve",
        name: "eve",
        orgRole: "editor",
        hasEverySite: false,
        roles: [{ role: "editor", sites: 2 }],
        otherSitesReached: 1,
        otherSites: 1,
      },
    ]);
  });

  it("counts other sites a restricted member can't open", () => {
    const docs = team("docs", ["sam"], [1]);
    const access = accessBySite(sites, members, [docs]);

    expect(teamMemberEffects(docs, access, members)).toEqual([
      {
        userId: "sam",
        name: "sam",
        orgRole: "viewer",
        hasEverySite: false,
        roles: [{ role: "viewer", sites: 1 }],
        otherSitesReached: 1,
        otherSites: 2,
      },
    ]);
  });
});

describe("initials", () => {
  it("uses the first and last name, else the email", () => {
    expect(initials("Tom Becker", "tom@example.com")).toBe("TB");
    expect(initials("  aiko  ", "aiko@example.com")).toBe("A");
    expect(initials(null, "priya@example.com")).toBe("P");
    expect(initials("", "")).toBe("");
  });
});
