// Adapted from interior.dev "Copy Button" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Copy, X } from "lucide-react";
import { useExtracted } from "next-intl";
import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { INSTANT, SPRING_CELL, SPRING_CROSSFADE } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { type CopyStatus, useCopyToClipboard } from "./use-copy-to-clipboard";

const STATES: CopyStatus[] = ["idle", "copied", "error"];

const ICON_SHOWN = { opacity: 1, scale: 1 };
const ICON_HIDDEN = { opacity: 0, scale: 0.92 };
const LABEL_SHOWN = { opacity: 1, y: 0, filter: "blur(0px)" };
const LABEL_HIDDEN = { opacity: 0, y: 3, filter: "blur(3px)" };

type CopyStatusIconProps = {
  status: CopyStatus;
  // "color" paints the check emerald and the cross red, for neutral surfaces.
  // "current" keeps the text color, for filled (accent/success) buttons.
  tone?: "color" | "current";
  className?: string;
  // Extra classes for the resting copy icon only, e.g. to mute it next to text.
  idleClassName?: string;
};

// The copy icon, a check that draws itself in, and a cross, stacked in one cell and
// crossfaded by status. Sized like any icon: by a Button's [&_svg]:size-* or by
// passing one in className.
export function CopyStatusIcon({ status, tone = "color", className, idleClassName }: CopyStatusIconProps) {
  const reduced = useReducedMotion();
  const fade = reduced ? INSTANT : SPRING_CROSSFADE;
  const draw = reduced ? INSTANT : SPRING_CELL;

  return (
    <span aria-hidden="true" className={cn("inline-grid shrink-0 place-items-center", className)}>
      <motion.span
        initial={false}
        animate={status === "idle" ? ICON_SHOWN : ICON_HIDDEN}
        transition={fade}
        className={cn("col-start-1 row-start-1 flex", idleClassName)}
      >
        <Copy className="size-4" />
      </motion.span>
      <motion.span
        initial={false}
        animate={status === "copied" ? ICON_SHOWN : ICON_HIDDEN}
        transition={fade}
        className={cn("col-start-1 row-start-1 flex", tone === "color" && "text-accent-600 dark:text-accent-400")}
      >
        {/* Lucide's check, drawn from its short arm so it reads as a tick being made. */}
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <motion.path
            d="M4 12l5 5L20 6"
            initial={false}
            animate={{ pathLength: status === "copied" ? 1 : 0 }}
            transition={draw}
          />
        </svg>
      </motion.span>
      <motion.span
        initial={false}
        animate={status === "error" ? ICON_SHOWN : ICON_HIDDEN}
        transition={fade}
        className={cn("col-start-1 row-start-1 flex", tone === "color" && "text-red-500 dark:text-red-400")}
      >
        <X className="size-4" />
      </motion.span>
    </span>
  );
}

// Polite announcement of the outcome. Render it as a sibling of the button, not
// inside it: WebKit drops a button's descendants from the accessibility tree, so a
// live region inside one is never announced by VoiceOver.
export function CopyAnnouncement({ status, copiedLabel }: { status: CopyStatus; copiedLabel?: string }) {
  const t = useExtracted();

  return (
    <span role="status" aria-live="polite" className="sr-only">
      {status === "copied" ? (copiedLabel ?? t("Copied")) : status === "error" ? t("Couldn't copy to clipboard") : ""}
    </span>
  );
}

function CopyStatusLabel({ status, labels }: { status: CopyStatus; labels: Record<CopyStatus, string> }) {
  const reduced = useReducedMotion();
  const fade = reduced ? INSTANT : SPRING_CROSSFADE;

  return (
    // Every label shares one grid cell, so the button keeps the width of the longest.
    <span aria-hidden="true" className="grid justify-items-start">
      {STATES.map(state => (
        <motion.span
          key={state}
          initial={false}
          animate={state === status ? LABEL_SHOWN : LABEL_HIDDEN}
          transition={fade}
          className="col-start-1 row-start-1 whitespace-nowrap"
        >
          {labels[state]}
        </motion.span>
      ))}
    </span>
  );
}

type CopyButtonSize = "xs" | "sm" | "default" | "lg";

// Maps onto Button's sizes: labeled buttons use xs/sm/default/lg, icon-only ones
// the matching square (xs → 24px, sm → smIcon 28px, default → icon 36px, lg → 40px).
const SIZES: Record<
  CopyButtonSize,
  { labeled: ButtonProps["size"]; labeledClass: string; square: ButtonProps["size"]; squareClass: string }
> = {
  xs: { labeled: "xs", labeledClass: "gap-1.5 [&_svg]:size-3", square: "xs", squareClass: "w-6 px-0 [&_svg]:size-3" },
  sm: { labeled: "sm", labeledClass: "gap-1.5 [&_svg]:size-3.5", square: "smIcon", squareClass: "[&_svg]:size-3.5" },
  default: { labeled: "default", labeledClass: "", square: "icon", squareClass: "" },
  lg: { labeled: "lg", labeledClass: "", square: "lg", squareClass: "w-10 px-0" },
};

const FILLED_VARIANTS = new Set<ButtonProps["variant"]>(["accent", "success", "destructive", "warning"]);

// Icon-only ghost buttons usually sit on content (code blocks, table cells), so
// they rest muted and lift on hover.
const QUIET_ICON =
  "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-750 dark:hover:text-neutral-100";

export interface CopyButtonProps extends Omit<
  ButtonProps,
  "value" | "onCopy" | "onError" | "children" | "size" | "asChild" | "loading" | "loadingLabel"
> {
  // The text that ends up on the clipboard.
  value: string;
  // The action. Visible text, or the accessible name and tooltip when iconOnly. Defaults to "Copy".
  label?: string;
  copiedLabel?: string;
  errorLabel?: string;
  iconOnly?: boolean;
  size?: CopyButtonSize;
  // Show the action (then the outcome) in a tooltip. Use this rather than wrapping
  // the button in a TooltipTrigger: CopyButton renders two elements.
  tooltip?: boolean;
  // How long the outcome shows before the button returns to rest, in ms.
  timeout?: number;
  onCopy?: (value: string) => void;
  onError?: (reason: unknown) => void;
}

/**
 * Copies `value` and swaps Copy → ✓ Copied (or ✗ Failed) in place without changing
 * width, then returns to rest. Plays the success/error interface sound and
 * announces the outcome politely. Renders the button plus a sibling live region.
 */
export const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  {
    value,
    label,
    copiedLabel,
    errorLabel,
    iconOnly = false,
    size = "default",
    variant,
    tooltip = false,
    timeout,
    onCopy,
    onError,
    onClick,
    onPointerDown,
    className,
    ...props
  },
  ref
) {
  const t = useExtracted();
  const { copy, status } = useCopyToClipboard({ timeout, onCopy, onError });

  // Radix closes a tooltip when its trigger is pressed (pointerdown, the content's
  // outside-press check, click), which hid "Copied" after ~100 ms. So the tooltip
  // is controlled, and closes are skipped while the pointer is down on the button
  // and while its copy runs (the execCommand fallback briefly blurs the button).
  // Leaving the button, blurring away, Escape, scrolling and pressing elsewhere
  // still close it.
  const [tooltipOpen, setTooltipOpen] = React.useState(false);
  const pointerDown = React.useRef(false);
  const copiesInFlight = React.useRef(0);

  const labels: Record<CopyStatus, string> = {
    idle: label ?? t("Copy"),
    copied: copiedLabel ?? t("Copied"),
    error: errorLabel ?? t("Failed"),
  };
  const resolvedVariant = variant ?? (iconOnly ? "ghost" : "default");
  const sizing = SIZES[size];

  const button = (
    <Button
      ref={ref}
      type="button"
      variant={resolvedVariant}
      size={iconOnly ? sizing.square : sizing.labeled}
      aria-label={labels.idle}
      data-status={status}
      {...props}
      className={cn(
        "touch-manipulation",
        iconOnly ? sizing.squareClass : sizing.labeledClass,
        iconOnly && resolvedVariant === "ghost" && QUIET_ICON,
        className
      )}
      // Both run before Radix's trigger handlers, so the hold is in place when
      // Radix asks the tooltip to close.
      onPointerDown={event => {
        onPointerDown?.(event);
        if (!tooltip || event.button !== 0) return;
        pointerDown.current = true;
        const trigger = event.currentTarget;
        const release = (up: PointerEvent) => {
          document.removeEventListener("pointerup", release, true);
          document.removeEventListener("pointercancel", release, true);
          pointerDown.current = false;
          // Released away from the button: no click or copy follows, so apply the
          // close the press held back.
          if (up.type === "pointercancel" || !(up.target instanceof Node && trigger.contains(up.target))) {
            setTooltipOpen(false);
          }
        };
        document.addEventListener("pointerup", release, true);
        document.addEventListener("pointercancel", release, true);
      }}
      onClick={event => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        // Counted before copy() starts: the fallback blurs the button synchronously.
        copiesInFlight.current += 1;
        void copy(value).finally(() => {
          copiesInFlight.current -= 1;
        });
      }}
    >
      <CopyStatusIcon status={status} tone={FILLED_VARIANTS.has(resolvedVariant) ? "current" : "color"} />
      {!iconOnly && <CopyStatusLabel status={status} labels={labels} />}
    </Button>
  );

  return (
    <>
      {tooltip ? (
        <Tooltip
          open={tooltipOpen}
          onOpenChange={open => {
            if (open || (!pointerDown.current && copiesInFlight.current === 0)) setTooltipOpen(open);
          }}
        >
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>{status === "error" ? t("Couldn't copy to clipboard") : labels[status]}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      <CopyAnnouncement status={status} copiedLabel={labels.copied} />
    </>
  );
});
