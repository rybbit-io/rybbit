import type {
  FeatureFlag,
  FeatureFlagPayload,
  FeatureFlagPayloadValue,
  FeatureFlagRule,
  FeatureFlagType,
} from "@/api/analytics/endpoints";
import type { ConditionSetFormState, FlagFormState, RuleFormState, VariantFormState } from "./types";

function createRuleId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptyRule(): RuleFormState {
  return {
    id: createRuleId(),
    field: "pathname",
    key: "",
    operator: "equals",
    value: "",
  };
}

export function createEmptyVariant(index: number): VariantFormState {
  return {
    id: createRuleId(),
    key: index === 0 ? "control" : `variant_${index}`,
    name: "",
    rolloutPercentage: index < 2 ? 50 : 0,
    payload: "",
  };
}

export function createEmptyConditionSet(flagType: FeatureFlagType, index: number): ConditionSetFormState {
  return {
    id: createRuleId(),
    name: index === 0 ? "Default" : `Condition ${index + 1}`,
    rules: [],
    rolloutPercentage: 100,
    variants: flagType === "multivariate" ? [createEmptyVariant(0), createEmptyVariant(1)] : [],
    payload: flagType === "remote_config" ? "{}" : "",
  };
}

export function createEmptyForm(): FlagFormState {
  return {
    key: "",
    description: "",
    enabled: true,
    runtime: "client",
    flagType: "boolean",
    conditionSets: [createEmptyConditionSet("boolean", 0)],
  };
}

export function formatFlagValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function formatPayloadValue(value: FeatureFlagPayloadValue | null | undefined) {
  if (value === undefined || value === null) return "";
  return JSON.stringify(value, null, 2);
}

export function getConditionSetPayload(
  flag: FeatureFlag,
  conditionSet: FeatureFlag["conditionSets"][number] | undefined
) {
  return conditionSet && conditionSet.payload !== undefined ? conditionSet.payload : flag.payload;
}

function parseOptionalPayload(value: string): FeatureFlagPayloadValue | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return JSON.parse(trimmed) as FeatureFlagPayloadValue;
}

function parseRequiredPayload(value: string): FeatureFlagPayloadValue {
  const parsed = parseOptionalPayload(value);
  if (parsed === undefined) {
    throw new Error("Payload is required");
  }
  return parsed;
}

function formatRuleValue(value: FeatureFlagRule["value"]) {
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

function parseRuleValue(value: string): FeatureFlagRule["value"] {
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (
      Array.isArray(parsed) &&
      parsed.every(item => typeof item === "string" || typeof item === "number" || typeof item === "boolean")
    ) {
      return parsed;
    }
    throw new Error("Rule arrays can only contain strings, numbers, or booleans");
  }
  return trimmed;
}

function toRuleFormState(rule: FeatureFlagRule): RuleFormState {
  return {
    id: createRuleId(),
    field: rule.field,
    key: rule.key || "",
    operator: rule.operator,
    value: formatRuleValue(rule.value),
  };
}

function toVariantFormState(variant: FeatureFlag["variants"][number]): VariantFormState {
  return {
    id: createRuleId(),
    key: variant.key,
    name: variant.name || "",
    rolloutPercentage: variant.rolloutPercentage,
    payload: formatPayloadValue(variant.payload),
  };
}

function toConditionSetFormState(
  conditionSet: FeatureFlag["conditionSets"][number],
  flagType: FeatureFlagType,
  index: number
): ConditionSetFormState {
  return {
    id: createRuleId(),
    name: conditionSet.name || (index === 0 ? "Default" : `Condition ${index + 1}`),
    rules: (conditionSet.rules || []).map(toRuleFormState),
    rolloutPercentage: conditionSet.rolloutPercentage ?? 100,
    variants:
      conditionSet.variants && conditionSet.variants.length > 0
        ? conditionSet.variants.map(toVariantFormState)
        : flagType === "multivariate"
          ? [createEmptyVariant(0), createEmptyVariant(1)]
          : [],
    payload: formatPayloadValue(conditionSet.payload),
  };
}

function fallbackConditionSetFromFlag(flag: FeatureFlag): ConditionSetFormState {
  return {
    id: createRuleId(),
    name: "Default",
    rules: (flag.rules || []).map(toRuleFormState),
    rolloutPercentage: flag.rolloutPercentage,
    variants: flag.flagType === "multivariate" ? (flag.variants || []).map(toVariantFormState) : [],
    payload: formatPayloadValue(flag.payload),
  };
}

export function toFormState(flag?: FeatureFlag): FlagFormState {
  if (!flag) return createEmptyForm();

  return {
    key: flag.key,
    description: flag.description || "",
    enabled: flag.enabled,
    runtime: flag.runtime,
    flagType: flag.flagType,
    conditionSets:
      flag.conditionSets && flag.conditionSets.length > 0
        ? flag.conditionSets.map((conditionSet, index) => toConditionSetFormState(conditionSet, flag.flagType, index))
        : [fallbackConditionSetFromFlag(flag)],
  };
}

export function buildPayload(form: FlagFormState): FeatureFlagPayload {
  const buildRules = (rules: RuleFormState[]) =>
    rules.map(rule => {
      const requiresKey = rule.field === "query" || rule.field === "trait";
      if (requiresKey && !rule.key.trim()) {
        throw new Error("Rule key is required");
      }
      if (!rule.value.trim()) {
        throw new Error("Rule value is required");
      }

      return {
        field: rule.field,
        key: requiresKey ? rule.key.trim() : undefined,
        operator: rule.operator,
        value: parseRuleValue(rule.value),
      };
    });

  const buildVariants = (variants: VariantFormState[]) =>
    variants.map(variant => ({
      key: variant.key.trim(),
      name: variant.name.trim() || undefined,
      rolloutPercentage: variant.rolloutPercentage,
      payload: parseOptionalPayload(variant.payload),
    }));

  const validateVariants = (variants: ReturnType<typeof buildVariants>) => {
    const variantKeys = new Set(variants.map(variant => variant.key));
    const variantRolloutTotal = variants.reduce((sum, variant) => sum + variant.rolloutPercentage, 0);

    if (variants.length < 2) {
      throw new Error("Multiple variant flags need at least two variants");
    }
    if (variants.some(variant => !variant.key)) {
      throw new Error("Variant key is required");
    }
    if (variantKeys.size !== variants.length) {
      throw new Error("Variant keys must be unique");
    }
    if (variantRolloutTotal > 100) {
      throw new Error("Variant rollout percentages cannot exceed 100");
    }
  };

  const conditionSets = form.conditionSets.map(conditionSet => {
    if (
      !Number.isInteger(conditionSet.rolloutPercentage) ||
      conditionSet.rolloutPercentage < 0 ||
      conditionSet.rolloutPercentage > 100
    ) {
      throw new Error("Rollout must be between 0 and 100");
    }

    const variants = form.flagType === "multivariate" ? buildVariants(conditionSet.variants) : [];
    if (form.flagType === "multivariate") {
      validateVariants(variants);
    }

    return {
      name: conditionSet.name.trim() || undefined,
      rules: buildRules(conditionSet.rules),
      rolloutPercentage: form.flagType === "boolean" ? conditionSet.rolloutPercentage : undefined,
      variants: form.flagType === "multivariate" ? variants : undefined,
      payload:
        form.flagType === "remote_config"
          ? parseRequiredPayload(conditionSet.payload)
          : parseOptionalPayload(conditionSet.payload),
    };
  });

  return {
    key: form.key.trim(),
    description: form.description.trim() || null,
    enabled: form.enabled,
    runtime: form.runtime,
    flagType: form.flagType,
    payload: null,
    variants: [],
    rolloutPercentage: 100,
    rules: [],
    conditionSets,
  };
}
