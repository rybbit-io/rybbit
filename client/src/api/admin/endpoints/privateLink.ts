import { authedFetch } from "../../utils";

export interface PrivateLinkConfigResponse {
  privateLinkKey: string | null;
}

export interface UpdatePrivateLinkConfigResponse {
  privateLinkKey: string | null;
}

// Get private link config
export function getPrivateLinkConfig(siteId: number) {
  return authedFetch<{
    success: boolean;
    data: PrivateLinkConfigResponse;
  }>(`/sites/${siteId}/private-link-config`);
}

// Generate private link key
export function generatePrivateLinkKey(siteId: number) {
  return authedFetch<{
    success: boolean;
    data: UpdatePrivateLinkConfigResponse;
  }>(
    `/sites/${siteId}/private-link-config`,
    {},
    {
      method: "POST",
      data: { action: "generate_private_link_key" },
    }
  );
}

// Revoke private link key
export function revokePrivateLinkKey(siteId: number) {
  return authedFetch<{
    success: boolean;
    data: UpdatePrivateLinkConfigResponse;
  }>(
    `/sites/${siteId}/private-link-config`,
    {},
    {
      method: "POST",
      data: { action: "revoke_private_link_key" },
    }
  );
}
