import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:focus-visible:ring-neutral-300",
  {
    variants: {
      variant: {
        default:
          "bg-white text-neutral-950 border border-neutral-150 hover:bg-neutral-50 hover:border-neutral-300 dark:bg-neutral-850 dark:border-neutral-750 dark:text-neutral-50 dark:hover:bg-neutral-800/90 dark:hover:border-neutral-650",
        secondary:
          "bg-neutral-50 text-neutral-900 border border-neutral-150 hover:bg-neutral-100 hover:border-neutral-200 dark:bg-neutral-900 dark:text-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/80 dark:hover:border-neutral-700",
        accent:
          "bg-accent-500 text-neutral-50 border border-accent-600 hover:bg-accent-500/90 dark:bg-accent-600 dark:text-neutral-50 dark:border-accent-700 dark:hover:bg-accent-600/90",
        success:
          "bg-accent-500 text-neutral-50 border border-accent-600 hover:bg-accent-500/90 dark:bg-accent-800 dark:border-accent-600 dark:text-neutral-50 dark:hover:bg-accent-800/90 dark:hover:border-accent-500",
        destructive:
          "bg-red-500 text-neutral-50 border border-red-500 hover:bg-red-500/90 dark:bg-red-900 dark:border-red-700 dark:text-neutral-50 dark:hover:bg-red-900/90 dark:hover:border-red-500",
        warning:
          "bg-yellow-500 text-neutral-900 border border-yellow-500 hover:bg-yellow-500/90 dark:bg-yellow-700 dark:border-yellow-500 dark:text-neutral-50 dark:hover:bg-yellow-700/90 dark:hover:border-yellow-400",
        outline:
          "border border-neutral-100 bg-transparent text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-200 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:text-neutral-50",
        ghost:
          "bg-transparent text-neutral-950 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 border border-transparent",
        link: "text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-50",
      },
      size: {
        default: "h-9 px-3 py-2 rounded-lg text-sm",
        sm: "h-8 rounded-lg px-2.5 text-xs",
        xs: "h-6 rounded-md px-1.5 text-xs",
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
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Swaps the label for a spinner without changing the button's width, and
   * ignores clicks. The button stays focusable: it gets aria-busy and
   * aria-disabled instead of the disabled attribute, so `loading` wins over
   * `disabled`. Pass it from the first render (`loading={isPending}`) so both
   * layers exist to crossfade between. Leave it out and the button renders
   * exactly as it always has.
   */
  loading?: boolean;
  /** Accessible name while loading, e.g. t("Saving..."). Defaults to the visible label. */
  loadingLabel?: string;
}

// Loading layout adapted from interior.dev "Loading Button" (MIT). See
// ../interior/THIRD_PARTY_LICENSES.md. The label and the spinner share one grid
// cell, so the label keeps sizing the button while it is invisible. The fade is
// CSS rather than framer so this file stays light and server-safe; the global
// prefers-reduced-motion rule makes it instant and holds the spinner still.
const LOADING_LAYER = "col-start-1 row-start-1 flex items-center justify-center gap-[inherit] transition-opacity";
// FADE_IN and FADE_OUT from lib/motion.ts.
const LOADING_LAYER_SHOWN = "opacity-100 duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)]";
const LOADING_LAYER_HIDDEN = "opacity-0 duration-[140ms] ease-in";

function ButtonSpinner({ spinning }: { spinning: boolean }) {
  // Sized by the button's [&_svg]:size-4, like any icon. Paused rather than
  // removed when idle, so it doesn't snap back to 0° while fading out. Inline,
  // because animate-spin's `animation` shorthand would reset a class-based pause.
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="animate-spin"
      style={spinning ? undefined : { animationPlayState: "paused" }}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function withLoadingLayers(label: React.ReactNode, loading: boolean) {
  return (
    <span className="grid place-items-center gap-[inherit]">
      <span className={cn(LOADING_LAYER, loading ? LOADING_LAYER_HIDDEN : LOADING_LAYER_SHOWN)}>{label}</span>
      <span aria-hidden="true" className={cn(LOADING_LAYER, loading ? LOADING_LAYER_SHOWN : LOADING_LAYER_HIDDEN)}>
        <ButtonSpinner spinning={loading} />
      </span>
    </span>
  );
}

// Capture phase, so it runs before any onClick on the button, its asChild
// element or a Radix trigger, and cancels form submission and navigation.
function blockClick(event: React.MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, loadingLabel, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const classes = cn(buttonVariants({ variant, size, className }));

    if (loading === undefined) {
      return <Comp className={classes} ref={ref} {...props} />;
    }

    const { children, disabled, onClickCapture, ...rest } = props;
    const content =
      asChild && React.isValidElement<{ children?: React.ReactNode }>(children)
        ? React.cloneElement(children, undefined, withLoadingLayers(children.props.children, loading))
        : withLoadingLayers(children, loading);

    return (
      <Comp
        className={classes}
        ref={ref}
        {...rest}
        disabled={loading ? undefined : disabled}
        aria-busy={loading || rest["aria-busy"] || undefined}
        aria-disabled={loading || rest["aria-disabled"] || undefined}
        aria-label={loading && loadingLabel ? loadingLabel : rest["aria-label"]}
        onClickCapture={loading ? blockClick : onClickCapture}
      >
        {content}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
