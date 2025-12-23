import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-300",
  {
    variants: {
      variant: {
        default: "border-neutral-100 bg-neutral-100 text-neutral-900 hover:bg-neutral-150 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700",
        secondary: "border-neutral-100 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800",
        destructive: "border-transparent bg-red-500/20 text-red-600 hover:bg-red-500/30 dark:text-red-400",
        warning: "border-transparent bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 dark:text-yellow-400",
        success: "border-transparent bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:text-emerald-400",
        info: "border-transparent bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 dark:text-blue-400",
        outline: "border-neutral-100 bg-transparent text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800",
        ghost: "border-transparent bg-transparent text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
