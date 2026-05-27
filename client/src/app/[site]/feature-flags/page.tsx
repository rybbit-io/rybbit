"use client";

import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import {
  FeatureFlag,
  FeatureFlagPayload,
  FeatureFlagPayloadValue,
  FeatureFlagRule,
  FeatureFlagRuntime,
  FeatureFlagType,
} from "@/api/analytics/endpoints";
import {
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  useFeatureFlags,
  useUpdateFeatureFlag,
} from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import { NothingFound } from "@/components/NothingFound";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Edit2, Flag, Plus, Trash2, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type FlagFormState = {
  key: string;
  description: string;
  enabled: boolean;
  runtime: FeatureFlagRuntime;
  flagType: FeatureFlagType;
  payload: string;
  variants: VariantFormState[];
  rolloutPercentage: number;
  rules: RuleFormState[];
  conditionSets: ConditionSetFormState[];
};

type RuleField = FeatureFlagRule["field"];
type RuleOperator = FeatureFlagRule["operator"];

type RuleFormState = {
  id: string;
  field: RuleField;
  key: string;
  operator: RuleOperator;
  value: string;
};

type VariantFormState = {
  id: string;
  key: string;
  name: string;
  rolloutPercentage: number;
  payload: string;
};

type ConditionSetFormState = {
  id: string;
  name: string;
  rules: RuleFormState[];
  rolloutPercentage: number;
  variants: VariantFormState[];
  payload: string;
};

const flagTypeOptions: FeatureFlagType[] = ["boolean", "multivariate", "remote_config"];
const runtimeOptions: FeatureFlagRuntime[] = ["client", "server", "both"];

const ruleFieldOptions: Array<{ value: RuleField; requiresKey?: boolean }> = [
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

const ruleOperatorOptions: RuleOperator[] = ["equals", "not_equals", "contains", "starts_with", "ends_with", "regex"];

function useFlagTypeLabel() {
  const t = useExtracted();

  return useCallback(
    (flagType: FeatureFlagType) => {
      switch (flagType) {
        case "boolean":
          return t("Boolean");
        case "multivariate":
          return t("Multiple variants");
        case "remote_config":
          return t("Remote config");
      }
    },
    [t]
  );
}

function useRuntimeLabel() {
  const t = useExtracted();

  return useCallback(
    (runtime: FeatureFlagRuntime) => {
      switch (runtime) {
        case "client":
          return t("Client");
        case "server":
          return t("Server");
        case "both":
          return t("Both");
      }
    },
    [t]
  );
}

function useRuleFieldLabel() {
  const t = useExtracted();

  return useCallback(
    (field: RuleField) => {
      switch (field) {
        case "hostname":
          return t("Hostname");
        case "pathname":
          return t("Pathname");
        case "query":
          return t("Query parameter");
        case "referrer":
          return t("Referrer");
        case "language":
          return t("Language");
        case "country":
          return t("Country");
        case "region":
          return t("Region");
        case "city":
          return t("City");
        case "device_type":
          return t("Device type");
        case "user_id":
          return t("User ID");
        case "trait":
          return t("User trait");
      }
    },
    [t]
  );
}

function useRuleOperatorLabel() {
  const t = useExtracted();

  return useCallback(
    (operator: RuleOperator) => {
      switch (operator) {
        case "equals":
          return t("Equals");
        case "not_equals":
          return t("Does not equal");
        case "contains":
          return t("Contains");
        case "starts_with":
          return t("Starts with");
        case "ends_with":
          return t("Ends with");
        case "regex":
          return t("Regex");
      }
    },
    [t]
  );
}

function createRuleId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createEmptyRule(): RuleFormState {
  return {
    id: createRuleId(),
    field: "pathname",
    key: "",
    operator: "equals",
    value: "",
  };
}

function createEmptyVariant(index: number): VariantFormState {
  return {
    id: createRuleId(),
    key: index === 0 ? "control" : `variant_${index}`,
    name: "",
    rolloutPercentage: index < 2 ? 50 : 0,
    payload: "",
  };
}

function createEmptyConditionSet(flagType: FeatureFlagType, index: number): ConditionSetFormState {
  return {
    id: createRuleId(),
    name: index === 0 ? "Default" : `Condition ${index + 1}`,
    rules: [],
    rolloutPercentage: 100,
    variants: flagType === "multivariate" ? [createEmptyVariant(0), createEmptyVariant(1)] : [],
    payload: flagType === "remote_config" ? "{}" : "",
  };
}

function createEmptyForm(): FlagFormState {
  return {
    key: "",
    description: "",
    enabled: false,
    runtime: "client",
    flagType: "boolean",
    payload: "",
    variants: [],
    rolloutPercentage: 100,
    rules: [],
    conditionSets: [createEmptyConditionSet("boolean", 0)],
  };
}

function formatFlagValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function formatPayloadValue(value: FeatureFlagPayloadValue | null | undefined) {
  if (value === undefined || value === null) return "";
  return JSON.stringify(value, null, 2);
}

function getConditionSetPayload(flag: FeatureFlag, conditionSet: FeatureFlag["conditionSets"][number] | undefined) {
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

function toFormState(flag?: FeatureFlag): FlagFormState {
  if (!flag) return createEmptyForm();

  return {
    key: flag.key,
    description: flag.description || "",
    enabled: flag.enabled,
    runtime: flag.runtime,
    flagType: flag.flagType,
    payload: formatPayloadValue(flag.payload),
    variants: (flag.variants || []).map(toVariantFormState),
    rolloutPercentage: flag.rolloutPercentage,
    rules: (flag.rules || []).map(toRuleFormState),
    conditionSets:
      flag.conditionSets && flag.conditionSets.length > 0
        ? flag.conditionSets.map((conditionSet, index) => toConditionSetFormState(conditionSet, flag.flagType, index))
        : [fallbackConditionSetFromFlag(flag)],
  };
}

function buildPayload(form: FlagFormState): FeatureFlagPayload {
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

function TargetingRulesEditor({
  rules,
  onChange,
}: {
  rules: RuleFormState[];
  onChange: (rules: RuleFormState[]) => void;
}) {
  const t = useExtracted();
  const getRuleFieldLabel = useRuleFieldLabel();
  const getRuleOperatorLabel = useRuleOperatorLabel();

  const updateRule = (id: string, patch: Partial<RuleFormState>) => {
    onChange(
      rules.map(rule => {
        if (rule.id !== id) return rule;
        const next = { ...rule, ...patch };
        if (patch.field && patch.field !== "query" && patch.field !== "trait") {
          next.key = "";
        }
        return next;
      })
    );
  };

  const removeRule = (id: string) => {
    onChange(rules.filter(rule => rule.id !== id));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{t("Targeting rules")}</Label>
        <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...rules, createEmptyRule()])}>
          <Plus className="h-4 w-4" />
          {t("Add rule")}
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-200 px-3 py-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {t("No targeting rules")}
        </div>
      ) : (
        <div className="grid gap-2">
          {rules.map(rule => {
            const selectedField = ruleFieldOptions.find(option => option.value === rule.field);
            const requiresKey = selectedField?.requiresKey;

            return (
              <div
                key={rule.id}
                className="grid grid-cols-1 gap-2 rounded-md border border-neutral-150 p-3 dark:border-neutral-800 lg:grid-cols-[minmax(140px,1fr)_minmax(120px,0.8fr)_minmax(140px,1fr)_minmax(160px,1fr)_2rem]"
              >
                <Select value={rule.field} onValueChange={value => updateRule(rule.id, { field: value as RuleField })}>
                  <SelectTrigger aria-label={t("Field")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleFieldOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {getRuleFieldLabel(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  aria-label={t("Key")}
                  value={rule.key}
                  disabled={!requiresKey}
                  placeholder={requiresKey ? t("Key") : "-"}
                  onChange={event => updateRule(rule.id, { key: event.target.value })}
                />

                <Select
                  value={rule.operator}
                  onValueChange={value => updateRule(rule.id, { operator: value as RuleOperator })}
                >
                  <SelectTrigger aria-label={t("Operator")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleOperatorOptions.map(operator => (
                      <SelectItem key={operator} value={operator}>
                        {getRuleOperatorLabel(operator)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  aria-label={t("Value")}
                  value={rule.value}
                  placeholder={t("Value")}
                  onChange={event => updateRule(rule.id, { value: event.target.value })}
                />

                <Button
                  type="button"
                  size="smIcon"
                  variant="ghost"
                  aria-label={t("Remove")}
                  onClick={() => removeRule(rule.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VariantsEditor({
  variants,
  onChange,
}: {
  variants: VariantFormState[];
  onChange: (variants: VariantFormState[]) => void;
}) {
  const t = useExtracted();
  const totalRollout = variants.reduce((sum, variant) => sum + variant.rolloutPercentage, 0);

  const updateVariant = (id: string, patch: Partial<VariantFormState>) => {
    onChange(variants.map(variant => (variant.id === id ? { ...variant, ...patch } : variant)));
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter(variant => variant.id !== id));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="grid gap-1">
          <Label>{t("Variants")}</Label>
          <span
            className={cn("text-xs", totalRollout > 100 ? "text-red-500" : "text-neutral-500 dark:text-neutral-400")}
          >
            {t("Total rollout")}: {totalRollout}%
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onChange([...variants, createEmptyVariant(variants.length)])}
        >
          <Plus className="h-4 w-4" />
          {t("Add variant")}
        </Button>
      </div>

      <div className="grid gap-2">
        {variants.map(variant => (
          <div key={variant.id} className="grid gap-3 rounded-md border border-neutral-150 p-3 dark:border-neutral-800">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_2rem]">
              <Input
                aria-label={t("Variant key")}
                value={variant.key}
                placeholder={t("Variant key")}
                onChange={event => updateVariant(variant.id, { key: event.target.value })}
              />
              <Input
                aria-label={t("Variant name")}
                value={variant.name}
                placeholder={t("Variant name")}
                onChange={event => updateVariant(variant.id, { name: event.target.value })}
              />
              <Button
                type="button"
                size="smIcon"
                variant="ghost"
                aria-label={t("Remove")}
                onClick={() => removeVariant(variant.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>{t("Rollout")}</Label>
                <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">
                  {variant.rolloutPercentage}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[variant.rolloutPercentage]}
                onValueChange={value => updateVariant(variant.id, { rolloutPercentage: value[0] ?? 0 })}
              />
            </div>

            <div className="grid gap-2">
              <Label>{t("Payload")}</Label>
              <Textarea
                className="min-h-20 font-mono text-xs"
                value={variant.payload}
                placeholder='{"copy":"Try it now"}'
                onChange={event => updateVariant(variant.id, { payload: event.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConditionSetsEditor({
  flagType,
  conditionSets,
  onChange,
}: {
  flagType: FeatureFlagType;
  conditionSets: ConditionSetFormState[];
  onChange: (conditionSets: ConditionSetFormState[]) => void;
}) {
  const t = useExtracted();
  const conditionSetLabel = flagType === "remote_config" ? t("Targeted configs") : t("Release conditions");

  const updateConditionSet = (id: string, patch: Partial<ConditionSetFormState>) => {
    onChange(
      conditionSets.map(conditionSet => (conditionSet.id === id ? { ...conditionSet, ...patch } : conditionSet))
    );
  };

  const removeConditionSet = (id: string) => {
    if (conditionSets.length <= 1) return;
    onChange(conditionSets.filter(conditionSet => conditionSet.id !== id));
  };

  const moveConditionSet = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= conditionSets.length) return;

    const next = [...conditionSets];
    const [conditionSet] = next.splice(index, 1);
    next.splice(nextIndex, 0, conditionSet);
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label>{conditionSetLabel}</Label>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onChange([...conditionSets, createEmptyConditionSet(flagType, conditionSets.length)])}
        >
          <Plus className="h-4 w-4" />
          {t("Add condition")}
        </Button>
      </div>

      <div className="grid gap-3">
        {conditionSets.map((conditionSet, index) => (
          <div
            key={conditionSet.id}
            className="grid gap-4 rounded-md border border-neutral-150 p-3 dark:border-neutral-800"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="w-8 justify-center">
                {index + 1}
              </Badge>
              <Input
                value={conditionSet.name}
                aria-label={t("Condition name")}
                placeholder={index === 0 ? t("Default") : t("Condition name")}
                onChange={event => updateConditionSet(conditionSet.id, { name: event.target.value })}
              />
              <Button
                type="button"
                size="smIcon"
                variant="ghost"
                aria-label={t("Move up")}
                disabled={index === 0}
                onClick={() => moveConditionSet(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="smIcon"
                variant="ghost"
                aria-label={t("Move down")}
                disabled={index === conditionSets.length - 1}
                onClick={() => moveConditionSet(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="smIcon"
                variant="ghost"
                aria-label={t("Remove")}
                disabled={conditionSets.length <= 1}
                onClick={() => removeConditionSet(conditionSet.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <TargetingRulesEditor
              rules={conditionSet.rules}
              onChange={rules => updateConditionSet(conditionSet.id, { rules })}
            />

            {flagType === "multivariate" ? (
              <VariantsEditor
                variants={conditionSet.variants}
                onChange={variants => updateConditionSet(conditionSet.id, { variants })}
              />
            ) : (
              <div className="grid gap-3">
                {flagType === "boolean" && (
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label>{t("Rollout")}</Label>
                      <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">
                        {conditionSet.rolloutPercentage}%
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[conditionSet.rolloutPercentage]}
                      onValueChange={value => updateConditionSet(conditionSet.id, { rolloutPercentage: value[0] ?? 0 })}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>{flagType === "remote_config" ? t("Config payload") : t("Payload")}</Label>
                  <Textarea
                    className="min-h-24 font-mono text-xs"
                    value={conditionSet.payload}
                    placeholder={flagType === "remote_config" ? '{"theme":"dark"}' : '{"copy":"Try it now"}'}
                    onChange={event => updateConditionSet(conditionSet.id, { payload: event.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureFlagDialog({ flag, trigger }: { flag?: FeatureFlag; trigger: ReactNode }) {
  const t = useExtracted();
  const getFlagTypeLabel = useFlagTypeLabel();
  const getRuntimeLabel = useRuntimeLabel();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FlagFormState>(() => toFormState(flag));
  const createMutation = useCreateFeatureFlag();
  const updateMutation = useUpdateFeatureFlag();
  const isEditing = !!flag;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) setForm(toFormState(flag));
  }, [flag, open]);

  const updateField = <K extends keyof FlagFormState>(key: K, value: FlagFormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleFlagTypeChange = (flagType: FeatureFlagType) => {
    setForm(current => ({
      ...current,
      flagType,
      conditionSets: current.conditionSets.map((conditionSet, index) => ({
        ...conditionSet,
        payload: flagType === "remote_config" && !conditionSet.payload ? "{}" : conditionSet.payload,
        variants:
          flagType === "multivariate" && conditionSet.variants.length === 0
            ? [createEmptyVariant(0), createEmptyVariant(1)]
            : flagType === "multivariate"
              ? conditionSet.variants
              : [],
        rolloutPercentage: flagType === "boolean" ? conditionSet.rolloutPercentage : 100,
        name: conditionSet.name || (index === 0 ? "Default" : `Condition ${index + 1}`),
      })),
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = buildPayload(form);

      if (isEditing) {
        await updateMutation.mutateAsync({ flagId: flag.flagId, payload });
        toast.success(t("Feature flag updated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("Feature flag created"));
      }

      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to save feature flag"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("Edit feature flag") : t("Create feature flag")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="flag-key">{t("Key")}</Label>
            <Input
              id="flag-key"
              value={form.key}
              disabled={isEditing}
              onChange={event => updateField("key", event.target.value)}
              placeholder="new_checkout"
            />
          </div>

          <div className="grid gap-2">
            <Label>{t("Flag type")}</Label>
            <ButtonGroup className="w-full">
              {flagTypeOptions.map(option => (
                <Button
                  key={option}
                  type="button"
                  className="flex-1"
                  variant={form.flagType === option ? "accent" : "secondary"}
                  onClick={() => handleFlagTypeChange(option)}
                >
                  {getFlagTypeLabel(option)}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="flag-description">{t("Description")}</Label>
            <Textarea
              id="flag-description"
              value={form.description}
              onChange={event => updateField("description", event.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-md border border-neutral-150 p-3 dark:border-neutral-800">
              <span className="text-sm font-medium">{t("Enabled")}</span>
              <Switch checked={form.enabled} onCheckedChange={checked => updateField("enabled", checked)} />
            </label>
            <div className="grid gap-2 rounded-md border border-neutral-150 p-3 dark:border-neutral-800">
              <Label>{t("Runtime")}</Label>
              <ButtonGroup className="w-full">
                {runtimeOptions.map(option => (
                  <Button
                    key={option}
                    type="button"
                    className="flex-1"
                    variant={form.runtime === option ? "accent" : "secondary"}
                    onClick={() => updateField("runtime", option)}
                  >
                    {getRuntimeLabel(option)}
                  </Button>
                ))}
              </ButtonGroup>
            </div>
          </div>

          <ConditionSetsEditor
            flagType={form.flagType}
            conditionSets={form.conditionSets}
            onChange={conditionSets => updateField("conditionSets", conditionSets)}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} variant="success">
            {isSaving ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlagStats({ flag }: { flag: FeatureFlag }) {
  const topStats = flag.stats.slice(0, 2);
  if (topStats.length === 0) return <span className="text-neutral-400">-</span>;

  return (
    <div className="flex flex-col gap-1">
      {topStats.map(stat => (
        <div key={`${stat.flag_value}-${stat.sessions}`} className="flex items-center gap-2 text-xs">
          <span className="max-w-24 truncate font-mono text-neutral-700 dark:text-neutral-200">
            {stat.flag_value || "(empty)"}
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">{stat.sessions.toLocaleString()} sessions</span>
        </div>
      ))}
    </div>
  );
}

function FlagValueSummary({ flag }: { flag: FeatureFlag }) {
  const t = useExtracted();
  const getFlagTypeLabel = useFlagTypeLabel();
  const firstConditionSet = flag.conditionSets[0];
  const variants = firstConditionSet?.variants || flag.variants;

  if (flag.flagType === "multivariate") {
    return (
      <div className="flex max-w-56 flex-col gap-1">
        <Badge variant="outline" className="w-fit">
          {getFlagTypeLabel(flag.flagType)}
        </Badge>
        <div className="flex flex-wrap gap-1">
          {variants.slice(0, 3).map(variant => (
            <span
              key={variant.key}
              className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800"
            >
              {variant.key} {variant.rolloutPercentage}%
            </span>
          ))}
          {variants.length > 3 && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">+{variants.length - 3}</span>
          )}
        </div>
      </div>
    );
  }

  if (flag.flagType === "remote_config") {
    return (
      <div className="flex max-w-48 flex-col gap-1">
        <Badge variant="outline" className="w-fit">
          {getFlagTypeLabel(flag.flagType)}
        </Badge>
        <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {formatFlagValue(getConditionSetPayload(flag, firstConditionSet)) || t("Payload")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex max-w-48 flex-col gap-1">
      <Badge variant="outline" className="w-fit">
        {getFlagTypeLabel(flag.flagType)}
      </Badge>
      {(firstConditionSet?.payload !== undefined || (flag.payload !== undefined && flag.payload !== null)) && (
        <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {formatFlagValue(getConditionSetPayload(flag, firstConditionSet))}
        </span>
      )}
    </div>
  );
}

function FlagRolloutSummary({ flag }: { flag: FeatureFlag }) {
  if (flag.flagType === "remote_config") {
    return <span className="text-neutral-400">-</span>;
  }

  const firstConditionSet = flag.conditionSets[0];
  const rolloutPercentage =
    flag.flagType === "multivariate"
      ? Math.min(
          100,
          (firstConditionSet?.variants || flag.variants).reduce((sum, variant) => sum + variant.rolloutPercentage, 0)
        )
      : (firstConditionSet?.rolloutPercentage ?? flag.rolloutPercentage);

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={cn("h-2 rounded-full bg-accent-500", rolloutPercentage === 0 && "bg-transparent")}
          style={{ width: `${rolloutPercentage}%` }}
        />
      </div>
      <span className="text-sm tabular-nums">{rolloutPercentage}%</span>
    </div>
  );
}

function FeatureFlagTable({ flags }: { flags: FeatureFlag[] }) {
  const t = useExtracted();
  const getRuntimeLabel = useRuntimeLabel();
  const updateMutation = useUpdateFeatureFlag();
  const deleteMutation = useDeleteFeatureFlag();

  const handleDelete = async (flag: FeatureFlag) => {
    if (!window.confirm(t("Delete this feature flag?"))) return;

    try {
      await deleteMutation.mutateAsync(flag.flagId);
      toast.success(t("Feature flag deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to delete feature flag"));
    }
  };

  return (
    <div className="rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Flag")}</TableHead>
            <TableHead>{t("Status")}</TableHead>
            <TableHead>{t("Value")}</TableHead>
            <TableHead>{t("Rollout")}</TableHead>
            <TableHead>{t("Rules")}</TableHead>
            <TableHead>{t("Traffic")}</TableHead>
            <TableHead className="w-24 text-right">{t("Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.map(flag => (
            <TableRow key={flag.flagId}>
              <TableCell>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{flag.key}</span>
                    <Badge variant="secondary">v{flag.version}</Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={flag.enabled}
                    disabled={updateMutation.isPending}
                    onCheckedChange={enabled => updateMutation.mutate({ flagId: flag.flagId, payload: { enabled } })}
                  />
                  <Badge variant={flag.enabled ? "success" : "secondary"}>{flag.enabled ? t("On") : t("Off")}</Badge>
                  <Badge variant="outline">{getRuntimeLabel(flag.runtime)}</Badge>
                </div>
              </TableCell>
              <TableCell>
                <FlagValueSummary flag={flag} />
              </TableCell>
              <TableCell>
                <FlagRolloutSummary flag={flag} />
              </TableCell>
              <TableCell>
                {flag.conditionSets.length.toLocaleString()} /{" "}
                {flag.conditionSets.reduce((sum, conditionSet) => sum + conditionSet.rules.length, 0).toLocaleString()}
              </TableCell>
              <TableCell>
                <FlagStats flag={flag} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <FeatureFlagDialog
                    flag={flag}
                    trigger={
                      <Button size="smIcon" variant="ghost" aria-label={t("Edit")}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    size="smIcon"
                    variant="ghost"
                    aria-label={t("Delete")}
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(flag)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FeatureFlagSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-neutral-100 p-4 last:border-0 dark:border-neutral-850"
        >
          <div className="h-5 w-48 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-5 w-20 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-5 flex-1 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-5 w-20 rounded bg-neutral-100 dark:bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}

export default function FeatureFlagsPage() {
  const t = useExtracted();
  useSetPageTitle("Feature Flags");
  const { data: flags, isLoading } = useFeatureFlags();
  const [search, setSearch] = useState("");

  const filteredFlags = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return flags || [];
    return (flags || []).filter(flag =>
      [flag.key, flag.description || ""].some(value => value.toLowerCase().includes(query))
    );
  }, [flags, search]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 p-2 md:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="w-full sm:w-64"
          isSearch
          placeholder={t("Filter feature flags")}
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <FeatureFlagDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              {t("New flag")}
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <FeatureFlagSkeleton />
      ) : filteredFlags.length > 0 ? (
        <FeatureFlagTable flags={filteredFlags} />
      ) : flags?.length ? (
        <NothingFound icon={<Flag className="h-10 w-10" />} title={t("No feature flags found")} />
      ) : (
        <NothingFound
          icon={<Flag className="h-10 w-10" />}
          title={t("No feature flags yet")}
          action={
            <FeatureFlagDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("New flag")}
                </Button>
              }
            />
          }
        />
      )}
    </div>
  );
}
