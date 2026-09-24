"use client";

import type { Annotation } from "@rybbit/shared";
import { useQuery } from "@tanstack/react-query";
import { getUserOrganizations, USER_ORGANIZATIONS_QUERY_KEY } from "@/api/admin/endpoints";
import { useGetSite } from "@/api/admin/hooks/useSites";
import { authClient } from "@/lib/auth";
import { useStore } from "@/lib/store";

/**
 * Who may do what with annotations on the current site. Mirrors the server
 * rules: members create and manage their own, admins and owners manage all,
 * and public or private-link viewers only read.
 */
export function useAnnotationPermissions() {
  const { site, privateKey } = useStore();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const signedIn = !!userId && !privateKey;

  const { data: siteData } = useGetSite(site, { enabled: signedIn });
  // A signed-in visitor on someone else's public dashboard has a session but
  // no membership; the organization list tells the two apart.
  const { data: organizations } = useQuery({
    queryKey: [USER_ORGANIZATIONS_QUERY_KEY],
    queryFn: getUserOrganizations,
    enabled: signedIn,
  });

  const isAdmin = signedIn && !!siteData?.isOwner;
  const isMember =
    isAdmin ||
    (!!siteData?.organizationId && !!organizations?.some(org => org.id === siteData.organizationId));

  return {
    canCreate: signedIn && isMember,
    isAdmin,
    canManage: (annotation: Annotation) =>
      isAdmin || (annotation.siteId !== null && signedIn && annotation.userId === userId),
  };
}
