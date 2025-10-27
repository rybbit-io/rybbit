import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:focus-visible:ring-neutral-300",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-50 text-neutral-950 border border-neutral-200 shadow hover:bg-neutral-900/90 dark:bg-neutral-850 dark:border-neutral-750 dark:text-neutral-50 dark:hover:bg-neutral-800/90 dark:hover:border-neutral-650",
        secondary:
          "bg-neutral-900 border border-neutral-800 shadow-sm hover:bg-neutral-800/80 hover:border-neutral-700",
        accent:
          "bg-neutral-500 text-neutral-900 shadow-sm hover:bg-neutral-500/80 dark:bg-accent-600 dark:text-neutral-50 dark:hover:bg-accent-600/90",
        success:
          "bg-accent-500 text-neutral-50 border border-accent-600 shadow-sm hover:bg-accent-500/90 dark:bg-accent-800 dark:border-accent-600 dark:text-neutral-50 dark:hover:bg-accent-800/90 dark:hover:border-accent-500",
        destructive:
          "bg-red-500 text-neutral-50 border border-red-500 shadow-sm hover:bg-red-500/90 dark:bg-red-900 dark:border-red-700 dark:text-neutral-50 dark:hover:bg-red-900/90 dark:hover:border-red-500",
        warning:
          "bg-yellow-500 text-neutral-900 border border-yellow-500 shadow-sm hover:bg-yellow-500/90 dark:bg-yellow-700 dark:border-yellow-500 dark:text-neutral-50 dark:hover:bg-yellow-700/90 dark:hover:border-yellow-400",
        outline:
          "border border-neutral-200 shadow-sm hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:text-neutral-50",
        ghost:
          "hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 border border-transparent",
        link: "text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-50",
      },
      size: {
        default: "h-9 px-3 py-2 rounded-lg text-sm",
        sm: "h-8 rounded-lg px-2.5 text-xs",
        xs: "h-6 px-1.5 text-xs",
        lg: "h-10 rounded-lg px-8 text-sm",
        icon: "h-9 w-9 rounded-lg",
        smIcon: "h-7 w-7 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
