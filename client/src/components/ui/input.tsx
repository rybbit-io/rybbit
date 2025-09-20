import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-md border border-neutral-200 bg-transparent shadow-sm transition-colors file:border-0 file:bg-transparent file:font-medium file:text-neutral-950 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:file:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300",
  {
    variants: {
      inputSize: {
        default: "h-9 px-3 py-1 text-base md:text-sm file:text-sm",
        sm: "h-7 px-2 py-0.5 text-xs file:text-xs",
      },
    },
    defaultVariants: {
      inputSize: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, inputSize, ...props }, ref) => {
  return <input type={type} className={cn(inputVariants({ inputSize, className }))} ref={ref} {...props} />;
});
Input.displayName = "Input";

export { Input };
