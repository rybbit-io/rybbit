import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect } from "react";

import { cn } from "../../../lib/utils";
import { EVENT_TIERS, findPriceForTier, formatEventTier } from "../../subscribe/components/utils";

interface PlanStepProps {
  eventLimitIndex: number;
  setEventLimitIndex: (v: number) => void;
  isAnnual: boolean;
  setIsAnnual: (v: boolean) => void;
  selectedPlan: "basic" | "standard" | "pro";
  setSelectedPlan: (v: "basic" | "standard" | "pro") => void;
  onSubscribe: () => void;
  isLoading: boolean;
}

function PlanRow({
  plan,
  label,
  description,
  eventLimit,
  isAnnual,
  selectedPlan,
  onSelect,
  disabled,
  disabledReason,
}: {
  plan: "basic" | "standard" | "pro";
  label: string;
  description: string;
  eventLimit: number | string;
  isAnnual: boolean;
  selectedPlan: string;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const price =
    eventLimit !== "Custom"
      ? findPriceForTier(eventLimit, isAnnual ? "year" : "month", plan)
      : null;
  const displayPrice = price
    ? isAnnual
      ? Math.round(price.price / 12)
      : price.price
    : 0;

  return (
    <button
      onClick={disabled ? undefined : onSelect}
      className={cn(
        "w-full rounded-2xl p-1.5 transition-all text-left",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer",
        !disabled && selectedPlan === plan
          ? "bg-emerald-500/10 border border-emerald-500/30"
          : "bg-neutral-200/20 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-xl border",
          !disabled && selectedPlan === plan
            ? "border-emerald-500 bg-neutral-50 dark:bg-neutral-800/60"
            : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900",
          !disabled && selectedPlan !== plan && "hover:border-neutral-300 dark:hover:border-neutral-700"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
              !disabled && selectedPlan === plan
                ? "border-emerald-500"
                : "border-neutral-300 dark:border-neutral-600"
            )}
          >
            {!disabled && selectedPlan === plan && (
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{label}</span>
              {disabled && disabledReason && (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                  {disabledReason}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-semibold">${displayPrice}</span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            /mo
          </span>
        </div>
      </div>
    </button>
  );
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
  const basicAvailable = typeof eventLimit === "number" && eventLimit <= 250_000;

  useEffect(() => {
    if (!basicAvailable && selectedPlan === "basic") {
      setSelectedPlan("standard");
    }
  }, [basicAvailable, selectedPlan]);

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
              plan="basic"
              label={t("Basic")}
              description={t("1 site, 1 team member, basic features")}
              eventLimit={basicAvailable ? eventLimit : 250_000}
              isAnnual={isAnnual}
              selectedPlan={selectedPlan}
              onSelect={() => setSelectedPlan("basic")}
              disabled={!basicAvailable}
              disabledReason={!basicAvailable ? "Up to 250k events" : undefined}
            />
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
