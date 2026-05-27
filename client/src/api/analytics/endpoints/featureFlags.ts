import { authedFetch } from "../../utils";

export type FeatureFlagType = "boolean" | "multivariate" | "remote_config";
export type FeatureFlagPayloadValue =
  | string
  | number
  | boolean
  | null
  | FeatureFlagPayloadValue[]
  | { [key: string]: FeatureFlagPayloadValue };

export type FeatureFlagRule = {
  field:
    | "hostname"
    | "pathname"
    | "query"
    | "referrer"
    | "language"
    | "country"
    | "region"
    | "city"
    | "device_type"
    | "user_id"
    | "trait";
  key?: string;
  operator: "equals" | "not_equals" | "contains" | "starts_with" | "ends_with" | "regex";
  value: string | number | boolean | Array<string | number | boolean>;
};

export type FeatureFlagVariant = {
  key: string;
  name?: string;
  rolloutPercentage: number;
  payload?: FeatureFlagPayloadValue;
};

export type FeatureFlagStats = {
  flag_key: string;
  flag_value: string;
  sessions: number;
  events: number;
  exposures: number;
};

export type FeatureFlag = {
  flagId: number;
  siteId: number;
  key: string;
  name: string | null;
  description: string | null;
  enabled: boolean;
  clientEnabled: boolean;
  flagType: FeatureFlagType;
  payload?: FeatureFlagPayloadValue | null;
  variants: FeatureFlagVariant[];
  rolloutPercentage: number;
  rules: FeatureFlagRule[];
  version: number;
  createdAt: string;
  updatedAt: string;
  stats: FeatureFlagStats[];
};

export type FeatureFlagPayload = {
  key: string;
  name?: string | null;
  description?: string | null;
  enabled: boolean;
  clientEnabled: boolean;
  flagType: FeatureFlagType;
  payload?: FeatureFlagPayloadValue | null;
  variants: FeatureFlagVariant[];
  rolloutPercentage: number;
  rules: FeatureFlagRule[];
};

export type FeatureFlagUpdatePayload = Partial<FeatureFlagPayload>;

export async function fetchFeatureFlags(site: string | number): Promise<FeatureFlag[]> {
  const response = await authedFetch<{ data: FeatureFlag[] }>(`/sites/${site}/feature-flags`);
  return response.data;
}

export async function createFeatureFlag(
  site: string | number,
  payload: FeatureFlagPayload
): Promise<{ success: boolean; data: FeatureFlag }> {
  return authedFetch(`/sites/${site}/feature-flags`, undefined, {
    method: "POST",
    data: payload,
  });
}

export async function updateFeatureFlag(
  site: string | number,
  flagId: number,
  payload: FeatureFlagUpdatePayload
): Promise<{ success: boolean; data: FeatureFlag }> {
  return authedFetch(`/sites/${site}/feature-flags/${flagId}`, undefined, {
    method: "PUT",
    data: payload,
  });
}

export async function deleteFeatureFlag(site: string | number, flagId: number): Promise<{ success: boolean }> {
  return authedFetch(`/sites/${site}/feature-flags/${flagId}`, undefined, {
    method: "DELETE",
  });
}
