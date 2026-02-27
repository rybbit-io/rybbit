import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../../lib/auth";
import {
  getUserOrganizations,
  addUserToOrganization,
  USER_ORGANIZATIONS_QUERY_KEY,
  AddUserToOrganizationInput,
  RemoveUserFromOrganizationInput,
} from "../endpoints";

export { USER_ORGANIZATIONS_QUERY_KEY } from "../endpoints";

export function useUserOrganizations() {
  return useQuery({
    queryKey: [USER_ORGANIZATIONS_QUERY_KEY],
    queryFn: getUserOrganizations,
  });
}

export function useOrganizationInvitations(organizationId: string) {
  return useQuery({
    queryKey: ["invitations", organizationId],
    queryFn: async () => {
      const invitations = await authClient.organization.listInvitations({
        query: {
          organizationId,
        },
      });

      if (invitations.error) {
        throw new Error(invitations.error.message);
      }

      return invitations.data;
    },
  });
}

export function useAddUserToOrganization() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, AddUserToOrganizationInput>({
    mutationFn: async (input: AddUserToOrganizationInput) => {
      try {
        return await addUserToOrganization(input);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to add user to organization");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: [USER_ORGANIZATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useRemoveUserFromOrganization() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RemoveUserFromOrganizationInput>({
    mutationFn: async ({ memberIdOrEmail, organizationId }: RemoveUserFromOrganizationInput) => {
      try {
        await authClient.organization.removeMember({
          memberIdOrEmail,
          organizationId,
        });
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to remove user from organization");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: [USER_ORGANIZATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
