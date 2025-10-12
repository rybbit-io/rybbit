import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300",
  {
    variants: {
      variant: {
        default: "border-neutral-800 bg-neutral-800 text-neutral-100 hover:bg-neutral-700",
        secondary: "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800",
        destructive: "border-transparent bg-red-500/20 text-red-400 hover:bg-red-500/30",
        warning: "border-transparent bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30",
        success: "border-transparent bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
        info: "border-transparent bg-blue-500/20 text-blue-400 hover:bg-blue-500/30",
        outline: "border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800",
        ghost: "border-transparent bg-transparent text-neutral-300 hover:bg-neutral-800",
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
