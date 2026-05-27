"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { createEmptyVariant } from "../lib/form";
import type { VariantFormState } from "../lib/types";

export function VariantsEditor({
  variants,
  onChange,
}: {
  variants: VariantFormState[];
  onChange: (variants: VariantFormState[]) => void;
}) {
  const t = useExtracted();
  const totalRollout = variants.reduce((sum, variant) => sum + variant.rolloutPercentage, 0);

  const updateVariant = (id: string, patch: Partial<VariantFormState>) => {
    onChange(variants.map(variant => (variant.id === id ? { ...variant, ...patch } : variant)));
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter(variant => variant.id !== id));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="grid gap-1">
          <Label>{t("Variants")}</Label>
          <span
            className={cn("text-xs", totalRollout > 100 ? "text-red-500" : "text-neutral-500 dark:text-neutral-400")}
          >
            {t("Total rollout")}: {totalRollout}%
          </span>
        </div>
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

      <div className="grid gap-2">
        {variants.map(variant => (
          <div key={variant.id} className="grid gap-3 rounded-md border border-neutral-150 p-3 dark:border-neutral-800">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_2rem]">
              <Input
                aria-label={t("Variant key")}
                value={variant.key}
                placeholder={t("Variant key")}
                onChange={event => updateVariant(variant.id, { key: event.target.value })}
              />
              <Input
                aria-label={t("Variant name")}
                value={variant.name}
                placeholder={t("Variant name")}
                onChange={event => updateVariant(variant.id, { name: event.target.value })}
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
                <Label>{t("Rollout")}</Label>
                <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">
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

            <div className="grid gap-2">
              <Label>{t("Payload")}</Label>
              <Textarea
                className="min-h-20 font-mono text-xs"
                value={variant.payload}
                placeholder='{"copy":"Try it now"}'
                onChange={event => updateVariant(variant.id, { payload: event.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
