import { authedFetch } from "../../utils";

// TypeScript interfaces for API keys
export interface ApiKey {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  userId: string;
  enabled: boolean;
  rateLimitEnabled: boolean;
  rateLimitTimeWindow: number | null;
  rateLimitMax: number | null;
  requestCount: number;
  remaining: number | null;
  lastRequest: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyWithKey extends ApiKey {
  key: string; // The full API key, only returned on creation
}

export interface CreateApiKeyRequest {
  name: string;
  expiresIn?: number;
}

// List all API keys for the current user
export function listApiKeys() {
  return authedFetch<ApiKey[]>("/user/api-keys");
}

// Create a new API key
export function createApiKey(data: CreateApiKeyRequest) {
  return authedFetch<ApiKeyWithKey>("/user/api-keys", undefined, {
    method: "POST",
    data,
  });
}

// Delete an API key
export function deleteApiKey(keyId: string) {
  return authedFetch<{ success: boolean }>(`/user/api-keys/${keyId}`, undefined, {
    method: "DELETE",
  });
}
