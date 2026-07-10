"use client";

import type { Experiment, FeatureFlagVariant, GoalType as AnyGoalType } from "@/api/analytics/endpoints";
import { useCreateExperiment, useUpdateExperiment } from "@/api/analytics/hooks/experiments/useExperiments";
import { useCreateFeatureFlag, useFeatureFlags } from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import { useCreateGoal } from "@/api/analytics/hooks/goals/useCreateGoal";
import { useGetGoals } from "@/api/analytics/hooks/goals/useGetGoals";
import { useMetric } from "@/api/analytics/hooks/useGetMetric";
import { CodeSnippet } from "@/components/CodeSnippet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputWithSuggestions, type SuggestionOption } from "@/components/ui/input-with-suggestions";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Check, FlaskConical, Flag, MousePointerClick, Plus, Target, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

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

const VARIANT_SEGMENT_COLORS = ["bg-accent-500", "bg-accent-400", "bg-accent-600", "bg-accent-300", "bg-accent-700"];

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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

function CodeTabs({ jsCode, tsCode }: { jsCode: string; tsCode: string }) {
  const [language, setLanguage] = useState<"js" | "ts">("js");

  return (
    <div className="grid gap-2">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setLanguage("js")}
          className={cn(
            "rounded px-2 py-1 text-xs transition-colors",
            language === "js"
              ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
              : "text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-850"
          )}
        >
          JavaScript
        </button>
        <button
          type="button"
          onClick={() => setLanguage("ts")}
          className={cn(
            "rounded px-2 py-1 text-xs transition-colors",
            language === "ts"
              ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
              : "text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-850"
          )}
        >
          TypeScript
        </button>
      </div>
      <CodeSnippet code={language === "js" ? jsCode : tsCode} language="javascript" />
    </div>
  );
}

function WizardChoice({
  selected,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-accent-500 bg-accent-500/5 dark:border-accent-600 dark:bg-accent-600/10"
          : "border-neutral-150 bg-neutral-50/50 hover:border-neutral-200 hover:bg-neutral-100/60 dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:border-neutral-750 dark:hover:bg-neutral-900"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            selected
              ? "bg-accent-500/15 text-accent-600 dark:bg-accent-500/20 dark:text-accent-400"
              : "bg-neutral-100 text-neutral-500 dark:bg-neutral-850 dark:text-neutral-400"
          )}
        >
          {icon}
        </div>
        <div className="grid gap-1">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{title}</span>
          <span className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">{description}</span>
        </div>
      </div>
    </button>
  );
}

function WizardHelp({ step, isEditing }: { step: WizardStep; isEditing: boolean }) {
  const t = useExtracted();

  const content: Record<WizardStep, { title: string; body: string[] }> = {
    basics: {
      title: t("Define the question"),
      body: [
        t("Start with the behavior you want to change and the metric you expect to move."),
        t("The hypothesis is internal context for your team. It does not change assignment or tracking."),
        isEditing
          ? t("Changing these notes does not change assignment or tracking.")
          : t("New experiments are created as drafts so you can add the implementation before starting traffic."),
      ],
    },
    assignment: {
      title: t("Create the assignment"),
      body: [
        t("Experiments use multivariate feature flags to assign each visitor to one stable variant."),
        t("Calling rybbit.flag records the exposure that powers experiment results."),
        t("A full split should add up to 100 percent unless you intentionally want unassigned traffic."),
      ],
    },
    goal: {
      title: t("Pick the outcome"),
      body: [
        t("The primary goal is the conversion event or page visit used to compare variants."),
        t("Path goals work when conversion is a URL, like /thank-you. Event goals work for explicit actions."),
        t("You can skip this for now, but conversion results need a goal later."),
      ],
    },
    implementation: {
      title: t("Implement and expose"),
      body: [
        t("Use the generated flag key in your app and branch your UI or behavior by variant."),
        t("Read the flag in code before rendering the tested experience."),
        t("For event goals, fire the event when the conversion action happens."),
      ],
    },
  };

  return (
    <aside className="hidden border-l border-neutral-150 bg-neutral-50/70 p-5 dark:border-neutral-850 dark:bg-neutral-950/40 lg:block">
      <div className="sticky top-5 grid gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-500/10 text-accent-600 dark:text-accent-400">
          <FlaskConical className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{content[step].title}</h3>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
            {content[step].body.map(item => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
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
  const createGoalMutation = useCreateGoal();
  const createExperimentMutation = useCreateExperiment();
  const updateExperimentMutation = useUpdateExperiment();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const [step, setStep] = useState<WizardStep>("basics");
  const [form, setForm] = useState<WizardForm>(() => initialForm(experiment));
  const [savedImplementationState, setSavedImplementationState] = useState<ImplementationState | null>(null);
  const [flagKeyTouched, setFlagKeyTouched] = useState(false);
  const [goalNameTouched, setGoalNameTouched] = useState(false);
  const isEditing = !!experiment;

  const usedFlagIds = useMemo(
    () =>
      new Set(
        experiments.filter(item => item.experimentId !== experiment?.experimentId).map(item => item.featureFlagId)
      ),
    [experiment?.experimentId, experiments]
  );
  const availableFlags = useMemo(
    () => (flags || []).filter(flag => flag.flagType === "multivariate" && !usedFlagIds.has(flag.flagId)),
    [flags, usedFlagIds]
  );
  const selectedFlag =
    availableFlags.find(flag => String(flag.flagId) === form.existingFlagId) ||
    (experiment?.featureFlagId === Number(form.existingFlagId) ? experiment.featureFlag : undefined);
  const goals = goalsData?.data || [];
  const pathSuggestions: SuggestionOption[] = (pathsData?.data || []).map(item => ({
    value: item.value,
    label: item.value,
  }));
  const eventSuggestions: SuggestionOption[] = (eventsData?.data || []).map(item => ({
    value: item.value,
    label: item.value,
  }));
  const selectedGoal =
    goals.find(goal => String(goal.goalId) === form.existingGoalId) ||
    (experiment?.primaryGoalId === Number(form.existingGoalId) ? experiment.primaryGoal : undefined);
  const activeStepIndex = STEPS.indexOf(step);
  const isSaving =
    createFeatureFlagMutation.isPending ||
    createGoalMutation.isPending ||
    createExperimentMutation.isPending ||
    updateExperimentMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setStep("basics");
    setForm(initialForm(experiment));
    setSavedImplementationState(null);
    setFlagKeyTouched(!!experiment);
    setGoalNameTouched(!!experiment);
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
        const variants: FeatureFlagVariant[] = form.variants.map(variant => ({
          key: variant.key.trim(),
          name: variant.name.trim() || undefined,
          rolloutPercentage: Number(variant.rolloutPercentage),
        }));

        const createdFlag = await createFeatureFlagMutation.mutateAsync({
          key: form.flagKey.trim(),
          description: form.flagDescription.trim() || `Assignment flag for ${form.name.trim()}`,
          enabled: true,
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
        });

        featureFlagId = createdFlag.data.flagId;
        flagKey = createdFlag.data.key;
        variantKeys = getVariantKeys(createdFlag.data);
      }

      let primaryGoalId: number | null = form.goalMode === "existing" ? Number(form.existingGoalId) : null;
      let goalType: AnyGoalType | undefined = selectedGoal?.goalType;
      let goalLabel = form.goalMode === "none" ? undefined : (goalDisplayPattern(selectedGoal) ?? form.goalName.trim());

      if (form.goalMode === "new") {
        const createdGoal = await createGoalMutation.mutateAsync({
          siteId: Number(site),
          name: form.goalName.trim() || `${form.name.trim()} conversion`,
          goalType: form.goalType,
          config:
            form.goalType === "path" ? { pathPattern: form.pathPattern.trim() } : { eventName: form.eventName.trim() },
        });

        primaryGoalId = createdGoal.goalId;
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

      if (form.assignmentMode === "new") {
        const variants: FeatureFlagVariant[] = form.variants.map(variant => ({
          key: variant.key.trim(),
          name: variant.name.trim() || undefined,
          rolloutPercentage: Number(variant.rolloutPercentage),
        }));

        const createdFlag = await createFeatureFlagMutation.mutateAsync({
          key: form.flagKey.trim(),
          description: form.flagDescription.trim() || `Assignment flag for ${form.name.trim()}`,
          enabled: true,
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
        });

        featureFlagId = createdFlag.data.flagId;
        flagKey = createdFlag.data.key;
        variantKeys = getVariantKeys(createdFlag.data);
      }

      let primaryGoalId: number | null = form.goalMode === "existing" ? Number(form.existingGoalId) : null;
      let goalType: AnyGoalType | undefined = selectedGoal?.goalType;
      let goalLabel = form.goalMode === "none" ? undefined : (goalDisplayPattern(selectedGoal) ?? form.goalName.trim());

      if (form.goalMode === "new") {
        const createdGoal = await createGoalMutation.mutateAsync({
          siteId: Number(site),
          name: form.goalName.trim() || `${form.name.trim()} conversion`,
          goalType: form.goalType,
          config:
            form.goalType === "path" ? { pathPattern: form.pathPattern.trim() } : { eventName: form.eventName.trim() },
        });

        primaryGoalId = createdGoal.goalId;
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

    if (step === "assignment") {
      const rolloutTotal = form.variants.reduce((sum, variant) => sum + Number(variant.rolloutPercentage || 0), 0);

      return (
        <div className="grid gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <WizardChoice
              selected={form.assignmentMode === "new"}
              icon={<Plus className="h-4 w-4" />}
              title={t("Create a new flag")}
              description={t("Best for a new experiment that needs its own assignment split.")}
              onClick={() => updateForm("assignmentMode", "new")}
            />
            <WizardChoice
              selected={form.assignmentMode === "existing"}
              icon={<Flag className="h-4 w-4" />}
              title={t("Use an existing flag")}
              description={t("Choose a multivariate flag that is not already connected to an experiment.")}
              onClick={() => updateForm("assignmentMode", "existing")}
            />
          </div>

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
                      updateForm("flagKey", slugify(event.target.value));
                    }}
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
                <div className="flex h-2 gap-px overflow-hidden rounded-full bg-neutral-150 dark:bg-neutral-800">
                  {form.variants.map((variant, index) =>
                    Number(variant.rolloutPercentage) > 0 ? (
                      <div
                        key={variant.id}
                        className={cn(
                          "h-full first:rounded-l-full last:rounded-r-full",
                          VARIANT_SEGMENT_COLORS[index % VARIANT_SEGMENT_COLORS.length]
                        )}
                        style={{ width: `${Math.min(100, Number(variant.rolloutPercentage))}%` }}
                        title={`${variant.key || t("variant")} · ${variant.rolloutPercentage}%`}
                      />
                    ) : null
                  )}
                </div>
                <div className="grid gap-2">
                  {form.variants.map(variant => (
                    <div key={variant.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_2rem] gap-2">
                      <Input
                        value={variant.key}
                        onChange={event => updateVariant(variant.id, "key", slugify(event.target.value))}
                        placeholder="variant_a"
                        className="font-mono"
                      />
                      <Input
                        value={variant.name}
                        onChange={event => updateVariant(variant.id, "name", event.target.value)}
                        placeholder={t("Display name")}
                      />
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={variant.rolloutPercentage}
                          onChange={event =>
                            updateVariant(variant.id, "rolloutPercentage", Number(event.target.value || 0))
                          }
                          className="pr-6 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-500 dark:text-neutral-400">
                          %
                        </span>
                      </div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <WizardChoice
              selected={form.goalMode === "new"}
              icon={<Plus className="h-4 w-4" />}
              title={t("Create a new goal")}
              description={t("Define the conversion while creating the experiment.")}
              onClick={() => updateForm("goalMode", "new")}
            />
            <WizardChoice
              selected={form.goalMode === "existing"}
              icon={<Target className="h-4 w-4" />}
              title={t("Use existing")}
              description={t("Connect this experiment to a goal you already track.")}
              onClick={() => updateForm("goalMode", "existing")}
            />
            <WizardChoice
              selected={form.goalMode === "none"}
              icon={<MousePointerClick className="h-4 w-4" />}
              title={t("Skip for now")}
              description={t("Create the experiment now and add a goal later.")}
              onClick={() => updateForm("goalMode", "none")}
            />
          </div>

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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <WizardChoice
                  selected={form.goalType === "path"}
                  icon={<Target className="h-4 w-4" />}
                  title={t("Page goal")}
                  description={t("Count sessions that reach a URL path.")}
                  onClick={() => updateForm("goalType", "path")}
                />
                <WizardChoice
                  selected={form.goalType === "event"}
                  icon={<MousePointerClick className="h-4 w-4" />}
                  title={t("Event goal")}
                  description={t("Count sessions where your app fires a named event.")}
                  onClick={() => updateForm("goalType", "event")}
                />
              </div>

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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                {implementationState.mode === "created"
                  ? t("Experiment created as a draft")
                  : t("Experiment changes saved")}
              </h3>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                {t("Add this code to your app, then start the experiment from the list when you are ready.")}
              </p>
            </div>
          </div>
        </div>

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
          <p className="rounded-md border border-neutral-150 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
            {t(
              "No conversion event code is needed for this path goal. Rybbit will count sessions that reach {goalLabel}.",
              {
                goalLabel: implementationState.goalLabel || "",
              }
            )}
          </p>
        ) : implementationState.goalType && implementationState.goalType !== "event" ? (
          <p className="rounded-md border border-neutral-150 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
            {t("No conversion event code is needed for this goal. Rybbit tracks it automatically based on user behavior.")}
          </p>
        ) : (
          <p className="rounded-md border border-neutral-150 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
            {t("Add a primary goal later to calculate conversions for each variant.")}
          </p>
        )}
      </div>
    );
  };

  const stepTitle =
    step === "basics"
      ? t("Basics")
      : step === "assignment"
        ? t("Assignment")
        : step === "goal"
          ? t("Goal")
          : t("Implement");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex max-h-[90vh] w-full max-w-5xl flex-col gap-0 p-0">
        <DialogTitle className="sr-only">{isEditing ? t("Edit experiment") : t("Create experiment")}</DialogTitle>

        <div className="border-b border-neutral-150 px-6 pb-4 pt-5 dark:border-neutral-850">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {isEditing ? t("Edit experiment") : t("New experiment")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-850 dark:text-neutral-400">
                {isEditing ? t("Existing") : t("Draft")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {STEPS.map((item, index) => {
              const canOpenStep = item !== "implementation" || !!implementationState;
              return (
                <button
                  key={item}
                  type="button"
                  disabled={!canOpenStep}
                  onClick={() => {
                    if (canOpenStep) setStep(item);
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs transition-colors",
                    item === step
                      ? "bg-accent-500/10 text-accent-700 dark:text-accent-300"
                      : index < activeStepIndex
                        ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-850 dark:text-neutral-200"
                        : canOpenStep
                          ? "bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-850"
                          : "bg-neutral-50 text-neutral-300 dark:bg-neutral-900 dark:text-neutral-600"
                  )}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/10 text-[10px]">
                    {index < activeStepIndex || (item === "implementation" && implementationState) ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {item === "basics"
                    ? t("Basics")
                    : item === "assignment"
                      ? t("Assignment")
                      : item === "goal"
                        ? t("Goal")
                        : t("Implement")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid min-h-[520px] flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="overflow-y-auto px-6 py-5">
            <div className="mx-auto max-w-2xl">
              <div className="mb-5">
                <h2 className="text-xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50">
                  {stepTitle}
                </h2>
              </div>
              {renderStep()}
            </div>
          </div>
          <WizardHelp step={step} isEditing={isEditing} />
        </div>

        <div className="flex items-center justify-between border-t border-neutral-150 px-6 py-4 dark:border-neutral-850">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {step === "implementation" ? t("Close") : t("Cancel")}
          </Button>
          <div className="flex items-center gap-2">
            {activeStepIndex > 0 && step !== "implementation" && (
              <Button variant="secondary" onClick={() => setStep(STEPS[activeStepIndex - 1])}>
                {t("Back")}
              </Button>
            )}
            {step === "goal" ? (
              <Button onClick={isEditing ? saveExperiment : submitExperiment} disabled={isSaving || !site}>
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
