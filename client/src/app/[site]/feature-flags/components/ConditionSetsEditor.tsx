"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { FeatureFlagType } from "@/api/analytics/endpoints";
import { ArrowDown, ArrowUp, Layers, Plus, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { createEmptyConditionSet } from "../lib/form";
import type { ConditionSetFormState } from "../lib/types";
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
    <section className="grid gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="grid gap-1">
          <Label className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {conditionSetLabel}
          </Label>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{helper}</p>
        </div>
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

      <ol className="grid gap-2">
        {conditionSets.map((conditionSet, index) => {
          const isLast = index === conditionSets.length - 1;
          const isFirst = index === 0;
          return (
            <li key={conditionSet.id} className="relative flex gap-3">
              {/* Numbered rail */}
              <div className="flex w-7 flex-none flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 font-mono text-xs font-medium text-neutral-700 dark:bg-neutral-850 dark:text-neutral-300">
                  {index + 1}
                </div>
                {!isLast && <div className="mt-1 w-px flex-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden />}
              </div>

              {/* Body */}
              <div className="min-w-0 flex-1 rounded-lg bg-neutral-50/60 p-3 dark:bg-neutral-900/40">
                <div className="mb-3 flex items-center gap-1">
                  <Input
                    value={conditionSet.name}
                    aria-label={t("Condition name")}
                    placeholder={index === 0 ? t("Default") : t("Condition name")}
                    onChange={event => updateConditionSet(conditionSet.id, { name: event.target.value })}
                    className="h-8 border-transparent bg-transparent px-2 text-sm font-medium shadow-none hover:border-neutral-200 focus-visible:border-neutral-300 dark:bg-transparent dark:hover:border-neutral-800 dark:focus-visible:border-neutral-700"
                  />
                  <Button
                    type="button"
                    size="smIcon"
                    variant="ghost"
                    aria-label={t("Move up")}
                    disabled={isFirst}
                    onClick={() => moveConditionSet(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="smIcon"
                    variant="ghost"
                    aria-label={t("Move down")}
                    disabled={isLast}
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

                <div className="grid gap-4">
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
                      {flagType === "boolean" && <RolloutControl conditionSet={conditionSet} onChange={updateConditionSet} />}

                      <div className="grid gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
                          <Label className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            {flagType === "remote_config" ? t("Config payload") : t("Payload")}
                          </Label>
                        </div>
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
              </div>
            </li>
          );
        })}
      </ol>
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
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {t("Rollout")} <span className="font-mono normal-case tracking-normal text-neutral-400 dark:text-neutral-500">
            — {pct === 100 ? t("everyone matched") : pct === 0 ? t("no one") : t("{pct}% of matched users", { pct: String(pct) })}
          </span>
        </Label>
        <span className="font-mono text-xs tabular-nums text-neutral-700 dark:text-neutral-200">{pct}%</span>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[pct]}
        onValueChange={value => onChange(conditionSet.id, { rolloutPercentage: value[0] ?? 0 })}
      />
    </div>
  );
}
