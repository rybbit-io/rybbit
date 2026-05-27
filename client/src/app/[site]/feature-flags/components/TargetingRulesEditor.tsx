"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { ruleFieldOptions, ruleOperatorOptions } from "../lib/constants";
import { createEmptyRule } from "../lib/form";
import { useRuleFieldLabel, useRuleOperatorLabel } from "../lib/labels";
import type { RuleField, RuleFormState, RuleOperator } from "../lib/types";

export function TargetingRulesEditor({
  rules,
  onChange,
}: {
  rules: RuleFormState[];
  onChange: (rules: RuleFormState[]) => void;
}) {
  const t = useExtracted();
  const getRuleFieldLabel = useRuleFieldLabel();
  const getRuleOperatorLabel = useRuleOperatorLabel();

  const updateRule = (id: string, patch: Partial<RuleFormState>) => {
    onChange(
      rules.map(rule => {
        if (rule.id !== id) return rule;
        const next = { ...rule, ...patch };
        if (patch.field && patch.field !== "query" && patch.field !== "trait") {
          next.key = "";
        }
        return next;
      })
    );
  };

  const removeRule = (id: string) => {
    onChange(rules.filter(rule => rule.id !== id));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{t("Targeting rules")}</Label>
        <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...rules, createEmptyRule()])}>
          <Plus className="h-4 w-4" />
          {t("Add rule")}
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-200 px-3 py-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {t("No targeting rules")}
        </div>
      ) : (
        <div className="grid gap-2">
          {rules.map(rule => {
            const selectedField = ruleFieldOptions.find(option => option.value === rule.field);
            const requiresKey = selectedField?.requiresKey;

            return (
              <div
                key={rule.id}
                className="grid grid-cols-1 gap-2 rounded-md border border-neutral-150 p-3 dark:border-neutral-800 lg:grid-cols-[minmax(140px,1fr)_minmax(120px,0.8fr)_minmax(140px,1fr)_minmax(160px,1fr)_2rem]"
              >
                <Select value={rule.field} onValueChange={value => updateRule(rule.id, { field: value as RuleField })}>
                  <SelectTrigger aria-label={t("Field")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleFieldOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {getRuleFieldLabel(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  aria-label={t("Key")}
                  value={rule.key}
                  disabled={!requiresKey}
                  placeholder={requiresKey ? t("Key") : "-"}
                  onChange={event => updateRule(rule.id, { key: event.target.value })}
                />

                <Select
                  value={rule.operator}
                  onValueChange={value => updateRule(rule.id, { operator: value as RuleOperator })}
                >
                  <SelectTrigger aria-label={t("Operator")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleOperatorOptions.map(operator => (
                      <SelectItem key={operator} value={operator}>
                        {getRuleOperatorLabel(operator)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  aria-label={t("Value")}
                  value={rule.value}
                  placeholder={t("Value")}
                  onChange={event => updateRule(rule.id, { value: event.target.value })}
                />

                <Button
                  type="button"
                  size="smIcon"
                  variant="ghost"
                  aria-label={t("Remove")}
                  onClick={() => removeRule(rule.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
