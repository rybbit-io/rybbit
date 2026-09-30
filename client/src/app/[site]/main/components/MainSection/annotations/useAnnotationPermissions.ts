"use client";

import type { Annotation } from "@rybbit/shared";
import { useGetSite } from "@/api/admin/hooks/useSites";
import { useOrgPermissions, useSitePermissions } from "@/hooks/usePermissions";
import { authClient } from "@/lib/auth";
import { useStore } from "@/lib/store";

/**
 * Who may do what with annotations on the current site, from the server's
 * permission lists: annotations:write creates and manages your own site
 * annotations, annotations:manage in the organization manages all of them
 * (including organization-wide ones). Public and private-link viewers only read.
 */
export function useAnnotationPermissions() {
  const { site, privateKey } = useStore();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  // The private-link view is read-only by design, even for members.
  const signedIn = !!userId && !privateKey;

  const { data: siteData } = useGetSite(site);
  const sitePermissions = useSitePermissions(site);
  const orgPermissions = useOrgPermissions(siteData?.organizationId ?? undefined);

  const canWrite = signedIn && sitePermissions.can("annotations:write");
  const canManageAll = signedIn && !!siteData?.organizationId && orgPermissions.can("annotations:manage");

  return {
    canCreate: canWrite,
    /** May create and edit organization-wide annotations. */
    canManageAll,
    canManage: (annotation: Annotation) =>
      canManageAll || (canWrite && annotation.siteId !== null && annotation.userId === userId),
  };
}
