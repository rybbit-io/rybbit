"use client";

import { AppLink } from "@/components/AppLink";
import { trackAdEvent } from "@/lib/trackAdEvent";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";

export type FeatureItem = { feature: string; included?: boolean } | string;

export interface PricingCardProps {
  title: string;
  description: string;
  priceDisplay: React.ReactNode;
  buttonText: string;
  buttonHref: string;
  buttonVariant?: "default" | "primary";
  features: FeatureItem[];
  /** Marks the plan as the signal plate: emerald edge, plate tint, graph texture, badge. */
  recommended?: boolean;
  /**
   * Standalone bordered card (mobile carousel). Omit when the card is a cell
   * of the seamed `gap-px` plan grid, where the grid supplies the hairlines.
   */
  framed?: boolean;
  className?: string;
  featuresClassName?: string;
  eventLocation?: string;
}

export function PricingCard({
  title,
  description,
  priceDisplay,
  buttonText,
  buttonHref,
  buttonVariant = "primary",
  features,
  recommended = false,
  framed = false,
  className,
  featuresClassName,
  eventLocation,
}: PricingCardProps) {
  const t = useExtracted();
  const [isExpanded, setIsExpanded] = useState(false);
  const isPrimary = buttonVariant === "primary";
  const shouldShowToggle = features.length > 7;
  const displayedFeatures = shouldShowToggle && !isExpanded ? features.slice(0, 7) : features;

  const buttonClasses = cn(
    "inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-neutral-950",
    isPrimary
      ? "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500"
      : "border border-neutral-300 text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-500 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
  );

  return (
    <div
      className={cn(
        "relative h-full overflow-hidden",
        recommended ? "bg-plate-accent" : "bg-white dark:bg-neutral-950",
        framed
          ? cn(
              "rounded-lg border",
              recommended ? "border-emerald-500" : "border-neutral-200 dark:border-neutral-800"
            )
          : // Inside the seamed grid the emerald hairline replaces the 1px seam
            // around the cell, so the signal plate carries its own edge.
            recommended && "z-10 outline outline-1 outline-emerald-500",
        className
      )}
    >
      {recommended && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
        />
      )}
      <div className="relative p-6">
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            {recommended && (
              <span className="rounded-sm bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {t("Recommended")}
              </span>
            )}
          </div>
          <p className="min-h-10 text-sm leading-5 text-neutral-600 dark:text-neutral-400">{description}</p>
        </div>

        <div className="mb-6 min-h-16">{priceDisplay}</div>

        <AppLink
          href={buttonHref}
          onClick={() => {
            if (eventLocation) trackAdEvent("signup", { location: "pricing" });
          }}
          data-rybbit-event={eventLocation ? "signup" : undefined}
          data-rybbit-prop-location={eventLocation}
          className={buttonClasses}
        >
          {buttonText}
        </AppLink>

        <div className={cn("mb-1 mt-6 space-y-3", featuresClassName)}>
          {displayedFeatures.map((item, index) => {
            const isObject = typeof item === "object";
            const feature = isObject ? item.feature : item;
            const included = isObject ? item.included !== false : true;

            return (
              <div key={index} className="flex items-center gap-3">
                {included ? (
                  <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <X className="size-4 shrink-0 text-neutral-500" aria-hidden="true" />
                )}
                <span className={cn("text-sm", !included && "text-neutral-500")}>{feature}</span>
              </div>
            );
          })}

          {shouldShowToggle && (
            <button
              onClick={() => setIsExpanded(expanded => !expanded)}
              aria-expanded={isExpanded}
              className="mt-2 flex cursor-pointer items-center gap-3 rounded-sm text-sm text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
            >
              {isExpanded ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
              {isExpanded ? t("Show less") : t("Show more ({count} more)", { count: String(features.length - 7) })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
