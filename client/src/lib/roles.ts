"use client";

import type { OrgRole, SiteGrantRole } from "@rybbit/shared";
import { useExtracted } from "next-intl";

// How organization roles are presented. What a role may do is the server's
// answer: read it through the hooks in hooks/usePermissions.ts, never from
// role names.

type RoleName = "owner" | "admin" | "editor" | "member" | "viewer";

export interface RoleInfo {
  label: string;
  description: string;
}

/**
 * Owners and admins reach every site in the organization, so site restrictions
 * don't apply to them. Presentational only: it decides whether to offer the
 * "restrict to specific sites" option, not what anyone may do.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Every organization role, highest first (ORG_ROLES in @rybbit/shared, which the client imports types from only). */
export const ORG_ROLES: readonly OrgRole[] = ["owner", "admin", "editor", "member", "viewer"];

/** The roles a site grant (a member's or a team's) can carry, lowest first as site-role pickers list them. */
export const SITE_GRANT_ROLES: readonly SiteGrantRole[] = ["viewer", "member", "editor"];

/**
 * The site roles worth offering someone with `orgRole`: a grant's role only ever
 * raises their role on those sites, so one at or below `orgRole` would change nothing.
 */
export function siteRolesAbove(orgRole: string): SiteGrantRole[] {
  const rank = ORG_ROLES.indexOf(orgRole as OrgRole);
  return rank === -1 ? [] : SITE_GRANT_ROLES.filter(role => ORG_ROLES.indexOf(role) < rank);
}

/** A role's label and one-line description, for role pickers and member lists. Unknown roles show as-is. */
export function useRoleInfo(): (role: string) => RoleInfo {
  const t = useExtracted();
  const roles: Record<RoleName, RoleInfo> = {
    owner: {
      label: t("Owner"),
      description: t("Full access, including billing and deleting the organization"),
    },
    admin: {
      label: t("Admin"),
      description: t("Manages members, sites and settings, but not billing"),
    },
    editor: {
      label: t("Editor"),
      description: t(
        "Configures sites (tracking, feature flags, experiments, imports, Search Console), but not members"
      ),
    },
    member: {
      label: t("Member"),
      description: t(
        "Views analytics and builds reports: goals, funnels, dashboards, their own segments and annotations"
      ),
    },
    viewer: {
      label: t("Viewer"),
      description: t("Read-only access to analytics"),
    },
  };
  return role =>
    Object.prototype.hasOwnProperty.call(roles, role) ? roles[role as RoleName] : { label: role, description: "" };
}
