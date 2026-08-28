import { describe, expect, it } from "vitest";

import { resolveOrganizationAccess } from "./organizationAccess";

const ORGANIZATION_ID = "org-1";

function accessForRole(role: string) {
  return resolveOrganizationAccess({
    globalRole: "user",
    memberships: [{ id: ORGANIZATION_ID, role }],
    organizationId: ORGANIZATION_ID,
  });
}

describe("resolveOrganizationAccess", () => {
  it("keeps every operation closed while the active Organization is pending", () => {
    const access = resolveOrganizationAccess({
      activeOrganizationPending: true,
      memberships: [{ id: ORGANIZATION_ID, role: "owner" }],
      organizationId: ORGANIZATION_ID,
    });

    expect(access.facts.activeOrganization.status).toBe("pending");
    expect(access.decisions.manageOrganizationSettings).toEqual({
      allowed: false,
      reason: "active-organization-pending",
    });
    expect(access.decisions.manageTeams.allowed).toBe(false);
    expect(access.decisions.viewSubscriptionSettings.allowed).toBe(false);
  });

  it("keeps protected operations closed while memberships are pending", () => {
    const access = resolveOrganizationAccess({
      membershipsPending: true,
      organizationId: ORGANIZATION_ID,
    });

    expect(access.facts.membership.status).toBe("pending");
    expect(access.decisions.manageOrganizationSettings).toEqual({
      allowed: false,
      reason: "membership-pending",
    });
  });

  it("distinguishes having no active Organization from missing membership", () => {
    const access = resolveOrganizationAccess({
      memberships: [],
      organizationId: null,
    });

    expect(access.facts.activeOrganization.status).toBe("missing");
    expect(access.decisions.manageOrganizationSettings).toEqual({
      allowed: false,
      reason: "no-active-organization",
    });
  });

  it("distinguishes a missing membership from pending membership", () => {
    const access = resolveOrganizationAccess({
      memberships: [],
      organizationId: ORGANIZATION_ID,
    });

    expect(access.facts.membership).toMatchObject({
      organizationRole: null,
      status: "missing",
    });
    expect(access.decisions.manageOrganizationSettings).toEqual({
      allowed: false,
      reason: "membership-missing",
    });
  });

  it("preserves query errors and denies access when no membership data is available", () => {
    const error = new Error("memberships unavailable");
    const access = resolveOrganizationAccess({
      membershipsError: error,
      organizationId: ORGANIZATION_ID,
    });

    expect(access.facts.membership).toMatchObject({ error, status: "error" });
    expect(access.decisions.manageTeams).toEqual({
      allowed: false,
      reason: "membership-error",
    });
  });

  it("does not grant access from cached membership data when its refresh failed", () => {
    const error = new Error("membership refresh failed");
    const access = resolveOrganizationAccess({
      memberships: [{ id: ORGANIZATION_ID, role: "owner" }],
      membershipsError: error,
      organizationId: ORGANIZATION_ID,
    });

    expect(access.facts.membership).toMatchObject({
      error,
      organizationRole: "owner",
      status: "error",
    });
    expect(access.decisions.manageOrganizationSettings).toEqual({
      allowed: false,
      reason: "membership-error",
    });
    expect(access.decisions.manageSiteConfiguration).toEqual({
      allowed: false,
      reason: "membership-error",
    });
  });

  it("denies a member each protected settings operation", () => {
    const access = accessForRole("member");

    expect(access.facts.membership.organizationRole).toBe("member");
    expect(access.decisions.manageOrganizationSettings.allowed).toBe(false);
    expect(access.decisions.manageTeams.allowed).toBe(false);
    expect(access.decisions.viewSubscriptionSettings.allowed).toBe(false);
    expect(access.decisions.manageSubscription.allowed).toBe(false);
  });

  it("allows an admin to manage Organization and Team settings but not the subscription", () => {
    const access = accessForRole("admin");

    expect(access.facts.membership.organizationRole).toBe("admin");
    expect(access.decisions.manageOrganizationSettings.allowed).toBe(true);
    expect(access.decisions.manageTeams.allowed).toBe(true);
    expect(access.decisions.viewSubscriptionSettings.allowed).toBe(true);
    expect(access.decisions.manageSubscription).toEqual({
      allowed: false,
      reason: "insufficient-organization-role",
    });
  });

  it("allows an owner every Organization settings operation", () => {
    const access = accessForRole("owner");

    expect(access.facts.membership.organizationRole).toBe("owner");
    expect(access.decisions.manageOrganizationSettings.allowed).toBe(true);
    expect(access.decisions.manageTeams.allowed).toBe(true);
    expect(access.decisions.viewSubscriptionSettings.allowed).toBe(true);
    expect(access.decisions.manageSubscription.allowed).toBe(true);
  });

  it("keeps the global-admin decision separate from Organization roles", () => {
    const access = resolveOrganizationAccess({
      globalRole: "admin",
      memberships: [],
      organizationId: ORGANIZATION_ID,
    });

    expect(access.facts.actor.globalRole).toBe("admin");
    expect(access.facts.membership.organizationRole).toBeNull();
    expect(access.decisions.manageOrganizationSettings.allowed).toBe(false);
    expect(access.decisions.manageSiteConfiguration.allowed).toBe(true);
  });

  it("lets a global admin recover Site Configuration without an Organization", () => {
    const access = resolveOrganizationAccess({
      globalRole: "admin",
      memberships: [],
      organizationId: null,
    });

    expect(access.decisions.manageSiteConfiguration.allowed).toBe(true);
  });

  it("keeps Site Configuration closed until the actor role is resolved", () => {
    const access = resolveOrganizationAccess({
      memberships: [{ id: ORGANIZATION_ID, role: "member" }],
      organizationId: ORGANIZATION_ID,
      sessionPending: true,
    });

    expect(access.decisions.manageSiteConfiguration).toEqual({
      allowed: false,
      reason: "session-pending",
    });
  });
});
