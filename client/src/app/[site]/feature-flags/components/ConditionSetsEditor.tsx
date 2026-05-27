"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { FeatureFlagType } from "@/api/analytics/endpoints";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
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
