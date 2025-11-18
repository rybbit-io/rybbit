"use client";

import { cn } from "@/lib/utils";
import { Zoomies } from "ldrs/react";
import "ldrs/react/Zoomies.css";
import { useTheme } from "next-themes";
import * as React from "react";

// Default values shown
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-lg border border-neutral-100 bg-white text-neutral-950 dark:border-neutral-850 dark:bg-neutral-900 dark:text-neutral-50 overflow-hidden transition-all duration-300 ",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardLoader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { theme } = useTheme();
    const loaderColor = theme === "dark" ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-200))";

    return (
      <div className="mt-[-15px] absolute top-0 left-0 w-full">
        <Zoomies size={1400} stroke="3" bg-opacity="0.1" speed="1.4" color={loaderColor} />
      </div>
    );
  }
);
CardLoader.displayName = "CardLoader";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-4", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-neutral-500 dark:text-neutral-400", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("relative p-4 pt-0 transition-all duration-300 ", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center p-4 pt-0", className)} {...props} />
);
CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardLoader, CardTitle };
