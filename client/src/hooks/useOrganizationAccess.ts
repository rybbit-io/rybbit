import { useUserOrganizations } from "@/api/admin/hooks/useOrganizations";
import { authClient } from "@/lib/auth";
import { resolveOrganizationAccess } from "@/lib/organizationAccess";

export function useOrganizationAccess(targetOrganizationId?: string | null) {
  const activeOrganization = authClient.useActiveOrganization();
  const memberships = useUserOrganizations();
  const session = authClient.useSession();
  const usesActiveOrganization = targetOrganizationId === undefined;
  const organizationId = usesActiveOrganization ? (activeOrganization.data?.id ?? null) : targetOrganizationId;

  const access = resolveOrganizationAccess({
    activeOrganizationError: usesActiveOrganization ? activeOrganization.error : null,
    activeOrganizationPending: usesActiveOrganization && activeOrganization.isPending,
    globalRole: session.data?.user.role ?? null,
    memberships: memberships.data,
    membershipsError: memberships.error,
    membershipsPending: memberships.isPending,
    organizationId,
    sessionError: session.error,
    sessionPending: session.isPending,
  });

  return {
    ...access,
    retry: async () => {
      const retries: Promise<unknown>[] = [memberships.refetch()];
      if (usesActiveOrganization) retries.push(activeOrganization.refetch());
      await Promise.all(retries);
    },
  };
}
