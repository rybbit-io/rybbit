export type OrganizationAccessDenialReason =
  | "active-organization-pending"
  | "active-organization-error"
  | "no-active-organization"
  | "membership-pending"
  | "membership-error"
  | "membership-missing"
  | "insufficient-organization-role"
  | "session-pending"
  | "session-error";

export type OrganizationAccessDecision = { allowed: true } | { allowed: false; reason: OrganizationAccessDenialReason };

export type OrganizationAccessStatus = "error" | "missing" | "pending" | "ready";

export interface OrganizationMembershipReference {
  id: string;
  role: string;
}

export interface OrganizationAccessFacts {
  activeOrganization: {
    error: unknown;
    id: string | null;
    status: OrganizationAccessStatus;
  };
  actor: {
    error: unknown;
    globalRole: string | null;
    status: OrganizationAccessStatus;
  };
  membership: {
    error: unknown;
    organizationRole: string | null;
    status: OrganizationAccessStatus;
  };
}

export interface OrganizationAccess {
  decisions: {
    manageOrganizationSettings: OrganizationAccessDecision;
    manageSiteConfiguration: OrganizationAccessDecision;
    manageSubscription: OrganizationAccessDecision;
    manageTeams: OrganizationAccessDecision;
    viewSubscriptionSettings: OrganizationAccessDecision;
  };
  facts: OrganizationAccessFacts;
}

export interface ResolveOrganizationAccessInput {
  activeOrganizationError?: unknown;
  activeOrganizationPending?: boolean;
  globalRole?: string | null;
  memberships?: readonly OrganizationMembershipReference[];
  membershipsError?: unknown;
  membershipsPending?: boolean;
  organizationId: string | null;
  sessionError?: unknown;
  sessionPending?: boolean;
}

const ALLOWED: OrganizationAccessDecision = { allowed: true };

function denied(reason: OrganizationAccessDenialReason): OrganizationAccessDecision {
  return { allowed: false, reason };
}

function decideForOrganizationManager(facts: OrganizationAccessFacts): OrganizationAccessDecision {
  if (facts.activeOrganization.status === "pending") {
    return denied("active-organization-pending");
  }
  if (facts.activeOrganization.status === "error") {
    return denied("active-organization-error");
  }
  if (facts.activeOrganization.status === "missing") {
    return denied("no-active-organization");
  }
  if (facts.membership.status === "pending") {
    return denied("membership-pending");
  }
  if (facts.membership.status === "error") {
    return denied("membership-error");
  }
  if (facts.membership.status === "missing") {
    return denied("membership-missing");
  }

  return facts.membership.organizationRole === "admin" || facts.membership.organizationRole === "owner"
    ? ALLOWED
    : denied("insufficient-organization-role");
}

function decideForSubscriptionManagement(facts: OrganizationAccessFacts): OrganizationAccessDecision {
  const settingsDecision = decideForOrganizationManager(facts);
  if (!settingsDecision.allowed) {
    return settingsDecision;
  }

  return facts.membership.organizationRole === "owner" ? ALLOWED : denied("insufficient-organization-role");
}

function decideForSiteConfiguration(facts: OrganizationAccessFacts): OrganizationAccessDecision {
  const isGlobalAdmin = facts.actor.status === "ready" && facts.actor.globalRole === "admin";
  if (isGlobalAdmin) {
    return ALLOWED;
  }

  if (facts.activeOrganization.status === "pending") {
    return denied("active-organization-pending");
  }
  if (facts.activeOrganization.status === "error") {
    return denied("active-organization-error");
  }
  if (facts.activeOrganization.status === "missing") {
    return denied("no-active-organization");
  }

  const hasOrganizationRole =
    facts.membership.status === "ready" &&
    (facts.membership.organizationRole === "admin" || facts.membership.organizationRole === "owner");
  if (hasOrganizationRole) {
    return ALLOWED;
  }
  if (facts.membership.status === "pending") {
    return denied("membership-pending");
  }
  if (facts.actor.status === "pending") {
    return denied("session-pending");
  }
  if (facts.membership.status === "error") {
    return denied("membership-error");
  }
  if (facts.actor.status === "error") {
    return denied("session-error");
  }
  if (facts.membership.status === "missing") {
    return denied("membership-missing");
  }

  return denied("insufficient-organization-role");
}

export function resolveOrganizationAccess({
  activeOrganizationError = null,
  activeOrganizationPending = false,
  globalRole = null,
  memberships,
  membershipsError = null,
  membershipsPending = false,
  organizationId,
  sessionError = null,
  sessionPending = false,
}: ResolveOrganizationAccessInput): OrganizationAccess {
  const membership = memberships?.find(candidate => candidate.id === organizationId);

  const activeOrganizationStatus: OrganizationAccessStatus = activeOrganizationPending
    ? "pending"
    : activeOrganizationError
      ? "error"
      : organizationId
        ? "ready"
        : "missing";
  const membershipStatus: OrganizationAccessStatus = membershipsPending
    ? "pending"
    : membershipsError
      ? "error"
      : membership
        ? "ready"
        : "missing";
  const actorStatus: OrganizationAccessStatus = sessionPending
    ? "pending"
    : sessionError
      ? "error"
      : globalRole
        ? "ready"
        : "missing";

  const facts: OrganizationAccessFacts = {
    activeOrganization: {
      error: activeOrganizationError,
      id: organizationId,
      status: activeOrganizationStatus,
    },
    actor: {
      error: sessionError,
      globalRole,
      status: actorStatus,
    },
    membership: {
      error: membershipsError,
      organizationRole: membership?.role ?? null,
      status: membershipStatus,
    },
  };
  const managerDecision = decideForOrganizationManager(facts);

  return {
    decisions: {
      // These operations intentionally share today's admin/owner policy while
      // retaining intent-specific names so they can diverge explicitly later.
      manageOrganizationSettings: managerDecision,
      manageSiteConfiguration: decideForSiteConfiguration(facts),
      manageSubscription: decideForSubscriptionManagement(facts),
      manageTeams: managerDecision,
      viewSubscriptionSettings: managerDecision,
    },
    facts,
  };
}
