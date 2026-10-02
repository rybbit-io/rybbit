"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import {
  TabsIndicator,
  TabsIndicatorGroup,
  TabsIndicatorRoot,
  useTabsIndicator,
} from "@/components/interior/tabs-indicator";
import { cn } from "@/lib/utils";

// Underline tabs. One underline per Tabs instance slides between triggers
// (see components/interior/tabs-indicator).
const Tabs = TabsIndicatorRoot;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("inline-flex h-8 items-center justify-start space-x-3", className)}
    {...props}
  >
    <TabsIndicatorGroup>{children}</TabsIndicatorGroup>
  </TabsPrimitive.List>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, asChild, ...props }, ref) => {
  const indicator = useTabsIndicator(value);
  // asChild hands rendering to a single child, so there is nowhere to put the
  // underline; that case (and a plain Radix root) keeps the static border.
  const sliding = indicator !== null && !asChild;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      asChild={asChild}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent py-1 text-sm font-medium text-neutral-600 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-neutral-950 data-[state=inactive]:hover:text-neutral-900 dark:text-neutral-400 dark:focus-visible:ring-neutral-300 dark:data-[state=active]:text-neutral-50 dark:data-[state=inactive]:hover:text-neutral-200",
        sliding ? "relative" : "data-[state=active]:border-neutral-950 dark:data-[state=active]:border-neutral-100",
        className
      )}
      {...props}
    >
      {children}
      {sliding && indicator.isActive && (
        // Sits exactly on the trigger's transparent 2px bottom border.
        <TabsIndicator
          kind="underline"
          className="pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 bg-neutral-950 dark:bg-neutral-100"
        />
      )}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
