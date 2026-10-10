// Adapted from interior.dev "Tabs" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { LayoutGroup, motion } from "framer-motion";
import * as React from "react";

import { SPRING_CELL } from "@/lib/motion";

// One sliding indicator per Tabs instance, shared by ui/tabs (pill thumb) and
// ui/basic-tabs (underline). Radix keeps the tab semantics, roving focus and
// keyboard handling. The root mirrors the active value into context so each
// trigger knows whether it is active; the active trigger renders the indicator
// and framer's shared layout (layoutId) slides it over from the trigger that
// had it. Upstream measured the active tab by hand; layoutId does that for us.

type TabsIndicatorContextValue = {
  // useId(): unique per Tabs instance, so two instances (the card and its
  // expanded dialog, say) never trade indicators.
  id: string;
  value: string;
};

const TabsIndicatorContext = React.createContext<TabsIndicatorContextValue | null>(null);

// Drop-in for TabsPrimitive.Root. Radix is always driven as controlled so the
// indicator and Radix's data-state change in the same render (in uncontrolled
// mode Radix reports changes from an effect, one render late). "" is Radix's
// own value for "nothing selected" (its default is `defaultValue ?? ""`).
export const TabsIndicatorRoot = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, children, ...props }, ref) => {
  const id = React.useId();
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  const context = React.useMemo(() => ({ id, value: activeValue }), [id, activeValue]);

  return (
    <TabsPrimitive.Root ref={ref} value={activeValue} onValueChange={handleValueChange} {...props}>
      <TabsIndicatorContext.Provider value={context}>{children}</TabsIndicatorContext.Provider>
    </TabsPrimitive.Root>
  );
});
TabsIndicatorRoot.displayName = TabsPrimitive.Root.displayName;

// Wraps a TabsList's children. The LayoutGroup namespaces the layoutId by
// instance and keeps these nodes out of any ancestor group's layout updates.
export function TabsIndicatorGroup({ children }: { children?: React.ReactNode }) {
  const context = React.useContext(TabsIndicatorContext);
  if (!context) return <>{children}</>;
  return (
    <LayoutGroup id={context.id} inherit="id">
      {children}
    </LayoutGroup>
  );
}

// null when the trigger sits under a plain Radix root with no indicator
// context; the trigger then falls back to a static data-state style.
export function useTabsIndicator(value: string): { isActive: boolean } | null {
  const context = React.useContext(TabsIndicatorContext);
  if (!context) return null;
  return { isActive: context.value === value };
}

// Render inside the active trigger only. `kind` keeps the pill thumb and the
// underline from ever morphing into each other.
export function TabsIndicator({ kind, className }: { kind: "thumb" | "underline"; className?: string }) {
  const context = React.useContext(TabsIndicatorContext);
  if (!context) return null;
  return (
    <motion.span
      aria-hidden
      data-tabs-indicator={kind}
      layoutId={`${context.id}-${kind}`}
      // Measure only when the selection changes: a label whose width changes
      // with fresh data (a count, say) should not set the indicator moving.
      layoutDependency={context.value}
      transition={SPRING_CELL}
      className={className}
    />
  );
}

// For a custom trigger that lives inside a basic-tabs list but isn't a
// TabsTrigger (e.g. a dropdown that picks one of several tab values). Render it
// inside that trigger (position: relative) while its value is active: the
// shared underline slides over to it, or, under a plain Radix root, a static
// underline is drawn in the same spot.
export function TabsUnderline() {
  const context = React.useContext(TabsIndicatorContext);
  const className = "pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 bg-neutral-950 dark:bg-neutral-100";
  return context ? (
    <TabsIndicator kind="underline" className={className} />
  ) : (
    <span aria-hidden className={className} />
  );
}
