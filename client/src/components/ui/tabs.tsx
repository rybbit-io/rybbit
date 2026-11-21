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

// Pill tabs. One flat thumb per Tabs instance slides between triggers (see
// components/interior/tabs-indicator); no resting shadow, per the Flat rule.
const Tabs = TabsIndicatorRoot;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-neutral-100 p-1 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
      className
    )}
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
  // thumb; that case (and a plain Radix root) keeps the static active fill.
  const sliding = indicator !== null && !asChild;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      asChild={asChild}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-neutral-950 data-[state=inactive]:hover:text-neutral-900 dark:focus-visible:ring-neutral-300 dark:data-[state=active]:text-neutral-50 dark:data-[state=inactive]:hover:text-neutral-200",
        // isolate + -z-10 paints the thumb under the label without wrapping
        // the consumer's children (which may rely on the trigger's flex).
        sliding ? "relative isolate" : "data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-950",
        className
      )}
      {...props}
    >
      {children}
      {sliding && indicator.isActive && (
        <TabsIndicator
          kind="thumb"
          className="pointer-events-none absolute inset-0 -z-10 rounded-md bg-white dark:bg-neutral-950"
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
