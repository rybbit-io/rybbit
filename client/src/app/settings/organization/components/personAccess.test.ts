import type { SiteGrantRole } from "@rybbit/shared";
import { describe, expect, it } from "vitest";

import type { AccessMember, AccessTeam } from "../../components/siteAccess";
import { accessForPeople, invitationAccessKey } from "./personAccess";

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

const sites = [site(1), site(2), site(3), site(4)];

describe("accessForPeople", () => {
  it("gives owners and admins every site on their role", () => {
    const access = accessForPeople(sites, [member("ann", "admin")], [], [team("growth", [], [1, 2])]);
    expect(access.get("ann")).toMatchObject({ everySiteByRole: true, reached: 4, total: 4, sources: [] });
  });

  it("counts only sites in no team for an unrestricted member outside every team", () => {
    const access = accessForPeople(sites, [member("lena", "viewer")], [], [team("growth", [], [1, 2])]);
    expect(access.get("lena")).toMatchObject({ everySiteByRole: false, reached: 2, total: 4, raised: [] });
  });

  it("reaches no site when every site belongs to a team they aren't on", () => {
    const access = accessForPeople(sites, [member("lena", "viewer")], [], [team("growth", [], [1, 2, 3, 4])]);
    expect(access.get("lena")?.reached).toBe(0);
  });

  it("adds a team's sites, with the role the team raises them to and the team as the source", () => {
    const access = accessForPeople(
      sites,
      [member("tom", "member")],
      [],
      [team("growth", ["tom"], [1, 2], "editor"), team("platform", [], [3])]
    );
    expect(access.get("tom")).toEqual({
      everySiteByRole: false,
      reached: 3,
      total: 4,
      raised: [{ role: "editor", sites: 2 }],
      sources: [{ type: "team", teamId: "growth", teamName: "growth" }],
    });
  });

  it("limits a restricted member to their direct grants plus their teams", () => {
    const access = accessForPeople(
      sites,
      [member("sam", "viewer", { siteIds: [4], siteRole: "member" })],
      [],
      [team("growth", ["sam"], [1])]
    );
    expect(access.get("sam")).toEqual({
      everySiteByRole: false,
      reached: 2,
      total: 4,
      raised: [{ role: "member", sites: 1 }],
      sources: [{ type: "team", teamId: "growth", teamName: "growth" }, { type: "direct" }],
    });
  });

  it("treats an invitation as the member it becomes, in the team it adds them to", () => {
    const invitation = {
      id: "inv-1",
      email: "jonas@example.com",
      role: "editor",
      teamId: "growth",
      hasRestrictedSiteAccess: false,
      siteIds: [],
    } as unknown as Parameters<typeof accessForPeople>[2][number];
    const access = accessForPeople(sites, [], [invitation], [team("growth", [], [1]), team("platform", [], [2])]);
    expect(access.get(invitationAccessKey(invitation))).toMatchObject({
      reached: 3,
      total: 4,
      sources: [{ type: "team", teamId: "growth", teamName: "growth" }],
    });
  });

  it("puts an invitation to several teams in each of them", () => {
    // better-auth stores the team ids of a multi-team invitation comma-separated.
    const invitation = {
      id: "inv-2",
      email: "ops@example.com",
      role: "viewer",
      teamId: "growth,platform",
      hasRestrictedSiteAccess: false,
      siteIds: [],
    } as unknown as Parameters<typeof accessForPeople>[2][number];
    const teams = [team("growth", [], [1]), team("platform", [], [2]), team("docs", [], [3, 4])];
    const access = accessForPeople(sites, [], [invitation], teams);
    expect(access.get(invitationAccessKey(invitation))).toMatchObject({ reached: 2, total: 4 });
    expect(access.get(invitationAccessKey(invitation))?.sources).toEqual([
      { type: "team", teamId: "growth", teamName: "growth" },
      { type: "team", teamId: "platform", teamName: "platform" },
    ]);
  });

  it("keeps an invitation restricted to specific sites to those sites", () => {
    const invitation = {
      id: "inv-2",
      email: "ops@example.com",
      role: "viewer",
      teamId: null,
      hasRestrictedSiteAccess: true,
      siteIds: [2, 3],
      siteRole: "editor",
    } as unknown as Parameters<typeof accessForPeople>[2][number];
    const access = accessForPeople(sites, [], [invitation], []);
    expect(access.get(invitationAccessKey(invitation))).toEqual({
      everySiteByRole: false,
      reached: 2,
      total: 4,
      raised: [{ role: "editor", sites: 2 }],
      sources: [{ type: "direct" }],
    });
  });
});
