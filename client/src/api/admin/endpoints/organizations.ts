import type { OrgRole, Permission } from "@rybbit/shared";
import { authedFetch } from "../../utils";

export type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  metadata: string | null;
  role: OrgRole;
  /** What that role allows in the organization. Read through useOrgPermissions, not directly. */
  permissions: Permission[];
  /** Roles the user may give when inviting or editing members, highest first. */
  assignableRoles: OrgRole[];
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

export interface CreateUserInOrganizationInput {
  email: string;
  name?: string;
  password: string;
  role: string;
  organizationId: string;
}

export function createUserInOrganization({ email, name, password, role, organizationId }: CreateUserInOrganizationInput) {
  return authedFetch<{ message: string }>(`/organizations/${organizationId}/users`, undefined, {
    method: "POST",
    data: {
      email,
      name,
      password,
      role,
    },
  });
}

export interface RemoveUserFromOrganizationInput {
  memberIdOrEmail: string;
  organizationId: string;
}
