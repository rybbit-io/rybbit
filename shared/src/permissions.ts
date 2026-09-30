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

export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

const ROLE_RANK: Record<OrgRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ROLE_RANK, value);
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
  "analytics:read": { minRole: "member", scope: read("analytics") },
  "sessions:read": { minRole: "member", scope: read("sessions") },
  "events:read": { minRole: "member", scope: read("events") },
  "users:read": { minRole: "member", scope: read("users") },
  "funnels:read": { minRole: "member", scope: read("funnels") },
  "goals:read": { minRole: "member", scope: read("goals") },
  "annotations:read": { minRole: "member", scope: read("annotations") },
  "segments:read": { minRole: "member", scope: read("segments") },
  "dashboards:read": { minRole: "member", scope: read("dashboards") },
  "flags:read": { minRole: "member", scope: read("flags") },
  "experiments:read": { minRole: "member", scope: read("experiments") },
  "replay:read": { minRole: "member", scope: read("replay") },
  "gsc:read": { minRole: "member", scope: read("gsc") },
  "sites:read": { minRole: "member", scope: read("sites") },
  "sql:read": { minRole: "member", scope: read("sql") },
  "org:read": { minRole: "member", scope: read("org") },

  // Building reports: shared analysis objects, and a member's own segments and
  // annotations (rows another user created need the :manage permission).
  "users:write": { minRole: "member", scope: write("users") },
  "funnels:write": { minRole: "member", scope: write("funnels") },
  "goals:write": { minRole: "member", scope: write("goals") },
  "dashboards:write": { minRole: "member", scope: write("dashboards") },
  "annotations:write": { minRole: "member", scope: write("annotations") },
  "segments:write": { minRole: "member", scope: write("segments") },

  // Configuring a site.
  "annotations:manage": { minRole: "admin", scope: write("annotations") },
  "segments:manage": { minRole: "admin", scope: write("segments") },
  "users:delete": { minRole: "admin", scope: write("users") },
  "replay:delete": { minRole: "admin", scope: write("replay") },
  "flags:write": { minRole: "admin", scope: write("flags") },
  "experiments:write": { minRole: "admin", scope: write("experiments") },
  "gsc:write": { minRole: "admin", scope: write("gsc") },
  "sites:configure": { minRole: "admin", scope: write("sites") },
  "imports:read": { minRole: "admin", scope: read("sites") },
  "imports:write": { minRole: "admin", scope: write("sites") },

  // Administering the organization.
  "sites:create": { minRole: "admin", scope: write("sites") },
  "sites:delete": { minRole: "admin", scope: write("sites") },
  "sites:transfer": { minRole: "admin", scope: write("sites") },
  "members:manage": { minRole: "admin", scope: write("org") },
  "teams:manage": { minRole: "admin", scope: write("org") },
  "apikeys:manage": { minRole: "admin", scope: "deny-scoped" },

  // Owning the organization.
  "billing:manage": { minRole: "owner", scope: "deny-scoped" },
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
