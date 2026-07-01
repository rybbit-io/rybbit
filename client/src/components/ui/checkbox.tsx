"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "grid h-4 w-4 shrink-0 place-content-center rounded-sm border border-neutral-300 shadow transition-shadow outline-none focus-visible:border-accent-500 focus-visible:ring-[3px] focus-visible:ring-accent-500/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent-500 data-[state=checked]:bg-accent-500 data-[state=checked]:text-white dark:border-neutral-700 dark:bg-neutral-900/30 dark:data-[state=checked]:border-accent-500 dark:data-[state=checked]:bg-accent-500",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("grid place-content-center text-current")}>
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
