"use client";

import { useCreateFeatureFlag, useUpdateFeatureFlag } from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import type { FeatureFlag, FeatureFlagType } from "@/api/analytics/endpoints";
import { CodeSnippet } from "@/components/CodeSnippet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Braces, Check, SlidersHorizontal, ToggleRight } from "lucide-react";
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

function getVariantKeysFromForm(form: FlagFormState): string[] {
  const keys = form.conditionSets.flatMap(conditionSet =>
    conditionSet.variants.map(variant => variant.key.trim()).filter(Boolean)
  );
  return [...new Set(keys)];
}

function buildFlagSnippets(form: FlagFormState): { jsCode: string; tsCode: string } {
  const key = JSON.stringify(form.key.trim() || "my-flag");

  if (form.flagType === "boolean") {
    return {
      jsCode: `window.rybbit.onReady((rybbit) => {
  const enabled = rybbit.flag(${key}, false);

  if (enabled) {
    // Feature is on for this visitor.
  }
});`,
      tsCode: `window.rybbit.onReady((rybbit) => {
  const enabled: boolean = rybbit.flag(${key}, false);

  if (enabled) {
    // Feature is on for this visitor.
  }
});`,
    };
  }

  if (form.flagType === "multivariate") {
    const variants = getVariantKeysFromForm(form);
    const fallbackVariant = variants[0] || "control";
    const alternateVariant = variants.find(variant => variant !== fallbackVariant) || "variant_1";
    const variantUnion = variants.length ? variants.map(variant => JSON.stringify(variant)).join(" | ") : '"control"';

    return {
      jsCode: `window.rybbit.onReady((rybbit) => {
  const variant = rybbit.flag(${key}, ${JSON.stringify(fallbackVariant)});

  if (variant === ${JSON.stringify(alternateVariant)}) {
    // Render this variant.
  } else {
    // Render the default experience.
  }
});`,
      tsCode: `type FlagVariant = ${variantUnion};

window.rybbit.onReady((rybbit) => {
  const variant = rybbit.flag(${key}, ${JSON.stringify(fallbackVariant)}) as FlagVariant;

  switch (variant) {
    case ${JSON.stringify(alternateVariant)}:
      // Render this variant.
      break;
    default:
      // Render the default experience.
      break;
  }
});`,
    };
  }

  return {
    jsCode: `window.rybbit.onReady((rybbit) => {
  const matched = rybbit.flag(${key}, false);
  const config = rybbit.flagPayload(${key}, {});

  if (matched) {
    // Use config to drive your UI.
  }
});`,
    tsCode: `interface FlagConfig {
  // Shape your payload here.
  [key: string]: unknown;
}

window.rybbit.onReady((rybbit) => {
  const config = rybbit.flagPayload<FlagConfig>(${key}, {});

  // Use config to drive your UI.
});`,
  };
}

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
  const [view, setView] = useState<"form" | "implementation">("form");
  const [savedMode, setSavedMode] = useState<"created" | "updated">("created");
  const createMutation = useCreateFeatureFlag();
  const updateMutation = useUpdateFeatureFlag();
  const isEditing = !!flag;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(flag));
      setView("form");
    }
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
        setSavedMode("updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("Feature flag created"));
        setSavedMode("created");
      }

      setView("implementation");
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

  const { jsCode, tsCode } = buildFlagSnippets(form);
  const runtimeNote =
    form.runtime === "server"
      ? t("This flag is evaluated server-side. Call the evaluate API from your backend instead of the browser script.")
      : form.runtime === "both"
        ? t("This flag also evaluates server-side. Your backend can read it from the evaluate API.")
        : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">
          {isEditing ? t("Edit feature flag {key}", { key: form.key }) : t("Create feature flag")}
        </DialogTitle>
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
          {view === "implementation" ? (
            <div className="grid gap-5">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                      {savedMode === "created" ? t("Feature flag created") : t("Feature flag changes saved")}
                    </h3>
                    <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                      {t("Read this flag in your app to control behavior for your visitors.")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {t("Usage")}
                </Label>
                <CodeTabs jsCode={jsCode} tsCode={tsCode} />
              </div>

              {runtimeNote && (
                <p className="rounded-md border border-neutral-150 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
                  {runtimeNote}
                </p>
              )}
            </div>
          ) : (
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
          )}
        </div>

        {/* Sticky footer — deployment strip + actions */}
        {view === "implementation" ? (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-150 px-6 py-3 dark:border-neutral-850">
            <Button onClick={() => setOpen(false)} variant="success">
              {t("Done")}
            </Button>
          </div>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
