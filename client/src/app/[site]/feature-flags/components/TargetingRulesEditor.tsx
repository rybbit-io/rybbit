"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { Fragment } from "react";
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
      <div className="flex h-6 items-center justify-between gap-2">
        <Label>{t("Targeting rules")}</Label>
        <Button type="button" size="xs" variant="ghost" onClick={() => onChange([...rules, createEmptyRule()])}>
          <Plus className="h-3.5 w-3.5" />
          {t("Add rule")}
        </Button>
      </div>

      {rules.length === 0 ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t("Applies to everyone. Add a rule to narrow targeting.")}
        </p>
      ) : (
        <div className="grid gap-1.5">
          {rules.map((rule, index) => {
            const selectedField = ruleFieldOptions.find(option => option.value === rule.field);
            const requiresKey = !!selectedField?.requiresKey;

            return (
              <Fragment key={rule.id}>
                {index > 0 && <span className="text-xs text-neutral-500 dark:text-neutral-400">{t("and")}</span>}
                <div
                  className={cn(
                    "grid grid-cols-1 items-center gap-1.5",
                    requiresKey
                      ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]"
                      : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]"
                  )}
                >
                  <Select
                    value={rule.field}
                    onValueChange={value => updateRule(rule.id, { field: value as RuleField })}
                  >
                    <SelectTrigger size="sm" aria-label={t("Field")}>
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

                  {requiresKey && (
                    <Input
                      aria-label={t("Key")}
                      value={rule.key}
                      placeholder={t("key")}
                      onChange={event => updateRule(rule.id, { key: event.target.value })}
                      inputSize="sm"
                      className="font-mono"
                    />
                  )}

                  <Select
                    value={rule.operator}
                    onValueChange={value => updateRule(rule.id, { operator: value as RuleOperator })}
                  >
                    <SelectTrigger size="sm" aria-label={t("Operator")}>
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
                    placeholder={t("value")}
                    onChange={event => updateRule(rule.id, { value: event.target.value })}
                    inputSize="sm"
                    className="font-mono"
                  />

                  <Button
                    type="button"
                    size="iconSm"
                    variant="ghost"
                    aria-label={t("Remove")}
                    onClick={() => removeRule(rule.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
