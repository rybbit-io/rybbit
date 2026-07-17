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
  const isFree = variant === "free";
  const isPrimary = buttonVariant === "primary";

  const shouldShowToggle = features.length > 7;
  const displayedFeatures = shouldShowToggle && !isExpanded ? features.slice(0, 7) : features;

  return (
    <div className="w-full flex-shrink-0 h-full">
      <div className="h-full">
        <div
          className={cn(
            "rounded-xl border overflow-hidden h-full",
            recommended
              ? "bg-white dark:bg-neutral-900 border-emerald-600/70 dark:border-emerald-500/60"
              : isFree
                ? "bg-neutral-50/50 dark:bg-neutral-900/30 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300"
                : "bg-neutral-50/80 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800"
          )}
        >
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold">{title}</h3>
                {recommended && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/15 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-md">
                    {t("Recommended")}
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 h-10">{description}</p>
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
                  className={cn(
                    "w-full inline-flex h-11 items-center justify-center font-medium px-5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 cursor-pointer",
                    isPrimary
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-500/60 disabled:opacity-50 disabled:pointer-events-none"
                      : "border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white focus-visible:ring-neutral-400/60"
                  )}
                >
                  {buttonText}
                </button>
              </AppLink>
            ) : (
              <button
                onClick={onClick}
                disabled={disabled}
                className={cn(
                  "w-full inline-flex h-11 items-center justify-center font-medium px-5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 cursor-pointer",
                  isPrimary
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-500/60 disabled:opacity-50 disabled:pointer-events-none"
                    : "border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white focus-visible:ring-neutral-400/60"
                )}
              >
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
                    <span className={cn("text-sm", !included && "text-neutral-400 dark:text-neutral-500")}>
                      {feature}
                    </span>
                  </div>
                );
              })}

              {shouldShowToggle && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center text-sm text-neutral-400 dark:text-neutral-400 hover:text-neutral-200 dark:hover:text-neutral-300 transition-colors cursor-pointer mt-2"
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
              <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-4 flex items-center justify-center gap-2">
                {footerText}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
