"use client";

import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { getCalApi } from "@calcom/embed-react";
import { useExtracted } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { STANDARD_SITE_LIMIT, STANDARD_TEAM_LIMIT } from "../lib/const";
import { PricingCard } from "./PricingCard";

// Available event tiers for the slider
const EVENT_TIERS = [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 20_000_000, 30_000_000, 40_000_000, 50_000_000, "Custom"];

export const formatter = Intl.NumberFormat("en", {
  notation: "compact",
}).format;

// Format price with dollar sign for Basic, Standard, and Pro
function getFormattedPrice(eventLimit: number | string, planType: "standard" | "pro") {
  // Monthly prices
  let monthlyPrice;
  if (typeof eventLimit === "string") return { custom: true }; // Custom pricing

  if (planType === "standard") {
    // Standard tier prices
    if (eventLimit <= 100_000) monthlyPrice = 19;
    else if (eventLimit <= 250_000) monthlyPrice = 29;
    else if (eventLimit <= 500_000) monthlyPrice = 49;
    else if (eventLimit <= 1_000_000) monthlyPrice = 69;
    else if (eventLimit <= 2_000_000) monthlyPrice = 99;
    else if (eventLimit <= 5_000_000) monthlyPrice = 149;
    else if (eventLimit <= 10_000_000) monthlyPrice = 249;
    else if (eventLimit <= 20_000_000) monthlyPrice = 399;
    else if (eventLimit <= 30_000_000) monthlyPrice = 549;
    else if (eventLimit <= 40_000_000) monthlyPrice = 699;
    else if (eventLimit <= 50_000_000) monthlyPrice = 849;
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
    else if (eventLimit <= 30_000_000) monthlyPrice = 1099;
    else if (eventLimit <= 40_000_000) monthlyPrice = 1399;
    else if (eventLimit <= 50_000_000) monthlyPrice = 1699;
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
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    setSlideCount(carouselApi.scrollSnapList().length);
    setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

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
    t("3 year data retention"),
    t("API access"),
    t("Email support"),
  ];

  const PRO_FEATURES = [
    t("Everything in Standard"),
    t("Unlimited websites"),
    t("Unlimited team members"),
    t("Session replays"),
    t("5 year data retention"),
    t("10x higher API rate limit"),
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

  const eventLimit = EVENT_TIERS[eventLimitIndex];
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
    <section className="w-full py-20 md:py-28">
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-6 border-b border-neutral-200 pb-10 dark:border-neutral-800 md:grid-cols-12 md:pb-12">
          <h2 className="text-4xl font-semibold tracking-[-0.035em] text-neutral-950 dark:text-white md:col-span-5 md:text-6xl">
            {t("Simple pricing")}
          </h2>
          <p className="max-w-[44ch] self-end text-base leading-7 text-neutral-600 dark:text-neutral-300 md:col-span-5 md:col-start-8 md:text-lg">
            {t("Start free, then pay for the volume you use. Every plan includes the same clear analytics foundation.")}
          </p>
        </div>

        {/* Shared controls section */}
        <div className="mx-auto mb-10 max-w-2xl rounded-lg border border-neutral-300 bg-neutral-100/70 p-5 dark:border-neutral-700 dark:bg-neutral-900/60 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-5">
            <div>
              <h3 className="mb-1 text-sm font-medium text-neutral-600 dark:text-neutral-400">{t("Monthly events")}</h3>
              <div className="text-3xl font-semibold tracking-[-0.03em] text-neutral-950 dark:text-white">
                {typeof eventLimit === "number" ? eventLimit.toLocaleString() : t("Custom")}
              </div>
            </div>
            <div className="flex flex-col items-end">
              {/* Billing toggle */}
              <div className="flex rounded-md border border-neutral-300 bg-white p-1 text-sm dark:border-neutral-700 dark:bg-neutral-950">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={cn(
                    "rounded-sm px-3 py-1.5 transition-colors cursor-pointer",
                    !isAnnual
                      ? "bg-neutral-200 text-neutral-950 font-medium dark:bg-neutral-800 dark:text-white"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  )}
                >
                  {t("Monthly")}
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={cn(
                    "rounded-sm px-3 py-1.5 transition-colors cursor-pointer",
                    isAnnual
                      ? "bg-neutral-200 text-neutral-950 font-medium dark:bg-neutral-800 dark:text-white"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  )}
                >
                  {t("Annual")}
                </button>
              </div>
              <div className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {t("4 months free")}
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

          <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400" aria-hidden="true">
            <span>100K</span>
            <span>1M</span>
            <span>10M</span>
            <span>50M+</span>
          </div>
        </div>

        {/* Pricing cards - carousel on mobile, grid on desktop */}
        {(() => {
          const standardCard = (
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
          );

          const proCard = (
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
          );

          const enterpriseCard = (
            <PricingCard
              title={t("Enterprise")}
              description={t("Advanced features for enterprise teams")}
              priceDisplay={<div className="text-3xl font-bold">{t("Custom")}</div>}
              features={ENTERPRISE_FEATURES}
              buttonText={t("Contact us")}
              buttonHref={"https://www.rybbit.com/contact"}
            />
          );

          return (
            <>
              {/* Mobile carousel */}
              <div className="min-[700px]:hidden">
                <Carousel setApi={setCarouselApi} opts={{ startIndex: 1 }}>
                  <CarouselContent>
                    <CarouselItem>{standardCard}</CarouselItem>
                    <CarouselItem>{proCard}</CarouselItem>
                    <CarouselItem>{enterpriseCard}</CarouselItem>
                  </CarouselContent>
                </Carousel>
                {/* Dot indicators */}
                <div className="flex justify-center gap-2 mt-4">
                  {Array.from({ length: slideCount }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => carouselApi?.scrollTo(i)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      aria-label={t("Show pricing plan {number}", { number: String(i + 1) })}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full transition-colors",
                          currentSlide === i ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-600"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop grid */}
              <div className="mx-auto hidden items-stretch justify-center gap-4 min-[700px]:grid min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3">
                {standardCard}
                {proCard}
                {enterpriseCard}
              </div>
            </>
          );
        })()}
      </div>
    </section>
  );
}
