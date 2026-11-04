import { authedFetch } from "../../utils";

export interface AdminApiKeyData {
  id: string;
  name: string | null;
  start: string | null;
  ownerType: "user" | "organization";
  ownerId: string;
  /** Null when the owning user or organization no longer exists. */
  ownerName: string | null;
  ownerEmail: string | null;
  createdBy: { id: string; name: string | null; email: string | null } | null;
  enabled: boolean;
  permissions: Record<string, string[]> | null;
  expiresAt: string | null;
  lastRequest: string | null;
  createdAt: string;
}

export function getAdminApiKeys() {
  return authedFetch<AdminApiKeyData[]>("/admin/api-keys");
}

export function updateAdminApiKey(keyId: string, data: { enabled: boolean }) {
  return authedFetch<{ id: string; enabled: boolean }>(`/admin/api-keys/${encodeURIComponent(keyId)}`, undefined, {
    method: "PATCH",
    data,
  });
}

export function deleteAdminApiKey(keyId: string) {
  return authedFetch<{ success: boolean }>(`/admin/api-keys/${encodeURIComponent(keyId)}`, undefined, {
    method: "DELETE",
  });
}
