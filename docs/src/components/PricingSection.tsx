"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { getCalApi } from "@calcom/embed-react";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { BASIC_SITE_LIMIT, BASIC_TEAM_LIMIT, FREE_SITE_LIMIT, STANDARD_SITE_LIMIT, STANDARD_TEAM_LIMIT } from "../lib/const";
import { PricingCard } from "./PricingCard";

// Available event tiers for the slider
const EVENT_TIERS = [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 20_000_000, "Custom"];

export const formatter = Intl.NumberFormat("en", {
  notation: "compact",
}).format;

// Format price with dollar sign for Basic, Standard, and Pro
function getFormattedPrice(eventLimit: number | string, planType: "basic" | "standard" | "pro") {
  // Monthly prices
  let monthlyPrice;
  if (typeof eventLimit === "string") return { custom: true }; // Custom pricing

  if (planType === "basic") {
    if (eventLimit <= 100_000) monthlyPrice = 14;
    else if (eventLimit <= 250_000) monthlyPrice = 24;
    else return { custom: true };
  } else if (planType === "standard") {
    // Standard tier prices
    if (eventLimit <= 100_000) monthlyPrice = 19;
    else if (eventLimit <= 250_000) monthlyPrice = 29;
    else if (eventLimit <= 500_000) monthlyPrice = 49;
    else if (eventLimit <= 1_000_000) monthlyPrice = 69;
    else if (eventLimit <= 2_000_000) monthlyPrice = 99;
    else if (eventLimit <= 5_000_000) monthlyPrice = 149;
    else if (eventLimit <= 10_000_000) monthlyPrice = 249;
    else if (eventLimit <= 20_000_000) monthlyPrice = 399;
    else return { custom: true };
  } else {
    // Pro tier prices (roughly double)
    if (eventLimit <= 100_000) monthlyPrice = 39;
    else if (eventLimit <= 250_000) monthlyPrice = 59;
    else if (eventLimit <= 500_000) monthlyPrice = 99;
    else if (eventLimit <= 1_000_000) monthlyPrice = 139;
    else if (eventLimit <= 2_000_000) monthlyPrice = 199;
    else if (eventLimit <= 5_000_000) monthlyPrice = 299;
    else if (eventLimit <= 10_000_000) monthlyPrice = 499;
    else if (eventLimit <= 20_000_000) monthlyPrice = 799;
    else return { custom: true };
  }

  // Annual prices are 8 monthly (4 months free)
  const annualPrice = monthlyPrice * 8;
  return {
    monthly: monthlyPrice,
    annual: annualPrice,
    custom: false,
  };
}

export function PricingSection({ isAnnual, setIsAnnual }: { isAnnual: boolean, setIsAnnual: (isAnnual: boolean) => void }) {
  const t = useExtracted();
  const [eventLimitIndex, setEventLimitIndex] = useState(0); // Default to 100k (index 0)

  const BASIC_FEATURES = [
    t("{count} website", { count: String(BASIC_SITE_LIMIT) }),
    t("{count} team member", { count: String(BASIC_TEAM_LIMIT) }),
    t("Web analytics dashboard"),
    t("Goals"),
    t("Custom events"),
    t("2 year data retention"),
    t("Email support"),
  ];

  const STANDARD_FEATURES = [
    t("Up to {count} websites", { count: String(STANDARD_SITE_LIMIT) }),
    t("Up to {count} team members", { count: String(STANDARD_TEAM_LIMIT) }),
    t("Custom events"),
    t("Funnels"),
    t("Goals"),
    t("Journeys"),
    t("Web vitals"),
    t("Error tracking"),
    t("User profiles"),
    t("Retention"),
    t("Sessions"),
    t("Email reports"),
    t("2 year data retention"),
    t("Email support"),
  ];

  const PRO_FEATURES = [
    t("Everything in Standard"),
    t("Unlimited websites"),
    t("Unlimited team members"),
    t("Session replays"),
    t("5 year data retention"),
    t("Priority support"),
  ];

  const ENTERPRISE_FEATURES = [
    t("Everything in Pro"),
    t("Single Sign-On (SSO)"),
    t("Infinite data retention"),
    t("Dedicated isolated instance"),
    t("On-premise installation"),
    t("Custom features"),
    t("Whitelabeling"),
    t("Manual invoicing"),
    t("Uptime SLA"),
    t("Enterprise support"),
    t("Slack/live chat support"),
  ];

  const FREE_FEATURES = [
    { feature: t("1 user"), included: true },
    { feature: t("{count} website", { count: String(FREE_SITE_LIMIT) }), included: true },
    { feature: t("Web analytics dashboard"), included: true },
    { feature: t("Custom events"), included: true },
    { feature: t("6 month data retention"), included: true },
    { feature: t("Advanced features"), included: false },
    { feature: t("Email support"), included: false },
  ];

  const eventLimit = EVENT_TIERS[eventLimitIndex];
  const basicPrices = getFormattedPrice(eventLimit, "basic");
  const isBasicAvailable = typeof eventLimit === "number" && eventLimit <= 250_000;
  const standardPrices = getFormattedPrice(eventLimit, "standard");
  const proPrices = getFormattedPrice(eventLimit, "pro");

  // Initialize Cal.com embed
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "secret" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  // Handle slider changes
  function handleSliderChange(value: number[]) {
    setEventLimitIndex(value[0]);
  }

  return (
    <section className="py-16 md:py-24 w-full relative z-10">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight pb-4 text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-gray-200 dark:to-gray-400">
            {t("Pricing")}
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            {t("Start your 7-day free trial — no credit card charges until the trial ends.")}
          </p>
        </div>

        {/* Shared controls section */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="flex justify-between mb-6 items-center">
            <div>
              <h3 className="font-semibold mb-2">{t("Monthly pageviews")}</h3>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {typeof eventLimit === "number" ? eventLimit.toLocaleString() : t("Custom")}
              </div>
            </div>
            <div className="flex flex-col items-end relative">
              {/* Billing toggle */}
              <div className="flex mb-2 text-sm bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-full p-1">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={cn(
                    "px-3 py-1 rounded-full transition-colors cursor-pointer",
                    !isAnnual
                      ? "bg-white dark:bg-white/20 text-neutral-700 dark:text-neutral-100 font-medium"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  )}
                >
                  {t("Monthly")}
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={cn(
                    "px-3 py-1 rounded-full transition-colors cursor-pointer",
                    isAnnual
                      ? "bg-white dark:bg-white/20 text-neutral-700 dark:text-neutral-100 font-medium"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  )}
                >
                  {t("Annual")}
                </button>
                <div className="text-xs text-white absolute top-0 right-0 -translate-y-3 translate-x-1/2 bg-emerald-500 dark:bg-emerald-500 rounded-full px-2 py-0.5">
                  {t("4 months free")}
                </div>
              </div>
            </div>
          </div>

          {/* Slider */}
          <Slider
            defaultValue={[0]}
            max={EVENT_TIERS.length - 1}
            min={0}
            step={1}
            onValueChange={handleSliderChange}
            className="mb-3"
          />

          <div className="flex justify-between text-xs text-neutral-400">
            {EVENT_TIERS.map((tier, index) => (
              <span key={index} className={cn(eventLimitIndex === index && "font-bold text-emerald-400")}>
                {index === EVENT_TIERS.length - 1
                  ? "20M+"
                  : typeof tier === "number" && tier >= 1_000_000
                    ? `${tier / 1_000_000}M`
                    : typeof tier === "number"
                      ? `${tier / 1_000}K`
                      : t("Custom")}
              </span>
            ))}
          </div>
        </div>

        {/* Pricing cards layout */}
        <div className="grid min-[1100px]:grid-cols-4 min-[700px]:grid-cols-2 min-[400px]:grid-cols-1 gap-4 mx-auto justify-center items-stretch">
          {/* Basic Plan Card */}
          <div className={cn("h-full", !isBasicAvailable && "opacity-60")}>
            <PricingCard
              title={t("Basic")}
              description={t("For personal projects and small sites")}
              priceDisplay={
                !isBasicAvailable ? (
                  <div className="text-3xl font-bold">-</div>
                ) : basicPrices.custom ? (
                  <div className="text-3xl font-bold">{t("Custom")}</div>
                ) : (
                  <div>
                    <span className="text-3xl font-bold">
                      ${isAnnual ? Math.round(basicPrices.annual! / 12) : basicPrices.monthly}
                    </span>
                    <span className="ml-1 text-neutral-400">{t("/month")}</span>
                  </div>
                )
              }
              buttonText={!isBasicAvailable ? t("Up to 250k only") : t("Start for $0")}
              buttonHref={!isBasicAvailable ? undefined : "https://app.rybbit.io/signup"}
              features={BASIC_FEATURES}
              disabled={!isBasicAvailable}
              eventLocation={isBasicAvailable ? "basic" : undefined}
            />
          </div>

          {/* Standard Plan Card */}
          <PricingCard
            title={t("Standard")}
            description={t("Everything you need to get started as a small business")}
            priceDisplay={
              standardPrices.custom ? (
                <div className="text-3xl font-bold">{t("Custom")}</div>
              ) : (
                <div>
                  <span className="text-3xl font-bold">
                    ${isAnnual ? Math.round(standardPrices.annual! / 12) : standardPrices.monthly}
                  </span>
                  <span className="ml-1 text-neutral-400">{t("/month")}</span>
                </div>
              )
            }
            buttonText={standardPrices.custom ? t("Contact us") : t("Start for $0")}
            buttonHref={standardPrices.custom ? "https://www.rybbit.com/contact" : "https://app.rybbit.io/signup"}
            features={STANDARD_FEATURES}
            eventLocation={standardPrices.custom ? undefined : "standard"}
          />

          {/* Pro Plan Card */}
          <PricingCard
            title={t("Pro")}
            description={t("Advanced features for professional teams")}
            priceDisplay={
              proPrices.custom ? (
                <div className="text-3xl font-bold">{t("Custom")}</div>
              ) : (
                <div>
                  <span className="text-3xl font-bold">
                    ${isAnnual ? Math.round(proPrices.annual! / 12) : proPrices.monthly}
                  </span>
                  <span className="ml-1 text-neutral-400">{t("/month")}</span>
                </div>
              )
            }
            buttonText={proPrices.custom ? t("Contact us") : t("Start for $0")}
            buttonHref={proPrices.custom ? "https://www.rybbit.com/contact" : "https://app.rybbit.io/signup"}
            features={PRO_FEATURES}
            eventLocation={proPrices.custom ? undefined : "pro"}
            recommended={true}
          />

          {/* Enterprise Plan Card */}
          <PricingCard
            title={t("Enterprise")}
            description={t("Advanced features for enterprise teams")}
            priceDisplay={<div className="text-3xl font-bold">{t("Custom")}</div>}
            features={ENTERPRISE_FEATURES}
            buttonText={t("Contact us")}
            buttonHref={"https://www.rybbit.com/contact"}
          />
        </div>
      </div>
    </section>
  );
}
