import { useUserOrganizations } from "../api/admin/hooks/useOrganizations";
import { authClient } from "../lib/auth";

/**
 * The active organization's name, from the session and the user's organization list rather than
 * the full-organization fetch, which is slow and can fail for large organizations.
 */
export function useActiveOrgName(): string | undefined {
  const { data: session } = authClient.useSession();
  const { data: organizations } = useUserOrganizations({ enabled: !!session?.user });
  return organizations?.find(org => org.id === session?.session.activeOrganizationId)?.name;
}
