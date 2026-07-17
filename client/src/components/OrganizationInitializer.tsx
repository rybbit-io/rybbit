"use client";

import { useEffect, useRef } from "react";
import { authClient } from "../lib/auth";
import { useUserOrganizations } from "../api/admin/hooks/useOrganizations";
import { useTrack } from "../hooks/useTrack";

// Bounded retries for the full active-organization fetch. That call
// (/organization/get-full-organization) returns the org plus all members,
// invitations, and teams, and for large orgs its response intermittently fails
// at Cloudflare's HTTP/3 layer. Dashboard data no longer depends on it (see
// useActiveOrganizationId), but org-management pages still read the full org, so
// recover a first-load failure instead of leaving it permanently null.
const MAX_ACTIVE_ORG_RETRIES = 3;

function OrganizationInitializerInner() {
  const { data: organizations } = useUserOrganizations();
  const {
    data: activeOrganization,
    error: activeOrganizationError,
    isPending: isPendingActiveOrganization,
    isRefetching: isRefetchingActiveOrganization,
    refetch: refetchActiveOrganization,
  } = authClient.useActiveOrganization();

  useEffect(() => {
    if (!isPendingActiveOrganization && !activeOrganization && organizations?.length) {
      authClient.organization.setActive({
        organizationId: organizations?.[0]?.id,
      });
    }
  }, [isPendingActiveOrganization, activeOrganization, organizations]);

  // The fetch resolved with an error and no org — a transient transport failure.
  // Retry a few times with backoff so the full org recovers without a reload.
  const retryCountRef = useRef(0);
  useEffect(() => {
    if (isPendingActiveOrganization || isRefetchingActiveOrganization) return;
    if (activeOrganization || !activeOrganizationError) {
      retryCountRef.current = 0;
      return;
    }
    if (retryCountRef.current >= MAX_ACTIVE_ORG_RETRIES) return;
    const attempt = retryCountRef.current + 1;
    retryCountRef.current = attempt;
    const timeoutId = setTimeout(() => refetchActiveOrganization(), attempt * 1000);
    return () => clearTimeout(timeoutId);
  }, [
    activeOrganization,
    activeOrganizationError,
    isPendingActiveOrganization,
    isRefetchingActiveOrganization,
    refetchActiveOrganization,
  ]);

  return null; // This component doesn't render anything
}

export function OrganizationInitializer() {
  const session = authClient.useSession();
  useTrack();
  if (session.data?.user) {
    return <OrganizationInitializerInner />;
  }
  return null;
}
