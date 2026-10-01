"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, ReactNode } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ControlButtonProps extends Omit<ButtonProps, "children" | "value" | "variant" | "size"> {
  /** A 16px icon, e.g. `<Layers />`. The button sizes it. */
  icon?: ReactNode;
  /** What the control changes: "Compare", "Breakdown", "Sort". */
  label: string;
  /** The current choice. */
  value: ReactNode;
}

/**
 * The compact "Label value ▾" trigger every analysis-bar control shares. It
 * forwards its ref and props, so it works as the child of a
 * `DropdownMenuTrigger asChild` or `PopoverTrigger asChild`.
 */
export const ControlButton = forwardRef<HTMLButtonElement, ControlButtonProps>(
  ({ icon, label, value, className, ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="sm"
      className={cn("max-w-full gap-1.5 font-normal", className)}
      {...props}
    >
      {icon}
      {/* The space is not laid out in a flex row; it separates the two words in the accessible name. */}
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>{" "}
      <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
      <ChevronDown className="opacity-60" />
    </Button>
  )
);
ControlButton.displayName = "ControlButton";
