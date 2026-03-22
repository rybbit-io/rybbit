import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-lg border border-neutral-150 bg-transparent transition-colors file:border-0 file:bg-transparent file:font-medium file:text-neutral-950 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-red-500 dark:aria-[invalid=true]:border-red-400 dark:border-neutral-800 dark:file:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300",
  {
    variants: {
      inputSize: {
        default: "h-9 px-3 py-1 text-sm file:text-sm",
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
  VariantProps<typeof inputVariants> {
  isSearch?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize, isSearch, ...props }, ref) => {
    if (isSearch) {
      return (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input type={type} className={cn(inputVariants({ inputSize }), "pl-9", className)} ref={ref} {...props} />
        </div>
      );
    }

    return <input type={type} className={cn(inputVariants({ inputSize, className }))} ref={ref} {...props} />;
  }
);
Input.displayName = "Input";

export { Input };
