"use client";

import type {
  Experiment,
  FeatureFlag,
  FeatureFlagPayload,
  FeatureFlagVariant,
  GoalType as AnyGoalType,
} from "@/api/analytics/endpoints";
import { useCreateExperiment, useUpdateExperiment } from "@/api/analytics/hooks/experiments/useExperiments";
import {
  useCreateFeatureFlag,
  useFeatureFlags,
  useUpdateFeatureFlag,
} from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import { type CreateGoalRequest, useCreateGoal } from "@/api/analytics/hooks/goals/useCreateGoal";
import { useGetGoals } from "@/api/analytics/hooks/goals/useGetGoals";
import { useUpdateGoal } from "@/api/analytics/hooks/goals/useUpdateGoal";
import { useMetric } from "@/api/analytics/hooks/useGetMetric";
import { CodeSnippet } from "@/components/CodeSnippet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputWithSuggestions, type SuggestionOption } from "@/components/ui/input-with-suggestions";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChoiceGroup, CodeTabs, PercentInput, SavedNotice, SplitBar } from "../../feature-flags/components/formParts";

type WizardStep = "basics" | "assignment" | "goal" | "implementation";
type AssignmentMode = "new" | "existing";
type GoalMode = "new" | "existing" | "none";
type GoalType = "path" | "event";

type VariantDraft = {
  id: string;
  key: string;
  name: string;
  rolloutPercentage: number;
};

type VariantSourceFlag = {
  conditionSets?: Array<{
    variants?: Array<{
      key: string;
      name?: string;
      rolloutPercentage: number;
    }>;
  }>;
  variants?: Array<{
    key: string;
    name?: string;
    rolloutPercentage: number;
  }>;
};

// What an earlier, failed save already created, with the request that created it.
type CreatedResources = {
  flag?: { request: string; flag: FeatureFlag };
  goal?: { request: string; goalId: number };
};

type ImplementationState = {
  mode: "created" | "updated";
  experiment: Experiment;
  flagKey: string;
  variants: string[];
  goalMode: GoalMode;
  goalType?: AnyGoalType;
  goalLabel?: string;
};

type WizardForm = {
  name: string;
  description: string;
  hypothesis: string;
  assignmentMode: AssignmentMode;
  existingFlagId: string;
  flagKey: string;
  flagDescription: string;
  variants: VariantDraft[];
  goalMode: GoalMode;
  existingGoalId: string;
  goalName: string;
  goalType: GoalType;
  pathPattern: string;
  eventName: string;
};

const STEPS: WizardStep[] = ["basics", "assignment", "goal", "implementation"];

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Flag and variant keys must match the server's /^[A-Za-z][A-Za-z0-9_.:-]*$/ (max 100 chars), so a key
// never starts with a digit or separator: "2026 pricing test" becomes "pricing_test".
// While typing, a trailing separator stays so the next word can follow it.
function slugifyWhileTyping(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .slice(0, 100);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .slice(0, 100)
    .replace(/_+$/, "");
}

function getVariantDraftsFromFlag(flag: VariantSourceFlag): VariantDraft[] {
  const variants = [
    ...(flag.conditionSets || []).flatMap(conditionSet => conditionSet.variants || []),
    ...(flag.variants || []),
  ];

  if (variants.length >= 2) {
    return variants.map(variant => ({
      id: createId(),
      key: variant.key,
      name: variant.name || "",
      rolloutPercentage: variant.rolloutPercentage,
    }));
  }

  return [
    { id: createId(), key: "control", name: "Control", rolloutPercentage: 50 },
    { id: createId(), key: "variant_a", name: "Variant A", rolloutPercentage: 50 },
  ];
}

function initialForm(experiment?: Experiment): WizardForm {
  if (experiment) {
    const primaryGoal = experiment.primaryGoal;

    return {
      name: experiment.name,
      description: experiment.description || "",
      hypothesis: experiment.hypothesis || "",
      assignmentMode: "existing",
      existingFlagId: String(experiment.featureFlagId),
      flagKey: experiment.featureFlag.key,
      flagDescription: experiment.featureFlag.description || "",
      variants: getVariantDraftsFromFlag(experiment.featureFlag),
      goalMode: experiment.primaryGoalId ? "existing" : "none",
      existingGoalId: experiment.primaryGoalId ? String(experiment.primaryGoalId) : "",
      goalName: primaryGoal?.name || "",
      goalType: primaryGoal?.goalType === "event" ? "event" : "path",
      pathPattern: primaryGoal?.config.pathPattern || "",
      eventName: primaryGoal?.config.eventName || "",
    };
  }

  return {
    name: "",
    description: "",
    hypothesis: "",
    assignmentMode: "new",
    existingFlagId: "",
    flagKey: "",
    flagDescription: "",
    variants: [
      { id: createId(), key: "control", name: "Control", rolloutPercentage: 50 },
      { id: createId(), key: "variant_a", name: "Variant A", rolloutPercentage: 50 },
    ],
    goalMode: "new",
    existingGoalId: "",
    goalName: "",
    goalType: "path",
    pathPattern: "",
    eventName: "",
  };
}

// The pattern a goal matches against, regardless of its type (path/event/autocapture)
function goalDisplayPattern(
  goal?: {
    goalType: AnyGoalType;
    config: { pathPattern?: string; eventName?: string; valuePattern?: string };
  } | null
): string | undefined {
  if (!goal) return undefined;
  if (goal.goalType === "path") return goal.config.pathPattern;
  if (goal.goalType === "event") return goal.config.eventName;
  return goal.config.valuePattern;
}

function getVariantKeys(flag: VariantSourceFlag) {
  return [
    ...new Set([
      ...(flag.conditionSets || []).flatMap(conditionSet => conditionSet.variants?.map(variant => variant.key) || []),
      ...(flag.variants || []).map(variant => variant.key),
    ]),
  ];
}

export function CreateExperimentWizard({
  experiment,
  experiments,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  experiment?: Experiment;
  experiments: Experiment[];
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useExtracted();
  const { site } = useStore();
  const { data: flags } = useFeatureFlags();
  const { data: goalsData } = useGetGoals({ pageSize: 100 });
  const { data: pathsData } = useMetric({ parameter: "pathname", limit: 1000, useFilters: false });
  const { data: eventsData } = useMetric({ parameter: "event_name", limit: 1000, useFilters: false });
  const createFeatureFlagMutation = useCreateFeatureFlag();
  const updateFeatureFlagMutation = useUpdateFeatureFlag();
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const createExperimentMutation = useCreateExperiment();
  const updateExperimentMutation = useUpdateExperiment();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const [step, setStep] = useState<WizardStep>("basics");
  const [form, setForm] = useState<WizardForm>(() => initialForm(experiment));
  const [savedImplementationState, setSavedImplementationState] = useState<ImplementationState | null>(null);
  const [flagKeyTouched, setFlagKeyTouched] = useState(false);
  const [goalNameTouched, setGoalNameTouched] = useState(false);
  // A save is up to three requests (flag, goal, experiment) that commit separately. When a later one
  // fails, the retry reuses what the earlier ones created, updated in place if the form changed since,
  // instead of creating duplicates: a second flag with the same key is a 409, a second goal an orphan.
  const createdRef = useRef<CreatedResources>({});
  const isEditing = !!experiment;
  // Visitors are already assigned by this flag, so the server keeps it once started.
  const assignmentLocked = !!experiment && experiment.status !== "draft";

  const usedFlagIds = useMemo(
    () =>
      new Set(
        experiments.filter(item => item.experimentId !== experiment?.experimentId).map(item => item.featureFlagId)
      ),
    [experiment?.experimentId, experiments]
  );
  const availableFlags = useMemo(
    // Server-only flags never reach the tracking script, so they can't record exposures.
    () =>
      (flags || []).filter(
        flag => flag.flagType === "multivariate" && flag.runtime !== "server" && !usedFlagIds.has(flag.flagId)
      ),
    [flags, usedFlagIds]
  );
  const selectedFlag =
    availableFlags.find(flag => String(flag.flagId) === form.existingFlagId) ||
    (experiment?.featureFlagId === Number(form.existingFlagId) ? experiment.featureFlag : undefined);
  const goals = goalsData?.data || [];
  const pathSuggestions: SuggestionOption[] = (pathsData?.data || []).map(item => ({
    value: item.value,
    label: item.value,
    count: item.count,
  }));
  const eventSuggestions: SuggestionOption[] = (eventsData?.data || []).map(item => ({
    value: item.value,
    label: item.value,
    count: item.count,
  }));
  const selectedGoal =
    goals.find(goal => String(goal.goalId) === form.existingGoalId) ||
    (experiment?.primaryGoalId === Number(form.existingGoalId) ? experiment.primaryGoal : undefined);
  const activeStepIndex = STEPS.indexOf(step);
  const isSaving =
    createFeatureFlagMutation.isPending ||
    updateFeatureFlagMutation.isPending ||
    createGoalMutation.isPending ||
    updateGoalMutation.isPending ||
    createExperimentMutation.isPending ||
    updateExperimentMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setStep("basics");
    setForm(initialForm(experiment));
    setSavedImplementationState(null);
    setFlagKeyTouched(!!experiment);
    setGoalNameTouched(!!experiment);
    createdRef.current = {};
  }, [experiment?.experimentId, open]);

  useEffect(() => {
    if (form.existingFlagId || availableFlags.length === 0) return;
    setForm(current => ({ ...current, existingFlagId: String(availableFlags[0].flagId) }));
  }, [availableFlags, form.existingFlagId]);

  useEffect(() => {
    if (form.existingGoalId || goals.length === 0) return;
    setForm(current => ({ ...current, existingGoalId: String(goals[0].goalId) }));
  }, [goals, form.existingGoalId]);

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const updateForm = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const updateName = (name: string) => {
    setForm(current => ({
      ...current,
      name,
      flagKey: flagKeyTouched ? current.flagKey : slugify(name),
      goalName: goalNameTouched ? current.goalName : name ? `${name} conversion` : "",
    }));
  };

  const updateVariant = <K extends keyof VariantDraft>(id: string, key: K, value: VariantDraft[K]) => {
    setForm(current => ({
      ...current,
      variants: current.variants.map(variant => (variant.id === id ? { ...variant, [key]: value } : variant)),
    }));
  };

  const addVariant = () => {
    setForm(current => ({
      ...current,
      variants: [
        ...current.variants,
        {
          id: createId(),
          key: `variant_${current.variants.length}`,
          name: `Variant ${String.fromCharCode(64 + current.variants.length)}`,
          rolloutPercentage: 0,
        },
      ],
    }));
  };

  const removeVariant = (id: string) => {
    setForm(current => ({ ...current, variants: current.variants.filter(variant => variant.id !== id) }));
  };

  const validateStep = (stepToValidate: WizardStep) => {
    if (stepToValidate === "basics") {
      if (!form.name.trim()) return t("Name is required");
    }

    if (stepToValidate === "assignment") {
      if (form.assignmentMode === "existing" && !form.existingFlagId) {
        return t("Choose a multivariate feature flag");
      }

      if (form.assignmentMode === "new") {
        const keys = form.variants.map(variant => variant.key.trim()).filter(Boolean);
        const totalRollout = form.variants.reduce((sum, variant) => sum + Number(variant.rolloutPercentage || 0), 0);

        if (!form.flagKey.trim()) return t("Flag key is required");
        if (form.variants.length < 2) return t("Add at least two variants");
        if (keys.length !== form.variants.length) return t("Variant keys are required");
        if (new Set(keys).size !== keys.length) return t("Variant keys must be unique");
        if (totalRollout !== 100) return t("Variant traffic must add up to 100%");
      }
    }

    if (stepToValidate === "goal") {
      if (form.goalMode === "existing" && !form.existingGoalId) return t("Choose a goal");
      if (form.goalMode === "new" && form.goalType === "path" && !form.pathPattern.trim()) {
        return t("Path pattern is required");
      }
      if (form.goalMode === "new" && form.goalType === "event" && !form.eventName.trim()) {
        return t("Event name is required");
      }
    }

    return null;
  };

  const validateCurrentStep = () => validateStep(step);

  const validateExperimentConfiguration = () => {
    for (const stepToValidate of ["basics", "assignment", "goal"] as const) {
      const validationError = validateStep(stepToValidate);
      if (validationError) return validationError;
    }

    return null;
  };

  const goNext = () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const nextStep = STEPS[Math.min(activeStepIndex + 1, STEPS.length - 1)];
    setStep(nextStep);
  };

  const buildImplementationState = (mode: ImplementationState["mode"]): ImplementationState | null => {
    const flagKey =
      form.assignmentMode === "existing" ? selectedFlag?.key || experiment?.featureFlag.key : form.flagKey.trim();
    const variants =
      form.assignmentMode === "existing" && selectedFlag
        ? getVariantKeys(selectedFlag)
        : form.variants.map(variant => variant.key.trim()).filter(Boolean);
    const goalType =
      form.goalMode === "existing" ? selectedGoal?.goalType : form.goalMode === "new" ? form.goalType : undefined;
    const goalLabel =
      form.goalMode === "existing"
        ? goalDisplayPattern(selectedGoal)
        : form.goalMode === "new"
          ? form.goalType === "path"
            ? form.pathPattern.trim()
            : form.eventName.trim()
          : undefined;

    if (!flagKey || !experiment) return null;

    return {
      mode,
      experiment,
      flagKey,
      variants,
      goalMode: form.goalMode,
      goalType,
      goalLabel,
    };
  };

  const implementationState = savedImplementationState || (isEditing ? buildImplementationState("updated") : null);

  const saveNewFlag = async (): Promise<FeatureFlag> => {
    const variants: FeatureFlagVariant[] = form.variants.map(variant => ({
      key: variant.key.trim(),
      name: variant.name.trim() || undefined,
      rolloutPercentage: Number(variant.rolloutPercentage),
    }));
    const payload: FeatureFlagPayload = {
      key: form.flagKey.trim(),
      description: form.flagDescription.trim() || `Assignment flag for ${form.name.trim()}`,
      // Off until the experiment starts; starting it switches the flag on.
      enabled: false,
      runtime: "client",
      flagType: "multivariate",
      payload: null,
      variants: [],
      rolloutPercentage: 100,
      rules: [],
      conditionSets: [
        {
          name: "Default",
          rules: [],
          variants,
        },
      ],
    };
    const request = JSON.stringify(payload);
    const previous = createdRef.current.flag;
    if (previous?.request === request) return previous.flag;

    const { data: flag } = previous
      ? await updateFeatureFlagMutation.mutateAsync({ flagId: previous.flag.flagId, payload })
      : await createFeatureFlagMutation.mutateAsync(payload);
    createdRef.current.flag = { request, flag };
    return flag;
  };

  const saveNewGoal = async (): Promise<number> => {
    const goal: CreateGoalRequest = {
      siteId: Number(site),
      name: form.goalName.trim() || `${form.name.trim()} conversion`,
      goalType: form.goalType,
      config:
        form.goalType === "path" ? { pathPattern: form.pathPattern.trim() } : { eventName: form.eventName.trim() },
    };
    const request = JSON.stringify(goal);
    const previous = createdRef.current.goal;
    if (previous?.request === request) return previous.goalId;

    let goalId: number;
    if (previous) {
      await updateGoalMutation.mutateAsync({ ...goal, goalId: previous.goalId });
      goalId = previous.goalId;
    } else {
      goalId = (await createGoalMutation.mutateAsync(goal)).goalId;
    }
    createdRef.current.goal = { request, goalId };
    return goalId;
  };

  const submitExperiment = async () => {
    const validationError = validateExperimentConfiguration();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      let featureFlagId = Number(form.existingFlagId);
      let flagKey = selectedFlag?.key || form.flagKey.trim();
      let variantKeys = selectedFlag ? getVariantKeys(selectedFlag) : form.variants.map(variant => variant.key.trim());

      if (form.assignmentMode === "new") {
        const createdFlag = await saveNewFlag();
        featureFlagId = createdFlag.flagId;
        flagKey = createdFlag.key;
        variantKeys = getVariantKeys(createdFlag);
      }

      let primaryGoalId: number | null = form.goalMode === "existing" ? Number(form.existingGoalId) : null;
      let goalType: AnyGoalType | undefined = selectedGoal?.goalType;
      let goalLabel = form.goalMode === "none" ? undefined : (goalDisplayPattern(selectedGoal) ?? form.goalName.trim());

      if (form.goalMode === "new") {
        primaryGoalId = await saveNewGoal();
        goalType = form.goalType;
        goalLabel = form.goalType === "path" ? form.pathPattern.trim() : form.eventName.trim();
      }

      const createdExperiment = await createExperimentMutation.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || null,
        hypothesis: form.hypothesis.trim() || null,
        featureFlagId,
        primaryGoalId,
        status: "draft",
      });
      // The experiment now owns them; a later save must not reuse or rewrite them.
      createdRef.current = {};

      setSavedImplementationState({
        mode: "created",
        experiment: createdExperiment.data,
        flagKey,
        variants: variantKeys,
        goalMode: form.goalMode,
        goalType,
        goalLabel,
      });
      setStep("implementation");
      toast.success(t("Experiment created"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to save experiment"));
    }
  };

  const saveExperiment = async () => {
    const validationError = validateExperimentConfiguration();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!experiment) return;

    try {
      let featureFlagId = Number(form.existingFlagId);
      let flagKey = selectedFlag?.key || form.flagKey.trim();
      let variantKeys = selectedFlag ? getVariantKeys(selectedFlag) : form.variants.map(variant => variant.key.trim());

      if (form.assignmentMode === "new" && !assignmentLocked) {
        const createdFlag = await saveNewFlag();
        featureFlagId = createdFlag.flagId;
        flagKey = createdFlag.key;
        variantKeys = getVariantKeys(createdFlag);
      }

      let primaryGoalId: number | null = form.goalMode === "existing" ? Number(form.existingGoalId) : null;
      let goalType: AnyGoalType | undefined = selectedGoal?.goalType;
      let goalLabel = form.goalMode === "none" ? undefined : (goalDisplayPattern(selectedGoal) ?? form.goalName.trim());

      if (form.goalMode === "new") {
        primaryGoalId = await saveNewGoal();
        goalType = form.goalType;
        goalLabel = form.goalType === "path" ? form.pathPattern.trim() : form.eventName.trim();
      }

      const updatedExperiment = await updateExperimentMutation.mutateAsync({
        experimentId: experiment.experimentId,
        payload: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          hypothesis: form.hypothesis.trim() || null,
          featureFlagId,
          primaryGoalId,
        },
      });
      createdRef.current = {};

      setSavedImplementationState({
        mode: "updated",
        experiment: updatedExperiment.data,
        flagKey,
        variants: variantKeys,
        goalMode: form.goalMode,
        goalType,
        goalLabel,
      });
      setStep("implementation");
      toast.success(t("Experiment updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to save experiment"));
    }
  };

  const renderStep = () => {
    if (step === "basics") {
      return (
        <div className="grid gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor="experiment-name">{t("Experiment name")}</Label>
            <Input
              id="experiment-name"
              value={form.name}
              onChange={event => updateName(event.target.value)}
              placeholder={t("Checkout CTA test")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="experiment-hypothesis">{t("Hypothesis")}</Label>
            <Textarea
              id="experiment-hypothesis"
              value={form.hypothesis}
              onChange={event => updateForm("hypothesis", event.target.value)}
              rows={3}
              placeholder={t("Changing the CTA copy will increase signup conversions.")}
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t("The hypothesis is internal context for your team. It does not change assignment or tracking.")}
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="experiment-description">{t("Description")}</Label>
            <Textarea
              id="experiment-description"
              value={form.description}
              onChange={event => updateForm("description", event.target.value)}
              rows={3}
              placeholder={t("Optional notes for this experiment")}
            />
          </div>
        </div>
      );
    }

    if (step === "assignment" && assignmentLocked && experiment) {
      return (
        <div className="grid gap-1.5">
          <Label>{t("Assignment flag")}</Label>
          <Input value={experiment.featureFlag.key} disabled readOnly className="font-mono" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t("The flag can't change once the experiment has started, because visitors are already assigned.")}
          </p>
        </div>
      );
    }

    if (step === "assignment") {
      const rolloutTotal = form.variants.reduce((sum, variant) => sum + Number(variant.rolloutPercentage || 0), 0);

      return (
        <div className="grid gap-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t("Experiments use multivariate feature flags to assign each visitor to one stable variant.")}
          </p>
          <ChoiceGroup
            ariaLabel={t("Assignment flag")}
            className="sm:grid-cols-2"
            value={form.assignmentMode}
            onChange={mode => updateForm("assignmentMode", mode)}
            options={[
              {
                value: "new",
                title: t("Create a new flag"),
                description: t("Best for a new experiment that needs its own assignment split."),
              },
              {
                value: "existing",
                title: t("Use an existing flag"),
                description: t("Choose a multivariate flag that is not already connected to an experiment."),
              },
            ]}
          />

          {form.assignmentMode === "existing" ? (
            <div className="grid gap-1.5">
              <Label>{t("Assignment flag")}</Label>
              <Select value={form.existingFlagId} onValueChange={value => updateForm("existingFlagId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select a flag")} />
                </SelectTrigger>
                <SelectContent>
                  {availableFlags.map(flag => (
                    <SelectItem key={flag.flagId} value={String(flag.flagId)}>
                      {flag.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableFlags.length === 0 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t("No unused multivariate flags are available. Create a new flag for this experiment.")}
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="experiment-flag-key">{t("Flag key")}</Label>
                  <Input
                    id="experiment-flag-key"
                    value={form.flagKey}
                    onChange={event => {
                      setFlagKeyTouched(true);
                      updateForm("flagKey", slugifyWhileTyping(event.target.value));
                    }}
                    onBlur={() => updateForm("flagKey", slugify(form.flagKey))}
                    placeholder="checkout_cta"
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="experiment-flag-description">{t("Flag description")}</Label>
                  <Input
                    id="experiment-flag-description"
                    value={form.flagDescription}
                    onChange={event => updateForm("flagDescription", event.target.value)}
                    placeholder={t("Assignment flag for this experiment")}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>{t("Variants")}</Label>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      rolloutTotal === 100
                        ? "text-neutral-500 dark:text-neutral-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {t("{rolloutTotal}% assigned", { rolloutTotal: String(rolloutTotal) })}
                  </span>
                </div>
                <SplitBar
                  segments={form.variants.map(variant => ({
                    key: variant.id,
                    label: variant.key || t("variant"),
                    percent: Number(variant.rolloutPercentage) || 0,
                  }))}
                />
                <div className="grid gap-2">
                  {form.variants.map(variant => (
                    <div key={variant.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_2rem] gap-2">
                      <Input
                        value={variant.key}
                        onChange={event => updateVariant(variant.id, "key", slugifyWhileTyping(event.target.value))}
                        onBlur={() => updateVariant(variant.id, "key", slugify(variant.key))}
                        placeholder="variant_a"
                        className="font-mono"
                      />
                      <Input
                        value={variant.name}
                        onChange={event => updateVariant(variant.id, "name", event.target.value)}
                        placeholder={t("Display name")}
                      />
                      <PercentInput
                        ariaLabel={t("Rollout")}
                        value={variant.rolloutPercentage}
                        onChange={value => updateVariant(variant.id, "rolloutPercentage", value)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeVariant(variant.id)}
                        disabled={form.variants.length <= 2}
                        aria-label={t("Remove variant")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant} className="w-fit">
                  <Plus className="h-4 w-4" />
                  {t("Add variant")}
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step === "goal") {
      return (
        <div className="grid gap-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t("The primary goal is the conversion event or page visit used to compare variants.")}
          </p>
          <ChoiceGroup
            ariaLabel={t("Primary goal")}
            className="sm:grid-cols-3"
            value={form.goalMode}
            onChange={mode => updateForm("goalMode", mode)}
            options={[
              {
                value: "new",
                title: t("Create a new goal"),
                description: t("Define the conversion while creating the experiment."),
              },
              {
                value: "existing",
                title: t("Use existing"),
                description: t("Connect this experiment to a goal you already track."),
              },
              {
                value: "none",
                title: t("Skip for now"),
                description: t("Create the experiment now and add a goal later."),
              },
            ]}
          />

          {form.goalMode === "existing" && (
            <div className="grid gap-1.5">
              <Label>{t("Primary goal")}</Label>
              <Select value={form.existingGoalId} onValueChange={value => updateForm("existingGoalId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select a goal")} />
                </SelectTrigger>
                <SelectContent>
                  {goals.map(goal => (
                    <SelectItem key={goal.goalId} value={String(goal.goalId)}>
                      {goal.name || t("Goal #{goalId}", { goalId: String(goal.goalId) })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.goalMode === "new" && (
            <div className="grid gap-5">
              <div className="grid gap-1.5">
                <Label htmlFor="experiment-goal-name">{t("Goal name")}</Label>
                <Input
                  id="experiment-goal-name"
                  value={form.goalName}
                  onChange={event => {
                    setGoalNameTouched(true);
                    updateForm("goalName", event.target.value);
                  }}
                  placeholder={t("Signup completed")}
                />
              </div>

              <ChoiceGroup
                ariaLabel={t("Goal")}
                className="sm:grid-cols-2"
                value={form.goalType}
                onChange={goalType => updateForm("goalType", goalType)}
                options={[
                  { value: "path", title: t("Page goal"), description: t("Count visitors that reach a URL path.") },
                  {
                    value: "event",
                    title: t("Event goal"),
                    description: t("Count visitors for whom your app fires a named event."),
                  },
                ]}
              />

              {form.goalType === "path" ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="experiment-path-pattern">{t("Path pattern")}</Label>
                  <InputWithSuggestions
                    id="experiment-path-pattern"
                    suggestions={pathSuggestions}
                    value={form.pathPattern}
                    onChange={event => updateForm("pathPattern", event.target.value)}
                    placeholder="/signup/complete"
                  />
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <Label htmlFor="experiment-event-name">{t("Event name")}</Label>
                  <InputWithSuggestions
                    id="experiment-event-name"
                    suggestions={eventSuggestions}
                    value={form.eventName}
                    onChange={event => updateForm("eventName", event.target.value)}
                    placeholder="signup_completed"
                    className="font-mono"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (!implementationState) return null;

    const fallbackVariant = implementationState.variants[0] || "control";
    const alternateVariant = implementationState.variants.find(variant => variant !== fallbackVariant) || "variant_a";
    const variantUnion = implementationState.variants.map(variant => JSON.stringify(variant)).join(" | ");
    const jsCode = `window.rybbit.onReady((rybbit) => {
  const variant = rybbit.flag(${JSON.stringify(implementationState.flagKey)}, ${JSON.stringify(fallbackVariant)});

  if (variant === ${JSON.stringify(alternateVariant)}) {
    // Render the variant experience.
  } else {
    // Render the control experience.
  }
});`;
    const tsCode = `type ExperimentVariant = ${variantUnion || JSON.stringify(fallbackVariant)};

window.rybbit.onReady((rybbit) => {
  const variant = rybbit.flag(${JSON.stringify(implementationState.flagKey)}, ${JSON.stringify(fallbackVariant)}) as ExperimentVariant;

  switch (variant) {
    case ${JSON.stringify(alternateVariant)}:
      // Render the variant experience.
      break;
    default:
      // Render the control experience.
      break;
  }
});`;
    const eventGoalCode =
      implementationState.goalType === "event" && implementationState.goalLabel
        ? `window.rybbit.onReady((rybbit) => {
  rybbit.event(${JSON.stringify(implementationState.goalLabel)});
});`
        : null;

    return (
      <div className="grid gap-5">
        <SavedNotice
          title={
            implementationState.mode === "created" ? t("Experiment created as a draft") : t("Experiment changes saved")
          }
        >
          {t("Add this code to your app, then start the experiment from the list when you are ready.")}
        </SavedNotice>

        <div className="grid gap-2">
          <Label>{t("Variant implementation")}</Label>
          <CodeTabs jsCode={jsCode} tsCode={tsCode} />
        </div>

        {eventGoalCode ? (
          <div className="grid gap-2">
            <Label>{t("Conversion event")}</Label>
            <CodeSnippet code={eventGoalCode} language="javascript" />
          </div>
        ) : implementationState.goalType === "path" ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t(
              "No conversion event code is needed for this path goal. Rybbit will count visitors that reach {goalLabel}.",
              {
                goalLabel: implementationState.goalLabel || "",
              }
            )}
          </p>
        ) : implementationState.goalType && implementationState.goalType !== "event" ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t(
              "No conversion event code is needed for this goal. Rybbit tracks it automatically based on user behavior."
            )}
          </p>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t("Add a primary goal later to calculate conversions for each variant.")}
          </p>
        )}
      </div>
    );
  };

  const stepLabels: Record<WizardStep, string> = {
    basics: t("Basics"),
    assignment: t("Assignment"),
    goal: t("Goal"),
    implementation: t("Implement"),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-3 border-b border-neutral-150 px-6 py-4 dark:border-neutral-850">
          <DialogTitle className="text-base">{isEditing ? t("Edit experiment") : t("New experiment")}</DialogTitle>

          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
            {STEPS.map((item, index) => {
              const canOpenStep = item !== "implementation" || !!implementationState;
              const done = index < activeStepIndex;
              return (
                <li key={item} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-700" aria-hidden />
                  )}
                  <button
                    type="button"
                    disabled={!canOpenStep}
                    aria-current={item === step ? "step" : undefined}
                    onClick={() => setStep(item)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300",
                      item === step
                        ? "font-medium text-neutral-900 dark:text-neutral-50"
                        : canOpenStep
                          ? "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                          : "text-neutral-400 dark:text-neutral-600"
                    )}
                  >
                    {done && <Check className="h-3.5 w-3.5" aria-hidden />}
                    {stepLabels[item]}
                  </button>
                </li>
              );
            })}
          </ol>
        </DialogHeader>

        <div className="min-h-[26rem] flex-1 overflow-y-auto px-6 py-5">{renderStep()}</div>

        <div className="flex items-center justify-between border-t border-neutral-150 px-6 py-3 dark:border-neutral-850">
          {/* Once saved there is nothing to cancel, and Done already closes the dialog. */}
          {step === "implementation" ? (
            <span />
          ) : (
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
          )}
          <div className="flex items-center gap-2">
            {activeStepIndex > 0 && step !== "implementation" && (
              <Button variant="secondary" onClick={() => setStep(STEPS[activeStepIndex - 1])}>
                {t("Back")}
              </Button>
            )}
            {step === "goal" ? (
              <Button
                variant="success"
                onClick={isEditing ? saveExperiment : submitExperiment}
                disabled={isSaving || !site}
              >
                {isSaving
                  ? isEditing
                    ? t("Saving...")
                    : t("Creating...")
                  : isEditing
                    ? t("Save changes")
                    : t("Create experiment")}
              </Button>
            ) : step === "implementation" ? (
              <Button onClick={() => setOpen(false)}>{t("Done")}</Button>
            ) : (
              <Button onClick={goNext}>{t("Continue")}</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
