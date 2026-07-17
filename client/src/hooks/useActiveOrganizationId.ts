import { authClient } from "../lib/auth";
import { useUserOrganizations } from "../api/admin/hooks/useOrganizations";

/**
 * Resolve the active organization id from the most reliable source available.
 *
 * Dashboard data queries (subscription, sites, teams) only need the org *id*,
 * but historically they read it from `authClient.useActiveOrganization()` —
 * which is backed by `/organization/get-full-organization`. That call returns
 * the org plus every member, invitation, and team, and for large orgs its
 * response intermittently fails at Cloudflare's HTTP/3 (QUIC) layer. On that
 * first failure better-auth leaves the active-org `data` as null, so the whole
 * dashboard went blank even though the org id was known.
 *
 * The id is available from lighter, reliable sources, so resolve it here and
 * stop gating data on the heavy call. Priority:
 *   1. `session.activeOrganizationId` — from the small `/get-session`, which is
 *      the authoritative record of which org is active and set by set-active.
 *   2. the full active org, when it has loaded.
 *   3. the user's first organization from `/user/organizations`.
 */
export function useActiveOrganizationId(): string | undefined {
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: organizations } = useUserOrganizations();

  const sessionActiveOrgId = (session?.session as { activeOrganizationId?: string | null } | undefined)
    ?.activeOrganizationId;

  return sessionActiveOrgId ?? activeOrg?.id ?? organizations?.[0]?.id ?? undefined;
}
