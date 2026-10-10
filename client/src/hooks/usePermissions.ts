import type { OrgRole, Permission } from "@rybbit/shared";
import { useUserOrganizations } from "../api/admin/hooks/useOrganizations";
import { useGetSite } from "../api/admin/hooks/useSites";
import { authClient } from "../lib/auth";

/**
 * What the signed-in user may do, as the server computed it. The client never
 * works out permissions from role names: the server returns the permission
 * list with each site (GET /sites/:id) and organization (GET
 * /user/organizations), and these hooks only look things up in it. Hide or
 * disable a control when its permission is missing — the server enforces the
 * same permission regardless.
 */
export interface PermissionSet {
  can: (permission: Permission) => boolean;
  role: OrgRole | null;
  isLoading: boolean;
}

export interface OrgPermissionSet extends PermissionSet {
  /** Roles the user may give others (invite, change role); empty unless they manage members. */
  assignableRoles: OrgRole[];
}

function permissionSet(permissions: readonly string[] | undefined, role: OrgRole | null, isLoading: boolean) {
  const granted = new Set(permissions ?? []);
  return { can: (permission: Permission) => granted.has(permission), role, isLoading };
}

/** Permissions on a site (defaults to the site in the URL/store). Empty for public and private-link viewers. */
export function useSitePermissions(siteId?: string | number): PermissionSet {
  const { data: site, isLoading } = useGetSite(siteId);
  return permissionSet(site?.permissions, site?.role ?? null, isLoading);
}

/** Permissions in an organization (defaults to the active one). */
export function useOrgPermissions(organizationId?: string): OrgPermissionSet {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const { data: organizations, isLoading } = useUserOrganizations({ enabled: !!session?.user });
  const targetId = organizationId ?? session?.session.activeOrganizationId ?? undefined;
  const organization = organizations?.find(org => org.id === targetId);
  return {
    // The organization list waits on the session, so count that wait as loading too.
    ...permissionSet(organization?.permissions, organization?.role ?? null, isSessionPending || isLoading),
    assignableRoles: organization?.assignableRoles ?? [],
  };
}

/** Whether the user holds a permission on a site (defaults to the current site). */
export function useCanOnSite(permission: Permission, siteId?: string | number): boolean {
  return useSitePermissions(siteId).can(permission);
}

/** Whether the user holds a permission in an organization (defaults to the active one). */
export function useCanInOrg(permission: Permission, organizationId?: string): boolean {
  return useOrgPermissions(organizationId).can(permission);
}
