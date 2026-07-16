import { authedFetch } from "../../utils";

export interface TraitKey {
  key: string;
  userCount: number;
}

export interface TraitKeysResponse {
  keys: TraitKey[];
}

export interface TraitValue {
  value: string;
  userCount: number;
}

export interface TraitValuesResponse {
  values: TraitValue[];
  total: number;
  hasMore: boolean;
}

export interface TraitValuesParams {
  key: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch all trait keys for a site
 * GET /api/sites/:siteId/user-traits/keys
 */
export async function fetchUserTraitKeys(site: string | number): Promise<TraitKeysResponse> {
  return authedFetch<TraitKeysResponse>(`/sites/${site}/user-traits/keys`);
}

/**
 * Fetch trait values for a given key
 * GET /api/sites/:siteId/user-traits/values
 */
export async function fetchUserTraitValues(
  site: string | number,
  params: TraitValuesParams
): Promise<TraitValuesResponse> {
  return authedFetch<TraitValuesResponse>(`/sites/${site}/user-traits/values`, {
    key: params.key,
    limit: params.limit,
    offset: params.offset,
  });
}

export interface TraitValueUser {
  user_id: string;
  identified_user_id: string;
  traits: Record<string, unknown> | null;
  country: string;
  region: string;
  city: string;
  browser: string;
  operating_system: string;
  device_type: string;
  sessions: number;
}

export interface TraitValueUsersResponse {
  users: TraitValueUser[];
  total: number;
  hasMore: boolean;
}

export interface TraitValueUsersParams {
  key: string;
  value: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch users that have a specific trait key+value
 * GET /api/sites/:siteId/user-traits/users
 */
export async function fetchUserTraitValueUsers(
  site: string | number,
  params: TraitValueUsersParams
): Promise<TraitValueUsersResponse> {
  return authedFetch<TraitValueUsersResponse>(`/sites/${site}/user-traits/users`, {
    key: params.key,
    value: params.value,
    limit: params.limit,
    offset: params.offset,
  });
}
