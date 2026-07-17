"use client";

import { Check, X, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackAdEvent } from "@/lib/trackAdEvent";
import { AppLink } from "./AppLink";
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
  const isPrimary = buttonVariant === "primary";

  const shouldShowToggle = features.length > 7;
  const displayedFeatures = shouldShowToggle && !isExpanded ? features.slice(0, 7) : features;

  const buttonClass = cn(
    "w-full inline-flex h-11 items-center justify-center font-medium px-5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
    isPrimary
      ? "bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-500/50"
      : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white focus-visible:ring-neutral-400/50"
  );

  return (
    <div className="w-full flex-shrink-0 h-full">
      <div
        className={cn(
          "flex h-full flex-col rounded-xl border p-6",
          recommended
            ? "border-emerald-500 dark:border-emerald-500 bg-white dark:bg-neutral-900"
            : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
        )}
      >
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">{title}</h3>
            {recommended && (
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/40 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t("Recommended")}
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 h-10">{description}</p>
        </div>

        {/* Price display */}
        <div className="mb-6">{priceDisplay}</div>

        {customButton ? (
          customButton
        ) : buttonHref ? (
          <AppLink href={buttonHref} className="w-full block">
            <button
              onClick={() => {
                if (eventLocation) {
                  trackAdEvent("signup", { location: "pricing" });
                }
                onClick?.();
              }}
              disabled={disabled}
              data-rybbit-event={eventLocation ? "signup" : undefined}
              data-rybbit-prop-location={eventLocation}
              className={buttonClass}
            >
              {buttonText}
            </button>
          </AppLink>
        ) : (
          <button onClick={onClick} disabled={disabled} className={buttonClass}>
            {buttonText}
          </button>
        )}

        <div className="mt-6 mb-1 space-y-3">
          {displayedFeatures.map((item, i) => {
            const isObject = typeof item === "object";
            const feature = isObject ? item.feature : item;
            const included = isObject ? item.included !== false : true;

            return (
              <div key={i} className="flex items-center">
                {included ? (
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mr-3 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-neutral-400 dark:text-neutral-500 mr-3 shrink-0" />
                )}
                <span className={cn("text-sm", !included && "text-neutral-400 dark:text-neutral-500")}>{feature}</span>
              </div>
            );
          })}

          {shouldShowToggle && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors cursor-pointer mt-2"
            >
              {isExpanded ? (
                <>
                  <ArrowUp className="h-4 w-4 mr-3" />
                  {t("Show less")}
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4 mr-3" />
                  {t("Show more ({count} more)", { count: String(features.length - 7) })}
                </>
              )}
            </button>
          )}
        </div>

        {footerText && (
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-4 flex items-center justify-center gap-2">
            {footerText}
          </p>
        )}
      </div>
    </div>
  );
}
