"use client";

import { CodeSnippet } from "@/components/CodeSnippet";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";

// The pieces the flag dialog and the experiment wizard both use, so the two forms read as one.

/** A short list of exclusive options, each with a line explaining it. */
export function ChoiceGroup<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; title: string; description: string }>;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={next => onChange(next as T)}
      aria-label={ariaLabel}
      className={cn("grid-cols-1 gap-2", className)}
    >
      {options.map(option => (
        <label
          key={option.value}
          className={cn(
            "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
            value === option.value
              ? "border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
              : "border-neutral-150 hover:border-neutral-200 dark:border-neutral-850 dark:hover:border-neutral-800"
          )}
        >
          <RadioGroupItem value={option.value} className="mt-0.5" />
          <span className="grid min-w-0 gap-0.5">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{option.title}</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{option.description}</span>
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}

// Neutral steps, alternating light and dark so neighbours stay apart without borrowing chart colors:
// this bar shows how a flag is configured, not what was measured.
const SEGMENT_TONES = [
  "bg-neutral-700 dark:bg-neutral-200",
  "bg-neutral-400 dark:bg-neutral-500",
  "bg-neutral-550 dark:bg-neutral-350",
  "bg-neutral-300 dark:bg-neutral-650",
];

/** How 100% of matched visitors is divided. Whatever is unassigned stays as empty track. */
export function SplitBar({
  segments,
  className,
}: {
  segments: Array<{ key: string; label: string; percent: number }>;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.percent), 0);
  const scale = Math.max(total, 100);

  return (
    <div className={cn("flex h-1.5 gap-px overflow-hidden rounded-full bg-neutral-150 dark:bg-neutral-800", className)}>
      {segments.map((segment, index) =>
        segment.percent > 0 ? (
          <div
            key={segment.key}
            className={cn("h-full transition-[width] duration-200", SEGMENT_TONES[index % SEGMENT_TONES.length])}
            style={{ width: `${(segment.percent / scale) * 100}%` }}
            title={`${segment.label} · ${segment.percent}%`}
          />
        ) : null
      )}
    </div>
  );
}

export function PercentInput({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        aria-label={ariaLabel}
        value={value}
        onChange={event => onChange(Math.min(100, Math.max(0, Number(event.target.value || 0))))}
        className={cn(
          "pr-6 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className
        )}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-500 dark:text-neutral-400">
        %
      </span>
    </div>
  );
}

/** Confirms a save at the top of the "now add this code" view. */
export function SavedNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <h3 className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        {title}
      </h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{children}</p>
    </div>
  );
}

const LANGUAGES = [
  { value: "js", label: "JavaScript" },
  { value: "ts", label: "TypeScript" },
] as const;

export function CodeTabs({ jsCode, tsCode }: { jsCode: string; tsCode: string }) {
  const t = useExtracted();
  const [language, setLanguage] = useState<"js" | "ts">("js");

  return (
    <div className="grid gap-2">
      <SegmentedControl<"js" | "ts">
        aria-label={t("Language")}
        size="sm"
        className="justify-self-start"
        options={[...LANGUAGES]}
        value={language}
        onValueChange={setLanguage}
      />
      <CodeSnippet code={language === "js" ? jsCode : tsCode} language="javascript" />
    </div>
  );
}
