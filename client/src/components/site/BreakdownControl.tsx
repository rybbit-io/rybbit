"use client";

import { Layers } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ControlButton } from "./ControlButton";

export interface BreakdownOption<T extends string> {
  value: T;
  label: string;
  /** A 16px icon shown beside the label in the menu. */
  icon?: ReactNode;
}

export interface BreakdownControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  /** Every choice, including the one that means no breakdown if the page has one. */
  options: BreakdownOption<T>[];
  /** Replaces "Breakdown" on the trigger. */
  label?: string;
  className?: string;
}

/**
 * The analysis bar's second control: which dimension the page's numbers are
 * split by. The page owns the choice and what it means.
 */
export function BreakdownControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: BreakdownControlProps<T>) {
  const t = useExtracted();
  const selected = options.find(option => option.value === value);

  // Radix hands back a plain string; looking the option up returns it as T.
  const select = (next: string) => {
    const option = options.find(candidate => candidate.value === next);
    if (option) onChange(option.value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ControlButton
          icon={<Layers />}
          label={label ?? t("Breakdown")}
          value={selected?.label ?? value}
          className={className}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={select}>
          {options.map(option => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="gap-2">
              {/* Sized here, not on the item: a descendant selector there would also resize the radio dot. */}
              {option.icon && <span className="flex shrink-0 items-center [&>svg]:size-4">{option.icon}</span>}
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
