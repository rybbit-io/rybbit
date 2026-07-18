"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Info,
  Lightbulb,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Shared UI primitives for the free tools.
 *
 * These encode Rybbit's "instrument panel" vocabulary once — tight `rounded-md`
 * geometry, hairline neutral borders, flat surfaces (depth via borders, not
 * shadows), `font-medium`/`font-semibold` weights, and a single emerald accent —
 * so every calculator and generator reads like the rest of the app instead of a
 * one-off form. Match these classes to `InteriorPageHero` / `ToolCTA`.
 */

/* -------------------------------------------------------------------------- */
/*  Field                                                                     */
/* -------------------------------------------------------------------------- */

interface ToolFieldProps {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label + control + optional hint, with a consistent required marker. */
export function ToolField({ label, htmlFor, required, hint, className, children }: ToolFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inputs                                                                    */
/* -------------------------------------------------------------------------- */

const controlBase =
  "w-full rounded-md border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 transition-colors " +
  "placeholder:text-neutral-400 focus-visible:border-emerald-500 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-500";

export const ToolInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function ToolInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlBase, "h-10", className)} {...props} />;
  }
);

export const ToolTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function ToolTextarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(controlBase, "min-h-[104px] py-2.5 leading-6", className)} {...props} />;
  }
);

export const ToolSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function ToolSelect({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(controlBase, "h-10 cursor-pointer appearance-none pr-10", className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
          aria-hidden="true"
        />
      </div>
    );
  }
);

/* -------------------------------------------------------------------------- */
/*  Buttons                                                                    */
/* -------------------------------------------------------------------------- */

type ToolButtonVariant = "primary" | "secondary" | "ghost";

const buttonVariants: Record<ToolButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500 " +
    "disabled:hover:bg-emerald-600",
  secondary:
    "border border-neutral-300 bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 " +
    "focus-visible:ring-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 " +
    "dark:hover:text-white",
  ghost:
    "bg-transparent text-emerald-700 hover:bg-emerald-50 focus-visible:ring-emerald-500 " +
    "dark:text-emerald-400 dark:hover:bg-emerald-950/40",
};

interface ToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ToolButtonVariant;
  loading?: boolean;
  icon?: LucideIcon;
}

export const ToolButton = forwardRef<HTMLButtonElement, ToolButtonProps>(function ToolButton(
  { variant = "primary", loading = false, icon: Icon, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60",
        "dark:focus-visible:ring-offset-neutral-950",
        buttonVariants[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="size-4" aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

/* -------------------------------------------------------------------------- */
/*  Copy button                                                                */
/* -------------------------------------------------------------------------- */

interface CopyButtonProps {
  value: string;
  variant?: ToolButtonVariant;
  label?: string;
  copiedLabel?: string;
  className?: string;
}

/** Copies `value` to the clipboard and flips to a confirmation state for 2s. */
export function CopyButton({
  value,
  variant = "secondary",
  label = "Copy",
  copiedLabel = "Copied",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <ToolButton
      type="button"
      variant={variant}
      onClick={copy}
      className={className}
      icon={copied ? Check : Copy}
      aria-label={copied ? copiedLabel : label}
    >
      {copied ? copiedLabel : label}
    </ToolButton>
  );
}

/* -------------------------------------------------------------------------- */
/*  Results                                                                    */
/* -------------------------------------------------------------------------- */

interface ToolResultProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  /** Colour the value with the emerald signal (the tool's answer). Default true. */
  accent?: boolean;
  className?: string;
}

/** The primary metric a tool produces — one focal number on a flat panel. */
export function ToolResult({ label, value, sub, accent = true, className }: ToolResultProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center dark:border-neutral-800 dark:bg-neutral-900/50",
        className
      )}
    >
      <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</div>
      <div
        className={cn(
          "mt-2 text-4xl font-semibold tracking-tight",
          accent ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-950 dark:text-neutral-50"
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{sub}</div>}
    </div>
  );
}

interface ToolStatProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}

/** A compact secondary stat, for grids beneath the primary result. */
export function ToolStat({ label, value, className }: ToolStatProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50",
        className
      )}
    >
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50">{value}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Callout                                                                    */
/* -------------------------------------------------------------------------- */

type ToolCalloutVariant = "info" | "tip" | "success" | "warning" | "error";

const calloutVariants: Record<
  ToolCalloutVariant,
  { surface: string; icon: string; defaultIcon: LucideIcon }
> = {
  info: {
    surface: "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50",
    icon: "text-neutral-500 dark:text-neutral-400",
    defaultIcon: Info,
  },
  tip: {
    surface: "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50",
    icon: "text-emerald-600 dark:text-emerald-400",
    defaultIcon: Lightbulb,
  },
  success: {
    surface: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/25",
    icon: "text-emerald-600 dark:text-emerald-400",
    defaultIcon: Check,
  },
  warning: {
    surface: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/25",
    icon: "text-amber-600 dark:text-amber-500",
    defaultIcon: AlertTriangle,
  },
  error: {
    surface: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/25",
    icon: "text-red-600 dark:text-red-400",
    defaultIcon: AlertTriangle,
  },
};

interface ToolCalloutProps {
  variant?: ToolCalloutVariant;
  title?: ReactNode;
  icon?: LucideIcon | null;
  className?: string;
  children: ReactNode;
}

/** A restrained tip / info / warning box — calm surface, single semantic icon. */
export function ToolCallout({ variant = "info", title, icon, className, children }: ToolCalloutProps) {
  const styles = calloutVariants[variant];
  const Icon = icon === null ? null : icon ?? styles.defaultIcon;

  return (
    <div className={cn("flex gap-3 rounded-md border p-4", styles.surface, className)}>
      {Icon && <Icon className={cn("mt-0.5 size-4 shrink-0", styles.icon)} aria-hidden="true" />}
      <div className="min-w-0 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {title && <div className="mb-1 font-semibold text-neutral-900 dark:text-white">{title}</div>}
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layout helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Divider that opens the results region below the inputs. */
export function ToolResultDivider({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-4 border-t border-neutral-200 pt-6 dark:border-neutral-800", className)}>
      {children}
    </div>
  );
}
