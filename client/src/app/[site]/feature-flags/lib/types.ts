import type { FeatureFlagRule, FeatureFlagRuntime, FeatureFlagType } from "@/api/analytics/endpoints";

export type FlagFormState = {
  key: string;
  description: string;
  enabled: boolean;
  runtime: FeatureFlagRuntime;
  flagType: FeatureFlagType;
  conditionSets: ConditionSetFormState[];
};

export type RuleField = FeatureFlagRule["field"];
export type RuleOperator = FeatureFlagRule["operator"];

export type RuleFormState = {
  id: string;
  field: RuleField;
  key: string;
  operator: RuleOperator;
  value: string;
};

export type VariantFormState = {
  id: string;
  key: string;
  name: string;
  rolloutPercentage: number;
  payload: string;
};

export type ConditionSetFormState = {
  id: string;
  name: string;
  rules: RuleFormState[];
  rolloutPercentage: number;
  variants: VariantFormState[];
  payload: string;
};
