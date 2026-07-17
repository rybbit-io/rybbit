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

  const buttonClass = cn(
    "inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
    isPrimary
      ? "border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-500"
      : "border-neutral-300 bg-transparent text-neutral-900 hover:bg-neutral-100 focus-visible:outline-neutral-500 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
  );

  return (
    <div
      className={cn(
        "h-full overflow-hidden rounded-xl border bg-neutral-50 dark:bg-neutral-900",
        recommended
          ? "border-emerald-600 dark:border-emerald-700"
          : "border-neutral-200 dark:border-neutral-800",
        isFree && "text-neutral-600 dark:text-neutral-300"
      )}
    >
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 min-h-24">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            {recommended && (
              <span className="rounded-sm bg-emerald-600/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {t("Recommended")}
              </span>
            )}
          </div>
          <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">{description}</p>
        </div>

        <div className="mb-6">{priceDisplay}</div>

        {customButton ? (
          customButton
        ) : buttonHref ? (
          <AppLink
            href={disabled ? undefined : buttonHref}
            onClick={event => {
              if (disabled) {
                event.preventDefault();
                return;
              }
              if (eventLocation) trackAdEvent("signup", { location: "pricing" });
              onClick?.();
            }}
            aria-disabled={disabled || undefined}
            data-rybbit-event={eventLocation ? "signup" : undefined}
            data-rybbit-prop-location={eventLocation}
            className={buttonClass}
          >
            {buttonText}
          </AppLink>
        ) : (
          <button type="button" onClick={onClick} disabled={disabled} className={buttonClass}>
            {buttonText}
          </button>
        )}

        <div className="mt-7 space-y-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          {displayedFeatures.map((item, index) => {
            const isObject = typeof item === "object";
            const feature = isObject ? item.feature : item;
            const included = isObject ? item.included !== false : true;

            return (
              <div key={`${feature}-${index}`} className="flex items-start">
                {included ? (
                  <Check className="mr-3 mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <X className="mr-3 mt-0.5 size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                )}
                <span className={cn("text-sm leading-5", !included && "text-neutral-400 dark:text-neutral-500")}>
                  {feature}
                </span>
              </div>
            );
          })}

          {shouldShowToggle && (
            <button
              type="button"
              onClick={() => setIsExpanded(expanded => !expanded)}
              className="mt-2 flex cursor-pointer items-center text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              {isExpanded ? <ArrowUp className="mr-3 size-4" /> : <ArrowDown className="mr-3 size-4" />}
              {isExpanded
                ? t("Show less")
                : t("Show more ({count} more)", { count: String(features.length - 7) })}
            </button>
          )}
        </div>

        {footerText && <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">{footerText}</p>}
      </div>
    </div>
  );
}
