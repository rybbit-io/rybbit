import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg px-4 py-3 text-sm text-neutral-950 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7 dark:text-neutral-50",
  {
    variants: {
      variant: {
        default: "bg-neutral-100 [&>svg]:text-neutral-700 dark:bg-neutral-800 dark:[&>svg]:text-neutral-300",
        destructive: "bg-red-500/12 [&>svg]:text-red-600 dark:bg-red-500/15 dark:[&>svg]:text-red-400",
        success: "bg-emerald-500/12 [&>svg]:text-emerald-600 dark:bg-emerald-500/15 dark:[&>svg]:text-emerald-400",
        warning: "bg-yellow-500/15 [&>svg]:text-yellow-600 dark:bg-yellow-500/15 dark:[&>svg]:text-yellow-400",
        info: "bg-blue-500/12 [&>svg]:text-blue-600 dark:bg-blue-500/15 dark:[&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
