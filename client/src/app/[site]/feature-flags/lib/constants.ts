import type { FeatureFlagRuntime, FeatureFlagType } from "@/api/analytics/endpoints";
import type { RuleField, RuleOperator } from "./types";

export const flagTypeOptions: FeatureFlagType[] = ["boolean", "multivariate", "remote_config"];
export const runtimeOptions: FeatureFlagRuntime[] = ["client", "server", "both"];

export const ruleFieldOptions: Array<{ value: RuleField; requiresKey?: boolean }> = [
  { value: "hostname" },
  { value: "pathname" },
  { value: "query", requiresKey: true },
  { value: "referrer" },
  { value: "language" },
  { value: "country" },
  { value: "region" },
  { value: "city" },
  { value: "device_type" },
  { value: "user_id" },
  { value: "trait", requiresKey: true },
];

export const ruleOperatorOptions: RuleOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "starts_with",
  "ends_with",
  "regex",
];
