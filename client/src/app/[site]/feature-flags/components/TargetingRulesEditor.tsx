"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Plus, X } from "lucide-react";
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
          <Label className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t("Targeting rules")}
          </Label>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...rules, createEmptyRule()])}>
          <Plus className="h-4 w-4" />
          {t("Add rule")}
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-200 px-3 py-4 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <span className="font-mono text-neutral-400 dark:text-neutral-500">{"//"}</span>{" "}
          {t("Applies to everyone — add a rule to narrow targeting")}
        </div>
      ) : (
        <div className="grid gap-1.5">
          {rules.map((rule, index) => {
            const selectedField = ruleFieldOptions.find(option => option.value === rule.field);
            const requiresKey = !!selectedField?.requiresKey;

            return (
              <Fragment key={rule.id}>
                {index > 0 && (
                  <div className="flex items-center gap-2 pl-1">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                      {t("and")}
                    </span>
                    <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                )}
                <div
                  className="grid grid-cols-1 items-center gap-1.5 lg:grid"
                  style={{
                    gridTemplateColumns: requiresKey
                      ? "minmax(140px,1fr) minmax(120px,0.9fr) minmax(140px,1fr) minmax(160px,1.2fr) auto"
                      : "minmax(140px,1fr) minmax(140px,1fr) minmax(160px,1.2fr) auto",
                  }}
                >
                  <Select
                    value={rule.field}
                    onValueChange={value => updateRule(rule.id, { field: value as RuleField })}
                  >
                    <SelectTrigger aria-label={t("Field")} className="h-8 text-xs">
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
                      className="h-8 font-mono text-xs"
                    />
                  )}

                  <Select
                    value={rule.operator}
                    onValueChange={value => updateRule(rule.id, { operator: value as RuleOperator })}
                  >
                    <SelectTrigger
                      aria-label={t("Operator")}
                      className="h-8 bg-neutral-100/60 text-xs italic text-neutral-600 dark:bg-neutral-850/60 dark:text-neutral-300"
                    >
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
                    className="h-8 font-mono text-xs"
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
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
