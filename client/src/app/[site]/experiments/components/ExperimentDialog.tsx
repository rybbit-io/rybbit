"use client";

import type { Experiment, ExperimentPayload, ExperimentStatus } from "@/api/analytics/endpoints";
import { useCreateExperiment, useUpdateExperiment } from "@/api/analytics/hooks/experiments/useExperiments";
import { useFeatureFlags } from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import { useGetGoals } from "@/api/analytics/hooks/goals/useGetGoals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { useExtracted } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { STATUS_OPTIONS, statusLabel, toFormState } from "../lib/experimentHelpers";
import type { ExperimentFormState } from "../lib/experimentHelpers";

export function ExperimentDialog({
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
  const { data: flags } = useFeatureFlags();
  const { data: goalsData } = useGetGoals({ pageSize: 100 });
  const createMutation = useCreateExperiment();
  const updateMutation = useUpdateExperiment();
  const isEditing = !!experiment;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

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

  const fallbackFlagId = availableFlags[0]?.flagId;
  const [form, setForm] = useState<ExperimentFormState>(() => toFormState(experiment, fallbackFlagId));

  useEffect(() => {
    if (open) setForm(toFormState(experiment, fallbackFlagId));
  }, [experiment, fallbackFlagId, open]);

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const selectedFlag =
    availableFlags.find(flag => String(flag.flagId) === form.featureFlagId) || experiment?.featureFlag;
  const variants = selectedFlag
    ? [
        ...new Set([
          ...(selectedFlag.conditionSets || []).flatMap(
            conditionSet => conditionSet.variants?.map(variant => variant.key) || []
          ),
          ...(selectedFlag.variants || []).map(variant => variant.key),
        ]),
      ]
    : [];

  const updateField = <K extends keyof ExperimentFormState>(key: K, value: ExperimentFormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    const featureFlagId = Number(form.featureFlagId);

    if (!featureFlagId) {
      toast.error(t("Choose a multivariate feature flag"));
      return;
    }

    const payload: ExperimentPayload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      hypothesis: form.hypothesis.trim() || null,
      featureFlagId,
      primaryGoalId: form.primaryGoalId === "none" ? null : Number(form.primaryGoalId),
      status: form.status,
      winningVariant: form.winningVariant === "none" ? null : form.winningVariant,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ experimentId: experiment.experimentId, payload });
        toast.success(t("Experiment updated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("Experiment created"));
      }

      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to save experiment"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("Edit experiment") : t("New experiment")}</DialogTitle>
          <DialogDescription>
            {t("Experiments use multivariate feature flags for assignment and goals for outcomes.")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="experiment-name">{t("Name")}</Label>
            <Input
              id="experiment-name"
              value={form.name}
              onChange={event => updateField("name", event.target.value)}
              placeholder={t("Checkout CTA test")}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>{t("Assignment flag")}</Label>
              <Select
                value={form.featureFlagId}
                onValueChange={value => updateField("featureFlagId", value)}
                disabled={isEditing || availableFlags.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("Select a flag")} />
                </SelectTrigger>
                <SelectContent>
                  {availableFlags.map(flag => (
                    <SelectItem key={flag.flagId} value={String(flag.flagId)}>
                      {flag.key}
                    </SelectItem>
                  ))}
                  {isEditing &&
                    experiment &&
                    !availableFlags.some(flag => flag.flagId === experiment.featureFlagId) && (
                      <SelectItem value={String(experiment.featureFlagId)}>{experiment.featureFlag.key}</SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("Primary goal")}</Label>
              <Select value={form.primaryGoalId} onValueChange={value => updateField("primaryGoalId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select a goal")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("No goal")}</SelectItem>
                  {(goalsData?.data || []).map(goal => (
                    <SelectItem key={goal.goalId} value={String(goal.goalId)}>
                      {goal.name || t("Goal #{goalId}", { goalId: String(goal.goalId) })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>{t("Status")}</Label>
              <Select value={form.status} onValueChange={value => updateField("status", value as ExperimentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      {statusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("Winning variant")}</Label>
              <Select value={form.winningVariant} onValueChange={value => updateField("winningVariant", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("No winner")}</SelectItem>
                  {variants.map(variant => (
                    <SelectItem key={variant} value={variant}>
                      {variant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="experiment-hypothesis">{t("Hypothesis")}</Label>
            <Textarea
              id="experiment-hypothesis"
              value={form.hypothesis}
              onChange={event => updateField("hypothesis", event.target.value)}
              rows={2}
              placeholder={t("Changing the CTA copy will increase signup conversions.")}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="experiment-description">{t("Description")}</Label>
            <Textarea
              id="experiment-description"
              value={form.description}
              onChange={event => updateField("description", event.target.value)}
              rows={2}
              placeholder={t("Optional notes for this experiment")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !form.name.trim() || !form.featureFlagId}>
            {isSaving ? t("Saving...") : isEditing ? t("Save changes") : t("Create experiment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
