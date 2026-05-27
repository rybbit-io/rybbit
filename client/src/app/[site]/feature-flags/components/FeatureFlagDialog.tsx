"use client";

import { useCreateFeatureFlag, useUpdateFeatureFlag } from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import type { FeatureFlag, FeatureFlagType } from "@/api/analytics/endpoints";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Braces, SlidersHorizontal, ToggleRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { flagTypeOptions, runtimeOptions } from "../lib/constants";
import { buildPayload, createEmptyVariant, toFormState } from "../lib/form";
import { useFlagTypeLabel, useRuntimeLabel } from "../lib/labels";
import type { FlagFormState } from "../lib/types";
import { ConditionSetsEditor } from "./ConditionSetsEditor";

const FLAG_TYPE_ICONS: Record<FeatureFlagType, typeof ToggleRight> = {
  boolean: ToggleRight,
  multivariate: SlidersHorizontal,
  remote_config: Braces,
};

export function FeatureFlagDialog({
  flag,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  flag?: FeatureFlag;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useExtracted();
  const getFlagTypeLabel = useFlagTypeLabel();
  const getRuntimeLabel = useRuntimeLabel();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
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

  const typeDescriptions: Record<FeatureFlagType, string> = useMemo(
    () => ({
      boolean: t("Returns true or false"),
      multivariate: t("Split traffic across keys"),
      remote_config: t("Return a JSON payload"),
    }),
    [t]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0">
        {/* Sticky header — flag identity */}
        <div className="border-b border-neutral-150 px-6 pb-4 pt-5 dark:border-neutral-850">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {isEditing ? t("Edit flag") : t("New flag")}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
                  form.enabled
                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-neutral-100 text-neutral-500 dark:bg-neutral-850 dark:text-neutral-400"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    form.enabled ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-600"
                  )}
                />
                {form.enabled ? t("Live") : t("Paused")}
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <Input
              id="flag-key"
              value={form.key}
              disabled={isEditing}
              onChange={event => updateField("key", event.target.value.replace(/\s+/g, "-"))}
              placeholder="new-checkout"
              className={cn(
                "h-auto border-0 bg-transparent px-0 py-0 font-mono text-xl font-medium tracking-tight",
                "shadow-none focus-visible:ring-0 dark:bg-transparent",
                "placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
              )}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {t("The identifier you'll reference in code")}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-6">
            {/* Type selector — choice cards */}
            <section className="grid gap-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {t("Returns")}
              </Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {flagTypeOptions.map(option => {
                  const Icon = FLAG_TYPE_ICONS[option];
                  const selected = form.flagType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleFlagTypeChange(option)}
                      className={cn(
                        "group flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                        selected
                          ? "border-accent-500 bg-accent-500/5 dark:border-accent-600 dark:bg-accent-600/10"
                          : "border-neutral-150 bg-neutral-50/50 hover:border-neutral-200 hover:bg-neutral-100/60 dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:border-neutral-750 dark:hover:bg-neutral-900"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md",
                          selected
                            ? "bg-accent-500/15 text-accent-600 dark:bg-accent-500/20 dark:text-accent-400"
                            : "bg-neutral-100 text-neutral-500 dark:bg-neutral-850 dark:text-neutral-400"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="grid gap-0.5">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                          {getFlagTypeLabel(option)}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {typeDescriptions[option]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <ConditionSetsEditor
              flagType={form.flagType}
              conditionSets={form.conditionSets}
              onChange={conditionSets => updateField("conditionSets", conditionSets)}
            />

            {/* Meta: description */}
            <section className="grid gap-2">
              <Label
                htmlFor="flag-description"
                className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              >
                {t("Description")}
              </Label>
              <Textarea
                id="flag-description"
                value={form.description}
                onChange={event => updateField("description", event.target.value)}
                rows={2}
                placeholder={t("Optional — describe what this flag controls")}
              />
            </section>
          </div>
        </div>

        {/* Sticky footer — deployment strip + actions */}
        <div className="border-t border-neutral-150 bg-neutral-50/40 dark:border-neutral-850 dark:bg-neutral-900/40">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <Switch checked={form.enabled} onCheckedChange={checked => updateField("enabled", checked)} />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">{t("Enabled")}</span>
              </label>
              <div className="hidden h-5 w-px bg-neutral-200 dark:bg-neutral-800 sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{t("Runtime")}</span>
                <div className="flex items-center rounded-md border border-neutral-150 bg-white p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
                  {runtimeOptions.map(option => {
                    const selected = form.runtime === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateField("runtime", option)}
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                          selected
                            ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                            : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                        )}
                      >
                        {getRuntimeLabel(option)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-neutral-150 px-6 py-3 dark:border-neutral-850">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || !form.key.trim()} variant="success">
              {isSaving ? t("Saving...") : isEditing ? t("Save changes") : t("Create flag")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
