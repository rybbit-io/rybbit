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
