"use client";

import { useCreateFeatureFlag, useUpdateFeatureFlag } from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import type { FeatureFlag, FeatureFlagType } from "@/api/analytics/endpoints";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useExtracted } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { flagTypeOptions, runtimeOptions } from "../lib/constants";
import { buildPayload, createEmptyVariant, toFormState } from "../lib/form";
import { useFlagTypeLabel, useRuntimeLabel } from "../lib/labels";
import type { FlagFormState } from "../lib/types";
import { ConditionSetsEditor } from "./ConditionSetsEditor";
import { ChoiceGroup, CodeTabs, SavedNotice } from "./formParts";

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

  // Initialize when the dialog opens or switches to another flag, not on every new `flag` object: the
  // list refetches (on focus, with fresh stats) while the dialog is open, and resetting then would wipe
  // unsaved edits and flip the post-save snippet back to the form.
  const flagId = flag?.flagId;
  useEffect(() => {
    if (open) {
      setForm(toFormState(flag));
      setView("form");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagId, open]);

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
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-neutral-150 px-6 py-4 dark:border-neutral-850">
          <DialogTitle className="text-base">{isEditing ? t("Edit flag") : t("New flag")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {view === "implementation" ? (
            <div className="grid gap-5">
              <SavedNotice
                title={savedMode === "created" ? t("Feature flag created") : t("Feature flag changes saved")}
              >
                {t("Read this flag in your app to control behavior for your visitors.")}
              </SavedNotice>

              <div className="grid gap-2">
                <Label>{t("Usage")}</Label>
                <CodeTabs jsCode={jsCode} tsCode={tsCode} />
              </div>

              {runtimeNote && <p className="text-sm text-neutral-500 dark:text-neutral-400">{runtimeNote}</p>}
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <div className="grid gap-1.5">
                  <Label htmlFor="flag-key">{t("Key")}</Label>
                  <Input
                    id="flag-key"
                    value={form.key}
                    disabled={isEditing}
                    onChange={event => updateField("key", event.target.value.replace(/\s+/g, "-"))}
                    placeholder="new-checkout"
                    className="font-mono"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t("The identifier you'll reference in code")}
                  </p>
                </div>
                <div className="grid content-start gap-1.5">
                  <Label htmlFor="flag-runtime">{t("Runtime")}</Label>
                  <Select
                    value={form.runtime}
                    onValueChange={value => updateField("runtime", value as FlagFormState["runtime"])}
                  >
                    <SelectTrigger id="flag-runtime">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {runtimeOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {getRuntimeLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="flag-description">{t("Description")}</Label>
                <Textarea
                  id="flag-description"
                  value={form.description}
                  onChange={event => updateField("description", event.target.value)}
                  rows={2}
                  placeholder={t("Optional: describe what this flag controls")}
                />
              </div>

              <div className="grid gap-2">
                <Label>{t("Returns")}</Label>
                <ChoiceGroup
                  ariaLabel={t("Returns")}
                  className="sm:grid-cols-3"
                  value={form.flagType}
                  onChange={handleFlagTypeChange}
                  options={flagTypeOptions.map(option => ({
                    value: option,
                    title: getFlagTypeLabel(option),
                    description: typeDescriptions[option],
                  }))}
                />
              </div>

              <ConditionSetsEditor
                flagType={form.flagType}
                conditionSets={form.conditionSets}
                onChange={conditionSets => updateField("conditionSets", conditionSets)}
              />
            </div>
          )}
        </div>

        {view === "implementation" ? (
          <div className="flex items-center justify-end border-t border-neutral-150 px-6 py-3 dark:border-neutral-850">
            <Button onClick={() => setOpen(false)}>{t("Done")}</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-150 px-6 py-3 dark:border-neutral-850">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Switch checked={form.enabled} onCheckedChange={checked => updateField("enabled", checked)} />
              {t("Enabled")}
            </label>
            <div className="flex items-center gap-2">
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
