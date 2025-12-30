import React, { useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeaturesListProps {
  features: string[];
  className?: string;
}

export function FeaturesList({ features, className }: FeaturesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldShowToggle = features.length > 7;
  const displayedFeatures = shouldShowToggle && !isExpanded ? features.slice(0, 7) : features;

  return (
    <div className={cn("space-y-3 mt-6", className)}>
      {displayedFeatures.map((feature, i) => (
        <div key={i} className="flex items-center">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mr-3 shrink-0" />
          <span className="text-sm">{feature}</span>
        </div>
      ))}

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
              Show more ({features.length - 5} more)
            </>
          )}
        </button>
      )}
    </div>
  );
}
