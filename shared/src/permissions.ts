// Roles and permissions — the one answer to "what may this role do?".
//
// Pure data, like scopes.ts: the server enforces it (route guards, handler
// checks) and the client reads the permission names the server hands back.
// Nothing outside this file compares role strings to decide what a user may
// do; it asks roleHasPermission instead.
//
// A role is a rung on a ladder: every role holds all the permissions of the
// roles below it. Each permission names the lowest role that holds it and the
// bearer-credential scope it needs, so a request is allowed only when BOTH the
// caller's role and (for API keys and OAuth tokens) its scopes admit it.

import type { ScopeRequirement } from "./scopes";

// Highest first.
//  - owner:  everything, including billing and deleting the organization
//  - admin:  members, teams, API keys, creating/deleting/transferring sites
//  - editor: configures sites — tracking settings, flags, experiments, imports,
//            Search Console — and manages everyone's saved segments/annotations
//  - member: builds reports — goals, funnels, dashboards, own segments/annotations
//  - viewer: reads everything the organization lets them see, changes nothing
export const ORG_ROLES = ["owner", "admin", "editor", "member", "viewer"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

const ROLE_RANK: Record<OrgRole, number> = {
  viewer: 1,
  member: 2,
  editor: 3,
  admin: 4,
  owner: 5,
};

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ROLE_RANK, value);
}

/**
 * Roles a site grant (a member's per-site access, or a team's) can carry.
 * Admin authority is organization-wide, so grants stop at editor.
 */
export const SITE_GRANT_ROLES = ["editor", "member", "viewer"] as const satisfies readonly OrgRole[];
export type SiteGrantRole = (typeof SITE_GRANT_ROLES)[number];

export function isSiteGrantRole(value: unknown): value is SiteGrantRole {
  return typeof value === "string" && (SITE_GRANT_ROLES as readonly string[]).includes(value);
}

/** Admins and owners: every site in the organization, never narrowed by site grants or teams. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "owner";
}

/** The higher of two roles; null when neither is a known role. */
export function higherRole(a: string | null | undefined, b: string | null | undefined): OrgRole | null {
  const left = isOrgRole(a) ? a : null;
  const right = isOrgRole(b) ? b : null;
  if (!left) return right;
  if (!right) return left;
  return ROLE_RANK[left] >= ROLE_RANK[right] ? left : right;
}

/**
 * "deny-scoped": the permission has no scope taxonomy resource (account and
 * billing surfaces), so scoped and organization-owned credentials never get it.
 */
export type PermissionScope = ScopeRequirement | "deny-scoped";

export interface PermissionSpec {
  /** The lowest role that holds this permission. */
  minRole: OrgRole;
  /** What a bearer credential must additionally be granted. */
  scope: PermissionScope;
}

const read = (resource: ScopeRequirement["resource"]): ScopeRequirement => ({ resource, action: "read" });
const write = (resource: ScopeRequirement["resource"]): ScopeRequirement => ({ resource, action: "write" });

export const PERMISSIONS = {
  // Reading a site's analytics and the organization it belongs to.
  "analytics:read": { minRole: "viewer", scope: read("analytics") },
  "sessions:read": { minRole: "viewer", scope: read("sessions") },
  "events:read": { minRole: "viewer", scope: read("events") },
  "users:read": { minRole: "viewer", scope: read("users") },
  "funnels:read": { minRole: "viewer", scope: read("funnels") },
  "goals:read": { minRole: "viewer", scope: read("goals") },
  "annotations:read": { minRole: "viewer", scope: read("annotations") },
  "segments:read": { minRole: "viewer", scope: read("segments") },
  "dashboards:read": { minRole: "viewer", scope: read("dashboards") },
  "flags:read": { minRole: "viewer", scope: read("flags") },
  "experiments:read": { minRole: "viewer", scope: read("experiments") },
  "replay:read": { minRole: "viewer", scope: read("replay") },
  "gsc:read": { minRole: "viewer", scope: read("gsc") },
  "sites:read": { minRole: "viewer", scope: read("sites") },
  "sql:read": { minRole: "viewer", scope: read("sql") },
  "org:read": { minRole: "viewer", scope: read("org") },

  // Building reports: shared analysis objects, and a member's own segments and
  // annotations (rows another user created need the :manage permission).
  "users:write": { minRole: "member", scope: write("users") },
  "funnels:write": { minRole: "member", scope: write("funnels") },
  "goals:write": { minRole: "member", scope: write("goals") },
  "dashboards:write": { minRole: "member", scope: write("dashboards") },
  "annotations:write": { minRole: "member", scope: write("annotations") },
  "segments:write": { minRole: "member", scope: write("segments") },

  // Configuring a site, and managing saved segments and annotations other people
  // created (org-wide ones are checked against the organization role).
  "annotations:manage": { minRole: "editor", scope: write("annotations") },
  "segments:manage": { minRole: "editor", scope: write("segments") },
  "users:delete": { minRole: "editor", scope: write("users") },
  "replay:delete": { minRole: "editor", scope: write("replay") },
  "flags:write": { minRole: "editor", scope: write("flags") },
  "experiments:write": { minRole: "editor", scope: write("experiments") },
  "gsc:write": { minRole: "editor", scope: write("gsc") },
  "sites:configure": { minRole: "editor", scope: write("sites") },
  "imports:read": { minRole: "editor", scope: read("sites") },
  "imports:write": { minRole: "editor", scope: write("sites") },

  // Administering the organization.
  "sites:create": { minRole: "admin", scope: write("sites") },
  "sites:delete": { minRole: "admin", scope: write("sites") },
  "sites:transfer": { minRole: "admin", scope: write("sites") },
  "members:manage": { minRole: "admin", scope: write("org") },
  "teams:manage": { minRole: "admin", scope: write("org") },
  "apikeys:manage": { minRole: "admin", scope: "deny-scoped" },
  // Enforced by better-auth's organization access control (orgRoles in the
  // server's auth.ts); listed here so the client can ask for it by name.
  "org:rename": { minRole: "admin", scope: "deny-scoped" },

  // Owning the organization.
  "billing:manage": { minRole: "owner", scope: "deny-scoped" },
  "org:delete": { minRole: "owner", scope: "deny-scoped" },
} as const satisfies Record<string, PermissionSpec>;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function roleHasPermission(role: string | null | undefined, permission: Permission): boolean {
  if (!isOrgRole(role)) {
    return false;
  }
  return ROLE_RANK[role] >= ROLE_RANK[PERMISSIONS[permission].minRole];
}

/** Every permission the role holds, in declaration order. */
export function permissionsForRole(role: string | null | undefined): Permission[] {
  return ALL_PERMISSIONS.filter(permission => roleHasPermission(role, permission));
}

/**
 * Whether someone holding `actorRole` may give another member `targetRole`:
 * they must manage members, and never grant a role above their own (only an
 * owner makes owners).
 */
export function canAssignRole(actorRole: string | null | undefined, targetRole: string): boolean {
  if (!isOrgRole(actorRole) || !isOrgRole(targetRole)) {
    return false;
  }
  return roleHasPermission(actorRole, "members:manage") && ROLE_RANK[actorRole] >= ROLE_RANK[targetRole];
}

/** The roles someone holding `actorRole` may give to others, highest first. */
export function assignableRoles(actorRole: string | null | undefined): OrgRole[] {
  return ORG_ROLES.filter(role => canAssignRole(actorRole, role));
}
