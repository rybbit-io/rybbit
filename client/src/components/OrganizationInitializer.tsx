"use client";

import { useEffect } from "react";
import { authClient } from "../lib/auth";
import { useUserOrganizations } from "../api/admin/organizations";

function OrganizationInitializerInner() {
  const { data: organizations } = useUserOrganizations();
  const { data: activeOrganization, isPending: isPendingActiveOrganization } = authClient.useActiveOrganization();

  useEffect(() => {
    if (!isPendingActiveOrganization && !activeOrganization && organizations?.length) {
      authClient.organization.setActive({
        organizationId: organizations?.[0]?.id,
      });
    }
  }, [isPendingActiveOrganization, activeOrganization, organizations]);

  return null; // This component doesn't render anything
}

export function OrganizationInitializer() {
  const session = authClient.useSession();
  if (session.data?.user) {
    return <OrganizationInitializerInner />;
  }
  return null;
}
