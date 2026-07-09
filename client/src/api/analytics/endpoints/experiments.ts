import { authedFetch } from "../../utils";
import type {
  FeatureFlagConditionSet,
  FeatureFlagPayloadValue,
  FeatureFlagRuntime,
  FeatureFlagType,
  FeatureFlagVariant,
} from "./featureFlags";
import type { GoalConfig, GoalType } from "./goals";
import { CommonApiParams, toQueryParams } from "./types";

export type ExperimentStatus = "draft" | "running" | "paused" | "completed";

export type ExperimentFeatureFlag = {
  flagId: number;
  siteId: number;
  key: string;
  description: string | null;
  enabled: boolean;
  runtime: FeatureFlagRuntime;
  flagType: FeatureFlagType;
  payload?: FeatureFlagPayloadValue | null;
  variants: FeatureFlagVariant[];
  rolloutPercentage: number;
  conditionSets: FeatureFlagConditionSet[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ExperimentGoal = {
  goalId: number;
  siteId: number;
  name: string | null;
  goalType: GoalType;
  config: GoalConfig;
  createdAt: string;
};

export type Experiment = {
  experimentId: number;
  siteId: number;
  featureFlagId: number;
  primaryGoalId: number | null;
  name: string;
  description: string | null;
  hypothesis: string | null;
  status: ExperimentStatus;
  winningVariant: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  featureFlag: ExperimentFeatureFlag;
  primaryGoal: ExperimentGoal | null;
};

export type ExperimentPayload = {
  name: string;
  description?: string | null;
  hypothesis?: string | null;
  featureFlagId: number;
  primaryGoalId?: number | null;
  status: ExperimentStatus;
  winningVariant?: string | null;
};

export type ExperimentUpdatePayload = Partial<ExperimentPayload>;

export type ExperimentVariantResult = {
  variant: string;
  sessions: number;
  exposures: number;
  conversions: number;
  conversionRate: number;
  lift: number | null;
  isControl: boolean;
};

export type ExperimentResults = {
  experiment: Experiment;
  variants: ExperimentVariantResult[];
  totalExposureSessions: number;
  totalConversions: number;
  hasGoal: boolean;
  measurement: "exposure" | "assignment";
};

export async function fetchExperiments(site: string | number): Promise<Experiment[]> {
  const response = await authedFetch<{ data: Experiment[] }>(`/sites/${site}/experiments`);
  return response.data;
}

export async function createExperiment(
  site: string | number,
  payload: ExperimentPayload
): Promise<{ success: boolean; data: Experiment }> {
  return authedFetch(`/sites/${site}/experiments`, undefined, {
    method: "POST",
    data: payload,
  });
}

export async function updateExperiment(
  site: string | number,
  experimentId: number,
  payload: ExperimentUpdatePayload
): Promise<{ success: boolean; data: Experiment }> {
  return authedFetch(`/sites/${site}/experiments/${experimentId}`, undefined, {
    method: "PUT",
    data: payload,
  });
}

export async function deleteExperiment(site: string | number, experimentId: number): Promise<{ success: boolean }> {
  return authedFetch(`/sites/${site}/experiments/${experimentId}`, undefined, {
    method: "DELETE",
  });
}

export async function fetchExperimentResults(
  site: string | number,
  experimentId: number,
  params: CommonApiParams
): Promise<ExperimentResults> {
  const response = await authedFetch<{ data: ExperimentResults }>(
    `/sites/${site}/experiments/${experimentId}/results`,
    toQueryParams(params)
  );
  return response.data;
}
