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
      <div
        className={cn(
          "rounded-xl border overflow-hidden h-full",
          recommended
            ? "border-emerald-600/60 dark:border-emerald-500/50 bg-neutral-50 dark:bg-neutral-900/70"
            : isFree
              ? "border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-600 dark:text-neutral-300"
              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50"
        )}
      >
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                {recommended && (
                  <span className="px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 rounded-sm border border-emerald-600/40 dark:border-emerald-500/40">
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
                    "w-full font-medium h-11 inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 cursor-pointer",
                    isPrimary
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-200 disabled:opacity-50 disabled:pointer-events-none"
                      : "bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white"
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
                  "w-full font-medium h-11 inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 cursor-pointer",
                  isPrimary
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
                    : "bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white"
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
  );
}
