import {
  ALL_PERMISSIONS,
  canAssignRole,
  higherRole,
  isAdminRole,
  isOrgRole,
  ORG_ROLES,
  PERMISSIONS,
  permissionsForRole,
  roleHasPermission,
} from "@rybbit/shared";
import { describe, expect, it } from "vitest";
import { SCOPE_MATRIX } from "./scopes.js";

// ORG_ROLES is listed high → low.
const ladder = [...ORG_ROLES].reverse();

describe("role ladder", () => {
  it("gives every role all the permissions of the roles below it", () => {
    for (let i = 1; i < ladder.length; i++) {
      const lower = new Set(permissionsForRole(ladder[i - 1]));
      const higher = new Set(permissionsForRole(ladder[i]));
      for (const permission of lower) {
        expect(higher.has(permission), `${ladder[i]} should hold ${permission}`).toBe(true);
      }
    }
  });

  it("gives the owner every permission and unknown roles none", () => {
    expect(permissionsForRole("owner")).toEqual(ALL_PERMISSIONS);
    expect(permissionsForRole("superuser")).toEqual([]);
    expect(permissionsForRole(null)).toEqual([]);
    expect(roleHasPermission(undefined, "analytics:read")).toBe(false);
  });

  it("maps every permission to a scope the credential taxonomy defines", () => {
    for (const [permission, spec] of Object.entries(PERMISSIONS)) {
      if (spec.scope === "deny-scoped") continue;
      const actions = SCOPE_MATRIX[spec.scope.resource] as readonly string[] | undefined;
      expect(actions?.includes(spec.scope.action), permission).toBe(true);
    }
  });

  it("separates reading, report building, site configuration and administration", () => {
    expect(roleHasPermission("viewer", "analytics:read")).toBe(true);
    expect(roleHasPermission("viewer", "goals:write")).toBe(false);
    expect(roleHasPermission("member", "goals:write")).toBe(true);
    expect(roleHasPermission("member", "sites:configure")).toBe(false);
    expect(roleHasPermission("editor", "sites:configure")).toBe(true);
    expect(roleHasPermission("editor", "flags:write")).toBe(true);
    expect(roleHasPermission("editor", "sites:create")).toBe(false);
    expect(roleHasPermission("editor", "members:manage")).toBe(false);
  });

  it("keeps billing with owners and organization administration with admins", () => {
    expect(roleHasPermission("admin", "billing:manage")).toBe(false);
    expect(roleHasPermission("owner", "billing:manage")).toBe(true);
    expect(roleHasPermission("member", "members:manage")).toBe(false);
    expect(roleHasPermission("admin", "members:manage")).toBe(true);
  });
});

describe("role helpers", () => {
  it("recognises exactly the organization roles", () => {
    for (const role of ORG_ROLES) expect(isOrgRole(role)).toBe(true);
    expect(isOrgRole("superuser")).toBe(false);
    expect(isOrgRole("toString")).toBe(false);
  });

  it("classifies admins and owners as administrators", () => {
    expect(isAdminRole("owner")).toBe(true);
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("editor")).toBe(false);
    expect(isAdminRole("member")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  it("picks the higher of two roles, ignoring unknown ones", () => {
    expect(higherRole("member", "admin")).toBe("admin");
    expect(higherRole("owner", "admin")).toBe("owner");
    expect(higherRole("superuser", "member")).toBe("member");
    expect(higherRole(null, undefined)).toBeNull();
  });

  it("never lets anyone grant a role above their own", () => {
    expect(canAssignRole("owner", "owner")).toBe(true);
    expect(canAssignRole("admin", "owner")).toBe(false);
    expect(canAssignRole("admin", "admin")).toBe(true);
    expect(canAssignRole("admin", "member")).toBe(true);
    expect(canAssignRole("admin", "viewer")).toBe(true);
    expect(canAssignRole("editor", "viewer")).toBe(false);
    expect(canAssignRole("member", "member")).toBe(false);
    expect(canAssignRole("owner", "superuser")).toBe(false);
  });
});
