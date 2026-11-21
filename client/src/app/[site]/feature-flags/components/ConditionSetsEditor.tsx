"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { FeatureFlagType } from "@/api/analytics/endpoints";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { createEmptyConditionSet } from "../lib/form";
import type { ConditionSetFormState } from "../lib/types";
import { PayloadField } from "./PayloadField";
import { TargetingRulesEditor } from "./TargetingRulesEditor";
import { VariantsEditor } from "./VariantsEditor";

export function ConditionSetsEditor({
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
  const helper =
    flagType === "remote_config"
      ? t("Each condition returns its own payload. The first match wins.")
      : t("Each condition is evaluated in order. The first match wins.");
  const single = conditionSets.length <= 1;

  const updateConditionSet = (id: string, patch: Partial<ConditionSetFormState>) => {
    onChange(
      conditionSets.map(conditionSet => (conditionSet.id === id ? { ...conditionSet, ...patch } : conditionSet))
    );
  };

  const removeConditionSet = (id: string) => {
    if (single) return;
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
    <section className="grid gap-3">
      <div className="grid gap-1.5">
        <Label>{conditionSetLabel}</Label>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{helper}</p>
      </div>

      <ol className="grid gap-2">
        {conditionSets.map((conditionSet, index) => (
          <li key={conditionSet.id} className="rounded-lg border border-neutral-150 dark:border-neutral-850">
            <div className="flex items-center gap-1 border-b border-neutral-150 py-1.5 pl-3 pr-1.5 dark:border-neutral-850">
              {/* The number is the evaluation order: the first matching condition wins. */}
              <span className="w-4 shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {index + 1}
              </span>
              <Input
                value={conditionSet.name}
                aria-label={t("Condition name")}
                placeholder={index === 0 ? t("Default") : t("Condition name")}
                onChange={event => updateConditionSet(conditionSet.id, { name: event.target.value })}
                className="h-7 border-transparent px-1.5 text-sm font-medium hover:border-neutral-150 dark:border-transparent dark:hover:border-neutral-800"
              />
              {!single && (
                <>
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
                    onClick={() => removeConditionSet(conditionSet.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="grid gap-4 p-3">
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
                <>
                  {flagType === "boolean" && (
                    <RolloutControl conditionSet={conditionSet} onChange={updateConditionSet} />
                  )}
                  <PayloadField
                    required={flagType === "remote_config"}
                    value={conditionSet.payload}
                    onChange={payload => updateConditionSet(conditionSet.id, { payload })}
                  />
                </>
              )}
            </div>
          </li>
        ))}
      </ol>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={() => onChange([...conditionSets, createEmptyConditionSet(flagType, conditionSets.length)])}
      >
        <Plus className="h-4 w-4" />
        {t("Add condition")}
      </Button>
    </section>
  );
}

function RolloutControl({
  conditionSet,
  onChange,
}: {
  conditionSet: ConditionSetFormState;
  onChange: (id: string, patch: Partial<ConditionSetFormState>) => void;
}) {
  const t = useExtracted();
  const pct = conditionSet.rolloutPercentage;

  return (
    <div className="grid gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label>{t("Rollout")}</Label>
        <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
          {t("{pct}% of matched users", { pct: String(pct) })}
        </span>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        aria-label={t("Rollout")}
        value={[pct]}
        onValueChange={value => onChange(conditionSet.id, { rolloutPercentage: value[0] ?? 0 })}
      />
    </div>
  );
}
