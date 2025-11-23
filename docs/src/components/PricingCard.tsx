import { Check, X, CheckCircle, ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackAdEvent } from "@/lib/trackAdEvent";
import { useState } from "react";

interface PricingCardProps {
  title: string;
  description: string;
  priceDisplay: React.ReactNode;
  buttonText?: string;
  buttonHref?: string;
  buttonVariant?: "default" | "primary";
  features: Array<{ feature: string; included?: boolean } | string>;
  footerText?: React.ReactNode;
  variant?: "free" | "default";
  eventLocation?: string;
  onClick?: () => void;
  customButton?: React.ReactNode;
  recommended?: boolean;
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
  eventLocation,
  onClick,
  customButton,
  recommended = false,
}: PricingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFree = variant === "free";
  const isPrimary = buttonVariant === "primary";

  const shouldShowToggle = features.length > 7;
  const displayedFeatures = shouldShowToggle && !isExpanded ? features.slice(0, 7) : features;

  return (
    <div className="w-full flex-shrink-0">
      <div
        className={cn(
          "rounded-xl border overflow-hidden backdrop-blur-sm shadow-xl h-full",
          recommended
            ? "bg-neutral-100/80 dark:bg-neutral-800/100 border-emerald-500 border-2"
            : isFree
            ? "bg-neutral-100/30 dark:bg-neutral-800/15 border-neutral-300/60 dark:border-neutral-800/60 text-neutral-600 dark:text-neutral-300"
            : "bg-neutral-100/50 dark:bg-neutral-800/50 border-neutral-300/90 dark:border-neutral-800/90"
        )}
      >
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold">{title}</h3>
              {recommended && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/30 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/40 dark:border-emerald-500/30">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 h-10">{description}</p>
          </div>

          {/* Price display */}
          <div className="mb-6">{priceDisplay}</div>

          {customButton ? (
            customButton
          ) : (
            <Link href={buttonHref!} className="w-full block">
              <button
                onClick={() => {
                  if (eventLocation) {
                    trackAdEvent("signup", { location: "pricing" });
                  }
                  onClick?.();
                }}
                data-rybbit-event={eventLocation ? "signup" : undefined}
                data-rybbit-prop-location={eventLocation}
                className={cn(
                  "w-full font-medium px-5 py-3 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 cursor-pointer",
                  isPrimary
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 focus:ring-emerald-500"
                    : "bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white"
                )}
              >
                {buttonText}
              </button>
            </Link>
          )}

          <div className={cn("mt-6 mb-1", "space-y-3")}>
            {displayedFeatures.map((item, i) => {
              const isObject = typeof item === "object";
              const feature = isObject ? item.feature : item;
              const included = isObject ? item.included : true;

              return (
                <div key={i} className="flex items-center">
                  {included ? (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mr-3 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-neutral-500 dark:text-neutral-400 mr-3 shrink-0" />
                  )}
                  <span className="text-sm">{feature}</span>
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
                    Show less
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4 mr-3" />
                    Show more ({features.length - 7} more)
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
