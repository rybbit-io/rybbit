"use client";

import { useCreateFeatureFlag, useUpdateFeatureFlag } from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import type { FeatureFlag, FeatureFlagType } from "@/api/analytics/endpoints";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { flagTypeOptions, runtimeOptions } from "../lib/constants";
import { buildPayload, createEmptyVariant, toFormState } from "../lib/form";
import { useFlagTypeLabel, useRuntimeLabel } from "../lib/labels";
import type { FlagFormState } from "../lib/types";
import { ConditionSetsEditor } from "./ConditionSetsEditor";

export function FeatureFlagDialog({ flag, trigger }: { flag?: FeatureFlag; trigger: ReactNode }) {
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
