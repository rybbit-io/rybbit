import { authedFetch } from "../../utils";

export type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  metadata: string | null;
  role: string;
};

export const USER_ORGANIZATIONS_QUERY_KEY = "userOrganizations";

export function getUserOrganizations(): Promise<UserOrganization[]> {
  return authedFetch("/user/organizations");
}

export interface AddUserToOrganizationInput {
  email: string;
  role: string;
  organizationId: string;
}

export function addUserToOrganization({ email, role, organizationId }: AddUserToOrganizationInput) {
  return authedFetch<{ message: string }>(`/organizations/${organizationId}/members`, undefined, {
    method: "POST",
    data: {
      email,
      role,
    },
  });
}

export interface RemoveUserFromOrganizationInput {
  memberIdOrEmail: string;
  organizationId: string;
}
