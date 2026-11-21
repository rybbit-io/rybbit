"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Braces, Plus, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { createEmptyVariant } from "../lib/form";
import type { VariantFormState } from "../lib/types";
import { JsonEditor } from "./JsonEditor";
import { PercentInput, SplitBar } from "./formParts";

export function VariantsEditor({
  variants,
  onChange,
}: {
  variants: VariantFormState[];
  onChange: (variants: VariantFormState[]) => void;
}) {
  const t = useExtracted();
  const totalRollout = variants.reduce((sum, variant) => sum + variant.rolloutPercentage, 0);
  // Payload editors stay folded unless the variant already has one.
  const [openPayloads, setOpenPayloads] = useState(
    () => new Set(variants.filter(variant => variant.payload.trim()).map(variant => variant.id))
  );

  const togglePayload = (id: string) => {
    setOpenPayloads(current => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

  const updateVariant = (id: string, patch: Partial<VariantFormState>) => {
    onChange(variants.map(variant => (variant.id === id ? { ...variant, ...patch } : variant)));
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter(variant => variant.id !== id));
  };

  return (
    <div className="grid gap-2">
      <div className="flex h-6 items-center justify-between gap-2">
        <Label>{t("Variants")}</Label>
        <span
          className={cn(
            "text-xs tabular-nums",
            totalRollout === 100 ? "text-neutral-500 dark:text-neutral-400" : "text-amber-600 dark:text-amber-400"
          )}
        >
          {t("{rolloutTotal}% assigned", { rolloutTotal: String(totalRollout) })}
        </span>
      </div>

      {variants.length > 0 && (
        <SplitBar
          segments={variants.map((variant, index) => ({
            key: variant.id,
            label: variant.key || `variant_${index + 1}`,
            percent: variant.rolloutPercentage,
          }))}
        />
      )}

      <div className="grid gap-2">
        {variants.map(variant => (
          <div key={variant.id} className="grid gap-1.5">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.5rem_auto_auto] items-center gap-1.5">
              <Input
                aria-label={t("Variant key")}
                value={variant.key}
                placeholder={t("variant_key")}
                onChange={event => updateVariant(variant.id, { key: event.target.value })}
                inputSize="sm"
                className="font-mono"
              />
              <Input
                aria-label={t("Variant name")}
                value={variant.name}
                placeholder={t("Display name")}
                onChange={event => updateVariant(variant.id, { name: event.target.value })}
                inputSize="sm"
              />
              <PercentInput
                ariaLabel={t("Rollout")}
                value={variant.rolloutPercentage}
                onChange={rolloutPercentage => updateVariant(variant.id, { rolloutPercentage })}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="iconSm"
                variant="ghost"
                aria-label={t("Payload")}
                title={t("Payload")}
                aria-expanded={openPayloads.has(variant.id)}
                onClick={() => togglePayload(variant.id)}
                className={cn(
                  !openPayloads.has(variant.id) && !variant.payload.trim() && "text-neutral-500 dark:text-neutral-400"
                )}
              >
                <Braces className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="iconSm"
                variant="ghost"
                aria-label={t("Remove")}
                onClick={() => removeVariant(variant.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {openPayloads.has(variant.id) && (
              <JsonEditor
                ariaLabel={t("Payload")}
                value={variant.payload}
                onChange={payload => updateVariant(variant.id, { payload })}
                placeholder='{"copy":"Try it now"}'
                height={110}
              />
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={() => onChange([...variants, createEmptyVariant(variants.length)])}
      >
        <Plus className="h-4 w-4" />
        {t("Add variant")}
      </Button>
    </div>
  );
}
