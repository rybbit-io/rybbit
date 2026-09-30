import type { SiteGrantRole } from "@rybbit/shared";

import { isAdminRole, ORG_ROLES } from "@/lib/roles";

import {
  type AccessMember,
  type AccessSite,
  type AccessSource,
  type AccessTeam,
  accessBySite,
} from "../../components/siteAccess";
import type { Invitation } from "./Invitations";

// The people table's view of site access: the Teams page's per-site derivation (which mirrors the
// server's rule) folded into one summary per person.

export interface PersonAccess {
  /** Owners and admins, who reach every site on their role alone. */
  everySiteByRole: boolean;
  /** How many of the organization's sites they reach, of how many. */
  reached: number;
  total: number;
  /** Sites where a team or direct grant raises their role, by that role, highest first. */
  raised: { role: string; sites: number }[];
  /** The teams and direct grants their access comes through, beyond their role. */
  sources: AccessSource[];
}

const rank = (role: string) => {
  const index = ORG_ROLES.indexOf(role as (typeof ORG_ROLES)[number]);
  return index === -1 ? ORG_ROLES.length : index;
};

/** Site access for each person, keyed by user id. */
export function accessByPerson(
  sites: AccessSite[],
  people: AccessMember[],
  teams: AccessTeam[]
): Map<string, PersonAccess> {
  const byPerson = new Map<string, PersonAccess & { raisedCounts: Map<string, number> }>(
    people.map(person => [
      person.userId,
      {
        everySiteByRole: isAdminRole(person.role),
        reached: 0,
        total: sites.length,
        raised: [],
        sources: [],
        raisedCounts: new Map(),
      },
    ])
  );

  for (const entry of accessBySite(sites, people, teams)) {
    for (const person of entry.broad) {
      const access = byPerson.get(person.userId);
      if (access) access.reached++;
    }
    for (const { member, role, sources } of entry.scoped) {
      const access = byPerson.get(member.userId);
      if (!access) continue;
      access.reached++;
      if (role !== member.role) access.raisedCounts.set(role, (access.raisedCounts.get(role) ?? 0) + 1);
      for (const source of sources) {
        const known = access.sources.some(existing =>
          source.type === "team"
            ? existing.type === "team" && existing.teamId === source.teamId
            : existing.type === "direct"
        );
        if (!known) access.sources.push(source);
      }
    }
  }

  return new Map(
    [...byPerson].map(([userId, { raisedCounts, ...access }]) => [
      userId,
      {
        ...access,
        raised: [...raisedCounts]
          .map(([role, count]) => ({ role, sites: count }))
          .sort((a, b) => rank(a.role) - rank(b.role)),
      },
    ])
  );
}

type PendingInvitation = Pick<
  Invitation,
  "id" | "email" | "role" | "teamId" | "hasRestrictedSiteAccess" | "siteIds" | "siteRole"
>;

/** The key an invitation's access is filed under: it stands in for the member it will become. */
export const invitationAccessKey = (invitation: Pick<Invitation, "id">) => `invitation:${invitation.id}`;

/**
 * Site access for members (by user id) and pending invitations (by invitationAccessKey). An invitation
 * counts as the member it will become once accepted: its role, its site restriction, and the team it
 * adds them to.
 */
export function accessForPeople(
  sites: AccessSite[],
  members: AccessMember[],
  invitations: PendingInvitation[],
  teams: AccessTeam[]
): Map<string, PersonAccess> {
  const invited: AccessMember[] = invitations.map(invitation => ({
    userId: invitationAccessKey(invitation),
    role: invitation.role,
    user: { id: invitationAccessKey(invitation), name: null, email: invitation.email },
    siteAccess: {
      hasRestrictedSiteAccess: invitation.hasRestrictedSiteAccess === true,
      siteIds: invitation.siteIds ?? [],
      siteRole: (invitation.siteRole as SiteGrantRole | undefined) ?? null,
    },
  }));
  const teamsOnceJoined = teams.map(team => ({
    ...team,
    members: [
      ...team.members,
      ...invitations
        // better-auth stores an invitation to several teams as comma-separated ids.
        .filter(invitation => invitation.teamId?.split(",").includes(team.id))
        .map(invitation => ({ userId: invitationAccessKey(invitation), userName: null, userEmail: invitation.email })),
    ],
  }));
  return accessByPerson(sites, [...members, ...invited], teamsOnceJoined);
}
