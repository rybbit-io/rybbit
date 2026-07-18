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
  buttonText?: string;
  buttonHref?: string;
  buttonVariant?: "default" | "primary";
  features: FeatureItem[];
  footerText?: React.ReactNode;
  variant?: "free" | "default";
  recommended?: boolean;
  customButton?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
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
  footerText,
  variant = "default",
  recommended = false,
  customButton,
  onClick,
  disabled,
  eventLocation,
}: PricingCardProps) {
  const t = useExtracted();
  const [isExpanded, setIsExpanded] = useState(false);
  const isFree = variant === "free";
  const isPrimary = buttonVariant === "primary";
  const shouldShowToggle = features.length > 7;
  const displayedFeatures = shouldShowToggle && !isExpanded ? features.slice(0, 7) : features;

  const buttonClasses = cn(
    "inline-flex h-11 w-full items-center justify-center rounded-md px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
    isPrimary
      ? "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500"
      : "border border-neutral-300 text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-500 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
  );

  return (
    <article
      className={cn(
        "flex h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-lg border bg-white dark:bg-neutral-900",
        recommended
          ? "border-neutral-500 dark:border-neutral-500"
          : "border-neutral-300 dark:border-neutral-800",
        isFree && "bg-neutral-100 text-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300"
      )}
    >
      <div className="border-b border-neutral-200 p-6 dark:border-neutral-800">
        <div className="flex min-h-7 items-start justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">{title}</h3>
          {recommended && (
            <span className="rounded-sm bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
              {t("Recommended")}
            </span>
          )}
        </div>
        <p className="mt-2 min-h-10 text-sm leading-5 text-neutral-600 dark:text-neutral-400">{description}</p>
        <div className="mt-7 text-neutral-950 dark:text-white">{priceDisplay}</div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {customButton ? (
          customButton
        ) : buttonHref ? (
          <AppLink
            href={buttonHref}
            onClick={() => {
              if (eventLocation) trackAdEvent("signup", { location: eventLocation });
              onClick?.();
            }}
            data-rybbit-event={eventLocation ? "signup" : undefined}
            data-rybbit-prop-location={eventLocation}
            className={buttonClasses}
          >
            {buttonText}
          </AppLink>
        ) : (
          <button onClick={onClick} disabled={disabled} className={buttonClasses}>
            {buttonText}
          </button>
        )}

        <div className="mt-7 space-y-3">
          {displayedFeatures.map((item, index) => {
            const isObject = typeof item === "object";
            const feature = isObject ? item.feature : item;
            const included = isObject ? item.included !== false : true;

            return (
              <div key={`${feature}-${index}`} className="flex items-start gap-3">
                {included ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                )}
                <span className={cn("text-sm leading-5 text-neutral-700 dark:text-neutral-300", !included && "text-neutral-400 dark:text-neutral-500")}>
                  {feature}
                </span>
              </div>
            );
          })}

          {shouldShowToggle && (
            <button
              type="button"
              onClick={() => setIsExpanded(expanded => !expanded)}
              className="mt-2 flex items-center gap-3 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-400 dark:hover:text-white"
            >
              {isExpanded ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              {isExpanded
                ? t("Show less")
                : t("Show more ({count} more)", { count: String(features.length - 7) })}
            </button>
          )}
        </div>

        {footerText && <p className="mt-auto pt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">{footerText}</p>}
      </div>
    </article>
  );
}
