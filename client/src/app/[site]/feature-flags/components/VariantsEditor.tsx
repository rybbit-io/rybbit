"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { GitBranch, Plus, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { createEmptyVariant } from "../lib/form";
import type { VariantFormState } from "../lib/types";
import { JsonEditor } from "./JsonEditor";

const VARIANT_PALETTE = [
  "bg-accent-500 dark:bg-accent-600",
  "bg-sky-500 dark:bg-sky-600",
  "bg-amber-500 dark:bg-amber-500",
  "bg-violet-500 dark:bg-violet-500",
  "bg-rose-500 dark:bg-rose-500",
  "bg-teal-500 dark:bg-teal-500",
];

const VARIANT_DOT_PALETTE = [
  "bg-accent-500 dark:bg-accent-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-teal-500",
];

export function VariantsEditor({
  variants,
  onChange,
}: {
  variants: VariantFormState[];
  onChange: (variants: VariantFormState[]) => void;
}) {
  const t = useExtracted();
  const totalRollout = variants.reduce((sum, variant) => sum + variant.rolloutPercentage, 0);
  const over = totalRollout > 100;
  const under = totalRollout < 100;

  const updateVariant = (id: string, patch: Partial<VariantFormState>) => {
    onChange(variants.map(variant => (variant.id === id ? { ...variant, ...patch } : variant)));
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter(variant => variant.id !== id));
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
          <Label className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t("Variants")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              over
                ? "text-red-500 dark:text-red-400"
                : under
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {totalRollout}%
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onChange([...variants, createEmptyVariant(variants.length)])}
          >
            <Plus className="h-4 w-4" />
            {t("Add variant")}
          </Button>
        </div>
      </div>

      {/* Stacked rollout bar */}
      {variants.length > 0 && (
        <div className="grid gap-1.5">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-850">
            {variants.map((variant, index) => {
              const width = Math.min(100, Math.max(0, variant.rolloutPercentage));
              if (width === 0) return null;
              return (
                <div
                  key={variant.id}
                  className={cn("h-full transition-[width]", VARIANT_PALETTE[index % VARIANT_PALETTE.length])}
                  style={{ width: `${(width / Math.max(totalRollout, 100)) * 100}%` }}
                  title={`${variant.key || variant.name || `Variant ${index + 1}`} • ${width}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {variants.map((variant, index) => (
              <span key={variant.id} className="inline-flex items-center gap-1.5">
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", VARIANT_DOT_PALETTE[index % VARIANT_DOT_PALETTE.length])}
                />
                <span className="font-mono text-neutral-700 dark:text-neutral-200">
                  {variant.key || `variant_${index + 1}`}
                </span>
                <span className="tabular-nums">{variant.rolloutPercentage}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {variants.map((variant, index) => (
          <div
            key={variant.id}
            className="grid gap-3 rounded-md border border-neutral-150 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[auto_minmax(120px,1fr)_minmax(120px,1fr)_2rem]">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  VARIANT_DOT_PALETTE[index % VARIANT_DOT_PALETTE.length]
                )}
                aria-hidden
              />
              <Input
                aria-label={t("Variant key")}
                value={variant.key}
                placeholder={t("variant_key")}
                onChange={event => updateVariant(variant.id, { key: event.target.value })}
                className="h-8 font-mono text-xs"
              />
              <Input
                aria-label={t("Variant name")}
                value={variant.name}
                placeholder={t("Display name")}
                onChange={event => updateVariant(variant.id, { name: event.target.value })}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="smIcon"
                variant="ghost"
                aria-label={t("Remove")}
                onClick={() => removeVariant(variant.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {t("Rollout")}
                </Label>
                <span className="font-mono text-xs tabular-nums text-neutral-700 dark:text-neutral-200">
                  {variant.rolloutPercentage}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[variant.rolloutPercentage]}
                onValueChange={value => updateVariant(variant.id, { rolloutPercentage: value[0] ?? 0 })}
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {t("Payload")}
              </Label>
              <JsonEditor
                ariaLabel={t("Payload")}
                value={variant.payload}
                onChange={payload => updateVariant(variant.id, { payload })}
                placeholder='{"copy":"Try it now"}'
                height={110}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
