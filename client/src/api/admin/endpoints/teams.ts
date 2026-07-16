import { authedFetch } from "../../utils";

export type TeamMember = {
  userId: string;
  userName: string | null;
  userEmail: string;
};

export type TeamSite = {
  siteId: number;
  domain: string;
  name: string;
};

export type Team = {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string | null;
  members: TeamMember[];
  sites: TeamSite[];
};

export type ListTeamsResponse = {
  teams: Team[];
};

export type CreateTeamInput = {
  name: string;
  memberUserIds?: string[];
  siteIds?: number[];
};

export type UpdateTeamInput = {
  name?: string;
  memberUserIds?: string[];
  siteIds?: number[];
};

export function fetchTeams(organizationId: string) {
  return authedFetch<ListTeamsResponse>(
    `/organizations/${organizationId}/teams`
  );
}

export function createTeam(organizationId: string, data: CreateTeamInput) {
  return authedFetch<Team>(`/organizations/${organizationId}/teams`, undefined, {
    method: "POST",
    data,
    headers: { "Content-Type": "application/json" },
  });
}

export function updateTeam(
  organizationId: string,
  teamId: string,
  data: UpdateTeamInput
) {
  return authedFetch<{ success: boolean }>(
    `/organizations/${organizationId}/teams/${teamId}`,
    undefined,
    {
      method: "PUT",
      data,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function deleteTeam(organizationId: string, teamId: string) {
  return authedFetch<{ success: boolean }>(
    `/organizations/${organizationId}/teams/${teamId}`,
    undefined,
    { method: "DELETE" }
  );
}
