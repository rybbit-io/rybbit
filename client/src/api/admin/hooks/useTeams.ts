import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  CreateTeamInput,
  UpdateTeamInput,
  ListTeamsResponse,
} from "../endpoints/teams";

export const TEAMS_QUERY_KEY = "teams";

export function useTeams(organizationId?: string) {
  return useQuery<ListTeamsResponse>({
    queryKey: [TEAMS_QUERY_KEY, organizationId],
    queryFn: () => fetchTeams(organizationId!),
    enabled: !!organizationId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: CreateTeamInput;
    }) => createTeam(organizationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["get-sites-from-org"] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      teamId,
      data,
    }: {
      organizationId: string;
      teamId: string;
      data: UpdateTeamInput;
    }) => updateTeam(organizationId, teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["get-sites-from-org"] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      teamId,
    }: {
      organizationId: string;
      teamId: string;
    }) => deleteTeam(organizationId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["get-sites-from-org"] });
    },
  });
}
