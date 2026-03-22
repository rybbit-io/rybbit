import { PlanRow } from "@/components/subscription/components/PlanRow";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";

import { cn } from "../../../lib/utils";
import { EVENT_TIERS, formatEventTier } from "../../subscribe/components/utils";

interface PlanStepProps {
  eventLimitIndex: number;
  setEventLimitIndex: (v: number) => void;
  isAnnual: boolean;
  setIsAnnual: (v: boolean) => void;
  selectedPlan: "standard" | "pro";
  setSelectedPlan: (v: "standard" | "pro") => void;
  onSubscribe: () => void;
  isLoading: boolean;
}

export function PlanStep({
  eventLimitIndex,
  setEventLimitIndex,
  isAnnual,
  setIsAnnual,
  selectedPlan,
  setSelectedPlan,
  onSubscribe,
  isLoading,
}: PlanStepProps) {
  const t = useExtracted();
  const eventLimit = EVENT_TIERS[eventLimitIndex];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">{t("Choose your plan")}</h2>
        {/* Monthly/Annual toggle */}
        <div className="relative flex bg-neutral-150 dark:bg-neutral-850 border border-neutral-250 dark:border-neutral-750 rounded-full p-0.5 text-sm">
          <button
            onClick={() => setIsAnnual(false)}
            className={cn(
              "px-2.5 py-1 rounded-full transition-colors cursor-pointer",
              !isAnnual
                ? "bg-white dark:bg-white/20 text-neutral-700 dark:text-neutral-100 font-medium"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            )}
          >
            {t("Monthly")}
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={cn(
              "px-2.5 py-1 rounded-full transition-colors cursor-pointer",
              isAnnual
                ? "bg-white dark:bg-white/20 text-neutral-700 dark:text-neutral-100 font-medium"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            )}
          >
            {t("Annual")}
          </button>
          {isAnnual && (
            <span className="absolute -top-3 -right-12 text-[10px] text-white bg-emerald-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              {t("4 months free")}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-6">
        {/* Event slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {t("Monthly events")}
            </span>
            <span className="text-sm font-medium">
              {eventLimit === "Custom"
                ? t("Custom")
                : `${formatEventTier(eventLimit)} ${t("events")}`}
            </span>
          </div>
          <Slider
            value={[eventLimitIndex]}
            onValueChange={([val]) => setEventLimitIndex(val)}
            min={0}
            max={EVENT_TIERS.length - 1}
            step={1}
          />
          <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-500">
            <span>{formatEventTier(EVENT_TIERS[0])}</span>
            <span>
              {typeof EVENT_TIERS[EVENT_TIERS.length - 1] === "string"
                ? EVENT_TIERS[EVENT_TIERS.length - 1]
                : formatEventTier(EVENT_TIERS[EVENT_TIERS.length - 1])}
            </span>
          </div>
        </div>

        {/* Plan rows */}
        {eventLimit !== "Custom" ? (
          <div className="space-y-2">
            <PlanRow
              plan="standard"
              label={t("Standard")}
              description={t("Up to 5 sites, 3 team members, advanced features")}
              eventLimit={eventLimit}
              isAnnual={isAnnual}
              selectedPlan={selectedPlan}
              onSelect={() => setSelectedPlan("standard")}
            />
            <PlanRow
              plan="pro"
              label={t("Pro")}
              description={t("Unlimited sites, session replays")}
              eventLimit={eventLimit}
              isAnnual={isAnnual}
              selectedPlan={selectedPlan}
              onSelect={() => setSelectedPlan("pro")}
            />
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t("Need more than 20M events? Contact us for a custom plan.")}
            </p>
            <a
              href="mailto:hello@rybbit.com"
              className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
            >
              hello@rybbit.com
            </a>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Subscribe button */}
          {eventLimit !== "Custom" && (
            <Button
              className="w-full transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={onSubscribe}
              disabled={isLoading}
              variant="success"
            >
              {isLoading ? t("Loading...") : t("Start free trial")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {/* Footer text */}
          {eventLimit !== "Custom" && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t("Your card won't be charged until your 7-day trial has ended. You can cancel anytime.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
