import { authClient } from "../lib/auth";

/**
 * True when the current user's role in the active organization is "member"
 * (i.e. not an admin or owner), used to gate access to organization settings.
 */
export function useIsMemberRole(): boolean {
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const currentMember = activeOrg?.members?.find((m) => m.userId === session?.user?.id);
  return currentMember?.role === "member";
}
