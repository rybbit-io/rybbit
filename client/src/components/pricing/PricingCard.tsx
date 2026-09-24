import { Check, X, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";
import { useState } from "react";

export type FeatureItem = { feature: string; included?: boolean } | string;

export interface PricingCardProps {
  title: string;
  description: string;
  buttonText?: string;
  buttonVariant?: "default" | "primary";
  features: FeatureItem[];
  footerText?: React.ReactNode;
  variant?: "free" | "default";
  recommended?: boolean;
  customButton?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  isCustomTier?: boolean;
  customPriceLabel?: string;
  monthlyPrice?: number;
  annualPrice?: number;
  isAnnual?: boolean;
}

export function PricingCard({
  title,
  description,
  buttonText,
  buttonVariant = "primary",
  features,
  footerText,
  variant = "default",
  recommended = false,
  customButton,
  onClick,
  disabled,
  isCustomTier = false,
  customPriceLabel,
  monthlyPrice,
  annualPrice,
  isAnnual = false,
}: PricingCardProps) {
  const t = useExtracted();
  const [isExpanded, setIsExpanded] = useState(false);
  const isFree = variant === "free";
  const isPrimary = buttonVariant === "primary";

  const shouldShowToggle = features.length > 7;
  const displayedFeatures = shouldShowToggle && !isExpanded ? features.slice(0, 7) : features;

  return (
    <div className="w-full flex-shrink-0 h-full">
      <div className="bg-neutral-200/20 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-200 dark:border-neutral-800 h-full">
        <div
          className={cn(
            "rounded-2xl border overflow-hidden backdrop-blur-sm shadow-xl h-full",
            recommended
              ? "bg-neutral-50 dark:bg-neutral-800/60 border-emerald-500 border-2"
              : isFree
                ? "bg-neutral-50/80 dark:bg-neutral-800/15 border-neutral-200/60 dark:border-neutral-800/60 text-neutral-600 dark:text-neutral-300"
                : "bg-neutral-50/50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          )}
        >
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold">{title}</h3>
                {recommended && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/30 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/40 dark:border-emerald-500/30">
                    {t("Most Popular")}
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 h-10">{description}</p>
            </div>

            {/* Price display */}
            <div className="mb-6 space-y-1">
              <div>{isCustomTier ? <div className="text-3xl font-bold">{customPriceLabel || t("Custom")}
              </div> : <div>
                <span className="text-3xl font-bold">
                  ${isAnnual ? Math.round(annualPrice! / 12) : monthlyPrice}
                </span>
                <span className="ml-1 pb-1 text-neutral-600 dark:text-neutral-400">{t("/month")}</span>
              </div>}</div>
              <div className="text-xs">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">{isAnnual ? t("billed annually at ${annualPrice}", { annualPrice: String(annualPrice) }) : t("billed monthly")}</span>
              </div>
            </div>

            {customButton ? (
              customButton
            ) : (
              <button
                onClick={onClick}
                disabled={disabled}
                className={cn(
                  "w-full font-medium px-5 py-3 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 cursor-pointer",
                  isPrimary
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 focus:ring-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
                    : "bg-neutral-200 dark:bg-neutral-850 hover:bg-neutral-150 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-250 dark:border-neutral-800 shadow-lg focus:ring-neutral-400"
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
