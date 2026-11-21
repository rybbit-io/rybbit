"use client";

import { useEffect } from "react";
import { authClient } from "../lib/auth";
import { useUserOrganizations } from "../api/admin/hooks/useOrganizations";
import { useTrack } from "../hooks/useTrack";

function OrganizationInitializerInner({ activeOrganizationId }: { activeOrganizationId?: string | null }) {
  const { data: organizations } = useUserOrganizations();

  // Read the active organization from the session, not useActiveOrganization:
  // a failed full-organization fetch also reports no active organization, which
  // switched multi-org users to an arbitrary one and made single-org users loop.
  useEffect(() => {
    if (!activeOrganizationId && organizations?.length) {
      authClient.organization.setActive({
        organizationId: organizations[0].id,
      });
    }
  }, [activeOrganizationId, organizations]);

  return null; // This component doesn't render anything
}

export function OrganizationInitializer() {
  const session = authClient.useSession();
  useTrack();
  if (session.data?.user) {
    return <OrganizationInitializerInner activeOrganizationId={session.data.session.activeOrganizationId} />;
  }
  return null;
}
