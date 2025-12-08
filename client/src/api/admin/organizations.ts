import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "../utils";
import { authClient } from "../../lib/auth";

type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  metadata: string | null;
  role: string;
};

function getUserOrganizations(): Promise<UserOrganization[]> {
  return authedFetch("/user/organizations");
}

export const USER_ORGANIZATIONS_QUERY_KEY = "userOrganizations";

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

interface AddUserToOrganizationInput {
  email: string;
  role: string;
  organizationId: string;
}

export function useAddUserToOrganization() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, AddUserToOrganizationInput>({
    mutationFn: async ({ email, role, organizationId }: AddUserToOrganizationInput) => {
      try {
        return await authedFetch<{ message: string }>(`/organizations/${organizationId}/members`, undefined, {
          method: "POST",
          data: {
            email,
            role,
          },
        });
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

interface RemoveUserFromOrganizationInput {
  memberIdOrEmail: string;
  organizationId: string;
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

